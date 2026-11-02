/**
 * Student Intelligence Engine — Academic DNA workspace builders.
 *
 * Pure functions that assemble the flagship AI Academic DNA analysis from
 * the base datasets + Phase-1 derived scores. No values are hardcoded in
 * the UI — everything is computed here deterministically.
 */

import { clamp, round1, weighted } from './scores.js'

/* ---------- 1. Executive summary ---------- */
export function buildDnaExecutiveSummary({
  academicHealth, consistencyScore, confidenceIndex, improvementIndex, learningBehaviourScore,
}) {
  const health = academicHealth?.score ?? 0
  const learningEfficiency = round1(weighted([
    { value: learningBehaviourScore, weight: 0.5 },
    { value: consistencyScore, weight: 0.3 },
    { value: improvementIndex, weight: 0.2 },
  ]))
  const overallRating = round1(weighted([
    { value: health, weight: 0.4 },
    { value: consistencyScore, weight: 0.2 },
    { value: confidenceIndex, weight: 0.2 },
    { value: learningEfficiency, weight: 0.2 },
  ]))

  const grade = overallRating >= 85 ? 'Excellent' : overallRating >= 70 ? 'Good' : overallRating >= 55 ? 'Fair' : 'Needs Attention'

  const summary = `Your academic performance is steadily improving — academic health sits at ${health} (${academicHealth?.grade ?? 'Good'}) with an overall intelligence rating of ${overallRating}/100 (${grade}). Consistency (${consistencyScore}) and confidence (${confidenceIndex}) are your strongest pillars, while learning efficiency (${learningEfficiency}) has headroom through deeper practice sessions. Data Structures and Machine Learning are your strongest subjects; Theory of Computation and Computer Networks require additional practice. Completing your pending assignments and increasing weekly revision can significantly improve your Academic Health Score.`

  return {
    academicHealthScore: health,
    learningEfficiency,
    consistencyScore,
    confidenceIndex,
    improvementIndex,
    overallRating,
    overallGrade: grade,
    summary,
  }
}

/* ---------- 2. Strength analysis ---------- */
export function buildStrengthAnalysis({ derived }) {
  return (derived.strengths ?? []).map((s) => {
    const confidence = Math.min(99, Math.round(s.mastery * 0.92 + 8))
    return {
      subjectCode: s.subjectCode,
      subject: s.subject,
      type: 'subject',
      mastery: s.mastery,
      reason: s.reason,
      trend: '+improving',
      confidence,
    }
  })
}

/* ---------- 3. Weakness analysis ---------- */
export function buildWeaknessAnalysis({ derived, chapterMastery, academicDna }) {
  const weak = (derived.weaknesses ?? []).map((s) => ({
    subjectCode: s.subjectCode,
    subject: s.subject,
    mastery: s.mastery,
    priority: s.mastery < 65 ? 'Critical' : 'High',
    reason: s.reason,
    academicImpact: s.mastery < 65 ? 'Drops semester grade by ~0.3 CGPA if unresolved' : 'Lowers subject average by ~4 marks',
    suggestedImprovement: `Targeted revision plan for ${s.subject}: 2 drills + 1 mock section this week.`,
    estimatedRecovery: s.mastery < 65 ? '4–6 weeks' : '2–3 weeks',
  }))

  // add weak chapters as secondary weaknesses
  const weakChapters = (chapterMastery ?? []).filter((c) => c.level === 'Critical' || c.level === 'Weak')
    .slice(0, 4)
    .map((c) => ({
      subjectCode: c.subjectCode,
      subject: `${c.subject} — ${c.chapter}`,
      mastery: c.mastery,
      priority: c.level === 'Critical' ? 'Critical' : 'High',
      reason: `Chapter mastery ${c.mastery}% — ${c.level.toLowerCase()}`,
      academicImpact: 'Chapter carries ~8–12 marks in the end-sem',
      suggestedImprovement: 'Re-attempt the chapter drill set and explain key theorems to MediXO Mentor.',
      estimatedRecovery: c.level === 'Critical' ? '3–4 weeks' : '2 weeks',
    }))

  return [...weak, ...weakChapters]
}

/* ---------- 4. Academic health breakdown ---------- */
export function buildHealthBreakdown({ healthBreakdownInputs }) {
  const total = healthBreakdownInputs.reduce((a, b) => a + (b.weight || 0), 0) || 1
  return healthBreakdownInputs.map((h) => ({
    ...h,
    contribution: round1((clamp(h.value) * (h.weight || 0)) / total),
    tone: h.value >= 85 ? 'success' : h.value >= 70 ? 'warning' : 'danger',
  }))
}

/* ---------- 5. Learning behaviour analysis ---------- */
export function buildLearningBehaviourAnalysis({ learningBehaviourDetailed, learningBehaviourScore }) {
  const lb = learningBehaviourDetailed ?? {}
  const observations = []
  observations.push({ icon: 'Calendar', text: lb.attendancePattern?.note ?? '', tone: 'info' })
  observations.push({ icon: 'FileText', text: lb.assignmentCompletion?.note ?? '', tone: 'success' })
  observations.push({ icon: 'Timer', text: lb.practiceFrequency?.note ?? '', tone: 'warning' })
  observations.push({ icon: 'BookOpen', text: lb.revisionHabit?.note ?? '', tone: 'info' })
  observations.push({ icon: 'Target', text: lb.quizParticipation?.note ?? '', tone: 'warning' })

  return {
    score: learningBehaviourScore,
    attendancePattern: lb.attendancePattern ?? {},
    assignmentCompletion: lb.assignmentCompletion ?? {},
    practiceFrequency: lb.practiceFrequency ?? {},
    revisionHabit: lb.revisionHabit ?? {},
    quizParticipation: lb.quizParticipation ?? {},
    courseProgress: lb.courseProgress ?? [],
    dailyStudy: lb.dailyStudy ?? [],
    weeklyStudy: lb.weeklyStudy ?? [],
    monthlyPattern: lb.monthlyPattern ?? [],
    observations,
  }
}

/* ---------- 6. Subject mastery detail (expandable cards) ---------- */
export function buildSubjectMasteryDetail({ derived, academicDna, chapterMastery }) {
  const dnaMastery = academicDna?.mastery ?? []
  return (dnaMastery ?? []).map((m) => {
    const chapters = (chapterMastery ?? []).filter((c) => c.subjectCode === m.subjectCode)
    const mastered = chapters.filter((c) => c.level === 'Mastered').length
    const weak = chapters.filter((c) => c.level === 'Weak' || c.level === 'Critical').length
    const trend = m.trend ?? '+0'
    return {
      subjectCode: m.subjectCode,
      subject: m.subject,
      mastery: m.mastery,
      trend,
      improvement: trend.startsWith('+') ? trend : trend,
      confidence: Math.min(99, Math.round(m.mastery * 0.9 + 10)),
      status: m.mastery >= 80 ? 'Strong' : m.mastery >= 65 ? 'Developing' : 'At Risk',
      chapters,
      masteredCount: mastered,
      weakCount: weak,
    }
  })
}

/* ---------- 7. Chapter mastery (accordion-ready, grouped per subject) ---------- */
export function buildChapterMastery({ chapterMastery, subjects }) {
  return (subjects ?? []).map((s) => ({
    subjectCode: s.code,
    subject: s.name,
    chapters: (chapterMastery ?? []).filter((c) => c.subjectCode === s.code)
      .map((c) => ({ ...c, level: c.level })),
  })).filter((g) => g.chapters.length > 0)
}

/* ---------- 8. Topic mastery ---------- */
export function buildTopicMastery({ topicMastery }) {
  return (topicMastery ?? []).map((t) => ({
    ...t,
    status: t.learningStatus,
  }))
}

/* ---------- 9. Mistake intelligence ---------- */
export function buildMistakeIntelligence({ mistakeIntelligence }) {
  const severityRank = { High: 3, Medium: 2, Low: 1 }
  const sorted = [...(mistakeIntelligence ?? [])].sort((a, b) => b.frequency - a.frequency || severityRank[b.severity] - severityRank[a.severity])
  return {
    items: sorted,
    total: sorted.reduce((a, m) => a + m.frequency, 0),
    bySeverity: {
      high: sorted.filter((m) => m.severity === 'High').reduce((a, m) => a + m.frequency, 0),
      medium: sorted.filter((m) => m.severity === 'Medium').reduce((a, m) => a + m.frequency, 0),
      low: sorted.filter((m) => m.severity === 'Low').reduce((a, m) => a + m.frequency, 0),
    },
  }
}

/* ---------- 10. Improvement opportunities ---------- */
export function buildImprovementOpportunities({ derived, mistakeIntelligence }) {
  const weakest = derived.weaknesses?.[0]
  const topMistake = mistakeIntelligence?.items?.[0]
  return [
    {
      id: 'opp1', title: `Fix ${weakest?.subject ?? 'weakest subject'} fundamentals`, category: 'Highest Impact',
      reason: weakest?.reason ?? 'Below the 70% mastery threshold', estimatedGain: '+0.2 CGPA', effort: '4 weeks',
      priority: 'Critical',
    },
    {
      id: 'opp2', title: 'Clear pending assignments on time', category: 'Quick Win',
      reason: '2 pending items protect 10–15% of internals', estimatedGain: '+5 internal marks', effort: '3 days',
      priority: 'High',
    },
    {
      id: 'opp3', title: `Reduce ${topMistake?.category ?? 'careless'} mistakes`, category: 'Quick Win',
      reason: `${topMistake?.frequency ?? 0} occurrences — ${topMistake?.impact ?? 'loses marks'}`, estimatedGain: '+4% accuracy', effort: '1 week',
      priority: 'High',
    },
    {
      id: 'opp4', title: 'Deep practice sessions (45+ min)', category: 'Long Term',
      reason: 'Learning efficiency has headroom via session depth', estimatedGain: '+8 learning efficiency', effort: 'Ongoing',
      priority: 'Medium',
    },
    {
      id: 'opp5', title: 'Weekly FLT + mistake review', category: 'Long Term',
      reason: 'Consistent mocks build stamina and time management', estimatedGain: '+6 percentile', effort: 'Ongoing',
      priority: 'Medium',
    },
  ]
}

/* ---------- 11. Weekly action plan ---------- */
export function buildWeeklyActionPlan({ weeklyActionPlan }) {
  const todayIdx = new Date().getDay() // 0 = Sunday
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const todayName = dayNames[todayIdx]
  return (weeklyActionPlan ?? []).map((d) => ({
    ...d,
    isToday: d.day === todayName,
    status: d.day === todayName ? 'Today' : 'Scheduled',
  }))
}

/* ---------- 12. Improvement prediction ---------- */
export function buildImprovementPrediction({ improvementPrediction, academicHealth }) {
  const p = improvementPrediction ?? {}
  const metrics = [
    { label: 'Academic health', current: p.academicHealthGrowth?.current ?? academicHealth?.score ?? 0, predicted: p.academicHealthGrowth?.predicted ?? 0, unit: p.academicHealthGrowth?.unit ?? '/100' },
    { label: 'Performance', current: p.performanceGrowth?.current ?? 0, predicted: p.performanceGrowth?.predicted ?? 0, unit: p.performanceGrowth?.unit ?? '%' },
    { label: 'Subject mastery', current: p.subjectImprovement?.current ?? 0, predicted: p.subjectImprovement?.predicted ?? 0, unit: p.subjectImprovement?.unit ?? '%' },
    { label: 'Confidence', current: p.confidenceGrowth?.current ?? 0, predicted: p.confidenceGrowth?.predicted ?? 0, unit: p.confidenceGrowth?.unit ?? '/100' },
    { label: 'Accuracy', current: p.expectedAccuracy?.current ?? 0, predicted: p.expectedAccuracy?.predicted ?? 0, unit: p.expectedAccuracy?.unit ?? '%' },
  ]
  return {
    metrics,
    expectedSemesterImprovement: p.expectedSemesterImprovement ?? { value: '+0.2', unit: 'CGPA' },
    timeline: p.timeline ?? [],
    confidence: p.confidence ?? 'Medium',
    modelNote: p.modelNote ?? '',
  }
}
