/**
 * Live question source — the ONLY runtime question record source.
 *
 * Acceptance criteria (FRONTEND-SEEDED-QUESTION-REMOVAL):
 *   1. GET /faculty/question-bank returning questions: [] must yield an
 *      empty record list everywhere (no seeded fallback).
 *   2. Question-derived stats must be re-derived from the live bank, never
 *      from a summary payload that may embed seeded bank records.
 *   3. University / JEE / NEET isolation follows payload identity
 *      (domain / examFamily) — never the subject name.
 */
import { describe, expect, it } from 'vitest'
import {
  bankPyqBrowserRecords,
  isPyqQuestion,
  isUniversityDomainQuestion,
  normalizeQuestion,
  toCompetitiveBrowserQuestion,
} from '../../src/api/adapters/questions'
import { computeQuestionStats, withLiveQuestionStats } from '../../src/intelligence/faculty/engine/assessment'

/* A bank payload exactly like the real backend's empty response. */
const EMPTY_BANK = { summary: { total: 0, bySubject: {}, page: 1, limit: 50 }, questions: [], total: 0, page: 1, limit: 50 }

/* Records shaped like the seeded lists embedded in the faculty-intelligence
   summary payload (UPYQ-* / CQ-* ids) — these must NEVER be rendered. */
const SEEDED_UNIVERSITY_PYQ = {
  id: 'UPYQ-CS501-001',
  exam: 'University',
  year: '2025',
  session: 'End Sem',
  subject: 'CS501',
  question: 'Trace Dijkstra shortest paths on a 5-vertex weighted graph from a given source.',
  options: ['Adjacency matrix', 'Min-heap priority queue', 'Stack', 'Queue only'],
  answer: 'B',
  isPyq: true,
}

describe('empty backend means empty UI data', () => {
  it('an empty question-bank response produces zero PYQ records', () => {
    expect(bankPyqBrowserRecords(EMPTY_BANK.questions)).toEqual([])
    expect(bankPyqBrowserRecords(EMPTY_BANK.questions, { domain: 'University' })).toEqual([])
    expect(bankPyqBrowserRecords(EMPTY_BANK.questions, { domain: 'Competitive' })).toEqual([])
  })

  it('an empty bank yields neutral question stats (no fabricated averages)', () => {
    const stats = computeQuestionStats({ questionBank: EMPTY_BANK })
    expect(stats.total).toBe(0)
    expect(stats.questions).toEqual([])
    expect(stats.difficultyDistribution).toEqual([])
    expect(stats.bloomDistribution).toEqual([])
    expect(stats.topicCoverage).toEqual([])
    expect(stats.totalUsage).toBe(0)
  })

  it('withLiveQuestionStats replaces payload stats with live-bank stats', () => {
    const intel = {
      derived: {
        assessment: {
          questionStats: { total: 14, avgAccuracy: 80.4, qualityAvg: 75, bySubject: { CS501: 8 } },
        },
      },
    }
    const merged = withLiveQuestionStats(intel, EMPTY_BANK)
    const stats = merged.derived.assessment.questionStats
    expect(stats.total).toBe(0)
    expect(stats.bySubject).toEqual({})
    /* No measured rows → averages collapse to null (UI renders '—'). */
    expect(stats.avgAccuracy).toBeNull()
    expect(stats.qualityAvg).toBeNull()
    /* Nothing else in the payload is touched. */
    expect(merged.derived.assessment.questionStats.total).toBeDefined()
  })

  it('withLiveQuestionStats derives real distributions when the bank has rows', () => {
    const bank = {
      summary: { total: 2, bySubject: { CS501: 1, CS503: 1 } },
      questions: [
        normalizeQuestion({ id: 'QB-1', subject: 'CS501', text: 'uni question', domain: 'University', difficulty: 'easy', type: 'mcq', accuracy: 70 }),
        normalizeQuestion({ id: 'EA-JEE-PHY-01-Q01', subject: 'Physics', text: 'jee question', difficulty: 'medium', type: 'mcq', accuracy: 90 }),
      ],
    }
    const merged = withLiveQuestionStats({ derived: { assessment: { questionStats: { total: 14 } } } }, bank)
    const stats = merged.derived.assessment.questionStats
    expect(stats.total).toBe(2)
    expect(stats.avgAccuracy).toBe(80)
    expect(stats.difficultyDistribution.map((d) => d.level).sort()).toEqual(['Easy', 'Medium'])
  })

  it('non-object intel payloads pass through untouched', () => {
    expect(withLiveQuestionStats(undefined, EMPTY_BANK)).toBeUndefined()
  })
})

describe('PYQ records derive only from the live bank', () => {
  const bank = [
    normalizeQuestion({ id: 'QB-U-1', subject: 'CS501', text: 'University PYQ stem', domain: 'University', isPyq: true, pyqYear: 2024 }),
    normalizeQuestion({ id: 'QB-U-2', subject: 'CS503', text: 'University non-PYQ stem', domain: 'University', isPyq: false }),
    normalizeQuestion({ id: 'EA-JEE-PHY-01-Q01', subject: 'Physics', text: 'JEE PYQ stem', domain: 'Competitive', examFamily: 'JEE', isPyq: true, pyqYear: 2025 }),
    normalizeQuestion({ id: 'EA-NEET-BIO-01-Q02', subject: 'Biology', text: 'NEET PYQ stem', domain: 'Competitive', examFamily: 'NEET', pyqFrequency: 3 }),
    normalizeQuestion({ id: 'EA-JEE-MAT-01-Q03', subject: 'Mathematics', text: 'JEE non-PYQ stem', domain: 'Competitive', examFamily: 'JEE' }),
  ]

  it('isPyqQuestion honours backend flags only', () => {
    expect(isPyqQuestion({ isPyq: true })).toBe(true)
    expect(isPyqQuestion({ pyqFrequency: 2 })).toBe(true)
    expect(isPyqQuestion({ pyqYear: 2023 })).toBe(true)
    expect(isPyqQuestion({ isPyq: false, pyqFrequency: 0 })).toBe(false)
    expect(isPyqQuestion(null)).toBe(false)
  })

  it('university PYQ browser receives only university-domain PYQ records', () => {
    const records = bankPyqBrowserRecords(bank, { domain: 'University' })
    expect(records).toHaveLength(1)
    expect(records[0].bankId).toBe('QB-U-1')
    expect(records[0].exam).toBe('University')
  })

  it('competitive PYQ browser receives only competitive PYQ records', () => {
    const records = bankPyqBrowserRecords(bank, { domain: 'Competitive' })
    expect(records.map((r) => r.bankId).sort()).toEqual(['EA-JEE-PHY-01-Q01', 'EA-NEET-BIO-01-Q02'])
  })

  it('PYQ-derived browser records carry stems, options and answers for the UI', () => {
    const [record] = bankPyqBrowserRecords([SEEDED_UNIVERSITY_PYQ], { domain: 'University' })
    expect(record.question).toContain('Dijkstra')
    expect(record.options).toHaveLength(4)
    expect(record.answer).toBe('B')
    expect(record.isPyq).toBe(true)
    expect(record.year).toBe('2025')
  })

  it('never derives exam family from the subject name', () => {
    const physics = normalizeQuestion({ id: 'QB-P-1', subject: 'Physics', text: 'A physics item' })
    expect(physics.domain).toBeNull()
    expect(physics.examFamily).toBeNull()
    expect(isUniversityDomainQuestion(physics)).toBe(true) /* no identity → university pool */
  })

  it('identity always comes from payload domain / examFamily or backend id prefixes', () => {
    const jee = normalizeQuestion({ id: 'X', subject: 'Physics', text: 'x', domain: 'competitive', examFamily: 'jee' })
    const neet = normalizeQuestion({ id: 'Y', subject: 'Physics', text: 'y', domain: 'Competitive', examFamily: 'NEET' })
    expect(jee.examFamily).toBe('JEE')
    expect(neet.examFamily).toBe('NEET')
    const byId = toCompetitiveBrowserQuestion(normalizeQuestion({ id: 'EA-NEET-BIO-9', subject: 'Physics', text: 'z' }))
    expect(byId.exam).toBe('NEET UG')
  })
})
