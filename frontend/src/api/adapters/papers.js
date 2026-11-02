/**
 * Faculty paper-generator adapter.
 *
 * Live create/list writes `app_kv` JSON (`mode` / `exam`), not SQL `papers`.
 * selectedQuestionIds is sent by the client and currently ignored by the
 * backend (GAP-04). This adapter does not invent IDs or publish status.
 */

import { canonicalDomain, canonicalExamFamily } from './questions'

export function normalizePaper(raw) {
  if (!raw || typeof raw !== 'object') return raw
  const domain = canonicalDomain(raw.domain ?? raw.mode) ?? raw.mode ?? null
  const examFamily = canonicalExamFamily(raw.examFamily ?? raw.exam)
  return {
    ...raw,
    domain,
    examFamily,
    mode: raw.mode ?? domain,
    exam: raw.exam ?? examFamily,
    selectedQuestionIds: Array.isArray(raw.selectedQuestionIds) ? raw.selectedQuestionIds : undefined,
    questionList: Array.isArray(raw.questionList) ? raw.questionList : undefined,
  }
}

export function normalizePaperGeneratorPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { generatedPapers: [], config: null, versionHistory: {} }
  }
  const generatedPapers = (payload.generatedPapers ?? []).map(normalizePaper)
  return {
    ...payload,
    generatedPapers,
    config: payload.config ?? null,
    versionHistory: payload.versionHistory ?? {},
  }
}

export default { normalizePaper, normalizePaperGeneratorPayload }
