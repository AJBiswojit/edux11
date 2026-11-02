/**
 * Faculty Paper Library — Send/Share readiness.
 *
 * Source of truth is the backend paper payload (generation status +
 * requested vs generated question counts). Missing/unknown status fails
 * closed: Send stays disabled. Does not invent progress, mock counts,
 * or treat the UI question chip as proof of readiness.
 */

const GENERATING = new Set(['GENERATING', 'IN_PROGRESS', 'INPROGRESS', 'PROCESSING', 'PENDING', 'QUEUED'])
const FAILED = new Set(['FAILED', 'ERROR', 'GENERATION_FAILED'])
const READY = new Set(['READY', 'COMPLETE', 'COMPLETED'])
const PUBLISHED = new Set(['PUBLISHED', 'SENT'])

const MSG_GENERATING = 'Questions are still being generated. You can send the paper once generation is complete.'
const MSG_FAILED = 'Question generation failed. This paper cannot be sent.'
const MSG_UNKNOWN = 'This paper is not ready to send.'

function token(value) {
  if (value == null || value === '') return null
  return String(value).trim().toUpperCase().replace(/[\s-]+/g, '_')
}

function num(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function generationToken(paper) {
  return token(
    paper.generationStatus
    ?? paper.generation_status
    ?? paper.questionGenerationStatus
    ?? paper.generation?.status,
  )
}

function lifecycleToken(paper) {
  return token(paper.status ?? paper.paperStatus)
}

export function requestedQuestionCount(paper) {
  if (!paper || typeof paper !== 'object') return null
  return num(
    paper.requestedQuestions
    ?? paper.requestedQuestionCount
    ?? paper.questionsRequested
    ?? paper.expectedQuestionCount
    ?? paper.targetQuestionCount
    ?? paper.config?.questionCount
    ?? paper.config?.count
    ?? paper.config?.questions,
  )
}

export function generatedValidQuestionCount(paper) {
  if (!paper || typeof paper !== 'object') return null
  const direct = num(
    paper.generatedValidQuestions
    ?? paper.validQuestionCount
    ?? paper.generatedQuestionCount
    ?? paper.generatedQuestions,
  )
  if (direct != null) return direct
  if (Array.isArray(paper.selectedQuestionIds)) return paper.selectedQuestionIds.length
  if (Array.isArray(paper.questionList)) return paper.questionList.length
  if (typeof paper.questions === 'number') return paper.questions
  return null
}

export function questionsAreComplete(paper) {
  const requested = requestedQuestionCount(paper)
  const generated = generatedValidQuestionCount(paper)
  if (requested != null) {
    if (generated == null) return false
    return generated >= requested && generated > 0
  }
  if (generated == null) return true
  return generated > 0
}

function blocked(reason, message) {
  return { canSend: false, reason, message }
}

function allowed(reason) {
  return { canSend: true, reason, message: null }
}

/**
 * @returns {{ canSend: boolean, reason: string, message: string | null }}
 */
export function paperSendReadiness(paper) {
  if (!paper || typeof paper !== 'object') {
    return blocked('unknown', MSG_UNKNOWN)
  }

  const gen = generationToken(paper)
  const life = lifecycleToken(paper)

  if (GENERATING.has(gen) || GENERATING.has(life)) {
    return blocked('generating', MSG_GENERATING)
  }
  if (FAILED.has(gen) || FAILED.has(life)) {
    return blocked('failed', MSG_FAILED)
  }

  if (!questionsAreComplete(paper)) {
    return blocked('incomplete', MSG_GENERATING)
  }

  if (PUBLISHED.has(life) || PUBLISHED.has(gen)) {
    return allowed('published')
  }

  if (READY.has(gen) || READY.has(life)) {
    return allowed('ready')
  }

  return blocked('unknown', MSG_UNKNOWN)
}

export const PAPER_SEND_MESSAGES = { generating: MSG_GENERATING, failed: MSG_FAILED, unknown: MSG_UNKNOWN }

export default paperSendReadiness
