/**
 * Faculty Intelligence — base pools for recommendations, insights, AI
 * assistant context, dashboard summary inputs and assessment summary.
 * The engine re-ranks / derives from these; values are never hardcoded
 * in pages.
 */

import { masterFacultyProfile } from '../master-profile.js'

export const teachingRecommendationsPool = [
  { id: 'frec1', type: 'grading', priority: 'Critical', title: 'Clear DSA Assignment 4 grading queue', reason: '42 submissions pending · AI pre-graded 21 — approve drafts to finish in 30 min', effort: '30 min', impact: 'High' },
  { id: 'frec2', type: 'intervention', priority: 'Critical', title: 'Outreach to Nikhil Joshi (risk 93)', reason: 'Attendance 74.6% · 2 missed assignments · quiz declining', effort: '15 min', impact: 'High' },
  { id: 'frec3', type: 'teaching', priority: 'High', title: 'Add a CS503 participation warm-up', reason: 'Sec B engagement trails other sections by 8 points', effort: '10 min/class', impact: 'Medium' },
  { id: 'frec4', type: 'assessment', priority: 'High', title: 'Finalize Midsem DSA Paper B (In Review)', reason: 'Blueprint coverage 94% — one CO2 question underweighted', effort: '45 min', impact: 'High' },
  { id: 'frec5', type: 'resource', priority: 'Medium', title: 'Assign graph PYQ pack to Sec A', reason: 'Network flows is the weakest topic (gap 32)', effort: '5 min', impact: 'Medium' },
  { id: 'frec6', type: 'planning', priority: 'Medium', title: 'Schedule lab make-up for Sec C', reason: 'Lab attendance dipped to 91.4% last session', effort: '10 min', impact: 'Medium' },
]

export const teachingInsightsPool = [
  { id: 'fins1', tone: 'positive', title: 'CS501 class average is rising', body: 'W6 → W12 trend +7 pts (74 → 81). The graph-contest practice block is working.' },
  { id: 'fins2', tone: 'neutral', title: 'Evaluation backlog is healthy', body: '96/138 submissions graded on A4 — AI pre-grading is keeping pace with submissions.' },
  { id: 'fins3', tone: 'warning', title: 'CS503 Sec B needs attention', body: 'Attendance 89.7% and participation 80% — lowest across your classes.' },
  { id: 'fins4', tone: 'positive', title: 'AI assistant saved 11.4 hours', body: '148 questions generated, 6 lessons drafted, 312 submissions auto-graded this term.' },
]

export const aiAssistantContext = {
  facultyId: masterFacultyProfile.id,
  profile: {
    name: masterFacultyProfile.fullName,
    designation: masterFacultyProfile.designation,
    department: masterFacultyProfile.department,
  },
  courses: ['CS501 — DSA', 'CS503 — OS', 'CS505 — ML'],
  sections: 6,
  students: 312,
  currentFocus: ['Midsem paper drafts', 'DSA Assignment 4 grading', 'At-risk outreach'],
  recentActivity: 'AI pre-graded 21 submissions overnight · 3 students crossed high-risk',
  preferredTone: 'concise, data-backed',
}

export const facultyDashboardSummaryInputs = {
  kpiDrivers: {
    courses: 3,
    students: 312,
    pendingGrading: 42,
    classAverage: 74.2,
  },
  highlight: 'CS501 trend +7 pts in 6 weeks · AI saved 11.4 hrs',
}

export const assessmentSummaryInputs = {
  papersGenerated: 4,
  examDrafts: 4,
  quizzes: 4,
  questionBankTotal: 1254,
  pyqPapers: 46,
}

/* Past revision / doubt sessions — feed the Teaching Timeline + insights. */
export const revisionSessions = [
  { id: 'rs1', type: 'revision', title: 'Revision class — Graph algorithms sprint', course: 'CS501', date: '2026-08-02', attendees: 132, topic: 'Network flows & shortest paths' },
  { id: 'rs2', type: 'revision', title: 'Doubt session — Synchronisation', course: 'CS503', date: '2026-07-26', attendees: 54, topic: 'Locks, semaphores, monitors' },
]
