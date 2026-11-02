/**
 * Faculty Intelligence Engine — Assessment Intelligence (pure functions).
 * Question statistics, coverage & gap analysis, assessment health, paper
 * library, upcoming assessments, assessment timeline, PYQ intelligence and
 * rule-based AI recommendations — all derived from the centralized faculty
 * datasets (no hardcoded values in the UI).
 */

import { clamp, round1, avg, weighted } from './scores.js'

/* ---------- Question statistics ---------- */
export function computeQuestionStats({ questionBank }) {
  const questions = questionBank?.questions ?? []
  const summary = questionBank?.summary ?? {}

  const byDifficulty = {}
  const byBloom = {}
  const byType = {}
  const byStatus = {}
  const bySource = {}
  const bySubject = {}
  const byTopic = {}

  questions.forEach((q) => {
    byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] ?? 0) + 1
    byBloom[q.bloom ?? 'Understand'] = (byBloom[q.bloom ?? 'Understand'] ?? 0) + 1
    byType[q.type] = (byType[q.type] ?? 0) + 1
    byStatus[q.status] = (byStatus[q.status] ?? 0) + 1
    bySource[q.source] = (bySource[q.source] ?? 0) + 1
    bySubject[q.subject] = (bySubject[q.subject] ?? 0) + 1
    byTopic[q.topic] = byTopic[q.topic] ?? []
    byTopic[q.topic].push(q)
  })

  const n = Math.max(questions.length, 1)
  const difficultyDistribution = Object.entries(byDifficulty).map(([level, count]) => ({
    level, count, pct: round1((count / n) * 100),
  })).sort((a, b) => b.count - a.count)

  const bloomOrder = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']
  const bloomDistribution = bloomOrder
    .filter((b) => byBloom[b])
    .map((level) => ({ level, count: byBloom[level], pct: round1((byBloom[level] / n) * 100) }))

  const typeDistribution = Object.entries(byType).map(([type, count]) => ({
    type, count, pct: round1((count / n) * 100),
  })).sort((a, b) => b.count - a.count)

  const statusDistribution = Object.entries(byStatus).map(([status, count]) => ({ status, count }))
  const sourceDistribution = Object.entries(bySource).map(([source, count]) => ({ source, count }))

  const topicCoverage = Object.entries(byTopic).map(([topic, qs]) => ({
    topic,
    subject: qs[0]?.subject,
    count: qs.length,
    usage: qs.reduce((a, q) => a + (q.usage ?? 0), 0),
    pyqFrequency: qs.reduce((a, q) => a + (q.pyqFrequency ?? 0), 0),
    avgAccuracy: round1(avg(qs, 'accuracy')),
  })).sort((a, b) => b.count - a.count)

  /* Usage + quality */
  const totalUsage = questions.reduce((a, q) => a + (q.usage ?? 0), 0)
  const avgAccuracy = round1(avg(questions, 'accuracy'))

  const quality = questions.map((q) => {
    const score = round1(clamp(
      (q.accuracy ?? 60) * 0.5
      + Math.min(q.usage ?? 0, 50) / 50 * 30
      + (q.status === 'Approved' ? 20 : q.status === 'Review' ? 10 : 0)
    ))
    return {
      id: q.id, score,
      level: score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Average' : 'Needs attention',
    }
  })

  return {
    total: summary.total ?? questions.length,
    bySubject: summary.bySubject ?? bySubject,
    aiGenerated: summary.aiGenerated ?? 0,
    usedThisTerm: summary.usedThisTerm ?? 0,
    flagged: summary.flagged ?? 0,
    questions,
    difficultyDistribution,
    bloomDistribution,
    typeDistribution,
    statusDistribution,
    sourceDistribution,
    topicCoverage,
    totalUsage,
    avgUsage: round1(totalUsage / n),
    avgAccuracy,
    quality,
    qualityAvg: round1(avg(quality, 'score')),
    qualityBuckets: {
      Excellent: quality.filter((q) => q.level === 'Excellent').length,
      Good: quality.filter((q) => q.level === 'Good').length,
      Average: quality.filter((q) => q.level === 'Average').length,
      'Needs attention': quality.filter((q) => q.level === 'Needs attention').length,
    },
  }
}

/* ---------- Unit-level coverage + gap analysis ---------- */
export function computeCoverageAnalytics({ questionCoverage }) {
  const courses = (questionCoverage ?? []).map((c) => {
    const total = Math.max(c.total ?? 1, 1)
    const units = (c.units ?? []).map((u) => ({
      ...u,
      coveragePct: round1((u.questions / total) * 100),
      targetPct: u.target ? round1(Math.min((u.questions / u.target) * 100, 100)) : null,
      healthy: u.target ? u.questions >= u.target : true,
    }))
    return { course: c.course, title: c.title, total: c.total, units }
  })

  const units = courses.flatMap((c) => c.units.map((u) => ({ course: c.course, ...u })))
  const weakest = [...units].sort((a, b) => a.coveragePct - b.coveragePct)[0]
  const strongest = [...units].sort((a, b) => b.coveragePct - a.coveragePct)[0]
  const belowTarget = units.filter((u) => !u.healthy)
  const weakestByTarget = [...belowTarget].sort((a, b) => (a.targetPct ?? 100) - (b.targetPct ?? 100))[0] ?? null

  return {
    courses,
    units,
    weakest,
    strongest,
    belowTarget,
    weakestByTarget,
    gapInsight: weakest && strongest && weakest.course === strongest.course
      ? `${weakest.unit} (${weakest.name}) has only ${weakest.coveragePct}% question coverage compared to ${strongest.unit} (${strongest.coveragePct}%) in ${weakest.course}.`
      : null,
  }
}

/* ---------- Assessment health ---------- */
export function computeAssessmentHealth({ questionBank, paperGenerator, examBuilder, quizBuilder, questionCoverage, healthInputs, readinessScore }) {
  const coverage = computeCoverageAnalytics({ questionCoverage })
  const coverageHealth = coverage.units.length ? round1(avg(coverage.units.filter((u) => u.targetPct != null), 'targetPct')) : 80

  const papers = paperGenerator?.generatedPapers ?? []
  const readiness = readinessScore ?? 80
  const qualityAvg = computeQuestionStats({ questionBank }).qualityAvg ?? 75

  const pyqAvg = coverage.units.length ? round1(avg(coverage.units, 'pyqPapers') / 12 * 100) : 70
  const quizzes = quizBuilder?.quizzes ?? []
  const quizHealth = quizzes.length ? round1((quizzes.filter((q) => q.status === 'Published').length / quizzes.length) * 100) : 70

  const weights = healthInputs?.weights ?? { coverage: 0.3, readiness: 0.25, quality: 0.2, pyqCoverage: 0.15, quizHealth: 0.1 }
  const score = round1(weighted([
    { value: coverageHealth, weight: weights.coverage },
    { value: readiness, weight: weights.readiness },
    { value: qualityAvg, weight: weights.quality },
    { value: pyqAvg, weight: weights.pyqCoverage },
    { value: quizHealth, weight: weights.quizHealth },
  ]))

  return {
    score,
    grade: score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'At Risk' : 'Critical',
    factors: [
      { label: 'Question coverage', value: round1(coverageHealth) },
      { label: 'Assessment readiness', value: round1(readiness) },
      { label: 'Question quality', value: round1(qualityAvg) },
      { label: 'PYQ coverage', value: round1(pyqAvg) },
      { label: 'Quiz health', value: round1(quizHealth) },
    ],
  }
}

/* ---------- Paper library ---------- */
export function computePaperLibrary({ paperGenerator }) {
  const papers = (paperGenerator?.generatedPapers ?? []).map((p) => ({
    ...p,
    versions: paperGenerator?.versionHistory?.[p.id] ?? [
      { version: 'v1.0', date: p.created ?? p.generated, note: 'Initial draft' },
    ],
  }))
  const active = papers.filter((p) => !p.archived)
  const archived = papers.filter((p) => p.archived)
  const byStatus = {}
  const byMode = {}
  const byExamType = {}
  papers.forEach((p) => {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1
    byMode[p.mode ?? 'University'] = (byMode[p.mode ?? 'University'] ?? 0) + 1
    byExamType[p.examType ?? 'Other'] = (byExamType[p.examType ?? 'Other'] ?? 0) + 1
  })
  return {
    papers,
    active,
    archived,
    total: papers.length,
    activeCount: active.length,
    archivedCount: archived.length,
    totalQuestions: papers.reduce((a, p) => a + (p.questions ?? 0), 0),
    totalMarks: papers.reduce((a, p) => a + (p.totalMarks ?? 0), 0),
    readyCount: papers.filter((p) => p.status === 'Ready').length,
    byStatus,
    byMode,
    byExamType,
  }
}

/* ---------- Upcoming assessments ---------- */
export function computeUpcomingAssessments({ examBuilder, quizBuilder, paperGenerator }) {
  const list = []
  ;(examBuilder?.drafts ?? []).forEach((d) => {
    list.push({
      id: `up_exam_${d.id}`, kind: 'Exam draft', title: d.title, course: d.course,
      date: d.lastEdited, meta: `${d.questions} questions · ${d.totalMarks} marks · coverage ${d.coverage}%`,
      status: d.status,
    })
  })
  ;(quizBuilder?.quizzes ?? []).filter((q) => q.status === 'Scheduled' || q.status === 'Published').forEach((q) => {
    list.push({
      id: `up_quiz_${q.id}`, kind: 'Quiz', title: q.title, course: q.course,
      date: q.published ?? null, meta: `${q.questions} questions · ${q.duration} min · window ${q.window}`,
      status: q.status,
    })
  })
  ;(paperGenerator?.generatedPapers ?? []).filter((p) => p.status === 'Draft' || p.status === 'In Review').forEach((p) => {
    list.push({
      id: `up_paper_${p.id}`, kind: 'Paper draft', title: p.title, course: p.course,
      date: p.modified ?? p.created, meta: `${p.questions} questions · ${p.totalMarks} marks · ${p.difficulty}`,
      status: p.status,
    })
  })
  return list.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))).slice(0, 8)
}

/* ---------- Assessment timeline ---------- */
export function computeAssessmentTimeline({ paperGenerator, quizBuilder, examBuilder }) {
  const events = []
  ;(paperGenerator?.generatedPapers ?? []).forEach((p) => {
    events.push({ id: `tl_p_${p.id}`, type: 'paper', date: p.created ?? p.generated, title: `${p.title} generated`, description: `${p.course} · ${p.questions} questions · ${p.totalMarks} marks` })
  })
  ;(quizBuilder?.quizzes ?? []).filter((q) => q.status === 'Published' && q.published).forEach((q) => {
    events.push({ id: `tl_q_${q.id}`, type: 'quiz', date: q.published, title: `${q.title} published`, description: `${q.course} · ${q.participants ?? 0} participants` })
  })
  ;(examBuilder?.drafts ?? []).forEach((d) => {
    events.push({ id: `tl_e_${d.id}`, type: 'exam', date: d.lastEdited, title: `${d.title} — ${d.status}`, description: `${d.course} · ${d.questions} questions · coverage ${d.coverage}%` })
  })
  return events
    .filter((e) => e.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 12)
}

/* ---------- AI recommendations (rule-based, data-derived) ---------- */
export function computeAssessmentRecommendations({
  questionStats, coverage, assessmentHealth, assessmentReadiness, pyqAnalysis, questionCoverage, quizBuilder, examBuilder,
}) {
  const recs = []

  const weakest = coverage.weakest
  const strongest = coverage.strongest
  if (weakest && strongest) {
    recs.push({
      id: 'arec_coverage', type: 'coverage', priority: 'Critical', title: `Close the ${weakest.name} question gap`,
      reason: `${weakest.unit} has only ${weakest.coveragePct}% question coverage vs ${strongest.unit}'s ${strongest.coveragePct}% in ${weakest.course} — generate ${Math.max((weakest.target ?? 0) - weakest.questions, 10)} more questions including MCQs.`,
      action: 'Generate with AI → select course → unit → target mix',
    })
  }

  const hardPct = questionStats.difficultyDistribution.find((d) => d.level === 'Hard')?.pct ?? 0
  if (hardPct < 25) {
    recs.push({
      id: 'arec_diff', type: 'difficulty', priority: 'High', title: 'Question bank lacks difficult-level questions',
      reason: `Hard questions are only ${hardPct}% of the bank (target 25%) — add Analyze/Evaluate-level questions.`,
      action: 'Filter by Bloom → Create → generate Hard variants',
    })
  }

  const arCount = questionStats.typeDistribution.find((t) => t.type === 'Assertion Reason')?.count ?? 0
  if (arCount === 0) {
    recs.push({
      id: 'arec_ar', type: 'types', priority: 'Medium', title: 'Add more Assertion-Reason questions',
      reason: 'The bank has no Assertion-Reason questions — JEE/competitive papers routinely carry them.',
      action: 'Generate with AI → question type → Assertion Reason',
    })
  }

  const pyqCourse = [...(questionCoverage ?? [])].sort((a, b) => avg(a.units, 'pyqPapers') - avg(b.units, 'pyqPapers'))[0]
  if (pyqCourse) {
    recs.push({
      id: 'arec_pyq', type: 'pyq', priority: 'High', title: `${pyqCourse.course} requires additional PYQs`,
      reason: `${pyqCourse.course} averages ${round1(avg(pyqCourse.units, 'pyqPapers'))} PYQ papers per unit — below the healthy 8+ threshold.`,
      action: 'Upload past papers → PYQ Intelligence → analyze',
    })
  }

  const pendingDrafts = (examBuilder?.drafts ?? []).filter((d) => d.status === 'Draft').length
  if (pendingDrafts > 0) {
    recs.push({
      id: 'arec_revision', type: 'revision', priority: 'High', title: 'Create a revision assessment before Mid Semester',
      reason: `${pendingDrafts} exam draft${pendingDrafts > 1 ? 's' : ''} still in Draft — a lightweight revision quiz on the weakest units would lift cohort readiness.`,
      action: 'Quiz Builder → draft → schedule before the midsem window',
    })
  }

  const lowQuiz = (quizBuilder?.quizzes ?? []).filter((q) => q.status === 'Draft').length
  if (lowQuiz > 0) {
    recs.push({
      id: 'arec_quiz', type: 'quiz', priority: 'Medium', title: `${lowQuiz} quiz draft${lowQuiz > 1 ? 's' : ''} waiting to be published`,
      reason: 'Publishing quizzes keeps engagement and surfaces weak topics before exams.',
      action: 'Quiz Builder → review → publish',
    })
  }

  return { items: recs.slice(0, 6), critical: recs.filter((r) => r.priority === 'Critical').length }
}

/* ---------- Assembled assessment intelligence ---------- */
export function computeAssessmentIntelligence({
  questionBank, paperGenerator, examBuilder, quizBuilder, pyqAnalysis, questionCoverage, assessmentHealthInputs, readinessScore,
}) {
  const questionStats = computeQuestionStats({ questionBank })
  const coverage = computeCoverageAnalytics({ questionCoverage })
  const assessmentHealth = computeAssessmentHealth({ questionBank, paperGenerator, examBuilder, quizBuilder, questionCoverage, healthInputs: assessmentHealthInputs, readinessScore })
  const paperLibrary = computePaperLibrary({ paperGenerator })
  const upcomingAssessments = computeUpcomingAssessments({ examBuilder, quizBuilder, paperGenerator })
  const timeline = computeAssessmentTimeline({ paperGenerator, quizBuilder, examBuilder })
  const recommendations = computeAssessmentRecommendations({
    questionStats, coverage, assessmentHealth, assessmentReadiness: readinessScore,
    pyqAnalysis, questionCoverage, quizBuilder,
  })

  const summary = {
    headline: `Assessment health ${assessmentHealth.score}/100 (${assessmentHealth.grade})`,
    body: `Your bank holds ${questionBank?.summary?.total ?? 0} questions across ${Object.keys(questionBank?.summary?.bySubject ?? {}).length} courses with an average quality of ${questionStats.qualityAvg}/100 and ${questionStats.avgAccuracy}% cohort accuracy. ${coverage.weakest ? `${coverage.weakest.unit} (${coverage.weakest.name}) is the thinnest unit at ${coverage.weakest.coveragePct}% coverage.` : ''} ${paperLibrary.total} papers in the library${paperLibrary.readyCount ? `, ${paperLibrary.readyCount} ready to publish` : ''}.`,
    highlights: [
      `${questionStats.total} questions · ${questionStats.aiGenerated} AI-generated · ${questionStats.flagged} flagged`,
      `${paperLibrary.total} papers · ${paperLibrary.readyCount} ready · ${upcomingAssessments.length} upcoming assessments`,
      `Quality ${questionStats.qualityAvg}/100 · accuracy ${questionStats.avgAccuracy}% · coverage gap in ${coverage.weakest?.name ?? '—'}`,
    ],
  }

  return {
    questionStats,
    coverage,
    assessmentHealth,
    paperLibrary,
    upcomingAssessments,
    timeline,
    recommendations,
    summary,
  }
}

/* ---------- PYQ intelligence (trends + competitive) ---------- */
export function computePyqIntelligence({ pyqTrends, pyqAnalysis, questionCoverage }) {
  const uni = pyqTrends?.university ?? {}
  const comp = pyqTrends?.competitive ?? {}

  /* Gap analysis: units with weakest PYQ depth per course. */
  const gapAnalysis = (questionCoverage ?? []).map((c) => {
    const papers = avg(c.units, 'pyqPapers')
    return {
      course: c.course,
      avgPyqPapers: round1(papers),
      level: papers >= 8 ? 'Healthy' : papers >= 6 ? 'Watch' : 'Gap',
      weakestUnit: [...c.units].sort((a, b) => a.pyqPapers - b.pyqPapers)[0],
    }
  })

  const recommendations = []
  const gap = gapAnalysis.filter((g) => g.level !== 'Healthy').sort((a, b) => a.avgPyqPapers - b.avgPyqPapers)[0]
  if (gap) {
    recommendations.push({
      id: 'pyqrec1', tone: 'warning', title: `${gap.course} needs more PYQ coverage`,
      body: `Averages ${gap.avgPyqPapers} papers per unit — ${gap.weakestUnit?.name} has just ${gap.weakestUnit?.pyqPapers}. Upload past papers to sharpen frequency predictions.`,
    })
  }
  const hardTrend = uni.difficultyTrend?.slice(-3) ?? []
  if (hardTrend.length === 3) {
    const first = hardTrend[0]?.hard ?? 0
    const last = hardTrend[2]?.hard ?? 0
    if (last > first) {
      recommendations.push({
        id: 'pyqrec2', tone: 'neutral', title: 'Difficulty is shifting upward',
        body: `Hard-question share rose from ${first}% (${hardTrend[0]?.year}) to ${last}% (${hardTrend[2]?.year}) — weight recent papers more when calibrating new assessments.`,
      })
    }
  }
  recommendations.push({
    id: 'pyqrec3', tone: 'positive', title: 'Revision suggestion',
    body: `Focus revision on ${uni.weightage?.[0]?.chapter ?? 'top-weighted chapters'} (${uni.weightage?.[0]?.weight ?? '—'}% weightage) and the repeated concepts: ${(uni.repeatedConcepts ?? []).slice(0, 3).join(' · ')}.`,
  })

  /* Competitive exams — enriched with per-exam recommendations derived
     from each exam's priority topics + gap analysis. */
  const competitive = {}
  Object.entries(comp).forEach(([key, exam]) => {
    const total = Number(exam?.totalQuestions ?? 0) || 1
    const recs = []
    ;(exam?.priorityTopics ?? []).slice(0, 2).forEach((p) => {
      recs.push({
        id: `pyqcomp_${key}_${p.topic}`.replace(/\s+/g, '_'), tone: 'warning',
        title: `${p.topic} is ${p.priority} priority`,
        body: p.reason,
      })
    })
    const gap = (exam?.gapAnalysis ?? []).filter((g) => g.level === 'Gap')[0]
    if (gap) {
      recs.push({
        id: `pyqcomp_${key}_gap`.replace(/\s+/g, '_'), tone: 'neutral',
        title: `${gap.topic} shows a PYQ gap`,
        body: `${gap.note} (${gap.coverage}% coverage) — add targeted practice before the next test.`,
      })
    }
    recs.push({
      id: `pyqcomp_${key}_types`.replace(/\s+/g, '_'), tone: 'positive',
      title: 'Question-type calibration',
      body: `${(exam?.questionTypes ?? []).map((t) => `${t.type} ${t.count}`).join(' · ')} — build mock tests matching this exact split.`,
    })
    competitive[key] = {
      ...exam,
      questionTypeMix: (exam?.questionTypes ?? []).map((t) => ({
        ...t,
        pct: round1((t.count / total) * 100),
      })),
      recommendations: recs,
    }
  })

  return {
    university: {
      difficultyTrend: uni.difficultyTrend ?? [],
      weightage: uni.weightage ?? [],
      typeDistribution: uni.typeDistribution ?? [],
      repeatedConcepts: uni.repeatedConcepts ?? [],
      pyqCorpus: {
        totalPapers: pyqAnalysis?.overview?.totalPapers ?? 0,
        totalQuestions: pyqAnalysis?.overview?.totalQuestions ?? 0,
        repeatedQuestions: pyqAnalysis?.overview?.repeatedQuestions ?? 0,
        coveragePct: pyqAnalysis?.overview?.coveragePct ?? 0,
        yearsCovered: pyqAnalysis?.overview?.yearsCovered ?? [],
      },
    },
    competitive,
    gapAnalysis,
    recommendations,
  }
}

export default computeAssessmentIntelligence

/* ---------- Live question-bank stats injection ----------
 * `derived.assessment.questionStats` served in the faculty-intelligence
 * summary payload may have been derived from seed data on the backend. The
 * ONLY runtime question source is GET /faculty/question-bank, so the UI
 * layer re-derives the questionStats block from the live bank payload with
 * the SAME pure engine (computeQuestionStats). An empty bank yields honest
 * neutral stats (0 totals, null averages → the UI's existing '—' state);
 * real bank rows yield real distributions. No other derived block changes. */
export function withLiveQuestionStats(intel, questionBank) {
  if (!intel || typeof intel !== 'object') return intel
  const derived = intel.derived ?? {}
  const assessment = derived.assessment ?? {}
  const stats = computeQuestionStats({ questionBank: questionBank ?? {} })
  /* Averages are only meaningful when the live bank actually measures
     accuracy; with an empty bank (or no measured rows) they collapse to
     the UI's neutral '—' state instead of a fabricated number. */
  const questions = stats.questions ?? []
  const measured = questions.some((q) => Number.isFinite(Number(q?.accuracy)))
  const liveStats = measured
    ? stats
    : { ...stats, avgAccuracy: null, qualityAvg: null }
  return {
    ...intel,
    derived: {
      ...derived,
      assessment: { ...assessment, questionStats: liveStats },
    },
  }
}

/* ---------- Competitive Question Intelligence (Phase 29) ----------
 * Derived view over the competitive question dataset: per-exam / per-subject
 * / per-chapter / per-difficulty statistics, PYQ records (the dataset itself
 * is the single source of truth — every competitive question IS a PYQ record
 * with a stable id) and the university PYQ question list.
 */
export function computeCompetitiveQuestionIntelligence({ competitiveQuestions = [], universityPyqQuestions = [] }) {
  const byExam = {}
  const bySubject = {}
  const byChapter = {}
  const byDifficulty = {}
  const byYear = {}
  const byType = {}

  competitiveQuestions.forEach((q) => {
    byExam[q.exam] = (byExam[q.exam] ?? 0) + 1
    const sk = `${q.exam} · ${q.subject}`
    bySubject[sk] = (bySubject[sk] ?? 0) + 1
    const ck = `${q.exam} · ${q.subject} · ${q.chapter}`
    byChapter[ck] = (byChapter[ck] ?? 0) + 1
    const dk = `${q.exam} · ${q.difficulty}`
    byDifficulty[dk] = (byDifficulty[dk] ?? 0) + 1
    const yk = `${q.exam} · ${q.year}`
    byYear[yk] = (byYear[yk] ?? 0) + 1
    byType[q.questionType] = (byType[q.questionType] ?? 0) + 1
  })

  const examSummaries = ['JEE Main', 'NEET UG'].map((exam) => {
    const qs = competitiveQuestions.filter((q) => q.exam === exam)
    const subjects = [...new Set(qs.map((q) => q.subject))].map((subject) => ({
      subject,
      count: qs.filter((q) => q.subject === subject).length,
      chapters: [...new Set(qs.filter((q) => q.subject === subject).map((q) => q.chapter))],
    }))
    return {
      exam,
      count: qs.length,
      subjects,
      bySubject: subjects.map((s) => ({ subject: s.subject, count: s.count })),
      byDifficulty: ['Easy', 'Medium', 'Hard'].map((d) => ({ difficulty: d, count: qs.filter((q) => q.difficulty === d).length })),
      byYear: [...new Set(qs.map((q) => q.year))].sort().map((y) => ({ year: y, count: qs.filter((q) => q.year === y).length })),
      pyqCount: qs.filter((q) => q.isPyq).length,
    }
  })

  return {
    total: competitiveQuestions.length,
    byExam,
    examSummaries,
    bySubject,
    byChapter,
    byDifficulty,
    byYear,
    byType,
    pyqRecords: competitiveQuestions, // every competitive question is a PYQ record (stable id)
    universityPyq: universityPyqQuestions,
    universityPyqCount: universityPyqQuestions.length,
  }
}
