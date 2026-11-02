import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getQuery as get } from './query'
import request from '@/api/client'
import { ADMIN_INTEL_GC_TIME, ADMIN_INTEL_STALE_TIME } from './admin-intelligence'

const adminCache = { staleTime: ADMIN_INTEL_STALE_TIME, gcTime: ADMIN_INTEL_GC_TIME }

/* ================= STUDENT (extra) ================= */
export const useStudentPrograms = () => useQuery(get('/student/programs', ['student', 'programs']))
export const useForum = () => useQuery(get('/student/forum', ['student', 'forum']))
export const useSupportTickets = () => useQuery(get('/student/support', ['student', 'support']))
export const useAdmitCard = () => useQuery(get('/student/admit-card', ['student', 'admit-card']))

export function useCreateSupportTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/student/support', data: payload }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student', 'support'] }),
  })
}

/* ================= FACULTY (extra) ================= */
export const useFacultyCourses = () => useQuery(get('/faculty/courses', ['faculty', 'courses']))
export const useFacultyTimetable = () => useQuery(get('/faculty/timetable', ['faculty', 'timetable']))
export const useFacultyAnnouncements = () => useQuery(get('/faculty/announcements', ['faculty', 'announcements']))
export const useFacultyQuizBuilder = () => useQuery(get('/faculty/quiz-builder', ['faculty', 'quiz-builder']))
/* Phase 3 — retired useFacultyAiStudio (legacy fetch for the superseded AI
   Studio page; the AI Workspace consumes thread/respond hooks + save only). */

/* ================= PARENT (extra) ================= */
export const useParentAssignments = () => useQuery(get('/parent/assignments', ['parent', 'assignments']))
export const useParentFees = () => useQuery(get('/parent/fees', ['parent', 'fees']))
export const useParentBehavior = () => useQuery(get('/parent/behavior', ['parent', 'behavior']))
export const useParentEvents = () => useQuery(get('/parent/events', ['parent', 'events']))
export const useParentDownloads = () => useQuery(get('/parent/downloads', ['parent', 'downloads']))
export const useParentNotifications = () => useQuery(get('/parent/notifications', ['parent', 'notifications']))
export const useParentSettings = () => useQuery(get('/parent/settings', ['parent', 'settings']))

export function useUpdateParentSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'patch', url: '/parent/settings', data: payload }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parent', 'settings'] }),
  })
}

/* ================= ADMIN (extra) ================= */
export const useAdminRevenue = () => useQuery(get('/admin/revenue', ['admin', 'revenue'], adminCache))
export const useAdminPrograms = () => useQuery(get('/admin/programs', ['admin', 'programs'], adminCache))
export const useAdminProgramResults = (programId) =>
  useQuery({
    ...get(`/admin/programs/${programId}/results`, ['admin', 'programs', programId, 'results'], adminCache),
    enabled: !!programId,
  })
export const useAdminSubjects = () => useQuery(get('/admin/subjects', ['admin', 'subjects'], adminCache))
export const useAdminBatches = () => useQuery(get('/admin/batches', ['admin', 'batches'], adminCache))
export const useAdminCalendar = () => useQuery(get('/admin/calendar', ['admin', 'calendar'], adminCache))
/* Phase 3 — retired the three legacy admin analytics hooks (pages removed in
   Phase 2; Institution Intelligence reads the datasets via its own engines). */
export const useAdminQuestionBank = () => useQuery(get('/admin/question-bank', ['admin', 'question-bank'], adminCache))
export const useAdminScholarships = () => useQuery(get('/admin/scholarships', ['admin', 'scholarships'], adminCache))
export const useAdminCms = () => useQuery(get('/admin/cms', ['admin', 'cms'], adminCache))
export const useAdminApiConfig = () => useQuery(get('/admin/api-config', ['admin', 'api-config'], adminCache))
export const useAdminDataTools = () => useQuery(get('/admin/data-tools', ['admin', 'data-tools'], adminCache))

/* ================= AI Exam Analysis (student) ================= */
/* Phase 3 — retired the unused base useExamAnalysis fetch; the page consumes
   the options + per-id analysis endpoints below. */
export const useExamAnalysisOptions = () => useQuery(get('/student/exam-analysis/options', ['student', 'exam-analysis', 'options']))
export const useExamAnalysisById = (id) =>
  useQuery({ ...get(`/student/exam-analysis/${id}`, ['student', 'exam-analysis', id]), enabled: !!id })

/* ================= Student Academics hub ================= */
/* Phase 3 — retired the unused academics-hub hooks (profile/resources/
   progress) and usePerformanceAccuracy: those pages now consume the canonical
   useStudentIntelligence snapshot. */

/* ================= MediXO Mentor workspace ================= */
export const useMentorWorkspace = () => useQuery(get('/student/mentor/workspace', ['student', 'mentor', 'workspace']))

/* ================= AI Question Paper Generator (faculty) ================= */
export const usePaperGenerator = () => useQuery(get('/faculty/paper-generator', ['faculty', 'paper-generator']))

export function usePaperDelete() {
  return useMutation({
    mutationFn: (id) => request({ method: 'delete', url: `/faculty/paper-generator/papers/${id}` }).then((r) => r.data),
  })
}

export function usePaperDuplicate() {
  return useMutation({
    mutationFn: (id) => request({ method: 'post', url: `/faculty/paper-generator/papers/${id}/duplicate` }).then((r) => r.data),
  })
}

export function usePaperCreate() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/paper-generator/papers', data: payload }).then((r) => r.data),
  })
}

export function usePaperRegenerate() {
  return useMutation({
    mutationFn: (id) => request({ method: 'post', url: `/faculty/paper-generator/papers/${id}/regenerate` }).then((r) => r.data),
  })
}

export function usePaperArchive() {
  return useMutation({
    mutationFn: (id) => request({ method: 'patch', url: `/faculty/paper-generator/papers/${id}/archive` }).then((r) => r.data),
  })
}

export function useCreateReport() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/reports', data: payload }).then((r) => r.data),
  })
}

export function useDeleteReport() {
  return useMutation({
    mutationFn: (id) => request({ method: 'delete', url: `/faculty/reports/${id}` }).then((r) => r.data),
  })
}

export function useArchiveReport() {
  return useMutation({
    mutationFn: (id) => request({ method: 'patch', url: `/faculty/reports/${id}/archive` }).then((r) => r.data),
  })
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: async (report) => {
      if (report?.generationStatus && report.generationStatus !== 'READY') {
        throw new Error('Report is not ready for download')
      }
      const response = await request({
        method: 'get',
        url: `/faculty/reports/${report.id}/download`,
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: response.headers?.['content-type'] || 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${(report.title || 'report').replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      return { ok: true }
    },
  })
}

export function useCreateLecture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/lecture-planner', data: payload }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faculty', 'lecture-planner'] }),
  })
}

export function useCreateTimetableSlot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/timetable', data: payload }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faculty', 'timetable'] }),
  })
}

export function useCreatePublication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/research', data: payload }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faculty', 'research'] }),
  })
}

export function usePaperShare() {
  return useMutation({
    mutationFn: ({ id, payload }) => request({ method: 'post', url: `/faculty/paper-generator/papers/${id}/share`, data: payload }).then((r) => r.data),
  })
}

/* Phase 3 — retired usePaperShares (the share action posts remain; nothing
   reads the shares list). */

export const useAdminStudents = () => useQuery(get('/admin/students', ['admin', 'students'], adminCache))
export const useAdminFaculty = () => useQuery(get('/admin/faculty', ['admin', 'faculty'], adminCache))
export const useAdminSupport = () => useQuery(get('/admin/support', ['admin', 'support'], adminCache))
export const useAdminReports = () => useQuery(get('/admin/reports', ['admin', 'reports'], adminCache))
export const useExecutiveThreads = () => useQuery(get('/ai/executive/threads', ['ai', 'executive', 'threads']))

function invalidateAdmin(qc) {
  qc.invalidateQueries({ queryKey: ['admin'] })
  qc.invalidateQueries({ queryKey: ['admin-intelligence'] })
}

export function useCreateAdminStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/admin/students', data: payload }).then((r) => r.data),
    onSuccess: () => invalidateAdmin(qc),
  })
}

export function useCreateAdminFaculty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/admin/faculty', data: payload }).then((r) => r.data),
    onSuccess: () => invalidateAdmin(qc),
  })
}

export function useInviteAdminUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/admin/users/invite', data: payload }).then((r) => r.data),
    onSuccess: () => invalidateAdmin(qc),
  })
}

export function useSetAdminUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, status }) =>
      request({ method: 'patch', url: `/admin/users/${userId}/status`, data: { status } }).then((r) => r.data),
    onSuccess: () => invalidateAdmin(qc),
  })
}

export function useCreateAdminDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/admin/departments', data: payload }).then((r) => r.data),
    onSuccess: () => invalidateAdmin(qc),
  })
}

export function useCreateAdminProgram() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/admin/programs', data: payload }).then((r) => r.data),
    onSuccess: () => invalidateAdmin(qc),
  })
}

export function useCreateAdminCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/admin/courses', data: payload }).then((r) => r.data),
    onSuccess: () => invalidateAdmin(qc),
  })
}

export function useCreateAdminSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/admin/subjects', data: payload }).then((r) => r.data),
    onSuccess: () => invalidateAdmin(qc),
  })
}

export function useCreateAdminBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/admin/batches', data: payload }).then((r) => r.data),
    onSuccess: () => invalidateAdmin(qc),
  })
}

export function useCreateAdminCalendarEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/admin/calendar', data: payload }).then((r) => r.data),
    onSuccess: () => invalidateAdmin(qc),
  })
}

export function useSaveAdminSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'patch', url: '/admin/settings', data: payload }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] })
      qc.invalidateQueries({ queryKey: ['admin-intelligence'] })
    },
  })
}

export function useCreateAdminSupportTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/admin/support', data: payload }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'support'] }),
  })
}

export function useCreateAdminReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/admin/reports', data: payload }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] })
      qc.invalidateQueries({ queryKey: ['admin-intelligence'] })
    },
  })
}

export function useDeleteAdminReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => request({ method: 'delete', url: `/admin/reports/${id}` }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  })
}

export function useDownloadAdminReport() {
  return useMutation({
    mutationFn: async (report) => {
      if (report?.generationStatus && report.generationStatus !== 'READY') {
        throw new Error('Report is not ready for download')
      }
      const response = await request({
        method: 'get',
        url: `/admin/reports/${report.id}/download`,
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: response.headers?.['content-type'] || 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${(report.title || 'report').replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      return { ok: true }
    },
  })
}

export function useExecutiveAsk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ message, conversationId }) =>
      request({ method: 'post', url: '/ai/executive/ask', data: { message, conversationId } }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'executive', 'threads'] }),
  })
}

export function useSaveStudioItem() {
  return useMutation({
    mutationFn: (payload) => request({ method: 'post', url: '/faculty/ai-studio/save', data: payload }).then((r) => r.data),
  })
}

/* ================= PYQ Analysis (faculty) ================= */
export const usePYQAnalysis = () => useQuery(get('/faculty/pyq-analysis', ['faculty', 'pyq-analysis']))
export const usePYQFilters = () => useQuery(get('/faculty/pyq-analysis/filters', ['faculty', 'pyq-analysis', 'filters']))
export const usePYQPatterns = () => useQuery(get('/faculty/pyq-analysis/patterns', ['faculty', 'pyq-analysis', 'patterns']))
export const usePYQAnalytics = (subject) =>
  useQuery({
    queryKey: ['faculty', 'pyq-analysis', 'analytics', subject ?? 'ALL'],
    queryFn: () => request({ url: '/faculty/pyq-analysis/analytics', params: { subject } }).then((r) => r.data),
    enabled: !!subject,
  })

/* ================= ADMIN — Faculty Analytics ================= */
export const useAdminFacultyAnalytics = (facultyId) =>
  useQuery({
    ...get(`/admin/faculty/${facultyId}/analytics`, ['admin', 'faculty', facultyId, 'analytics']),
    enabled: !!facultyId,
  })

/* ================= ADMIN — Exam Oversight (terminated attempts) ================= */

/** All terminated exam attempts institution-wide (admin view). */
export const useAdminTerminatedAttempts = () =>
  useQuery({
    queryKey: ['admin', 'terminated-attempts'],
    queryFn: () => request({ url: '/admin/exam-attempts/terminated' }).then((r) => r.data),
    staleTime: 1000 * 30,
  })

/** Admin grants resume — student continues with previous answers + remaining time. */
export function useAdminGrantResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attemptId) =>
      request({ method: 'post', url: `/admin/exam-attempts/${attemptId}/grant-resume` }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'terminated-attempts'] }),
  })
}

/** Admin restarts — old attempt discarded, student starts from scratch. */
export function useAdminRestartExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attemptId) =>
      request({ method: 'post', url: `/admin/exam-attempts/${attemptId}/restart` }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'terminated-attempts'] }),
  })
}
