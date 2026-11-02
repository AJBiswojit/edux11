/**
 * Admin Intelligence — unified people dataset (SINGLE source of truth).
 *
 * Resolves the audit's roster duplication (3 faculty lists, 2 parent
 * lists, direct student import) into one normalized layer:
 *
 *  · students  → STUDENT_ROSTER (authoritative, src/datasets/platform/users.js)
 *  · faculty   → FACULTY_LIST (identity) ∪ ADMIN_USERS (email/status) ∪
 *                masterFacultyProfile (authoritative counts) ∪
 *                DEPARTMENTS (dept codes + HODs)
 *  · admins    → ADMIN_USERS (role = Admin)
 *  · parents   → ADMIN_USERS (role = Parent) — INTERNAL ONLY / future version
 *
 * Stale-value fix: Dr. Meera Krishnan previously appeared with 312 students
 * (stale snapshot). The authoritative value is 280 (masterFacultyProfile
 * teachingLoad.students) and is applied here — the page no longer holds a
 * local roster.
 *
 * Documented prototype carryover: publications counts for faculty rows were
 * only ever held in the old Faculty.jsx local roster; they are carried over
 * here as prototype defaults (Dr. Meera's 62 is authoritative via the
 * faculty master profile).
 */

import { STUDENT_ROSTER, FACULTY_LIST, ADMIN_USERS, DEPARTMENTS } from '@/datasets/platform/users.js'
import { masterFacultyProfile } from '../../faculty/master-profile.js'

/* ---------- helpers ---------- */
const DEPT_ALIASES = {
  'Computer Science': 'CSE', 'Computer Science & Engineering': 'CSE',
  'Electronics & Communication': 'ECE',
  'Mechanical': 'ME', 'Mechanical Engineering': 'ME',
  'Electrical': 'EE', 'Electrical Engineering': 'EE',
  'Civil': 'CE', 'Civil Engineering': 'CE',
  'Mathematics': 'MATH', 'Mathematics & Sciences': 'MATH',
  'Business School': 'MBA', 'School of Business': 'MBA',
  'Design & Media': 'DES', 'School of Design & Media': 'DES',
}
const deptCodeFor = (deptName) =>
  DEPT_ALIASES[deptName] ?? DEPARTMENTS.find((d) => d.name === deptName)?.code ?? null

const emailFor = (name) =>
  `${name.toLowerCase().replace(/[^a-z ]/g, '').replace(/^(dr|prof)\.?\s+/i, '').trim().replace(/\s+/g, '.')}@medixoedux.edu`

/* Publications carried from the previous Faculty.jsx roster (prototype
   defaults; only Dr. Meera's is authoritative via the master profile). */
const PUB_CARRYOVER = {
  'Dr. Meera Krishnan': 62,
  'Prof. Vikram Rao': 41,
  'Dr. Priya Nair': 18,
  'Dr. Arvind Kulkarni': 55,
  'Prof. Sunita Bose': 29,
  'Dr. Farhan Ali': 47,
  'Dr. Ritu Agarwal': 33,
  'Dr. Sunil Verma': 9,
  'Prof. James Thomas': 12,
  'Prof. Aditi Sen': 24,
}
const STUDENT_CARRYOVER = { 'Prof. James Thomas': 150, 'Prof. Aditi Sen': 190 }

/* ---------- students (authoritative from STUDENT_ROSTER) ---------- */
export const adminStudents = STUDENT_ROSTER.map((s) => ({
  id: s.id,
  name: s.name,
  roll: s.roll,
  cgpa: s.cgpa,
  attendance: s.attendance,
  internalMarks: s.internalMarks,
  status: s.status,
  dept: 'CSE',
  program: 'B.Tech CSE',
  email: emailFor(s.name),
}))

/* ---------- faculty (unified — no page-local roster) ---------- */
const baseFaculty = FACULTY_LIST.map((f, i) => {
  const adminUser = ADMIN_USERS.find((u) => u.name === f.name)
  const deptCode = deptCodeFor(f.dept)
  const isMaster = masterFacultyProfile.fullName === f.name
  return {
    id: `f${i + 1}`,
    name: f.name,
    email: adminUser?.email ?? emailFor(f.name),
    dept: deptCode ?? f.dept,
    designation: isMaster ? masterFacultyProfile.designation : f.role,
    courses: isMaster ? masterFacultyProfile.courses.length : f.courses,
    students: isMaster ? masterFacultyProfile.teachingLoad.students : f.students,
    publications: isMaster ? masterFacultyProfile.teachingStatistics.publications : (PUB_CARRYOVER[f.name] ?? null),
    status: adminUser?.status ?? 'Active',
  }
})

/* HODs present in DEPARTMENTS but absent from FACULTY_LIST (only Aditi Sen —
   James Thomas already exists in FACULTY_LIST, so no duplicate is created). */
const existingNames = new Set(baseFaculty.map((f) => f.name))
const extraFaculty = DEPARTMENTS
  .filter((d) => !existingNames.has(d.hod))
  .map((d, i) => ({
    id: `f${baseFaculty.length + i + 1}`,
    name: d.hod,
    email: emailFor(d.hod),
    dept: d.code,
    designation: 'Professor',
    courses: 2,
    students: STUDENT_CARRYOVER[d.hod] ?? 0,
    publications: PUB_CARRYOVER[d.hod] ?? null,
    status: 'Active',
  }))

/* Documented prototype carryover: Dr. Sunil Verma existed only in the old
   Faculty.jsx local roster (no authoritative source elsewhere). Preserved
   here so the roster keeps its 10-row UI. */
const SUNIL_CARRYOVER = {
  id: `f${baseFaculty.length + extraFaculty.length + 1}`,
  name: 'Dr. Sunil Verma',
  email: emailFor('Dr. Sunil Verma'),
  dept: 'CSE',
  designation: 'Assistant Professor',
  courses: 2,
  students: 160,
  publications: 9,
  status: 'Active',
}

export const adminFaculty = [...baseFaculty, ...extraFaculty, SUNIL_CARRYOVER]

/* ---------- admins (authoritative from ADMIN_USERS) ---------- */
export const adminAdministrators = ADMIN_USERS.filter((u) => u.role === 'Admin').map((u) => ({ ...u }))

/* ---------- parents — INTERNAL ONLY (future version) ----------
   Not exposed anywhere in the active Admin UI. Source of truth remains
   ADMIN_USERS parent rows + the (unreachable) parent module files. */
export const adminParentsInternal = ADMIN_USERS.filter((u) => u.role === 'Parent').map((u) => ({ ...u }))

/* ---------- unified people accessor ---------- */
export const adminPeople = {
  students: adminStudents,
  faculty: adminFaculty,
  administrators: adminAdministrators,
  parentsInternal: adminParentsInternal,
  totals: {
    students: adminStudents.length,
    faculty: adminFaculty.length,
    administrators: adminAdministrators.length,
    parentsInternal: adminParentsInternal.length,
  },
}

export default adminPeople
