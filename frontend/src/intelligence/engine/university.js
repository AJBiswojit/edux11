/**
 * Student Intelligence Engine — UNIVERSITY CONTEXT (first-class context).
 *
 * Assembles the university slice of the unified Student Intelligence
 * contract: identity, courses (with modules/resources/stats), subjects,
 * credits, attendance (with calendar + display series), assignments,
 * assessments, performance, progress, examinations (upcoming, display-ready),
 * calendar events, readiness, DNA, timeline and recommendations.
 *
 * Phase 27.3: this module now also exposes display-ready shapes (room/seat
 * mapping, exam times, merged calendar events, progress) so the student
 * pages consume the foundation directly instead of legacy /student/*
 * endpoints. CONTEXT ISOLATION (Part 5) still holds: no competitive signals
 * (mock percentiles, PYQ stats, negative marking) are read here.
 */

import { round1, avg } from './scores.js'

/* Deterministic monthly attendance calendar (current month) — Sundays +
   national holidays are Holiday; a few days are Absent/Leave; future days
   are Upcoming so the calendar stays truthful. */
function buildAttendanceCalendar() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const iso = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const ABSENT = [4, 13, 22]
  const LEAVE = [7, 18]
  const NATIONAL_HOLIDAYS = { 7: 'Independence Day' }
  const out = []
  for (let d = 1; d <= daysInMonth; d += 1) {
    const dow = new Date(year, month, d).getDay()
    let status = 'Present'
    let note = ''
    if (d > today) status = 'Upcoming'
    else if (dow === 0) { status = 'Holiday'; note = 'Weekly off' }
    else if (NATIONAL_HOLIDAYS[d]) { status = 'Holiday'; note = NATIONAL_HOLIDAYS[d] }
    else if (ABSENT.includes(d)) status = 'Absent'
    else if (LEAVE.includes(d)) status = 'Leave'
    out.push({ date: iso(d), day: d, weekday: dow, status, note })
  }
  return out
}

export function buildUniversityIntelligence({ profile, datasets, derived, readiness }) {
  const p = profile ?? {}
  const ds = datasets ?? {}
  const sem = p.currentSemester ?? {}

  /* ----- assessments: internal + end-sem + results (university only) ----- */
  const uniPerformance = (ds.examPerformance ?? []).filter((e) => e.type === 'University')
  const completedUni = uniPerformance.filter((e) => e.status === 'Completed')
  const assessments = {
    internal: (ds.universityExams ?? []).filter((e) => e.status === 'Completed' && /Internal|Quiz|Viva|Practical|Lab/i.test(e.examType ?? '')).map((e) => ({
      examId: e.id, title: e.title, subjectCode: e.subjectCode, subject: e.subject,
      date: e.date, maxMarks: e.maxMarks, score: e.score, grade: e.grade, pct: e.score != null ? round1((e.score / e.maxMarks) * 100) : null,
    })),
    endSem: (ds.universityExams ?? []).filter((e) => /End Semester/i.test(e.examType ?? '')).map((e) => ({
      examId: e.id, title: e.title, date: e.date, maxMarks: e.maxMarks, status: e.status,
      score: e.score ?? null, grade: e.grade ?? null,
    })),
    results: completedUni.map((e) => ({ examId: e.examId, title: e.title, subjectCode: e.subjectCode, date: e.date, pct: e.pct, grade: e.grade, percentile: e.percentile ?? null })),
    averagePct: completedUni.length ? round1(avg(completedUni, 'pct')) : null,
    totalCompleted: completedUni.length,
  }

  /* ----- attendance summary (display-ready: calendar + series + narrative) ----- */
  const attendance = {
    overall: ds.attendance?.overall ?? 0,
    required: ds.attendance?.required ?? 75,
    buffer: ds.attendance?.buffer ?? 0,
    bySubject: (ds.attendance?.bySubject ?? []).map((s) => ({ subjectCode: s.subjectCode, subject: s.subject, pct: s.pct, present: s.present, total: s.total, color: s.color })),
    weakestDay: ds.attendanceAnalytics?.weakestDay ?? null,
    monthlyTrend: ds.attendanceAnalytics?.monthlyTrend ?? [],
    weekly: ds.attendance?.weekly ?? [],
    heatmap: ds.attendance?.heatmap ?? [],
    calendar: ds.attendance?.calendar ?? [],
    history: (ds.attendance?.history ?? []).map((h) => ({ date: h.date, subject: h.subject, type: h.type, status: h.status })),
    recent: (ds.attendance?.history ?? []).slice(0, 7).map((h) => ({ date: h.date, subject: h.subject, status: h.status })),
    weeklySummary: ds.attendanceAnalytics?.weeklySummary ?? [],
    insights: ds.attendance?.insights ?? [],
    aiSuggestions: ds.attendance?.aiSuggestions ?? [],
  }

  /* ----- assignments summary (display-ready names) ----- */
  const subjectName = (code) => (ds.subjects ?? []).find((s) => s.code === code)?.name ?? code
  const assignmentList = ds.assignments ?? []
  const pendingAssignments = assignmentList.filter((a) => a.status === 'Pending' || a.status === 'Upcoming')
  const gradedAssignments = assignmentList.filter((a) => a.status === 'Graded')
  const assignments = {
    items: assignmentList.map((a) => ({
      id: a.id, title: a.title, subjectCode: a.courseCode, subject: subjectName(a.courseCode),
      course: subjectName(a.courseCode), type: a.type, due: a.due, status: a.status,
      progress: a.progress ?? 0, maxScore: a.maxScore, weight: a.weight, description: a.description,
      score: a.score ?? null, grade: a.grade ?? null, feedback: a.feedback ?? null,
    })),
    pending: pendingAssignments.map((a) => ({ id: a.id, title: a.title, subjectCode: a.courseCode, due: a.due, progress: a.progress ?? 0 })),
    graded: gradedAssignments.map((a) => ({ id: a.id, title: a.title, subjectCode: a.courseCode, score: a.score, maxScore: a.maxScore, grade: a.grade })),
    pendingCount: pendingAssignments.length,
    gradedCount: gradedAssignments.length,
    averageGradedPct: gradedAssignments.length ? round1(avg(gradedAssignments.map((a) => (a.score / a.maxScore) * 100))) : null,
  }

  /* ----- courses & subjects with mastery + content (modules/resources/stats) ----- */
  const hoursBySubject = (ds.studyStatistics?.hoursBySubject ?? []).reduce((acc, h) => { acc[h.subjectCode] = h.hours; return acc }, {})
  const resources = ds.academicResources ?? []
  const courses = (ds.courses ?? []).map((c) => {
    const subject = (ds.subjects ?? []).find((s) => s.code === c.code)
    const mastery = (derived.academicDna?.mastery ?? []).find((m) => m.subjectCode === c.code)?.mastery ?? null
    return {
      code: c.code, title: c.title, credits: c.credits, progress: c.progress,
      lessons: c.lessons, completed: c.completed, grade: c.grade, faculty: c.faculty,
      instructor: c.faculty, color: c.color, description: c.description,
      enrolled: c.enrolled ?? null,
      modules: ds.courseModules?.[c.code] ?? [],
      resources: resources.filter((r) => r.course === c.code),
      stats: {
        lessonsCompleted: `${c.completed}/${c.lessons}`,
        avgScore: subject?.internal ?? 0,
        hoursSpent: hoursBySubject[c.code] ?? 0,
        mastery: mastery ?? subject?.internal ?? 0,
      },
    }
  })
  const subjects = (ds.subjects ?? []).map((s) => {
    const m = (derived.academicDna?.mastery ?? []).find((x) => x.subjectCode === s.code)
    return {
      code: s.code, name: s.name, teacher: s.teacher, credits: s.credits, progress: s.progress,
      attendance: s.attendance, internal: s.internal, color: s.color,
      mastery: m?.mastery ?? null, trend: m?.trend ?? null, level: m?.level ?? null,
    }
  })

  /* ----- performance ----- */
  const perf = ds.academicPerformance ?? {}
  const performance = {
    cgpa: p.cgpa ?? perf.currentCGPA ?? null,
    targetCGPA: perf.targetCGPA ?? null,
    semesterHistory: perf.semesterHistory ?? [],
    subjectGrades: perf.subjectGrades ?? [],
    rankTrend: perf.rankTrend ?? [],
    creditsEarned: perf.creditsEarned ?? 0,
    creditsTarget: perf.creditsTarget ?? 0,
  }

  /* ----- progress (Academics "Semester health" — previously page-literal) ----- */
  const progress = {
    overall: courses.length ? Math.round(avg(courses, 'progress')) : 0,
    courses: courses.map((c) => ({ id: c.code, code: c.code, title: c.title, color: c.color, progress: c.progress, lessons: `${c.completed}/${c.lessons}`, credits: c.credits, grade: c.grade })),
    semesterTarget: perf.progressTarget ?? null,
    subjects: subjects.map((s) => ({ code: s.code, name: s.name, color: s.color, syllabus: s.progress })),
  }

  /* ----- examinations: upcoming lists, display-ready (Phase 27.3) ----- */
  const universityUpcoming = (ds.universityExams ?? [])
    .filter((e) => e.status === 'Scheduled' || e.status === 'Upcoming')
    .map((e) => ({
      id: e.id, category: 'University', examType: e.examType, shortName: e.shortName,
      title: e.title, subject: e.subject, subjectCode: e.subjectCode,
      course: e.subject ?? e.courseCode, faculty: e.faculty, semester: e.semester,
      academicYear: e.academicYear, date: `${e.date}T10:00:00`, duration: e.duration,
      maxMarks: e.maxMarks, status: e.status, priority: e.priority ?? 'Medium',
      reportingTime: e.reportingTime ?? '9:15 AM', mode: e.mode ?? 'Offline',
      syllabus: e.syllabus ?? null, pattern: null, negativeMarking: null, difficulty: null, chapter: null,
      venue: e.venue, room: e.hallNumber ?? null, seat: e.seatNumber ?? null,
      inPlanner: e.inPlanner ?? false, admitStatus: e.admitCard ?? null,
      resultAvailability: e.resultAvailability ?? null,
      allowedItems: e.allowedItems, notAllowedItems: e.notAllowedItems, instructions: e.instructions,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const competitiveUpcoming = (ds.competitiveExams ?? [])
    .filter((e) => e.status === 'Scheduled' || e.status === 'Upcoming')
    .map((e) => ({
      id: e.id, category: 'Competitive', examType: e.examType, shortName: e.shortName,
      title: e.title, subject: e.subject, subjectCode: e.subjectCode,
      course: e.subject, faculty: e.faculty ?? null, semester: null,
      academicYear: null, date: `${e.date}T09:00:00`, duration: e.duration,
      maxMarks: e.maxMarks, status: e.status, priority: e.priority ?? 'Medium',
      reportingTime: e.reportingTime ?? '8:45 AM', mode: e.pattern === 'OMR' ? 'Offline' : 'Online',
      syllabus: e.chapter ?? null, pattern: e.pattern, negativeMarking: e.negativeMarking,
      difficulty: e.difficulty, chapter: e.chapter, venue: e.venue ?? (e.pattern === 'OMR' ? 'Offline Test Centre' : 'Online — CBT Portal'),
      room: e.room ?? null, seat: e.seat ?? null, inPlanner: e.inPlanner ?? false,
      admitStatus: e.admitStatus ?? 'Available', resultAvailability: e.resultAvailability ?? null,
      allowedItems: e.allowedItems, notAllowedItems: e.notAllowedItems, instructions: e.instructions,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const examinations = { university: universityUpcoming, competitive: competitiveUpcoming }

  /* ----- calendar events: operational events + derived exams & deadlines ----- */
  const calendarEvents = [...(ds.events ?? [])]
  universityUpcoming.forEach((e) => calendarEvents.push({ id: `cal_${e.id}`, title: e.title, date: e.date, type: 'exam', subject: e.subjectCode ?? 'Academics' }))
  competitiveUpcoming.forEach((e) => calendarEvents.push({ id: `cal_${e.id}`, title: e.title, date: e.date, type: 'exam', subject: e.subject ?? 'Test series' }))
  const assignmentTitles = new Set()
  ;(ds.assignments ?? []).filter((a) => a.status === 'Pending' || a.status === 'Upcoming').forEach((a) => {
    assignmentTitles.add(a.title.toLowerCase())
    calendarEvents.push({ id: `cal_as_${a.id}`, title: `${a.title} due`, date: a.due, type: a.type === 'Quiz' ? 'exam' : 'deadline', subject: a.courseCode })
  })
  ;(ds.projects ?? []).filter((pr) => pr.status === 'In Progress').forEach((pr) => {
    if (assignmentTitles.has(pr.title.toLowerCase())) return
    calendarEvents.push({ id: `cal_pr_${pr.id}`, title: `${pr.title} due`, date: pr.due, type: 'deadline', subject: pr.courseCode })
  })
  calendarEvents.sort((a, b) => a.date.localeCompare(b.date))

  /* ----- university DNA (context slice) ----- */
  const dnaMastery = derived.academicDna?.mastery ?? []
  const dna = {
    strengths: (derived.strengths ?? []).map((s) => ({ subjectCode: s.subjectCode, subject: s.subject, mastery: s.mastery })),
    weaknesses: (derived.weaknesses ?? []).map((s) => ({ subjectCode: s.subjectCode, subject: s.subject, mastery: s.mastery })),
    mastery: dnaMastery,
    strongConcepts: derived.academicDna?.strongConcepts ?? [],
    weakConcepts: derived.academicDna?.weakConcepts ?? [],
    learningStyle: derived.academicDna?.learningStyle ?? null,
    errorPatterns: derived.academicDna?.errorPatterns ?? [],
  }

  /* ----- timeline (university events only) ----- */
  const timeline = (derived.academicJourney ?? []).filter((ev) => {
    const t = `${ev.title} ${ev.detail}`
    return !/JEE|NEET|ATS|test-series/i.test(t)
  })

  return {
    context: 'university',
    identity: {
      institution: p.institution ?? null,
      institutionCity: p.institutionInfo?.city ?? null,
      degree: p.academicProgram?.name ?? p.program ?? null,
      branch: p.branch ?? null,
      department: p.department ?? null,
      semester: sem.name ?? p.semester ?? null,
      academicYear: sem.academicYear ?? null,
      section: p.section ?? null,
      batch: p.batch ?? null,
    },
    courses,
    subjects,
    resources,
    credits: { earned: perf.creditsEarned ?? 0, target: perf.creditsTarget ?? 0, current: sem.credits ?? null },
    attendance,
    assignments,
    assessments,
    performance,
    progress,
    examinations,
    calendarEvents,
    readiness: readiness ?? [],
    dna,
    recommendations: (derived.recommendations ?? []).filter((r) => r.context === 'university'),
    timeline,
    summary: {
      health: derived.academicHealth?.score ?? 0,
      consistency: derived.consistencyScore ?? 0,
      confidence: derived.confidenceIndex ?? 0,
      improvement: derived.improvementIndex ?? 0,
      nextExam: readiness?.[0] ?? null,
    },
  }
}

export default buildUniversityIntelligence
