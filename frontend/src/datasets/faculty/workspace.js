/**
 * Faculty workspace — backend-owned dataset (DATA SHELL).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal): the seeded faculty
 * dashboard / attendance / assignments / question bank / student analytics /
 * research / lecture planner / exam builder / reports were backend-owned
 * entity data served by the (now-removed) prototype adapter. They are
 * physically REMOVED — the Faculty pages receive all of this from the
 * service layer (backend).
 *
 * The export names are preserved so the intelligence aggregation and the
 * Question Studio engine still resolve; every entity array/object is empty
 * (the UI consumes the loading/empty/neutral state). `questionBank` keeps
 * its `questions` key because the purely-deterministic Question Studio
 * engine still reads/mutates it as an empty contract — it holds no
 * authoritative questions.
 */

import { facultyProfileView } from '@/intelligence/faculty/master-profile.js'

export const facultyProfile = facultyProfileView

export const facultyDashboard = { kpis: [], todayLectures: [], classTrend: [], atRisk: [], recentSubmissions: [], aiAssistStats: {} }
export const facultyAttendance = { classes: [], weeklyTrend: [], summary: {}, studentsBelowThreshold: [], byClassTrend: [], attendanceVsPerformance: [], consecutiveMissing: [] }
export const facultyAssignments = []
export const questionBank = { summary: {}, questions: [] }
export const facultyStudentAnalytics = { distribution: [], bySubject: [], atRiskTrend: [] }
export const facultyResearch = { kpis: [], publications: [], byDept: [] }
export const facultyLecturePlanner = []
export const facultyExamBuilder = { blueprints: [], format: {} }
export const facultyReports = []
export const facultySettings = {}
