/**
 * Faculty Intelligence — Assessment datasets.
 * Centralized inputs for the Assessment Intelligence Workspace: assessment
 * library (paper types & defaults), unit-level question coverage, tag
 * taxonomy, PYQ trends (university + competitive) and assessment-health
 * factor weights. All numbers link back to the existing faculty datasets
 * (question bank totals, PYQ corpus, exam builder, quiz builder).
 */

/* ---------- Assessment library (paper types & defaults) ---------- */
export const assessmentLibrary = {
  examModes: [
    { id: 'University', label: 'University', description: 'Semester, internal, midsem, endsem, assignment, lab, practical, MCQ & theory papers' },
    { id: 'Competitive', label: 'Competitive', description: 'JEE / NEET pattern, CBT, OMR, mock tests & chapter tests' },
  ],
  universityTypes: [
    { id: 'Semester Exam', label: 'Semester Exam', defaultMarks: 100, defaultDuration: 180, sections: 'MCQ 20 · Short 10 · Long 4 · Case 1' },
    { id: 'Internal Assessment', label: 'Internal Assessment', defaultMarks: 20, defaultDuration: 45, sections: 'MCQ 8 · Short 4 · Long 1' },
    { id: 'Mid Semester', label: 'Mid Semester', defaultMarks: 50, defaultDuration: 120, sections: 'MCQ 10 · Short 5 · Long 2' },
    { id: 'End Semester', label: 'End Semester', defaultMarks: 100, defaultDuration: 180, sections: 'MCQ 20 · Short 10 · Long 4 · Case 1' },
    { id: 'Assignment', label: 'Assignment', defaultMarks: 20, defaultDuration: 0, sections: 'Long Answer 2 · Programming 1' },
    { id: 'Lab Test', label: 'Lab Test', defaultMarks: 30, defaultDuration: 90, sections: 'Viva 5 · Programming 2 · Record 1' },
    { id: 'Practical', label: 'Practical', defaultMarks: 50, defaultDuration: 120, sections: 'Viva 5 · Programming 3 · Record 1' },
    { id: 'MCQ Test', label: 'MCQ Test', defaultMarks: 10, defaultDuration: 15, sections: 'MCQ 10' },
    { id: 'Theory Exam', label: 'Theory Exam', defaultMarks: 60, defaultDuration: 150, sections: 'Short 8 · Long 3' },
  ],
  competitiveTypes: [
    { id: 'JEE Pattern', label: 'JEE Pattern', defaultMarks: 300, defaultDuration: 180, negativeMarking: '1/4' },
    { id: 'NEET Pattern', label: 'NEET Pattern', defaultMarks: 720, defaultDuration: 200, negativeMarking: '1/4' },
    { id: 'CBT', label: 'CBT (Computer Based Test)', defaultMarks: 100, defaultDuration: 90, negativeMarking: '1/4' },
    { id: 'OMR', label: 'OMR (Optical Mark Sheet)', defaultMarks: 50, defaultDuration: 60, negativeMarking: 'None' },
    { id: 'Mock Test', label: 'Mock Test', defaultMarks: 100, defaultDuration: 120, negativeMarking: '1/4' },
    { id: 'Chapter Test', label: 'Chapter Test', defaultMarks: 25, defaultDuration: 30, negativeMarking: '1/4' },
  ],
}

/* ---------- Unit-level question coverage per course ----------
 * counts sum to questionBank.summary.bySubject totals; coveragePct is the
 * unit's share of the course bank; target = healthy question count per unit.
 * Derives the gap analysis ("Unit 4 has only 12% question coverage compared
 * to Unit 2 which has 31%"). */
export const questionCoverage = [
  {
    course: 'CS501', title: 'Data Structures & Algorithms', total: 418,
    units: [
      { unit: 'Unit 1', name: 'Complexity & Fundamentals', questions: 62, target: 85, pyqPapers: 10 },
      { unit: 'Unit 2', name: 'Sorting, Searching & Trees', questions: 130, target: 95, pyqPapers: 12 },
      { unit: 'Unit 3', name: 'Graph Algorithms', questions: 128, target: 95, pyqPapers: 12 },
      { unit: 'Unit 4', name: 'Dynamic Programming', questions: 48, target: 90, pyqPapers: 6 },
      { unit: 'Unit 5', name: 'String Algorithms', questions: 50, target: 70, pyqPapers: 6 },
    ],
  },
  {
    course: 'CS503', title: 'Operating Systems', total: 286,
    units: [
      { unit: 'Unit 1', name: 'Processes & Threads', questions: 52, target: 60, pyqPapers: 8 },
      { unit: 'Unit 2', name: 'CPU Scheduling', questions: 74, target: 62, pyqPapers: 10 },
      { unit: 'Unit 3', name: 'Memory Management', questions: 68, target: 62, pyqPapers: 10 },
      { unit: 'Unit 4', name: 'Synchronisation', questions: 46, target: 58, pyqPapers: 7 },
      { unit: 'Unit 5', name: 'File Systems', questions: 46, target: 50, pyqPapers: 5 },
    ],
  },
  {
    course: 'CS505', title: 'Machine Learning', total: 336,
    units: [
      { unit: 'Unit 1', name: 'Regression', questions: 78, target: 75, pyqPapers: 7 },
      { unit: 'Unit 2', name: 'Classification', questions: 86, target: 80, pyqPapers: 8 },
      { unit: 'Unit 3', name: 'Neural Networks', questions: 74, target: 75, pyqPapers: 7 },
      { unit: 'Unit 4', name: 'Model Evaluation', questions: 56, target: 65, pyqPapers: 5 },
      { unit: 'Unit 5', name: 'Unsupervised Learning', questions: 42, target: 60, pyqPapers: 4 },
    ],
  },
  {
    course: 'CS506', title: 'Theory of Computation', total: 214,
    units: [
      { unit: 'Unit 1', name: 'Automata', questions: 58, target: 55, pyqPapers: 8 },
      { unit: 'Unit 2', name: 'Formal Languages', questions: 44, target: 50, pyqPapers: 6 },
      { unit: 'Unit 3', name: 'Turing Machines', questions: 42, target: 48, pyqPapers: 6 },
      { unit: 'Unit 4', name: 'Decidability', questions: 36, target: 42, pyqPapers: 5 },
      { unit: 'Unit 5', name: 'Complexity Classes', questions: 34, target: 40, pyqPapers: 4 },
    ],
  },
]

/* ---------- Question tag taxonomy ---------- */
export const questionTags = [
  'High-Yield', 'Conceptual', 'Numerical', 'Formula-based', 'Proof-based',
  'Frequently Missed', 'New Pattern', 'Diagram-based', 'Case-based', 'Important',
]

/* ---------- PYQ trends (university difficulty mix by year + competitive) ---------- */
export const pyqTrends = {
  university: {
    difficultyTrend: [
      { year: '2015', easy: 34, medium: 46, hard: 20 },
      { year: '2016', easy: 32, medium: 48, hard: 20 },
      { year: '2017', easy: 31, medium: 49, hard: 20 },
      { year: '2018', easy: 30, medium: 50, hard: 20 },
      { year: '2019', easy: 30, medium: 48, hard: 22 },
      { year: '2020', easy: 28, medium: 50, hard: 22 },
      { year: '2021', easy: 30, medium: 48, hard: 22 },
      { year: '2022', easy: 29, medium: 48, hard: 23 },
      { year: '2023', easy: 28, medium: 49, hard: 23 },
      { year: '2024', easy: 27, medium: 49, hard: 24 },
      { year: '2025', easy: 26, medium: 49, hard: 25 },
    ],
    weightage: [
      { chapter: 'Graph Algorithms', weight: 24 },
      { chapter: 'Dynamic Programming', weight: 21 },
      { chapter: 'Sorting & Searching', weight: 17 },
      { chapter: 'Trees & Heaps', weight: 15 },
      { chapter: 'Complexity Analysis', weight: 14 },
      { chapter: 'String Algorithms', weight: 9 },
    ],
    typeDistribution: [
      { type: 'MCQ', count: 186 },
      { type: 'Short Answer', count: 164 },
      { type: 'Long Answer', count: 86 },
      { type: 'Case Study', count: 30 },
      { type: 'Programming', count: 20 },
    ],
    repeatedConcepts: ['Shortest paths & MST variants', '0/1 Knapsack & DP tables', 'AVL rotations', 'Master theorem applications', 'KMP failure function'],
  },
  competitive: {
    /* ================= JEE MAIN ================= */
    'JEE Main': {
      label: 'JEE Main',
      program: 'JEE Main',
      negativeMarking: '1/4',
      duration: 180,
      totalMarks: 300,
      totalQuestions: 90,
      programs: ['JEE Main · Paper 1 (B.E./B.Tech)', 'JEE Main · Paper 2A (B.Arch)', 'JEE Main · Paper 2B (B.Planning)'],
      subjects: [
        { code: 'PHY', name: 'Physics', chapters: ['Mechanics', 'Thermodynamics', 'Current Electricity', 'Electrostatics', 'Optics', 'Modern Physics'] },
        { code: 'CHE', name: 'Chemistry', chapters: ['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'] },
        { code: 'MAT', name: 'Mathematics', chapters: ['Calculus', 'Coordinate Geometry', 'Algebra', 'Probability', 'Vectors & 3D'] },
      ],
      difficultyTrend: [
        { year: '2016', easy: 28, medium: 46, hard: 26 },
        { year: '2017', easy: 27, medium: 46, hard: 27 },
        { year: '2018', easy: 26, medium: 46, hard: 28 },
        { year: '2019', easy: 25, medium: 45, hard: 30 },
        { year: '2020', easy: 25, medium: 45, hard: 30 },
        { year: '2021', easy: 24, medium: 46, hard: 30 },
        { year: '2022', easy: 23, medium: 45, hard: 32 },
        { year: '2023', easy: 22, medium: 44, hard: 34 },
        { year: '2024', easy: 21, medium: 44, hard: 35 },
        { year: '2025', easy: 20, medium: 43, hard: 37 },
      ],
      topicFrequency: [
        { topic: 'Integral Calculus', frequency: 34, importance: 'High', difficulty: 'Hard' },
        { topic: 'Coordinate Geometry', frequency: 31, importance: 'High', difficulty: 'Medium' },
        { topic: 'Mechanics — Laws of Motion', frequency: 30, importance: 'High', difficulty: 'Medium' },
        { topic: 'Organic Chemistry — Reactions', frequency: 29, importance: 'High', difficulty: 'Medium' },
        { topic: 'Sets, Relations & Functions', frequency: 28, importance: 'High', difficulty: 'Easy' },
        { topic: 'Physical Chemistry — Equilibrium', frequency: 27, importance: 'Medium', difficulty: 'Medium' },
        { topic: 'Current Electricity', frequency: 25, importance: 'Medium', difficulty: 'Medium' },
        { topic: 'Probability', frequency: 22, importance: 'Medium', difficulty: 'Medium' },
      ],
      questionTypes: [
        { type: 'Single-correct MCQ', count: 60 },
        { type: 'Multiple-correct MCQ', count: 0 },
        { type: 'Numerical (integer)', count: 30 },
      ],
      weightage: [
        { topic: 'Mathematics', weight: 100 },
        { topic: 'Physics', weight: 100 },
        { topic: 'Chemistry', weight: 100 },
      ],
      yearwiseDistribution: [
        { year: '2020', questions: 90, mcq: 75, numeric: 15 },
        { year: '2021', questions: 90, mcq: 75, numeric: 15 },
        { year: '2022', questions: 90, mcq: 75, numeric: 15 },
        { year: '2023', questions: 90, mcq: 75, numeric: 15 },
        { year: '2024', questions: 90, mcq: 75, numeric: 15 },
        { year: '2025', questions: 90, mcq: 75, numeric: 15 },
      ],
      priorityTopics: [
        { topic: 'Integral Calculus', priority: 'Critical', reason: 'Asked every year · high-weight chapter' },
        { topic: 'Coordinate Geometry', priority: 'Critical', reason: 'Consistently 3+ questions per paper' },
        { topic: 'Mechanics', priority: 'High', reason: 'Foundation for 40% of Physics' },
        { topic: 'Organic Reaction Mechanisms', priority: 'High', reason: 'Most-asked Chemistry sub-topic' },
      ],
      gapAnalysis: [
        { topic: 'Vectors & 3D', coverage: 40, level: 'Gap', note: 'Low PYQ coverage vs weightage' },
        { topic: 'Modern Physics', coverage: 55, level: 'Watch', note: 'Numerical-heavy · practice needed' },
        { topic: 'Inorganic Chemistry', coverage: 60, level: 'Watch', note: 'Fact-based · revision sheets help' },
        { topic: 'Thermodynamics', coverage: 75, level: 'Healthy', note: 'Well covered in the corpus' },
      ],
      repeatedConcepts: ['Maxima–minima word problems', "Newton's laws + friction", 'Equilibrium constant problems', 'Conic sections', 'Integration by parts'],
    },
    /* ================= JEE ADVANCED ================= */
    'JEE Advanced': {
      label: 'JEE Advanced',
      program: 'JEE Advanced',
      negativeMarking: '1/4 (Paper 1) · 0 (Paper 2)',
      duration: 360,
      totalMarks: 198,
      totalQuestions: 54,
      programs: ['JEE Advanced · Paper 1', 'JEE Advanced · Paper 2'],
      subjects: [
        { code: 'PHY', name: 'Physics', chapters: ['Mechanics', 'Thermodynamics', 'Electrostatics', 'Magnetism & EMI', 'Optics', 'Modern Physics'] },
        { code: 'CHE', name: 'Chemistry', chapters: ['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'] },
        { code: 'MAT', name: 'Mathematics', chapters: ['Calculus', 'Coordinate Geometry', 'Algebra', 'Probability', 'Complex Numbers'] },
      ],
      difficultyTrend: [
        { year: '2016', easy: 18, medium: 42, hard: 40 },
        { year: '2017', easy: 17, medium: 41, hard: 42 },
        { year: '2018', easy: 16, medium: 40, hard: 44 },
        { year: '2019', easy: 15, medium: 40, hard: 45 },
        { year: '2020', easy: 14, medium: 40, hard: 46 },
        { year: '2021', easy: 13, medium: 39, hard: 48 },
        { year: '2022', easy: 12, medium: 38, hard: 50 },
        { year: '2023', easy: 11, medium: 38, hard: 51 },
        { year: '2024', easy: 10, medium: 37, hard: 53 },
        { year: '2025', easy: 9, medium: 36, hard: 55 },
      ],
      topicFrequency: [
        { topic: 'Electrostatics & Capacitance', frequency: 18, importance: 'High', difficulty: 'Hard' },
        { topic: 'Calculus — Applications', frequency: 17, importance: 'High', difficulty: 'Hard' },
        { topic: 'Organic Synthesis & Mechanisms', frequency: 16, importance: 'High', difficulty: 'Hard' },
        { topic: 'Rotational Mechanics', frequency: 15, importance: 'High', difficulty: 'Hard' },
        { topic: 'Matrices & Determinants', frequency: 13, importance: 'Medium', difficulty: 'Hard' },
        { topic: 'Thermodynamics', frequency: 12, importance: 'Medium', difficulty: 'Hard' },
      ],
      questionTypes: [
        { type: 'Single-correct MCQ', count: 18 },
        { type: 'Multiple-correct MCQ', count: 12 },
        { type: 'Numerical (integer)', count: 12 },
        { type: 'Matrix match', count: 6 },
        { type: 'Paragraph / comprehension', count: 6 },
      ],
      weightage: [
        { topic: 'Mathematics', weight: 66 },
        { topic: 'Physics', weight: 66 },
        { topic: 'Chemistry', weight: 66 },
      ],
      yearwiseDistribution: [
        { year: '2020', questions: 54, mcq: 30, numeric: 12, other: 12 },
        { year: '2021', questions: 54, mcq: 30, numeric: 12, other: 12 },
        { year: '2022', questions: 54, mcq: 30, numeric: 12, other: 12 },
        { year: '2023', questions: 54, mcq: 30, numeric: 12, other: 12 },
        { year: '2024', questions: 54, mcq: 30, numeric: 12, other: 12 },
        { year: '2025', questions: 54, mcq: 30, numeric: 12, other: 12 },
      ],
      priorityTopics: [
        { topic: 'Electrostatics', priority: 'Critical', reason: 'Multi-concept questions every year' },
        { topic: 'Organic Mechanisms', priority: 'Critical', reason: 'Synthesis-based questions dominate' },
        { topic: 'Rotational Mechanics', priority: 'High', reason: 'Hard numericals · high discrimination' },
        { topic: 'Calculus Applications', priority: 'High', reason: 'Cross-topic questions with geometry' },
      ],
      gapAnalysis: [
        { topic: 'Magnetism & EMI', coverage: 42, level: 'Gap', note: 'Fewer PYQs than weightage implies' },
        { topic: 'Complex Numbers', coverage: 50, level: 'Watch', note: 'Linked to geometry questions' },
        { topic: 'Inorganic Chemistry', coverage: 58, level: 'Watch', note: 'Memory-heavy · flashcards help' },
        { topic: 'Modern Physics', coverage: 70, level: 'Healthy', note: 'Good coverage in the corpus' },
      ],
      repeatedConcepts: ['Gauss law applications', 'Rotational + translational combined motion', 'Multi-step organic synthesis', 'Definite integrals with geometry', 'Cayley–Hamilton theorem'],
    },
    /* ================= NEET UG ================= */
    'NEET UG': {
      label: 'NEET UG',
      program: 'NEET UG',
      negativeMarking: '1/4',
      duration: 200,
      totalMarks: 720,
      totalQuestions: 180,
      programs: ['NEET UG · Medical & Dental'],
      subjects: [
        { code: 'PHY', name: 'Physics', chapters: ['Mechanics', 'Thermodynamics', 'Current Electricity', 'Electrostatics', 'Optics', 'Modern Physics'] },
        { code: 'CHE', name: 'Chemistry', chapters: ['Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry'] },
        { code: 'BIO', name: 'Biology', chapters: ['Human Physiology', 'Genetics & Evolution', 'Cell Biology', 'Plant Physiology', 'Ecology', 'Biomolecules'] },
      ],
      difficultyTrend: [
        { year: '2016', easy: 30, medium: 50, hard: 20 },
        { year: '2017', easy: 29, medium: 51, hard: 20 },
        { year: '2018', easy: 28, medium: 52, hard: 20 },
        { year: '2019', easy: 27, medium: 52, hard: 21 },
        { year: '2020', easy: 26, medium: 52, hard: 22 },
        { year: '2021', easy: 26, medium: 51, hard: 23 },
        { year: '2022', easy: 25, medium: 51, hard: 24 },
        { year: '2023', easy: 24, medium: 51, hard: 25 },
        { year: '2024', easy: 23, medium: 51, hard: 26 },
        { year: '2025', easy: 22, medium: 50, hard: 28 },
      ],
      topicFrequency: [
        { topic: 'Human Physiology', frequency: 45, importance: 'High', difficulty: 'Easy' },
        { topic: 'Genetics & Evolution', frequency: 40, importance: 'High', difficulty: 'Medium' },
        { topic: 'Cell Biology', frequency: 36, importance: 'High', difficulty: 'Easy' },
        { topic: 'Organic Chemistry — NCERT', frequency: 34, importance: 'High', difficulty: 'Medium' },
        { topic: 'Plant Physiology', frequency: 30, importance: 'High', difficulty: 'Medium' },
        { topic: 'Ecology', frequency: 28, importance: 'Medium', difficulty: 'Easy' },
        { topic: 'Mechanics — NEET pattern', frequency: 26, importance: 'Medium', difficulty: 'Medium' },
        { topic: 'Inorganic Chemistry — NCERT', frequency: 24, importance: 'Medium', difficulty: 'Easy' },
      ],
      questionTypes: [
        { type: 'Single-correct MCQ', count: 180 },
      ],
      weightage: [
        { topic: 'Biology', weight: 360 },
        { topic: 'Physics', weight: 180 },
        { topic: 'Chemistry', weight: 180 },
      ],
      yearwiseDistribution: [
        { year: '2020', questions: 180, botany: 90, zoology: 90, physics: 45, chemistry: 45 },
        { year: '2021', questions: 180, botany: 90, zoology: 90, physics: 45, chemistry: 45 },
        { year: '2022', questions: 180, botany: 90, zoology: 90, physics: 45, chemistry: 45 },
        { year: '2023', questions: 180, botany: 90, zoology: 90, physics: 45, chemistry: 45 },
        { year: '2024', questions: 180, botany: 90, zoology: 90, physics: 45, chemistry: 45 },
        { year: '2025', questions: 180, botany: 90, zoology: 90, physics: 45, chemistry: 45 },
      ],
      priorityTopics: [
        { topic: 'Human Physiology', priority: 'Critical', reason: '~20 questions per paper · highest yield' },
        { topic: 'Genetics & Evolution', priority: 'Critical', reason: 'Consistent 12+ questions' },
        { topic: 'Cell Biology', priority: 'High', reason: 'Fact-heavy · NCERT lines appear verbatim' },
        { topic: 'Organic Chemistry — NCERT', priority: 'High', reason: 'Direct NCERT-based questions' },
      ],
      gapAnalysis: [
        { topic: 'Ecology', coverage: 45, level: 'Gap', note: 'Under-tested in practice sets' },
        { topic: 'Plant Physiology', coverage: 52, level: 'Watch', note: 'Diagrams frequently asked' },
        { topic: 'Modern Physics (NEET)', coverage: 60, level: 'Watch', note: 'Numerical practice needed' },
        { topic: 'Genetics & Evolution', coverage: 82, level: 'Healthy', note: 'Strong PYQ depth' },
      ],
      repeatedConcepts: ['Digestive enzymes & glands', 'Mendelian inheritance problems', 'Cell cycle checkpoints', 'NCERT organic conversions', 'Ecosystem energy flow'],
    },
  },
}

/* ---------- Assessment health factor weights ---------- */
export const assessmentHealthInputs = {
  weights: { coverage: 0.3, readiness: 0.25, quality: 0.2, pyqCoverage: 0.15, quizHealth: 0.1 },
  thresholds: { excellent: 85, good: 70 },
}

export default assessmentLibrary
