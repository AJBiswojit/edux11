/**
 * Node figure loader for the headless PDF generation harness.
 *
 * Production exports resolve `/media/...` through the app's same-origin media
 * proxy and convert non-embeddable formats with the browser canvas. The
 * harness runs without a browser, so it resolves the same public paths to the
 * checked-in `backend/media` store and converts WebP/AVIF/SVG with Pillow.
 *
 * Nothing here is imported by the application bundle.
 */

import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createAssetLoader } from '../../src/pages/student/premium-pdf/media.js'

const MEDIA_ROOT = fileURLToPath(new URL('../../../backend/media/', import.meta.url))
const CONVERTER = fileURLToPath(new URL('./convert_question_image.py', import.meta.url))

function localPathFor(url) {
  // A cache-busting query string is meaningful to a browser fetch but not to
  // a file on disk.
  const text = String(url || '').split('#')[0].split('?')[0]
  const mediaIndex = text.indexOf('/media/')
  if (mediaIndex !== -1) {
    return `${MEDIA_ROOT}${text.slice(mediaIndex + '/media/'.length)}`
  }
  if (text.startsWith('file://')) return fileURLToPath(text)
  if (text.startsWith('/')) return `${MEDIA_ROOT}${text.slice(1)}`
  return `${MEDIA_ROOT}${text}`
}

function responseLike(ok, status, bytes) {
  return {
    ok,
    status,
    headers: { get: (name) => (String(name).toLowerCase() === 'content-type' ? 'application/octet-stream' : null) },
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    },
  }
}

async function fileFetch(url) {
  const path = localPathFor(url)
  if (!existsSync(path)) return responseLike(false, 404, new Uint8Array())
  const bytes = new Uint8Array(await readFile(path))
  return responseLike(true, 200, bytes)
}

function runConverter(format, bytes) {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', [CONVERTER, format], { stdio: ['pipe', 'pipe', 'pipe'] })
    const out = []
    const err = []
    child.stdout.on('data', (chunk) => out.push(chunk))
    child.stderr.on('data', (chunk) => err.push(chunk))
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`figure conversion failed (${format}): ${Buffer.concat(err).toString().trim()}`))
        return
      }
      resolve(new Uint8Array(Buffer.concat(out)))
    })
    child.stdin.end(Buffer.from(bytes))
  })
}

/** Module-level cache so repeated reports in one run reuse converted bytes. */
const conversionCache = new Map()

export async function convertImageWithPillow(bytes, format) {
  if (conversionCache.has(`${format}:${bytes.length}`)) {
    const cached = conversionCache.get(`${format}:${bytes.length}`)
    return new Uint8Array(cached)
  }
  const converted = await runConverter(format, bytes)
  conversionCache.set(`${format}:${bytes.length}`, Buffer.from(converted))
  return converted
}

export function createNodeAssetLoader({ convertImage = convertImageWithPillow } = {}) {
  return createAssetLoader({ fetchImpl: fileFetch, convertImage })
}

export default createNodeAssetLoader
