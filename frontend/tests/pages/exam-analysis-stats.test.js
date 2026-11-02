import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { analysisExamFamily, buildQuestionIntelligenceCards, comparisonPercentileLabel, formatNtaPercentile, heroAirLabel, heroNtaPercentile, paginateQuestionReview, QUESTION_REVIEW_PAGE_SIZE, questionPaperTotal, SUBJECT_STAT_SPACING, subjectCardPercentile, subjectCardRank, subjectQuestionStats, subjectStatCells } from '../../src/pages/student/exam-analysis-stats.js'
import { computeAttemptAnalysis } from '../../src/intelligence/faculty/engine/students-directory.js'
import { makeAttempt } from '../fixtures/attempts.js'

describe('exam analysis question chips', () => {
  it('recovers paper total from attempt ratio when the payload omits total', () => {
    expect(questionPaperTotal({ attempted: 162, skipped: 18, attemptRatio: 90 })).toBe(180)
  })

  it('shows every chip as a percentage of the matching base', () => {
    const cards = buildQuestionIntelligenceCards({
      attempted: 162,
      correct: 134,
      incorrect: 28,
      skipped: 18,
      attemptRatio: 90,
      successRate: 82.7,
      negativeMarks: 28,
      guessAttempts: 0,
    })

    expect(cards.map((c) => c.delta)).toEqual([
      '90% attempt ratio',
      '82.7% success rate',
      '17.3% error rate',
      '10% skip rate',
    ])
    expect(cards.map((c) => c.value)).toEqual(['162', '134', '28', '18'])
    expect(cards.every((c) => String(c.delta).includes('%'))).toBe(true)
    expect(cards.some((c) => /negative marks|guess attempts/i.test(c.delta))).toBe(false)
  })

  it('computes rates from counts when the payload has total but no precomputed ratios', () => {
    const cards = buildQuestionIntelligenceCards({
      total: 10,
      attempted: 8,
      correct: 5,
      incorrect: 3,
      skipped: 2,
    })

    expect(cards.map((c) => c.delta)).toEqual([
      '80% attempt ratio',
      '62.5% success rate',
      '37.5% error rate',
      '20% skip rate',
    ])
  })

  it('returns zero-percent chips when nothing was attempted', () => {
    const cards = buildQuestionIntelligenceCards({
      total: 12,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      skipped: 12,
    })

    expect(cards.map((c) => c.delta)).toEqual([
      '0% attempt ratio',
      '0% success rate',
      '0% error rate',
      '100% skip rate',
    ])
  })

  it('uses percentage chips for faculty/admin per-attempt analysis payloads', () => {
    const analysis = computeAttemptAnalysis(
      makeAttempt({
        id: 'fac-01',
        student: 'fs_jee_a_03',
        examMode: 'Competitive',
        examFamily: 'JEE',
        subject: 'Physics',
        chapter: 'Rotational Motion',
        outcomes: [
          { correct: true, time: 40 },
          { correct: false, time: 90 },
          { skipped: true, time: 0 },
          { correct: true, time: 55 },
        ],
      }),
    )
    const cards = buildQuestionIntelligenceCards(analysis.questionIntelligence)
    expect(cards.every((c) => String(c.delta).includes('%'))).toBe(true)
    expect(cards.some((c) => /negative marks|guess attempts/i.test(c.delta))).toBe(false)
    expect(cards.map((c) => c.label)).toEqual(['Attempted', 'Correct', 'Incorrect', 'Skipped'])
  })
})

describe('faculty and admin individual analysis share the percentage chips', () => {
  it('mounts the same attempt-analysis page on faculty and admin student routes', () => {
    const routes = readFileSync(new URL('../../src/routes/index.jsx', import.meta.url), 'utf8')
    expect(routes).toContain('path="my-students/:studentId/exams/:attemptId" element={withSuspense(FacultyAttemptAnalysis)}')
    expect(routes).toContain('path="students/:studentId/exams/:attemptId" element={withSuspense(FacultyAttemptAnalysis)}')
  })

  it('renders the shared AnalysisDashboard (percentage chips) for faculty/admin', () => {
    const page = readFileSync(new URL('../../src/pages/faculty/FacultyAttemptAnalysis.jsx', import.meta.url), 'utf8')
    expect(page).toContain("import { AnalysisDashboard } from '@/pages/student/ExamAnalysis'")
    expect(page).toContain('<AnalysisDashboard data={data} subject="All Subjects" />')
    expect(page).toContain('exportAnalysisPDF')
    expect(page).toContain('analysisPdfUser')
    expect(page).toContain('<Download className="h-4 w-4" /> PDF')
    const dashboard = readFileSync(new URL('../../src/pages/student/ExamAnalysis.jsx', import.meta.url), 'utf8')
    expect(dashboard).toContain('buildQuestionIntelligenceCards(qi)')
    expect(dashboard).toContain('subjectQuestionStats(s, data.questionReview ?? [])')
    expect(dashboard).toContain('subjectCardRank(s)')
    expect(dashboard).toContain('heroAirLabel(h)')
    expect(dashboard).toContain('subjectCardPercentile(s, examFamily)')
    expect(dashboard).toContain('heroNtaPercentile(h, examFamily)')
    expect(dashboard).toContain('hideRankAndPercentile')
    expect(dashboard).toContain("examFamily === 'JEE' || examFamily === 'NEET'")
    expect(dashboard).toContain('comparisonPercentileLabel')
    expect(dashboard).not.toContain('rankSubjects')
    expect(dashboard).not.toContain('strongAreas')
    expect(dashboard).not.toContain('weakAreas')
    expect(dashboard).not.toContain('{s.difficulty}')
    expect(dashboard).toContain('SUBJECT_STAT_SPACING')
    expect(dashboard).not.toContain('cell.box')
    expect(dashboard).not.toContain('cell.text')
    expect(dashboard).toContain('paginateQuestionReview')
    expect(dashboard).toContain('<QuestionByQuestionReview questionReview={questionReview} activeSubject={activeSubject} />')
    expect(dashboard).toContain('Chapter Intelligence (fully commented out)')
    expect(dashboard).toMatch(/Question-by-question review occupies this slot/)
    expect((dashboard.match(/title="Question-by-question review"/g) || []).length).toBe(1)
    expect(dashboard).toContain('Next 20')
    expect(dashboard).toContain('QUESTION_REVIEW_PAGE_SIZE')
    expect((dashboard.match(/<ComingSoonNotice \/>/g) || []).length).toBe(3)
    expect(dashboard).toContain('title="Topic intelligence"')
    expect(dashboard).toContain('AI recommendations')
    expect(dashboard).toContain('Suggested resources')
    expect(dashboard).toContain('Comparison (fully commented out)')
  })
})

describe('per-subject question counts on analysis cards', () => {
  const neetReview = [
    { subject: 'Physics', status: 'Correct' },
    { subject: 'Physics', status: 'Incorrect' },
    { subject: 'Physics', status: 'Skipped' },
    { subject: 'Physics', status: 'Not visited' },
    { subject: 'Chemistry', status: 'Correct' },
    { subject: 'Chemistry', status: 'Correct' },
    { subject: 'Chemistry', status: 'Incorrect' },
    { subject: 'Biology', status: 'Correct' },
    { subject: 'Biology', status: 'Skipped' },
    { subject: 'Biology', status: 'Skipped' },
  ]

  const jeeReview = [
    { subject: 'Physics', status: 'Correct' },
    { subject: 'Physics', status: 'Skipped' },
    { subject: 'Chemistry', status: 'Incorrect' },
    { subject: 'Mathematics', status: 'Correct' },
    { subject: 'Mathematics', status: 'Correct' },
    { subject: 'Mathematics', status: 'Incorrect' },
    { subject: 'Mathematics', status: 'Skipped' },
  ]

  it('counts NEET Physics / Chemistry / Biology independently', () => {
    expect(subjectQuestionStats({ name: 'Physics' }, neetReview)).toEqual({
      questions: 4, attempted: 2, correct: 1, incorrect: 1, skipped: 2,
    })
    expect(subjectQuestionStats({ name: 'Chemistry' }, neetReview)).toEqual({
      questions: 3, attempted: 3, correct: 2, incorrect: 1, skipped: 0,
    })
    expect(subjectQuestionStats({ name: 'Biology' }, neetReview)).toEqual({
      questions: 3, attempted: 1, correct: 1, incorrect: 0, skipped: 2,
    })
  })

  it('counts JEE Physics / Chemistry / Mathematics independently', () => {
    expect(subjectQuestionStats({ name: 'Physics' }, jeeReview)).toEqual({
      questions: 2, attempted: 1, correct: 1, incorrect: 0, skipped: 1,
    })
    expect(subjectQuestionStats({ name: 'Chemistry' }, jeeReview)).toEqual({
      questions: 1, attempted: 1, correct: 0, incorrect: 1, skipped: 0,
    })
    expect(subjectQuestionStats({ name: 'Mathematics' }, jeeReview)).toEqual({
      questions: 4, attempted: 3, correct: 2, incorrect: 1, skipped: 1,
    })
  })

  it('does not leak another subject’s skipped questions', () => {
    const physics = subjectQuestionStats({ name: 'Physics' }, neetReview)
    const biology = subjectQuestionStats({ name: 'Biology' }, neetReview)
    expect(physics.skipped).toBe(2)
    expect(biology.skipped).toBe(2)
    expect(physics.questions + biology.questions).toBe(7)
  })

  it('falls back to subject payload fields when review rows are missing', () => {
    expect(subjectQuestionStats({
      name: 'Physics', attempted: 40, correct: 22, skipped: 5, questions: 45,
    }, [])).toEqual({ questions: 45, attempted: 40, correct: 22, incorrect: 18, skipped: 5 })
  })

  it('renders Questions / Attempted / Correct / Incorrect / Skipped as simple text', () => {
    const cells = subjectStatCells({ questions: 45, attempted: 40, correct: 22, incorrect: 18, skipped: 5 })
    expect(cells.map((c) => c.label)).toEqual(['Questions', 'Attempted', 'Correct', 'Incorrect', 'Skipped'])
    expect(cells.every((c) => c.box == null && c.text == null)).toBe(true)
    expect(SUBJECT_STAT_SPACING.pad).toMatch(/p/)
    expect(SUBJECT_STAT_SPACING.gap).toMatch(/gap/)
  })
})

describe('subject ranks on analysis cards', () => {
  it('shows the batch rank supplied on each subject, not an intra-paper subject order', () => {
    expect(subjectCardRank({ name: 'Physics', score: 94, rank: 12 })).toBe(12)
    expect(subjectCardRank({ name: 'Biology', score: 315, rank: 2 })).toBe(2)
    expect(subjectCardRank({ name: 'Chemistry', score: 99, rank: 1 })).toBe(1)
  })

  it('hides rank when the payload has no batch cohort', () => {
    expect(subjectCardRank({ name: 'Physics', score: 94, rank: null })).toBeNull()
    expect(subjectCardRank({ name: 'Physics', score: 94 })).toBeNull()
  })

  it('formats NTA percentiles to seven decimals on JEE subject cards', () => {
    expect(subjectCardPercentile({ ntaPercentile: 66.6666667 }, 'JEE')).toBe(66.6666667)
    expect(formatNtaPercentile(100)).toBe('100.0000000')
    expect(subjectCardPercentile({ rank: 1 }, 'JEE')).toBeNull()
  })

  it('hides percentile chips for NEET even if a stale percentile is present', () => {
    expect(subjectCardPercentile({ ntaPercentile: 91.4, rankMethod: 'NEET-NTA' }, 'NEET')).toBeNull()
    expect(subjectCardPercentile({ ntaPercentile: 0 }, 'NEET')).toBeNull()
    expect(heroNtaPercentile({ ntaPercentile: 100, rankMethod: 'NEET-NTA' }, 'NEET')).toBeNull()
    expect(heroNtaPercentile({ ntaPercentile: null, rankMethod: 'NEET-NTA' }, 'NEET')).toBeNull()
    expect(formatNtaPercentile(null)).toBeNull()
  })
})

describe('batch AIR on the analysis hero', () => {
  it('labels JEE and NEET overall rank as batch AIR', () => {
    expect(heroAirLabel({ batchRank: 2, rankMethod: 'NEET-NTA', cohortSize: 3 })).toBe('Batch AIR #2 · 3')
    expect(heroAirLabel({ batchRank: 1, rankMethod: 'JEE-NTA', cohortSize: 42 })).toBe('Batch AIR #1 · 42')
  })

  it('hides AIR when the attempt has no NTA / batch overall rank', () => {
    expect(heroAirLabel({ batchRank: null, rankMethod: 'batch' })).toBeNull()
    expect(heroAirLabel({})).toBeNull()
  })

  it('uses rank cohortSize only, never comparison batchCohortSize', () => {
    expect(heroAirLabel({ batchRank: 3, rankMethod: 'NEET-NTA', cohortSize: 8, batchCohortSize: 20 })).toBe('Batch AIR #3 · 8')
    expect(heroAirLabel({ batchRank: 3, rankMethod: 'NEET-NTA', batchCohortSize: 20 })).toBe('Batch AIR #3')
  })

  it('keeps JEE NTA percentile on the hero', () => {
    expect(heroNtaPercentile({ ntaPercentile: 100, rankMethod: 'JEE-NTA' }, 'JEE')).toBe(100)
    expect(analysisExamFamily({ examFamily: 'NEET', hero: { rankMethod: 'NEET-NTA' } })).toBe('NEET')
    expect(analysisExamFamily({ examFamily: 'JEE', hero: { rankMethod: 'JEE-NTA' } })).toBe('JEE')
  })

  it('hides comparison %ile extras on NEET analysis cards', () => {
    expect(comparisonPercentileLabel(83.3, 'NEET')).toBeNull()
    expect(comparisonPercentileLabel(83.3, 'JEE')).toBe('83.3%ile')
  })
})

describe('question-by-question review paging', () => {
  const rows = Array.from({ length: 45 }, (_, i) => ({ q: `Q${i + 1}` }))

  it('loads the first 20 questions only', () => {
    const page = paginateQuestionReview(rows, 1)
    expect(QUESTION_REVIEW_PAGE_SIZE).toBe(20)
    expect(page.items.map((r) => r.q)).toEqual(rows.slice(0, 20).map((r) => r.q))
    expect(page.start).toBe(1)
    expect(page.end).toBe(20)
    expect(page.total).toBe(45)
    expect(page.totalPages).toBe(3)
    expect(page.hasPrev).toBe(false)
    expect(page.hasNext).toBe(true)
  })

  it('shows the next 20 on page 2 and the remainder on the last page', () => {
    const page2 = paginateQuestionReview(rows, 2)
    expect(page2.items.map((r) => r.q)).toEqual(rows.slice(20, 40).map((r) => r.q))
    expect(page2.start).toBe(21)
    expect(page2.end).toBe(40)
    expect(page2.hasPrev).toBe(true)
    expect(page2.hasNext).toBe(true)

    const last = paginateQuestionReview(rows, 3)
    expect(last.items).toHaveLength(5)
    expect(last.start).toBe(41)
    expect(last.end).toBe(45)
    expect(last.hasNext).toBe(false)
  })

  it('clamps an out-of-range page without changing the source list', () => {
    const overflow = paginateQuestionReview(rows, 99)
    expect(overflow.page).toBe(3)
    expect(overflow.items).toHaveLength(5)
    expect(rows).toHaveLength(45)
  })
})
