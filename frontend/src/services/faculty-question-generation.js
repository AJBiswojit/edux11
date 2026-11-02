/**
 * Faculty Question Generation — REAL backend integration.
 *
 * No mock/seeded questions. All questions come from PostgreSQL via FastAPI.
 *
 * Endpoints (real backend):
 * POST   /faculty/question-bank/generate
 * GET    /faculty/question-bank/generations
 * GET    /faculty/question-bank/generations/{id}
 * GET    /faculty/question-bank/generations/{id}/questions
 * POST   /faculty/question-bank/generations/{id}/retry
 *
 * Lifecycle:
 * GENERATING -> PROCESSING -> READY
 *                        -> FAILED
 * Terminal: READY, COMPLETED, FAILED
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import { normalizeQuestion } from '@/api/adapters/questions'

export const GENERATION_STATUS = {
  GENERATING: 'GENERATING',
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
}

const TERMINAL = new Set([
  GENERATION_STATUS.READY,
  GENERATION_STATUS.COMPLETED,
  GENERATION_STATUS.FAILED,
])

export function isTerminalStatus(status) {
  return TERMINAL.has(status)
}

export async function generateQuestions(payload) {
  const { data } = await api.post('/faculty/question-bank/generate', payload)
  return data
}

export async function fetchGeneration(generationId) {
  const { data } = await api.get(`/faculty/question-bank/generations/${generationId}`)
  return data?.generation ?? data
}

export async function fetchGenerationQuestions(generationId) {
  const { data } = await api.get(`/faculty/question-bank/generations/${generationId}/questions`)
  const questions = (data?.questions ?? []).map(normalizeQuestion).filter(Boolean)
  return {
    ...data,
    questions,
    total: data?.total ?? questions.length,
    status: data?.status ?? data?.generation?.status,
  }
}

export async function fetchGenerations(limit = 20) {
  const { data } = await api.get('/faculty/question-bank/generations', { params: { limit } })
  return data
}

export async function fetchCurrentGeneration() {
  const { data } = await api.get('/faculty/question-bank/generations/current')
  return data?.generation ?? null
}

export async function retryGeneration(generationId) {
  const { data } = await api.post(`/faculty/question-bank/generations/${generationId}/retry`)
  return data
}

export function useQuestionGeneration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: generateQuestions,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['faculty', 'question-generations'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'question-generations', 'current'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'questions'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'question-bank'] })
      // Immediately invalidate the questions for the new generation so
      // useGenerationQuestions fetches fresh data as soon as the hook is
      // enabled — without waiting for the 30-second staleTime to expire.
      const genId = data?.generationId || data?.id
      if (genId) {
        qc.invalidateQueries({ queryKey: ['faculty', 'question-generations', genId, 'questions'] })
      }
    },
  })
}

export function useGenerationStatus(generationId, { enabled = true, interval = 3000 } = {}) {
  return useQuery({
    queryKey: ['faculty', 'question-generations', generationId, 'status'],
    queryFn: () => fetchGeneration(generationId),
    enabled: !!generationId && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status) return interval
      if (isTerminalStatus(status)) return false
      return interval
    },
    retry: false,
  })
}

export function useGenerationQuestions(generationId, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['faculty', 'question-generations', generationId, 'questions'],
    queryFn: () => fetchGenerationQuestions(generationId),
    enabled: !!generationId && enabled,
    retry: false,
    // Zero staleTime ensures the query always fetches fresh questions when
    // enabled — critical for the first load after a new generation completes
    // so the Question Bank renders without needing a page refresh.
    staleTime: 0,
  })
}

export function useGenerations(limit = 20) {
  return useQuery({
    queryKey: ['faculty', 'question-generations', { limit }],
    queryFn: () => fetchGenerations(limit),
    retry: false,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * The faculty's persisted current generation session (refresh recovery).
 * Never triggers generation — it only rehydrates the last real generation.
 */
export function useCurrentGeneration() {
  return useQuery({
    queryKey: ['faculty', 'question-generations', 'current'],
    queryFn: fetchCurrentGeneration,
    retry: false,
    staleTime: 1000 * 30,
  })
}

export function useRetryGeneration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: retryGeneration,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty', 'question-generations'] })
      qc.invalidateQueries({ queryKey: ['faculty', 'questions'] })
    },
  })
}
