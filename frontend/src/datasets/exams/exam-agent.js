/**
 * AI Exam Conducting Agent — UI configuration (DATA ONLY SHELL).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal): the authoritative practice
 * examination QUESTION database (`EXAM_AGENT_EXAMS`) that the in-browser
 * prototype API adapter served was a backend-owned seed and is REMOVED. The
 * live Exam-Agent home lists exams via the service layer
 * (`useExamAgentExams` → GET /student/exam-agent/exams), so the frontend
 * holds no authoritative question store.
 *
 * What remains is pure UI configuration (labels/titles/types), which is
 * legitimate frontend config and is preserved so the page can group the
 * exam cards it receives from the backend.
 */

export const EXAM_AGENT_TYPES = ['University', 'JEE', 'NEET']

export const EXAM_AGENT_GROUP_LABELS = {
  University: { label: 'University Practice Papers', sub: 'Course-level MCQs · no negative marking' },
  JEE: { label: 'JEE Main Mocks', sub: 'Physics + Chemistry + Mathematics · +4 / −1' },
  NEET: { label: 'NEET UG Mocks', sub: 'Physics + Chemistry + Biology · +4 / −1' },
}

/* No authoritative exam/question data is exported. */
export const EXAM_AGENT_EXAMS = []

export default EXAM_AGENT_EXAMS
