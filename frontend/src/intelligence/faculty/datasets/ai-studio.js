/**
 * Faculty Intelligence — AI Teaching Studio datasets.
 * Contextual prompt library, content-studio type catalogue, evaluation
 * workflows with rubrics, the resource repository, faculty portfolio and
 * teaching history. All interconnected with the existing faculty datasets.
 */

/* ---------- Contextual assistant prompts ---------- */
export const assistantPrompts = [
  { id: 'ap1', label: 'Explain this concept', hint: 'e.g. max-flow min-cut', prompt: 'Explain max-flow min-cut theorem simply, with an example from this week\'s topic.' },
  { id: 'ap2', label: "Prepare tomorrow's lecture", hint: 'network flows', prompt: 'Prepare a 50-minute lecture on network flows for CS501 Sec A with a hook, examples and an exit ticket.' },
  { id: 'ap3', label: 'Generate 20 MCQs', hint: 'medium difficulty', prompt: 'Generate 20 MCQs on the current chapter, medium difficulty, with an answer key.' },
  { id: 'ap4', label: 'Generate subjective questions', hint: 'Unit 3', prompt: 'Generate 6 subjective questions for Unit 3 covering Apply and Analyze levels.' },
  { id: 'ap5', label: 'Create assignment', hint: 'due next week', prompt: 'Create a 10-mark assignment for the current unit with a rubric.' },
  { id: 'ap6', label: 'Summarize Unit 5', hint: 'for revision', prompt: 'Summarize Unit 5 into a one-page revision sheet with key formulas.' },
  { id: 'ap7', label: 'Create revision plan', hint: 'before midsem', prompt: 'Create a 7-day revision plan before the midsem covering the weakest chapters.' },
  { id: 'ap8', label: 'Generate viva questions', hint: 'lab exam', prompt: 'Generate 12 viva questions for the DSA lab exam with expected answers.' },
  { id: 'ap9', label: 'Suggest practical exercise', hint: 'CS501 lab', prompt: 'Suggest a practical exercise for the DSA lab on graph traversals with test cases.' },
  { id: 'ap10', label: 'Explain difficult topic simply', hint: 'DP on trees', prompt: 'Explain DP on trees to a struggling student using an everyday analogy.' },
  { id: 'ap11', label: "Create Bloom's Taxonomy questions", hint: 'all 6 levels', prompt: 'Create questions at all 6 Bloom\'s levels for the current chapter.' },
  { id: 'ap12', label: "Draft today's class warm-up", hint: '5 minutes', prompt: 'Draft a 5-minute warm-up activity for today\'s class tied to last week\'s topic.' },
]

/* ---------- Content Studio type catalogue ---------- */
export const contentStudioTypes = [
  { id: 'notes', name: 'Lecture Notes', icon: 'BookOpen', description: 'Structured, exam-aligned notes with examples', defaultCount: 1 },
  { id: 'presentation', name: 'Presentation Outline', icon: 'Presentation', description: 'Slide-by-slide outline with talking points', defaultCount: 12 },
  { id: 'assignment', name: 'Assignments', icon: 'ClipboardList', description: 'Auto-graded problem sets with rubrics', defaultCount: 5 },
  { id: 'mcq', name: 'MCQs', icon: 'ListChecks', description: 'Multiple-choice questions with answer keys', defaultCount: 10 },
  { id: 'theory', name: 'Theory Questions', icon: 'FileText', description: 'Subjective questions at Apply/Analyze levels', defaultCount: 6 },
  { id: 'case', name: 'Case Studies', icon: 'Briefcase', description: 'Real-world scenarios with guided questions', defaultCount: 2 },
  { id: 'scenario', name: 'Scenario Based Questions', icon: 'MessageSquare', description: 'Situational questions for problem-solving practice', defaultCount: 5 },
  { id: 'lab', name: 'Lab Exercises', icon: 'FlaskConical', description: 'Hands-on exercises with test cases', defaultCount: 3 },
  { id: 'practical', name: 'Practical Sheets', icon: 'Wrench', description: 'Step-by-step practical worksheets', defaultCount: 1 },
  { id: 'rubric', name: 'Rubrics', icon: 'Scale', description: 'Assessment rubrics with criteria bands', defaultCount: 1 },
  { id: 'revision', name: 'Revision Notes', icon: 'RefreshCw', description: 'Condensed unit summaries for revision', defaultCount: 1 },
  { id: 'formula', name: 'Formula Sheet', icon: 'Sigma', description: 'Key formulas and definitions at a glance', defaultCount: 1 },
  { id: 'quick', name: 'Quick Revision', icon: 'Zap', description: 'Rapid-fire facts for last-minute prep', defaultCount: 15 },
  { id: 'mindmap', name: 'Mind Map (Prototype)', icon: 'Network', description: 'Visual concept map of the unit', defaultCount: 1 },
]

/* ---------- Evaluation workflows ---------- */
export const evaluationWorkflows = [
  {
    id: 'assignment', name: 'Assignment Review', icon: 'ClipboardCheck',
    description: 'Batch review with AI-drafted comments and plagiarism flags',
    rubric: ['Correctness of approach (30%)', 'Complexity analysis (20%)', 'Code quality & style (20%)', 'Edge cases handled (15%)', 'Documentation (15%)'],
    mistakes: ['Wrong complexity analysis', 'Missing edge cases', 'Off-by-one errors', 'Unclear variable naming'],
  },
  {
    id: 'subjective', name: 'Subjective Answer Review (Prototype)', icon: 'FileText',
    description: 'AI-assisted marking with model-answer comparison',
    rubric: ['Conceptual accuracy (40%)', 'Completeness of steps (25%)', 'Clarity & structure (20%)', 'Conclusion quality (15%)'],
    mistakes: ['Key steps omitted', 'Unsupported claims', 'Weak conclusion'],
  },
  {
    id: 'mcq', name: 'MCQ Summary', icon: 'ListChecks',
    description: 'Cohort-level analysis of MCQ attempts and common wrong answers',
    rubric: ['Per-question accuracy', 'Distractor analysis', 'Topic-level gaps'],
    mistakes: ['Guessing pattern on 4+ questions', 'Slow time per question'],
  },
  {
    id: 'lab', name: 'Lab Evaluation', icon: 'FlaskConical',
    description: 'Viva + record + execution scoring with feedback',
    rubric: ['Execution correctness (30%)', 'Viva responses (25%)', 'Lab record quality (25%)', 'Time management (20%)'],
    mistakes: ['Record not updated', 'Copy-paste code without understanding'],
  },
  {
    id: 'practical', name: 'Practical Evaluation', icon: 'Wrench',
    description: 'Hands-on practical scoring with observation notes',
    rubric: ['Procedure adherence (30%)', 'Results & observations (30%)', 'Clean-up & safety (15%)', 'Viva (25%)'],
    mistakes: ['Skipping observation tables', 'Not saving outputs'],
  },
  {
    id: 'project', name: 'Project Review', icon: 'FolderKanban',
    description: 'Milestone-based project assessment with next-step guidance',
    rubric: ['Problem definition (20%)', 'Design & architecture (25%)', 'Implementation (30%)', 'Presentation (15%)', 'Documentation (10%)'],
    mistakes: ['Scope creep', 'Missing testing evidence'],
  },
]

/* ---------- Resource repository ---------- */
export const studioResources = [
  { id: 'sr1', title: 'Graph Algorithms — Masterclass (45 min)', category: 'Personal', type: 'Video', course: 'CS501', size: '—', uploaded: '2026-08-02', favorite: true, tags: ['Graphs', 'Video', 'Masterclass'], source: 'MediXO library' },
  { id: 'sr2', title: 'Graphs — 40 PYQs with solutions', category: 'Question Bank', type: 'PDF', course: 'CS501', size: '2.4 MB', uploaded: '2026-07-29', favorite: true, tags: ['PYQ', 'Graphs'], source: 'Dept. bank' },
  { id: 'sr3', title: 'OS Memory Management — slide deck v3', category: 'Lecture Slides', type: 'PPTX', course: 'CS503', size: '3.4 MB', uploaded: '2026-07-27', favorite: false, tags: ['Slides', 'OS'], source: 'Self-authored' },
  { id: 'sr4', title: 'TCP congestion control — traces explained', category: 'Personal', type: 'Notes', course: 'CS505', size: '2 pages', uploaded: '2026-07-25', favorite: false, tags: ['Networks', 'Notes'], source: 'AI generated' },
  { id: 'sr5', title: 'SQL Optimization Assignment', category: 'Department', type: 'DOCX', course: 'CS502', size: '180 KB', uploaded: '2026-07-24', favorite: false, tags: ['Assignment', 'DBMS'], source: 'Dept. shared' },
  { id: 'sr6', title: 'CS501 Midsem 2024 Paper', category: 'Previous Papers', type: 'PDF', course: 'CS501', size: '640 KB', uploaded: '2026-07-22', favorite: true, tags: ['Paper', 'Midsem'], source: 'Exam cell' },
  { id: 'sr7', title: 'CS503 EndSem 2023 Paper', category: 'Previous Papers', type: 'PDF', course: 'CS503', size: '720 KB', uploaded: '2026-07-20', favorite: false, tags: ['Paper', 'EndSem'], source: 'Exam cell' },
  { id: 'sr8', title: 'CLRS Ch. 22–26 — Graph Algorithms', category: 'Reference Books', type: 'PDF', course: 'CS501', size: '8.1 MB', uploaded: '2026-07-18', favorite: true, tags: ['Book', 'Graphs'], source: 'Library' },
  { id: 'sr9', title: 'Silberschatz 10e — OS Concepts', category: 'Reference Books', type: 'PDF', course: 'CS503', size: '11.2 MB', uploaded: '2026-07-15', favorite: false, tags: ['Book', 'OS'], source: 'Library' },
  { id: 'sr10', title: 'Lab Record Template v2', category: 'Templates', type: 'DOCX', course: 'CS501', size: '96 KB', uploaded: '2026-07-12', favorite: false, tags: ['Template', 'Lab'], source: 'Dept.' },
  { id: 'sr11', title: 'Rubric Template — Written Answers', category: 'Templates', type: 'DOCX', course: 'All', size: '72 KB', uploaded: '2026-07-10', favorite: false, tags: ['Template', 'Rubric'], source: 'Dept.' },
  { id: 'sr12', title: 'PYQ Analysis Report — CS503', category: 'PYQ', type: 'PDF', course: 'CS503', size: '1.1 MB', uploaded: '2026-07-08', favorite: false, tags: ['PYQ', 'Analysis'], source: 'AI generated' },
  { id: 'sr13', title: 'Lecture 12 Slides — Network flows', category: 'Lecture Slides', type: 'PPTX', course: 'CS501', size: '2.8 MB', uploaded: '2026-07-05', favorite: false, tags: ['Slides', 'Graphs'], source: 'Self-authored' },
  { id: 'sr14', title: "Bloom's Taxonomy Question Bank", category: 'Question Bank', type: 'XLSX', course: 'CS501', size: '420 KB', uploaded: '2026-07-02', favorite: true, tags: ['Bank', 'Bloom'], source: 'Dept. bank' },
  { id: 'sr15', title: 'Practical Sheet — Graph Contest 4', category: 'Department', type: 'PDF', course: 'CS501', size: '210 KB', uploaded: '2026-06-30', favorite: false, tags: ['Practical', 'Graphs'], source: 'Dept. shared' },
  { id: 'sr16', title: 'OS Synchronisation — Doubt Session Notes', category: 'Personal', type: 'Notes', course: 'CS503', size: '3 pages', uploaded: '2026-06-28', favorite: false, tags: ['Notes', 'OS'], source: 'Self-authored' },
]

export const studioRecentUploads = [
  { id: 'up1', title: 'Graph Algorithms — Masterclass (45 min)', uploaded: '2026-08-02', type: 'Video' },
  { id: 'up2', title: 'Graphs — 40 PYQs with solutions', uploaded: '2026-07-29', type: 'PDF' },
  { id: 'up3', title: 'OS Memory Management — slide deck v3', uploaded: '2026-07-27', type: 'PPTX' },
  { id: 'up4', title: 'TCP congestion control — traces explained', uploaded: '2026-07-25', type: 'Notes' },
]

/* ---------- Faculty portfolio ---------- */
export const facultyPortfolio = {
  achievements: [
    { id: 'ach1', title: 'Best Teacher Award — CSE Dept.', year: '2025', detail: 'For GraphRAG-based adaptive assessments' },
    { id: 'ach2', title: 'Fellow, Teaching Excellence Academy', year: '2024', detail: 'Peer-reviewed teaching portfolio' },
    { id: 'ach3', title: 'Innovation Grant — Educational AI', year: '2023', detail: '₹12L grant for early-risk prediction' },
    { id: 'ach4', title: 'Top 5% faculty rating', year: '2023–26', detail: 'Across 3 consecutive student surveys' },
  ],
  certifications: [
    { id: 'cert1', name: 'AI in Education — Stanford Online', year: '2025', issuer: 'Stanford' },
    { id: 'cert2', name: 'Learning Design & Technology', year: '2024', issuer: 'HarvardX' },
    { id: 'cert3', name: 'GraphRAG Practitioner', year: '2024', issuer: 'Neo4j Academy' },
    { id: 'cert4', name: 'Advanced Assessment Design', year: '2023', issuer: 'NPTEL' },
  ],
  publications: [
    { id: 'pub1', title: 'GraphRAG for Adaptive Assessments: A Case Study in CS Education', venue: 'IEEE TLT', year: 2026, citations: 24, status: 'Published' },
    { id: 'pub2', title: 'Early Prediction of Academic Risk Using Study-Behaviour Signals', venue: 'LAK 2026', year: 2026, citations: 18, status: 'Published' },
    { id: 'pub3', title: 'Energy-aware Scheduling on Heterogeneous Edge Clusters', venue: 'IEEE TPDS', year: 2025, citations: 87, status: 'Published' },
    { id: 'pub4', title: 'Attention Pruning for Efficient Transformer Inference', venue: 'NeurIPS', year: 2026, citations: 0, status: 'Under Review' },
  ],
  feedbackSummary: {
    avgRating: 4.6,
    responses: 212,
    topStrengths: ['Clear explanations', 'Timely feedback', 'Approachable office hours'],
    improvementAreas: ['More practice problems', 'Faster grading turnaround'],
    trend: [
      { term: 'Sem 3', rating: 4.2 },
      { term: 'Sem 4', rating: 4.4 },
      { term: 'Sem 5', rating: 4.6 },
    ],
  },
}

/* ---------- Teaching history (seed events; saves append via API layer) ---------- */
export const aiStudioHistory = [
  { id: 'h1', type: 'lesson-plan', title: 'Lesson plan — Network flows & max-flow/min-cut', detail: 'CS501 · 50 min · Lecture + Practice', date: '2026-08-05' },
  { id: 'h2', type: 'conversation', title: 'AI conversation — Midsem paper B review', detail: '12 messages · pinned', date: '2026-08-04' },
  { id: 'h3', type: 'evaluation', title: 'Evaluation — DSA Assignment 4 batch review', detail: '96 submissions · rubric applied', date: '2026-08-03' },
  { id: 'h4', type: 'assignment', title: 'Assignment generated — Graph Algorithms PS', detail: 'CS501 · 5 problems · rubric attached', date: '2026-08-02' },
  { id: 'h5', type: 'notes', title: 'Lecture notes — Memory management: paging', detail: 'CS503 · 6 pages · AI drafted', date: '2026-08-01' },
  { id: 'h6', type: 'download', title: 'Downloaded — CS501 Midsem 2024 Paper', detail: 'PDF · 640 KB', date: '2026-07-31' },
  { id: 'h7', type: 'resource', title: 'Published resource — Graphs: 40 PYQs', detail: 'Question Bank · CS501', date: '2026-07-29' },
  { id: 'h8', type: 'lesson-plan', title: 'Lesson plan — Deadlock detection & recovery', detail: 'CS503 · 50 min · Case Study', date: '2026-07-28' },
  { id: 'h9', type: 'conversation', title: 'AI conversation — Quiz 3 draft (Transactions)', detail: '8 messages', date: '2026-07-27' },
  { id: 'h10', type: 'evaluation', title: 'Evaluation — OS Assignment 3 feedback', detail: '132 submissions · comments drafted', date: '2026-07-26' },
]

/* ---------- Saved lesson plans (seed) ---------- */
export const savedLessonPlans = [
  {
    id: 'lp1', title: 'Network flows & max-flow/min-cut', course: 'CS501', chapter: 'Graph Algorithms',
    duration: 50, method: 'Lecture + Practice', difficulty: 'Medium', created: '2026-08-05',
    objectives: ['State the max-flow min-cut theorem and its intuition', 'Compute augmenting paths using residual graphs', 'Apply Ford–Fulkerson/Edmonds–Karp to small networks', 'Relate flows to bipartite matching applications'],
    sections: [
      { title: 'Introduction & hook', minutes: 8, content: 'Open with the "evacuation planning" problem: how much traffic can move through a road network in an hour? Elicit student guesses before revealing the abstraction.' },
      { title: 'Core concept', minutes: 15, content: 'Define flow networks, capacity constraints, conservation. Walk through residual graphs and augmenting paths on a 5-vertex example (Ford–Fulkerson).' },
      { title: 'Worked examples', minutes: 10, content: 'Example A: trace augmenting paths to max flow 14. Example B: find the min cut and verify max-flow = min-cut.' },
      { title: 'Class discussion', minutes: 7, content: 'Why does greedy path choice fail? What happens with negative residual capacities? Discuss bipartite matching as a flow problem.' },
      { title: 'Practice', minutes: 10, content: 'Pair work: solve the provided 6-vertex network sheet (2 problems). Peer check with the answer key.' },
    ],
  },
  {
    id: 'lp2', title: 'Deadlock detection & recovery', course: 'CS503', chapter: 'Synchronisation',
    duration: 50, method: 'Case Study', difficulty: 'Medium', created: '2026-07-28',
    objectives: ['Identify the four necessary conditions for deadlock', 'Use the wait-for graph for detection', 'Compare recovery strategies (termination vs preemption)'],
    sections: [
      { title: 'Introduction & hook', minutes: 8, content: 'Show a real deadlock from a database log: two transactions holding each other\'s locks. What went wrong?' },
      { title: 'Core concept', minutes: 15, content: 'The four conditions (mutual exclusion, hold-and-wait, no preemption, circular wait) with a running example.' },
      { title: 'Worked example', minutes: 12, content: 'Build a wait-for graph from a resource-allocation snapshot; detect the cycle; apply Banker\'s-algorithm-style checks.' },
      { title: 'Case study', minutes: 10, content: 'Deadlock in a railway crossing / printer spooler scenario — groups propose detection + recovery plans.' },
      { title: 'Practice & exit ticket', minutes: 5, content: '3 quick questions: classify each condition, find the cycle, choose recovery.' },
    ],
  },
]

export default assistantPrompts
