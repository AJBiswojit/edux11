/**
 * Student Intelligence — operational calendar events (DATA ONLY).
 * Non-academic / schedule events (classes, labs, club & career events,
 * academic announcements). Exam and deadline events are NOT stored here —
 * the university engine derives them from universityExams,
 * competitiveExams, assignments and projects so the calendar always agrees
 * with the Examinations page and the assignment tracker.
 */

export const events = [
  { id: 'ev1', title: 'DSA Lecture — Network Flows', date: '2026-08-03T09:00:00', end: '2026-08-03T10:00:00', type: 'class', subject: 'CS501' },
  { id: 'ev2', title: 'ML Lab — Model evaluation', date: '2026-08-03T11:00:00', end: '2026-08-03T13:00:00', type: 'lab', subject: 'CS505' },
  { id: 'ev7', title: 'ToC Tutorial — Pumping lemma', date: '2026-08-05T10:00:00', type: 'class', subject: 'CS506' },
  { id: 'ev10', title: 'OS Lecture — Virtual memory', date: '2026-08-04T09:00:00', type: 'class', subject: 'CS503' },
  { id: 'ev4', title: 'Hackathon — Smart Campus', date: '2026-08-08T09:00:00', end: '2026-08-09T18:00:00', type: 'event', subject: 'Club' },
  { id: 'ev8', title: 'Coding Contest — CodeChef Starters', date: '2026-08-06T20:00:00', type: 'event', subject: 'Club' },
  { id: 'ev9', title: 'Career Talk — Google engineers', date: '2026-08-12T17:00:00', type: 'event', subject: 'Career' },
  { id: 'ev11', title: 'Midsem timetable release', date: '2026-08-15T09:00:00', type: 'event', subject: 'Academics' },
  { id: 'ev12', title: 'Mock Interview — Technical round', date: '2026-08-10T16:00:00', type: 'event', subject: 'Career' },
]

export default { events }
