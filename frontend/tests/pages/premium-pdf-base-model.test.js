import { describe, expect, it } from 'vitest'
import { buildBaseReportModel } from '../../src/pages/student/premium-pdf/base-model.js'

const sample = {
  meta: { examName: 'JEE Mock <Alpha>', pattern: 'JEE Main', date: '2026-09-01', duration: 180 },
  hero: { score: 142, maxScore: 300, percentage: 47.3, aiSummary: 'Needs more practice in Physics.' },
  questionIntelligence: { attempted: 70, correct: 40, incorrect: 20, skipped: 5, successRate: 57.1 },
  attempt: { elapsedSeconds: 3402 },
  subjects: [
    { name: 'Physics', score: 48, maxMarks: 100, accuracy: 80, time: 1.5 },
    { name: 'Chemistry', score: 20, maxMarks: 100, accuracy: 30, time: 0 },
  ],
  chapters: [{ chapter: 'Kinematics', subject: 'Physics', accuracy: 80, marks: 12, time: 0.75, mastery: 'Strong' }],
  topics: [{ topic: 'Projectile motion', subject: 'Physics', mastery: 35 }],
  mistakes: [{ category: 'Careless Mistake', count: 2 }],
  recommendations: { weakChapters: ['Organic Chemistry'], weakTopics: ['GOC'] },
  questionReview: [
    { q: 'Q1', subject: 'Physics', topic: 'Kinematics', chapter: 'Kinematics', status: 'Correct', marks: 4, time: 1.5 },
    { q: 'Q2', subject: 'Chemistry', topic: 'GOC', chapter: 'GOC', status: 'Incorrect', marks: -1, time: 0 },
  ],
}

const base = (overrides = {}, subject = 'All Subjects') => buildBaseReportModel({
  data: { ...sample, ...overrides },
  subject,
  user: { fullName: 'Aarav Sharma', rollNo: '21CS114' },
  generatedAt: new Date('2026-09-22T00:00:00Z'),
})

describe('premium base model (replaces the legacy buildReportModel)', () => {
  it('normalises exam, subject scope, score and identity without drawing PDF bytes', () => {
    const model = base()
    expect(model.examName).toBe('JEE Mock <Alpha>')
    expect(model.subjectText).toBe('All Subjects')
    expect(model.pattern).toBe('JEE Main')
    expect(model.scoreLine).toBe('142 / 300 marks')
    expect(model.breakdownLine).toBe('40 correct | 20 incorrect | 5 skipped')
    expect(model.scorePct).toBe('47.3%')
    expect(model.accuracy).toBe('57.1%')
    expect(model.who).toBe('Aarav Sharma | Roll No: 21CS114')
    expect(model.durationLabel).toBe('180 min')
  })

  it('honours a single-subject scope', () => {
    const model = base({}, 'Physics')
    expect(model.subjectText).toBe('Physics')
    expect(model.subjects.map((s) => s.name)).toEqual(['Physics'])
    expect(model.chapters.every((c) => c.subject === 'Physics')).toBe(true)
  })

  it('keeps chapter and subject time calculations used by the premium renderer', () => {
    const model = base()
    expect(model.chapters[0].time).toBe('45s')
    expect(model.chapters[0].share).toBe('100%')
    expect(model.hasChapterTime).toBe(true)
    expect(model.subjects.find((s) => s.name === 'Physics').timeSpent).toBe('45s')
    expect(model.subjects.find((s) => s.name === 'Chemistry').timeSpent).toBe('—')

    const summed = base({
      chapters: [
        { chapter: 'Kinematics', subject: 'Physics', accuracy: 80, marks: 12, time: 10 },
        { chapter: 'Waves', subject: 'Physics', accuracy: 50, marks: 4, time: 5.5 },
        { chapter: 'GOC', subject: 'Chemistry', accuracy: 30, marks: 2, time: 2 },
      ],
    })
    expect(summed.subjects.find((s) => s.name === 'Physics').timeSpent).toBe('15m 30s')
    expect(summed.subjects.find((s) => s.name === 'Chemistry').timeSpent).toBe('2m')
  })

  it('still produces the revision groups consumed by premium intelligence/full reports', () => {
    const model = base({
      subjects: [
        { name: 'Physics', score: 20, maxMarks: 100, accuracy: 42, time: 1 },
        { name: 'Chemistry', score: 30, maxMarks: 100, accuracy: 55, time: 1 },
      ],
      chapters: [
        { chapter: 'Structure of Atom', subject: 'Chemistry', accuracy: 50, marks: 5, time: 0 },
        { chapter: 'Kinematics', subject: 'Physics', accuracy: 90, marks: 4, time: 0 },
      ],
      topics: [
        { topic: 'Rutherford Model', subject: 'Chemistry', chapter: 'Structure of Atom', mastery: 22 },
        { topic: 'Average Velocity', subject: 'Physics', chapter: 'Kinematics', mastery: 35 },
        { topic: 'Strong Topic', subject: 'Physics', mastery: 90 },
      ],
      recommendations: { weakTopics: ['GOC'] },
    })
    const groups = model.revisionGroups
    expect(groups.map((g) => g.subject)).toEqual(['Chemistry', 'Physics'])
    expect(groups.find((g) => g.subject === 'Chemistry').topics.map((t) => t.name)).toContain('Rutherford Model')
    expect(groups.find((g) => g.subject === 'Physics').topics.map((t) => t.name)).toContain('Average Velocity')
    expect(groups.every((g) => g.topics.every((t) => t.name !== 'Strong Topic'))).toBe(true)
  })
})
