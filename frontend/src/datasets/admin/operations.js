/**
 * Admin operations — backend-owned dataset (DATA SHELL).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal): the seeded revenue /
 * programs / subjects / batches / academic calendar / attendance · assignment
 * · exam analytics / question bank / scholarships / CMS / API config / data
 * tools were backend-owned entity data. They are physically REMOVED — the
 * Admin pages receive all of this from the service layer (backend).
 *
 * Export names are preserved so the admin intelligence aggregation still
 * resolves; every value is empty (UI consumes loading/empty/neutral state).
 */

export const adminRevenue = { kpis: [], monthly: [] }
export const adminPrograms = []
export const adminSubjects = []
export const adminBatches = []
export const adminAcademicCalendar = []
export const adminAttendanceAnalytics = { byDept: [], trend: [] }
export const adminAssignmentAnalytics = { byDept: [], completion: [] }
export const adminExamAnalytics = { bySubject: [], upcoming: [], readiness: {} }
export const adminQuestionBank = { questions: [], summary: {} }
export const adminScholarships = []
export const adminCms = { pages: [] }
export const adminApiConfig = { endpoints: [], health: {} }
export const adminDataTools = { exports: [], imports: [] }
