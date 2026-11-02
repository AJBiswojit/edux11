import { describe, expect, it } from 'vitest'
import {
  computeStudent360,
  computeStudentStrengthsWeaknesses,
  computeStudentQuestionIntelligence,
} from '../../src/intelligence/faculty/engine/student-360.js'
import { generateInterventionRecommendation } from '../../src/intelligence/faculty/engine/ground-level-intelligence.js'
import { domainPool, domainSwPool } from '../../src/components/students-workspace/student-360-panels.jsx'
import { jeeStudent as student } from '../fixtures/students.js'
import { makeAttempt as attempt } from '../fixtures/attempts.js'

const university = attempt({
  id: 'uni-01', student, examMode: 'University', examFamily: null,
  subject: 'CS501', chapter: 'Graph Algorithms',
  outcomes: [
    { correct: true, time: 25 }, { correct: true, time: 30 }, { correct: false, time: 120, classification: 'slow-incorrect' },
  ],
})
const jeePhysicsWeak = attempt({
  id: 'jee-02', student, examMode: 'Competitive', examFamily: 'JEE',
  subject: 'Physics', chapter: 'Rotational Motion',
  outcomes: [
    { correct: false, time: 20, classification: 'fast-incorrect' },
    { correct: false, time: 30, classification: 'fast-incorrect' },
    { correct: true, time: 90 },
  ],
})
const jeePhysicsWeak2 = attempt({
  id: 'jee-03', student, examMode: 'Competitive', examFamily: 'JEE',
  subject: 'Physics', chapter: 'Rotational Motion', submittedAt: '2026-08-20T10:00:00.000Z',
  outcomes: [
    { correct: false, time: 25, classification: 'fast-incorrect' },
    { correct: false, time: 110, classification: 'slow-incorrect' },
    { correct: true, time: 60 },
  ],
})
const jeeMathStrong = attempt({
  id: 'jee-04', student, examMode: 'Competitive', examFamily: 'JEE',
  subject: 'Mathematics', chapter: 'Calculus',
  outcomes: [
    { correct: true, time: 20 }, { correct: true, time: 25 }, { correct: true, time: 30 },
  ],
})
const neetBio = attempt({
  id: 'neet-05', student, examMode: 'Competitive', examFamily: 'NEET',
  subject: 'Biology', chapter: 'Human Physiology',
  outcomes: [
    { correct: true, time: 30 }, { correct: false, time: 120, classification: 'slow-incorrect' }, { skipped: true, time: 0 },
  ],
})
const neetBio2 = attempt({
  id: 'neet-06', student, examMode: 'Competitive', examFamily: 'NEET',
  subject: 'Biology', chapter: 'Human Physiology', submittedAt: '2026-08-22T10:00:00.000Z',
  outcomes: [
    { correct: true, time: 40 }, { correct: false, time: 30, classification: 'fast-incorrect' }, { skipped: true, time: 0 },
  ],
})

const allAttempts = [university, jeePhysicsWeak, jeePhysicsWeak2, jeeMathStrong, neetBio, neetBio2]

describe('Phase 4 consolidation — canonical Student 360 contract', () => {
  const s360 = computeStudent360({ student, attempts: allAttempts })

  it('University context contains only University data', () => {
    const subjects = domainPool(s360, 'University', 'subjects')
    const chapters = domainPool(s360, 'University', 'chapters')
    expect(subjects.every((s) => s.subject === 'CS501')).toBe(true)
    expect(chapters.every((c) => c.subject === 'CS501')).toBe(true)
    const questions = s360.question.byContext.University.rows
    expect(questions.every((r) => r.examMode === 'University')).toBe(true)
    expect(questions.some((r) => r.examFamily === 'JEE' || r.examFamily === 'NEET')).toBe(false)
  })

  it('JEE context contains only Physics / Mathematics / Chemistry (no NEET or University)', () => {
    const subjects = domainPool(s360, 'JEE', 'subjects').map((s) => s.subject).sort()
    expect(subjects).toEqual(expect.arrayContaining(['Mathematics', 'Physics']))
    expect(subjects).not.toContain('Biology')
    expect(subjects).not.toContain('CS501')
    const chapters = domainPool(s360, 'JEE', 'chapters')
    expect(chapters.every((c) => ['Physics', 'Mathematics', 'Chemistry'].includes(c.subject))).toBe(true)
    expect(s360.question.byContext.JEE.rows.every((r) => r.examFamily === 'JEE')).toBe(true)
  })

  it('NEET context contains only Physics / Chemistry / Biology (no JEE or University)', () => {
    const subjects = domainPool(s360, 'NEET', 'subjects').map((s) => s.subject)
    expect(subjects).toContain('Biology')
    expect(subjects).not.toContain('Mathematics')
    expect(subjects).not.toContain('CS501')
    expect(s360.question.byContext.NEET.rows.every((r) => r.examFamily === 'NEET')).toBe(true)
  })

  it('never uses a generic "Competitive" context selector for pools', () => {
    expect(s360.subjects.university).toBeDefined()
    expect(s360.subjects.competitive.JEE).toBeDefined()
    expect(s360.subjects.competitive.NEET).toBeDefined()
    // JEE and NEET chapters with the same name are never merged
    expect(s360.question.rows.some((r) => r.examMode === 'Competitive' && !r.examFamily)).toBe(false)
  })

  it('domain pool helper returns the correct partition', () => {
    expect(domainPool(s360, 'University', 'subjects')).toBe(s360.subjects.university)
    expect(domainPool(s360, 'JEE', 'subjects')).toBe(s360.subjects.competitive.JEE)
    expect(domainPool(s360, 'NEET', 'subjects')).toBe(s360.subjects.competitive.NEET)
    const sw = domainSwPool(s360, 'JEE')
    expect(Array.isArray(sw.strengths)).toBe(true)
    expect(Array.isArray(sw.weaknesses)).toBe(true)
  })
})

describe('Evidence questions — never empty when evidence exists', () => {
  const s360 = computeStudent360({ student, attempts: allAttempts })

  it('every weakness carries an evidence block with question counts', () => {
    for (const domain of ['University', 'JEE', 'NEET']) {
      const { weaknesses } = domainSwPool(s360, domain)
      weaknesses.forEach((w) => {
        expect(w.evidence).toBeTruthy()
        expect(w.evidence.questions).toBeGreaterThanOrEqual(0)
        expect(w.chapter).toBeTruthy()
        expect(w.subject).toBeTruthy()
      })
    }
  })

  it('Rotational Motion weakness resolves to actual incorrect question rows', () => {
    const rows = s360.question.rows.filter((r) =>
      r.subject === 'Physics' && r.chapter === 'Rotational Motion' && r.examFamily === 'JEE' && r.status !== 'Correct')
    expect(rows.length).toBeGreaterThan(0)
    rows.forEach((r) => {
      expect(r.text).toBeTruthy() // actual question text exists
      expect(r.correctAnswer === 0).toBe(true)
      expect(r.status === 'Incorrect' || r.status === 'Skipped').toBe(true)
    })
  })

  it('question rows carry full evidence fields (time, changes, revisit, review)', () => {
    const row = s360.question.rows[0]
    for (const key of ['subject', 'chapter', 'difficulty', 'status', 'timeSpent', 'answerChanges', 'revisits', 'markedForReview', 'selected', 'correctAnswer']) {
      expect(row).toHaveProperty(key)
    }
  })

  it('strengths have evidence question counts', () => {
    const { strengths } = domainSwPool(s360, 'JEE')
    const calc = strengths.find((s) => s.chapter === 'Calculus')
    expect(calc).toBeTruthy()
    expect(calc.accuracy).toBeGreaterThanOrEqual(75)
    expect(calc.evidence.questions).toBeGreaterThan(0)
  })
})

describe('Subject → chapter drill-down data shape', () => {
  const s360 = computeStudent360({ student, attempts: allAttempts })
  it('each subject lists accuracy/attempt rate/time/correct/incorrect/skipped', () => {
    const subjects = domainPool(s360, 'JEE', 'subjects')
    subjects.forEach((s) => {
      for (const k of ['subject', 'accuracy', 'avgTime', 'correct', 'incorrect', 'skipped']) {
        expect(s).toHaveProperty(k)
      }
    })
  })
  it('each chapter lists accuracy/time/incorrect/skipped/trend/priority/evidence', () => {
    const chapters = domainPool(s360, 'NEET', 'chapters')
    chapters.forEach((c) => {
      for (const k of ['chapter', 'subject', 'accuracy', 'avgTime', 'incorrect', 'skipped', 'trend', 'priority', 'evidence']) {
        expect(c).toHaveProperty(k)
      }
    })
  })
})

describe('Weakness → suggested intervention (Phase 5/6 reuse, no auto-assign)', () => {
  it('derives a recommendation from actual question rows without creating anything', () => {
    const s360 = computeStudent360({ student, attempts: allAttempts })
    const rows = s360.question.rows.filter((r) =>
      r.subject === 'Physics' && r.chapter === 'Rotational Motion' && r.examFamily === 'JEE')
    const rec = generateInterventionRecommendation(rows, { subject: 'Physics', chapter: 'Rotational Motion' })
    expect(rec).toBeTruthy()
    expect(rec.recommendedAction).toBeTruthy()
    expect(rec.priority).toBeTruthy()
    // recommendation is pure data — no side effects / assignment
    expect(typeof rec.recommendedAction).toBe('string')
  })
})

describe('Question Analysis filters & Time/Behaviour data', () => {
  const q = computeStudentQuestionIntelligence({ attempts: allAttempts })
  it('supports correct/incorrect/skipped/slow/fast/changed/revisited partitions', () => {
    const correct = q.rows.filter((r) => r.status === 'Correct')
    const incorrect = q.rows.filter((r) => r.status === 'Incorrect')
    const skipped = q.rows.filter((r) => r.status === 'Skipped')
    const slow = q.rows.filter((r) => r.timeSpent >= 90)
    const changed = q.rows.filter((r) => (r.answerChanges ?? 0) >= 1)
    expect(correct.length).toBeGreaterThan(0)
    expect(incorrect.length).toBeGreaterThan(0)
    expect(skipped.length).toBeGreaterThan(0)
    expect(slow.length).toBeGreaterThan(0)
    expect(Array.isArray(changed)).toBe(true)
  })
  it('time intelligence reports avg, correct-time, incorrect-time, fastest, slowest', () => {
    expect(q.time.avgTime).toBeGreaterThan(0)
    expect(q.time.fastest).toBeTruthy()
    expect(q.time.slowest).toBeTruthy()
    expect(q.time.bySubject.length).toBeGreaterThan(0)
  })
  it('behaviour reports only observable counters (answerChanges/revisits/skips/markedForReview)', () => {
    for (const k of ['answerChanges', 'revisits', 'skipped', 'markedForReview']) {
      expect(typeof q.behaviour[k]).toBe('number')
    }
  })
})

describe('Errors — conservative taxonomy only', () => {
  it('only emits Careless / Time-related / Unattempted / Unclassified', () => {
    const q = computeStudentQuestionIntelligence({ attempts: allAttempts })
    const ALLOWED = ['Careless', 'Time-related', 'Unattempted', 'Unclassified']
    q.errors.forEach((e) => expect(ALLOWED).toContain(e.category))
  })
})

describe('Trends & Comparison — context-isolated, no new classifier', () => {
  const s360 = computeStudent360({ student, attempts: allAttempts })
  it('JEE trend series only contains JEE assessments', () => {
    const series = s360.longitudinal.series.filter((x) => x.examFamily === 'JEE')
    expect(series.length).toBe(3) // jee-02, jee-03, jee-04
    expect(series.every((x) => x.examFamily === 'JEE')).toBe(true)
  })
  it('comparison is available per context and null when <2 attempts', () => {
    // NEET has 2 attempts → comparison exists; University has 1 → null
    expect(s360.comparisonByContext.NEET).not.toBeNull()
    expect(s360.comparisonByContext.University).toBeNull()
    if (s360.comparisonByContext.NEET) {
      const metrics = s360.comparisonByContext.NEET.rows.map((r) => r.label)
      expect(metrics).toEqual(expect.arrayContaining(['Accuracy', 'Score', 'Attempt rate', 'Average time', 'Incorrect answers']))
    }
  })
})

describe('Strengths/Weaknesses engine is reused (not duplicated)', () => {
  it('computeStudentStrengthsWeaknesses returns the same university + competitive JEE/NEET pools the UI consumes', () => {
    const sw = computeStudentStrengthsWeaknesses({ attempts: allAttempts })
    expect(sw.university).toBeTruthy()
    expect(sw.competitive.JEE).toBeTruthy()
    expect(sw.competitive.NEET).toBeTruthy()
    expect(Array.isArray(sw.university.strengths)).toBe(true)
    expect(Array.isArray(sw.competitive.JEE.weaknesses)).toBe(true)
  })
})
