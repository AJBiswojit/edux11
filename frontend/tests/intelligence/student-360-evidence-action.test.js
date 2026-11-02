import { describe, expect, it } from 'vitest'
import { fixtureStudent as student, fixtureStudentB as studentB } from '../fixtures/students.js'
import { makeAttempt as attempt } from '../fixtures/attempts.js'

/**
 * STUDENT 360 EVIDENCE → ACTION HARDENING test suite.
 *
 * Phase 11 (Complete Physical Mock-Shim Removal) — the in-browser prototype
 * API router, its route handlers and the prototype persistence store have been
 * deleted. These tests therefore call the REAL intelligence engines directly
 * with isolated fixtures (no fake backend, no localStorage store, no mock
 * route). Coverage:
 *   1.  individual issue detection (buildIndividualIssue from fingerprints)
 *   2.  grouped vs individual issue separation
 *   3-5. University / JEE / NEET isolation for individual issues + creation
 *   6.  evidence question retrieval (real canonical rows per issue)
 *   7.  empty evidence behavior
 *   8.  subject → chapter drilldown (derived metrics)
 *   9.  chapter → evidence questions
 *   10. weakness → recommendation (existing engine reuse)
 *   11. recommendation → intervention entity via the existing lifecycle engine
 *   12. intervention lifecycle preservation (valid/invalid transitions)
 *   13. URL state helpers (?context=&tab=&subject=&chapter=)
 *   14. no unsupported AI claims (deterministic, data-grounded why-detected)
 */
import {
  computeStudent360,
  computeStudentIssueFingerprints,
  groupSimilarIssues,
  buildIndividualIssue,
  buildIndividualWhyDetected,
  canTransition,
  buildInterventionFromGroup,
  computeEffectiveness,
  buildRetestEntity,
  sameInterventionTarget,
} from '../../src/intelligence/faculty/engine/index.js'
import { generateInterventionRecommendation } from '../../src/intelligence/faculty/engine/ground-level-intelligence.js'
import { domainPool, domainSwPool, evidenceRowsFor, issueMatchesDomain } from '../../src/components/students-workspace/student-360-panels.jsx'
import { chapterIsActionable } from '../../src/components/students-workspace/student-intelligence-tabs.jsx'
import { EVIDENCE_EMPTY_MESSAGE, filterEvidenceRows } from '../../src/components/students-workspace/student-evidence.jsx'
import {
  DOMAIN_PARAM, DOMAIN_TO_PARAM, readContextParam, readTabParam,
  build360SearchParams, student360Url,
} from '../../src/utils/student-360-url.js'

const jeeWeak = attempt({
  id: 'jee-02', student, examMode: 'Competitive', examFamily: 'JEE',
  subject: 'Physics', chapter: 'Rotational Motion',
  outcomes: [
    { correct: false, time: 25 }, { correct: false, time: 110 }, { correct: true, time: 90 },
  ],
})
const jeeWeak2 = attempt({
  id: 'jee-03', student, examMode: 'Competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion',
  submittedAt: '2026-08-20T10:00:00.000Z',
  outcomes: [
    { correct: false, time: 25 }, { correct: false, time: 110 }, { correct: false, time: 60 },
  ],
})
const jeeSolo = attempt({
  id: 'jee-04', student, examMode: 'Competitive', examFamily: 'JEE',
  subject: 'Mathematics', chapter: 'Calculus',
  outcomes: [{ correct: false, time: 120 }, { correct: false, time: 130 }, { correct: false, time: 60 }],
})
const neetSolo = attempt({
  id: 'neet-05', student, examMode: 'Competitive', examFamily: 'NEET',
  subject: 'Biology', chapter: 'Human Physiology',
  outcomes: [{ correct: false, time: 120 }, { skipped: true, time: 0 }, { correct: false, time: 60 }],
})
const uniS0 = attempt({
  id: 'uni-01', student, examMode: 'University', subject: 'CS501', chapter: 'Graph Algorithms',
  outcomes: [{ correct: false, time: 100 }, { correct: false, time: 110 }],
})
const uniSolo = attempt({
  id: 'uni-02', student, examMode: 'University', subject: 'CS501', chapter: 'Graph Algorithms',
  submittedAt: '2026-08-18T10:00:00.000Z',
  outcomes: [{ correct: false, time: 100 }, { correct: false, time: 110 }],
})
const allAttempts = [jeeWeak, jeeWeak2, jeeSolo, neetSolo, uniS0, uniSolo]

/* student B shares the JEE Physics Rotational Motion partition with a
   similar issue → a REAL ≥2-student group; A's other chapters stay individual. */
const bWeak = attempt({
  id: 'bjee-02', student: studentB, examMode: 'Competitive', examFamily: 'JEE',
  subject: 'Physics', chapter: 'Rotational Motion',
  outcomes: [{ correct: false, time: 30 }, { correct: false, time: 115 }, { correct: true, time: 80 }],
})
const bWeak2 = attempt({
  id: 'bjee-03', student: studentB, examMode: 'Competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion',
  submittedAt: '2026-08-21T10:00:00.000Z',
  outcomes: [{ correct: false, time: 20 }, { correct: false, time: 105 }, { correct: false, time: 55 }],
})
const bAttempts = [bWeak, bWeak2]

const fingerprintsFor = (attempts) => computeStudentIssueFingerprints(student, attempts)
const allFingerprints = [...computeStudentIssueFingerprints(student, allAttempts), ...computeStudentIssueFingerprints(studentB, bAttempts)]
const s360 = computeStudent360({ student, attempts: allAttempts })

/* ================================================================ */

describe('1. individual issue detection', () => {
  it('derives individual issues from fingerprints with whyDetected, priority and evidence counts', () => {
    const fps = fingerprintsFor([jeeSolo, neetSolo, uniSolo])
    expect(fps.length).toBeGreaterThan(0)
    const issue = buildIndividualIssue(fps[0])
    for (const key of ['studentId', 'domain', 'examFamily', 'subject', 'chapter', 'issueType', 'severity', 'priority', 'accuracy', 'avgTime', 'trend', 'whyDetected', 'evidenceQuestionCount', 'evidence']) {
      expect(issue).toHaveProperty(key)
    }
    expect(issue.whyDetected).toMatch(/\.$/)
    expect(issue.evidenceQuestionCount).toBeGreaterThan(0)
    expect(issue.grouped).toBe(false)
  })

  it('reuses the existing fingerprint fields — no second classifier', () => {
    const fp = fingerprintsFor([jeeSolo])[0]
    const issue = buildIndividualIssue(fp)
    expect(issue.issueType).toBe(fp.issueType)
    expect(issue.severity).toBe(fp.severity)
    expect(issue.accuracy).toBe(fp.accuracy)
    expect(issue.trend).toBe(fp.trend)
  })
})

describe('2. grouped vs individual issue separation', () => {
  it('a shared partition becomes a group; unique partitions stay individual', () => {
    const { groups, individuals } = groupSimilarIssues(allFingerprints)
    expect(groups.length).toBeGreaterThan(0)
    expect(individuals.length).toBeGreaterThan(0)
    const rotGroup = groups.find((g) => g.subject === 'Physics' && g.chapter === 'Rotational Motion')
    expect(rotGroup).toBeTruthy()
    expect(rotGroup.studentCount).toBe(2)
    const groupKeys = groups.map((g) => `${g.domain}|${g.examFamily ?? 'uni'}|${g.subject}|${g.chapter}`)
    const individualKeys = individuals.map((f) => `${f.domain}|${f.examFamily ?? 'uni'}|${f.subject}|${f.chapter}`)
    individualKeys.forEach((k) => expect(groupKeys).not.toContain(k))
  })

  it('the similar-issues engine returns BOTH shapes, individuals enriched with whyDetected + priority', () => {
    const { groups, individuals } = groupSimilarIssues(allFingerprints)
    expect(Array.isArray(groups)).toBe(true)
    expect(Array.isArray(individuals)).toBe(true)
    individuals.forEach((f) => {
      const issue = buildIndividualIssue(f)
      expect(issue.whyDetected).toBeTruthy()
      expect(['Critical', 'High', 'Medium', 'Low']).toContain(issue.priority)
    })
  })
})

describe('3. University / JEE / NEET isolation of individual issues', () => {
  const fps = fingerprintsFor(allAttempts)
  const issues = fps.map((f) => buildIndividualIssue(f))

  it('every issue carries domain + examFamily + subject + chapter (never inferred from subject names)', () => {
    issues.forEach((i) => {
      expect(['University', 'Competitive']).toContain(i.domain)
      if (i.domain === 'University') expect(i.examFamily).toBeNull()
      else expect(['JEE', 'NEET']).toContain(i.examFamily)
      expect(i.subject).toBeTruthy()
      expect(i.chapter).toBeTruthy()
    })
  })

  it('the domain filter never mixes University, JEE and NEET issues', () => {
    expect(issues.filter((i) => issueMatchesDomain(i, 'University')).every((i) => i.domain === 'University')).toBe(true)
    expect(issues.filter((i) => issueMatchesDomain(i, 'JEE')).every((i) => i.domain === 'Competitive' && i.examFamily === 'JEE')).toBe(true)
    expect(issues.filter((i) => issueMatchesDomain(i, 'NEET')).every((i) => i.domain === 'Competitive' && i.examFamily === 'NEET')).toBe(true)
    const uni = issues.filter((i) => issueMatchesDomain(i, 'University')).map((i) => i.subject)
    expect(uni).toEqual(['CS501']) // JEE/NEET Physics never leaks into University
  })

  it('Physics exists in JEE but NEET issues stay Biology-only here (same-named chapters never merge)', () => {
    const jeeSubjects = issues.filter((i) => issueMatchesDomain(i, 'JEE')).map((i) => i.subject).sort()
    const neetSubjects = issues.filter((i) => issueMatchesDomain(i, 'NEET')).map((i) => i.subject).sort()
    expect(jeeSubjects).toContain('Physics')
    expect(neetSubjects).toEqual(['Biology'])
  })
})

describe('4. evidence question retrieval', () => {
  it('each issue resolves to the student’s REAL canonical question rows (with text + answers)', () => {
    const rows = evidenceRowsFor(s360, 'JEE', 'Physics', 'Rotational Motion')
    expect(rows.length).toBeGreaterThan(0)
    rows.forEach((r) => {
      expect(r.subject).toBe('Physics')
      expect(r.chapter).toBe('Rotational Motion')
      expect(r.examFamily).toBe('JEE')
      expect(r.text).toMatch(/Rotational Motion q\d/)
      expect(r.correctAnswer).toBe(0)
    })
  })

  it('rows carry status, time, answer changes, revisits and student answer', () => {
    const rows = evidenceRowsFor(s360, 'NEET', 'Biology', 'Human Physiology')
    expect(rows.length).toBeGreaterThan(0)
    rows.forEach((r) => {
      for (const key of ['status', 'timeSpent', 'answerChanges', 'revisits', 'selected', 'correctAnswer', 'difficulty', 'type']) {
        expect(r).toHaveProperty(key)
      }
    })
    expect(rows.some((r) => r.status === 'Skipped')).toBe(true)
  })
})

describe('5. empty evidence behavior', () => {
  it('an unknown chapter yields zero rows and the canonical empty message exists', () => {
    expect(evidenceRowsFor(s360, 'JEE', 'Physics', 'No Such Chapter')).toEqual([])
    expect(EVIDENCE_EMPTY_MESSAGE).toBe('No question-level evidence available.')
  })

  it('the shared dialog filter handles empty input and status partitions', () => {
    expect(filterEvidenceRows([])).toEqual([])
    const rows = evidenceRowsFor(s360, 'JEE', 'Physics', 'Rotational Motion')
    expect(filterEvidenceRows(rows, { status: 'All' })).toHaveLength(rows.length)
    expect(filterEvidenceRows(rows, { status: 'Incorrect' }).every((r) => r.status === 'Incorrect')).toBe(true)
    expect(filterEvidenceRows(rows, { status: 'Slow' }).every((r) => r.timeSpent >= 90)).toBe(true)
  })

  it('no intervention entity is fabricated when no question-level evidence exists', () => {
    const rows = evidenceRowsFor(s360, 'JEE', 'Physics', 'Chapter That Does Not Exist')
    expect(rows).toEqual([])
    // The recommendation engine returns null (no fabrication) when there is zero evidence
    expect(generateInterventionRecommendation(rows, { subject: 'Physics', chapter: 'Chapter That Does Not Exist' })).toBeNull()
  })
})

describe('6. subject → chapter drilldown', () => {
  it('subject pools summarize; chapter pools carry the full derived metrics', () => {
    const jeeSubjects = domainPool(s360, 'JEE', 'subjects')
    const jeeChapters = domainPool(s360, 'JEE', 'chapters')
    expect(jeeSubjects.length).toBeGreaterThan(0)
    jeeChapters.forEach((c) => {
      for (const key of ['chapter', 'subject', 'accuracy', 'attempts', 'correct', 'incorrect', 'skipped', 'avgTime', 'trend', 'priority', 'evidence']) {
        expect(c).toHaveProperty(key)
      }
    })
  })

  it('chapter actionability is derived from the engine metrics (weak/declining/priority)', () => {
    const weak = domainPool(s360, 'JEE', 'chapters').find((c) => c.accuracy < 50)
    expect(weak).toBeTruthy()
    expect(chapterIsActionable(weak)).toBe(true)
  })

  it('drilldown stays domain-isolated (University chapters never inside the JEE pool)', () => {
    const jeeChapters = domainPool(s360, 'JEE', 'chapters').map((c) => c.chapter)
    expect(jeeChapters).not.toContain('Graph Algorithms')
    const uniChapters = domainPool(s360, 'University', 'chapters').map((c) => c.chapter)
    expect(uniChapters).toEqual(['Graph Algorithms'])
  })
})

describe('7. chapter → evidence questions', () => {
  it('every actionable chapter resolves real evidence rows in its own domain', () => {
    const chapters = [...domainPool(s360, 'JEE', 'chapters'), ...domainPool(s360, 'NEET', 'chapters'), ...domainPool(s360, 'University', 'chapters')]
    const actionable = chapters.filter((c) => chapterIsActionable(c))
    expect(actionable.length).toBeGreaterThan(0)
    actionable.forEach((c) => {
      const domain = c.domain === 'university' ? 'University' : c.domain
      const rows = evidenceRowsFor(s360, domain, c.subject, c.chapter)
      expect(rows.length).toBe(c.questions)
    })
  })
})

describe('8. weakness → recommendation (existing engine reuse)', () => {
  it('a weakness derives a full recommendation from its actual rows (no side effects)', () => {
    const { weaknesses } = domainSwPool(s360, 'JEE')
    expect(weaknesses.length).toBeGreaterThan(0)
    const w = weaknesses[0]
    const rows = evidenceRowsFor(s360, 'JEE', w.subject, w.chapter)
    const rec = generateInterventionRecommendation(rows, { subject: w.subject, chapter: w.chapter })
    expect(rec).toBeTruthy()
    expect(rec.issueType).not.toBe('Strong Performance')
    expect(rec.practiceConfig.questionCount).toBeGreaterThan(0)
    expect(rec.practiceConfig.difficultyProgression).toBeTruthy()
    expect(rec.stats.questions).toBe(rows.length)
    expect(rec.evidence.length).toBeGreaterThan(0)
  })
})

describe('9. recommendation → intervention entity (existing lifecycle engine)', () => {
  it('derives an intervention entity from a real group without fake persistence', () => {
    const { groups } = groupSimilarIssues(allFingerprints)
    const rotGroup = groups.find((g) => g.subject === 'Physics' && g.chapter === 'Rotational Motion')
    expect(rotGroup).toBeTruthy()
    const created = buildInterventionFromGroup(rotGroup, {
      status: 'Recommended',
      studentIds: rotGroup.students.map((s) => s.studentId),
      title: 'Rotational Motion Accuracy Recovery',
      objectives: ['Improve accuracy on Rotational Motion problems.'],
      practiceConfig: { count: 15, difficulty: 'Mixed', pyqPreference: 'Yes' },
      notes: 'Created during Phase 5 verification.',
    })
    expect(created.id).toMatch(/^issue-group-/)
    expect(created.studentIds.length).toBe(rotGroup.studentCount)
    expect(created.domain).toBe('Competitive')
    expect(created.examFamily).toBe('JEE')
    expect(created.subject).toBe('Physics')
    expect(created.chapter).toBe('Rotational Motion')
    expect(created.issueType).toBeTruthy()
    expect(['Critical', 'High', 'Medium', 'Low']).toContain(created.priority)
    expect(created.objectives.length).toBeGreaterThan(0)
    expect(created.evidence.questions).toBeGreaterThan(0)
    expect(typeof created.evidence.avgAccuracy).toBe('number')
    expect(created.evidence.incorrect + created.evidence.skipped).toBeGreaterThan(0)
    expect(created.practiceConfig.count).toBe(15)
    expect(created.practiceConfig.includePyq ?? created.practiceConfig.pyqPreference).toBeTruthy()
    expect(created.source).toBe('Similar Issues')
    expect(created.createdBy).toBeTruthy()
    expect(created.status).toBe('Recommended')
    expect(created.whyDetected).toBeTruthy()
  })

  it('duplicate target detection refuses the same student+chapter across a re-creation', () => {
    const { groups } = groupSimilarIssues(allFingerprints)
    const rotGroup = groups.find((g) => g.subject === 'Physics' && g.chapter === 'Rotational Motion')
    const first = buildInterventionFromGroup(rotGroup, { studentIds: rotGroup.students.map((s) => s.studentId) })
    const second = buildInterventionFromGroup(rotGroup, { studentIds: rotGroup.students.map((s) => s.studentId) })
    // same target ⇒ same canonical entity (deterministic, no store side effect)
    expect(sameInterventionTarget(first, second)).toBe(true)
    expect(first.id).toBe(second.id)
  })

  it('University and NEET creations stay isolated (no cross-domain leak)', () => {
    const { groups, individuals } = groupSimilarIssues(allFingerprints)
    const uniIndividual = individuals.find((f) => f.domain === 'University')
    const neetIndividual = individuals.find((f) => f.examFamily === 'NEET')
    expect(uniIndividual).toBeTruthy()
    expect(neetIndividual).toBeTruthy()
    // A University-only target can never be labelled JEE — sameInterventionTarget guards it
    const uniTarget = buildInterventionFromGroup({ ...uniIndividual, students: [{ studentId: uniIndividual.studentId }] })
    const jeeTarget = { ...uniTarget, domain: 'Competitive', examFamily: 'JEE' }
    expect(sameInterventionTarget(uniTarget, jeeTarget)).toBe(false)
    expect(groups.every((g) => g.domain === 'University' || (g.examFamily === 'JEE' || g.examFamily === 'NEET'))).toBe(true)
  })
})

describe('10. intervention lifecycle preservation', () => {
  it('valid lifecycle transitions apply; invalid ones are refused by the SAME status machine', () => {
    expect(canTransition('Recommended', 'Approved')).toBe(true)
    expect(canTransition('Recommended', 'Resolved')).toBe(false)
    expect(canTransition('Recommended', 'Assigned')).toBe(false)
    expect(canTransition('Planned', 'Assigned')).toBe(true)
    expect(canTransition('Approved', 'Planned')).toBe(true)
  })

  it('practice + re-test entities preserve the intervention linkage', () => {
    const { groups } = groupSimilarIssues(allFingerprints)
    const rotGroup = groups.find((g) => g.subject === 'Physics' && g.chapter === 'Rotational Motion')
    const intervention = buildInterventionFromGroup(rotGroup, { status: 'Approved', studentIds: rotGroup.students.map((s) => s.studentId) })
    expect(intervention.status).toBe('Approved')
    const retest = buildRetestEntity({ intervention, title: 'Recovery Test', count: 1, studentIds: intervention.studentIds })
    expect(retest.interventionId).toBe(intervention.id)
    expect(retest.studentIds).toEqual(intervention.studentIds)
    expect(retest.status).toBe('Assigned')
  })

  it('effectiveness stays a prototype outcome, never a fabricated label', () => {
    const outcome = computeEffectiveness({
      baseline: { accuracy: 50, avgTime: 80, incorrect: 5 },
      retestAttempts: [{ accuracy: 82, avgTime: 60, incorrect: 2 }],
    })
    expect(outcome.completed).toBe(true)
    expect(outcome.outcome).toBeTruthy()
    expect(outcome.label).toContain('Prototype')
    expect(outcome.comparisonBasis).toBe('Re-test')
  })
})

describe('11. URL state', () => {
  it('context/tab/subject/chapter round-trip through the canonical param names', () => {
    expect(DOMAIN_PARAM.university).toBe('University')
    expect(DOMAIN_PARAM.jee).toBe('JEE')
    expect(DOMAIN_PARAM.neet).toBe('NEET')
    expect(DOMAIN_TO_PARAM.JEE).toBe('jee')
    const params = build360SearchParams('', {
      tab: 'weaknesses', domain: 'JEE', subject: 'Physics', chapter: 'Rotational Motion',
    })
    expect(params.get('tab')).toBe('weaknesses')
    expect(params.get('context')).toBe('jee')
    expect(params.get('subject')).toBe('Physics')
    expect(params.get('chapter')).toBe('Rotational Motion')
    expect(params.toString()).toContain('chapter=Rotational+Motion')
  })

  it('readers reject unknown values and the default tab is omitted from the URL', () => {
    const sp = new URLSearchParams('context=jee&subject=Physics&chapter=Rotational%20Motion')
    expect(readContextParam(sp)).toBe('JEE')
    expect(readTabParam(sp)).toBe('overview')
    expect(readContextParam(new URLSearchParams('context=competitive'))).toBeNull()
    const cleared = build360SearchParams(sp, { tab: 'overview', domain: 'JEE', subject: null, chapter: null })
    expect(cleared.has('tab')).toBe(false)
    expect(cleared.has('subject')).toBe(false)
    expect(cleared.has('chapter')).toBe(false)
    expect(cleared.get('context')).toBe('jee')
  })

  it('deep-link builder produces the documented URL shape', () => {
    expect(student360Url('fs_jee_a_03', { context: 'JEE', tab: 'weaknesses', subject: 'Physics', chapter: 'Rotational Motion' }))
      .toBe('/faculty/my-students/fs_jee_a_03?tab=weaknesses&context=jee&subject=Physics&chapter=Rotational+Motion')
  })
})

describe('12. no unsupported AI claims', () => {
  const BANNED = ['anxious', 'anxiety', 'unmotivated', 'lazy', 'bored', 'fear', 'panic', 'confidence issues', 'does not care', 'depressed']

  it('individual why-detected strings are deterministic and grounded in the fingerprint numbers', () => {
    const fp = {
      status: 'persistent', trend: 'stable', accuracy: 46, avgTime: 81, highTime: false,
      skipRate: 0, skipped: 0, incorrect: 4, questions: 8, persistence: 3,
      evidence: { attempts: 3, questions: 8, incorrect: 4, skipped: 0, accuracy: 46, avgTime: 81 },
    }
    const a = buildIndividualWhyDetected(fp)
    const b = buildIndividualWhyDetected(fp)
    expect(a).toBe(b) /* deterministic template */
    expect(a).toContain('3 attempt')
    expect(a).toContain('4 incorrect')
    expect(a).not.toMatch(/46%.*below/) /* persistent branch states persistence, not a wrong threshold claim */
  })

  it('declining and low-accuracy branches quote the actual numbers', () => {
    const declining = buildIndividualWhyDetected({
      status: 'weak', trend: 'declining', accuracy: 38, avgTime: 70,
      skipRate: 0, incorrect: 5, questions: 6, persistence: 2,
      series: [{ date: '2026-08-01', accuracy: 71 }, { date: '2026-08-20', accuracy: 38 }],
    })
    expect(declining).toContain('71%')
    expect(declining).toContain('38%')
    const low = buildIndividualWhyDetected({
      status: 'weak', trend: 'stable', accuracy: 40, avgTime: 50,
      skipRate: 40, skipped: 2, incorrect: 3, questions: 5, persistence: 1,
    })
    expect(low).toContain('40%')
    expect(low).toContain('2 of 5')
  })

  it('no psychological or fabricated claims appear in any engine-generated string', () => {
    const issues = fingerprintsFor(allAttempts).map((f) => buildIndividualIssue(f))
    issues.forEach((i) => {
      const text = `${i.whyDetected}`.toLowerCase()
      BANNED.forEach((word) => expect(text).not.toContain(word))
    })
  })
})
