/**
 * Admin Intelligence — institutions dataset.
 *
 * Institution-level relational references: departments, programs, campuses,
 * academic terms and the authoritative enrolment distribution. Values are
 * sourced from the master profile + existing deterministic admin datasets — this file
 * only normalizes access, it never invents new numbers.
 */

import { masterInstitutionProfile } from '../master-profile.js'
import { adminDashboard } from '@/datasets/admin/core.js'
import { DEPARTMENTS } from '@/datasets/platform/users.js'
import { adminPrograms } from '@/datasets/admin/operations.js'
import { adminSettings } from '@/datasets/admin/core.js'

/* Departments (authoritative: master profile mirrors DEPARTMENTS). */
export const institutionDepartments = masterInstitutionProfile.departments.map((d) => ({
  ...d,
  _source: 'DEPARTMENTS',
}))

/* Program catalogue (authoritative: adminPrograms). */
export const institutionPrograms = adminPrograms.map((p) => ({
  code: p.id,
  name: p.name,
  dept: p.dept,
  duration: p.duration,
  students: p.students,
  intake: p.intake,
  fee: p.fee,
  accreditations: p.accreditations,
  placements: p.placements,
  status: p.status,
}))

/* Campuses & branches (master profile). */
export const institutionCampuses = masterInstitutionProfile.campuses
export const institutionBranches = masterInstitutionProfile.branches

/* Academic terms (master profile + admin settings). */
export const institutionTerms = {
  academicYear: masterInstitutionProfile.academicYear,
  currentSemester: masterInstitutionProfile.currentSemester,
  semesterSystem: adminSettings?.academics?.semesterSystem ?? 'Semester',
  gradingScale: adminSettings?.academics?.gradingScale ?? '10-point CGPA',
  attendanceThreshold: adminSettings?.academics?.attendanceThreshold ?? 75,
  passMark: adminSettings?.academics?.passMark ?? 40,
}

/* Enrolment distribution (authoritative: adminDashboard.deptDistribution). */
export const institutionEnrolmentDistribution = (adminDashboard?.deptDistribution ?? []).map((d) => ({
  dept: d.name,
  students: d.value,
  color: d.color,
}))

/* Institution identity (master profile view). */
export const institutionIdentity = {
  id: masterInstitutionProfile.id,
  name: masterInstitutionProfile.name,
  shortName: masterInstitutionProfile.shortName,
  type: masterInstitutionProfile.type,
  address: masterInstitutionProfile.address,
  phone: masterInstitutionProfile.phone,
  email: masterInstitutionProfile.email,
  timezone: masterInstitutionProfile.timezone,
  fiscalYear: masterInstitutionProfile.fiscalYear,
  leadership: masterInstitutionProfile.leadership,
}

export default {
  institutionIdentity,
  institutionDepartments,
  institutionPrograms,
  institutionCampuses,
  institutionBranches,
  institutionTerms,
  institutionEnrolmentDistribution,
  DEPARTMENTS,
}
