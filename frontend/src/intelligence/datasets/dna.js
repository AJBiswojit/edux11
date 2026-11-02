/**
 * Student Intelligence — Academic DNA detail datasets (DATA ONLY).
 * Chapter mastery · topic mastery · mistake intelligence · weekly action
 * plan · improvement prediction · learning-behaviour details · academic
 * health breakdown inputs.
 *
 * All values are consistent with the master profile and the Phase-1
 * datasets (subject codes CS501–CS506, mastery signals, exam ids).
 */

import { studentId } from './academics.js'

/* ------------------------------------------------------------------ */
/* Chapter mastery (per subject)                                       */
/* ------------------------------------------------------------------ */
export const chapterMastery = [
  { subjectCode: 'CS501', subject: 'Data Structures & Algorithms', chapter: 'Graph Algorithms', mastery: 88, level: 'Mastered' },
  { subjectCode: 'CS501', subject: 'Data Structures & Algorithms', chapter: 'Trees & Heaps', mastery: 85, level: 'Mastered' },
  { subjectCode: 'CS501', subject: 'Data Structures & Algorithms', chapter: 'Sorting & Searching', mastery: 80, level: 'Mastered' },
  { subjectCode: 'CS501', subject: 'Data Structures & Algorithms', chapter: 'Dynamic Programming', mastery: 72, level: 'Improving' },
  { subjectCode: 'CS501', subject: 'Data Structures & Algorithms', chapter: 'String Algorithms', mastery: 58, level: 'Weak' },
  { subjectCode: 'CS502', subject: 'Database Management Systems', chapter: 'Transactions & Concurrency', mastery: 84, level: 'Mastered' },
  { subjectCode: 'CS502', subject: 'Database Management Systems', chapter: 'Relational Design', mastery: 82, level: 'Mastered' },
  { subjectCode: 'CS502', subject: 'Database Management Systems', chapter: 'Indexing', mastery: 68, level: 'Improving' },
  { subjectCode: 'CS502', subject: 'Database Management Systems', chapter: 'SQL & Query Optimisation', mastery: 62, level: 'Weak' },
  { subjectCode: 'CS503', subject: 'Operating Systems', chapter: 'CPU Scheduling', mastery: 82, level: 'Mastered' },
  { subjectCode: 'CS503', subject: 'Operating Systems', chapter: 'Memory Management', mastery: 76, level: 'Improving' },
  { subjectCode: 'CS503', subject: 'Operating Systems', chapter: 'Synchronisation', mastery: 64, level: 'Weak' },
  { subjectCode: 'CS503', subject: 'Operating Systems', chapter: 'File Systems', mastery: 55, level: 'Critical' },
  { subjectCode: 'CS504', subject: 'Computer Networks', chapter: 'Network Layer', mastery: 78, level: 'Improving' },
  { subjectCode: 'CS504', subject: 'Computer Networks', chapter: 'Transport Layer', mastery: 60, level: 'Critical' },
  { subjectCode: 'CS504', subject: 'Computer Networks', chapter: 'Application Protocols', mastery: 58, level: 'Critical' },
  { subjectCode: 'CS505', subject: 'Machine Learning', chapter: 'Regression', mastery: 88, level: 'Mastered' },
  { subjectCode: 'CS505', subject: 'Machine Learning', chapter: 'Neural Networks', mastery: 80, level: 'Mastered' },
  { subjectCode: 'CS505', subject: 'Machine Learning', chapter: 'Model Evaluation', mastery: 76, level: 'Improving' },
  { subjectCode: 'CS505', subject: 'Machine Learning', chapter: 'Unsupervised Learning', mastery: 62, level: 'Weak' },
  { subjectCode: 'CS506', subject: 'Theory of Computation', chapter: 'Automata', mastery: 80, level: 'Mastered' },
  { subjectCode: 'CS506', subject: 'Theory of Computation', chapter: 'Formal Languages', mastery: 72, level: 'Improving' },
  { subjectCode: 'CS506', subject: 'Theory of Computation', chapter: 'Decidability & Reductions', mastery: 52, level: 'Critical' },
]

/* ------------------------------------------------------------------ */
/* Topic mastery (per subject)                                         */
/* ------------------------------------------------------------------ */
export const topicMastery = [
  { subjectCode: 'CS501', subject: 'DSA', topic: 'Dijkstra & shortest paths', mastery: 90, confidence: 92, learningStatus: 'Mastered', lastPracticed: '2026-08-02' },
  { subjectCode: 'CS501', subject: 'DSA', topic: 'MST (Kruskal/Prim)', mastery: 88, confidence: 90, learningStatus: 'Mastered', lastPracticed: '2026-08-01' },
  { subjectCode: 'CS501', subject: 'DSA', topic: 'AVL rotations', mastery: 85, confidence: 88, learningStatus: 'Mastered', lastPracticed: '2026-07-30' },
  { subjectCode: 'CS501', subject: 'DSA', topic: '0/1 Knapsack (DP)', mastery: 76, confidence: 80, learningStatus: 'Improving', lastPracticed: '2026-07-28' },
  { subjectCode: 'CS501', subject: 'DSA', topic: 'KMP string matching', mastery: 58, confidence: 62, learningStatus: 'Needs Review', lastPracticed: '2026-07-25' },
  { subjectCode: 'CS501', subject: 'DSA', topic: 'Lazy segment trees', mastery: 52, confidence: 55, learningStatus: 'Critical', lastPracticed: '2026-07-22' },
  { subjectCode: 'CS502', subject: 'DBMS', topic: 'Isolation levels', mastery: 86, confidence: 90, learningStatus: 'Mastered', lastPracticed: '2026-07-31' },
  { subjectCode: 'CS502', subject: 'DBMS', topic: 'Normalisation (3NF/BCNF)', mastery: 84, confidence: 88, learningStatus: 'Mastered', lastPracticed: '2026-07-29' },
  { subjectCode: 'CS502', subject: 'DBMS', topic: 'B+ tree operations', mastery: 62, confidence: 66, learningStatus: 'Needs Review', lastPracticed: '2026-07-24' },
  { subjectCode: 'CS502', subject: 'DBMS', topic: 'Query execution plans', mastery: 58, confidence: 60, learningStatus: 'Critical', lastPracticed: '2026-07-21' },
  { subjectCode: 'CS503', subject: 'OS', topic: 'Scheduling policies', mastery: 84, confidence: 88, learningStatus: 'Mastered', lastPracticed: '2026-08-01' },
  { subjectCode: 'CS503', subject: 'OS', topic: 'Page replacement', mastery: 78, confidence: 82, learningStatus: 'Improving', lastPracticed: '2026-07-30' },
  { subjectCode: 'CS503', subject: 'OS', topic: 'Semaphore problems', mastery: 66, confidence: 70, learningStatus: 'Needs Review', lastPracticed: '2026-07-26' },
  { subjectCode: 'CS503', subject: 'OS', topic: 'File allocation', mastery: 52, confidence: 56, learningStatus: 'Critical', lastPracticed: '2026-07-20' },
  { subjectCode: 'CS504', subject: 'CN', topic: 'Subnetting & CIDR', mastery: 84, confidence: 88, learningStatus: 'Mastered', lastPracticed: '2026-07-29' },
  { subjectCode: 'CS504', subject: 'CN', topic: 'Routing algorithms', mastery: 76, confidence: 80, learningStatus: 'Improving', lastPracticed: '2026-07-27' },
  { subjectCode: 'CS504', subject: 'CN', topic: 'TCP congestion control', mastery: 58, confidence: 60, learningStatus: 'Critical', lastPracticed: '2026-07-23' },
  { subjectCode: 'CS505', subject: 'ML', topic: 'Gradient descent', mastery: 88, confidence: 92, learningStatus: 'Mastered', lastPracticed: '2026-08-02' },
  { subjectCode: 'CS505', subject: 'ML', topic: 'Evaluation metrics', mastery: 82, confidence: 86, learningStatus: 'Mastered', lastPracticed: '2026-07-31' },
  { subjectCode: 'CS505', subject: 'ML', topic: 'Regularisation (L1/L2)', mastery: 62, confidence: 66, learningStatus: 'Needs Review', lastPracticed: '2026-07-25' },
  { subjectCode: 'CS506', subject: 'ToC', topic: 'DFA/NFA construction', mastery: 82, confidence: 86, learningStatus: 'Mastered', lastPracticed: '2026-07-28' },
  { subjectCode: 'CS506', subject: 'ToC', topic: 'Context-free grammars', mastery: 72, confidence: 76, learningStatus: 'Improving', lastPracticed: '2026-07-26' },
  { subjectCode: 'CS506', subject: 'ToC', topic: 'Pumping lemma proofs', mastery: 52, confidence: 55, learningStatus: 'Critical', lastPracticed: '2026-07-19' },
]

/* ------------------------------------------------------------------ */
/* Mistake intelligence (aggregated across sources)                    */
/* ------------------------------------------------------------------ */
export const mistakeIntelligence = [
  { id: 'mk1', studentId, category: 'Concept Error', sources: ['Assignments', 'Quiz', 'University Exams'], frequency: 7, severity: 'High', impact: 'Loses ~2 marks/question', recommendation: 'Re-watch concept videos and use the explain-back method in MediXO Mentor.', affectedSubjects: ['CS506', 'CS502'] },
  { id: 'mk2', studentId, category: 'Calculation Error', sources: ['Practice', 'Competitive Exams'], frequency: 5, severity: 'Medium', impact: 'Loses ~1.5 marks/question', recommendation: 'Slow down final steps; verify units and decimal placement in timed drills.', affectedSubjects: ['Physics', 'Mathematics'] },
  { id: 'mk3', studentId, category: 'NCERT Detail Error', sources: ['Quiz', 'Competitive Exams', 'AI Exam Analysis'], frequency: 4, severity: 'Medium', impact: 'Loses ~1 mark/question', recommendation: 'Revise NCERT table-based facts weekly; make flash cards for coordination compounds.', affectedSubjects: ['Chemistry'] },
  { id: 'mk4', studentId, category: 'Formula Error', sources: ['Practice', 'University Exams'], frequency: 3, severity: 'High', impact: 'Loses ~2 marks/question', recommendation: 'Maintain a formula sheet and rewrite it from memory every 3 days.', affectedSubjects: ['Physics', 'Mathematics'] },
  { id: 'mk5', studentId, category: 'Careless Mistake', sources: ['Assignments', 'Quiz'], frequency: 3, severity: 'Low', impact: 'Loses ~0.5–1 mark/question', recommendation: 'Read the question twice before answering; use elimination marking.', affectedSubjects: ['CS501', 'CS505'] },
  { id: 'mk6', studentId, category: 'Time Management', sources: ['Competitive Exams', 'AI Exam Analysis'], frequency: 2, severity: 'High', impact: 'Leaves 2–4 questions unattempted', recommendation: 'Practise section-wise time-boxing in mocks; skip-and-return strategy.', affectedSubjects: ['Mathematics'] },
  { id: 'mk7', studentId, category: 'Guess Attempt', sources: ['Competitive Exams'], frequency: 2, severity: 'Low', impact: 'Negative marking −1 per wrong guess', recommendation: 'Only guess when 2 options can be eliminated confidently.', affectedSubjects: ['Physics', 'Chemistry'] },
]

/* ------------------------------------------------------------------ */
/* Weekly academic action plan (7 days)                                */
/* ------------------------------------------------------------------ */
export const weeklyActionPlan = [
  { day: 'Monday', revision: 'Graph algorithms — MST & shortest paths', assignments: 'DSA Assignment 4 (finish Q3–Q4)', practice: '15 DSA problems (medium)', reading: 'CLRS Ch. 23–24', mockTest: null, goal: 'Submit DSA Assignment 4 on time' },
  { day: 'Tuesday', revision: 'TCP congestion control traces', assignments: null, practice: '8 CN numericals', reading: 'Kurose & Ross Ch. 3', mockTest: null, goal: 'Close the CN transport-layer gap' },
  { day: 'Wednesday', revision: 'Pumping lemma — 4 worked proofs', assignments: 'ML Mini-Project (model v1)', practice: '10 ToC problems', reading: 'Sipser Ch. 2', mockTest: null, goal: 'ML model baseline runs' },
  { day: 'Thursday', revision: 'Regularisation (L1 vs L2)', assignments: null, practice: 'ML concept drills', reading: 'ESL Ch. 3', mockTest: 'Sectional — Maths (60 min)', goal: 'Score > 70% in the sectional' },
  { day: 'Friday', revision: 'Coordination compounds — NCERT tables', assignments: 'DBMS Quiz 3 prep', practice: '20 Chemistry MCQs', reading: 'NCERT XII Ch. 9', mockTest: null, goal: 'Finish Quiz 3 revision' },
  { day: 'Saturday', revision: 'Full-week recap — weak concepts', assignments: null, practice: 'Mixed 30-question drill', reading: 'Summary notes', mockTest: 'Full Length Test (FLT)', goal: 'Complete the FLT and review mistakes' },
  { day: 'Sunday', revision: 'Light revision + formula sheet', assignments: 'Plan next week', practice: null, reading: null, mockTest: null, goal: 'Rest & plan the week ahead' },
]

/* ------------------------------------------------------------------ */
/* Improvement prediction                                              */
/* ------------------------------------------------------------------ */
export const improvementPrediction = {
  academicHealthGrowth: { current: 89.4, predicted: 93.2, unit: '/100' },
  performanceGrowth: { current: 76.5, predicted: 81.8, unit: '%' },
  subjectImprovement: { current: 74.9, predicted: 80.1, unit: '%' },
  confidenceGrowth: { current: 77, predicted: 84, unit: '/100' },
  expectedAccuracy: { current: 78.2, predicted: 83.5, unit: '%' },
  expectedSemesterImprovement: { value: '+0.28', unit: 'CGPA' },
  timeline: [
    { week: 'W1', health: 89.4, performance: 76.5, confidence: 77 },
    { week: 'W2', health: 90.1, performance: 77.4, confidence: 78 },
    { week: 'W3', health: 90.8, performance: 78.3, confidence: 79 },
    { week: 'W4', health: 91.4, performance: 79.4, confidence: 80 },
    { week: 'W5', health: 92.1, performance: 80.5, confidence: 82 },
    { week: 'W6', health: 93.2, performance: 81.8, confidence: 84 },
  ],
  confidence: 'High',
  modelNote: 'Based on your last 6 weeks of consistent improvement and 10 completed assessments.',
}

/* ------------------------------------------------------------------ */
/* Learning behaviour (detailed)                                       */
/* ------------------------------------------------------------------ */
export const learningBehaviourDetailed = {
  attendancePattern: { overall: 92.4, bestDay: 'Saturday', weakestDay: 'Monday', note: 'Mondays dip to 84% — set a recurring reminder.' },
  assignmentCompletion: { onTime: 8, late: 1, pending: 2, rate: 89, note: 'Excellent track record; two pending items need focus.' },
  practiceFrequency: { sessions: 10, perWeek: 2.5, note: '2.5 sessions/week — target 4 during exam season.' },
  revisionHabit: { weeklySessions: 4, avgLengthMin: 38, note: 'Regular short sessions; extend to 45+ min before exams.' },
  quizParticipation: { attempted: 5, avgAccuracy: 84, note: 'Strong participation; accuracy dips in CN quizzes.' },
  courseProgress: [
    { subjectCode: 'CS501', progress: 68 }, { subjectCode: 'CS502', progress: 55 },
    { subjectCode: 'CS503', progress: 62 }, { subjectCode: 'CS504', progress: 48 },
    { subjectCode: 'CS505', progress: 71 }, { subjectCode: 'CS506', progress: 41 },
  ],
  dailyStudy: [
    { day: 'Mon', hours: 3.2, focus: 82 }, { day: 'Tue', hours: 4.1, focus: 88 },
    { day: 'Wed', hours: 2.6, focus: 74 }, { day: 'Thu', hours: 3.8, focus: 85 },
    { day: 'Fri', hours: 4.6, focus: 91 }, { day: 'Sat', hours: 5.2, focus: 94 },
    { day: 'Sun', hours: 3.4, focus: 79 },
  ],
  weeklyStudy: [
    { week: 'W1', hours: 24.1 }, { week: 'W2', hours: 26.4 }, { week: 'W3', hours: 25.2 },
    { week: 'W4', hours: 28.6 }, { week: 'W5', hours: 27.1 }, { week: 'W6', hours: 29.8 },
  ],
  monthlyPattern: [
    { month: 'Mar', hours: 88 }, { month: 'Apr', hours: 94 }, { month: 'May', hours: 102 },
    { month: 'Jun', hours: 108 }, { month: 'Jul', hours: 116 }, { month: 'Aug', hours: 112 },
  ],
}

/* ------------------------------------------------------------------ */
/* Academic health breakdown (contribution inputs)                     */
/* ------------------------------------------------------------------ */
export const healthBreakdownInputs = [
  { key: 'attendance', label: 'Attendance', value: 92.4, weight: 0.14 },
  { key: 'assignments', label: 'Assignments', value: 89, weight: 0.12 },
  { key: 'projects', label: 'Projects', value: 86, weight: 0.1 },
  { key: 'practice', label: 'Practice', value: 78, weight: 0.12 },
  { key: 'quiz', label: 'Quiz', value: 84, weight: 0.1 },
  { key: 'examinations', label: 'Examinations', value: 80, weight: 0.18 },
  { key: 'revision', label: 'Revision', value: 76, weight: 0.08 },
  { key: 'learningBehaviour', label: 'Learning Behaviour', value: 82, weight: 0.08 },
  { key: 'consistency', label: 'Consistency', value: 70.9, weight: 0.08 },
]
