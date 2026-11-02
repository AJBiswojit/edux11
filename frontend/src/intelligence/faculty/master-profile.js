/**
 * MediXO EduX — Master Faculty Profile (single source of truth).
 *
 * Every faculty intelligence dataset and every future faculty AI module
 * (Teaching Intelligence, Assessment Intelligence, AI Teaching Assistant,
 * Reports) derives from THIS profile. No module maintains its own copy of
 * the faculty identity.
 *
 * Field strategy mirrors the student foundation: plain scalar fields for
 * backward compatibility + rich structured views for future modules.
 */

export const masterFacultyProfile = {
  /* ---------- identity ---------- */
  id: 'u_fac_001',
  facultyId: 'FAC-014',
  firstName: 'Meera',
  lastName: 'Krishnan',
  fullName: 'Dr. Meera Krishnan',
  gender: 'Female',
  email: 'meera.krishnan@medixoedux.edu',
  phone: '+91 98765 01234',
  avatarGradient: 'linear-gradient(135deg, #6366f1, #3b82f6)',

  /* ---------- professional ---------- */
  institution: 'Institute of Technology',
  department: 'Computer Science & Engineering',
  designation: 'Professor & Head, CSE',
  qualification: 'Ph.D. (Computer Science), IIT Bombay · M.Tech (CSE), NIT Trichy',
  experienceYears: 14,
  specialization: ['Data Structures & Algorithms', 'Graph Theory', 'Educational AI'],
  researchInterests: ['GraphRAG for adaptive assessments', 'Early academic-risk prediction'],
  officeHours: 'Mon & Wed, 3:00 – 5:00 PM',
  officeRoom: 'CSE-214',

  /* ---------- teaching load ---------- */
  courses: ['CS501', 'CS503', 'CS501-LAB'],
  subjects: ['Data Structures & Algorithms', 'Operating Systems'],
  assignedClasses: [
    { id: 'cls1', courseCode: 'CS501', section: 'Sec A', students: 72 },
    { id: 'cls2', courseCode: 'CS501', section: 'Sec B', students: 70 },
    { id: 'cls3', courseCode: 'CS501', section: 'Sec C', students: 70 },
    { id: 'cls4', courseCode: 'CS503', section: 'Sec B', students: 68 },
  ],
  teachingLoad: {
    courses: 3,
    sections: 4,
    students: 280,
    weeklyTeachingHours: 14,
    labsPerWeek: 2,
    advisoryGroups: 2,
  },
  weeklyTeachingHours: 14,
  advisorGroups: [
    { id: 'adv1', name: 'CSE Final Year Mentees', students: 24, focus: 'Placement & capstone guidance' },
    { id: 'adv2', name: 'AI & Systems Lab Team', students: 6, focus: 'Research mentoring (GraphRAG)' },
  ],

  /* ---------- semester context ---------- */
  currentSemester: { id: 'sem_5_2026_27', name: 'Semester 5', academicYear: '2026–27', startDate: '2026-07-20', endDate: '2026-12-15' },

  /* ---------- teaching statistics ---------- */
  teachingStatistics: {
    totalStudentsTaught: 280,
    cumulativeCourses: 24,
    avgClassAverage: 74.2,
    avgPassRate: 91,
    publications: 62,
    hIndex: 24,
  },

  /* ---------- goals ---------- */
  teachingGoals: [
    { id: 'tg1', title: 'Lift CS503 class average to 80%', target: 80, current: 74, due: '2026-12-15' },
    { id: 'tg2', title: 'Reduce at-risk students by 30%', target: 30, current: 14, unit: 'students', due: '2026-12-15' },
    { id: 'tg3', title: 'Publish 2 more journal papers', target: 2, current: 1, due: '2026-12-31' },
  ],

  /* ---------- department info ---------- */
  departmentInfo: {
    id: 'dept_cse',
    code: 'CSE',
    name: 'Computer Science & Engineering',
    hod: 'Dr. Meera Krishnan',
    facultyCount: 82,
    studentCount: 2480,
  },
}

/** Backward-compatible view consumed by the existing faculty mock layer. */
export const facultyProfileView = {
  id: masterFacultyProfile.id,
  name: masterFacultyProfile.fullName,
  designation: masterFacultyProfile.designation,
  institution: masterFacultyProfile.institution,
  department: masterFacultyProfile.department,
  officeHours: masterFacultyProfile.officeHours,
  email: masterFacultyProfile.email,
  phone: masterFacultyProfile.phone,
  facultyId: masterFacultyProfile.facultyId,
}

export default masterFacultyProfile
