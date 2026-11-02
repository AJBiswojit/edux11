/**
 * Student Intelligence — AI Workspace datasets.
 * AI conversations · suggested questions · quick prompts · personalized
 * study resources · generated notes · downloads · completed recommendations.
 * All records reference the master student and canonical subject codes.
 */

import { studentId } from './academics.js'

/* ------------------------------------------------------------------ */
/* AI conversations (threads with pinned flags)                        */
/* ------------------------------------------------------------------ */
export const aiConversations = [
  { id: 'conv1', studentId, title: 'TCP congestion control — slow start & avoidance', subject: 'Networks', updated: '2026-08-04', pinned: true, messages: 12, status: 'Active' },
  { id: 'conv2', studentId, title: 'Definite integration substitution techniques', subject: 'Mathematics', updated: '2026-08-03', pinned: true, messages: 9, status: 'Active' },
  { id: 'conv3', studentId, title: 'AVL tree rotations deep dive', subject: 'DSA', updated: '2026-08-02', pinned: false, messages: 14, status: 'Active' },
  { id: 'conv4', studentId, title: 'Pumping lemma worked proofs', subject: 'ToC', updated: '2026-08-01', pinned: true, messages: 8, status: 'Active' },
  { id: 'conv5', studentId, title: 'L1 vs L2 regularisation intuition', subject: 'ML', updated: '2026-07-30', pinned: false, messages: 6, status: 'Archived' },
  { id: 'conv6', studentId, title: 'Ray optics sign conventions', subject: 'Physics', updated: '2026-07-29', pinned: false, messages: 11, status: 'Archived' },
]

/* ------------------------------------------------------------------ */
/* Suggested questions (one-click conversation starters)               */
/* ------------------------------------------------------------------ */
export const suggestedQuestions = [
  { id: 'sq1', text: 'Explain this concept: KMP string matching', category: 'Explain' },
  { id: 'sq2', text: 'Generate 5 MCQs on graph algorithms', category: 'Generate' },
  { id: 'sq3', text: 'Summarize this chapter: TCP congestion control', category: 'Summarize' },
  { id: 'sq4', text: 'Prepare revision notes for the mid-sem DSA exam', category: 'Notes' },
  { id: 'sq5', text: 'Generate short notes on pumping lemma', category: 'Notes' },
  { id: 'sq6', text: 'Create practice questions on regularisation', category: 'Practice' },
  { id: 'sq7', text: 'Explain Dijkstra with a real-world example', category: 'Explain' },
  { id: 'sq8', text: 'Compare quick sort vs merge sort', category: 'Compare' },
]

/* ------------------------------------------------------------------ */
/* Quick prompts (chat mode shortcuts)                                 */
/* ------------------------------------------------------------------ */
export const quickPrompts = [
  { id: 'qp1', label: 'Explain this concept', icon: 'Lightbulb' },
  { id: 'qp2', label: 'Generate MCQs', icon: 'ListChecks' },
  { id: 'qp3', label: 'Summarize this chapter', icon: 'FileText' },
  { id: 'qp4', label: 'Prepare revision notes', icon: 'StickyNote' },
  { id: 'qp5', label: 'Generate short notes', icon: 'Zap' },
  { id: 'qp6', label: 'Create practice questions', icon: 'PenLine' },
  { id: 'qp7', label: 'Explain with examples', icon: 'BookOpen' },
  { id: 'qp8', label: 'Compare concepts', icon: 'GitCompare' },
]

/* ------------------------------------------------------------------ */
/* AI Resource Intelligence — personalized recommendations             */
/* Each carries reason · priority · estimated time · difficulty.       */
/* ------------------------------------------------------------------ */
export const resourceRecommendations = [
  { id: 'rr1', studentId, subjectCode: 'CS506', subject: 'Theory of Computation', type: 'Recorded Lecture', title: 'Pumping Lemma & Reductions — Masterclass', provider: 'MediXO Video Library', reason: 'Your weakest concept (55% mastery) and the improvement exam is Aug 9', priority: 'Critical', estimatedTime: '45 min', difficulty: 'Hard', format: 'Video' },
  { id: 'rr2', studentId, subjectCode: 'CS504', subject: 'Computer Networks', type: 'Notes', title: 'TCP Congestion Control — Traces Explained', provider: 'AI-generated notes', reason: 'Weakest competitive topic (60%) — supplementary exam Aug 12', priority: 'Critical', estimatedTime: '25 min', difficulty: 'Medium', format: 'Notes' },
  { id: 'rr3', studentId, subjectCode: 'CS501', subject: 'Data Structures & Algorithms', type: 'Question Bank', title: 'Graph Algorithms — 40 PYQs with solutions', provider: 'Dept. question bank', reason: 'High-weightage chapter; 88% mastery means high ROI practice', priority: 'High', estimatedTime: '60 min', difficulty: 'Medium', format: 'Practice' },
  { id: 'rr4', studentId, subjectCode: 'CS502', subject: 'Database Management Systems', type: 'PDF', title: 'Query Optimisation — Cost Model Notes', provider: 'Dr. Arvind Kulkarni', reason: 'Weak chapter (62%) — quiz 3 covers transactions', priority: 'High', estimatedTime: '30 min', difficulty: 'Medium', format: 'PDF' },
  { id: 'rr5', studentId, subjectCode: null, subject: 'Mathematics', type: 'YouTube', title: 'Definite Integration — Properties & Shortcuts', provider: 'YouTube', reason: 'Practice history shows 64% — recurring JEE topic', priority: 'High', estimatedTime: '40 min', difficulty: 'Hard', format: 'Video' },
  { id: 'rr6', studentId, subjectCode: null, subject: 'Chemistry', type: 'Reference Material', title: 'NCERT Coordination Compounds — Table Pack', provider: 'NCERT XII', reason: 'NCERT-detail errors cost 6 marks in the NEET mock', priority: 'Medium', estimatedTime: '35 min', difficulty: 'Easy', format: 'PDF' },
  { id: 'rr7', studentId, subjectCode: 'CS505', subject: 'Machine Learning', type: 'Book', title: 'ESL Ch. 3 — Regularisation (L1 vs L2)', provider: 'Elements of Statistical Learning', reason: 'Concept at 62% — ML mini-project due Aug 11', priority: 'Medium', estimatedTime: '50 min', difficulty: 'Medium', format: 'Book' },
  { id: 'rr8', studentId, subjectCode: 'CS503', subject: 'Operating Systems', type: 'Previous Year Questions', title: 'OS Scheduling — PYQs 2019–2025', provider: 'University PYQ bank', reason: 'Semester mock scheduled Aug 17 — scheduling is a strong chapter', priority: 'Medium', estimatedTime: '45 min', difficulty: 'Easy', format: 'Practice' },
  { id: 'rr9', studentId, subjectCode: null, subject: 'Physics', type: 'Recorded Lecture', title: 'Ray Optics — Sign Convention Simplified', provider: 'MediXO Video Library', reason: '48% on the last practice session', priority: 'Medium', estimatedTime: '30 min', difficulty: 'Medium', format: 'Video' },
  { id: 'rr10', studentId, subjectCode: 'CS501', subject: 'Data Structures & Algorithms', type: 'Assignment', title: 'DSA Assignment 4 — Graph Algorithms (solve Q3–Q4)', provider: 'Course assignment', reason: 'Due Aug 6 — pending at 40%', priority: 'Critical', estimatedTime: '90 min', difficulty: 'Medium', format: 'Task' },
  { id: 'rr11', studentId, subjectCode: 'CS505', subject: 'Machine Learning', type: 'Practice Questions', title: 'Regularisation — 15 Concept Drills', provider: 'MediXO practice engine', reason: 'Improve concept mastery before the mini-project submission', priority: 'Medium', estimatedTime: '25 min', difficulty: 'Medium', format: 'Practice' },
  { id: 'rr12', studentId, subjectCode: 'CS506', subject: 'Theory of Computation', type: 'YouTube', title: 'Undecidability & Reductions — Workshop', provider: 'YouTube', reason: 'Critical chapter (52%) — appears every 2nd year', priority: 'High', estimatedTime: '50 min', difficulty: 'Hard', format: 'Video' },
]

/* ------------------------------------------------------------------ */
/* Generated notes (all types)                                         */
/* ------------------------------------------------------------------ */
export const generatedNotes = [
  { id: 'gn1', studentId, subject: 'Networks', type: 'Revision Notes', title: 'TCP congestion control — one-page revision', excerpt: 'Slow start, congestion avoidance, fast retransmit/recovery with a cwnd trace.', length: '2 pages', updated: '2026-08-04', color: '#f43f5e' },
  { id: 'gn2', studentId, subject: 'DSA', type: 'Short Notes', title: 'Graph algorithms — when to use what', excerpt: 'BFS vs DFS vs Dijkstra vs Bellman-Ford decision table + complexity.', length: '1 page', updated: '2026-08-02', color: '#6366f1' },
  { id: 'gn3', studentId, subject: 'Mathematics', type: 'Formula Sheet', title: 'Definite integration — formula sheet', excerpt: 'Properties, odd/even shortcuts, substitution rules, standard results.', length: '1 page', updated: '2026-08-01', color: '#8b5cf6' },
  { id: 'gn4', studentId, subject: 'Chemistry', type: 'Mind Map', title: 'Coordination compounds — mind map', excerpt: 'Werner → VBT → CFT → spectrochemical series → applications.', length: '1 page', updated: '2026-07-31', color: '#f59e0b' },
  { id: 'gn5', studentId, subject: 'ToC', type: 'Key Points', title: 'Pumping lemma — key points', excerpt: 'The 5-step proof template + 3 worked counter-examples.', length: '2 pages', updated: '2026-07-30', color: '#0ea5e9' },
  { id: 'gn6', studentId, subject: 'DBMS', type: 'Chapter Summary', title: 'Transactions & concurrency — summary', excerpt: 'ACID, isolation levels, 2PL, deadlock handling in 4 pages.', length: '4 pages', updated: '2026-07-29', color: '#14b8a6' },
]

/* ------------------------------------------------------------------ */
/* Downloads (recent portfolio / note downloads)                       */
/* ------------------------------------------------------------------ */
export const downloads = [
  { id: 'dl1', studentId, title: 'TCP congestion control — one-page revision', type: 'PDF', size: '420 KB', date: '2026-08-04' },
  { id: 'dl2', studentId, title: 'Graph algorithms — when to use what', type: 'PDF', size: '310 KB', date: '2026-08-02' },
  { id: 'dl3', studentId, title: 'Definite integration — formula sheet', type: 'PDF', size: '260 KB', date: '2026-08-01' },
  { id: 'dl4', studentId, title: 'Performance & AI — academic report', type: 'PDF', size: '1.2 MB', date: '2026-07-28' },
  { id: 'dl5', studentId, title: 'ATS 4 — JEE Main analysis', type: 'PDF', size: '880 KB', date: '2026-08-02' },
]

/* ------------------------------------------------------------------ */
/* Completed recommendations (learning-history trace)                  */
/* ------------------------------------------------------------------ */
export const completedRecommendations = [
  { id: 'cr1', studentId, title: 'AVL rotations deep dive', type: 'practice', completedOn: '2026-08-02', outcome: 'Mastered (95%)' },
  { id: 'cr2', studentId, title: 'Isolation levels — anomalies walkthrough', type: 'revision', completedOn: '2026-07-27', outcome: 'Mastered (88%)' },
  { id: 'cr3', studentId, title: 'Gradient descent convergence intuition', type: 'practice', completedOn: '2026-07-21', outcome: 'Mastered (94%)' },
  { id: 'cr4', studentId, title: 'DSA Assignment 3 — CPU Scheduling', type: 'assignment', completedOn: '2026-07-20', outcome: 'Submitted · graded A' },
]
