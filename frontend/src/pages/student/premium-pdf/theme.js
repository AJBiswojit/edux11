/**
 * MediXO EduX — premium report design system.
 *
 * Values are expressed in PDF points (1 pt = 1/72 in). A4 portrait is the
 * only supported page size. This module is pure data: it deliberately has no
 * PDFKit, DOM or data-source imports so it can be reused by the browser
 * renderer, the Node QA script and unit tests.
 */

export const A4 = Object.freeze({ width: 595.276, height: 841.89 })

export const PAGE = Object.freeze({
  marginX: 42,
  top: 62,
  bottom: 54,
  headerHeight: 30,
  footerHeight: 26,
})

export const CONTENT = Object.freeze({
  x: PAGE.marginX,
  y: PAGE.top,
  w: A4.width - PAGE.marginX * 2,
  h: A4.height - PAGE.top - PAGE.bottom,
  bottom: A4.height - PAGE.bottom,
})

export const COLORS = Object.freeze({
  midnight: '#101B30',
  deepInk: '#17243A',
  indigo: '#5146D8',
  ivory: '#FAFAF7',
  white: '#FFFFFF',
  slate: '#788397',
  border: '#E5E8EF',
  success: '#168568',
  warning: '#C58A35',
  error: '#C64D5B',
  info: '#4778C7',
  grid: '#F1F3F7',
  indigoSoft: '#F1F0FC',
  successSoft: '#EDF7F4',
  warningSoft: '#FBF5EA',
  errorSoft: '#FBEFF1',
  infoSoft: '#EEF3FB',
})

export const FONTS = Object.freeze({
  heading: 'Manrope',
  body: 'Inter',
  bodySemi: 'InterSemi',
  bodyBold: 'InterBold',
  math: 'STIXMath',
})

export const TYPE = Object.freeze({
  coverTitle: 25,
  reportTitle: 19,
  section: 15,
  subsection: 11,
  body: 9.2,
  small: 8.2,
  label: 7.4,
  metric: 19,
  metricLarge: 31,
})

export const FONT_FILES = Object.freeze({
  [FONTS.body]: 'Inter-Regular.ttf',
  [FONTS.bodySemi]: 'Inter-SemiBold.ttf',
  [FONTS.bodyBold]: 'Inter-Bold.ttf',
  [FONTS.heading]: 'Manrope-Bold.ttf',
  [FONTS.math]: 'STIXTwoMath-Regular.ttf',
})

/** 12-column Swiss grid with a 9 pt gutter. */
export function column(index, span = 1, columns = 12, gutter = 9) {
  const totalGutter = gutter * (columns - 1)
  const colW = (CONTENT.w - totalGutter) / columns
  const used = Math.max(1, Math.min(span, columns - index))
  const x = CONTENT.x + index * (colW + gutter)
  return { x, w: colW * used + gutter * (used - 1) }
}

export function twoColumns(gap = 14) {
  const w = (CONTENT.w - gap) / 2
  return [{ x: CONTENT.x, w }, { x: CONTENT.x + w + gap, w }]
}

export function threeColumns(gap = 12) {
  const w = (CONTENT.w - gap * 2) / 3
  return [
    { x: CONTENT.x, w },
    { x: CONTENT.x + w + gap, w },
    { x: CONTENT.x + (w + gap) * 2, w },
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

export function statusColor(status) {
  const key = String(status || '').toLowerCase()
  if (key.includes('correct') && !key.includes('incorrect')) return COLORS.success
  if (key.includes('incorrect') || key.includes('wrong')) return COLORS.error
  if (key.includes('skip') || key.includes('unattempt')) return COLORS.warning
  return COLORS.slate
}

export function statusSoft(status) {
  const key = String(status || '').toLowerCase()
  if (key.includes('correct') && !key.includes('incorrect')) return COLORS.successSoft
  if (key.includes('incorrect') || key.includes('wrong')) return COLORS.errorSoft
  if (key.includes('skip') || key.includes('unattempt')) return COLORS.warningSoft
  return COLORS.ivory
}

export function masteryColor(level) {
  const key = String(level || '').toLowerCase()
  if (key === 'strong') return COLORS.success
  if (key === 'average' || key === 'review') return COLORS.info
  if (key === 'weak' || key === 'low attempt') return COLORS.warning
  if (key === 'critical' || key === 'high') return COLORS.error
  return COLORS.slate
}

export function priorityColor(priority) {
  const key = String(priority || '').toLowerCase()
  if (key === 'critical') return COLORS.error
  if (key === 'high' || key === 'weak') return COLORS.warning
  if (key === 'medium' || key === 'review' || key === 'revise') return COLORS.info
  if (key === 'low' || key === 'low attempt') return COLORS.slate
  return COLORS.indigo
}

export function difficultyColor(level) {
  const key = String(level || '').toLowerCase()
  if (key === 'easy') return COLORS.success
  if (key === 'medium') return COLORS.warning
  if (key === 'hard') return COLORS.error
  return COLORS.info
}

export function subjectColor(name, index = 0) {
  const key = String(name || '').toLowerCase()
  if (key.includes('phys')) return COLORS.info
  if (key.includes('chem')) return COLORS.success
  if (key.includes('math')) return COLORS.indigo
  if (key.includes('bio')) return COLORS.warning
  const fallback = [COLORS.indigo, COLORS.info, COLORS.success, COLORS.warning, COLORS.error]
  return fallback[index % fallback.length]
}

export function normalizeForMatch(value) {
  return String(value ?? '')
    .replace(/\u2010|\u2011|\u2012|\u2013|\u2014/g, '-')
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
