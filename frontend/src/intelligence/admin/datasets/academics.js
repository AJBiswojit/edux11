/**
 * Admin Intelligence — academic data foundation (relational layer).
 *
 * Normalizes relationships between Institution → Departments → Programs →
 * Courses → Subjects → Batches → Students → Faculty, plus the academic
 * calendar, assessments, exams, question bank and PYQ pointers.
 *
 * INPUTS ONLY — no derived intelligence lives here (that is the engine's
 * job). Existing authoritative datasets are re-exported; the relations
 * below join them by department / program / faculty keys.
 */

import { DEPARTMENTS } from '@/datasets/platform/users.js'
import {
  adminPrograms, adminSubjects, adminBatches, adminAcademicCalendar,
  adminExamAnalytics, adminQuestionBank,
} from '@/datasets/admin/operations.js'
import { adminCourses } from '@/datasets/admin/core.js'

/* ---------- re-export authoritative datasets ---------- */
export {
  adminPrograms, adminSubjects, adminBatches, adminAcademicCalendar,
  adminExamAnalytics, adminQuestionBank, adminCourses,
}

/* ---------- relations ---------- */

/* Courses by department (adminCourses.dept already uses short codes). */
export const coursesByDept = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.code, adminCourses.filter((c) => c.dept === d.code)])
)

/* Subjects grouped by program (adminSubjects.program, e.g. "B.Tech CSE"). */
export const subjectsByProgram = adminSubjects.reduce((acc, s) => {
  acc[s.program] = acc[s.program] ?? []
  acc[s.program].push(s)
  return acc
}, {})

/* Batches grouped by program. */
export const batchesByProgram = adminBatches.reduce((acc, b) => {
  acc[b.program] = acc[b.program] ?? []
  acc[b.program].push(b)
  return acc
}, {})

/* Program → department mapping (adminPrograms.dept short codes). */
export const programDeptMap = Object.fromEntries(adminPrograms.map((p) => [p.name, p.dept]))

/* Department → HOD map (from DEPARTMENTS). */
export const deptHodMap = Object.fromEntries(DEPARTMENTS.map((d) => [d.code, d.hod]))

/* Courses taught per faculty member (adminCourses.faculty names). */
export const coursesByFaculty = adminCourses.reduce((acc, c) => {
  acc[c.faculty] = acc[c.faculty] ?? []
  acc[c.faculty].push(c)
  return acc
}, {})

/* Faculty per department (from DEPARTMENTS counts; roster in people.js). */
export const facultyPerDept = Object.fromEntries(DEPARTMENTS.map((d) => [d.code, d.faculty]))

/* Academic calendar grouped by type. */
export const calendarByType = adminAcademicCalendar.reduce((acc, e) => {
  acc[e.type] = acc[e.type] ?? []
  acc[e.type].push(e)
  return acc
}, {})

/* Upcoming exams (from exam analytics) grouped by readiness status. */
export const examsByStatus = adminExamAnalytics.upcoming.reduce((acc, e) => {
  acc[e.status] = acc[e.status] ?? []
  acc[e.status].push(e)
  return acc
}, {})

/* Question bank summary + per-subject questions. */
export const questionBankBySubject = adminQuestionBank.questions.reduce((acc, q) => {
  acc[q.subject] = acc[q.subject] ?? []
  acc[q.subject].push(q)
  return acc
}, {})

export default {
  DEPARTMENTS,
  adminPrograms, adminSubjects, adminBatches, adminAcademicCalendar,
  adminExamAnalytics, adminQuestionBank, adminCourses,
  coursesByDept, subjectsByProgram, batchesByProgram, programDeptMap,
  deptHodMap, coursesByFaculty, facultyPerDept, calendarByType,
  examsByStatus, questionBankBySubject,
}
