/**
 * Student Intelligence — outcome datasets.
 * Academic performance · recommendations (base pool) · notifications · achievements.
 * The engine ranks/derives from these; the base pools are DATA ONLY inputs.
 */

import { studentId } from './academics.js'

/* ------------------------------------------------------------------ */
/* Academic performance (semester-wise + subject grades)               */
/* ------------------------------------------------------------------ */
export const academicPerformance = {
  id: 'perf_sem5',
  studentId,
  currentCGPA: 8.72,
  targetCGPA: 9.0,
  /* Phase 27.3: semester progress target (consumed by Academics "Semester
     health" — previously a hardcoded literal in the page). */
  progressTarget: 65,
  semesterHistory: [
    { semester: 'Sem 1', credits: 20, gpa: 7.8, cgpa: 7.8, status: 'Completed', rank: 42 },
    { semester: 'Sem 2', credits: 20, gpa: 8.1, cgpa: 7.95, status: 'Completed', rank: 34 },
    { semester: 'Sem 3', credits: 21, gpa: 8.3, cgpa: 8.05, status: 'Completed', rank: 28 },
    { semester: 'Sem 4', credits: 21, gpa: 8.6, cgpa: 8.2, status: 'Completed', rank: 19 },
    { semester: 'Sem 5', credits: 21, gpa: null, cgpa: 8.72, status: 'In Progress', rank: 14 },
  ],
  subjectGrades: [
    { subjectCode: 'CS501', subject: 'Data Structures & Algorithms', internal: 86, attendance: 96, projectedGrade: 'A' },
    { subjectCode: 'CS502', subject: 'Database Management Systems', internal: 78, attendance: 90, projectedGrade: 'A-' },
    { subjectCode: 'CS503', subject: 'Operating Systems', internal: 74, attendance: 88, projectedGrade: 'B+' },
    { subjectCode: 'CS504', subject: 'Computer Networks', internal: 69, attendance: 86, projectedGrade: 'B' },
    { subjectCode: 'CS505', subject: 'Machine Learning', internal: 82, attendance: 98, projectedGrade: 'A' },
    { subjectCode: 'CS506', subject: 'Theory of Computation', internal: 64, attendance: 92, projectedGrade: 'B' },
  ],
  creditsEarned: 118,
  creditsTarget: 160,
  rankTrend: [42, 34, 28, 19, 14],
}

/* ------------------------------------------------------------------ */
/* Recommendations (base pool — engine re-ranks & filters)             */
/* ------------------------------------------------------------------ */
export const recommendations = [
  { id: 'rec1', studentId, type: 'revision', priority: 'Critical', topic: 'Pumping lemma proofs', subjectCode: 'CS506', reason: '58% mastery and an improvement exam scheduled Aug 9', effort: '4 days', impact: 'High', source: 'engine:academic-dna' },
  { id: 'rec2', studentId, type: 'practice', priority: 'Critical', topic: 'TCP congestion control numericals', subjectCode: 'CS504', reason: 'Weakest competitive topic (62%) — supplementary exam Aug 12', effort: '3 days', impact: 'High', source: 'engine:exam-readiness' },
  { id: 'rec3', studentId, type: 'revision', priority: 'High', topic: 'Definite integration — substitution & properties', subjectCode: null, reason: '64% on last practice; high JEE weightage', effort: '2 days', impact: 'High', source: 'engine:academic-dna' },
  { id: 'rec4', studentId, type: 'attendance', priority: 'High', topic: 'Networks lectures — attend next 3 without fail', subjectCode: 'CS504', reason: '86% attendance is the only subject below 90%', effort: '1 week', impact: 'Medium', source: 'engine:interventions' },
  { id: 'rec5', studentId, type: 'revision', priority: 'Medium', topic: 'Ray optics sign conventions', subjectCode: null, reason: '48% on the last optics practice session', effort: '1 day', impact: 'Medium', source: 'engine:academic-dna' },
  { id: 'rec6', studentId, type: 'practice', priority: 'Medium', topic: 'Coordination compounds — NCERT tables', subjectCode: null, reason: 'NCERT-detail errors cost 6 marks in the NEET mock', effort: '2 days', impact: 'Medium', source: 'engine:academic-dna' },
  { id: 'rec7', studentId, type: 'mock', priority: 'Medium', topic: 'Full Length Test before Aug 14', subjectCode: null, reason: 'Rehearsing the JEE Main pattern builds stamina for the real exam', effort: '3 hrs', impact: 'Medium', source: 'engine:exam-readiness' },
  { id: 'rec8', studentId, type: 'revision', priority: 'Low', topic: 'KMP string matching implementation', subjectCode: 'CS501', reason: 'Only lab miss — 64% on string tasks', effort: '1 day', impact: 'Low', source: 'engine:academic-dna' },
]

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */
export const notifications = [
  { id: 'nt1', studentId, type: 'deadline', title: 'DSA Assignment 4 due in 1 day', detail: 'Graph Algorithms problem set — 40% complete.', date: '2026-08-05', read: false, severity: 'high' },
  { id: 'nt2', studentId, type: 'exam', title: 'Improvement Exam — ToC on Aug 9', detail: 'Admit card issued · Hall LT-108 · Seat E-14.', date: '2026-08-05', read: false, severity: 'high' },
  { id: 'nt3', studentId, type: 'grade', title: 'Viva result declared — DBMS (16/20, A-)', detail: 'Class rank 11 · above average by 3.5 marks.', date: '2026-08-04', read: true, severity: 'medium' },
  { id: 'nt4', studentId, type: 'alert', title: 'Attendance advisory — Computer Networks', detail: 'At 86% — two more absences would tighten your buffer.', date: '2026-08-03', read: false, severity: 'medium' },
  { id: 'nt5', studentId, type: 'milestone', title: '12-day study streak 🔥', detail: 'Longest streak this semester. Keep the momentum!', date: '2026-08-02', read: true, severity: 'low' },
  { id: 'nt6', studentId, type: 'system', title: 'Midsem timetable released', detail: 'Aug 19–23 · 5 papers · seating published.', date: '2026-08-01', read: true, severity: 'low' },
]

/* ------------------------------------------------------------------ */
/* Achievements                                                        */
/* ------------------------------------------------------------------ */
export const achievements = [
  { id: 'ach1', studentId, title: 'Top 10% — National (ATS 4)', description: 'Secured 91.4 percentile in the All India Test Series.', status: 'Completed', date: '2026-08-02', icon: 'Trophy' },
  { id: 'ach2', studentId, title: '14-day Study Streak', description: 'Study every day for two weeks straight.', status: 'In Progress', progress: 86, target: 14, current: 12, icon: 'Flame' },
  { id: 'ach3', studentId, title: 'Perfect Attendance Week', description: '100% attendance in an entire teaching week.', status: 'Completed', date: '2026-07-24', icon: 'CalendarCheck2' },
  { id: 'ach4', studentId, title: 'Quiz Ace — DSA', description: 'Score 95%+ in any DSA quiz.', status: 'Completed', date: '2026-07-27', icon: 'Award' },
  { id: 'ach5', studentId, title: 'JEE Main 95+ Percentile', description: 'Cross the 95th percentile in a JEE Main mock.', status: 'In Progress', progress: 91, target: 95, current: 91.4, icon: 'Target' },
  { id: 'ach6', studentId, title: '50 Practice Sessions', description: 'Complete 50 AI tutor practice sessions.', status: 'In Progress', progress: 68, target: 50, current: 34, icon: 'BrainCircuit' },
  { id: 'ach7', studentId, title: 'CGPA 9.0', description: 'Reach a 9.0 cumulative GPA.', status: 'In Progress', progress: 97, target: 9.0, current: 8.72, icon: 'GraduationCap' },
]
