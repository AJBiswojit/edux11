/**
 * MediXO EduX — Master Institution Profile (single source of truth).
 *
 * Every admin intelligence dataset and every future admin AI module
 * (Command Center, Institution Intelligence Workspace, Executive AI,
 * Reports) derives from THIS profile. No module maintains its own copy of
 * institution identity.
 *
 * Field strategy mirrors the student/faculty foundations: plain scalar
 * fields for backward compatibility + rich structured views for future
 * modules. Authoritative values are re-used from the existing deterministic datasets:
 *  - 12,480 students  → adminDashboard.kpis + adminDashboard.deptDistribution
 *  - 640 faculty      → adminDashboard.kpis
 *  - 214 courses      → adminDashboard.kpis
 *  - 8 departments    → DEPARTMENTS (src/datasets/platform/users.js)
 *  - 8 programs       → adminPrograms (src/datasets/admin/operations.js)
 *  - Sem 5 · 2026-27  → adminSettings.academics
 *
 * Documented prototype approximations (admin list datasets are samples):
 *  - Listed departments account for 11,480 students; the remaining 1,000
 *    are the institution's "Other programs" bucket, consistent with the
 *    dashboard's deptDistribution "Others" slice (2,590 = MATH 860 +
 *    DES 730 + Other 1,000).
 *  - Listed departments account for 450 faculty; the remaining 190 are
 *    non-departmental / support faculty (total 640).
 */

export const masterInstitutionProfile = {
  /* ---------- identity ---------- */
  id: 'inst_mit_p',
  name: 'Institute of Technology',
  shortName: 'IT-P',
  type: 'Private Engineering & Management Institute',
  tagline: 'Empowering Smarter Learning Through AI',
  address: 'Knowledge Park, Pune 411044, Maharashtra',
  phone: '+91 20 4010 2200',
  email: 'info@institute.edu.in',
  timezone: 'IST (UTC+5:30)',
  fiscalYear: 'Apr – Mar',
  campuses: [
    { id: 'cmp1', name: 'Main Campus — Knowledge Park', city: 'Pune', students: 10480 },
    { id: 'cmp2', name: 'Innovation Campus — Hinjewadi', city: 'Pune', students: 2000 },
  ],
  branches: ['Pune (2 campuses)'],

  /* ---------- academic context ---------- */
  academicYear: '2026–27',
  currentSemester: { id: 'sem5_2026_27', name: 'Semester 5', label: 'Sem 5 · 2026-27', system: 'Semester', gradingScale: '10-point CGPA', attendanceThreshold: 75, passMark: 40 },
  academicCalendarContext: 'Midsem examinations Aug 19–23 · Semester break begins Sep 1 · Fee 2nd installment due Sep 15',

  /* ---------- scale (authoritative from adminDashboard) ---------- */
  totals: {
    students: 12480,
    faculty: 640,
    courses: 214,
    departments: 8,
    programs: 8,
    activeBatches: 8,
    listedDepartmentStudents: 11480, // documented approximation (see header)
    otherProgramStudents: 1000,       // documented approximation
    listedDepartmentFaculty: 450,     // documented approximation
    otherFaculty: 190,                // documented approximation
  },

  /* ---------- leadership ---------- */
  leadership: {
    director: 'Dr. Anil Menon',
    deanAcademics: 'Dr. S. Raghavan',
    registrar: 'Registrar Office',
    cfo: 'Accounts Office',
  },

  /* ---------- departments (authoritative from DEPARTMENTS) ---------- */
  departments: [
    { code: 'CSE', name: 'Computer Science & Engineering', students: 2480, faculty: 82, programs: 4, hod: 'Dr. Meera Krishnan', placement: 96.2 },
    { code: 'ECE', name: 'Electronics & Communication', students: 1930, faculty: 71, programs: 3, hod: 'Prof. Vikram Rao', placement: 91.8 },
    { code: 'ME', name: 'Mechanical Engineering', students: 1640, faculty: 64, programs: 3, hod: 'Prof. Sunita Bose', placement: 86.4 },
    { code: 'EE', name: 'Electrical Engineering', students: 1420, faculty: 58, programs: 3, hod: 'Dr. Farhan Ali', placement: 89.1 },
    { code: 'CE', name: 'Civil Engineering', students: 1180, faculty: 49, programs: 2, hod: 'Prof. James Thomas', placement: 78.6 },
    { code: 'MATH', name: 'Mathematics & Sciences', students: 860, faculty: 41, programs: 2, hod: 'Dr. Priya Nair', placement: 84.9 },
    { code: 'MBA', name: 'School of Business', students: 1240, faculty: 52, programs: 3, hod: 'Dr. Ritu Agarwal', placement: 93.5 },
    { code: 'DES', name: 'School of Design & Media', students: 730, faculty: 33, programs: 2, hod: 'Prof. Aditi Sen', placement: 88.2 },
  ],

  /* ---------- programs (authoritative from adminPrograms) ---------- */
  programs: [
    { code: 'BT-CSE', name: 'B.Tech — Computer Science', dept: 'CSE', duration: '4 yrs', students: 2480 },
    { code: 'BT-ECE', name: 'B.Tech — Electronics & Communication', dept: 'ECE', duration: '4 yrs', students: 1930 },
    { code: 'BT-ME', name: 'B.Tech — Mechanical', dept: 'ME', duration: '4 yrs', students: 1640 },
    { code: 'BT-EE', name: 'B.Tech — Electrical', dept: 'EE', duration: '4 yrs', students: 1420 },
    { code: 'MBA', name: 'MBA — General Management', dept: 'MBA', duration: '2 yrs', students: 1240 },
    { code: 'BDES', name: 'B.Des — Design & Media', dept: 'DES', duration: '4 yrs', students: 730 },
    { code: 'BT-CE', name: 'B.Tech — Civil', dept: 'CE', duration: '4 yrs', students: 1180 },
    { code: 'MSC-DS', name: 'M.Sc — Data Science', dept: 'MATH', duration: '2 yrs', students: 860 },
    { code: 'OTHER', name: 'Other programs', dept: null, duration: '—', students: 1000 },
  ],

  /* ---------- key context for intelligence ---------- */
  aiContext: {
    aiTutorModel: 'MediXO Tutor LLM v4.2',
    gradingModel: 'Grading Assistant v2.7',
    aiAdoptionSessions: 71000, // Aug 2026 (adminAnalytics.aiUsage)
  },
}

/** Backward-compatible view consumed by the admin layer (matches adminSettings.institution shape). */
export const institutionProfileView = {
  name: masterInstitutionProfile.name,
  shortName: masterInstitutionProfile.shortName,
  address: masterInstitutionProfile.address,
  phone: masterInstitutionProfile.phone,
  email: masterInstitutionProfile.email,
  timezone: masterInstitutionProfile.timezone,
  fiscalYear: masterInstitutionProfile.fiscalYear,
  academicYear: masterInstitutionProfile.academicYear,
  currentSemester: masterInstitutionProfile.currentSemester.label,
}

export default masterInstitutionProfile
