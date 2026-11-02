/**
 * Faculty Intelligence — classes, sections, teaching schedule & calendar.
 * Derived from the master faculty profile's assigned classes + the existing
 * faculty timetable, so the schedule is one source of truth.
 */

import { masterFacultyProfile } from '../master-profile.js'

/* Explicit sections for every assigned class (counts match the master profile). */
export const facultySections = masterFacultyProfile.assignedClasses.map((c, i) => ({
  id: `sec_${c.courseCode}_${c.section.replace(' ', '')}`,
  courseCode: c.courseCode,
  courseTitle: courseTitleFor(c.courseCode),
  section: c.section,
  students: c.students,
  batch: 'B.Tech CSE · 2024–28',
  semester: 'Semester 5',
  color: colorFor(c.courseCode),
}))

export function courseTitleFor(code) {
  return {
    CS501: 'Data Structures & Algorithms',
    CS503: 'Operating Systems',
    CS505: 'Machine Learning',
    'CS501-LAB': 'Data Structures & Algorithms Lab',
  }[code] ?? code
}

export function colorFor(code) {
  return { CS501: '#6366f1', CS503: '#f59e0b', CS505: '#8b5cf6', 'CS501-LAB': '#6366f1' }[code] ?? '#64748b'
}

/* Teaching schedule — derived from the existing faculty timetable (single source). */
export const teachingSchedule = [
  { day: 'Monday', slots: [
    { time: '09:00–10:00', courseCode: 'CS501', course: 'CS501 DSA', room: 'LT-201', section: 'Sec A', type: 'Lecture', hours: 1 },
    { time: '11:00–12:00', courseCode: 'CS503', course: 'CS503 OS', room: 'LT-103', section: 'Sec B', type: 'Lecture', hours: 1 },
    { time: '15:00–17:00', courseCode: 'CS501-LAB', course: 'CS501 DSA Lab', room: 'Lab 4', section: 'Sec C', type: 'Lab', hours: 2 },
  ]},
  { day: 'Tuesday', slots: [
    { time: '09:00–10:00', courseCode: 'CS501', course: 'CS501 DSA', room: 'LT-201', section: 'Sec A', type: 'Lecture', hours: 1 },
    { time: '14:00–15:00', courseCode: 'CS503', course: 'CS503 OS', room: 'LT-103', section: 'Sec B', type: 'Lecture', hours: 1 },
    { time: '16:00–17:00', courseCode: null, course: 'Office Hours', room: 'CSE-214', section: 'All', type: 'Office', hours: 1 },
  ]},
  { day: 'Wednesday', slots: [
    { time: '09:00–10:00', courseCode: 'CS505', course: 'CS505 ML', room: 'LT-305', section: 'Sec A', type: 'Lecture', hours: 1 },
    { time: '11:00–12:00', courseCode: 'CS503', course: 'CS503 OS', room: 'LT-103', section: 'Sec B', type: 'Lecture', hours: 1 },
    { time: '15:00–17:00', courseCode: 'CS505', course: 'CS505 ML Lab', room: 'Lab 2', section: 'Sec B', type: 'Lab', hours: 2 },
  ]},
  { day: 'Thursday', slots: [
    { time: '09:00–10:00', courseCode: 'CS501', course: 'CS501 DSA', room: 'LT-201', section: 'Sec A', type: 'Lecture', hours: 1 },
    { time: '11:00–12:00', courseCode: 'CS501', course: 'CS501 DSA', room: 'LT-201', section: 'Sec B', type: 'Lecture', hours: 1 },
    { time: '14:00–15:00', courseCode: 'CS505', course: 'CS505 ML', room: 'LT-305', section: 'Sec B', type: 'Lecture', hours: 1 },
  ]},
  { day: 'Friday', slots: [
    { time: '09:00–10:00', courseCode: 'CS501', course: 'CS501 DSA', room: 'LT-201', section: 'Sec A', type: 'Lecture', hours: 1 },
    { time: '11:00–12:00', courseCode: 'CS505', course: 'CS505 ML', room: 'LT-305', section: 'Sec A', type: 'Lecture', hours: 1 },
    { time: '15:00–16:00', courseCode: null, course: 'Research Lab Meeting', room: 'CSE-301', section: 'PhD', type: 'Meeting', hours: 1 },
  ]},
  { day: 'Saturday', slots: [
    { time: '10:00–12:00', courseCode: null, course: 'AI & Systems Lab — Mentoring', room: 'CSE-301', section: 'Lab team', type: 'Mentoring', hours: 2 },
  ]},
  { day: 'Sunday', slots: [] },
]

/* Weekly teaching calendar (flat, for calendar widgets). */
export const teachingCalendar = teachingSchedule.flatMap((d) =>
  d.slots.map((s, i) => ({
    id: `cal_${d.day}_${i}`,
    day: d.day,
    time: s.time,
    course: s.course,
    courseCode: s.courseCode,
    room: s.room,
    section: s.section,
    type: s.type,
  }))
)

/* Weekly teaching hours — derived from the schedule (lab/meeting = 2h counted). */
export const weeklyTeachingHours = teachingSchedule.reduce(
  (total, d) => total + d.slots.reduce((sum, s) => sum + (s.hours || 1), 0),
  0
)
