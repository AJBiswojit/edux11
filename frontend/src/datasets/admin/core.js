/**
 * Admin core — backend-owned dataset (DATA SHELL).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal): the seeded institution
 * dashboard / courses / analytics / performance / placements / research /
 * roles / permissions / audit logs / AI config / settings were backend-owned
 * entity data. They are physically REMOVED — the Admin pages receive all of
 * this from the service layer (backend).
 *
 * Export names are preserved so the admin intelligence aggregation still
 * resolves; every value is empty (UI consumes loading/empty/neutral state).
 */

export const adminDashboard = { kpis: [], enrollmentTrend: [], deptDistribution: [], alerts: [], activityFeed: [] }
export const adminCourses = []
export const adminAnalytics = { retention: [], genderSplit: [], semesterWise: [], feeCollection: [], aiUsage: [], satisfaction: {} }
export const adminPerformance = { gradeDistribution: [], deptPassRates: [], atRiskTrend: [], topStudents: [], interventionImpact: {} }
export const adminPlacements = { kpis: [], companyWise: [], branchWise: [], salaryTrend: [], drives: [] }
export const adminResearch = { kpis: [], grantTrend: [], byDept: [], topProjects: [] }
export const adminRoles = []
export const adminPermissions = []
export const adminAuditLogs = []
export const adminAiConfig = { models: [], quotas: [], guardrails: {}, prompts: [] }
export const adminSettings = { institution: {}, academics: {}, features: {}, security: {} }
