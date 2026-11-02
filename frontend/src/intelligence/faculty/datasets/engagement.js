/**
 * Faculty Intelligence — engagement, resources & notifications.
 * Base inputs for student-engagement scoring, teaching resources the
 * faculty can assign, and notifications. All linked to the master profile.
 */

import { masterFacultyProfile } from '../master-profile.js'

export const studentEngagementInputs = {
  id: 'eng_sem5',
  facultyId: masterFacultyProfile.id,
  byCourse: [
    { courseCode: 'CS501', attendance: 94.4, submissionRate: 97, quizParticipation: 96, timeliness: 92, participation: 88 },
    { courseCode: 'CS503', attendance: 89.7, submissionRate: 94, quizParticipation: 90, timeliness: 85, participation: 80 },
  ],
  note: 'CS503 participation trails — mostly Sec B evening lectures.',
}

/*
 * Per-student engagement signals — base inputs for the Student Engagement
 * analytics. Each dimension (0–100) feeds the composite engagement score:
 * participation · attendance behaviour · assignment completion ·
 * quiz participation · learning consistency. Weekly trend is the
 * cohort-level engagement series (W1–W8).
 */
export const studentEngagementScores = {
  id: 'eng_scores_sem5',
  students: [
    { id: 'se1', name: 'Divya Krishnan', roll: '21CS101', course: 'CS501', participation: 96, attendanceBehavior: 98, assignmentCompletion: 99, quizParticipation: 97, consistency: 95, trend: '+2.1' },
    { id: 'se2', name: 'Ishita Gupta', roll: '21CS103', course: 'CS501', participation: 92, attendanceBehavior: 97, assignmentCompletion: 96, quizParticipation: 94, consistency: 93, trend: '+1.4' },
    { id: 'se3', name: 'Kavya Menon', roll: '21CS105', course: 'CS501', participation: 90, attendanceBehavior: 95, assignmentCompletion: 95, quizParticipation: 93, consistency: 92, trend: '+3.0' },
    { id: 'se4', name: 'Ananya Desai', roll: '21CS109', course: 'CS501', participation: 88, attendanceBehavior: 94, assignmentCompletion: 93, quizParticipation: 91, consistency: 90, trend: '+0.8' },
    { id: 'se5', name: 'Meera Nair', roll: '21CS112', course: 'CS503', participation: 89, attendanceBehavior: 93, assignmentCompletion: 92, quizParticipation: 90, consistency: 91, trend: '+1.9' },
    { id: 'se6', name: 'Pooja Reddy', roll: '21CS107', course: 'CS505', participation: 74, attendanceBehavior: 88, assignmentCompletion: 72, quizParticipation: 77, consistency: 78, trend: '+0.6' },
    { id: 'se7', name: 'Rohan Verma', roll: '21CS102', course: 'CS501', participation: 70, attendanceBehavior: 84, assignmentCompletion: 76, quizParticipation: 68, consistency: 74, trend: '-2.4' },
    { id: 'se8', name: 'Vivek Kumar', roll: '21CS110', course: 'CS503', participation: 68, attendanceBehavior: 82, assignmentCompletion: 70, quizParticipation: 66, consistency: 71, trend: '-1.8' },
    { id: 'se9', name: 'Sanjay Patel', roll: '21CS115', course: 'CS501', participation: 66, attendanceBehavior: 80, assignmentCompletion: 71, quizParticipation: 63, consistency: 72, trend: '-3.1' },
    { id: 'se10', name: 'Aditya Singh', roll: '21CS106', course: 'CS505', participation: 60, attendanceBehavior: 79, assignmentCompletion: 65, quizParticipation: 61, consistency: 66, trend: '-2.9' },
    { id: 'se11', name: 'Karan Mehta', roll: '21CS104', course: 'CS501', participation: 62, attendanceBehavior: 78, assignmentCompletion: 64, quizParticipation: 58, consistency: 70, trend: '-4.2' },
    { id: 'se12', name: 'Nikhil Joshi', roll: '21CS108', course: 'CS503', participation: 55, attendanceBehavior: 75, assignmentCompletion: 60, quizParticipation: 52, consistency: 65, trend: '-6.8' },
  ],
  weeklyTrend: [
    { week: 'W1', value: 86 }, { week: 'W2', value: 85 }, { week: 'W3', value: 86 }, { week: 'W4', value: 84 },
    { week: 'W5', value: 85 }, { week: 'W6', value: 83 }, { week: 'W7', value: 84 }, { week: 'W8', value: 84.6 },
  ],
}

export const teachingResources = [
  { id: 'tr1', type: 'Video', title: 'Graph Algorithms — Masterclass (45 min)', course: 'CS501', size: '—', source: 'MediXO library', recommended: true },
  { id: 'tr2', type: 'Notes', title: 'TCP congestion control — traces explained', course: 'CS505', size: '2 pages', source: 'AI generated', recommended: true },
  { id: 'tr3', type: 'PDF', title: 'OS Memory Management — slide deck v3', course: 'CS503', size: '3.4 MB', source: 'Self-authored', recommended: false },
  { id: 'tr4', type: 'Question Bank', title: 'Graphs — 40 PYQs with solutions', course: 'CS501', size: '—', source: 'Dept. bank', recommended: true },
  { id: 'tr5', type: 'Assignment', title: 'SQL Optimization Assignment', course: 'CS505', size: '—', source: 'Self-authored', recommended: false },
]

export const facultyNotifications = [
  { id: 'fn1', type: 'deadline', title: 'Grade DSA Assignment 4 — 42 submissions pending', date: '2026-08-06', read: false, severity: 'high' },
  { id: 'fn2', type: 'alert', title: '3 students crossed high-risk threshold this week', date: '2026-08-05', read: false, severity: 'high' },
  { id: 'fn3', type: 'exam', title: 'Midsem exam drafts due Aug 12', date: '2026-08-04', read: false, severity: 'medium' },
  { id: 'fn4', type: 'system', title: 'AI pre-graded 21 submissions overnight', date: '2026-08-04', read: true, severity: 'low' },
  { id: 'fn5', type: 'milestone', title: 'Class average crossed 80% in CS501', date: '2026-08-03', read: true, severity: 'low' },
]
