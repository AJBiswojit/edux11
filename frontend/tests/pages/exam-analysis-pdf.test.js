import { describe, expect, it } from 'vitest'
import {
  analysisPdfUser,
  badgeClassFor,
  buildAnalysisPdfHtml,
  buildReportModel,
  buildReportPdf,
  formatReportTime,
  htmlEscape,
  masteryFromAccuracy,
  optLetter,
} from '../../src/pages/student/exam-analysis-pdf.js'

const sample = {
  meta: {
    examName: 'JEE Mock <Alpha>',
    pattern: 'JEE Main',
    examStatus: 'Completed',
    date: '2026-09-01',
    duration: 180,
  },
  hero: {
    score: 142,
    maxScore: 300,
    percentage: 47.3,
    grade: 'C',
    readinessScore: 47,
    aiSummary: 'Needs more practice in Physics.',
  },
  questionIntelligence: {
    attempted: 70,
    correct: 40,
    incorrect: 20,
    skipped: 5,
    successRate: 57.1,
  },
  timeIntelligence: {
    avgTimePerQuestion: 1.5,
    fastestQuestion: { q: 'Q2', time: 0.5 },
    slowestQuestion: { q: 'Q9', time: 3 },
    timeManagementScore: 72,
    distribution: [
      { section: 'Physics', used: 40, allocated: 60 },
      { section: 'Chemistry', used: 0, allocated: 60 },
    ],
  },
  attempt: { elapsedSeconds: 3402 },
  subjects: [
    { name: 'Physics', score: 48, maxMarks: 100, accuracy: 80, time: 1.5 },
    { name: 'Chemistry', score: 20, maxMarks: 100, accuracy: 30, time: 0 },
  ],
  chapters: [
    { chapter: 'Kinematics', subject: 'Physics', accuracy: 80, marks: 12, time: 0.75, mastery: 'Strong' },
  ],
  mistakes: [{ category: 'Careless Mistake', count: 2 }],
  mistakeList: [{ q: 'Q4', subject: 'Physics', topic: 'Kinematics', detail: 'Wrong sign.' }],
  recommendations: {
    weakChapters: ['Organic Chemistry'],
    weakTopics: ['GOC'],
    priorityRevision: [{ topic: 'GOC', timeframe: 'This week', priority: 'High' }],
  },
  questionReview: [
    { q: 'Q1', subject: 'Physics', topic: 'Kinematics', status: 'Correct', marks: 4, selected: 0, correctAnswer: 0, time: 1.5 },
    { q: 'Q2', subject: 'Chemistry', topic: 'GOC', status: 'Incorrect', marks: -1, selected: 1, correctAnswer: 2, time: 0 },
  ],
}

function render(overrides = {}) {
  return buildAnalysisPdfHtml({
    data: { ...sample, ...overrides },
    subject: 'All Subjects',
    user: { fullName: 'Aarav <Test>', rollNo: 'R1' },
    logoSrc: 'data:image/svg+xml,%3Csvg/%3E',
    generatedAt: new Date('2026-09-22T00:00:00Z'),
  })
}

describe('exam analysis PDF helpers', () => {
  it('escapes HTML in interpolated values', () => {
    expect(htmlEscape('A <B> & "C"')).toBe('A &lt;B&gt; &amp; &quot;C&quot;')
  })

  it('formats stored minutes and hides zeros', () => {
    expect(formatReportTime(1.5)).toBe('1m 30s')
    expect(formatReportTime(0.75)).toBe('45s')
    expect(formatReportTime(40)).toBe('40m')
    expect(formatReportTime(0)).toBe('—')
    expect(formatReportTime(null)).toBe('—')
  })

  it('derives mastery from accuracy when the API omits it', () => {
    expect(masteryFromAccuracy(80)).toBe('Strong')
    expect(masteryFromAccuracy(62)).toBe('Average')
    expect(masteryFromAccuracy(50)).toBe('Weak')
    expect(masteryFromAccuracy(20)).toBe('Critical')
    expect(badgeClassFor('Strong')).toBe('badge-success')
    expect(optLetter(2)).toBe('C')
  })

  it('prefers the logged-in student, then the faculty analysis payload', () => {
    expect(analysisPdfUser({}, { fullName: 'Aarav', rollNo: 'R1' })).toEqual({ fullName: 'Aarav', rollNo: 'R1' })
    expect(analysisPdfUser({
      student: { fullName: 'Meera Student', rollNo: 'N24-104' },
      attempt: { roll: 'ignored' },
    })).toEqual({ fullName: 'Meera Student', rollNo: 'N24-104' })
    expect(analysisPdfUser({
      meta: { rollNo: null },
      attempt: { roll: '21CS114', studentName: 'Ishita Gupta' },
    })).toEqual({ fullName: 'Ishita Gupta', rollNo: '21CS114' })
  })
})

describe('exam analysis PDF document', () => {
  it('uses a color report layout with the MediXO logo', () => {
    const html = render()
    expect(html).toContain('class="page-frame"')
    expect(html).toContain('class="logo-mark"')
    expect(html).toContain('class="footer"')
    expect(html).not.toContain('className=')
    expect(html).toContain('MediXO EduX')
    expect(html).toContain('#4f46e5')
    expect(html).toContain('#0f172a')
    expect(html).toContain('Chapter time consumption')
    expect(html).toContain('Time Spent')
    expect(html).toContain('45s')
    expect(html).not.toContain('grade-pill')
  })

  it('escapes exam and student names so markup cannot break the report', () => {
    const html = render()
    expect(html).toContain('JEE Mock &lt;Alpha&gt;')
    expect(html).toContain('Aarav &lt;Test&gt;')
    expect(html).not.toContain('JEE Mock <Alpha>')
  })

  it('shows overall time taken and chapter time, and omits per-question time', () => {
    const html = render()
    expect(html).toContain('Time taken')
    expect(html).toContain('56m 42s')
    expect(html).toContain('Kinematics')
    expect(html).toContain('45s')
    expect(html).toContain('100%')
    expect(html).not.toContain('Question-by-question')
    expect(html).not.toContain('% eff')
    expect(html).not.toContain('Readiness')
    expect(html).not.toContain('hero-score')
  })

  it('explains missing timing instead of fabricating zeros', () => {
    const html = render({
      attempt: { elapsedSeconds: 0 },
      timeIntelligence: { avgTimePerQuestion: 0, distribution: [] },
      subjects: [{ name: 'Physics', score: 10, maxMarks: 20, accuracy: 50, time: 0 }],
      chapters: [{ chapter: 'Waves', subject: 'Physics', accuracy: 50, marks: 4, time: 0, mastery: 'Weak' }],
      questionReview: [{ q: 'Q1', subject: 'Physics', topic: 'X', status: 'Correct', marks: 4, selected: 0, correctAnswer: 0, time: 0 }],
    })
    expect(html).toContain('Timing was not recorded')
    expect(html).toContain('Chapter timing was not recorded')
    expect(html).not.toMatch(/(?:^|[^0-9])0 min/)
  })

  it('labels score separately from accuracy', () => {
    const html = render()
    expect(html).toContain('Score')
    expect(html).toContain('Accuracy')
    expect(html).toContain('47.3%')
    expect(html).toContain('57.1%')
  })
})

describe('exam analysis PDF file', () => {
  it('draws a color report with chapter time and an embedded logo', () => {
    const model = buildReportModel({
      data: sample,
      subject: 'All Subjects',
      user: { fullName: 'Aarav', rollNo: 'R1' },
      generatedAt: new Date('2026-09-22T00:00:00Z'),
    })
    expect(model.chapters[0].time).toBe('45s')
    expect(model.chapters[0].share).toBe('100%')
    expect(model.hasChapterTime).toBe(true)
    expect(model.subjects.find((s) => s.name === 'Physics').timeSpent).toBe('45s')
    expect(model.subjects.find((s) => s.name === 'Chemistry').timeSpent).toBe('—')

    const summed = buildReportModel({
      data: {
        ...sample,
        chapters: [
          { chapter: 'Kinematics', subject: 'Physics', accuracy: 80, marks: 12, time: 10 },
          { chapter: 'Waves', subject: 'Physics', accuracy: 50, marks: 4, time: 5.5 },
          { chapter: 'GOC', subject: 'Chemistry', accuracy: 30, marks: 2, time: 2 },
        ],
      },
      subject: 'All Subjects',
      user: { fullName: 'Aarav', rollNo: 'R1' },
      generatedAt: new Date('2026-09-22T00:00:00Z'),
    })
    expect(summed.subjects.find((s) => s.name === 'Physics').timeSpent).toBe('15m 30s')
    expect(summed.subjects.find((s) => s.name === 'Chemistry').timeSpent).toBe('2m')

    const bytes = buildReportPdf(model, {
      width: 2,
      height: 2,
      rgb: new Uint8Array([15, 23, 42, 34, 211, 238, 37, 99, 235, 255, 255, 255]),
    })
    const text = new TextDecoder('latin1').decode(bytes)
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text.includes('45s')).toBe(true)
    expect(text.includes('Time Spent')).toBe(true)
    expect(text.includes('Chapter time consumption')).toBe(true)
    expect(text.includes('/Subtype /Image')).toBe(true)
    expect(text.includes('0.310 0.275 0.898')).toBe(true)
    expect(text.includes('0.059 0.090 0.165')).toBe(true)
    const start = Number(text.match(/startxref\n(\d+)/)[1])
    expect(new TextDecoder().decode(bytes.slice(start, start + 4))).toBe('xref')
  })

  it('lists weak topics under each subject and omits chapter revision rows', () => {
    const extraChapters = Array.from({ length: 8 }, (_, index) => ({
      chapter: `Extra Chapter ${index + 1}`,
      subject: 'Physics',
      accuracy: 20 + index,
      attempted: 100,
      questions: 2,
      mastery: 'Critical',
    }))
    const data = {
      ...sample,
      subjects: [
        { name: 'Physics', score: 20, maxMarks: 100, accuracy: 42, time: 1 },
        { name: 'Chemistry', score: 30, maxMarks: 100, accuracy: 55, time: 1 },
        { name: 'Biology', score: 80, maxMarks: 100, accuracy: 82, time: 1 },
      ],
      chapters: [
        { chapter: 'Physics', subject: 'Physics', accuracy: 20, attempted: 90, questions: 8, mastery: 'Critical' },
        { chapter: 'Electromagnetic Waves', subject: 'Physics', accuracy: 30, attempted: 100, questions: 4, mastery: 'Critical' },
        { chapter: 'Kinematics', subject: 'Physics', accuracy: 90, attempted: 100, questions: 4, mastery: 'Strong' },
        { chapter: 'Structure of Atom', subject: 'Chemistry', accuracy: 50, attempted: 100, questions: 5, mastery: 'Weak' },
        { chapter: 'Some Basic Concepts of Chemistry', subject: 'Chemistry', accuracy: 61, attempted: 100, questions: 3, mastery: 'Average' },
        { chapter: 'Animal Kingdom', subject: 'Biology', accuracy: 40, attempted: 100, questions: 4, mastery: 'Weak' },
        { chapter: 'Waves', subject: 'Physics', accuracy: 80, attempted: 20, questions: 5, mastery: 'Strong' },
        ...extraChapters,
      ],
      topics: [
        { topic: 'Average and Instantaneous Velocity', subject: 'Physics', chapter: 'Kinematics', mastery: 35, level: 'Critical' },
        { topic: 'Relative Velocity in 2D', subject: 'Physics', mastery: 48, level: 'Weak' },
        { topic: 'Physics', subject: 'Physics', chapter: 'Physics', mastery: 42, level: 'Weak' },
        { topic: 'Rutherford Model', subject: 'Chemistry', chapter: 'Structure of Atom', mastery: 22, level: 'Critical' },
        { topic: 'Thomson Model', subject: 'Chemistry', mastery: 44, level: 'Weak' },
        { topic: 'Structure of Atom', subject: 'Chemistry', chapter: 'Structure of Atom', mastery: 50, level: 'Weak' },
        { topic: 'Kinematics', subject: 'Physics', chapter: 'Kinematics', mastery: 90, level: 'Strong' },
      ],
      questionReview: [
        { q: 'Q9', subject: 'Physics', chapter: 'Kinematics', topic: 'Relative Velocity in 2D', status: 'Incorrect' },
        { q: 'Q10', subject: 'Chemistry', chapter: 'Structure of Atom', topic: 'Thomson Model', status: 'Incorrect' },
        { q: 'Q11', subject: 'Chemistry', topic: 'GOC', status: 'Incorrect' },
      ],
      recommendations: { weakChapters: ['Organic Chemistry'], weakTopics: ['GOC'] },
    }
    const model = buildReportModel({
      data,
      subject: 'All Subjects',
      user: { fullName: 'Aarav', rollNo: 'R1' },
      generatedAt: new Date('2026-09-22T00:00:00Z'),
    })
    expect(model.revisionGroups.map((group) => group.subject)).toEqual(['Chemistry', 'Physics'])

    const physics = model.revisionGroups.find((group) => group.subject === 'Physics')
    expect(physics.mastery).toBe('Critical')
    expect(physics.topics.map((row) => row.name)).toEqual([
      'Average and Instantaneous Velocity',
      'Relative Velocity in 2D',
    ])
    expect(physics.topics.find((row) => row.name === 'Average and Instantaneous Velocity').chapter).toBe('Kinematics')
    expect(physics.topics.find((row) => row.name === 'Relative Velocity in 2D').chapter).toBe('Kinematics')

    const chemistry = model.revisionGroups.find((group) => group.subject === 'Chemistry')
    expect(chemistry.topics.map((row) => row.name)).toEqual([
      'Rutherford Model',
      'Thomson Model',
      'Structure of Atom',
      'GOC',
    ])
    expect(chemistry.topics.find((row) => row.name === 'Rutherford Model')).toMatchObject({
      chapter: 'Structure of Atom',
      priority: 'Critical',
    })
    expect(chemistry.topics.find((row) => row.name === 'Thomson Model').chapter).toBe('Structure of Atom')
    expect(model.revisionGroups.find((group) => group.subject === 'Biology')).toBeUndefined()

    const html = buildAnalysisPdfHtml({
      data,
      subject: 'All Subjects',
      user: { fullName: 'Aarav', rollNo: 'R1' },
      logoSrc: 'data:image/svg+xml,%3Csvg/%3E',
      generatedAt: new Date('2026-09-22T00:00:00Z'),
    })
    expect(html).toContain('Revision priorities')
    expect(html).toContain('Topics to revise')
    expect(html).toContain('Rutherford Model')
    expect(html).not.toContain('Chapters to revise')
    expect(html).not.toContain('Other questions in this section')
    expect(html).not.toContain('>Item<')
    expect(html).not.toContain('>Type<')

    const bytes = buildReportPdf(model, null)
    const text = new TextDecoder('latin1').decode(bytes)
    expect(text.includes('Topics to revise')).toBe(true)
    expect(text.includes('Chapters to revise')).toBe(false)
    expect(text.includes('Other questions in this section')).toBe(false)
    expect(text.includes('Rutherford Model')).toBe(true)
    expect(text.includes('Average and Instantaneous Velocity')).toBe(true)
  })
})
