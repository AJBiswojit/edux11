/**
 * Faculty — Student 360 URL-state helpers (Phase 5).
 *
 * The canonical deep-link contract (preserved from Phase 4):
 *   /faculty/my-students/:studentId?context=jee&tab=weaknesses&subject=Physics&chapter=Rotational%20Motion
 *
 * Pure functions only — the page mirrors its tab/domain/subject/chapter state
 * through these so a refresh restores the exact view. Extend only if
 * necessary; do not rename existing params.
 */

export const DOMAIN_PARAM = { university: 'University', jee: 'JEE', neet: 'NEET' }
export const DOMAIN_TO_PARAM = { University: 'university', JEE: 'jee', NEET: 'neet' }

const TABS = [
  'overview', 'strengths', 'weaknesses', 'subjects', 'chapters', 'questions',
  'time', 'errors', 'trends', 'comparison', 'dna', 'similar', 'interventions',
]

/** Reads ?context= into a canonical domain name (null when absent/unknown). */
export function readContextParam(searchParams, fallback = null) {
  const v = searchParams?.get?.('context')
  return v && DOMAIN_PARAM[v] ? DOMAIN_PARAM[v] : fallback
}

/** Reads ?tab= into a canonical tab id (fallback when absent/unknown). */
export function readTabParam(searchParams, fallback = 'overview') {
  const v = searchParams?.get?.('tab')
  return v && TABS.includes(v) ? v : fallback
}

/**
 * Builds the next URLSearchParams for the 360 page. Existing extra params are
 * preserved; the four canonical params are set/cleared per state.
 */
export function build360SearchParams(current, { tab, domain, subject, chapter } = {}) {
  const next = new URLSearchParams(current ?? '')
  if (tab && tab !== 'overview') next.set('tab', tab)
  else next.delete('tab')
  const contextParam = domain ? DOMAIN_TO_PARAM[domain] : null
  if (contextParam) next.set('context', contextParam)
  else next.delete('context')
  if (subject) next.set('subject', subject)
  else next.delete('subject')
  if (chapter) next.set('chapter', chapter)
  else next.delete('chapter')
  return next
}

/** Canonical example URL used in docs/tests. */
export function student360Url(studentId, { context, tab, subject, chapter } = {}) {
  const params = build360SearchParams('', { tab, domain: context, subject, chapter })
  const qs = params.toString()
  return `/faculty/my-students/${studentId}${qs ? `?${qs}` : ''}`
}
