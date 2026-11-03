/**
 * Question figure asset resolution for the premium academic PDF reports.
 *
 * Responsibilities
 *   1. Resolve every recognised question/option/explanation image reference
 *      against the configured backend media origin — never against a
 *      hard-coded host and never against the frontend origin blindly.
 *   2. Fetch the actual bytes with the same credentials the app already uses.
 *   3. Detect the real container format from the bytes (never the extension).
 *   4. Convert formats PDFKit cannot embed (WebP, AVIF, SVG, GIF, BMP, TIFF)
 *      to PNG through a caller-supplied converter (the browser uses an
 *      OffscreenCanvas / canvas; the Node generation harness supplies a
 *      Pillow-backed converter).
 *   5. Read the intrinsic pixel size so the renderer can preserve the aspect
 *      ratio while accounting for the figure's height during pagination.
 *   6. Record precise diagnostics for anything that could not be loaded. A
 *      failed figure never aborts the report and its path is never printed.
 */

import { resolveMediaUrl } from '../../../utils/media.js'

/** Formats PDFKit can embed byte-for-byte. */
const DIRECT_FORMATS = new Set(['png', 'jpeg'])

/** Maximum accepted figure size. Guards against accidental raw PDFs. */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024

const MIME_BY_FORMAT = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  svg: 'image/svg+xml',
}

function envApiBase() {
  try {
    return import.meta.env?.VITE_API_BASE_URL || ''
  } catch {
    return ''
  }
}

/**
 * Resolve a stored media reference to a URL the PDF workflow can fetch.
 *
 * - `data:`/`blob:`/absolute URLs are preserved.
 * - Relative `/media/...` paths stay same-origin when the API base is
 *   same-origin (the documented Vite/nginx `/media` proxy), and are resolved
 *   against the API origin when the API base is absolute.
 */
export function resolveAssetUrl(rawUrl, { apiBase = envApiBase() } = {}) {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  const normalized = resolveMediaUrl(rawUrl)
  if (!normalized) return null
  if (/^(data:|blob:)/i.test(normalized)) return normalized
  if (/^https?:\/\//i.test(normalized)) return normalized
  if (/^https?:\/\//i.test(apiBase || '')) {
    try {
      return new URL(normalized, new URL(apiBase).origin).toString()
    } catch {
      return normalized
    }
  }
  return normalized
}

function base64ToBytes(base64) {
  const clean = base64.replace(/\s+/g, '')
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(clean)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i)
    return out
  }
  /* c8 ignore next 4 — Node path for the generation harness */
  const buffer = Buffer.from(clean, 'base64')
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

export function decodeDataUrl(url) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/is.exec(String(url || ''))
  if (!match) return null
  const mime = (match[1] || '').toLowerCase()
  const payload = match[3] || ''
  if (match[2]) return { bytes: base64ToBytes(payload), mime }
  return { bytes: new TextEncoder().encode(decodeURIComponent(payload)), mime }
}

function ascii(bytes, start, length) {
  return String.fromCharCode(...bytes.slice(start, start + length))
}

/** Detect the real image container from its magic bytes. */
export function detectImageFormat(bytes) {
  if (!bytes || bytes.length < 4) return null
  const b = bytes
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp'
  if (ascii(b, 0, 4) === 'GIF8') return 'gif'
  if (b[0] === 0x42 && b[1] === 0x4d) return 'bmp'
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00)) return 'tiff'
  if (ascii(b, 4, 4) === 'ftyp') {
    const brand = ascii(b, 8, 4).toLowerCase()
    if (brand.startsWith('avif') || brand.startsWith('avis') || ascii(b, 0, 32).includes('avif')) return 'avif'
    if (brand.startsWith('heic') || brand.startsWith('heix')) return 'heic'
    return 'iso-bmff'
  }
  const head = ascii(b, 0, Math.min(512, b.length)).trimStart().toLowerCase()
  if (head.startsWith('<?xml') || head.startsWith('<svg')) return 'svg'
  return null
}

function readPngSize(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function readJpegSize(bytes) {
  let offset = 2
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue }
    const marker = bytes[offset + 1]
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3]
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    if (isSof) {
      const height = (bytes[offset + 5] << 8) | bytes[offset + 6]
      const width = (bytes[offset + 7] << 8) | bytes[offset + 8]
      return { width, height }
    }
    offset += 2 + length
  }
  return null
}

function readWebpSize(bytes) {
  const chunk = ascii(bytes, 12, 4)
  if (chunk === 'VP8X') {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16))
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16))
    return { width, height }
  }
  if (chunk === 'VP8 ') {
    // Lossy: 3-byte frame tag, 3-byte start code, then 14-bit dimensions.
    const start = 20
    if (bytes[start + 3] === 0x9d && bytes[start + 4] === 0x01 && bytes[start + 5] === 0x2a) {
      return {
        width: (bytes[start + 6] | (bytes[start + 7] << 8)) & 0x3fff,
        height: (bytes[start + 8] | (bytes[start + 9] << 8)) & 0x3fff,
      }
    }
  }
  if (chunk === 'VP8L') {
    const b = bytes
    if (b[20] === 0x2f) {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      }
    }
  }
  return null
}

function readAvifSize(bytes) {
  for (let i = 0; i < bytes.length - 12; i += 1) {
    if (ascii(bytes, i, 4) === 'ispe') {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      const width = view.getUint32(i + 8)
      const height = view.getUint32(i + 12)
      if (width > 0 && height > 0 && width < 100000 && height < 100000) return { width, height }
    }
  }
  return null
}

function readGifSize(bytes) {
  return {
    width: bytes[6] | (bytes[7] << 8),
    height: bytes[8] | (bytes[9] << 8),
  }
}

function readBmpSize(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(18, true), height: Math.abs(view.getInt32(22, true)) }
}

function readSvgSize(bytes) {
  const text = new TextDecoder().decode(bytes.slice(0, 4096))
  const widthMatch = /<svg[^>]*\bwidth\s*=\s*["']?\s*([\d.]+)/i.exec(text)
  const heightMatch = /<svg[^>]*\bheight\s*=\s*["']?\s*([\d.]+)/i.exec(text)
  if (widthMatch && heightMatch) {
    return { width: Math.round(Number(widthMatch[1])), height: Math.round(Number(heightMatch[1])) }
  }
  const viewBox = /viewBox\s*=\s*["']([^"']+)["']/i.exec(text)
  if (viewBox) {
    const parts = viewBox[1].trim().split(/[\s,]+/).map(Number)
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) return { width: parts[2], height: parts[3] }
  }
  return null
}

/** Intrinsic pixel dimensions, or null when the container cannot be read. */
export function readImageSize(bytes, format = detectImageFormat(bytes)) {
  if (!bytes || !format) return null
  let size = null
  try {
    if (format === 'png') size = readPngSize(bytes)
    else if (format === 'jpeg') size = readJpegSize(bytes)
    else if (format === 'webp') size = readWebpSize(bytes)
    else if (format === 'avif') size = readAvifSize(bytes)
    else if (format === 'gif') size = readGifSize(bytes)
    else if (format === 'bmp') size = readBmpSize(bytes)
    else if (format === 'svg') size = readSvgSize(bytes)
  } catch {
    return null
  }
  if (!size || !(size.width > 0) || !(size.height > 0)) return null
  return { width: Math.round(size.width), height: Math.round(size.height) }
}

function mediaError(code, message, extra = {}) {
  const error = new Error(message)
  error.code = code
  Object.assign(error, extra)
  return error
}

/** Convert any non-embedable format to PNG through a caller-supplied converter. */
export async function toEmbeddableImage(bytes, format, { convertImage } = {}) {
  if (DIRECT_FORMATS.has(format)) return { bytes, format }
  if (typeof convertImage !== 'function') {
    throw mediaError('unsupported-format', `No converter is available for ${format} figures`, { format })
  }
  const converted = await convertImage(bytes, format, { mime: MIME_BY_FORMAT[format] || 'application/octet-stream' })
  if (!converted || !converted.length) {
    throw mediaError('conversion-failed', `Converter returned no bytes for ${format}`, { format })
  }
  const outFormat = detectImageFormat(converted)
  if (!DIRECT_FORMATS.has(outFormat)) {
    throw mediaError('conversion-failed', `Converter produced ${outFormat || 'an unknown format'} for ${format}`, { format })
  }
  return { bytes: converted, format: outFormat, convertedFrom: format }
}

function authHeaders() {
  const headers = {}
  try {
    const token = globalThis.localStorage?.getItem('EduX_access_token')
    if (token) headers.Authorization = `Bearer ${token}`
  } catch {
    /* storage can be unavailable in private modes */
  }
  return headers
}

/**
 * Default browser loader: fetch → detect → convert → measure.
 * `fetchImpl` and `convertImage` are injectable for tests and the Node harness.
 */
export function createAssetLoader({
  fetchImpl,
  convertImage,
  apiBase,
  headers,
  signal,
  timeoutMs = 20000,
} = {}) {
  return async function loadAsset(url) {
    const resolved = resolveAssetUrl(url, { apiBase })
    if (!resolved) throw mediaError('invalid-url', 'No media reference was supplied')

    let bytes = null
    let mime = ''
    if (resolved.startsWith('data:')) {
      const decoded = decodeDataUrl(resolved)
      if (!decoded) throw mediaError('invalid-data-url', 'The inline figure could not be decoded')
      bytes = decoded.bytes
      mime = decoded.mime
    } else if (resolved.startsWith('blob:')) {
      const fetcher = fetchImpl || globalThis.fetch
      if (typeof fetcher !== 'function') throw mediaError('fetch-unavailable', 'Blob figures cannot be read')
      const response = await fetcher(resolved)
      if (!response.ok) throw mediaError('http-error', `Figure request failed (${response.status})`, { status: response.status })
      bytes = new Uint8Array(await response.arrayBuffer())
    } else {
      const fetcher = fetchImpl || globalThis.fetch
      if (typeof fetcher !== 'function') throw mediaError('fetch-unavailable', 'No fetch implementation is available')
      const controller = typeof AbortController === 'function' ? new AbortController() : null
      const timer = controller && timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null
      try {
        const response = await fetcher(resolved, {
          signal: signal || controller?.signal,
          credentials: 'same-origin',
          headers: { ...authHeaders(), ...(headers || {}) },
        })
        if (!response.ok) throw mediaError('http-error', `Figure request failed (${response.status})`, { status: response.status })
        bytes = new Uint8Array(await response.arrayBuffer())
        mime = (response.headers?.get?.('content-type') || '').split(';')[0]
      } catch (error) {
        if (error?.name === 'AbortError') throw mediaError('timeout', 'Figure request timed out')
        throw error
      } finally {
        if (timer) clearTimeout(timer)
      }
    }

    if (!bytes || !bytes.length) throw mediaError('empty-response', 'The figure response was empty')
    if (bytes.length > MAX_IMAGE_BYTES) {
      throw mediaError('too-large', `Figure exceeds ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB`, { bytes: bytes.length })
    }

    const detected = detectImageFormat(bytes)
    if (!detected) {
      throw mediaError('unknown-format', 'The figure bytes are not a supported image', { mime })
    }
    const embeddable = await toEmbeddableImage(bytes, detected, { convertImage })
    const size = readImageSize(embeddable.bytes, embeddable.format)
    if (!size) throw mediaError('unreadable-dimensions', 'The figure dimensions could not be read', { format: embeddable.format })
    return {
      url: resolved,
      sourceUrl: url,
      bytes: embeddable.bytes,
      format: embeddable.format,
      convertedFrom: embeddable.convertedFrom || null,
      width: size.width,
      height: size.height,
    }
  }
}

/**
 * Canvas converter used by the browser export. WebP and AVIF decode natively in
 * modern browsers; the PNG produced keeps transparency and the intrinsic size.
 */
export async function convertImageWithCanvas(bytes, format, { mime } = {}) {
  const type = mime || MIME_BY_FORMAT[format] || 'application/octet-stream'
  const blob = new Blob([bytes], { type })
  let bitmap = null
  if (typeof globalThis.createImageBitmap === 'function') {
    bitmap = await globalThis.createImageBitmap(blob)
  }
  if (!bitmap) {
    bitmap = await new Promise((resolve, reject) => {
      const img = new globalThis.Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(mediaError('conversion-failed', `The browser could not decode this ${format} figure`))
      img.src = URL.createObjectURL(blob)
    })
  }
  const width = bitmap.width
  const height = bitmap.height
  const canvas = typeof globalThis.OffscreenCanvas === 'function'
    ? new globalThis.OffscreenCanvas(width, height)
    : Object.assign(globalThis.document.createElement('canvas'), { width, height })
  const context = canvas.getContext('2d')
  context.drawImage(bitmap, 0, 0, width, height)
  let outBlob
  if (typeof canvas.convertToBlob === 'function') {
    outBlob = await canvas.convertToBlob({ type: 'image/png' })
  } else {
    outBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  }
  if (!outBlob) throw mediaError('conversion-failed', 'Canvas produced no PNG bytes')
  return new Uint8Array(await outBlob.arrayBuffer())
}

/** Build the ordered list of figure slots for one normalised question. */
export function questionMediaSlots(question) {
  const slots = []
  ;(question?.statementImages || []).forEach((image) => {
    slots.push({ field: 'statement', optionLabel: null, url: image.url, alt: image.alt || '' })
  })
  ;(question?.optionItems || []).forEach((option) => {
    (option.images || []).forEach((image) => {
      slots.push({ field: 'option', optionLabel: option.label, url: image.url, alt: image.alt || '' })
    })
  })
  ;(question?.explanationImages || []).forEach((image) => {
    slots.push({ field: 'explanation', optionLabel: null, url: image.url, alt: image.alt || '' })
  })
  return slots
}

function emptyQuestionMedia() {
  return { statement: [], options: {}, explanation: [], failures: [] }
}

/**
 * Resolve and fetch every figure for every question, then attach the bytes to
 * the model. Runs before rendering because PDFKit layout is synchronous.
 *
 * Returns `{ diagnostics, embedded, failed }`; failures never throw.
 */
export async function loadQuestionMedia(questions = [], {
  loader,
  concurrency = 4,
  onDiagnostic,
} = {}) {
  const diagnostics = []
  const cache = new Map()
  let embedded = 0
  let failed = 0

  const load = async (slot) => {
    const key = slot.url
    if (!cache.has(key)) {
      cache.set(key, (async () => {
        try {
          if (typeof loader !== 'function') {
            throw mediaError('no-loader', 'No figure loader is configured')
          }
          return { asset: await loader(slot.url) }
        } catch (error) {
          return { error }
        }
      })())
    }
    return cache.get(key)
  }

  const queue = []
  questions.forEach((question) => {
    question.media = emptyQuestionMedia()
    questionMediaSlots(question).forEach((slot) => queue.push({ question, slot }))
  })

  let cursor = 0
  const worker = async () => {
    while (cursor < queue.length) {
      const item = queue[cursor]
      cursor += 1
      const result = await load(item.slot)
      if (result.error) {
        failed += 1
        const diagnostic = {
          code: result.error.code || 'load-failed',
          message: result.error.message || String(result.error),
          questionId: item.question.q,
          questionIndex: item.question.index,
          field: item.slot.field,
          option: item.slot.optionLabel,
          url: item.slot.url,
          resolvedUrl: resolveAssetUrl(item.slot.url),
        }
        diagnostics.push(diagnostic)
        item.question.media.failures.push(diagnostic)
        if (typeof onDiagnostic === 'function') onDiagnostic(diagnostic)
        continue
      }
      embedded += 1
      const asset = result.asset
      if (item.slot.field === 'statement') item.question.media.statement.push(asset)
      else if (item.slot.field === 'explanation') item.question.media.explanation.push(asset)
      else {
        if (!item.question.media.options[item.slot.optionLabel]) item.question.media.options[item.slot.optionLabel] = []
        item.question.media.options[item.slot.optionLabel].push(asset)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, queue.length || 1)) }, worker))
  return { diagnostics, embedded, failed, requested: queue.length }
}

/** Report-ready diagnostic summary (never printed inside the PDF). */
export function summariseMedia(diagnostics = []) {
  const byCode = new Map()
  diagnostics.forEach((entry) => {
    const key = entry.code || 'load-failed'
    byCode.set(key, (byCode.get(key) || 0) + 1)
  })
  return {
    requested: diagnostics.length,
    failures: diagnostics.length,
    byCode: Object.fromEntries(byCode),
  }
}

export default {
  resolveAssetUrl,
  detectImageFormat,
  readImageSize,
  toEmbeddableImage,
  createAssetLoader,
  convertImageWithCanvas,
  loadQuestionMedia,
  questionMediaSlots,
  summariseMedia,
}
