/**
 * AI Micro-Assessment Studio service hooks.
 * Components consume the API boundary and never import the source dataset.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import request from '@/api/client'

export const useMicroAssessmentSources = (params = {}) => useQuery({
  queryKey: ['faculty', 'micro-assessments', 'sources', params],
  queryFn: () => request({ url: '/faculty/micro-assessments/sources', params }).then((response) => response.data),
  placeholderData: (previousData) => previousData,
})

export const useMicroAssessmentSource = (id) => useQuery({
  queryKey: ['faculty', 'micro-assessments', 'source', id],
  queryFn: () => request({ url: `/faculty/micro-assessments/sources/${id}` }).then((response) => response.data),
  enabled: !!id,
})

export const useMicroAssessmentParticipants = ({ sourceId, domain, examFamily } = {}) => useQuery({
  queryKey: ['faculty', 'micro-assessments', 'participants', sourceId, domain, examFamily],
  queryFn: () => request({ url: '/faculty/micro-assessments/participants', params: { sourceId, domain, examFamily } }).then((response) => response.data),
  enabled: !!domain,
})

export function useProcessMicroSource() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/micro-assessments/process', data: payload }).then((response) => response.data),
  })
}

export function useGenerateMicroQuestions() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/micro-assessments/generate', data: payload }).then((response) => response.data),
  })
}

export function useRegenerateMicroQuestion() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/micro-assessments/regenerate', data: payload }).then((response) => response.data),
  })
}

export function useGenerateMissingCoverage() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/micro-assessments/missing-coverage', data: payload }).then((response) => response.data),
  })
}

export const useFacultyMicroAssessments = () => useQuery({
  queryKey: ['faculty', 'micro-assessments'],
  queryFn: () => request({ url: '/faculty/micro-assessments' }).then((response) => response.data),
})

export function useCreateMicroAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/micro-assessments', data: payload }).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty', 'micro-assessments'] })
      queryClient.invalidateQueries({ queryKey: ['student', 'micro-assessments'] })
    },
  })
}

export const useMicroAssessmentResults = (id) => useQuery({
  queryKey: ['faculty', 'micro-assessments', id, 'results'],
  queryFn: () => request({ url: `/faculty/micro-assessments/${id}/results` }).then((response) => response.data),
  enabled: !!id,
})

export function useCreateMicroAssessmentIntervention() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, studentIds }) => request({
      method: 'post',
      url: `/faculty/micro-assessments/${id}/intervention`,
      data: { studentIds },
    }).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty', 'interventions'] })
      queryClient.invalidateQueries({ queryKey: ['faculty', 'students'] })
      queryClient.invalidateQueries({ queryKey: ['student', 'interventions'] })
    },
  })
}

export const useStudentMicroAssessments = (studentId) => useQuery({
  queryKey: ['student', 'micro-assessments', studentId],
  queryFn: () => request({ url: '/student/micro-assessments' }).then((response) => response.data),
  enabled: !!studentId,
})

export const useStudentMicroAssessment = (id, studentId) => useQuery({
  queryKey: ['student', 'micro-assessment', id, studentId],
  queryFn: () => request({ url: `/student/micro-assessments/${id}` }).then((response) => response.data),
  enabled: !!id && !!studentId,
})

export function useSubmitMicroAssessmentAttempt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, studentId, ...payload }) => request({
      method: 'post',
      url: `/student/micro-assessments/${id}/attempts`,
      data: { ...payload, studentId },
    }).then((response) => response.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', 'micro-assessments', variables.studentId] })
      queryClient.invalidateQueries({ queryKey: ['student', 'micro-assessment', variables.id, variables.studentId] })
      queryClient.invalidateQueries({ queryKey: ['faculty', 'micro-assessments', variables.id, 'results'] })
      queryClient.invalidateQueries({ queryKey: ['faculty', 'micro-assessments'] })
    },
  })
}

export default {
  useMicroAssessmentSources,
  useMicroAssessmentSource,
  useMicroAssessmentParticipants,
  useProcessMicroSource,
  useGenerateMicroQuestions,
  useRegenerateMicroQuestion,
  useGenerateMissingCoverage,
  useFacultyMicroAssessments,
  useCreateMicroAssessment,
  useMicroAssessmentResults,
  useCreateMicroAssessmentIntervention,
  useStudentMicroAssessments,
  useStudentMicroAssessment,
  useSubmitMicroAssessmentAttempt,
}
