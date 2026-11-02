/**
 * Student Intelligence Engine — derived analytics (pure functions).
 * Academic health · strengths/weak areas · academic DNA · exam readiness ·
 * intervention alerts · recommendations · career readiness ·
 * achievement progress · academic journey.
 *
 * All outputs are computed from the base datasets at call time — changing a
 * base dataset automatically changes every derived value (synchronization).
 */

import {
  clamp, round1, avg, weighted, pctOf, computeSubjectMastery,
} from './scores.js'

/* ---------- Academic health ---------- */
export function computeAcademicHealth({
  masterStudentProfile, attendance, academicHealthInputs, academicPerformance,
  consistencyScore, learningBehaviourScore,
}) {
  const attendanceScore = clamp((attendance?.overall ?? 0) / (attendance?.required ?? 75) * 75)
  const cgpa = masterStudentProfile?.cgpa ?? academicPerformance?.currentCGPA ?? null
  const target = academicPerformance?.targetCGPA ?? null
  const performanceScore = (cgpa != null && target) ? clamp((cgpa / target) * 100) : (cgpa != null ? clamp((cgpa / 10) * 100) : 0)

  const balance = Number(academicHealthInputs?.workloadBalance ?? 0)
  const timeliness = Number(academicHealthInputs?.submissionTimeliness ?? 0)
  const workloadScore = clamp(balance * 0.5 + timeliness * 0.5)

  const score = round1(weighted([
    { value: attendanceScore, weight: Number(academicHealthInputs?.attendanceWeight ?? 0.25) },
    { value: performanceScore, weight: Number(academicHealthInputs?.performanceWeight ?? 0.45) },
    { value: consistencyScore, weight: Number(academicHealthInputs?.consistencyWeight ?? 0.2) },
    { value: workloadScore, weight: Number(academicHealthInputs?.workloadWeight ?? 0.1) },
  ]))

  const previous = academicHealthInputs?.previousHealth != null ? Number(academicHealthInputs.previousHealth) : score
  const delta = round1(score - previous)
  const hasEvidence = Boolean((attendance?.overall ?? 0) || cgpa != null || timeliness)

  return {
    score: hasEvidence ? score : 0,
    grade: hasEvidence ? (score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'At Risk' : 'Critical') : 'Building',
    delta: hasEvidence ? delta : 0,
    trend: delta >= 0 ? 'improving' : 'declining',
    factors: [
      { label: 'Attendance health', value: round1(attendanceScore), weight: Number(academicHealthInputs?.attendanceWeight ?? 0.25), note: `${attendance?.overall ?? 0}% vs ${attendance?.required ?? 75}% required` },
      { label: 'Academic performance', value: round1(performanceScore), weight: Number(academicHealthInputs?.performanceWeight ?? 0.45), note: cgpa != null ? `CGPA ${cgpa}${target ? ` vs target ${target}` : ''}` : 'No graded records yet' },
      { label: 'Consistency', value: round1(consistencyScore), weight: Number(academicHealthInputs?.consistencyWeight ?? 0.2), note: 'Attendance + study regularity' },
      { label: 'Workload balance', value: round1(workloadScore), weight: Number(academicHealthInputs?.workloadWeight ?? 0.1), note: `${timeliness}% submissions on time` },
    ],
  }
}

/* ---------- Strength & weak areas ---------- */
export function computeStrengthWeakAreas({ subjects, attendance, quizResults, practiceSessions, academicDnaInputs }) {
  const withMastery = (subjects ?? []).map((s) => ({
    subjectCode: s.code,
    subject: s.name,
    mastery: computeSubjectMastery(s.code, { subjects, attendance, quizResults, practiceSessions, academicDnaInputs }),
    internal: s.internal,
    attendance: s.attendance,
  })).sort((a, b) => b.mastery - a.mastery)

  return {
    strengths: withMastery.slice(0, 3).map((s) => ({
      subjectCode: s.subjectCode, subject: s.subject, mastery: s.mastery,
      reason: s.mastery >= 85 ? 'Consistently strong internals and practice scores.' : 'Above-average mastery with good consistency.',
    })),
    weaknesses: withMastery.slice(-3).reverse().map((s) => ({
      subjectCode: s.subjectCode, subject: s.subject, mastery: s.mastery,
      reason: s.mastery < 70 ? 'Below the 70% mastery threshold — priority for revision.' : 'Lags other subjects; needs focused practice.',
    })),
    ranking: withMastery,
  }
}

/* ---------- Academic DNA (data-only derived vector) ---------- */
export function computeAcademicDna({
  academicDnaInputs, subjects, attendance, quizResults, practiceSessions, attemptSignals = null,
}) {
  const masteryHistory = academicDnaInputs?.masteryHistory ?? []
  const mastery = masteryHistory.map((m) => ({
    subjectCode: m.subjectCode,
    subject: m.subject,
    mastery: computeSubjectMastery(m.subjectCode, { subjects, attendance, quizResults, practiceSessions, academicDnaInputs }),
    trend: m.trend ?? '0',
    consistency: m.consistency ?? 0,
    level: computeSubjectMastery(m.subjectCode, { subjects, attendance, quizResults, practiceSessions, academicDnaInputs }) >= 80
      ? 'Strong'
      : computeSubjectMastery(m.subjectCode, { subjects, attendance, quizResults, practiceSessions, academicDnaInputs }) >= 65
        ? 'Average'
        : 'Weak',
  }))

  const concepts = academicDnaInputs?.conceptSignals ?? []
  const weakConcepts = concepts.filter((c) => (c.mastery ?? 0) < 65).sort((a, b) => a.mastery - b.mastery)
  const strongConcepts = concepts.filter((c) => (c.mastery ?? 0) >= 80).sort((a, b) => b.mastery - a.mastery)

  /* Phase 2 — exam-attempt evidence: the canonical exam-attempt adapter's
     output (buildExamEvidence) is merged into the DNA vector WITHOUT
     replacing any existing derivation. University vs Competitive pools stay
     fully separate; demo attempts are excluded by the caller. */
  const examEvidence = attemptSignals ?? {}

  return {
    mastery,
    strongConcepts: strongConcepts.slice(0, 5).map((c) => `${c.subjectCode} — ${c.concept}`),
    weakConcepts: weakConcepts.slice(0, 6).map((c) => `${c.subjectCode} — ${c.concept}`),
    learningStyle: academicDnaInputs?.learningStyle ?? null,
    retentionCurve: academicDnaInputs?.retentionCurve ?? [],
    errorPatterns: academicDnaInputs?.errorPatterns ?? [],
    /* Exam-attempt evidence pools (Phase 2) — strengths/weaknesses with
       traceable evidence and longitudinal trends. Empty object when no
       manual attempts exist yet. */
    examEvidence,
    summary: weakConcepts[0]
      ? `Learning style: ${academicDnaInputs?.learningStyle ?? 'Building'}. Weakest concepts cluster in ${weakConcepts[0].subjectCode} (${weakConcepts[0].concept}).`
      : 'Building your profile',
  }
}

/* ---------- Exam readiness (UNIFIED — Phase 27.1) ----------
 * One authoritative readiness per context. The orchestration lives in
 * engine/readiness.js (calculateReadiness / buildReadinessIntelligence);
 * this function keeps the legacy `examReadiness` derived key shape for
 * backward compatibility (Success Center dialog) and simply maps the
 * orchestrated university entries — it never recomputes a score.
 */
export function computeExamReadiness({ readiness }) {
  return (readiness?.university ?? []).map((r) => ({
    examId: r.examId,
    title: r.title,
    date: r.date,
    readiness: r.readiness,
    level: r.level,
    factors: r.factors ?? [],
    latestScore: r.previousScore ?? null,
    practiceSessions: r.preparationStatus?.practiceDrills ?? 0,
  }))
}

/* ---------- Intervention alerts ----------
 * Rule-based evaluation over the base datasets. Every alert carries a
 * severity ('critical' | 'warning' | 'advisory'), a UI priority label,
 * the affected subject, a suggested action, an estimated improvement
 * and a status — so the Intervention Center can render differentiated
 * cards (Critical / Medium / Normal) without any hardcoded values.
 */
const SEVERITY_PRIORITY = { critical: 'Critical', warning: 'Medium', advisory: 'Normal' }

export function evaluateInterventions({
  attendance, academicPerformance, assignments, practiceSessions, interventionRules,
  quizResults, academicDnaInputs, examReadiness, today = '2026-08-06',
}) {
  const alerts = []
  const bySubject = attendance?.bySubject ?? []
  const todayTs = new Date(today)

  const push = (a) => alerts.push({
    status: 'Active',
    priority: SEVERITY_PRIORITY[a.severity] ?? 'Normal',
    ...a,
  })

  // rule1: subject attendance below the institution threshold (skip when no records)
  const requiredAtt = attendance?.required ?? 75
  bySubject.filter((s) => s.total > 0 && s.pct < requiredAtt).forEach((s) => {
    const gap = Math.round(s.pct - (attendance?.required ?? 75))
    push({
      id: `int_att_${s.subjectCode}`, ruleId: 'rule1', type: 'attendance',
      severity: s.pct < 85 ? 'warning' : 'advisory',
      title: `Attendance low — ${s.subject}`, reason: `At ${s.pct}% vs ${attendance?.required ?? 75}% required (${gap} pt buffer).`,
      affectedSubject: s.subjectCode, affectedSubjectName: s.subject,
      suggestedAction: 'Attend every class this week and file no leave without prior intimation.',
      estimatedImprovement: '+3 pts buffer by month end',
      related: { subjectCode: s.subjectCode },
    })
  })

  // rule4: assignments at risk (pending with progress < 50% within 3 days)
  ;(assignments ?? []).forEach((a) => {
    if (a.status !== 'Pending') return
    const due = new Date(a.due)
    const daysLeft = Math.ceil((due - todayTs) / 86400000)
    if (daysLeft <= 3 && (a.progress ?? 0) < 50) {
      push({
        id: `int_as_${a.id}`, ruleId: 'rule4', type: 'deadline', severity: 'warning',
        title: `Assignment pending — ${a.title}`, reason: `Due ${a.due.slice(0, 10)} · only ${a.progress}% complete.`,
        affectedSubject: a.courseCode, affectedSubjectName: a.title.split(' — ')[0],
        suggestedAction: 'Block 2 focused sessions before the deadline and submit on time.',
        estimatedImprovement: 'On-time submission protects the 10% weight',
        related: { courseCode: a.courseCode, assignmentId: a.id },
      })
    }
  })

  // rule5: CGPA gap to target > 0.3 — skip when either value is missing
  const cgpa = academicPerformance?.currentCGPA
  const target = academicPerformance?.targetCGPA
  if (cgpa != null && target != null && target - cgpa > 0.3) {
    push({
      id: 'int_cgpa', ruleId: 'rule5', type: 'cgpa', severity: 'warning',
      title: `CGPA gap — ${(target - cgpa).toFixed(2)} to target`, reason: `Current ${cgpa} vs target ${target}.`,
      affectedSubject: 'All', affectedSubjectName: 'Overall',
      suggestedAction: 'Follow the improvement plan: prioritise ToC and Networks internals.',
      estimatedImprovement: `+${Math.min((target - cgpa) * 2, 0.5).toFixed(2)} CGPA this semester`,
      related: {},
    })
  }

  // rule6: exam readiness < 60 with exam within 10 days → CRITICAL
  ;(examReadiness ?? []).forEach((r) => {
    const daysLeft = Math.ceil((new Date(r.date) - todayTs) / 86400000)
    if (r.readiness < 60 && daysLeft <= 10 && daysLeft >= 0) {
      push({
        id: `int_exam_${r.examId}`, ruleId: 'rule6', type: 'exam', severity: 'critical',
        title: `Exam in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — readiness ${r.readiness}%`,
        reason: `${r.title} on ${r.date} · currently "${r.level}".`,
        affectedSubject: r.examId.startsWith('UNI-') ? r.examId.split('-')[2] : 'Mock',
        affectedSubjectName: r.title.split(' — ')[0].replace('Improvement Examination', 'ToC').replace('Supplementary Examination', 'Networks'),
        suggestedAction: 'Follow the AI revision plan: pumping-lemma proofs + 2 mock papers.',
        estimatedImprovement: '+15 pts readiness before the exam',
        related: { examId: r.examId },
      })
    }
  })

  // rule7: quiz accuracy < 75% in any subject
  const quizBySubject = {}
  ;(quizResults ?? []).forEach((q) => {
    if (!q.subjectCode) return
    quizBySubject[q.subjectCode] = quizBySubject[q.subjectCode] ?? []
    quizBySubject[q.subjectCode].push(q.accuracy)
  })
  Object.entries(quizBySubject).forEach(([code, accs]) => {
    const avgAcc = accs.reduce((a, b) => a + b, 0) / accs.length
    if (avgAcc < 75) {
      const name = (subjectsOf(bySubject, code)) ?? code
      push({
        id: `int_quiz_${code}`, ruleId: 'rule7', type: 'quiz', severity: 'warning',
        title: `Poor quiz performance — ${name}`, reason: `Average quiz accuracy ${Math.round(avgAcc)}% (< 75%).`,
        affectedSubject: code, affectedSubjectName: name,
        suggestedAction: 'Complete 2 concept drills in MediXO Mentor before the next quiz.',
        estimatedImprovement: '+8% quiz accuracy in 2 weeks',
        related: { subjectCode: code },
      })
    }
  })

  // rule8: concept mastery < 60
  ;(academicDnaInputs?.conceptSignals ?? []).forEach((c) => {
    if ((c.mastery ?? 100) < 60) {
      push({
        id: `int_concept_${c.subjectCode}_${c.concept}`.replace(/\s+/g, '_'), ruleId: 'rule8', type: 'concept', severity: 'warning',
        title: `Weak in ${c.concept}`, reason: `Concept mastery ${c.mastery}% — below the 60% threshold.`,
        affectedSubject: c.subjectCode, affectedSubjectName: c.subjectCode,
        suggestedAction: 'Add this concept to your revision queue and explain it back to MediXO Mentor.',
        estimatedImprovement: `+${Math.round((60 - c.mastery) / 2)}% mastery in 2 weeks`,
        related: { subjectCode: c.subjectCode },
      })
    }
  })

  // rule9: subject with fewer than 2 practice sessions this term
  const practiceCount = {}
  ;(practiceSessions ?? []).forEach((p) => {
    if (p.subjectCode) practiceCount[p.subjectCode] = (practiceCount[p.subjectCode] ?? 0) + 1
  })
  Object.entries(practiceCount).filter(([, n]) => n < 2).forEach(([code, n]) => {
    const name = (subjectsOf(bySubject, code)) ?? code
    push({
      id: `int_practice_${code}`, ruleId: 'rule9', type: 'practice', severity: 'advisory',
      title: `Low practice frequency — ${name}`, reason: `Only ${n} practice session${n === 1 ? '' : 's'} this term for this subject.`,
      affectedSubject: code, affectedSubjectName: name,
      suggestedAction: 'Complete the starter drill set in MediXO Mentor this week.',
      estimatedImprovement: '+15% concept coverage',
      related: { subjectCode: code },
    })
  })

  return alerts
}

/** Resolve a subject code to its display name from the attendance bySubject list. */
function subjectsOf(bySubject, code) {
  return bySubject.find((s) => s.subjectCode === code)?.subject ?? code
}

/* ---------- AI Daily Brief ---------- */
export function buildDailyBrief({
  profile, attendance, studyStatistics, todaySchedule, assignments,
  universityExams, competitiveExams, academicHealth, recommendations, today = new Date(),
}) {
  const hour = new Date(today).getHours()
  const period = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
  const firstName = profile?.firstName ?? 'Student'

  const nextClass = (todaySchedule ?? [])[0] ?? null
  const pending = (assignments ?? []).filter((a) => a.status === 'Pending' || a.status === 'Upcoming')
    .sort((a, b) => new Date(a.due) - new Date(b.due))[0] ?? null
  const dueDays = pending ? Math.ceil((new Date(pending.due) - new Date(today)) / 86400000) : null
  const topRec = (recommendations ?? [])[0] ?? null
  const nextExam = [...(universityExams ?? []), ...(competitiveExams ?? [])]
    .filter((e) => e.status === 'Scheduled' || e.status === 'Upcoming')
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0] ?? null

  const items = [
    {
      key: 'attendance', label: "Today's attendance", value: `${attendance?.overall ?? 0}%`,
      detail: `${attendance?.buffer ?? 0} pts above the ${attendance?.required ?? 75}% floor`, tone: 'good',
    },
    {
      key: 'class', label: 'Upcoming class', value: nextClass?.title ?? 'No class today',
      detail: nextClass ? `${nextClass.time} · ${nextClass.room}` : 'Free day — perfect for revision', tone: 'info',
    },
    {
      key: 'deadline', label: 'Assignment due', value: pending?.title?.split(' — ')[0] ?? 'Nothing due',
      detail: pending ? (dueDays <= 0 ? 'Due today' : dueDays === 1 ? 'Due tomorrow' : `Due in ${dueDays} days`) : 'All clear', tone: dueDays != null && dueDays <= 1 ? 'warn' : 'good',
    },
    {
      key: 'revision', label: 'Recommended revision', value: topRec?.topic ?? 'Keep practising',
      detail: topRec ? `${topRec.priority} priority · ${topRec.effort}` : '', tone: 'info',
    },
    {
      key: 'health', label: 'Academic health', value: `${academicHealth?.score ?? 0}`,
      detail: academicHealth?.grade ?? '', tone: 'good',
    },
  ]

  const suggestion = topRec
    ? `Start with "${topRec.topic}" — ${topRec.reason.toLowerCase()}. ${nextExam ? `Your next exam is ${nextExam.title} on ${nextExam.date}.` : ''}`
    : 'Keep your streak alive with one 25-minute session today.'

  return {
    greeting: `Good ${period}, ${firstName} 👋`,
    dateLabel: new Date(today).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
    items,
    suggestion,
  }
}

/* ---------- Recent activities (meaningful academic events) ---------- */
export function buildRecentActivities({
  notifications, assignments, examPerformance, achievements, academicHealth, careerReadiness,
}) {
  const events = []

  ;(notifications ?? []).forEach((n) => {
    events.push({ id: `act_nt_${n.id}`, type: n.type, title: n.title, detail: n.detail, date: n.date, icon: 'Bell' })
  })
  ;(assignments ?? []).filter((a) => a.status === 'Graded').forEach((a) => {
    events.push({
      id: `act_as_${a.id}`, type: 'grade', title: `Assignment submitted — ${a.title.split(' — ')[0]}`,
      detail: `Graded ${a.score}/${a.maxScore} (${a.grade}) · ${a.feedback?.slice(0, 60) ?? ''}`, date: a.due, icon: 'FileText',
    })
  })
  ;(examPerformance ?? []).filter((e) => e.status === 'Completed').slice(-4).forEach((e) => {
    events.push({
      id: `act_ep_${e.id}`, type: e.type === 'Competitive' ? 'achievement' : 'grade',
      title: `${e.type === 'Competitive' ? 'Mock test completed' : 'Exam completed'} — ${e.title}`,
      detail: e.percentile ? `${e.pct}% · ${e.percentile} percentile` : `${e.pct}% · ${e.grade}`, date: e.date, icon: 'ClipboardList',
    })
  })
  ;(achievements ?? []).filter((a) => a.status === 'Completed').forEach((a) => {
    events.push({ id: `act_ach_${a.id}`, type: 'achievement', title: `Achievement unlocked — ${a.title}`, detail: a.description, date: a.date, icon: 'Award' })
  })

  if (academicHealth && (academicHealth.delta ?? 0) >= 0) {
    events.push({
      id: 'act_health', type: 'ai', title: 'Academic health improved', detail: `${academicHealth.score} (${academicHealth.grade}) — ${academicHealth.trend}`,
      date: new Date().toISOString().slice(0, 10), icon: 'HeartPulse',
    })
  }
  if (careerReadiness && careerReadiness.delta != null && careerReadiness.delta >= 0) {
    events.push({
      id: 'act_career', type: 'career', title: 'Career readiness improved', detail: `${careerReadiness.score}% — ${careerReadiness.level}`,
      date: new Date().toISOString().slice(0, 10), icon: 'Briefcase',
    })
  }

  return events.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 9)
}

/* ---------- Upcoming deadlines (assignments · exams · quizzes · practicals · projects) ---------- */
export function buildUpcomingDeadlines({
  assignments, universityExams, competitiveExams, projects, today = '2026-08-06',
}) {
  const todayTs = new Date(today)
  const out = []
  const daysLeft = (d) => Math.ceil((new Date(d) - todayTs) / 86400000)
  const priorityOf = (d) => (d <= 1 ? 'Critical' : d <= 3 ? 'High' : d <= 7 ? 'Medium' : 'Low')

  ;(assignments ?? []).filter((a) => a.status === 'Pending' || a.status === 'Upcoming').forEach((a) => {
    const dl = daysLeft(a.due)
    if (dl < 0) return
    out.push({ id: `dl_as_${a.id}`, type: 'assignment', title: a.title, subject: a.courseCode, due: a.due, daysLeft: dl, priority: priorityOf(dl), progress: a.progress ?? 0 })
  })
  ;(universityExams ?? []).filter((e) => e.status === 'Scheduled').forEach((e) => {
    const dl = daysLeft(e.date)
    if (dl < 0) return
    out.push({ id: `dl_ex_${e.id}`, type: 'exam', title: e.title, subject: e.subjectCode ?? 'ALL', due: e.date, daysLeft: dl, priority: priorityOf(dl), progress: 0 })
  })
  ;(competitiveExams ?? []).filter((e) => e.status === 'Scheduled').forEach((e) => {
    const dl = daysLeft(e.date)
    if (dl < 0) return
    out.push({ id: `dl_mk_${e.id}`, type: 'mock', title: e.title, subject: e.subject ?? 'Test series', due: e.date, daysLeft: dl, priority: priorityOf(dl), progress: 0 })
  })
  const assignmentTitles = new Set((assignments ?? []).map((a) => a.title.toLowerCase()))
  ;(projects ?? []).filter((pr) => pr.status === 'In Progress').forEach((pr) => {
    const dl = daysLeft(pr.due)
    if (dl < 0) return
    if (assignmentTitles.has(pr.title.toLowerCase())) return // project already surfaced as an assignment
    out.push({ id: `dl_pr_${pr.id}`, type: 'project', title: pr.title, subject: pr.courseCode, due: pr.due, daysLeft: dl, priority: priorityOf(dl), progress: pr.progress ?? 0 })
  })

  return out.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 8)
}

/* ---------- Recommendations (ranked from base pool) ---------- */
export function generateRecommendations({ recommendations, academicDna, examReadiness, interventions }) {
  const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 }
  const BENEFIT = { Critical: 'High', High: 'High', Medium: 'Medium', Low: 'Low' }
  const TIME = { Critical: '3 days', High: '1 week', Medium: '2 weeks', Low: '1 month' }
  const DIFF = { Critical: 'Hard', High: 'Medium', Medium: 'Medium', Low: 'Easy' }

  return (recommendations ?? [])
    .map((r) => ({ ...r, rank: priorityRank[r.priority] ?? 3 }))
    .sort((a, b) => a.rank - b.rank)
    .map((r, i) => ({
      ...r,
      sequence: i + 1,
      estimatedBenefit: r.impact ?? BENEFIT[r.priority] ?? 'Medium',
      estimatedTime: r.effort ?? TIME[r.priority] ?? '2 weeks',
      difficulty: DIFF[r.priority] ?? 'Medium',
      status: 'Active',
    }))
}

/* ---------- Career readiness ---------- */
export function computeCareerReadiness({ careerProfile, digitalPortfolio, academicDna }) {
  const cp = careerProfile ?? {}
  const portfolio = digitalPortfolio ?? {}

  const skillBase = avg(portfolio.skills ?? [], 'level')
  const gaps = cp.skillGaps ?? []
  const gapPenalty = gaps.reduce((acc, g) => acc + (100 - (g.gap ?? 0)) * 0.05, 0)
  const prepScore = clamp((cp.preparation?.dsaProblemsSolved ?? 0) / 200 * 60 + (cp.preparation?.mockInterviews ?? 0) / 5 * 40)
  const resumeScore = Number(portfolio.resumeScore ?? 0)

  const score = round1(weighted([
    { value: skillBase, weight: 0.4 },
    { value: prepScore, weight: 0.3 },
    { value: resumeScore, weight: 0.2 },
    { value: clamp(gapPenalty * 100 / Math.max(gaps.length, 1)), weight: 0.1 },
  ]))

  const previous = cp.previousScore != null ? Number(cp.previousScore) : score
  const delta = round1(score - previous)

  return {
    score,
    delta,
    trend: delta >= 0 ? 'improving' : 'declining',
    level: score >= 80 ? 'Placement Ready' : score >= 60 ? 'On Track' : score >= 40 ? 'Building' : 'Early Stage',
    skillBase: round1(skillBase),
    gaps: gaps.map((g) => ({ ...g, resolved: 100 - g.gap })),
    nextActions: cp.careerSuggestions ?? [],
    applications: cp.applications ?? {},
    placementDrive: cp.placementDrive ?? null,
    dimensions: cp.dimensions ?? {},
    profileStrength: cp.profileStrength ?? round1(weighted([
      { value: skillBase, weight: 0.5 }, { value: resumeScore, weight: 0.3 },
      { value: Number(portfolio.certifications?.length ?? 0) * 8, weight: 0.2 },
    ])),
    placementReadiness: cp.placementReadiness ?? (score >= 80 ? 'Placement Ready' : score >= 60 ? 'On Track' : 'Building'),
    recommendedCertifications: cp.recommendedCertifications ?? [],
    recommendedSkills: cp.recommendedSkills ?? [],
    careerSuggestions: cp.careerSuggestions ?? [],
    roadmap: cp.roadmap ?? [],
  }
}

/* ---------- Achievement progress ---------- */
export function computeAchievementProgress({ achievements }) {
  const list = achievements ?? []
  const completed = list.filter((a) => a.status === 'Completed')
  const inProgress = list.filter((a) => a.status === 'In Progress')
  const total = list.length

  return {
    completed: completed.length,
    inProgress: inProgress.length,
    total,
    progress: pctOf(completed.length, total),
    completedList: completed,
    inProgressList: inProgress,
  }
}

/* ---------- Portfolio completion ---------- */
export function buildPortfolioCompletion({ digitalPortfolio, achievements, careerReadiness }) {
  const p = digitalPortfolio ?? {}
  const resume = Number(p.resumeScore ?? 0)
  const certs = Math.min(100, (p.certifications?.length ?? 0) * 25)
  const projects = Math.min(100, (p.projects?.length ?? 0) * 18)
  const skills = (p.skills ?? []).length ? Math.round((p.skills.reduce((a, s) => a + s.level, 0) / p.skills.length) * 0.8) : 0
  const profileLinks = (p.profiles?.github ? 50 : 0) + (p.profiles?.linkedin ? 50 : 0)
  const achievementsPct = achievements?.progress ?? 0

  const completion = round1(weighted([
    { value: resume, weight: 0.25 },
    { value: certs, weight: 0.15 },
    { value: projects, weight: 0.15 },
    { value: skills, weight: 0.15 },
    { value: profileLinks, weight: 0.1 },
    { value: achievementsPct, weight: 0.1 },
    { value: careerReadiness?.score ?? 60, weight: 0.1 },
  ]))

  return {
    completion,
    breakdown: [
      { label: 'Resume', value: resume },
      { label: 'Certifications', value: certs },
      { label: 'Projects', value: projects },
      { label: 'Skills', value: skills },
      { label: 'GitHub / LinkedIn', value: profileLinks },
      { label: 'Achievements', value: achievementsPct },
    ],
  }
}

/* ---------- Academic journey (assembled timeline) ---------- */
export function buildAcademicJourney({ academicJourney, notifications, achievements }) {
  const events = (academicJourney ?? []).map((e) => ({ ...e, source: 'journey' }))

  ;(achievements ?? []).filter((a) => a.status === 'Completed').forEach((a) => {
    events.push({
      id: `jv_ach_${a.id}`, studentId: a.studentId, type: 'achievement',
      title: a.title, detail: a.description, date: a.date, icon: a.icon ?? 'Award', source: 'achievements',
    })
  })

  ;(notifications ?? []).slice(0, 4).forEach((n) => {
    events.push({
      id: `jv_nt_${n.id}`, studentId: n.studentId, type: n.type,
      title: n.title, detail: n.detail, date: n.date, icon: 'Bell', source: 'notifications',
    })
  })

  return events.sort((a, b) => (a.date < b.date ? 1 : -1))
}
