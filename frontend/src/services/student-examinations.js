/**
 * EduX Phase 9 — Student Examination · Backend-ready service.
 *
 * Student examination surface consumes published exams from backend.
 * No seeded mock fallback. No answer keys exposure in list endpoint.
 *
 * Endpoints:
 *  GET /student/exams              -> available exams (published, no answers)
 *  GET /student/exams/:id          -> exam detail (metadata, no questions until start)
 *  POST /student/exams/:id/start   -> start attempt, returns questions without answers
 *  GET /student/mock-tests         -> mock tests (if still used, backend-provided)
 *
 * Uses centralized axios client directly, bypassing mock router.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import { APP_CONFIG } from '@/config'
import { canonicalDomain, canonicalExamFamily } from '@/api/adapters/questions'

function normalizeStudentExam(raw) {
  if (!raw || typeof raw !== 'object') return raw
  return {
    ...raw,
    domain: canonicalDomain(raw.domain ?? raw.category) ?? raw.category ?? null,
    examFamily: canonicalExamFamily(raw.examFamily ?? raw.exam ?? raw.type),
  }
}

function adaptStudentExams(data) {
  const items = (data?.items ?? data?.exams ?? (Array.isArray(data) ? data : [])).map(normalizeStudentExam)
  return { ...(data && !Array.isArray(data) ? data : {}), items, exams: items }
}

// --- API functions ---

export async function fetchStudentExams(params = {}) {
  const { data } = await api.get('/student/exams', { params })
  return adaptStudentExams(data)
}

export async function fetchStudentExamById(id) {
  const { data } = await api.get(`/student/exams/${id}`)
  return data
}

export async function fetchMockTests(params = {}) {
  const { data } = await api.get('/student/mock-tests', { params })
  return data
}

export async function startExamAttempt(id) {
  const { data } = await api.post(`/student/exams/${id}/start`)
  // Exam-start returns long-lived JWTs; persist so the 30m access token
  // cannot expire while the sitting is open.
  if (data?.accessToken) {
    window.localStorage.setItem(APP_CONFIG.TOKEN_KEY, data.accessToken)
    if (data.refreshToken) {
      window.localStorage.setItem(APP_CONFIG.REFRESH_TOKEN_KEY, data.refreshToken)
    }
  }
  return data
}

// --- Hooks ---

export function useStudentExams(filters = {}, options = {}) {
  const keyFilters = {
    domain: filters.domain ?? null,
    examFamily: filters.examFamily ?? null,
    status: filters.status ?? null,
    search: filters.search ?? null,
  }
  return useQuery({
    queryKey: ['student', 'exams', 'backend', keyFilters],
    queryFn: () => fetchStudentExams(filters),
    retry: false,
    staleTime: 1000 * 60 * 2,
    enabled: options.enabled !== false,
  })
}

export function useStudentExamDetail(id, options = {}) {
  return useQuery({
    queryKey: ['student', 'exam', 'backend', id],
    queryFn: () => fetchStudentExamById(id),
    enabled: !!id && options.enabled !== false,
    retry: false,
  })
}

export function useMockTestsBackend(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['student', 'mock-tests', 'backend', filters],
    queryFn: () => fetchMockTests(filters),
    retry: false,
    staleTime: 1000 * 60 * 2,
    enabled: options.enabled !== false,
  })
}

export function useStartExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: startExamAttempt,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', 'exams'] })
    },
  })
}
