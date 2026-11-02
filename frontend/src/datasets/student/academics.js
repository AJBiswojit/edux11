/**
 * Student academics — backend-owned dataset (DATA SHELL).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal): the seeded student
 * dashboard / attendance / assignments / courses / calendar / resources /
 * progress and the mock-tests / exams records were backend-owned entity data
 * served by the (now-removed) in-browser prototype adapter. They are
 * physically REMOVED — the Student pages receive all of this from the
 * service layer (backend).
 *
 * Student identity is preserved from the single source of truth (the master
 * profile). Every entity array/object is empty so the UI consumes the
 * loading/empty/neutral state.
 */

import { masterStudentProfile, studentAcademicProfile as academicProfileView } from '@/intelligence/master-profile'

export const studentProfile = masterStudentProfile
export const studentAcademicProfile = academicProfileView

export const studentDashboard = { kpis: [], weeklyActivity: [], subjectMastery: [], atRisk: [] }
export const studentAttendance = { classes: [], weeklyTrend: [], summary: {} }
export const studentAssignments = []
export const studentCourses = []
export const courseDetail = { info: {}, modules: [] }
export const studentSubjects = []
export const calendarEvents = []
export const mockTests = []
export const exams = []
export const academicResources = []
export const academicProgress = { overview: {}, trend: [] }
