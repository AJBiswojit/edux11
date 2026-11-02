/**
 * AI Exam Conducting Agent — live GET/POST /student/exam-agent/*.
 *
 * Practice papers come from published SQL `papers` (seeded exam-agent set).
 * Faculty-generated KV drafts are NOT in this list (GAP-03 / GAP-05).
 * Question payloads must not include `correctAnswer`; scoring is server-side.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import request from '@/api/client'
import { adaptAttemptDetail, adaptAttemptList, adaptExamAgentExams, normalizeAttempt } from '@/api/adapters/attempts'

/**
 * Start (or resume) a server sitting. Returns attempt metadata plus a
 * long-lived accessToken scoped to the exam duration so the default 30m
 * JWT cannot expire mid-sitting. Caller must persist accessToken/refreshToken.
 */
export function startExamSitting(examId, body = {}) {
  return request({
    method: 'post',
    url: `/student/exams/${examId}/start`,
    data: body,
  }).then((r) => r.data)
}

/**
 * Layer 2 server autosave — persist in-progress answers into the open
 * ExamAttempt (Postgres) so a device loss / server restart never wipes work.
 * Imperative (not a hook): called from the live runner's autosave timers.
 * Resolves silently on failure; the local draft (Layer 1) remains the backup.
 */
export function saveExamProgress(examId, body) {
  return request({ method: 'post', url: `/student/exams/${examId}/progress`, data: body })
    .then((r) => r.data)
    .catch(() => null)
}

/** Fetch server-saved progress to resume on a fresh device (empty localStorage). */
export function loadExamProgress(examId) {
  return request({ url: `/student/exams/${examId}/progress` })
    .then((r) => r.data)
    .catch(() => null)
}

/** Check if the student has an active (unsubmitted) exam — for cross-device resume. */
export function fetchActiveExam() {
  return request({ url: '/student/active-exam' })
    .then((r) => r.data)
    .catch(() => ({ hasActiveExam: false }))
}

/**
 * Queue-based submit (Postgres-backed) — absorbs large simultaneous submit
 * bursts. Enqueues the submission and resolves with { submissionId } (HTTP 202).
 * The backend keeps a synchronous fallback, so if the queue is off this may
 * instead return the full attempt directly.
 */
export function enqueueExamSubmission(examId, body) {
  return request({ method: 'post', url: `/student/exams/${examId}/submit`, data: body }).then((r) => r.data)
}

/** Poll a queued submission's status: queued | processing | completed | failed. */
export function getSubmissionStatus(submissionId) {
  return request({ url: `/student/submissions/${submissionId}/status` }).then((r) => r.data)
}

/** Imperatively fetch one attempt (used after a queued submission completes). */
export function fetchExamAgentAttempt(attemptId) {
  return request({ url: `/student/exam-agent/attempts/${attemptId}` }).then((r) => r.data)
}

export const useExamAgentExams = () =>
  useQuery({
    queryKey: ['exam-agent', 'exams'],
    queryFn: () => request({ url: '/student/exam-agent/exams' }).then((r) => adaptExamAgentExams(r.data)),
    retry: false,
    staleTime: 1000 * 60 * 2,
  })

export const useExamAgentAttempts = () =>
  useQuery({
    queryKey: ['exam-agent', 'attempts'],
    queryFn: () => request({ url: '/student/exam-agent/attempts' }).then((r) => adaptAttemptList(r.data)),
    retry: false,
  })

export const useExamAgentAttempt = (id) =>
  useQuery({
    queryKey: ['exam-agent', 'attempt', id],
    queryFn: () => request({ url: `/student/exam-agent/attempts/${id}` }).then((r) => adaptAttemptDetail(r.data)),
    enabled: !!id,
    retry: false,
  })

export function useSaveExamAgentAttempt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) =>
      request({ method: 'post', url: '/student/exam-agent/attempts', data: payload }).then((r) => {
        const data = r.data
        return {
          ...data,
          attempt: data?.attempt ? normalizeAttempt(data.attempt) : data?.attempt,
        }
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exam-agent', 'attempts'] }),
  })
}

export default { useExamAgentExams, useExamAgentAttempts, useExamAgentAttempt, useSaveExamAgentAttempt }
