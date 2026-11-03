/**
 * MediXO EduX — Premium Academic Editorial design system, V2.
 *
 * Pure constants and formatting helpers. No PDFKit, DOM or data source imports.
 * All geometry is expressed in PDF points from the top-left of the page.
 */

export const A4 = Object.freeze({ width: 595.276, height: 841.89 })

export const PAGE = Object.freeze({
  marginX: 46,
  contentTop: 82,
  contentBottom: 790,
  headerTop: 22,
  headerBottom: 64,
  footerTop: 800,
  footerBaseline: 810,
  footerBottom: 828,
})

export const CONTENT = Object.freeze({
  x: PAGE.marginX,
  y: PAGE.contentTop,
  w: A4.width - PAGE.marginX * 2,
  bottom: PAGE.contentBottom,
  h: PAGE.contentBottom - PAGE.contentTop,
})

export const FOOTER = Object.freeze({
  x: CONTENT.x,
  y: PAGE.footerTop,
  w: CONTENT.w,
  h: PAGE.footerBottom - PAGE.footerTop,
})

/** The exact V2 publication palette. */
export const COLORS = Object.freeze({
  midnight: '#101B30',
  white: '#FFFFFF',
  paper: '#FAFAF7',
  ink: '#202B3D',
  muted: '#7A8493',
  indigo: '#5146D8',
  success: '#168568',
  warning: '#C58A35',
  error: '#C64D5B',
  line: '#E5E8EF',
  // Derived neutrals used only for hairlines and tinted paper surfaces.
  deepInk: '#202B3D',
  slate: '#7A8493',
  border: '#E5E8EF',
  ivory: '#FAFAF7',
  indigoSoft: '#F1F0FC',
  successSoft: '#EAF5F1',
  warningSoft: '#F9F2E6',
  errorSoft: '#FAEDEF',
  info: '#5146D8',
  infoSoft: '#F1F0FC',
  grid: '#E5E8EF',
})

export const FONTS = Object.freeze({
  heading: 'Manrope',
  body: 'Inter',
  bodySemi: 'InterSemi',
  bodyBold: 'InterBold',
  math: 'STIXMath',
  mathText: 'STIXText',
})

/** Editorial type scale — generous enough for normal A4 print reading. */
export const TYPE = Object.freeze({
  coverTitle: 31,
  reportTitle: 24,
  section: 21,
  subsection: 14,
  body: 10,
  bodySmall: 9.4,
  table: 9.2,
  tableLabel: 8.6,
  label: 8.6,
  folio: 8.2,
  metric: 22,
  metricLarge: 62,
})

export const FONT_FILES = Object.freeze({
  [FONTS.body]: 'Inter-Regular.ttf',
  [FONTS.bodySemi]: 'Inter-SemiBold.ttf',
  [FONTS.bodyBold]: 'Inter-Bold.ttf',
  [FONTS.heading]: 'Manrope-Bold.ttf',
  [FONTS.math]: 'STIXTwoMath-Regular.ttf',
  [FONTS.mathText]: 'STIXTwoText-Regular.ttf',
})

/** Mix a palette colour with a surface. Used only for restrained tints. */
export function mix(hex, surface = COLORS.white, amount = 0.12) {
  const parse = (value) => {
    const v = String(value).replace('#', '')
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16))
  }
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  const [r, g, b] = parse(hex)
  const [sr, sg, sb] = parse(surface)
  const a = Math.max(0, Math.min(1, amount))
  return `#${toHex(sr + (r - sr) * a)}${toHex(sg + (g - sg) * a)}${toHex(sb + (b - sb) * a)}`
}

export function column(index, span = 1, columns = 12, gutter = 10) {
  const totalGutter = gutter * (columns - 1)
  const colW = (CONTENT.w - totalGutter) / columns
  const used = Math.max(1, Math.min(span, columns - index))
  return { x: CONTENT.x + index * (colW + gutter), w: colW * used + gutter * (used - 1) }
}

export function twoColumns(gap = 18, w = CONTENT.w, x = CONTENT.x) {
  const width = (w - gap) / 2
  return [{ x, w: width }, { x: x + width + gap, w: width }]
}

export function threeColumns(gap = 14, w = CONTENT.w, x = CONTENT.x) {
  const width = (w - gap * 2) / 3
  return [
    { x, w: width },
    { x: x + width + gap, w: width },
    { x: x + (width + gap) * 2, w: width },
  ]
}

export function fmt(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export function number(value, fallback = '—') {
  const n = Number(value)
  return Number.isFinite(n) ? String(n) : fmt(value, fallback)
}

export function pct(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  const str = String(value)
  return str.endsWith('%') ? str : `${str}%`
}

export function minutes(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback
  const n = Number(value)
  return Number.isFinite(n) ? `${n} min` : fmt(value, fallback)
}

function key(value) {
  return String(value ?? '').toLowerCase()
}

export function statusColor(status) {
  const k = key(status)
  if (k.includes('correct') && !k.includes('incorrect')) return COLORS.success
  if (k.includes('incorrect') || k.includes('wrong')) return COLORS.error
  if (k.includes('skip') || k.includes('unattempt')) return COLORS.warning
  return COLORS.muted
}

export function statusSoft(status) {
  const k = key(status)
  if (k.includes('correct') && !k.includes('incorrect')) return COLORS.successSoft
  if (k.includes('incorrect') || k.includes('wrong')) return COLORS.errorSoft
  if (k.includes('skip') || k.includes('unattempt')) return COLORS.warningSoft
  return COLORS.paper
}

export function masteryColor(level) {
  const k = key(level)
  if (k === 'strong' || k === 'correct') return COLORS.success
  if (k === 'average' || k === 'review') return COLORS.indigo
  if (k === 'weak' || k === 'low attempt') return COLORS.warning
  if (k === 'critical' || k === 'high') return COLORS.error
  return COLORS.muted
}

export function priorityColor(priority) {
  const k = key(priority)
  if (k === 'critical') return COLORS.error
  if (k === 'high' || k === 'weak') return COLORS.warning
  if (k === 'medium' || k === 'review' || k === 'revise') return COLORS.indigo
  return COLORS.muted
}

export function difficultyColor(level) {
  const k = key(level)
  if (k === 'easy') return COLORS.success
  if (k === 'medium') return COLORS.warning
  if (k === 'hard') return COLORS.error
  return COLORS.indigo
}

export function subjectColor(name, index = 0) {
  const fallback = [COLORS.indigo, COLORS.midnight, COLORS.muted]
  return fallback[index % fallback.length]
}

export function normalizeForMatch(value) {
  return String(value ?? '')
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-')
    .replace(/\u00b7/g, '·')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function isPresentIn(haystack, needle) {
  const h = normalizeForMatch(haystack)
  const n = normalizeForMatch(needle)
  if (!n) return true
  if (n.length <= 3) {
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^0-9a-z])${escaped}(?=$|[^0-9a-z])`, 'i').test(h)
  }
  return h.includes(n)
}
