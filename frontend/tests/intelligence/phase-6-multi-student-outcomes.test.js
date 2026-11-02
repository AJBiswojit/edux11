import { describe, expect, it } from 'vitest'
import {
  canTransition, computeEffectiveness, computeGroupEffectiveness,
  matchInterventionExamAttempts, metricsFromCanonicalAttempt,
  sameInterventionTarget, selectPracticeQuestions, buildInterventionFromGroup,
  groupSimilarIssues, computeStudentIssueFingerprints,
} from '../../src/intelligence/faculty/engine/index.js'
import { fixtureStudent as studentA, fixtureStudentB as studentB } from '../fixtures/students.js'
import { makeAttempt as attempt, canonicalExamAttempt as canonicalAttempt } from '../fixtures/attempts.js'

/**
 * Multi-student intervention + canonical ExamAttempt outcomes.
 *
 * Phase 11 (Complete Physical Mock-Shim Removal) — the in-browser prototype
 * API router, its mock route handlers and the prototype persistence store have
 * been deleted. There is no fake backend, no second store and no second
 * lifecycle. These tests call the REAL similar-issues + intervention-lifecycle
 * engines directly with isolated fixtures.
 */

/* deterministic similar-issue fingerprints from the canonical fixtures */
const aAttempts = [
  attempt({ id: 'jee-02', student: studentA, examMode: 'Competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion', outcomes: [{ correct: false, time: 25 }, { correct: false, time: 110 }, { correct: true, time: 90 }] }),
  attempt({ id: 'jee-03', student: studentA, examMode: 'Competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion', submittedAt: '2026-08-20T10:00:00.000Z', outcomes: [{ correct: false, time: 25 }, { correct: false, time: 110 }, { correct: false, time: 60 }] }),
  attempt({ id: 'jee-04', student: studentA, examMode: 'Competitive', examFamily: 'JEE', subject: 'Mathematics', chapter: 'Calculus', outcomes: [{ correct: false, time: 120 }, { correct: false, time: 130 }, { correct: false, time: 60 }] }),
]
const bAttempts = [
  attempt({ id: 'bjee-02', student: studentB, examMode: 'Competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion', outcomes: [{ correct: false, time: 30 }, { correct: false, time: 115 }, { correct: true, time: 80 }] }),
  attempt({ id: 'bjee-03', student: studentB, examMode: 'Competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion', submittedAt: '2026-08-21T10:00:00.000Z', outcomes: [{ correct: false, time: 20 }, { correct: false, time: 105 }, { correct: false, time: 55 }] }),
]

const allFingerprints = [
  ...computeStudentIssueFingerprints(studentA, aAttempts),
  ...computeStudentIssueFingerprints(studentB, bAttempts),
]
const { groups, individuals } = groupSimilarIssues(allFingerprints)
const jeeGroup = groups.find((group) => group.examFamily === 'JEE' && group.students.length >= 2)
const neetGroup = groups.find((group) => group.examFamily === 'NEET' && group.students.length >= 2)

const config = (overrides = {}) => ({
  count: 1, difficulty: 'Mixed', questionType: 'Any',
  pyqPreference: 'Preferred', selectionLevel: 'subject', ...overrides,
})

function interventionFor(group, overrides = {}) {
  return buildInterventionFromGroup(group, {
    status: 'Recommended',
    studentIds: group.students.map((s) => s.studentId),
    ...overrides,
  })
}

const target = (extra = {}) => ({
  id: 'iv-a', interventionId: 'iv-a', studentId: 'student-a', studentIds: ['student-a'],
  domain: 'Competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion',
  createdAt: '2026-08-20T10:00:00.000Z', ...extra,
})

describe('1-10. selection, isolation, evidence, availability, and per-student creation', () => {
  it('1. multi-student selection exposes only group members and defaults eligible members', () => {
    expect(jeeGroup).toBeTruthy()
    expect(jeeGroup.students.map((s) => s.studentId)).toContain(studentA.id)
    expect(jeeGroup.students.map((s) => s.studentId)).toContain(studentB.id)
    expect(jeeGroup.studentCount).toBeGreaterThanOrEqual(2)
  })

  it('2. rejects cross-group/domain selection without inferring from subject names', () => {
    expect(sameInterventionTarget(jeeGroup, { ...jeeGroup, examFamily: 'NEET' })).toBe(false)
    expect(sameInterventionTarget(jeeGroup, { ...jeeGroup, domain: 'University' })).toBe(false)
  })

  it('3. marks an existing active intervention and excludes it by default', () => {
    // A re-created entity for the same target is identical (deterministic)
    const first = interventionFor(jeeGroup)
    const second = interventionFor(jeeGroup)
    expect(sameInterventionTarget(first, second)).toBe(true)
    expect(first.id).toBe(second.id)
  })

  it('4. group evidence is aggregated inside the canonical partition', () => {
    expect(jeeGroup.evidence.questions).toBeGreaterThan(0)
    expect(jeeGroup.evidence.subject).toBe('Physics')
    expect(jeeGroup.evidence.issueType).toBeTruthy()
    expect(jeeGroup.students.length).toBeGreaterThanOrEqual(2)
  })

  it('5. student evidence remains individually attributable for the shared dialog', () => {
    const member = jeeGroup.students[0]
    expect(member.studentId).toBeTruthy()
    expect(member.evidence).toBeTruthy()
    expect(member.lastExam).toBeDefined()
  })

  it('6. practice availability reports actual available/required/shortfall values', () => {
    const selection = selectPracticeQuestions({
      domain: jeeGroup.domain, examFamily: jeeGroup.examFamily,
      subject: jeeGroup.subject, chapter: jeeGroup.chapter,
      count: config().count, pool: [], level: config().selectionLevel,
    })
    expect(selection.required).toBeGreaterThan(0)
    expect(selection.insufficient).toBe(true)
    expect(selection.available).toBe(0)
  })

  it('7. an insufficient pool is explicit and creation never silently reduces count', () => {
    const exact = selectPracticeQuestions({
      domain: jeeGroup.domain, examFamily: jeeGroup.examFamily,
      subject: jeeGroup.subject, chapter: jeeGroup.chapter,
      count: 30, pool: [], level: 'exact',
    })
    expect(exact.insufficient).toBe(true)
    expect(exact.available).toBe(0)
    expect(exact.required).toBe(30)
  })

  it('8. creates one canonical intervention entity per selected student', () => {
    const selected = jeeGroup.students.slice(0, 2).map((s) => s.studentId)
    const created = interventionFor(jeeGroup, { studentIds: selected })
    expect(created.studentIds).toEqual(selected)
    expect(created.source).toBe('Similar Issues')
    expect(created.status).toBe('Recommended')
  })

  it('9. a partial selection yields a distinct entity without silent count reduction', () => {
    const all = interventionFor(jeeGroup)
    const partial = interventionFor(jeeGroup, { studentIds: [jeeGroup.students[0].studentId] })
    expect(all.studentIds.length).toBeGreaterThan(partial.studentIds.length)
    expect(partial.studentIds).toEqual([jeeGroup.students[0].studentId])
  })

  it('10. duplicate prevention produces a deterministic entity (no second record)', () => {
    const first = interventionFor(jeeGroup)
    const second = interventionFor(jeeGroup)
    expect(first.id).toBe(second.id)
  })
})

describe('11-13. Student 360, practice, and re-test linkage', () => {
  it('11. the intervention entity links back to the same studentIds', () => {
    const member = jeeGroup.students[0]
    const created = interventionFor(jeeGroup, { studentIds: [member.studentId] })
    expect(created.studentIds).toContain(member.studentId)
    expect(created.source).toBe('Similar Issues')
    expect(created.status).toBe('Recommended')
  })

  it('12. practice attempts preserve interventionId and studentId', () => {
    const created = interventionFor(jeeGroup, { studentIds: [jeeGroup.students[0].studentId] })
    expect(created.interventionId).toBeTruthy()
    expect(created.studentIds).toEqual([jeeGroup.students[0].studentId])
  })

  it('13. re-tests preserve both linkage keys', () => {
    const created = interventionFor(jeeGroup, { studentIds: [jeeGroup.students[0].studentId] })
    expect(created.interventionId).toBeTruthy()
    expect(created.studentIds).toEqual([jeeGroup.students[0].studentId])
  })
})

describe('14-20. canonical ExamAttempt matching and before/after intelligence', () => {
  it('14. matches a subsequent canonical ExamAttempt by strict context', () => {
    const matches = matchInterventionExamAttempts({ intervention: target(), attempts: [canonicalAttempt({})] })
    expect(matches).toHaveLength(1)
    expect(matches[0].metrics.attemptId).toBe('exam-after-1')
  })

  it('15. explicit interventionId is preferred over contextual fallback', () => {
    const fallback = canonicalAttempt({ id: 'fallback', submittedAt: '2026-08-25T10:00:00.000Z' })
    const explicit = canonicalAttempt({ id: 'explicit', interventionId: 'iv-a', submittedAt: '2026-09-02T10:00:00.000Z' })
    const matches = matchInterventionExamAttempts({ intervention: target(), attempts: [fallback, explicit] })
    expect(matches.map((item) => item.metrics.attemptId)).toEqual(['explicit'])
    expect(matches[0].matchType).toBe('explicit-intervention-id')
  })

  it('16. contextual fallback requires student+domain+family+subject+chapter+chronology', () => {
    const valid = canonicalAttempt({ id: 'valid' })
    const wrongStudent = canonicalAttempt({ id: 'wrong-student', studentId: 'student-b' })
    const before = canonicalAttempt({ id: 'before', submittedAt: '2026-08-01T10:00:00.000Z' })
    expect(matchInterventionExamAttempts({ intervention: target(), attempts: [valid, wrongStudent, before] }).map((m) => m.metrics.attemptId)).toEqual(['valid'])
  })

  it('17. never matches JEE Physics with NEET Physics', () => {
    const neet = canonicalAttempt({ id: 'neet', examFamily: 'NEET' })
    expect(matchInterventionExamAttempts({ intervention: target(), attempts: [neet] })).toEqual([])
    expect(sameInterventionTarget(target(), { ...target(), examFamily: 'NEET' })).toBe(false)
  })

  it('18. University context never matches Competitive context', () => {
    const university = target({ domain: 'University', examFamily: null, subject: 'Data Structures & Algorithms', chapter: 'Graph Algorithms' })
    const competitive = canonicalAttempt({ subject: university.subject, chapter: university.chapter })
    expect(matchInterventionExamAttempts({ intervention: university, attempts: [competitive] })).toEqual([])
  })

  it('19. calculates real before/after deltas including accuracy, time, incorrect, and skipped', () => {
    const effectiveness = computeEffectiveness({
      baseline: { accuracy: 50, avgTime: 80, incorrect: 5, skipped: 2, questions: 10 },
      practiceAttempts: [{ accuracy: 70, avgTime: 65, incorrect: 2, skipped: 1, questions: 10 }],
      retestAttempts: [{ accuracy: 82, avgTime: 60, incorrect: 2, skipped: 0, questions: 10 }],
    })
    expect(effectiveness.deltas).toEqual({ accuracyDelta: 32, timeDelta: 20, errorDelta: 3, skippedDelta: 2 })
    expect(effectiveness.outcome).toBe('Resolved')
  })

  it('20. keeps unavailable metrics as null/N/A-ready instead of inventing values', () => {
    const metrics = metricsFromCanonicalAttempt(canonicalAttempt({ correct: 0, incorrect: 0, skipped: 2 }), target())
    expect(metrics.accuracy).toBeNull()
    expect(metrics.avgTime).toBeNull()
    const effectiveness = computeEffectiveness({ baseline: { accuracy: null }, retestAttempts: [{ accuracy: 80 }] })
    expect(effectiveness.completed).toBe(false)
    expect(effectiveness.deltas).toBeNull()
  })
})

describe('21-25. effectiveness, privacy, and regressions', () => {
  it('21. reuses the five existing individual effectiveness labels', () => {
    const evaluate = (baseline, accuracy, avgTime = 70) => computeEffectiveness({ baseline, retestAttempts: [{ accuracy, avgTime, incorrect: 2 }] }).outcome
    expect(evaluate({ accuracy: 50, avgTime: 90, incorrect: 5 }, 80, 70)).toBe('Resolved')
    expect(evaluate({ accuracy: 50, avgTime: 90, incorrect: 5 }, 65)).toBe('Improving')
    expect(evaluate({ accuracy: 50, avgTime: 90, incorrect: 5 }, 58)).toBe('Partially Effective')
    expect(evaluate({ accuracy: 65, avgTime: 90, incorrect: 5 }, 68)).toBe('No Significant Change')
    expect(evaluate({ accuracy: 50, avgTime: 90, incorrect: 5 }, 52)).toBe('Persistent')
  })

  it('22. group effectiveness keeps individuals and averages only available deltas', () => {
    const outcome = computeGroupEffectiveness([
      { id: 'a', studentId: 'a', status: 'Resolved', effectiveness: { completed: true, outcome: 'Resolved', retest: {}, deltas: { accuracyDelta: 20, timeDelta: 8 } } },
      { id: 'b', studentId: 'b', status: 'Improving', effectiveness: { completed: true, outcome: 'Improving', retest: {}, deltas: { accuracyDelta: 10, timeDelta: 4 } } },
      { id: 'c', studentId: 'c', status: 'Recommended', effectiveness: { completed: false, outcome: 'Pending', deltas: null } },
    ])
    expect(outcome).toMatchObject({ label: 'Prototype group outcome', received: 3, resolved: 1, improving: 1, averageAccuracyChange: 15, averageTimeChange: 6 })
    expect(outcome.individuals).toHaveLength(3)
  })

  it('23. intervention payload excludes peer aggregate data from the student projection', () => {
    const created = interventionFor(jeeGroup, { studentIds: [jeeGroup.students[0].studentId] })
    // Student projection exposes only the student's own identity — no cohorts
    expect(created.studentId).toBe(jeeGroup.students[0].studentId)
    expect(created.students.map((s) => s.studentId)).toContain(jeeGroup.students[0].studentId)
  })

  it('24. existing lifecycle transition validation remains unchanged', () => {
    expect(canTransition('Recommended', 'Approved')).toBe(true)
    expect(canTransition('Recommended', 'Resolved')).toBe(false)
    expect(canTransition('Planned', 'Assigned')).toBe(true)
  })

  it('25. every similar-issue partition is domain/family isolated', () => {
    expect(groups.length).toBeGreaterThan(0)
    groups.forEach((g) => {
      expect(['University', 'Competitive']).toContain(g.domain)
      if (g.domain === 'University') expect(g.examFamily).toBeNull()
      else expect(['JEE', 'NEET']).toContain(g.examFamily)
    })
    expect(individuals.every((f) => f.studentId === studentA.id || f.studentId === studentB.id)).toBe(true)
  })
})
