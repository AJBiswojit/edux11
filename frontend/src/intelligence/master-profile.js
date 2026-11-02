/**
 * MediXO EduX — Master Student Profile (single source of truth).
 *
 * Every academic intelligence dataset and every future AI module (Academic
 * DNA, Exam Readiness, Career Readiness, Digital Portfolio, Academic
 * Journey, Student Success Center) derives from THIS profile. No module
 * should maintain its own copy of the student's identity.
 *
 * Field strategy:
 *  - Top-level scalar fields (program, semester, institution, …) are kept
 *    as plain strings for backward compatibility with existing pages.
 *  - Rich structured views (*Info, currentSemester, academicProgram) are
 *    provided alongside so future modules never parse strings.
 */

export const masterStudentProfile = {
  /* ---------- identity ---------- */
  id: 'u_stu_001',
  firstName: 'Aarav',
  lastName: 'Sharma',
  fullName: 'Aarav Sharma',
  gender: 'Male',
  dateOfBirth: '2004-03-12',
  bloodGroup: 'B+',
  photo: null,
  avatarGradient: 'linear-gradient(135deg, #6366f1, #3b82f6)',

  /* ---------- contact ---------- */
  email: 'aarav.sharma@medixoedux.edu',
  phone: '+91 98765 43210',
  address: {
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411044',
    country: 'India',
  },

  /* ---------- institution ----------
     City aligned with the institution registry (Phase 27.1 data-consistency
     fix): the Admin institution profile (src/intelligence/admin/master-profile.js)
     and the user directory (src/datasets/platform/users.js) both place Meridian
     Institute of Technology in Pune — the student profile is derived from
     the same registry and no longer contradicts it. */
  institution: 'Institute of Technology',
  institutionInfo: {
    id: 'inst_mit',
    name: 'Institute of Technology',
    city: 'Pune',
    state: 'Maharashtra',
    accreditation: 'AICTE · NBA Tier-1',
  },

  /* ---------- academic identity (compat scalars) ----------
     Timeline fix (Phase 27.1): the platform-wide academic narrative is
     "Semester 5 · 2026–27 in progress" (midsems Aug 19–23, 2026; end-sem
     Dec 2026). A 2021 intake would have graduated in 2025, so the identity
     fields are aligned to a 2024 intake: Sem 1 2024-25 → Sem 5 2026-27.
     NOTE: the roll number keeps the institution-wide "21CS" ID format used
     across the user directory, faculty roster and admin datasets — it is an
     ID-format artifact, not an admission-year claim. */
  studentId: '21CS114',
  rollNo: '21CS114',
  enrollmentNo: 'ENR-2024-0147',
  program: 'B.Tech — Computer Science',
  branch: 'Computer Science & Engineering',
  department: 'Computer Science & Engineering',
  semester: 'Semester 5',
  section: 'B1',
  batch: '2024–2028',
  admissionYear: 2024,
  enrollmentDate: '2024-07-19',
  expectedGraduation: '2028-06-30',
  academicStatus: 'Regular',
  cgpa: 8.72,
  attendance: 92.4,
  rank: 14,
  cohortSize: 220,

  /* ---------- rich academic structure ---------- */
  academicProgram: {
    id: 'prog_btech_cse',
    code: 'B.TECH-CSE',
    name: 'B.Tech — Computer Science & Engineering',
    level: 'Undergraduate',
    durationYears: 4,
    totalSemesters: 8,
    totalCredits: 160,
    earnedCredits: 118,
  },
  branchInfo: {
    id: 'dept_cse',
    code: 'CSE',
    name: 'Computer Science & Engineering',
    hod: 'Dr. Meera Krishnan',
  },
  /* ---------- competitive preparation (Phase 27.1) ----------
     A student may hold BOTH a university education and a competitive-exam
     preparation — this is a VALID state (Part 15). The competitive engine
     (src/intelligence/engine/competitive.js) consumes these base signals;
     readiness/prep progress are recomputed from mock + PYQ performance.
     Target dates follow the real exam calendar (JEE Main 2027 session 1,
     NEET 2027). */
  competitiveProfile: {
    enabled: true,
    primaryExam: 'JEE',
    exams: [
      {
        id: 'jee',
        family: 'JEE',
        name: 'JEE (Main & Advanced)',
        status: 'Preparing',
        targetDate: '2027-01-24',
        pattern: 'CBT',
        subjects: ['Physics', 'Chemistry', 'Mathematics'],
        prepProgress: 68,
      },
      {
        id: 'neet',
        family: 'NEET',
        name: 'NEET (UG)',
        status: 'Practicing',
        targetDate: '2027-05-02',
        pattern: 'OMR',
        subjects: ['Physics', 'Chemistry', 'Biology'],
        prepProgress: 52,
      },
    ],
  },
  currentSemester: {
    id: 'sem_5_2026_27',
    number: 5,
    code: 'SEM5',
    name: 'Semester 5',
    credits: 21,
    academicYear: '2026–27',
    startDate: '2026-07-20',
    endDate: '2026-12-15',
    status: 'In Progress',
  },

  /* ---------- support network ---------- */
  advisor: 'Prof. Vikram Rao',
  advisorInfo: {
    id: 'fac_vikram_rao',
    name: 'Prof. Vikram Rao',
    designation: 'Associate Professor',
    department: 'Computer Science & Engineering',
    email: 'vikram.rao@medixoedux.edu',
  },
  mentor: 'Dr. Meera Krishnan',
  mentorInfo: {
    id: 'fac_meera_krishnan',
    name: 'Dr. Meera Krishnan',
    designation: 'Professor',
    department: 'Computer Science & Engineering',
    email: 'meera.krishnan@medixoedux.edu',
  },
}

/** Backward-compatible view consumed by the existing Dashboard Academic
 *  Information Card — derived from the master profile, never duplicated. */
export const studentAcademicProfile = {
  id: masterStudentProfile.id,
  name: masterStudentProfile.fullName,
  studentId: masterStudentProfile.studentId,
  rollNo: masterStudentProfile.rollNo,
  program: masterStudentProfile.program,
  branch: masterStudentProfile.branch,
  department: masterStudentProfile.department,
  semester: masterStudentProfile.semester,
  section: masterStudentProfile.section,
  mentor: masterStudentProfile.mentor,
  advisor: masterStudentProfile.advisor,
  cgpa: masterStudentProfile.cgpa,
  attendance: masterStudentProfile.attendance,
  institution: masterStudentProfile.institution,
  avatarGradient: masterStudentProfile.avatarGradient,
}

export default masterStudentProfile
