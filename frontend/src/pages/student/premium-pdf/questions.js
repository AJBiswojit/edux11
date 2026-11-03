/**
 * Question content normalisation for the premium academic PDF reports.
 *
 * The reports must print user-facing question content only. Exam payloads can
 * describe the same figure in several ways depending on the delivery path
 * (exam-agent snapshot, question-bank row, attempt snapshot), and options can
 * arrive as either plain strings or structured records
 * (`{ key, text, imageUrl }`).
 *
 * This module turns every supported shape into one explicit contract:
 *
 *   {
 *     statement: string,
 *     statementImages: [{ url, alt }],
 *     options: [{ label, key, text, images: [{ url, alt }] }],
 *     explanation: string,
 *     explanationImages: [{ url, alt }],
 *   }
 *
 * It never serialises an object into question text, never returns a bare
 * storage path as academic content, and never invents a figure.
 */

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

/** Option records are recognised by these text-bearing fields. */
const OPTION_TEXT_FIELDS = ['text', 'label', 'content', 'value', 'title', 'option', 'answer']

/** Fields that carry an image reference as a string, array or nested record. */
const STEM_IMAGE_FIELDS = [
  'imageUrl', 'image_url', 'imageURL',
  'imageUrls', 'image_urls', 'imageURLs',
  'stemImageUrl', 'stem_image_url',
  'stemImageUrls', 'stem_image_urls', 'stem_images',
  'questionImageUrl', 'question_image_url',
  'questionImageUrls', 'question_image_urls',
  'figureUrl', 'figure_url', 'figureUrls', 'figure_urls',
  'diagramUrl', 'diagram_url', 'diagramUrls', 'diagram_urls',
  'graphUrl', 'graph_url', 'graphUrls', 'graph_urls',
  'assetUrl', 'asset_url', 'assetUrls', 'asset_urls',
  'mediaUrl', 'media_url', 'mediaUrls', 'media_urls',
  'images', 'image', 'figure', 'figures', 'diagram', 'diagrams',
  'attachments', 'assets',
]

/** Fields that carry an image reference for the worked solution/explanation. */
const EXPLANATION_IMAGE_FIELDS = [
  'explanationImageUrl', 'explanation_image_url',
  'explanationImageUrls', 'explanation_image_urls',
  'solutionImageUrl', 'solution_image_url',
  'solutionImageUrls', 'solution_image_urls',
  'explanationImages', 'solutionImages',
]

/** Option-level image references. */
const OPTION_IMAGE_FIELDS = [
  'imageUrl', 'image_url', 'imageURL',
  'imageUrls', 'image_urls',
  'images', 'image',
  'figureUrl', 'figure_url', 'figureUrls', 'figure_urls',
  'assetUrl', 'asset_url', 'mediaUrl', 'media_url',
]

const IMAGE_FILE_RE = /\.(?:png|jpe?g|webp|avif|gif|bmp|svg|tiff?)(?:[?#].*)?$/i
const MEDIA_PATH_RE = /^(?:https?:\/\/\S+|\/(?:media|static|uploads|assets)\/\S*|(?:media|static|uploads|pdf_extract)\/\S+)$/i
const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
const HTML_IMAGE_RE = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi
const JSON_BLOB_RE = /\{\s*"(?:key|text|label)"\s*:[^{}]*\}/g
const RAW_FIELD_RE = /^\s*"?(?:image_?url|image_?urls|stem_?image_?urls?|figure_?urls?|diagram_?urls?|media_?urls?)"?\s*[:=]\s*/i

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isImageReference(value) {
  if (typeof value !== 'string') return false
  const text = value.trim()
  if (!text) return false
  if (/^data:image\//i.test(text)) return true
  if (/^blob:/i.test(text)) return true
  if (MEDIA_PATH_RE.test(text)) return true
  return IMAGE_FILE_RE.test(text)
}

function recordImageValues(node) {
  if (!isRecord(node)) return []
  const out = []
  for (const field of ['url', 'src', 'href', 'path', 'imageUrl', 'image_url', 'file', 'location']) {
    const value = node[field]
    if (typeof value === 'string' && value.trim()) out.push(value.trim())
  }
  return out
}

/**
 * Collect every image reference from a value that may be a string, an array,
 * a pipe-joined list or a nested record. Non-image strings are ignored so a
 * stray caption is never fetched as a figure.
 */
export function collectImageUrls(value, depth = 0) {
  if (value === null || value === undefined || depth > 3) return []
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.includes('|')) {
      return trimmed.split('|').flatMap((part) => collectImageUrls(part, depth + 1))
    }
    return isImageReference(trimmed) ? [trimmed] : []
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectImageUrls(entry, depth + 1))
  }
  if (isRecord(value)) {
    const direct = recordImageValues(value)
    if (direct.length) return direct.filter(isImageReference)
    return Object.values(value).flatMap((entry) => collectImageUrls(entry, depth + 1))
  }
  return []
}

function dedupeImageRefs(list = []) {
  const seen = new Set()
  const out = []
  list.forEach((entry) => {
    const url = typeof entry === 'string' ? entry : entry?.url
    if (!url || seen.has(url)) return
    seen.add(url)
    out.push(typeof entry === 'string' ? { url, alt: '' } : { url, alt: entry.alt || '' })
  })
  return out
}

/** Remove markdown/HTML image markup from prose, returning text and refs. */
function extractInlineImages(text) {
  const refs = []
  const cleaned = String(text)
    .replace(MARKDOWN_IMAGE_RE, (_match, alt, src) => {
      refs.push({ url: src, alt })
      return ''
    })
    .replace(HTML_IMAGE_RE, (_match, src) => {
      refs.push({ url: src, alt: '' })
      return ''
    })
  return { text: cleaned, refs }
}

function textFromObject(node) {
  if (!isRecord(node)) return ''
  for (const field of OPTION_TEXT_FIELDS) {
    const value = node[field]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  if (Array.isArray(node.spans)) {
    return node.spans.map((span) => textFromObject(span) || (typeof span === 'string' ? span : '')).join('')
  }
  return ''
}

/**
 * Turn any supported value into display text. Objects are reduced to their
 * human-readable field — a serialised object must never reach the page.
 */
export function toDisplayText(value, fallback = '') {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    const parts = value.map((entry) => toDisplayText(entry)).filter(Boolean)
    return parts.join(' · ') || fallback
  }
  if (isRecord(value)) {
    const direct = textFromObject(value)
    if (direct) return direct
    for (const field of ['markdown', 'body', 'html', 'description', 'summary', 'statement', 'question']) {
      const value2 = value[field]
      if (typeof value2 === 'string' && value2.trim()) return value2
    }
    return fallback
  }
  return fallback
}

/**
 * Strip internal references that occasionally leak into question text:
 * serialised option objects, `imageUrl: /media/...` fragments and bare media
 * paths. All meaningful prose and mathematics is preserved verbatim.
 */
export function sanitizeQuestionText(value, fallback = '') {
  let text = toDisplayText(value, fallback)
  if (!text) return fallback

  // A bare media path is not question content; it is a figure that failed to
  // attach. Remove it rather than printing it.
  const trimmed = text.trim()
  if (isImageReference(trimmed)) return fallback

  text = text.replace(JSON_BLOB_RE, (match) => {
    try {
      const parsed = JSON.parse(match)
      const inner = textFromObject(parsed)
      return inner || ''
    } catch {
      return ''
    }
  })

  text = text
    .split(/\r?\n/)
    .map((line) => (RAW_FIELD_RE.test(line) ? '' : line))
    .join('\n')

  text = text.replace(/(?:image_?url|stem_?image_?urls?|figure_?urls?)\s*[:=]\s*\S+/gi, '')
  text = text.replace(/\/?(?:media|pdf_extract)\/[\w./-]+\.(?:png|jpe?g|webp|avif|gif|bmp|svg)/gi, '')
  text = text.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()

  return text || fallback
}

function optionLabel(option, index) {
  const candidate = isRecord(option) ? (option.key ?? option.label ?? option.optionKey) : null
  if (typeof candidate === 'string' && /^[A-Ha-h]$/.test(candidate.trim())) return candidate.trim().toUpperCase()
  if (typeof candidate === 'number' && candidate >= 0 && candidate < LETTERS.length) return LETTERS[candidate]
  return LETTERS[index] || String(index + 1)
}

/**
 * Normalise one option into `{ label, key, text, images }`.
 * Structured records keep their image association; text is never JSON.
 */
export function normalizeOption(option, index = 0) {
  const label = optionLabel(option, index)
  if (typeof option === 'string') {
    const { text, refs } = extractInlineImages(option)
    return {
      label,
      key: label,
      text: sanitizeQuestionText(text),
      images: dedupeImageRefs(refs),
    }
  }
  if (!isRecord(option)) {
    return { label, key: label, text: '', images: [] }
  }
  const imageRefs = OPTION_IMAGE_FIELDS.flatMap((field) => collectImageUrls(option[field]))
  const rawText = toDisplayText(option)
  const { text, refs } = extractInlineImages(rawText)
  const key = typeof option.key === 'string' && option.key.trim() ? option.key.trim() : label
  return {
    label,
    key,
    text: sanitizeQuestionText(text),
    images: dedupeImageRefs([...imageRefs, ...refs]),
  }
}

/**
 * Every figure attached to the question statement, whatever delivery path
 * produced it. Deduplicated and order-preserving.
 */
export function collectStatementImages(question) {
  if (!isRecord(question)) return []
  const refs = []
  STEM_IMAGE_FIELDS.forEach((field) => {
    collectImageUrls(question[field]).forEach((url) => refs.push({ url, alt: '' }))
  })
  // Some payloads nest the stem under `question` / `stem` / `content`.
  ;['question', 'stem', 'content', 'prompt'].forEach((field) => {
    if (isRecord(question[field])) {
      collectImageUrls(question[field]).forEach((url) => refs.push({ url, alt: '' }))
    }
  })
  return dedupeImageRefs(refs)
}

export function collectExplanationImages(question) {
  if (!isRecord(question)) return []
  const refs = []
  EXPLANATION_IMAGE_FIELDS.forEach((field) => {
    collectImageUrls(question[field]).forEach((url) => refs.push({ url, alt: '' }))
  })
  ;['explanation', 'solution'].forEach((field) => {
    if (typeof question[field] === 'string') {
      extractInlineImages(question[field]).refs.forEach((ref) => refs.push(ref))
    } else if (isRecord(question[field])) {
      collectImageUrls(question[field]).forEach((url) => refs.push({ url, alt: '' }))
    }
  })
  return dedupeImageRefs(refs)
}

/** Explanation prose with inline image markup removed. */
export function explanationText(question) {
  if (!isRecord(question)) return ''
  const source = question.explanation ?? question.solution ?? question.workedSolution
  const { text } = extractInlineImages(toDisplayText(source))
  return sanitizeQuestionText(text)
}

export function optionImages(question) {
  if (!isRecord(question) || !Array.isArray(question.options)) return []
  return question.options.flatMap((option) => normalizeOption(option).images)
}

/**
 * Full, display-ready question content. `index` is the 1-based position of the
 * row inside the report; `numberLabel` is the printed question number.
 */
export function normalizeQuestionContent(question, index = 0) {
  const record = isRecord(question) ? question : {}
  const rawStatement = record.text ?? record.questionText ?? record.question ?? record.stem
  const { text: statementWithoutInline, refs: inlineRefs } = extractInlineImages(toDisplayText(rawStatement))
  const statement = sanitizeQuestionText(statementWithoutInline)
  const statementImages = dedupeImageRefs([
    ...collectStatementImages(record),
    ...inlineRefs,
  ])
  const options = Array.isArray(record.options)
    ? record.options.map((option, optionIndex) => normalizeOption(option, optionIndex))
    : []
  const explanation = explanationText(record)
  const explanationImages = collectExplanationImages(record).filter(
    (ref) => !statementImages.some((image) => image.url === ref.url),
  )
  const numberLabel = String(record.q ?? '').trim() || `Q${index + 1}`
  return {
    index,
    numberLabel,
    statement,
    statementImages,
    options,
    explanation,
    explanationImages,
    figureCount: statementImages.length
      + options.reduce((sum, option) => sum + option.images.length, 0)
      + explanationImages.length,
  }
}

export default {
  normalizeQuestionContent,
  normalizeOption,
  sanitizeQuestionText,
  toDisplayText,
  collectImageUrls,
  collectStatementImages,
  collectExplanationImages,
  isImageReference,
}
