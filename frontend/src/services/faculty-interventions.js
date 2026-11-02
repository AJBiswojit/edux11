/**
 * Faculty — Similar-Issue + Intervention lifecycle service hooks (Phase 5/6).
 * Components consume the API layer; never read localStorage directly.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import request from '@/api/client'

export const useSimilarIssues = (scope = 'all') =>
  useQuery({
    queryKey: ['faculty', 'similar-issues', scope],
    queryFn: () => request({ url: '/faculty/similar-issues', params: { scope } }).then((r) => r.data),
  })

export const useInterventions = () =>
  useQuery({
    queryKey: ['faculty', 'interventions'],
    queryFn: () => request({ url: '/faculty/interventions' }).then((r) => r.data),
  })

export const useIntervention = (id) =>
  useQuery({
    queryKey: ['faculty', 'interventions', id],
    queryFn: () => request({ url: `/faculty/interventions/${id}` }).then((r) => r.data),
    enabled: !!id,
  })

export const useInterventionPractice = (id) =>
  useQuery({
    queryKey: ['faculty', 'interventions', id, 'practice'],
    queryFn: () => request({ url: `/faculty/interventions/${id}/practice` }).then((r) => r.data),
    enabled: !!id,
  })

export const useSimilarIssueGroupEvidence = (groupId) =>
  useQuery({
    queryKey: ['faculty', 'similar-issues', groupId, 'evidence'],
    queryFn: () => request({ url: `/faculty/similar-issues/${groupId}/evidence` }).then((r) => r.data),
    enabled: !!groupId,
  })

export const useGroupInterventionPreflight = (groupId, practiceConfig) =>
  useQuery({
    queryKey: ['faculty', 'similar-issues', groupId, 'intervention-preflight', practiceConfig],
    queryFn: () => request({
      url: `/faculty/similar-issues/${groupId}/intervention-preflight`,
      params: practiceConfig,
    }).then((r) => r.data),
    enabled: !!groupId,
  })

export function useCreateGroupInterventions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, payload }) =>
      request({ method: 'post', url: `/faculty/similar-issues/${groupId}/interventions`, data: payload }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty', 'similar-issues'] })
      queryClient.invalidateQueries({ queryKey: ['faculty', 'interventions'] })
      queryClient.invalidateQueries({ queryKey: ['faculty', 'students'] })
      queryClient.invalidateQueries({ queryKey: ['student', 'interventions'] })
    },
  })
}

export function useInterventionStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, status, action }) =>
      request({ method: 'post', url: `/faculty/interventions/${groupId}/status`, data: { status, action } }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['faculty', 'interventions'] }); queryClient.invalidateQueries({ queryKey: ['faculty', 'similar-issues'] }) },
  })
}

export function useInterventionModify() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, payload }) =>
      request({ method: 'post', url: `/faculty/interventions/${groupId}/modify`, data: payload }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty', 'interventions'] }),
  })
}

export function useInterventionAssign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId }) => request({ method: 'post', url: `/faculty/interventions/${groupId}/assign` }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty', 'interventions'] }),
  })
}

/**
 * Phase 5 hardening — faculty reviewed a weakness/issue inside Student 360
 * and creates an intervention. Runs through the EXISTING lifecycle storage
 * (status starts at 'Recommended'); nothing is auto-assigned.
 */
export function useCreateStudent360Intervention() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, payload }) =>
      request({ method: 'post', url: `/faculty/students/${studentId}/interventions`, data: payload }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty', 'interventions'] })
      queryClient.invalidateQueries({ queryKey: ['faculty', 'students'] })
      queryClient.invalidateQueries({ queryKey: ['student', 'interventions'] })
    },
  })
}

export function useCreateRetest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, payload }) =>
      request({ method: 'post', url: `/faculty/interventions/${groupId}/retest`, data: payload }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['faculty', 'interventions'] }); queryClient.invalidateQueries({ queryKey: ['faculty', 'similar-issues'] }) },
  })
}

export const useRelatedResources = (params) =>
  useQuery({
    queryKey: ['faculty', 'interventions', 'related-resources', params],
    queryFn: () => request({ url: '/faculty/interventions/related-resources', params }).then((r) => r.data),
    enabled: !!(params?.subject && params?.chapter),
  })

/* ---------------- student side ---------------- */
export const useStudentInterventions = (studentId) =>
  useQuery({
    queryKey: ['student', 'interventions', studentId],
    queryFn: () => request({ url: '/student/interventions' }).then((r) => r.data),
    enabled: !!studentId,
  })

export const useStudentInterventionPractice = (id) =>
  useQuery({
    queryKey: ['student', 'interventions', id, 'practice'],
    queryFn: () => request({ url: `/student/interventions/${id}/practice` }).then((r) => r.data),
    enabled: !!id,
  })

export const useStudentInterventionRetest = (id) =>
  useQuery({
    queryKey: ['student', 'interventions', id, 'retest'],
    queryFn: () => request({ url: `/student/interventions/${id}/retest` }).then((r) => r.data),
    enabled: !!id,
  })

export function useSubmitInterventionAttempt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ interventionId, payload }) =>
      request({ method: 'post', url: `/student/interventions/${interventionId}/practice-attempts`, data: payload }).then((r) => r.data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['student', 'interventions'] }); queryClient.invalidateQueries({ queryKey: ['faculty', 'interventions'] }) },
  })
}

export const useFacultyStudentInterventions = (studentId) =>
  useQuery({
    queryKey: ['faculty', 'students', studentId, 'interventions'],
    queryFn: () => request({ url: `/faculty/students/${studentId}/interventions` }).then((r) => r.data),
    enabled: !!studentId,
  })

export default {
  useSimilarIssues, useInterventions, useIntervention, useInterventionPractice,
  useSimilarIssueGroupEvidence, useGroupInterventionPreflight, useCreateGroupInterventions,
  useInterventionStatus, useInterventionModify, useInterventionAssign,
  useCreateStudent360Intervention, useCreateRetest, useRelatedResources, useStudentInterventions, useStudentInterventionPractice,
  useStudentInterventionRetest, useSubmitInterventionAttempt, useFacultyStudentInterventions,
}
