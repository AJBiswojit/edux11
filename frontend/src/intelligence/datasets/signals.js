/**
 * Student Intelligence — signal datasets (DATA ONLY).
 * Academic health inputs · academic DNA signals · exam readiness inputs ·
 * intervention rules.
 *
 * These are the base observations the engine consumes. The engine derives
 * the actual scores/vectors/alerts from them — never hardcode derived
 * values in pages.
 */

import { studentId } from './academics.js'

/* ------------------------------------------------------------------ */
/* Academic health — base inputs                                       */
/* ------------------------------------------------------------------ */
export const academicHealthInputs = {
  id: 'health_sem5',
  studentId,
  attendanceWeight: 0.25,
  performanceWeight: 0.45,
  consistencyWeight: 0.2,
  workloadWeight: 0.1,
  workloadBalance: 78, // 0–100 (higher = healthy balance of deadlines)
  submissionTimeliness: 92, // % of submissions on time
  previousHealth: 81, // last semester health score (for trend)
  notes: 'Attendance is comfortable, workload spikes around midsems.',
}

/* ------------------------------------------------------------------ */
/* Academic DNA — base signals (per-subject mastery history)           */
/* ------------------------------------------------------------------ */
export const academicDnaInputs = {
  id: 'dna_sem5',
  studentId,
  masteryHistory: [
    { subjectCode: 'CS501', subject: 'Data Structures & Algorithms', mastery: 86, trend: '+4', consistency: 88, lastAssessed: '2026-08-02' },
    { subjectCode: 'CS502', subject: 'Database Management Systems', mastery: 78, trend: '+2', consistency: 82, lastAssessed: '2026-08-01' },
    { subjectCode: 'CS503', subject: 'Operating Systems', mastery: 74, trend: '+3', consistency: 76, lastAssessed: '2026-07-30' },
    { subjectCode: 'CS504', subject: 'Computer Networks', mastery: 69, trend: '-2', consistency: 71, lastAssessed: '2026-07-30' },
    { subjectCode: 'CS505', subject: 'Machine Learning', mastery: 82, trend: '+5', consistency: 86, lastAssessed: '2026-08-01' },
    { subjectCode: 'CS506', subject: 'Theory of Computation', mastery: 64, trend: '-3', consistency: 68, lastAssessed: '2026-07-29' },
  ],
  conceptSignals: [
    { subjectCode: 'CS501', concept: 'Graph algorithms (MST & shortest paths)', mastery: 88 },
    { subjectCode: 'CS501', concept: 'AVL trees & rotations', mastery: 85 },
    { subjectCode: 'CS501', concept: 'KMP string matching', mastery: 58 },
    { subjectCode: 'CS502', concept: 'Isolation levels & transactions', mastery: 84 },
    { subjectCode: 'CS502', concept: 'Query optimisation', mastery: 68 },
    { subjectCode: 'CS503', concept: 'CPU scheduling', mastery: 82 },
    { subjectCode: 'CS503', concept: 'Multilevel queues', mastery: 60 },
    { subjectCode: 'CS504', concept: 'Subnetting & CIDR', mastery: 84 },
    { subjectCode: 'CS504', concept: 'TCP congestion control', mastery: 60 },
    { subjectCode: 'CS505', concept: 'Gradient descent', mastery: 88 },
    { subjectCode: 'CS505', concept: 'Regularisation (L1/L2)', mastery: 62 },
    { subjectCode: 'CS506', concept: 'DFA/NFA construction', mastery: 80 },
    { subjectCode: 'CS506', concept: 'Pumping lemma proofs', mastery: 55 },
  ],
  learningStyle: 'Visual + problem-driven',
  retentionCurve: [
    { day: 0, retention: 100 },
    { day: 1, retention: 72 },
    { day: 3, retention: 58 },
    { day: 7, retention: 46 },
    { day: 14, retention: 38 },
  ],
  errorPatterns: [
    { pattern: 'NCERT detail slips', count: 4, subjects: ['Chemistry', 'Biology'] },
    { pattern: 'Sign convention errors', count: 3, subjects: ['Physics'] },
    { pattern: 'Rushed final steps in numericals', count: 3, subjects: ['Mathematics', 'Physics'] },
  ],
}

/* ------------------------------------------------------------------ */
/* Exam readiness — base inputs (per exam)                             */
/* ------------------------------------------------------------------ */
export const examReadinessInputs = [
  {
    examId: 'UNI-MID-CS501-2026', studentId, title: 'Mid Semester — Data Structures & Algorithms',
    date: '2026-08-19', syllabusCoverage: 78, mockAveragePct: 84, timeManagement: 82,
    revisionCompleted: 60, practiceDrills: 5, lastAssessmentPct: 84,
  },
  {
    examId: 'UNI-IMP-CS506-2026', studentId, title: 'Improvement Examination — Theory of Computation',
    date: '2026-08-09', syllabusCoverage: 55, mockAveragePct: 64, timeManagement: 70,
    revisionCompleted: 40, practiceDrills: 3, lastAssessmentPct: 64,
  },
  {
    examId: 'UNI-SUP-CS504-2026', studentId, title: 'Supplementary Examination — Computer Networks',
    date: '2026-08-12', syllabusCoverage: 62, mockAveragePct: 68, timeManagement: 74,
    revisionCompleted: 45, practiceDrills: 4, lastAssessmentPct: 68,
  },
  {
    examId: 'COMP-FLT-2026-08', studentId, title: 'Full Length Test (FLT) — JEE Main pattern',
    date: '2026-08-14', syllabusCoverage: 82, mockAveragePct: 60, timeManagement: 78,
    revisionCompleted: 65, practiceDrills: 6, lastAssessmentPct: 60.7,
  },
]

/* ------------------------------------------------------------------ */
/* Intervention rules (rule triggers the engine evaluates)             */
/* ------------------------------------------------------------------ */
export const interventionRules = [
  { id: 'rule1', studentId, type: 'attendance', condition: 'subject attendance < 88%', severity: 'advisory', autoAction: 'Recommend make-up lectures' },
  { id: 'rule2', studentId, type: 'performance', condition: 'exam pct < 55% in any subject', severity: 'critical', autoAction: 'Escalate to mentor with study plan' },
  { id: 'rule3', studentId, type: 'practice', condition: 'no practice session in 7 days', severity: 'advisory', autoAction: 'Nudge via notification' },
  { id: 'rule4', studentId, type: 'deadline', condition: 'assignment progress < 50% within 3 days of due date', severity: 'warning', autoAction: 'Remind + suggest time-block' },
  { id: 'rule5', studentId, type: 'cgpa', condition: 'CGPA gap to target > 0.3', severity: 'warning', autoAction: 'Suggest improvement plan' },
  { id: 'rule6', studentId, type: 'exam', condition: 'exam readiness < 60 with exam within 10 days', severity: 'critical', autoAction: 'Escalate with targeted revision plan' },
  { id: 'rule7', studentId, type: 'quiz', condition: 'quiz accuracy < 75% in any subject', severity: 'warning', autoAction: 'Queue concept drills for that subject' },
  { id: 'rule8', studentId, type: 'concept', condition: 'concept mastery < 60 in any assessed concept', severity: 'warning', autoAction: 'Add concept to revision queue' },
  { id: 'rule9', studentId, type: 'practice', condition: 'subject with fewer than 2 practice sessions this term', severity: 'advisory', autoAction: 'Suggest a starter drill set' },
]
