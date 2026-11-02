/**
 * EduX Phase 9 — Paper Generator dataset · Backend-Ready (empty)
 *
 * Phase 9: Removed all seeded mock question papers and question pools.
 * - No samplePapers fallback
 * - No questionList with full seeded questions
 * - No competitiveList derived from competitiveQuestions dataset
 * - No versionHistory with fake versions
 *
 * Paper Library is now backend-only via GET /faculty/paper-generator
 * → VITE_API_BASE_URL → real DB. Backend unavailable → empty state.
 *
 * This file intentionally exports empty structures to preserve import
 * chain for legacy intelligence aggregation (which can remain prototype-backed
 * temporarily), but MUST NOT be used as question source in Paper Generator.
 * Paper Generator uses src/services/faculty-questions.js → backend.
 */

export const paperGenerator = {
  config: {
    patterns: ['JEE Main', 'JEE Advanced', 'NEET', 'Board / Custom'],
    examModes: ['University', 'Competitive'],
    universityTypes: ['Mid Semester', 'End Semester', 'Unit Test', 'Internal Assessment', 'Model Examination'],
    competitiveTypes: ['Full Mock Test', 'Subject Test', 'Chapter Test', 'PYQ Practice Paper', 'Mixed Practice Test'],
    competitiveExams: ['JEE', 'NEET'],
    competitiveSubjects: {
      JEE: ['Physics', 'Mathematics', 'Chemistry'],
      NEET: ['Physics', 'Chemistry', 'Biology'],
    },
    negativeMarking: ['None', '−1 per incorrect answer', '−0.25 per incorrect answer'],
    pyqPreferences: ['No preference', 'Prefer PYQ questions', 'PYQ only'],
    departments: ['Computer Science', 'Electronics & Comm.', 'Mechanical', 'Mathematics', 'Business School'],
    programs: ['B.Tech — CSE', 'B.Tech — ECE', 'B.Tech — ME', 'M.Sc — Data Science', 'MBA'],
    semesters: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'],
    courses: ['CS501 — DSA', 'CS502 — DBMS', 'CS503 — OS', 'CS504 — Networks', 'CS505 — ML', 'CS506 — ToC'],
    subjects: ['Data Structures & Algorithms', 'Database Management Systems', 'Operating Systems', 'Computer Networks', 'Machine Learning', 'Theory of Computation'],
    chapters: ['Graph Algorithms', 'Dynamic Programming', 'Sorting & Searching', 'Trees & Heaps', 'Complexity Analysis', 'String Algorithms'],
    topics: ['Dijkstra & shortest paths', 'MST (Kruskal/Prim)', 'Topological sort', '0/1 Knapsack', 'Big-O analysis', 'AVL rotations', 'KMP string matching'],
    durations: [60, 90, 120, 150, 180, 200],
    difficulties: ['Easy', 'Medium', 'Hard', 'Mixed'],
    blooms: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
    questionTypes: ['MCQ', 'Assertion Reason', 'Case Based', 'Diagram Based', 'Integer', 'Numerical', 'Statement Based', 'Short Answer', 'Long Answer'],
  },
  // No sample papers — backend only
  generatedPapers: [],
  questionIntelligence: {
    difficultyDistribution: [],
    bloomDistribution: [],
    chapterCoverage: [],
    topicCoverage: [],
    marksDistribution: [],
    questionCount: 0,
  },
  paperPreview: [],
  markingScheme: [],
  answerKey: [],
  templates: [],
  versionHistory: {},
}
