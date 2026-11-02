/**
 * Student Intelligence Engine — COMPETITIVE CONTEXT (first-class context).
 *
 * Assembles the competitive slice of the unified Student Intelligence
 * contract: exam families (JEE · NEET), subjects, chapter mastery, PYQ
 * performance, mock-test trend, accuracy/speed/negative-marking signals,
 * readiness and context-specific DNA + recommendations.
 *
 * CONTEXT ISOLATION (Part 5): this module never reads university signals
 * (CGPA, semester attendance, internal marks).
 */

import { round1, avg, clamp } from './scores.js'
import { detectExamFamily, FAMILY_SUBJECTS } from './readiness.js'

export function buildCompetitiveIntelligence({ profile, datasets, derived, readiness }) {
  const ds = datasets ?? {}
  const profileCompetitive = profile?.competitiveProfile ?? { exams: [] }

  /* ----- completed mock history (competitive only) ----- */
  const completedMocks = (ds.examPerformance ?? [])
    .filter((e) => e.type === 'Competitive' && e.status === 'Completed')
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((m) => ({
      examId: m.examId, title: m.title, date: m.date, pct: m.pct,
      percentile: m.percentile ?? null, rank: m.rank ?? null, family: detectExamFamily(m),
    }))

  const overall = {
    accuracy: round1(avg(completedMocks, 'pct')),
    bestPercentile: completedMocks.length ? Math.max(...completedMocks.map((m) => m.percentile ?? 0)) : null,
    latestPercentile: completedMocks.length ? completedMocks[completedMocks.length - 1].percentile : null,
    completedMocks: completedMocks.length,
  }

  /* ----- per-family intelligence ----- */
  const families = ['JEE', 'NEET'].filter((f) => (ds.competitivePyqPerformance?.[f] || (ds.competitiveExams ?? []).some((e) => detectExamFamily(e) === f)))
  const exams = {}
  families.forEach((family) => {
    const pyq = ds.competitivePyqPerformance?.[family] ?? {}
    const familyMocks = completedMocks.filter((m) => m.family === family)
    const familyEntries = (readiness?.competitive ?? []).filter((e) => e.examFamily === family)
    const familyOverall = readiness?.byExamFamily?.[family] ?? {}
    const prep = (profileCompetitive.exams ?? []).find((e) => e.id === family.toLowerCase())

    const chapters = (pyq.subjects ?? []).flatMap((s) => (s.chapters ?? []).map((c) => ({
      subjectCode: s.code, subject: s.name, chapter: c.chapter, mastery: c.accuracy,
      level: c.accuracy >= 75 ? 'Mastered' : c.accuracy >= 65 ? 'Improving' : 'Weak',
    })))
    const subjects = (pyq.subjects ?? []).map((s) => ({
      code: s.code, name: s.name, accuracy: round1(s.accuracy),
      attempted: s.attempted, correct: s.correct, avgSeconds: s.avgSeconds,
      mastery: round1(s.accuracy),
      level: s.accuracy >= 75 ? 'Strong' : s.accuracy >= 65 ? 'Average' : 'Weak',
    }))

    exams[family] = {
      family,
      name: family === 'JEE' ? 'JEE (Main & Advanced)' : 'NEET (UG)',
      subjects: FAMILY_SUBJECTS[family] ?? [],
      targetDate: prep?.targetDate ?? familyEntries[0]?.date ?? null,
      status: prep?.status ?? (familyEntries.length ? 'Preparing' : 'Idle'),
      prepProgress: prep?.prepProgress ?? Math.round(familyOverall.score ?? 0),
      readiness: familyOverall.score ?? 0,
      readinessLevel: familyOverall.level ?? '—',
      readinessTrend: familyOverall.trend ?? 'steady',
      readinessFactors: familyOverall.factors ?? [],
      recommendations: familyOverall.recommendations ?? [],
      mocks: familyMocks.map((m) => ({ examId: m.examId, title: m.title, date: m.date, pct: m.pct, percentile: m.percentile })),
      mockStats: {
        completed: familyMocks.length,
        avgPct: familyMocks.length ? round1(avg(familyMocks, 'pct')) : 0,
        avgPercentile: familyMocks.length ? round1(avg(familyMocks.filter((m) => m.percentile != null), 'percentile')) : null,
      },
      pyq: {
        attempted: pyq.totalAttempted ?? 0,
        correct: pyq.totalCorrect ?? 0,
        accuracy: round1(pyq.accuracy ?? 0),
        avgSeconds: pyq.avgSecondsPerQuestion ?? 0,
        guessRate: pyq.guessRate ?? 0,
        bySubject: subjects.map((s) => ({ subject: s.name, accuracy: s.accuracy, attempted: s.attempted })),
        byChapter: chapters,
      },
      speed: {
        avgSeconds: pyq.avgSecondsPerQuestion ?? 0,
        score: round1(clamp((120 - (pyq.avgSecondsPerQuestion ?? 100)) * 1.1 + 50)),
      },
      negativeMarking: {
        discipline: round1(clamp(100 - (pyq.guessRate ?? 8) * 3)),
        guessRate: pyq.guessRate ?? 0,
        policy: familyEntries[0]?.strategy?.questionStrategy?.includes('−1') ? '−1 per incorrect answer' : 'Negative marking applies',
      },
      dna: {
        strengths: (familyOverall.strengths?.subjects ?? []).filter((s) => s.mastery >= 75),
        weaknesses: (familyOverall.weaknesses?.subjects ?? []),
        strongChapters: chapters.filter((c) => c.level === 'Mastered').slice(0, 6),
        weakChapters: chapters.filter((c) => c.level === 'Weak').slice(0, 6),
        chapters,
        subjects,
      },
      upcoming: familyEntries.map((e) => ({ examId: e.examId, title: e.title, date: e.date, readiness: e.readiness, daysLeft: e.daysLeft })),
    }
  })

  /* ----- competitive DNA (context-distinguishable signals) ----- */
  const dna = {
    strengths: families.flatMap((f) => (exams[f]?.dna.strengths ?? []).map((s) => ({ ...s, family: f }))),
    weaknesses: families.flatMap((f) => (exams[f]?.dna.weaknesses ?? []).map((s) => ({ ...s, family: f }))),
    strongChapters: families.flatMap((f) => (exams[f]?.dna.strongChapters ?? []).map((c) => ({ ...c, family: f }))),
    weakChapters: families.flatMap((f) => (exams[f]?.dna.weakChapters ?? []).map((c) => ({ ...c, family: f }))),
    errorPatterns: (ds.mistakeIntelligence ?? [])
      .filter((m) => (m.sources ?? []).some((s) => /Competitive|Practice|AI Exam/i.test(s)))
      .map((m) => ({ category: m.category, frequency: m.frequency, impact: m.impact, recommendation: m.recommendation, affectedSubjects: m.affectedSubjects })),
    summary: families.map((f) => ({
      family: f,
      text: `${f} preparation is "${exams[f]?.readinessLevel ?? '—'}" — strongest in ${exams[f]?.dna.strengths[0]?.subject ?? '—'} (${exams[f]?.dna.strengths[0]?.mastery ?? '—'}%), weakest in ${exams[f]?.dna.weaknesses[0]?.subject ?? '—'} (${exams[f]?.dna.weaknesses[0]?.mastery ?? '—'}%).`,
    })),
  }

  /* ----- recommendations (competitive-tagged) ----- */
  const recommendations = families.flatMap((f) => (exams[f]?.recommendations ?? []).map((r) => ({ ...r, context: 'competitive', examFamily: f })))

  /* ----- timeline (competitive events only) ----- */
  const timeline = (derived.academicJourney ?? []).filter((ev) => /JEE|NEET|ATS|test-series|mock/i.test(`${ev.title} ${ev.detail}`))

  return {
    context: 'competitive',
    examFamilies: families,
    exams,
    overall,
    readiness: {
      entries: readiness?.competitive ?? [],
      byExamFamily: readiness?.byExamFamily ?? {},
      summary: readiness?.summary ?? {},
    },
    performance: {
      accuracy: overall.accuracy,
      bestPercentile: overall.bestPercentile,
      latestPercentile: overall.latestPercentile,
      mocks: completedMocks,
      speed: families.map((f) => ({ family: f, avgSeconds: exams[f]?.speed.avgSeconds, score: exams[f]?.speed.score })),
      negativeMarking: families.map((f) => ({ family: f, discipline: exams[f]?.negativeMarking.discipline, guessRate: exams[f]?.negativeMarking.guessRate })),
    },
    dna,
    recommendations,
    timeline,
  }
}

export default buildCompetitiveIntelligence
