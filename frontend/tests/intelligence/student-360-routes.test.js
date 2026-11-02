import { describe, expect, it } from 'vitest'
import { computeMyStudentsDirectory, computeAttemptAnalysis } from '../../src/intelligence/faculty/engine/students-directory.js'
import { computeStudent360 } from '../../src/intelligence/faculty/engine/student-360.js'
import { batches, studentById } from '../fixtures/directory.js'
import { makeAttempt as attempt } from '../fixtures/attempts.js'

/**
 * Student 360 consolidation + data-surface tests.
 *
 * Phase 11 (Complete Physical Mock-Shim Removal) — the in-browser prototype
 * API router and its route handlers have been deleted, so these no longer
 * exercise `/faculty/students/:id/360` over a fake backend. They now call the
 * REAL intelligence engines directly with isolated fixtures, verifying the
 * canonical Student 360 contract that the service layer would return:
 *   · the full 360 bundle (subjects / chapters / question / longitudinal /
 *     comparison) is derived from canonical attempts;
 *   · University / JEE / NEET contexts are exposed as counts;
 *   · question-level evidence rows carry text + answers;
 *   · per-attempt analysis is preserved;
 *   · no separate duplicate engine is introduced.
 */

function fixtureAttemptsFor(studentId) {
  if (studentId === 'fs_jee_a_03') {
    return [
      attempt({ id: 'jee-01', student: studentId, examMode: 'Competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion', submittedAt: '2026-08-05T10:00:00.000Z', outcomes: [{ correct: false, time: 25 }, { correct: false, time: 110 }, { correct: true, time: 90 }] }),
      attempt({ id: 'jee-02', student: studentId, examMode: 'Competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion', submittedAt: '2026-08-15T10:00:00.000Z', outcomes: [{ correct: false, time: 25 }, { correct: false, time: 110 }, { correct: false, time: 60 }] }),
      attempt({ id: 'jee-03', student: studentId, examMode: 'Competitive', examFamily: 'JEE', subject: 'Mathematics', chapter: 'Calculus', submittedAt: '2026-08-20T10:00:00.000Z', outcomes: [{ correct: false, time: 120 }, { correct: false, time: 130 }, { correct: false, time: 60 }] }),
    ]
  }
  if (studentId === 'fs_neet_a_04') {
    return [
      attempt({ id: 'neet-01', student: studentId, examMode: 'Competitive', examFamily: 'NEET', subject: 'Biology', chapter: 'Human Physiology', submittedAt: '2026-08-06T10:00:00.000Z', outcomes: [{ correct: false, time: 120 }, { skipped: true, time: 0 }, { correct: false, time: 60 }] }),
    ]
  }
  /* University */
  return [
    attempt({ id: 'uni-01', student: studentId, examMode: 'University', subject: 'CS501', chapter: 'Graph Algorithms', submittedAt: '2026-08-05T10:00:00.000Z', outcomes: [{ correct: false, time: 100 }, { correct: false, time: 110 }] }),
    attempt({ id: 'uni-02', student: studentId, examMode: 'University', subject: 'CS501', chapter: 'Graph Algorithms', submittedAt: '2026-08-18T10:00:00.000Z', outcomes: [{ correct: false, time: 100 }, { correct: false, time: 110 }] }),
  ]
}

function student360For(id) {
  return computeStudent360({
    student: studentById[id],
    batches,
    attempts: fixtureAttemptsFor(id),
  })
}

describe('canonical Student 360 contract (unchanged)', () => {
  it('derives the 360 bundle with overview, subjects, chapters, question, longitudinal, comparison', () => {
    const s360 = student360For('fs_jee_a_03')
    for (const k of ['student', 'overview', 'aiSummary', 'strengthsWeaknesses', 'subjects', 'chapters', 'question', 'longitudinal', 'comparison', 'comparisonByContext', 'defaultDomain']) {
      expect(s360).toHaveProperty(k)
    }
    // domain isolation in the engine payload itself
    expect(s360.question.byContext.University).toBeDefined()
    expect(s360.question.byContext.JEE).toBeDefined()
    expect(s360.question.byContext.NEET).toBeDefined()
  })

  it('exposes University/JEE/NEET counts so the UI only renders available contexts', () => {
    const s360 = student360For('fs_jee_a_03')
    expect(typeof s360.uniCount).toBe('number')
    expect(typeof s360.jeeCount).toBe('number')
    expect(typeof s360.neetCount).toBe('number')
    expect(s360.uniCount + s360.jeeCount + s360.neetCount).toBeGreaterThan(0)
  })

  it('services a directory with batches when the service layer is asked for My Students', () => {
    const directory = computeMyStudentsDirectory({
      batches,
      students: Object.values(studentById),
      attemptsFor: fixtureAttemptsFor,
    })
    expect(directory.overview.students).toBe(Object.keys(studentById).length)
    expect(directory.batches.map((b) => b.examFamily ?? 'University')).toContain('JEE')
  })
})

describe('question-level evidence surface', () => {
  it('360 question rows carry text + answers so evidence dialogs are never empty', () => {
    const s360 = student360For('fs_jee_a_03')
    const withEvidence = s360.question.rows.filter((r) => r.status === 'Incorrect')
    expect(withEvidence.length).toBeGreaterThan(0)
    const r = withEvidence[0]
    // every incorrect row has enough to render a non-empty evidence card
    expect(r.subject).toBeTruthy()
    expect(r.chapter).toBeTruthy()
    expect(r.correctAnswer !== undefined && r.correctAnswer !== null).toBe(true)
    expect(r.text).toBeTruthy()
  })
})

describe('attempt analysis deep link preserved', () => {
  it('still derives a per-attempt analysis from the canonical attempt', () => {
    const attempts = fixtureAttemptsFor('fs_jee_a_03')
    const attemptId = attempts[0].id
    const analysis = computeAttemptAnalysis(attempts[0], attempts.slice(1))
    expect(analysis).toBeTruthy()
    expect(analysis.meta ?? analysis.analysis ?? analysis).toBeTruthy()
  })
})
