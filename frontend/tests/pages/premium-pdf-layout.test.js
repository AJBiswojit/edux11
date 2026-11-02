import { describe, expect, it } from 'vitest'

import { LayoutAudit, validateLayout } from '../../src/pages/student/premium-pdf/layout.js'
import { CONTENT } from '../../src/pages/student/premium-pdf/theme.js'
import { buildPremiumFullModel, flattenSourceValues } from '../../src/pages/student/premium-pdf/model.js'
import * as legacyExports from '../../src/pages/student/exam-analysis-pdf.js'

describe('V2 measurement-driven layout audit', () => {
  it('detects unintended text and sibling-component intersections', () => {
    const audit = new LayoutAudit()
    const parent = audit.begin({ type: 'test-parent', x: 0, y: 0, w: 200, h: 100 })
    audit.record('text', 10, 10, 40, 10, { role: 'text', text: 'alpha' })
    audit.record('text', 20, 12, 40, 10, { role: 'text', text: 'beta' })
    audit.end(parent)
    const siblingA = audit.begin({ type: 'sibling-a', x: 0, y: 100, w: 100, h: 40 })
    audit.end(siblingA)
    const siblingB = audit.begin({ type: 'sibling-b', x: 50, y: 110, w: 100, h: 40 })
    audit.end(siblingB)
    const summary = validateLayout(audit)
    expect(summary.textTextOverlaps).toHaveLength(1)
    expect(summary.siblingComponentOverlaps).toHaveLength(1)
    expect(summary.zeroUnintendedOverlaps).toBe(false)
  })

  it('reports zero unintended intersections for contained, non-overlapping components', () => {
    const audit = new LayoutAudit()
    const x = CONTENT.x
    const y = CONTENT.y
    const parent = audit.begin({ type: 'editorial-columns', x, y, w: 200, h: 100 })
    const left = audit.begin({ type: 'column', x, y, w: 95, h: 100 })
    audit.record('text', x + 5, y + 5, 40, 10, { role: 'text', text: 'alpha' })
    audit.end(left)
    const right = audit.begin({ type: 'column', x: x + 105, y, w: 95, h: 100 })
    audit.record('text', x + 110, y + 5, 40, 10, { role: 'text', text: 'beta' })
    audit.end(right)
    audit.end(parent)
    const summary = validateLayout(audit)
    expect(summary.textTextOverlaps).toHaveLength(0)
    expect(summary.siblingComponentOverlaps).toHaveLength(0)
    expect(summary.zeroUnintendedOverlaps).toBe(true)
  })
})

describe('V2 dynamic data-model regressions', () => {
  const longChapter = 'Thermodynamics and Statistical Mechanics — Advanced Applications in Multi-Stage Reversible Processes with Non-Ideal Corrections and Extended Derivations'

  function fixture({ subjectCount = 3, questionCount = 32, score = 217, maxScore = 360 } = {}) {
    const subjectNames = ['Physics', 'Chemistry', 'Mathematics'].slice(0, subjectCount)
    return {
      meta: {
        examId: `QA-${subjectCount}-${questionCount}-${score}`,
        examName: 'Synthetic layout regression fixture',
        course: 'V2 validation paper',
        pattern: 'Mixed format',
        student: 'QA Fixture',
        rollNo: 'QA-0001',
        date: '2026-11-02',
        duration: '3 hrs',
        totalMarks: maxScore,
        sections: subjectNames,
        examStatus: 'Synthetic',
      },
      hero: {
        score, maxScore, percentage: Number(((score / maxScore) * 100).toFixed(1)),
        grade: 'B', rank: 91, percentile: 88.2, overallAccuracy: 66.7,
        aiSummary: 'Synthetic fixture with long labels, missing optional fields and multiple question pages.',
      },
      questionIntelligence: {
        total: questionCount, attempted: questionCount - 2,
        correct: Math.floor(questionCount * 0.6), incorrect: 8, skipped: 2,
        accuracy: 66.7, successRate: 65.3, negativeMarks: 4, guessAttempts: 2, attemptRatio: 90.7,
      },
      attempt: { elapsedSeconds: 5400 },
      subjects: subjectNames.map((name, index) => ({
        name, score: Math.floor(score / subjectCount), maxMarks: Math.floor(maxScore / subjectCount),
        accuracy: 55 + index * 7, time: 36 + index * 6, rank: index + 2,
        difficulty: ['Medium', 'Hard', 'Easy'][index % 3],
        attempted: 20, correct: 12, weakAreas: [longChapter], strongAreas: ['Kinematics'],
      })),
      chapters: Array.from({ length: subjectCount * 4 }, (_, index) => ({
        chapter: index === 0 ? longChapter : `${subjectNames[index % subjectCount]} Chapter ${index + 1}`,
        subject: subjectNames[index % subjectCount],
        accuracy: 40 + index * 4, marks: 4 + index, time: 3 + (index % 9),
        mastery: ['Critical', 'Weak', 'Average', 'Strong'][index % 4],
      })),
      topics: Array.from({ length: 8 }, (_, index) => ({
        topic: index === 0 ? longChapter : `Topic ${index + 1}`,
        subject: subjectNames[index % subjectCount],
        mastery: 38 + index * 7,
        level: ['Critical', 'Weak', 'Average', 'Strong'][index % 4],
      })),
      mistakes: [
        { category: 'Concept Error', count: 5 }, { category: 'Calculation Error', count: 4 },
        { category: 'Formula Error', count: 3 }, { category: 'Time Pressure', count: 2 },
      ],
      mistakeList: [
        { q: 'Q4', subject: subjectNames[0], category: 'Concept Error', topic: longChapter, detail: 'Used u = x² instead of u = x²+1' },
      ],
      difficulty: [
        { level: 'Easy', questions: 10, accuracy: 82, attempted: 10, time: 2.1 },
        { level: 'Medium', questions: 12, accuracy: 66, attempted: 11, time: 3.4 },
        { level: 'Hard', questions: 10, accuracy: 41, attempted: 8, time: 5.2 },
      ],
      timeIntelligence: {
        avgTimePerQuestion: 3.1, navigationCount: 11, timeManagementScore: 68,
        fastestQuestion: { q: 'Q1', time: 0.7 }, slowestQuestion: { q: `Q${questionCount}`, time: 7.9 },
        distribution: subjectNames.map((name, index) => ({ section: name, allocated: 60, used: 48 - index * 3, efficiency: 115 + index })),
      },
      comparison: {
        previousTest: { label: 'Previous test', score: 198, percentile: 84.1, grade: 'B' },
        batchAverage: { label: 'Batch average', score: 176, percentile: 80.2 },
        deltas: [{ label: 'vs previous test', value: '+19', up: true }],
      },
      recommendations: {
        weakChapters: [longChapter, 'Calculus (48%)'],
        weakTopics: [longChapter, 'Definite Integration'],
        priorityRevision: Array.from({ length: 12 }, (_, index) => ({
          topic: `${['Critical', 'High', 'Medium'][index % 3]} priority topic ${index + 1} — ${longChapter}`,
          priority: ['Critical', 'High', 'Medium'][index % 3],
          timeframe: ['48 hours', '5 days', '7 days', '10 days'][index % 4],
        })),
        suggestedPYQs: [{ title: 'Integration drill', source: 'PYQ Bank' }],
        practiceQuestions: [{ title: 'Substitution practice', count: 20, difficulty: 'Medium' }],
        mockTests: [{ title: 'Sectional mock', mode: 'Sectional' }],
        lectures: [{ title: 'Kinetics masterclass', type: 'Video' }],
      },
      prediction: {
        jeePercentile: 91.1, neetScore: null, expectedAIR: 21400, riskLevel: 'Medium',
        expectedImprovement: '+3.1%', targetProbability: 77,
        trajectory: [{ exam: 'QA 1', score: 190 }, { exam: 'QA 2', score }],
      },
      questionReview: Array.from({ length: questionCount }, (_, index) => ({
        q: `Q${index + 1}`,
        subject: subjectNames[index % subjectCount],
        chapter: index % 5 === 0 ? longChapter : `${subjectNames[index % subjectCount]} Chapter ${index + 1}`,
        topic: index % 4 === 0 ? longChapter : `Topic ${index + 1}`,
        difficulty: ['Easy', 'Medium', 'Hard'][index % 3],
        type: ['MCQ', 'Numerical', 'Assertion Reason'][index % 3],
        status: ['Correct', 'Incorrect', 'Skipped'][index % 3],
        marks: index % 3 === 1 ? -1 : 4,
        time: index % 7 === 0 ? 0 : Number((1.2 + (index % 9) * 0.7).toFixed(1)),
        selected: index % 7 === 0 ? null : index % 4,
        correctAnswer: index % 7 === 0 ? null : (index + 1) % 4,
        text: `Evaluate $x^{${index + 2}} + \\sqrt{${index + 2}}$.`,
        options: index % 7 === 0 ? undefined : ['2 s', '√3 s', '4 s', 'A very long alternative answer that must wrap'],
        explanation: index % 4 === 0
          ? 'A long derivation: $$\\int_0^1 \\frac{x^2}{\\sqrt{1-x^2}}\\,dx = \\frac{\\pi}{4}.$$ The limits remain $0$ to $\\pi/2$.'
          : 'FLAGGED SOURCE — $\\frac{1}{2$ is malformed and must be shown verbatim.',
      })),
    }
  }

  it('supports 2/3 subjects, 30+ question rows, long names, missing values, different scores and large revision lists without mutating the payload', () => {
    const cases = [
      fixture({ subjectCount: 2, questionCount: 32, score: 217, maxScore: 360 }),
      fixture({ subjectCount: 3, questionCount: 14, score: 91, maxScore: 120 }),
      fixture({ subjectCount: 3, questionCount: 6, score: 57, maxScore: 120 }),
    ]
    for (const data of cases) {
      const snapshot = JSON.stringify(data)
      const model = buildPremiumFullModel({
        data, subject: 'All Subjects', user: null,
        generatedAt: new Date('2026-11-02T09:00:00Z'),
      })
      expect(model.questions).toHaveLength(data.questionReview.length)
      expect(model.subjectValues).toHaveLength(data.subjects.length)
      expect(model.hero.score).toBe(data.hero.score)
      expect(model.questions.some((q) => q.chapter.includes('Thermodynamics'))).toBe(true)
      expect(model.questions.some((q) => q.selected === '—' && q.correct === '—')).toBe(true)
      expect(model.recommendations.priorityRevision).toHaveLength(12)
      expect(model.sourceValues.length).toBeGreaterThan(100)
      expect(JSON.stringify(data)).toBe(snapshot)
    }
  })

  it('keeps long source values and short numeric values in the preservation register', () => {
    const rows = flattenSourceValues({
      a: { b: 'Thermodynamics and Statistical Mechanics', c: 4, d: true, e: null },
      list: ['Q1', '—', '182/300'],
    })
    const values = rows.map((row) => row.value)
    expect(values).toContain('Thermodynamics and Statistical Mechanics')
    expect(values).toContain('4')
    expect(values).toContain('true')
    expect(values).toContain('Q1')
    expect(values).toContain('182/300')
    expect(values.filter((value) => value === '4')).toHaveLength(1)
  })

  it('preserves the original export API surface', () => {
    expect(typeof legacyExports.exportAnalysisPDF).toBe('function')
    expect(typeof legacyExports.exportFullAnalysisPDF).toBe('function')
    expect(typeof legacyExports.buildReportModel).toBe('function')
  })
})
