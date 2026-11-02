/**
 * Student Intelligence — journey, portfolio & career datasets.
 * Academic journey · digital portfolio · career profile.
 */

import { studentId } from './academics.js'

/* ------------------------------------------------------------------ */
/* Academic journey (timeline of the student's academic life)          */
/* ------------------------------------------------------------------ */
export const academicJourney = [
  /* Phase 27.1 timeline fix: dates aligned with the 2024 intake narrative
     (Sem 1 2024-25 → Sem 5 2026-27) and the institution's Pune campus. */
  { id: 'jv1', studentId, type: 'milestone', title: 'Admission — B.Tech CSE', detail: 'Enrolled at Institute of Technology, Pune.', date: '2024-07-19', icon: 'GraduationCap' },
  { id: 'jv2', studentId, type: 'milestone', title: 'Semester 1 completed', detail: 'GPA 7.8 · rank 42/220', date: '2024-12-18', icon: 'Flag' },
  { id: 'jv3', studentId, type: 'milestone', title: 'Semester 2 completed', detail: 'GPA 8.1 · rank 34/220', date: '2025-05-20', icon: 'Flag' },
  { id: 'jv4', studentId, type: 'project', title: 'OS Process Simulator project', detail: 'Scored 44/50 (A) with Dr. Meera Krishnan.', date: '2025-06-15', icon: 'FolderKanban' },
  { id: 'jv5', studentId, type: 'milestone', title: 'Semester 3 completed', detail: 'GPA 8.3 · rank 28/220', date: '2025-12-16', icon: 'Flag' },
  { id: 'jv6', studentId, type: 'certification', title: 'NPTEL — Data Structures (Elite)', detail: 'Completed with 87% · Silver medal.', date: '2026-03-10', icon: 'Award' },
  { id: 'jv7', studentId, type: 'milestone', title: 'Semester 4 completed', detail: 'GPA 8.6 · rank 19/220', date: '2026-05-22', icon: 'Flag' },
  { id: 'jv8', studentId, type: 'achievement', title: 'First JEE Main mock — ATS 1', detail: 'Started the test-series journey at 148/300.', date: '2025-06-28', icon: 'Target' },
  { id: 'jv9', studentId, type: 'milestone', title: 'Semester 5 — In progress', detail: 'CGPA 8.72 · rank 14/220 · midsems Aug 19–23.', date: '2026-07-20', icon: 'Sparkles' },
  { id: 'jv10', studentId, type: 'achievement', title: '91.4 percentile — ATS 4', detail: 'Top 10% nationally in the All India Test Series.', date: '2026-08-02', icon: 'Trophy' },
]

/* ------------------------------------------------------------------ */
/* Digital portfolio                                                   */
/* ------------------------------------------------------------------ */
export const digitalPortfolio = {
  id: 'port1',
  studentId,
  summary: 'CSE undergraduate with strong foundations in algorithms, ML and systems — building towards a career in software engineering.',
  skills: [
    { name: 'Data Structures & Algorithms', level: 86, category: 'Core CS' },
    { name: 'Machine Learning', level: 82, category: 'AI/ML' },
    { name: 'SQL & Databases', level: 78, category: 'Data' },
    { name: 'Operating Systems', level: 74, category: 'Systems' },
    { name: 'Python', level: 84, category: 'Language' },
    { name: 'Java', level: 76, category: 'Language' },
    { name: 'System Design', level: 55, category: 'Engineering' },
    { name: 'Communication', level: 78, category: 'Soft Skill' },
  ],
  certifications: [
    { title: 'NPTEL — Data Structures (Elite + Silver)', issuer: 'NPTEL / IIT Madras', year: 2023 },
    { title: 'AWS Cloud Practitioner (In Progress)', issuer: 'AWS', year: 2026 },
  ],
  projects: [
    { title: 'Sentiment Analysis Mini-Project', role: 'Lead', tech: ['Python', 'scikit-learn'], year: 2026, link: null },
    { title: 'Library Management System (DBMS)', role: 'Co-developer', tech: ['SQL', 'Java Swing'], year: 2026, link: null },
    { title: 'OS Process Simulator', role: 'Lead', tech: ['C', 'POSIX'], year: 2026, link: null },
  ],
  profiles: { github: 'github.com/aaravsharma', linkedin: 'linkedin.com/in/aaravsharma21' },
  resumeScore: 72,
  uploads: 3,
  competitions: [
    { id: 'comp1', name: 'CodeChef Starters 180', rank: 'Top 18%', year: 2026, status: 'Participated' },
    { id: 'comp2', name: 'Smart Campus Hackathon', rank: 'Finalist (Top 10)', year: 2026, status: 'Finalist' },
    { id: 'comp3', name: 'Institute Coding Contest — Graphs', rank: 'Rank 4', year: 2025, status: 'Won' },
  ],
  internships: [
    { id: 'int1', role: 'Software Engineering Intern (Summer)', org: 'TechNova Solutions, Bhubaneswar', year: '2026', status: 'In Progress', detail: 'Building REST APIs + ML-based analytics dashboards.' },
    { id: 'int2', role: 'Research Intern', org: 'Campus AI Lab', year: '2025', status: 'Completed', detail: 'Benchmarked LLM evaluation suites on campus datasets.' },
  ],
  research: [
    { id: 'res1', title: 'GraphRAG for Adaptive Assessments', role: 'Co-author', venue: 'IEEE TLT (under review)', year: 2026 },
  ],
  resume: {
    headline: 'CSE undergraduate · SDE aspirant',
    summary: 'Strong foundations in data structures, ML and systems. 142+ DSA problems solved, 3 hackathons, 11 contests. Building towards a 2026 SDE-1 placement.',
    experience: [
      { role: 'Software Engineering Intern', org: 'TechNova Solutions', period: 'Summer 2026' },
      { role: 'Research Intern', org: 'Campus AI Lab', period: 'Summer 2025' },
    ],
    education: 'B.Tech CSE · Institute of Technology · CGPA 8.72',
  },
}

/* ------------------------------------------------------------------ */
/* Career profile                                                      */
/* ------------------------------------------------------------------ */
export const careerProfile = {
  id: 'career1',
  studentId,
  careerGoal: 'Software Development Engineer (Product)',
  previousScore: 68,
  targetCompanies: ['Google', 'Microsoft', 'Amazon', 'Flipkart'],
  targetRoleLevel: 'SDE-1 / New Grad',
  targetTimeline: '2026 placements',
  skillGaps: [
    { skill: 'System Design', gap: 45, priority: 'High' },
    { skill: 'DSA under time pressure', gap: 28, priority: 'Medium' },
    { skill: 'Communication / HR rounds', gap: 20, priority: 'Medium' },
  ],
  applications: { submitted: 4, shortlisted: 1, interviews: 1, offers: 0 },
  preparation: {
    dsaProblemsSolved: 142,
    mockInterviews: 3,
    resumeReviews: 2,
    contestsParticipated: 11,
  },
  placementDrive: { name: 'Campus Placement Drive 2026', date: '2026-09-15', eligible: true },
  dimensions: {
    technicalSkills: 76,
    communication: 78,
    problemSolving: 82,
    projects: 74,
    leadership: 68,
    certifications: 72,
  },
  profileStrength: 76,
  placementReadiness: 'Placement Ready',
  recommendedCertifications: [
    { title: 'AWS Cloud Practitioner', effort: '4 weeks', reason: 'Cloud basics unlock most SDE-1 filters' },
    { title: 'Meta Front-End Developer', effort: '6 weeks', reason: 'Product-track roles ask for front-end fundamentals' },
    { title: 'Google Data Analytics', effort: '5 weeks', reason: 'Complements your ML coursework' },
  ],
  recommendedSkills: [
    { skill: 'System Design', level: 55, target: 80, reason: '45% gap — asked in every SDE-1 loop' },
    { skill: 'DSA under time pressure', level: 72, target: 88, reason: '28% gap — solve 20 more timed problems' },
    { skill: 'Communication / HR rounds', level: 80, target: 92, reason: '20% gap — book 2 mock interviews' },
  ],
  careerSuggestions: [
    'Target product-first companies: Google, Microsoft, Amazon, Flipkart.',
    'Complete System Design crash course before the September drive.',
    'Ship 2 more portfolio projects (full-stack) by August end.',
  ],
  roadmap: [
    { phase: 'Now — Aug 15', title: 'Close skill gaps', items: ['System Design crash course', '20 timed DSA problems', '2 mock interviews'], status: 'In Progress' },
    { phase: 'Aug 16 — Sep 10', title: 'Polish profile', items: ['Resume v3 with internship impact', 'GitHub README + project demos', 'Targeted company prep'], status: 'Upcoming' },
    { phase: 'Sep 15 onwards', title: 'Placement drive', items: ['Campus drive interviews', 'Offer negotiation', 'Peer mock loops'], status: 'Upcoming' },
  ],
}
