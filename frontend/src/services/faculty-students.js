/**
 * Faculty — My Students / Batch foundation service hooks (Phase 3/4).
 * Components never read localStorage — they consume the API layer:
 *   Component → Service → API → Student/Batch/Exam intelligence.
 */
import { useQuery } from '@tanstack/react-query'
import request from '@/api/client'
import { getQuery } from './query'
import { computeStudent360 } from '@/intelligence/faculty/engine/student-360.js'

export const useFacultyStudents = () => useQuery(getQuery('/faculty/students', ['faculty', 'students']))

function withClient360(raw) {
  if (!raw?.attempts?.length) return raw
  const derived = computeStudent360({
    student: raw.student,
    batches: raw.batch ? [raw.batch] : [],
    attempts: raw.attempts,
  })
  if (!raw.byDomain) {
    return { ...raw, ...derived, student: raw.student, batch: raw.batch, attempts: raw.attempts }
  }
  // Server owns the 360 KPIs. The client engine only fills tabs this page does not render.
  return {
    ...derived,
    ...raw,
    student: raw.student,
    batch: raw.batch,
    attempts: raw.attempts,
    overview: raw.overview,
    aiSummary: raw.aiSummary,
    byDomain: raw.byDomain,
    strengthsWeaknesses: raw.strengthsWeaknesses,
    subjects: raw.subjects,
    chapters: raw.chapters,
    question: raw.question,
    longitudinal: raw.longitudinal ?? derived.longitudinal,
    comparison: raw.comparison ?? derived.comparison,
    comparisonByContext: raw.comparisonByContext ?? derived.comparisonByContext,
  }
}

/** Phase 4 — 360° individual student intelligence bundle. */
export const useFacultyStudent360 = (id) =>
  useQuery({
    queryKey: ['faculty', 'students', id, '360'],
    queryFn: () => request({ url: `/faculty/students/${id}/360` }).then((r) => withClient360(r.data)),
    enabled: !!id,
  })

/** Phase 4 — weak-topic → existing Question Bank connection. */
export const useWeakTopicQuestions = (subject, chapter) =>
  useQuery({
    queryKey: ['faculty', 'weak-topic-questions', subject, chapter],
    queryFn: () => request({ url: '/faculty/students/weak-topic-questions', params: { subject, chapter } }).then((r) => r.data),
    enabled: !!subject && !!chapter,
  })

export const useFacultyAttemptAnalysis = (studentId, attemptId) =>
  useQuery({
    queryKey: ['faculty', 'students', studentId, 'exams', attemptId, 'analysis'],
    queryFn: () => request({ url: `/faculty/students/${studentId}/exams/${attemptId}/analysis` }).then((r) => r.data),
    enabled: !!studentId && !!attemptId,
  })


// ---------------------------------------------------------------------------
// Exam resume — faculty-controlled
// ---------------------------------------------------------------------------

/** All terminated (auto-submitted) exam attempts in the institution. */
export const useTerminatedAttempts = () =>
  useQuery({
    queryKey: ['faculty', 'terminated-attempts'],
    queryFn: () => request({ url: '/faculty/exam-attempts/terminated' }).then((r) => r.data),
    staleTime: 1000 * 30,
  })

/** Faculty grants a student permission to resume a terminated exam. */
export function grantExamResume(attemptId) {
  return request({ method: 'post', url: `/faculty/exam-attempts/${attemptId}/grant-resume` }).then((r) => r.data)
}


// ---------------------------------------------------------------------------
// Paper merge
// ---------------------------------------------------------------------------

/** All published papers in the institution (for merge wizard). */
export const usePublishedPapers = () =>
  useQuery({
    queryKey: ['faculty', 'published-papers'],
    queryFn: () => request({ url: '/faculty/papers/published' }).then((r) => r.data),
    staleTime: 1000 * 60,
  })

/** Merge multiple published papers into a single exam paper. */
export function mergePapers(body) {
  return request({ method: 'post', url: '/faculty/papers/merge', data: body }).then((r) => r.data)
}


export default {
  useFacultyStudents,
  useFacultyStudent360, useWeakTopicQuestions,
  useFacultyAttemptAnalysis,
  useTerminatedAttempts, grantExamResume,
  usePublishedPapers, mergePapers,
}
