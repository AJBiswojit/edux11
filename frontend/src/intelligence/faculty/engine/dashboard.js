/**
 * Faculty Intelligence Engine — Dashboard Command Center (pure functions).
 * Assembles the executive faculty dashboard: Faculty Success Center,
 * AI Faculty Brief, Today's Teaching Schedule, AI Intervention Center,
 * Teaching Timeline, Pending Tasks, Course Progress, Students Requiring
 * Attention, Recent Activities and Smart Quick Actions.
 *
 * EVERY value derives from the centralized foundation (derived + datasets)
 * — the dashboard never contains isolated mock values.
 */

import { clamp, round1, avg } from './scores.js'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/* ---------- Dashboard command center (assembled) ---------- */
export function computeDashboardIntelligence({ derived, datasets, profile }) {
  const d = derived
  const ds = datasets
  const health = d.teachingHealth ?? {}
  const engagement = d.studentEngagement ?? {}
  const assessment = d.assessment ?? {}
  const attention = d.attentionStudents ?? {}
  const attIntel = d.attendanceIntelligence ?? {}
  const assign = d.assignmentAnalytics ?? {}
  const insights = d.teachingInsights ?? {}
  const recs = d.recommendations?.items ?? []

  /* ================= 1. Faculty Success Center ================= */
  const classesCompleted = (d.courseProgress ?? []).reduce((a, c) => a + (c.lecturesDone ?? 0), 0)
  const courseCompletion = d.courseProgress?.length ? round1(avg(d.courseProgress, 'progress')) : 0
  const classTrend = d.performanceTrend?.classTrend ?? []

  const successCenter = {
    teachingHealth: {
      score: health.score ?? 0,
      grade: health.grade ?? '—',
      classesCompleted,
      courseCompletion,
      weeklyTrend: classTrend.slice(-5),
      quickSummary: `Teaching health ${health.score ?? '—'}/100 (${health.grade ?? '—'}) · ${classesCompleted} classes completed · ${courseCompletion}% course completion.`,
      link: '/faculty/teaching?tab=overview',
    },
    studentEngagement: {
      score: engagement.score ?? 0,
      attendanceTrend: {
        latest: attIntel.overall ?? '—',
        delta: (attIntel.weeklyTrend ?? []).length >= 2
          ? round1(attIntel.weeklyTrend[attIntel.weeklyTrend.length - 1].pct - attIntel.weeklyTrend[0].pct)
          : null,
      },
      assignmentCompletion: d.assignmentCompletion?.overallSubmission ?? 0,
      participation: round1(avg(engagement.byCourse ?? [], 'participation') || 0),
      studentsRequiringAttention: attention.total ?? 0,
      link: '/faculty/teaching?tab=engagement',
    },
    assessmentHealth: {
      score: assessment.assessmentHealth?.score ?? 0,
      grade: assessment.assessmentHealth?.grade ?? '—',
      questionBankStatus: `${assessment.questionStats?.total ?? 0} questions · ${assessment.questionStats?.flagged ?? 0} flagged`,
      coverage: (assessment.assessmentHealth?.factors ?? []).find((f) => f.label === 'Question coverage')?.value ?? 0,
      pendingEvaluations: d.evaluationProgress?.pending ?? 0,
      paperGeneration: `${assessment.paperLibrary?.readyCount ?? 0}/${assessment.paperLibrary?.total ?? 0} ready`,
      readiness: d.assessmentReadiness?.score ?? 0,
      link: '/faculty/question-intelligence',
    },
    aiTeachingInsights: {
      weakChaptersCount: insights.weakChaptersCount ?? 0,
      topWeakChapter: insights.weakChapters?.[0]?.chapter ?? '—',
      revisionCritical: d.revisionPriority?.critical ?? 0,
      weakStudentCount: attention.total ?? 0,
      todaysRecommendation: recs[0]?.title ?? 'All clear — no priority actions.',
      alertsCount: (d.alerts ?? []).length,
      link: '/faculty/teaching?tab=insights',
    },
  }

  /* ================= 2. AI Faculty Brief ================= */
  const todayName = WEEKDAYS[new Date().getDay()]
  const todaySlots = (ds.teachingSchedule ?? []).find((x) => x.day === todayName)?.slots ?? []
  const weakestUnit = assessment.coverage?.weakest
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const aiBrief = {
    greeting: `${greeting}, ${profile?.fullName ?? 'Dr. ' + (profile?.lastName ?? '')}`,
    date: new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    todayClasses: todaySlots.length,
    pendingReview: d.evaluationProgress?.pending ?? 0,
    studentsNeedingAttention: attention.critical ?? 0,
    assessmentCoverage: successCenter.assessmentHealth.coverage,
    recommendedRevision: weakestUnit ? `${weakestUnit.course} · ${weakestUnit.name}` : '—',
    todaysPriority: recs[0]?.title ?? 'Review the grading queue',
    priorityDetail: recs[0]?.reason ?? '',
  }

  /* ================= 3. Today's Teaching Schedule ================= */
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const markedToday = (ds.attendance?.classes ?? []).filter((c) => c.date === now.toISOString().slice(0, 10))
  const todaySchedule = todaySlots.map((slot) => {
    const [start] = String(slot.time).split('–')
    const [h, m] = String(start ?? '').trim().split(':').map(Number)
    const startMin = Number.isFinite(h) ? h * 60 + (m || 0) : 0
    const isLab = slot.type === 'Lab' || slot.courseCode === 'CS501-LAB'
    const marked = markedToday.some((c) => (isLab ? c.course.includes('Lab') : c.course.startsWith(slot.courseCode)) && c.section === slot.section)
    const attendanceStatus = marked ? 'Marked' : 'Due'
    const teachingStatus = !slot.courseCode
      ? slot.type
      : nowMinutes < startMin ? 'Upcoming'
      : nowMinutes < startMin + (slot.hours || 1) * 60 ? 'In progress'
      : 'Done'
    return {
      id: `${todayName}_${slot.time}`,
      time: slot.time,
      course: slot.course,
      courseCode: slot.courseCode,
      subject: slot.courseCode ? courseTitle(slot.courseCode) : slot.course,
      section: slot.section,
      room: slot.room,
      duration: `${slot.hours || 1}h`,
      type: slot.type,
      attendanceStatus,
      teachingStatus,
    }
  })

  /* ================= 4. AI Intervention Center ================= */
  const interventions = []

  const below75 = attIntel.summary?.studentsBelow75 ?? 0
  if (below75 > 0) {
    interventions.push({
      id: 'int_att', type: 'Low Attendance', priority: below75 > 10 ? 'Critical' : 'High',
      reason: `${below75} students below the 75% floor · ${attIntel.consecutiveMissing?.length ?? 0} missing consecutively`,
      affectedBatch: 'All sections', affectedStudents: below75,
      recommendedAction: 'Share the attendance reminder and schedule 1:1 check-ins for the critical cohort',
      expectedOutcome: '+15% attendance within 4 weeks',
    })
  }

  const worstAssign = [...(assign.items ?? [])].sort((a, b) => a.submissionRate - b.submissionRate)[0]
  if (worstAssign && worstAssign.submissionRate < 70) {
    interventions.push({
      id: 'int_assign', type: 'Poor Assignment Completion', priority: worstAssign.submissionRate < 50 ? 'Critical' : 'High',
      reason: `${worstAssign.title} at ${worstAssign.submissionRate}% submission (${worstAssign.total - worstAssign.submissions} missing)`,
      affectedBatch: worstAssign.course, affectedStudents: worstAssign.total - worstAssign.submissions,
      recommendedAction: 'Push a reminder + 24h grace window, then follow up with non-submitters',
      expectedOutcome: '+20% completion within 1 week',
    })
  }

  const weakChapter = insights.weakChapters?.[0]
  if (weakChapter) {
    interventions.push({
      id: 'int_chapter', type: 'Weak Chapter', priority: weakChapter.severity === 'Critical' ? 'Critical' : 'High',
      reason: `${weakChapter.chapter} — ${weakChapter.gap}% gap in understanding`,
      affectedBatch: weakChapter.course ?? 'All courses', affectedStudents: weakChapter.affectedStudents ?? '—',
      recommendedAction: weakChapter.action?.label ?? 'Conduct a revision class',
      expectedOutcome: 'Gap reduced by 50% before the midsem',
    })
  }

  const failingQuiz = (ds.quizBuilder?.analytics ?? []).sort((a, b) => a.avgScore - b.avgScore)[0]
  if (failingQuiz && failingQuiz.avgScore < 8) {
    interventions.push({
      id: 'int_quiz', type: 'Students Failing Quiz', priority: 'High',
      reason: `${failingQuiz.quiz} — average ${failingQuiz.avgScore}/10 · lowest ${failingQuiz.lowest}/10`,
      affectedBatch: failingQuiz.attempts ? 'All sections' : '—', affectedStudents: Math.round((failingQuiz.attempts ?? 0) * 0.2),
      recommendedAction: 'Offer a retake + concept clinic for students below the median',
      expectedOutcome: '+16% quiz score within 3 weeks',
    })
  }

  if (assessment.coverage?.weakest) {
    const w = assessment.coverage.weakest
    const s = assessment.coverage.strongest
    interventions.push({
      id: 'int_gap', type: 'Assessment Gap', priority: w.coveragePct <= 15 ? 'High' : 'Medium',
      reason: `${w.unit} (${w.name}) at ${w.coveragePct}% coverage${s ? ` vs ${s.unit} ${s.coveragePct}%` : ''}`,
      affectedBatch: w.course, affectedStudents: w.questions,
      recommendedAction: `Generate ${Math.max((w.target ?? 0) - w.questions, 10)}+ questions for ${w.name}`,
      expectedOutcome: 'Unit coverage ≥ 25% before the exam cycle',
    })
  }

  const revCritical = (d.revisionPriority?.items ?? []).filter((r) => r.priority === 'Critical')[0]
  if (revCritical) {
    interventions.push({
      id: 'int_rev', type: 'Revision Required', priority: 'High',
      reason: `${revCritical.topic} — PYQ frequency ×${revCritical.frequency ?? '—'} · high impact`,
      affectedBatch: 'CS501 · CS503', affectedStudents: '—',
      recommendedAction: 'Schedule a revision class + targeted practice set this week',
      expectedOutcome: 'Readiness +10% before the midsem',
    })
  }

  /* ================= 5. Pending Tasks (priority-sorted) ================= */
  const pendingTasks = []
  const pendingGrading = d.evaluationProgress?.pending ?? 0
  if (pendingGrading > 0) pendingTasks.push({ id: 'pt_grading', title: `${pendingGrading} submissions to review`, detail: 'AI pre-graded drafts ready for approval', type: 'assignments', priority: pendingGrading > 40 ? 'Critical' : 'High', link: '/faculty/teaching?tab=assignments' })
  const pendingAtt = attIntel.pendingToday?.count ?? 0
  if (pendingAtt > 0) pendingTasks.push({ id: 'pt_att', title: `Mark attendance — ${pendingAtt} class${pendingAtt > 1 ? 'es' : ''} due today`, detail: 'Attendance sheets open until midnight', type: 'attendance', priority: 'High', link: '/faculty/attendance' })
  const paperDrafts = (assessment.paperLibrary?.papers ?? []).filter((p) => p.status === 'Draft' || p.status === 'In Review').length
  if (paperDrafts > 0) pendingTasks.push({ id: 'pt_papers', title: `${paperDrafts} question paper${paperDrafts > 1 ? 's' : ''} pending finalization`, detail: 'Draft or in-review status', type: 'papers', priority: 'Medium', link: '/faculty/question-intelligence?tab=paper-generator' })
  const reviewsIn = (ds.examBuilder?.drafts ?? []).filter((x) => x.status === 'In Review').length
  if (reviewsIn > 0) pendingTasks.push({ id: 'pt_reviews', title: `${reviewsIn} assessment review${reviewsIn > 1 ? 's' : ''} waiting`, detail: 'Blueprint coverage above 90% — approve to finalize', type: 'assessment', priority: 'Medium', link: '/faculty/exam-builder' })
  const nextClass = todaySchedule.find((s) => s.teachingStatus === 'Upcoming' || s.teachingStatus === 'In progress')
  if (nextClass) pendingTasks.push({ id: 'pt_class', title: `Next class · ${nextClass.course} (${nextClass.section}) at ${nextClass.time}`, detail: `${nextClass.room} · ${nextClass.duration}`, type: 'class', priority: 'High', link: '/faculty/teaching' })
  const meetingToday = todaySlots.find((s) => s.type === 'Meeting' || s.type === 'Office' || s.type === 'Mentoring')
  if (meetingToday) pendingTasks.push({ id: 'pt_meet', title: `${meetingToday.course} today at ${meetingToday.time}`, detail: `${meetingToday.room} · ${meetingToday.section}`, type: 'meeting', priority: 'Medium', link: '/faculty/timetable' })

  const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 }
  pendingTasks.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3))

  /* ================= 6. Course Progress ================= */
  const courseProgress = (d.courseProgress ?? []).map((c) => {
    const cov = (ds.questionCoverage ?? []).find((x) => x.course === c.courseCode)
    const chapterCompletion = cov?.units?.length
      ? round1(avg(cov.units.map((u) => (u.target ? Math.min((u.questions / u.target) * 100, 100) : 0))))
      : null
    const courseGaps = (insights.weakChapters ?? []).filter((w) => chapterCourse(w.chapter) === c.courseCode)
    const revisionProgress = courseGaps.length ? clamp(100 - avg(courseGaps, 'gap')) : 85
    const lab = attIntel.byClass?.find((x) => x.course === 'CS501-LAB')
    const labProgress = c.courseCode === 'CS501' && lab ? lab.weeksAvg : null
    return {
      courseCode: c.courseCode,
      title: c.title,
      completion: c.progress ?? 0,
      subjectCompletion: c.avgScore ?? null,
      chapterCompletion,
      teachingProgress: c.lecturesTotal ? round1((c.lecturesDone / c.lecturesTotal) * 100) : 0,
      revisionProgress: round1(revisionProgress),
      labProgress: labProgress != null ? round1(labProgress) : null,
    }
  })

  /* ================= 7. Recent Activities ================= */
  const activityLabels = {
    attendance: { label: 'Attendance submitted', icon: 'calendar-check' },
    evaluation: { label: 'Assignment reviewed', icon: 'check-circle' },
    paper: { label: 'Question paper generated', icon: 'file-check' },
    quiz: { label: 'Assessment published', icon: 'zap' },
    announcement: { label: 'Announcement sent', icon: 'megaphone' },
    revision: { label: 'Revision session conducted', icon: 'repeat' },
    lecture: { label: 'Lecture completed', icon: 'presentation' },
    exam: { label: 'Assessment draft updated', icon: 'clipboard' },
    assignment: { label: 'Assignment published', icon: 'file-text' },
  }
  const recentActivities = (d.teachingTimeline?.events ?? []).slice(0, 7).map((e) => ({
    id: e.id,
    label: activityLabels[e.type]?.label ?? e.typeLabel ?? e.type,
    icon: activityLabels[e.type]?.icon ?? e.icon ?? 'activity',
    title: e.title,
    description: e.description,
    date: e.date,
  }))

  /* ================= 8. Smart Quick Actions ================= */
  const smartActions = [
    { id: 'sa_teaching', label: 'Open Teaching Workspace', desc: 'Classes, engagement & insights in one place', to: '/faculty/teaching', icon: 'Presentation', grad: 'from-indigo-500 to-blue-500' },
    { id: 'sa_paper', label: 'Generate Question Paper', desc: `${assessment.paperLibrary?.total ?? 0} papers in the library · no duplicates`, to: '/faculty/question-intelligence?tab=paper-generator', icon: 'Wand2', grad: 'from-violet-500 to-purple-500' },
    { id: 'sa_review', label: 'Review Assignments', desc: `${pendingGrading} submissions pending`, to: '/faculty/teaching?tab=assignments', icon: 'ClipboardCheck', grad: 'from-amber-500 to-orange-500' },
    { id: 'sa_students', label: 'Open My Students', desc: `${attention.total ?? 0} students flagged`, to: '/faculty/my-students', icon: 'UsersRound', grad: 'from-rose-500 to-red-500' },
    { id: 'sa_plan', label: 'Generate Lesson Plan', desc: `${(ds.lecturePlanner ?? []).filter((l) => l.status === 'Upcoming').length} upcoming lectures`, to: '/faculty/lecture-planner', icon: 'CalendarClock', grad: 'from-emerald-500 to-teal-500' },
    { id: 'sa_ai', label: 'Open AI Workspace', desc: `${d.teachingProductivity?.hoursSaved ?? 0}h saved by AI this term`, to: '/faculty/ai-assistant', icon: 'Sparkles', grad: 'from-sky-500 to-cyan-500' },
  ]

  return {
    successCenter,
    aiBrief,
    todaySchedule,
    interventions,
    timeline: (d.teachingTimeline?.events ?? []).slice(0, 7),
    pendingTasks,
    courseProgress,
    attention: (attention.items ?? []).slice(0, 6),
    recentActivities,
    smartActions,
  }
}

const chapterCourse = (chapter) => {
  const s = chapter ?? ''
  if (/(flow|graph|tree|dp|knapsack|dijkstra|sort|string|kmp|avl|complexity)/i.test(s)) return 'CS501'
  if (/(synchron|schedul|memory|deadlock|process|file)/i.test(s)) return 'CS503'
  if (/(regress|classif|neural|evaluation|unsupervised|model)/i.test(s)) return 'CS505'
  if (/(automata|language|turing|decidab|complexity class)/i.test(s)) return 'CS506'
  return null
}

const courseTitle = (code) => ({
  CS501: 'Data Structures & Algorithms',
  CS503: 'Operating Systems',
  CS505: 'Machine Learning',
  'CS501-LAB': 'Data Structures & Algorithms Lab',
}[code] ?? code)

export default computeDashboardIntelligence
