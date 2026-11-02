/**
 * Faculty — AI Question Studio service hooks (Phase 7).
 * Components consume the API layer only.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import request from '@/api/client'

export const useQuestionStudioSummary = () =>
  useQuery({ queryKey: ['faculty', 'question-studio'], queryFn: () => request({ url: '/faculty/question-studio' }).then((r) => r.data) })

export const useQuestionStudioSources = (params = {}) =>
  useQuery({ queryKey: ['faculty', 'question-studio', 'sources', params], queryFn: () => request({ url: '/faculty/question-studio/sources', params }).then((r) => r.data) })

export const useQuestionStudioSource = (id) =>
  useQuery({ queryKey: ['faculty', 'question-studio', 'sources', id], queryFn: () => request({ url: `/faculty/question-studio/sources/${id}` }).then((r) => r.data), enabled: !!id })

export function useAnalyzeSource() {
  return useMutation({
    mutationFn: (sourceId) => request({ method: 'post', url: `/faculty/question-studio/sources/${sourceId}/analyze` }).then((r) => r.data),
  })
}

export function useUploadSource() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/question-studio/sources/upload', data: payload }).then((r) => r.data),
  })
}

export function useGenerateStudioQuestions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/question-studio/generate', data: payload }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['faculty', 'question-studio'] }); queryClient.invalidateQueries({ queryKey: ['faculty', 'question-studio', 'sessions'] }) },
  })
}

export const useStudioSessions = () =>
  useQuery({ queryKey: ['faculty', 'question-studio', 'sessions'], queryFn: () => request({ url: '/faculty/question-studio/sessions' }).then((r) => r.data) })

export function useStudioQuestionAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, questionId, action, payload }) =>
      request({ method: 'post', url: `/faculty/question-studio/sessions/${sessionId}/questions/${questionId}/${action}`, data: payload }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['faculty', 'question-studio'] }); queryClient.invalidateQueries({ queryKey: ['faculty', 'question-studio', 'sessions'] }); queryClient.invalidateQueries({ queryKey: ['faculty', 'question-bank'] }); queryClient.invalidateQueries({ queryKey: ['faculty-intelligence'] }) },
  })
}

export default { useQuestionStudioSummary, useQuestionStudioSources, useQuestionStudioSource, useAnalyzeSource, useUploadSource, useGenerateStudioQuestions, useStudioSessions, useStudioQuestionAction }
