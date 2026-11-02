/**
 * Student Intelligence — learning datasets.
 * Practice sessions · learning behaviour · study statistics.
 * All records reference the master student and subject codes.
 */

import { studentId } from './academics.js'

/* ------------------------------------------------------------------ */
/* Practice sessions (MediXO Mentor / AI tutor sessions)               */
/* ------------------------------------------------------------------ */
export const practiceSessions = [
  { id: 'ps1', studentId, subjectCode: 'CS504', subject: 'Networks', topic: 'TCP congestion control — slow start & avoidance', date: '2026-08-04', durationMin: 26, outcome: 'Mastered', score: 92 },
  { id: 'ps2', studentId, subjectCode: null, subject: 'Mathematics', topic: 'Definite integration — substitution techniques', date: '2026-08-03', durationMin: 41, outcome: 'Improving', score: 64 },
  { id: 'ps3', studentId, subjectCode: 'CS501', subject: 'DSA', topic: 'AVL trees — rotations deep dive', date: '2026-08-02', durationMin: 33, outcome: 'Mastered', score: 95 },
  { id: 'ps4', studentId, subjectCode: null, subject: 'Physics', topic: 'Ray optics — sign conventions', date: '2026-08-01', durationMin: 22, outcome: 'Needs review', score: 48 },
  { id: 'ps5', studentId, subjectCode: null, subject: 'Chemistry', topic: 'Coordination compounds — NCERT tables', date: '2026-07-30', durationMin: 35, outcome: 'Improving', score: 58 },
  { id: 'ps6', studentId, subjectCode: 'CS501', subject: 'DSA', topic: 'BFS/DFS vs Dijkstra — when to use what', date: '2026-07-29', durationMin: 19, outcome: 'Mastered', score: 90 },
  { id: 'ps7', studentId, subjectCode: 'CS502', subject: 'DBMS', topic: 'Isolation levels — anomalies walkthrough', date: '2026-07-27', durationMin: 28, outcome: 'Mastered', score: 88 },
  { id: 'ps8', studentId, subjectCode: 'CS503', subject: 'OS', topic: 'Page replacement — FIFO/LRU/Optimal traces', date: '2026-07-25', durationMin: 31, outcome: 'Improving', score: 72 },
  { id: 'ps9', studentId, subjectCode: null, subject: 'Mathematics', topic: '3D geometry — skew line distance', date: '2026-07-23', durationMin: 24, outcome: 'Needs review', score: 52 },
  { id: 'ps10', studentId, subjectCode: 'CS505', subject: 'ML', topic: 'Gradient descent convergence intuition', date: '2026-07-21', durationMin: 30, outcome: 'Mastered', score: 94 },
]

/* ------------------------------------------------------------------ */
/* Learning behaviour (session & focus patterns)                       */
/* ------------------------------------------------------------------ */
export const learningBehaviour = {
  id: 'lb_sem5',
  studentId,
  focusHoursByTimeOfDay: [
    { slot: '6–9 AM', hours: 1.8, focus: 88 },
    { slot: '9 AM–12 PM', hours: 1.2, focus: 74 },
    { slot: '12–3 PM', hours: 0.6, focus: 58 },
    { slot: '3–6 PM', hours: 1.5, focus: 79 },
    { slot: '6–9 PM', hours: 2.2, focus: 91 },
    { slot: '9 PM–12 AM', hours: 1.4, focus: 82 },
  ],
  sessionLengthDistribution: [
    { bucket: '< 15 min', sessions: 6 },
    { bucket: '15–30 min', sessions: 14 },
    { bucket: '30–60 min', sessions: 9 },
    { bucket: '> 60 min', sessions: 3 },
  ],
  activeDaysPerWeek: 6,
  preferredModes: ['Video lectures', 'Practice problems', 'AI chat explanations'],
  distractionScore: 22, // lower = more focused
  consistencyNote: 'Most consistent between 6–9 PM; Monday attendance dips slightly.',
}

/* ------------------------------------------------------------------ */
/* Study statistics                                                    */
/* ------------------------------------------------------------------ */
export const studyStatistics = {
  id: 'ss_sem5',
  studentId,
  weeklyHours: 27.1,
  avgFocus: 84,
  streakDays: 12,
  longestStreak: 21,
  totalSessions: 86,
  totalHoursThisSemester: 212,
  weeklyActivity: [
    { day: 'Mon', hours: 3.2, focus: 82 },
    { day: 'Tue', hours: 4.1, focus: 88 },
    { day: 'Wed', hours: 2.6, focus: 74 },
    { day: 'Thu', hours: 3.8, focus: 85 },
    { day: 'Fri', hours: 4.6, focus: 91 },
    { day: 'Sat', hours: 5.2, focus: 94 },
    { day: 'Sun', hours: 3.4, focus: 79 },
  ],
  hoursBySubject: [
    { subjectCode: 'CS501', subject: 'Data Structures & Algorithms', hours: 6.8 },
    { subjectCode: 'CS502', subject: 'Database Management Systems', hours: 4.2 },
    { subjectCode: 'CS503', subject: 'Operating Systems', hours: 4.6 },
    { subjectCode: 'CS504', subject: 'Computer Networks', hours: 3.4 },
    { subjectCode: 'CS505', subject: 'Machine Learning', hours: 5.1 },
    { subjectCode: 'CS506', subject: 'Theory of Computation', hours: 3.0 },
  ],
  monthlyHoursTrend: [
    { month: 'Mar', hours: 88 },
    { month: 'Apr', hours: 94 },
    { month: 'May', hours: 102 },
    { month: 'Jun', hours: 108 },
    { month: 'Jul', hours: 116 },
    { month: 'Aug', hours: 112 },
  ],
}
