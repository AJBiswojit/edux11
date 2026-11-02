/**
 * Admin Intelligence — AI data foundation (DATA SHELL).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal): the seeded executive
 * insight pools, intervention recommendation templates, report templates and
 * prompt seeds were backend-owned narrative/analytics data. They are
 * physically REMOVED — the Executive AI workspace and reporting receive
 * these from the service layer (backend).
 *
 * Export names are preserved so the admin intelligence aggregation still
 * resolves; every value is empty (UI consumes loading/empty/neutral state).
 */

export const execInsightPool = []
export const interventionPool = []
export const adminReportTemplates = []
export const execPromptSeeds = []

export default { execInsightPool, interventionPool, adminReportTemplates, execPromptSeeds }
