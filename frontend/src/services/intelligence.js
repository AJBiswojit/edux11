import { useQuery } from '@tanstack/react-query'
import request from '@/api/client'
import { getQuery as get } from './query'

/**
 * Student Intelligence Foundation — service hooks.
 * Consume the centralized profile / datasets / derived intelligence via the
 * API layer (swap to real backend with VITE_USE_MOCK=false, zero code changes).
 */

/* Phase 3 — canonical consumption is ONE snapshot hook (summary already
   embeds profile + datasets + derived, mirroring the faculty contract).
   The unused /derived and /datasets view hooks were retired along with their
   projection endpoints. */
export const useStudentIntelligence = () => useQuery(get('/intelligence/summary', ['intelligence', 'summary']))
export const useMasterStudentProfile = () => useQuery(get('/intelligence/profile', ['intelligence', 'profile']))

/**
 * Phase 1 — canonical exam attempts for intelligence consumers
 * (future Faculty Intelligence · AI Academic DNA · AI Exam Analysis).
 * Demo attempts are excluded by default; pass { includeDemo: true } to opt in.
 * Filters: studentId · roll · examMode · examFamily · examId · batchId · sectionId.
 */
export const useIntelligenceExamAttempts = (params = {}) =>
  useQuery({
    queryKey: ['intelligence', 'exam-attempts', params],
    queryFn: () => request({ url: '/intelligence/exam-attempts', params }).then((r) => r.data),
  })

/**
 * Phase 2 — AI Academic DNA evidence pools derived from canonical attempts
 * (manual only; demo excluded; University/Competitive separated). Each
 * strength/weakness carries traceable evidence + longitudinal trend.
 */
export const useIntelligenceExamDnaSignals = () =>
  useQuery({
    queryKey: ['intelligence', 'exam-dna-signals'],
    queryFn: () => request({ url: '/intelligence/exam-dna-signals' }).then((r) => r.data),
  })
