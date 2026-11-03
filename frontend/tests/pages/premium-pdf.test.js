import { describe, expect, it } from 'vitest'

import {
  buildPremiumFullModel,
  buildPremiumIntelligenceModel,
  flattenSourceValues,
} from '../../src/pages/student/premium-pdf/model.js'
import { isMalformedTeX, parseSolution } from '../../src/pages/student/premium-pdf/math.js'
import { isPresentIn } from '../../src/pages/student/premium-pdf/theme.js'

const sample = {
  meta: {
    examId: 'EX-2026-01', examName: 'JEE Main Mock <Test>', pattern: 'JEE Main (Paper 1)',
    student: 'Aarav Sharma', rollNo: '21CS114', date: '2026-08-01', duration: '3 hrs',
    totalMarks: 300, sections: ['Physics', 'Chemistry', 'Mathematics'],
  },
  hero: { score: 182, maxScore: 300, percentage: 60.7, overallAccuracy: 68.3, aiSummary: 'Strong conceptual grip.' },
  questionIntelligence: { total: 75, attempted: 68, correct: 47, incorrect: 14, skipped: 7, accuracy: 69.1, successRate: 65.3 },
  subjects: [{ name: 'Physics', score: 68, maxMarks: 100, accuracy: 72, time: 41 }],
  chapters: [{ chapter: 'Kinematics', subject: 'Physics', accuracy: 82, marks: 12, time: 9, attempted: 95, mastery: 'Strong' }],
  topics: [{ topic: 'Projectile motion', subject: 'Physics', mastery: 55, level: 'Weak' }],
  mistakes: [{ category: 'Concept Error', count: 3 }],
  mistakeList: [{ q: 'Q4', subject: 'Physics', category: 'Concept Error', topic: 'Kinematics', detail: 'Used u = x² instead of u = x²+1' }],
  difficulty: [{ level: 'Easy', questions: 30, accuracy: 82, attempted: 29, time: 3.1 }],
  timeIntelligence: { avgTimePerQuestion: 4.1, distribution: [{ section: 'Physics', allocated: 60, used: 52, efficiency: 115 }] },
  comparison: { previousTest: { label: 'Previous test', score: 168, percentile: 87.2, grade: 'B' } },
  recommendations: { weakChapters: ['Calculus (48%)'], weakTopics: ['Definite Integration'], priorityRevision: [{ topic: 'Definite Integration', priority: 'Critical', timeframe: '48 hours' }] },
  prediction: { jeePercentile: 96.2, expectedAIR: 11800, riskLevel: 'Low' },
  questionReview: [
    { q: 'Q1', subject: 'Physics', topic: 'Kinematics', type: 'MCQ', status: 'Correct', marks: 4, time: 2.1, selected: 0, correctAnswer: 0, explanation: 'A long explanation with \\(\\frac{1}{2}\\) and ∫ x² dx.' },
    { q: 'Q2', subject: 'Chemistry', topic: 'Organic', type: 'Numerical', status: 'Incorrect', marks: -1, time: 3.2 },
    { q: 'Q3', subject: 'Mathematics', topic: 'Calculus', type: 'MCQ', status: 'Skipped', marks: 0, time: 0 },
  ],
}

describe('premium PDF data model', () => {
  it('preserves every question-review row and never truncates explanations', () => {
    const model = buildPremiumFullModel({
      data: sample, subject: 'All Subjects', user: null, generatedAt: new Date('2026-11-02T00:00:00Z'),
    })
    expect(model.questions).toHaveLength(3)
    expect(model.questions[0].explanation).toContain('∫ x² dx')
    expect(model.questions[0].solutionParts[0].text).toBe(sample.questionReview[0].explanation)
    expect(model.questions.map((q) => q.q)).toEqual(['Q1', 'Q2', 'Q3'])
    expect(model.questions[1].selected).toBe('—')
    expect(model.questions[1].correct).toBe('—')
    expect(model.status).toBe('—')
    expect(model.reportTitle).toBe('FULL EXAM ANALYSIS REPORT')
  })

  it('supports a different subject combination and score without mutating the payload', () => {
    const data = structuredClone(sample)
    data.hero.score = 91
    data.hero.maxScore = 120
    data.meta.sections = ['Physics', 'Chemistry']
    data.subjects = [
      { name: 'Physics', score: 51, maxMarks: 60, accuracy: 80, time: 20 },
      { name: 'Chemistry', score: 40, maxMarks: 60, accuracy: 64, time: 22 },
    ]
    const snapshot = JSON.stringify(data)
    const model = buildPremiumIntelligenceModel({
      data, subject: 'Physics', user: null, generatedAt: new Date('2026-11-02T00:00:00Z'),
    })
    expect(model.reportTitle).toBe('EXAM INTELLIGENCE REPORT')
    expect(model.activeSubject).toBe('Physics')
    expect(model.subjectValues).toHaveLength(1)
    expect(model.hero.score).toBe(91)
    expect(JSON.stringify(data)).toBe(snapshot)
  })

  it('flattens nested source values, skips nulls and de-duplicates', () => {
    const rows = flattenSourceValues({ a: { b: 'Physics', c: null }, d: ['Physics', 4, true] })
    const values = rows.map((row) => row.value)
    expect(values).toContain('Physics')
    expect(values).toContain('4')
    expect(values).toContain('true')
    expect(values.filter((value) => value === 'Physics')).toHaveLength(1)
    expect(rows.find((row) => row.path === 'a.b')).toBeTruthy()
  })
})

describe('premium PDF mathematical source handling', () => {
  it('recognises inline and display mathematics without rewriting source', () => {
    const segments = parseSolution('The result is $\\frac{1}{2}$ and $$\\int_0^1 x^2 dx = \\frac{1}{3}$$ with $\\alpha^2$.')
    expect(segments.filter((segment) => segment.type === 'math')).toHaveLength(3)
    expect(segments.find((segment) => segment.type === 'math' && segment.display)?.tex).toContain('\\int')
    expect(segments.some((segment) => segment.type === 'text' && segment.value.includes('The result is'))).toBe(true)
  })

  it('flags malformed expressions instead of guessing a correction', () => {
    expect(isMalformedTeX('\\frac{1}{2')).toBe(true)
    expect(isMalformedTeX('\\begin{aligned} a &= b')).toBe(true)
    expect(isMalformedTeX('\\frac{1}{2}')).toBe(false)
    const segments = parseSolution('Source: $\\frac{1}{2$ remains unverified.')
    expect(segments.some((segment) => segment.type === 'malformed')).toBe(true)
  })

  it('uses word boundaries for short numeric source values', () => {
    expect(isPresentIn('Marks 4 of 300 | Q14', '4')).toBe(true)
    expect(isPresentIn('Q14 only', '4')).toBe(false)
    expect(isPresentIn('Score 60.7%', '60.7')).toBe(true)
  })
})

describe('premium PDF student identity', () => {
  it('uses the explicitly supplied student identity for faculty/admin exports', () => {
    const model = buildPremiumIntelligenceModel({
      data: sample,
      subject: 'All Subjects',
      user: { fullName: 'Dev Student', rollNo: 'DEV-STU-001' },
      generatedAt: new Date('2026-09-22T00:00:00Z'),
    })
    expect(model.studentName).toBe('Dev Student')
    expect(model.rollNo).toBe('DEV-STU-001')
    expect(model.who).toContain('Dev Student')
    expect(model.who).toContain('DEV-STU-001')
    expect(model.studentName).not.toBe('Aarav Sharma')
  })

  it('keeps both report kinds on the same identity contract', () => {
    const user = { fullName: 'Dev Student', rollNo: 'DEV-STU-001' }
    const intelligence = buildPremiumIntelligenceModel({ data: sample, subject: 'All Subjects', user, generatedAt: new Date('2026-09-22T00:00:00Z') })
    const full = buildPremiumFullModel({ data: sample, subject: 'All Subjects', user, generatedAt: new Date('2026-09-22T00:00:00Z') })
    expect(intelligence.studentName).toBe('Dev Student')
    expect(full.studentName).toBe('Dev Student')
    expect(intelligence.rollNo).toBe(full.rollNo)
  })
})
