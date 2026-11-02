/**
 * Faculty Question Bank — live GET /faculty/question-bank.
 *
 * Filters and pagination are query params honoured by FastAPI (SQL).
 * University / JEE / NEET isolation uses payload domain/examFamily
 * (exam_mode / exam_family) — never subject name. No client-side
 * re-filter or slice of a full dump.
 *
 * No mock/seed fallback. Backend unavailable → error for the UI empty state.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import { canonicalExamFamily, normalizeQuestion } from '@/api/adapters/questions'

export async function fetchQuestions(filters = {}) {
  const params = {}

  if (filters.domain) params.domain = filters.domain
  const examFamily = canonicalExamFamily(filters.examFamily)
  if (examFamily) params.examFamily = examFamily
  if (filters.course && filters.course !== 'All courses' && filters.course !== 'All') params.course = filters.course
  if (filters.subject && filters.subject !== 'All subjects' && filters.subject !== 'All') params.subject = filters.subject
  if (filters.chapter && filters.chapter !== 'All chapters' && filters.chapter !== 'All') params.chapter = filters.chapter
  if (filters.topic && filters.topic !== 'All topics' && filters.topic !== 'All') params.topic = filters.topic
  if (filters.difficulty && filters.difficulty !== 'Mixed' && filters.difficulty !== 'All') params.difficulty = filters.difficulty
  if (filters.questionType && filters.questionType !== 'All') params.questionType = filters.questionType
  if (filters.search) params.search = filters.search
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit

  const { data } = await api.get('/faculty/question-bank', { params })
  const questions = (data?.questions ?? data?.items ?? []).map(normalizeQuestion).filter(Boolean)
  const total = data?.total ?? data?.summary?.total ?? questions.length
  return {
    ...data,
    questions,
    total,
    page: data?.page ?? filters.page ?? 1,
    limit: data?.limit ?? filters.limit ?? questions.length,
    summary: { ...(data?.summary ?? {}), total },
    clientPaginated: false,
  }
}

export function useFacultyQuestions(filters = {}, options = {}) {
  const enabled = options.enabled !== false
  const keyFilters = {
    domain: filters.domain ?? null,
    examFamily: canonicalExamFamily(filters.examFamily) ?? filters.examFamily ?? null,
    course: filters.course ?? null,
    subject: filters.subject ?? null,
    chapter: filters.chapter ?? null,
    topic: filters.topic ?? null,
    difficulty: filters.difficulty ?? null,
    questionType: filters.questionType ?? null,
    search: filters.search ?? null,
    page: filters.page ?? 1,
    limit: filters.limit ?? null,
  }

  return useQuery({
    queryKey: ['faculty', 'questions', keyFilters],
    queryFn: () => fetchQuestions(filters),
    enabled,
    retry: false,
    staleTime: 1000 * 60 * 5,
  })
}

export const getQuestions = fetchQuestions

export function useUniversityQuestions(filters = {}, options = {}) {
  return useFacultyQuestions({ ...filters, domain: 'University', examFamily: undefined }, options)
}

export function useCompetitiveQuestions(filters = {}, options = {}) {
  return useFacultyQuestions({ ...filters, domain: 'Competitive' }, options)
}

/**
 * PUT /faculty/question-bank/{id}
 * Persists edits (text, difficulty, status, bloom, explanation, tags) to the
 * database and returns the updated question in the same shape as the GET list.
 * On success the ['faculty', 'questions'] query family is invalidated so any
 * sibling consumers (Paper Generator, etc.) see the fresh data automatically.
 */
export function useUpdateQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      api.put(`/faculty/question-bank/${id}`, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty', 'questions'] })
    },
  })
}
