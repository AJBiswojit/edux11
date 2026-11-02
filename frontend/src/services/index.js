import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getQuery as get } from './query'
import request from '@/api/client'
import { fetchQuestions } from './faculty-questions'
import { ADMIN_INTEL_GC_TIME, ADMIN_INTEL_STALE_TIME } from './admin-intelligence'

const adminCache = { staleTime: ADMIN_INTEL_STALE_TIME, gcTime: ADMIN_INTEL_GC_TIME }

/* ================= STUDENT ================= */

/* Phase 3 — retired unused legacy per-page student hooks (profile, dashboard,
   attendance, assignments, courses, course detail, subjects, events). Those
   pages consume the canonical Student Intelligence snapshot
   (`useStudentIntelligence` in services/intelligence.js); their endpoints have
   been retired alongside. */
export const useMockTests = () => useQuery(get('/student/mock-tests', ['student', 'mock-tests']))
export const useExams = () => useQuery(get('/student/exams', ['student', 'exams']))
export const useStudentSettings = () => useQuery(get('/student/settings', ['student', 'settings']))
export const useStudentAssignments = () => useQuery(get('/student/assignments', ['student', 'assignments']))

export function useUpdateStudentSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'patch', url: '/student/settings', data: payload }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student', 'settings'] }),
  })
}

export function useSubmitAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) => request({ method: 'post', url: `/student/assignments/${id}/submit`, data: payload }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['intelligence', 'summary'] })
      qc.invalidateQueries({ queryKey: ['student', 'assignments'] })
    },
  })
}

/* ================= FACULTY ================= */

export const useFacultyAttendance = () => useQuery(get('/faculty/attendance', ['faculty', 'attendance']))
export const useFacultyAssignments = () => useQuery(get('/faculty/assignments', ['faculty', 'assignments']))

export function useCreateFacultyAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/assignments', data: payload }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty', 'assignments'] })
      qc.invalidateQueries({ queryKey: ['faculty-intelligence'] })
      qc.invalidateQueries({ queryKey: ['intelligence', 'summary'] })
    },
  })
}

export function usePublishFacultyAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => request({ method: 'post', url: `/faculty/assignments/${id}/publish` }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty', 'assignments'] })
      qc.invalidateQueries({ queryKey: ['faculty-intelligence'] })
    },
  })
}

export function useGradeFacultyAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assignmentId, ...payload }) =>
      request({ method: 'post', url: `/faculty/assignments/${assignmentId}/grade`, data: payload }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty', 'assignments'] })
      qc.invalidateQueries({ queryKey: ['faculty-intelligence'] })
    },
  })
}

export function useCreateAttendanceSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/attendance', data: payload }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faculty', 'attendance'] }),
  })
}

export function useMarkAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, records }) =>
      request({ method: 'post', url: `/faculty/attendance/${sessionId}/mark`, data: { records } }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faculty', 'attendance'] })
      qc.invalidateQueries({ queryKey: ['faculty-intelligence'] })
    },
  })
}
export const useQuestionBank = () => useQuery({
  queryKey: ['faculty', 'question-bank'],
  queryFn: () => fetchQuestions({}),
  retry: false,
  staleTime: 1000 * 60 * 5,
})
export const useFacultyResearch = () => useQuery(get('/faculty/research', ['faculty', 'research']))
export const useFacultyLecturePlanner = () => useQuery(get('/faculty/lecture-planner', ['faculty', 'lecture-planner']))
export const useFacultyExamBuilder = () => useQuery(get('/faculty/exam-builder', ['faculty', 'exam-builder']))
export const useFacultyReports = () => useQuery(get('/faculty/reports', ['faculty', 'reports']))
export const useFacultySettings = () => useQuery(get('/faculty/settings', ['faculty', 'settings']))
export const useFacultyRoster = () => useQuery(get('/faculty/roster', ['faculty', 'roster']))

/* ================= ADMIN ================= */

/* Phase 3 — retired unused admin legacy hooks (dashboard, analytics,
   performance, placements); Institution Intelligence
   (`useAdminIntelligence`) is the canonical snapshot. */
export const useAdminUsers = () => useQuery(get('/admin/users', ['admin', 'users'], adminCache))
export const useAdminDepartments = () => useQuery(get('/admin/departments', ['admin', 'departments'], adminCache))
export const useAdminCourses = () => useQuery(get('/admin/courses', ['admin', 'courses'], adminCache))
export const useAdminResearch = () => useQuery(get('/admin/research', ['admin', 'research'], adminCache))
export const useAdminRoles = () => useQuery(get('/admin/roles', ['admin', 'roles'], adminCache))
export const useAdminPermissions = () => useQuery(get('/admin/permissions', ['admin', 'permissions'], adminCache))
export const useAdminAuditLogs = () => useQuery(get('/admin/audit-logs', ['admin', 'audit-logs'], adminCache))
export const useAdminAiConfig = () => useQuery(get('/admin/ai-config', ['admin', 'ai-config'], adminCache))
export const useAdminSettings = () => useQuery(get('/admin/settings', ['admin', 'settings'], adminCache))
export const useAdminSupport = () => useQuery(get('/admin/support', ['admin', 'support'], adminCache))

/* ================= PARENT ================= */

export const useParentProfile = () => useQuery(get('/parent/profile', ['parent', 'profile']))
export const useParentDashboard = () => useQuery(get('/parent/dashboard', ['parent', 'dashboard']))
export const useParentProgress = () => useQuery(get('/parent/progress', ['parent', 'progress']))
export const useParentAttendance = () => useQuery(get('/parent/attendance', ['parent', 'attendance']))
export const useParentPerformance = () => useQuery(get('/parent/performance', ['parent', 'performance']))
export const useParentExamResults = () => useQuery(get('/parent/exam-results', ['parent', 'exam-results']))
export const useParentCommunication = () => useQuery(get('/parent/communication', ['parent', 'communication']))
export const useParentAIInsights = () => useQuery(get('/parent/ai-insights', ['parent', 'ai-insights']))
export const useParentReports = () => useQuery(get('/parent/reports', ['parent', 'reports']))

/* ================= AI ================= */

export const useAITutorThreads = () => useQuery(get('/ai/tutor/threads', ['ai', 'tutor', 'threads']))

export function useAITutorRespond() {
  return useMutation({
    mutationFn: ({ text, threadId }) =>
      request({ method: 'post', url: '/ai/tutor/respond', data: { text, threadId } }).then((r) => r.data),
  })
}

export const useCopilotSuggestions = (path) =>
  useQuery({ ...get('/ai/copilot/suggestions', ['ai', 'copilot', path]), enabled: !!path })

export const useLearningPath = () => useQuery(get('/ai/learning-path', ['ai', 'learning-path']))
/* Phase 3 — retired unused AI hooks: single tutor thread (the tutor page
   paginates the thread list), AI recommendations/weaknesses/prediction and
   the legacy AI quiz/exam generators (builder pages use their own services). */

export function useGraphSearch(query) {
  return useQuery({
    queryKey: ['ai', 'graph-search', query],
    queryFn: () => request({ url: '/ai/graph-search', params: { q: query } }).then((r) => r.data),
    enabled: !!query && query.length > 2,
  })
}

export const useAIAssistantThreads = () => useQuery(get('/ai/assistant/threads', ['ai', 'assistant', 'threads']))

export function useAIAssistantRespond() {
  return useMutation({
    mutationFn: ({ text }) => request({ method: 'post', url: '/ai/assistant/respond', data: { text } }).then((r) => r.data),
  })
}

export const useAIStats = () => useQuery(get('/ai/stats', ['ai', 'stats']))

/* ================= AI (deterministic prototype fallback) =================
   Chat surfaces (AI Tutor · AI Copilot · Teaching Assistant) fall back to the
   deterministic tutor reply engine when the assistant request fails, so they
   never show an "offline" state. Re-exported here so UI components consume
   the SERVICE layer instead of importing an API module directly. */
export { generateTutorReply } from '@/api/ai/tutor-reply'
