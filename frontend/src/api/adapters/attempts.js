/**
 * Exam-agent / ExamAttempt adapter.
 *
 * Backend stores exam_mode lowercase and exam_family jee|neet; the list
 * serializer title-cases them. Scoring is server-side. Delivery payloads
 * omit `correctAnswer`.
 */

import { canonicalDomain, canonicalExamFamily, normalizeQuestion } from './questions'

export function normalizeAttempt(raw) {
  if (!raw || typeof raw !== 'object') return raw
  return {
    ...raw,
    examMode: canonicalDomain(raw.examMode ?? raw.exam_mode) ?? raw.examMode ?? null,
    examFamily: canonicalExamFamily(raw.examFamily ?? raw.exam_family),
    examTitle: raw.examTitle ?? raw.examName ?? null,
    examName: raw.examName ?? raw.examTitle ?? null,
    behaviour: raw.behaviour ?? raw.behavior ?? null,
    isDemo: Boolean(raw.isDemo ?? raw.is_demo),
  }
}

export function normalizeExamAgentExam(raw) {
  if (!raw || typeof raw !== 'object') return raw
  const type = raw.type
  const category = raw.category
  const examFamily = type === 'JEE' || type === 'NEET' ? type : canonicalExamFamily(raw.examFamily)
  const domain =
    canonicalDomain(raw.domain)
    ?? (category === 'Competitive' || examFamily ? 'Competitive' : 'University')
  const questions = Array.isArray(raw.questions)
    ? raw.questions.map((q) => normalizeQuestion(q) ?? q)
    : []
  return {
    ...raw,
    domain,
    examFamily: examFamily ?? null,
    category: category ?? domain,
    questions,
  }
}

export function adaptExamAgentExams(payload) {
  const items = (payload?.items ?? []).map(normalizeExamAgentExam)
  return {
    ...payload,
    items,
    groupLabels: payload?.groupLabels ?? {},
  }
}

export function adaptAttemptList(payload) {
  const items = (payload?.items ?? []).map(normalizeAttempt)
  return { ...payload, items }
}

export function adaptAttemptDetail(payload) {
  if (!payload) return payload
  if (payload.attempt) return { ...payload, attempt: normalizeAttempt(payload.attempt) }
  return normalizeAttempt(payload)
}

export default {
  normalizeAttempt,
  normalizeExamAgentExam,
  adaptExamAgentExams,
  adaptAttemptList,
  adaptAttemptDetail,
}
