/**
 * Student Intelligence — academic datasets.
 * Attendance · attendance analytics · courses · subjects · assignments · projects.
 *
 * Every record references the master student (studentId: 'u_stu_001') and the
 * canonical course/subject codes (CS501–CS506) shared with the rest of the
 * platform, so no dataset is isolated.
 */

export const studentId = 'u_stu_001'

/* ------------------------------------------------------------------ */
/* Attendance (current semester)                                       */
/* ------------------------------------------------------------------ */
export const attendance = {
  id: 'att_sem5_2026',
  studentId,
  overall: 92.4,
  required: 75,
  buffer: 17.4,
  totalClasses: 300,
  classesAttended: 277,
  classesMissed: 23,
  leaves: 4,
  bySubject: [
    { subjectCode: 'CS501', subject: 'Data Structures & Algorithms', pct: 96, present: 48, total: 50, color: '#6366f1' },
    { subjectCode: 'CS502', subject: 'Database Management Systems', pct: 90, present: 45, total: 50, color: '#14b8a6' },
    { subjectCode: 'CS503', subject: 'Operating Systems', pct: 88, present: 44, total: 50, color: '#f59e0b' },
    { subjectCode: 'CS504', subject: 'Computer Networks', pct: 86, present: 43, total: 50, color: '#f43f5e' },
    { subjectCode: 'CS505', subject: 'Machine Learning', pct: 98, present: 49, total: 50, color: '#8b5cf6' },
    { subjectCode: 'CS506', subject: 'Theory of Computation', pct: 92, present: 46, total: 50, color: '#0ea5e9' },
  ],
  history: [
    { date: '2026-08-05', subjectCode: 'CS502', subject: 'Database Management Systems', type: 'Lecture', status: 'Present' },
    { date: '2026-08-04', subjectCode: 'CS504', subject: 'Computer Networks', type: 'Lecture', status: 'Absent' },
    { date: '2026-08-03', subjectCode: 'CS501', subject: 'Data Structures & Algorithms', type: 'Lecture', status: 'Present' },
    { date: '2026-08-01', subjectCode: 'CS501', subject: 'Data Structures & Algorithms', type: 'Lab', status: 'Present' },
    { date: '2026-07-31', subjectCode: 'CS505', subject: 'Machine Learning', type: 'Lab', status: 'Present' },
    { date: '2026-07-30', subjectCode: 'CS504', subject: 'Computer Networks', type: 'Lecture', status: 'Absent' },
    { date: '2026-07-29', subjectCode: 'CS503', subject: 'Operating Systems', type: 'Lecture', status: 'Present' },
    { date: '2026-07-28', subjectCode: 'CS502', subject: 'Database Management Systems', type: 'Lecture', status: 'Leave' },
    { date: '2026-07-27', subjectCode: 'CS506', subject: 'Theory of Computation', type: 'Tutorial', status: 'Present' },
    { date: '2026-07-26', subjectCode: 'CS501', subject: 'Data Structures & Algorithms', type: 'Lecture', status: 'Present' },
    { date: '2026-07-25', subjectCode: 'CS505', subject: 'Machine Learning', type: 'Lecture', status: 'Present' },
    { date: '2026-07-24', subjectCode: 'CS503', subject: 'Operating Systems', type: 'Lab', status: 'Present' },
  ],
  monthlyCalendar: [
    { date: '2026-08-03', day: 3, status: 'Present' },
    { date: '2026-08-04', day: 4, status: 'Absent' },
    { date: '2026-08-05', day: 5, status: 'Present' },
    { date: '2026-08-06', day: 6, status: 'Present' },
    { date: '2026-08-07', day: 7, status: 'Present' },
    { date: '2026-08-08', day: 8, status: 'Holiday' },
    { date: '2026-08-09', day: 9, status: 'Holiday' },
    { date: '2026-08-10', day: 10, status: 'Present' },
    { date: '2026-08-11', day: 11, status: 'Present' },
    { date: '2026-08-12', day: 12, status: 'Present' },
    { date: '2026-08-13', day: 13, status: 'Absent' },
    { date: '2026-08-14', day: 14, status: 'Present' },
    { date: '2026-08-15', day: 15, status: 'Holiday' },
    { date: '2026-08-16', day: 16, status: 'Present' },
    { date: '2026-08-17', day: 17, status: 'Present' },
    { date: '2026-08-18', day: 18, status: 'Leave' },
    { date: '2026-08-19', day: 19, status: 'Present' },
    { date: '2026-08-20', day: 20, status: 'Present' },
  ],

  /* Display series + AI narrative (Phase 27.3: consolidated into the foundation
     so the Attendance page consumes ONE source instead of a legacy adapter).
     All values are deterministic and consistent with the records above. */
  weekly: [
    { week: 'W1', pct: 94 }, { week: 'W2', pct: 90 }, { week: 'W3', pct: 96 }, { week: 'W4', pct: 88 },
    { week: 'W5', pct: 92 }, { week: 'W6', pct: 95 }, { week: 'W7', pct: 90 }, { week: 'W8', pct: 93 },
    { week: 'W9', pct: 97 }, { week: 'W10', pct: 91 }, { week: 'W11', pct: 89 }, { week: 'W12', pct: 94 },
  ],
  heatmap: Array.from({ length: 13 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const v = ((w * 7 + d) * 13) % 101
      return { date: `2026-08-${String(d + 1).padStart(2, '0')}`, value: v }
    })
  ),
  insights: [
    { id: 'i1', tone: 'positive', title: 'Networks is your only risk subject', body: 'At 86% you are 11 points above the 75% floor, but two more absences this month would tighten the buffer to ~9 points before midsems.' },
    { id: 'i2', tone: 'neutral', title: 'Mondays are your weakest day', body: 'Your attendance dips most on Mondays — 3 of your 4 absences this semester were Monday lectures. A recurring Monday alarm could fix this.' },
    { id: 'i3', tone: 'positive', title: 'ML & DSA are rock solid', body: '98% and 96% attendance — you have a full absence allowance in both subjects, freeing schedule space for revision.' },
    { id: 'i4', tone: 'warning', title: 'Leave usage is healthy', body: '2 sanctioned leaves this semester (well under the 6 allowed). No action needed, but keep the register updated via the support desk.' },
  ],
  aiSuggestions: [
    { id: 'a1', topic: 'Weekly buffer tracker', body: 'Set a weekly alert on Sundays — if your overall attendance ever drops below 88%, MediXO Mentor will schedule a make-up class reminder for you.', impact: 'High' },
    { id: 'a2', topic: 'Networks recovery plan', body: 'Attend the next 3 Networks lectures without fail and your subject attendance returns to 90%+. The AI planner has blocked 3 reminders this week.', impact: 'High' },
    { id: 'a3', topic: 'Leave policy reminder', body: 'Sanctioned leave requires a 24-hour prior intimation on the support desk. File your next leave before Friday 5 PM to keep records clean.', impact: 'Medium' },
  ],
}

/* ------------------------------------------------------------------ */
/* Attendance analytics (derived-friendly base series)                 */
/* ------------------------------------------------------------------ */
export const attendanceAnalytics = {
  id: 'att_anl_sem5',
  studentId,
  monthlyTrend: [
    { month: 'Mar', pct: 91.2 },
    { month: 'Apr', pct: 89.8 },
    { month: 'May', pct: 90.5 },
    { month: 'Jun', pct: 92.1 },
    { month: 'Jul', pct: 93.0 },
    { month: 'Aug', pct: 92.4 },
  ],
  weeklyPattern: [
    { day: 'Monday', pct: 84 },
    { day: 'Tuesday', pct: 94 },
    { day: 'Wednesday', pct: 96 },
    { day: 'Thursday', pct: 93 },
    { day: 'Friday', pct: 95 },
    { day: 'Saturday', pct: 98 },
    { day: 'Sunday', pct: 100 },
  ],
  weeklySummary: [
    { week: 'Week 1', range: 'Aug 3 – Aug 8', present: 5, total: 6, pct: 83, focus: 'DSA · ML labs' },
    { week: 'Week 2', range: 'Aug 10 – Aug 15', present: 5, total: 6, pct: 83, focus: 'Midsem revision' },
    { week: 'Week 3', range: 'Aug 17 – Aug 22', present: 5, total: 6, pct: 83, focus: 'Midsem exams' },
    { week: 'Week 4', range: 'Aug 24 – Aug 29', present: 6, total: 6, pct: 100, focus: 'All clear' },
  ],
  weakestDay: 'Monday',
  strongestSubject: 'CS505',
  atRiskSubject: 'CS504',
  projectedSemesterEnd: 91.8,
}

/* ------------------------------------------------------------------ */
/* Courses (Semester 5 enrolment)                                      */
/* ------------------------------------------------------------------ */
export const courses = [
  {
    id: 'CS501', code: 'CS501', title: 'Data Structures & Algorithms', subjectCode: 'CS501', studentId,
    faculty: 'Dr. Meera Krishnan', facultyId: 'fac_meera_krishnan', credits: 4, color: '#6366f1',
    progress: 68, lessons: 42, completed: 29, grade: 'A', status: 'Ongoing',
    description: 'Advanced data structures, graph algorithms, complexity analysis and problem-solving at scale.',
  },
  {
    id: 'CS502', code: 'CS502', title: 'Database Management Systems', subjectCode: 'CS502', studentId,
    faculty: 'Dr. Arvind Kulkarni', facultyId: 'fac_arvind_kulkarni', credits: 3, color: '#14b8a6',
    progress: 55, lessons: 36, completed: 20, grade: 'A-', status: 'Ongoing',
    description: 'Relational design, SQL, query optimisation, transactions, concurrency and NoSQL systems.',
  },
  {
    id: 'CS503', code: 'CS503', title: 'Operating Systems', subjectCode: 'CS503', studentId,
    faculty: 'Dr. Meera Krishnan', facultyId: 'fac_meera_krishnan', credits: 4, color: '#f59e0b',
    progress: 62, lessons: 40, completed: 25, grade: 'B+', status: 'Ongoing',
    description: 'Processes, scheduling, memory management, file systems and the Linux kernel in practice.',
  },
  {
    id: 'CS504', code: 'CS504', title: 'Computer Networks', subjectCode: 'CS504', studentId,
    faculty: 'Prof. Vikram Rao', facultyId: 'fac_vikram_rao', credits: 3, color: '#f43f5e',
    progress: 48, lessons: 34, completed: 16, grade: 'B', status: 'Ongoing',
    description: 'Layered architecture, TCP/IP, routing, application protocols and network security.',
  },
  {
    id: 'CS505', code: 'CS505', title: 'Machine Learning', subjectCode: 'CS505', studentId,
    faculty: 'Dr. Priya Nair', facultyId: 'fac_priya_nair', credits: 4, color: '#8b5cf6',
    progress: 71, lessons: 38, completed: 27, grade: 'A', status: 'Ongoing',
    description: 'Supervised and unsupervised learning, neural networks, evaluation and real-world pipelines.',
  },
  {
    id: 'CS506', code: 'CS506', title: 'Theory of Computation', subjectCode: 'CS506', studentId,
    faculty: 'Dr. Arvind Kulkarni', facultyId: 'fac_arvind_kulkarni', credits: 3, color: '#0ea5e9',
    progress: 41, lessons: 30, completed: 12, grade: 'B', status: 'Ongoing',
    description: 'Automata, formal languages, decidability and the limits of computation.',
  },
]

/* ------------------------------------------------------------------ */
/* Subjects (Semester 5, live internals)                               */
/* ------------------------------------------------------------------ */
export const subjects = [
  { code: 'CS501', studentId, name: 'Data Structures & Algorithms', teacher: 'Dr. Meera Krishnan', credits: 4, progress: 68, attendance: 96, internal: 86, color: '#6366f1' },
  { code: 'CS502', studentId, name: 'Database Management Systems', teacher: 'Dr. Arvind Kulkarni', credits: 3, progress: 55, attendance: 90, internal: 78, color: '#14b8a6' },
  { code: 'CS503', studentId, name: 'Operating Systems', teacher: 'Dr. Meera Krishnan', credits: 4, progress: 62, attendance: 88, internal: 74, color: '#f59e0b' },
  { code: 'CS504', studentId, name: 'Computer Networks', teacher: 'Prof. Vikram Rao', credits: 3, progress: 48, attendance: 86, internal: 69, color: '#f43f5e' },
  { code: 'CS505', studentId, name: 'Machine Learning', teacher: 'Dr. Priya Nair', credits: 4, progress: 71, attendance: 98, internal: 82, color: '#8b5cf6' },
  { code: 'CS506', studentId, name: 'Theory of Computation', teacher: 'Dr. Arvind Kulkarni', credits: 3, progress: 41, attendance: 92, internal: 64, color: '#0ea5e9' },
]

/* ------------------------------------------------------------------ */
/* Assignments                                                         */
/* ------------------------------------------------------------------ */
export const assignments = [
  { id: 'as1', studentId, courseCode: 'CS501', subjectCode: 'CS501', title: 'DSA Assignment 4 — Graph Algorithms', type: 'Problem Set', due: '2026-08-06T23:59:00', status: 'Pending', progress: 40, maxScore: 20, weight: '10% of internals', description: 'Implement Dijkstra, Bellman-Ford and Floyd-Warshall; analyse complexity; solve the 4 given application problems.' },
  { id: 'as2', studentId, courseCode: 'CS505', subjectCode: 'CS505', title: 'ML Mini-Project — Sentiment Analysis', type: 'Project', due: '2026-08-11T23:59:00', status: 'Pending', progress: 25, maxScore: 50, weight: '15% of internals', description: 'Build a sentiment classifier on product reviews; compare logistic regression vs BERT-tiny.' },
  { id: 'as3', studentId, courseCode: 'CS502', subjectCode: 'CS502', title: 'DBMS Quiz 3 — Transactions & Concurrency', type: 'Quiz', due: '2026-08-14T18:00:00', status: 'Upcoming', progress: 0, maxScore: 10, weight: '5% of internals', description: 'ACID properties, isolation levels, conflict serializability, 2PL, deadlock handling.' },
  { id: 'as4', studentId, courseCode: 'CS503', subjectCode: 'CS503', title: 'OS Assignment 3 — CPU Scheduling', type: 'Problem Set', due: '2026-07-30T23:59:00', status: 'Graded', progress: 100, maxScore: 20, score: 17, grade: 'A', weight: '10% of internals', feedback: 'Excellent analysis of starvation in SJF. Recheck Gantt chart for round-robin with time quantum 3.' },
  { id: 'as5', studentId, courseCode: 'CS504', subjectCode: 'CS504', title: 'CN Lab Record 5 — Socket Programming', type: 'Lab Record', due: '2026-07-28T23:59:00', status: 'Graded', progress: 100, maxScore: 20, score: 18, grade: 'A', weight: '10% of internals', feedback: 'Clean TCP chat implementation. Add error handling for partial reads next time.' },
  { id: 'as6', studentId, courseCode: 'CS501', subjectCode: 'CS501', title: 'DSA Quiz 2 — Trees', type: 'Quiz', due: '2026-07-27T18:00:00', status: 'Graded', progress: 100, maxScore: 10, score: 9.5, grade: 'A+', weight: '5% of internals', feedback: 'Top 8% of class. Great work on the AVL question.' },
  { id: 'as7', studentId, courseCode: 'CS506', subjectCode: 'CS506', title: 'ToC Problem Set 2 — Regular Languages', type: 'Problem Set', due: '2026-07-24T23:59:00', status: 'Graded', progress: 100, maxScore: 20, score: 15, grade: 'B+', weight: '10% of internals', feedback: 'Pumping lemma proofs need more rigour. Review worked examples in module 4.' },
  { id: 'as8', studentId, courseCode: 'CS505', subjectCode: 'CS505', title: 'ML Quiz 1 — Regression', type: 'Quiz', due: '2026-07-20T18:00:00', status: 'Graded', progress: 100, maxScore: 10, score: 8.5, grade: 'A', weight: '5% of internals', feedback: 'Solid. Revisit gradient descent convergence criteria.' },
]

/* ------------------------------------------------------------------ */
/* Today's schedule (lectures, labs, clubs)                            */
/* ------------------------------------------------------------------ */
export const todaySchedule = [
  { time: '09:00', title: 'Data Structures & Algorithms', type: 'Lecture', room: 'LT-201', subjectCode: 'CS501', subject: 'Data Structures & Algorithms' },
  { time: '11:00', title: 'Machine Learning Lab', type: 'Lab', room: 'Lab 4', subjectCode: 'CS505', subject: 'Machine Learning' },
  { time: '14:00', title: 'DBMS — Query Optimization', type: 'Lecture', room: 'LT-104', subjectCode: 'CS502', subject: 'Database Management Systems' },
  { time: '17:30', title: 'Coding Club — Graph Contest', type: 'Club', room: 'Online', subjectCode: null, subject: 'Club' },
]

/* ------------------------------------------------------------------ */
/* Projects (mini-projects & course projects)                          */
/* ------------------------------------------------------------------ */
export const projects = [
  { id: 'prj1', studentId, title: 'ML Mini-Project — Sentiment Analysis', courseCode: 'CS505', subjectCode: 'CS505', guide: 'Dr. Priya Nair', team: ['Aarav Sharma', 'Rohan Verma'], status: 'In Progress', progress: 35, marks: null, due: '2026-08-11' },
  { id: 'prj2', studentId, title: 'Library Management System (DBMS)', courseCode: 'CS502', subjectCode: 'CS502', guide: 'Dr. Arvind Kulkarni', team: ['Aarav Sharma', 'Ishita Gupta'], status: 'Completed', progress: 100, marks: 46, maxMarks: 50, grade: 'A', due: '2026-06-28' },
  { id: 'prj3', studentId, title: 'Mini Compiler for a Toy Language', courseCode: 'CS506', subjectCode: 'CS506', guide: 'Dr. Arvind Kulkarni', team: ['Aarav Sharma'], status: 'In Progress', progress: 60, marks: null, due: '2026-09-20' },
  { id: 'prj4', studentId, title: 'OS Process Simulator', courseCode: 'CS503', subjectCode: 'CS503', guide: 'Dr. Meera Krishnan', team: ['Aarav Sharma', 'Divya Krishnan', 'Kavya Menon'], status: 'Completed', progress: 100, marks: 44, maxMarks: 50, grade: 'A', due: '2026-06-15' },
  { id: 'prj5', studentId, title: 'Smart Campus IoT Gateway (Networks)', courseCode: 'CS504', subjectCode: 'CS504', guide: 'Prof. Vikram Rao', team: ['Aarav Sharma'], status: 'In Progress', progress: 20, marks: null, due: '2026-10-05' },
]


/* ------------------------------------------------------------------ */
/* Course content — modules & lessons (Phase 27.3).                    */
/* Deterministic per-course content attached by the university engine. */
/* Progress flags are consistent with each course's overall progress.  */
/* ------------------------------------------------------------------ */
export const courseModules = {
  CS501: [
    {
      id: 'm1', title: 'Module 1 — Foundations & Complexity', progress: 100,
      lessons: [
        { id: 'l1', title: 'Asymptotic analysis & Big-O', duration: '38 min', done: true, type: 'Video' },
        { id: 'l2', title: 'Recurrences & Master Theorem', duration: '45 min', done: true, type: 'Video' },
        { id: 'l3', title: 'Problem set: complexity classes', duration: '30 min', done: true, type: 'Practice' },
      ],
    },
    {
      id: 'm2', title: 'Module 2 — Trees & Heaps', progress: 100,
      lessons: [
        { id: 'l4', title: 'AVL trees & rotations', duration: '42 min', done: true, type: 'Video' },
        { id: 'l5', title: 'Segment trees & Fenwick trees', duration: '51 min', done: true, type: 'Video' },
        { id: 'l6', title: 'Heaps & priority queues', duration: '34 min', done: true, type: 'Video' },
        { id: 'l7', title: 'Quiz 2 — Trees (scored 9.5/10)', duration: '25 min', done: true, type: 'Quiz' },
      ],
    },
    {
      id: 'm3', title: 'Module 3 — Graph Algorithms', progress: 55,
      lessons: [
        { id: 'l8', title: 'BFS, DFS & topological sort', duration: '48 min', done: true, type: 'Video' },
        { id: 'l9', title: 'Dijkstra & Bellman-Ford', duration: '44 min', done: true, type: 'Video' },
        { id: 'l10', title: 'Union-Find & MST (Kruskal, Prim)', duration: '39 min', done: true, type: 'Video' },
        { id: 'l11', title: 'Network flows & max-flow/min-cut', duration: '52 min', done: false, type: 'Video' },
        { id: 'l12', title: 'Practice: graph contest problems', duration: '40 min', done: false, type: 'Practice' },
      ],
    },
    {
      id: 'm4', title: 'Module 4 — Advanced Topics', progress: 10,
      lessons: [
        { id: 'l13', title: 'String algorithms (KMP, Z, suffix arrays)', duration: '55 min', done: false, type: 'Video' },
        { id: 'l14', title: 'Dynamic programming patterns', duration: '60 min', done: false, type: 'Video' },
        { id: 'l15', title: 'NP-completeness & reductions', duration: '47 min', done: false, type: 'Video' },
      ],
    },
  ],
  CS502: [
    {
      id: 'm1', title: 'Module 1 — Relational Design', progress: 100,
      lessons: [
        { id: 'l1', title: 'ER modelling & normalisation', duration: '40 min', done: true, type: 'Video' },
        { id: 'l2', title: '3NF / BCNF decomposition', duration: '44 min', done: true, type: 'Video' },
        { id: 'l3', title: 'Problem set: normal forms', duration: '28 min', done: true, type: 'Practice' },
      ],
    },
    {
      id: 'm2', title: 'Module 2 — SQL & Transactions', progress: 60,
      lessons: [
        { id: 'l4', title: 'Advanced SQL & window functions', duration: '42 min', done: true, type: 'Video' },
        { id: 'l5', title: 'ACID & isolation levels', duration: '46 min', done: true, type: 'Video' },
        { id: 'l6', title: 'Conflict serializability & 2PL', duration: '50 min', done: false, type: 'Video' },
        { id: 'l7', title: 'Quiz 3 — Transactions (upcoming)', duration: '25 min', done: false, type: 'Quiz' },
      ],
    },
    {
      id: 'm3', title: 'Module 3 — Indexing & Optimisation', progress: 20,
      lessons: [
        { id: 'l8', title: 'B+ tree operations', duration: '38 min', done: false, type: 'Video' },
        { id: 'l9', title: 'Query execution plans', duration: '41 min', done: false, type: 'Video' },
        { id: 'l10', title: 'Practice: query tuning', duration: '35 min', done: false, type: 'Practice' },
      ],
    },
  ],
  CS503: [
    {
      id: 'm1', title: 'Module 1 — Processes & Scheduling', progress: 100,
      lessons: [
        { id: 'l1', title: 'Processes, threads & context switch', duration: '39 min', done: true, type: 'Video' },
        { id: 'l2', title: 'Scheduling policies (FCFS, SJF, RR)', duration: '47 min', done: true, type: 'Video' },
        { id: 'l3', title: 'Assignment 3 — scheduling traces', duration: '30 min', done: true, type: 'Practice' },
      ],
    },
    {
      id: 'm2', title: 'Module 2 — Memory Management', progress: 55,
      lessons: [
        { id: 'l4', title: 'Paging, segmentation & TLBs', duration: '45 min', done: true, type: 'Video' },
        { id: 'l5', title: 'Page replacement (FIFO, LRU, Optimal)', duration: '42 min', done: true, type: 'Video' },
        { id: 'l6', title: 'Virtual memory & demand paging', duration: '40 min', done: false, type: 'Video' },
        { id: 'l7', title: 'Practice: page-fault traces', duration: '26 min', done: false, type: 'Practice' },
      ],
    },
    {
      id: 'm3', title: 'Module 3 — Concurrency & File Systems', progress: 25,
      lessons: [
        { id: 'l8', title: 'Semaphores & classic problems', duration: '48 min', done: false, type: 'Video' },
        { id: 'l9', title: 'Deadlocks: detection & avoidance', duration: '43 min', done: false, type: 'Video' },
        { id: 'l10', title: 'File allocation & journaling', duration: '36 min', done: false, type: 'Video' },
      ],
    },
  ],
  CS504: [
    {
      id: 'm1', title: 'Module 1 — Network Layer', progress: 90,
      lessons: [
        { id: 'l1', title: 'IP addressing & CIDR', duration: '41 min', done: true, type: 'Video' },
        { id: 'l2', title: 'Routing algorithms (RIP, OSPF, BGP)', duration: '46 min', done: true, type: 'Video' },
        { id: 'l3', title: 'Lab record 5 — socket programming', duration: '60 min', done: true, type: 'Lab' },
      ],
    },
    {
      id: 'm2', title: 'Module 2 — Transport & Application', progress: 35,
      lessons: [
        { id: 'l4', title: 'TCP: flow, congestion & AIMD', duration: '49 min', done: true, type: 'Video' },
        { id: 'l5', title: 'UDP & QUIC', duration: '30 min', done: false, type: 'Video' },
        { id: 'l6', title: 'HTTP/2, DNS & CDNs', duration: '38 min', done: false, type: 'Video' },
        { id: 'l7', title: 'Practice: congestion traces', duration: '28 min', done: false, type: 'Practice' },
      ],
    },
    {
      id: 'm3', title: 'Module 3 — Security & Wireless', progress: 10,
      lessons: [
        { id: 'l8', title: 'TLS & secure channels', duration: '42 min', done: false, type: 'Video' },
        { id: 'l9', title: 'Wi-Fi, LTE & mobility', duration: '37 min', done: false, type: 'Video' },
      ],
    },
  ],
  CS505: [
    {
      id: 'm1', title: 'Module 1 — Supervised Learning', progress: 100,
      lessons: [
        { id: 'l1', title: 'Linear & logistic regression', duration: '44 min', done: true, type: 'Video' },
        { id: 'l2', title: 'Gradient descent & convergence', duration: '41 min', done: true, type: 'Video' },
        { id: 'l3', title: 'Quiz 1 — Regression (scored 8.5/10)', duration: '22 min', done: true, type: 'Quiz' },
      ],
    },
    {
      id: 'm2', title: 'Module 2 — Neural Networks', progress: 65,
      lessons: [
        { id: 'l4', title: 'Backpropagation from scratch', duration: '52 min', done: true, type: 'Video' },
        { id: 'l5', title: 'Regularisation (L1/L2, dropout)', duration: '38 min', done: true, type: 'Video' },
        { id: 'l6', title: 'Mini-project — sentiment model', duration: '70 min', done: false, type: 'Practice' },
        { id: 'l7', title: 'Practice: model tuning', duration: '30 min', done: false, type: 'Practice' },
      ],
    },
    {
      id: 'm3', title: 'Module 3 — Evaluation & Unsupervised', progress: 30,
      lessons: [
        { id: 'l8', title: 'Metrics: precision, recall, ROC', duration: '36 min', done: false, type: 'Video' },
        { id: 'l9', title: 'K-means & dimensionality reduction', duration: '40 min', done: false, type: 'Video' },
        { id: 'l10', title: 'Practice: evaluation labs', duration: '32 min', done: false, type: 'Practice' },
      ],
    },
  ],
  CS506: [
    {
      id: 'm1', title: 'Module 1 — Automata & Regular Languages', progress: 80,
      lessons: [
        { id: 'l1', title: 'DFA/NFA construction', duration: '43 min', done: true, type: 'Video' },
        { id: 'l2', title: 'Regular expressions & pumping lemma', duration: '47 min', done: true, type: 'Video' },
        { id: 'l3', title: 'Problem set 2 — regular languages', duration: '35 min', done: true, type: 'Practice' },
      ],
    },
    {
      id: 'm2', title: 'Module 2 — Context-Free Grammars', progress: 30,
      lessons: [
        { id: 'l4', title: 'CFGs & parse trees', duration: '40 min', done: true, type: 'Video' },
        { id: 'l5', title: 'Pushdown automata', duration: '42 min', done: false, type: 'Video' },
        { id: 'l6', title: 'Practice: grammar derivations', duration: '28 min', done: false, type: 'Practice' },
      ],
    },
    {
      id: 'm3', title: 'Module 3 — Decidability & Reductions', progress: 5,
      lessons: [
        { id: 'l7', title: 'Turing machines & halting problem', duration: '45 min', done: false, type: 'Video' },
        { id: 'l8', title: 'Reductions & Rice’s theorem', duration: '44 min', done: false, type: 'Video' },
      ],
    },
  ],
}
