/**
 * Feature-level cascade tests — every feature declares its own dependency
 * graph (never a global filter engine) and derives options from its own
 * canonical dataset. These tests prove the graphs behave correctly, that
 * University / JEE / NEET stay isolated, and that URL-prefilled (initial)
 * values are validated against the datasets.
 */
import { describe, expect, it } from 'vitest'
import { microAssessmentSources } from '../fixtures/micro-assessments.js'
import { pyqFilters } from '../../src/datasets/faculty/pyq-analysis.js'
import { examAnalysisOptions, universityExamOptions } from '../../src/datasets/exams/exam-analysis.js'
import { sanitizeSourceFilters } from '../../src/components/micro-assessment-studio/source-library-filters.js'
import { buildPyqFilterCascade } from '../../src/pages/faculty/pyq-filter-cascade.js'
import { buildExamAnalysisCascade, competitiveExamFamilies, visibleExamOptions } from '../../src/pages/student/exam-analysis-filters.js'
import { buildPaperGeneratorCascade, PAPER_GENERATOR_EMPTY } from '../../src/components/assessment-workspace/paper-generator-cascade.js'
import { buildCompetitiveBrowserCascade } from '../../src/components/assessment-workspace/competitive-browser-cascade.js'
import { buildStudioCascade } from '../../src/components/question-studio/studio-cascade.js'
import { sanitizeCascadeValues } from '../../src/utils/filter-cascade.js'

const catalog = microAssessmentSources.map(({ generatedQuestions: _g, ...meta }) => meta)

describe('Source Library — domain → exam family → subject → chapter → topic', () => {
  it('keeps valid chains and clears invalid downstream values on parent change', () => {
    const jee = sanitizeSourceFilters(
      { domain: 'competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion', topic: 'Torque and Angular Momentum', search: '', sourceType: '' },
      catalog,
    )
    expect(jee.topic).toBe('Torque and Angular Momentum')

    const switched = sanitizeSourceFilters(
      { domain: 'competitive', examFamily: 'NEET', subject: 'Physics', chapter: 'Rotational Motion', topic: 'Torque and Angular Momentum', search: '', sourceType: '' },
      catalog,
    )
    expect(switched).toMatchObject({ examFamily: 'NEET', subject: '', chapter: '', topic: '' })
  })

  it('clears exam family outside the competitive domain', () => {
    const next = sanitizeSourceFilters({ domain: 'university', examFamily: 'JEE', subject: 'Physics', search: '', sourceType: '' }, catalog)
    expect(next).toMatchObject({ examFamily: '', subject: 'Physics' })
  })

  it('isolates JEE / NEET / University even when the subject name is identical', () => {
    const universityPhysics = sanitizeSourceFilters({ domain: 'university', subject: 'Physics', chapter: 'Quantum Mechanics', topic: 'Wave-Particle Duality', search: '', sourceType: '' }, catalog)
    expect(universityPhysics).toMatchObject({ chapter: 'Quantum Mechanics', topic: 'Wave-Particle Duality' })

    const jeePhysics = sanitizeSourceFilters({ domain: 'competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion', search: '', sourceType: '' }, catalog)
    expect(jeePhysics).toMatchObject({ examFamily: 'JEE', chapter: 'Rotational Motion' })

    // a JEE chapter is invalid for university Physics
    const crossed = sanitizeSourceFilters({ domain: 'university', subject: 'Physics', chapter: 'Rotational Motion', search: '', sourceType: '' }, catalog)
    expect(crossed).toMatchObject({ chapter: '', topic: '' })
  })
})

describe('Exam Analysis (student) — context → family → exam → subject', () => {
  const options = [...examAnalysisOptions, ...universityExamOptions]

  it('detects families from canonical exam metadata, never subject names', () => {
    expect(competitiveExamFamilies(options).sort()).toEqual(['JEE', 'NEET'])
    expect(visibleExamOptions(options, 'University', 'All').every((o) => o.category === 'University')).toBe(true)
    expect(visibleExamOptions(options, 'Competitive', 'NEET').every((o) => o.category !== 'University')).toBe(true)
  })

  it('switching to University clears competitive family/exam/subject', () => {
    const jeeExam = examAnalysisOptions.find((o) => o.pattern?.includes('JEE'))
    const state = { context: 'Competitive', family: 'JEE', examId: jeeExam.id, subject: 'Physics' }
    const next = sanitizeCascadeValues({ ...state, context: 'University' }, buildExamAnalysisCascade(options))
    expect(next).toMatchObject({ context: 'University', family: 'All', examId: '', subject: '' })
  })

  it('keeps a JEE exam out of the NEET family and vice versa (subject lists never leak)', () => {
    const neetExam = examAnalysisOptions.find((o) => o.pattern?.includes('NEET'))
    const crossed = sanitizeCascadeValues(
      { context: 'Competitive', family: 'JEE', examId: neetExam.id, subject: 'Biology' },
      buildExamAnalysisCascade(options),
    )
    expect(crossed.examId).toBe('')
    expect(crossed.subject).toBe('')

    const valid = sanitizeCascadeValues(
      { context: 'Competitive', family: 'NEET', examId: neetExam.id, subject: 'Biology' },
      buildExamAnalysisCascade(options),
    )
    expect(valid).toMatchObject({ examId: neetExam.id, subject: 'Biology' })
  })

  it('switching exams clears a subject that belongs to the previous exam only', () => {
    const jeeExam = examAnalysisOptions.find((o) => o.pattern?.includes('JEE'))
    const neetExam = examAnalysisOptions.find((o) => o.pattern?.includes('NEET'))
    const next = sanitizeCascadeValues(
      { context: 'Competitive', family: 'All', examId: neetExam.id, subject: 'Mathematics' },
      buildExamAnalysisCascade(options),
    )
    expect(next.subject).toBe('') // Mathematics is not a NEET subject
    const kept = sanitizeCascadeValues(
      { context: 'Competitive', family: 'All', examId: neetExam.id, subject: 'Physics' },
      buildExamAnalysisCascade(options),
    )
    expect(kept.subject).toBe('Physics') // Physics exists in both families
  })
})

describe('PYQ Analysis (faculty) — subject → chapter → topic', () => {
  it('clears chapter/topic when the subject changes', () => {
    const cascade = buildPyqFilterCascade(pyqFilters)
    const next = sanitizeCascadeValues(
      { subject: 'CS501', chapter: 'Graph Algorithms', topic: 'Dijkstra & shortest paths' },
      { ...cascade, ...{ subject: 'CS502' } && {} },
    )
    expect(next).toMatchObject({ subject: 'CS501', chapter: 'Graph Algorithms', topic: 'Dijkstra & shortest paths' })

    const switched = sanitizeCascadeValues({ subject: 'CS502', chapter: 'Graph Algorithms', topic: 'Dijkstra & shortest paths' }, cascade)
    expect(switched).toMatchObject({ subject: 'CS502', chapter: '', topic: '' })
  })

  it('clears a chapter that belongs to another subject', () => {
    const cascade = buildPyqFilterCascade(pyqFilters)
    const next = sanitizeCascadeValues({ subject: 'CS501', chapter: 'Relational Design' }, cascade)
    expect(next.chapter).toBe('')
    const valid = sanitizeCascadeValues({ subject: 'CS501', chapter: 'Trees & Heaps', topic: 'AVL rotations' }, cascade)
    expect(valid.topic).toBe('AVL rotations')
  })
})

describe('Paper Generator (assessment workspace) — course → subject → chapter → topic', () => {
  const cfg = {
    courseCatalog: [
      { id: 'c1', code: 'CS501', name: 'Data Structures & Algorithms', subjectCode: 'CS501', subjectName: 'Data Structures & Algorithms' },
      { id: 'c2', code: 'CS502', name: 'Database Management Systems', subjectCode: 'CS502', subjectName: 'Database Management Systems' },
    ],
    subjectCatalog: [
      { id: 'CS501', code: 'CS501', name: 'Data Structures & Algorithms', examMode: 'university', examFamily: null, chapters: [{ id: 'ch1', name: 'Trees', topics: ['AVL', 'Heaps'] }, { id: 'ch2', name: 'Graphs', topics: ['Dijkstra', 'BFS'] }] },
      { id: 'CS502', code: 'CS502', name: 'Database Management Systems', examMode: 'university', examFamily: null, chapters: [{ id: 'ch3', name: 'Normalization', topics: ['3NF', 'BCNF'] }] },
      { id: 'PHY', code: 'PHY', name: 'Physics', examMode: 'competitive', examFamily: 'jee', chapters: [{ id: 'ch4', name: 'Rotational Motion', topics: ['Torque', 'Moment of Inertia'] }] },
      { id: 'BIO', code: 'BIO', name: 'Biology', examMode: 'competitive', examFamily: 'neet', chapters: [{ id: 'ch5', name: 'Genetics', topics: ['Mendel'] }] },
    ],
    // The catalog carries the full real competitive subject lists
    // (Mathematics/Physics/Chemistry for JEE; Physics/Chemistry/Biology for
    // NEET) — the production bug was that only one subject per family
    // reached the dropdown.
    competitiveSubjects: { JEE: ['Mathematics', 'Physics', 'Chemistry'], NEET: ['Physics', 'Chemistry', 'Biology'] },
  }

  const COURSE_DSA = 'CS501 — Data Structures & Algorithms'
  const COURSE_DBMS = 'CS502 — Database Management Systems'

  it('derives real course options and never injects demo courses', () => {
    const university = buildPaperGeneratorCascade({ mode: 'University', exam: 'JEE', cfg })
    const options = university.deriveOptions('course', { course: '' }, 'display')
    expect(options).toEqual([COURSE_DSA, COURSE_DBMS])
    expect(options).not.toContain('CS501 — DSA')
    expect(options).not.toContain('CS503 — OS')
    expect(options).not.toContain('CS505 — ML')
  })

  it('keeps a valid real chain and clears children when the course changes', () => {
    const university = buildPaperGeneratorCascade({ mode: 'University', exam: 'JEE', cfg })
    const valid = sanitizeCascadeValues(
      { course: COURSE_DSA, subject: 'Data Structures & Algorithms', chapter: 'Trees', topic: 'AVL' },
      university,
    )
    expect(valid).toMatchObject({ course: COURSE_DSA, subject: 'Data Structures & Algorithms', chapter: 'Trees', topic: 'AVL' })

    const switched = sanitizeCascadeValues(
      { course: COURSE_DBMS, subject: 'Data Structures & Algorithms', chapter: 'Trees', topic: 'AVL' },
      university,
    )
    expect(switched).toMatchObject({ subject: PAPER_GENERATOR_EMPTY.subject, chapter: PAPER_GENERATOR_EMPTY.chapter, topic: PAPER_GENERATOR_EMPTY.topic })
  })

  it('never shows a chapter/topic that does not belong to the selected subject', () => {
    const university = buildPaperGeneratorCascade({ mode: 'University', exam: 'JEE', cfg })
    const crossed = sanitizeCascadeValues(
      { course: COURSE_DSA, subject: 'Data Structures & Algorithms', chapter: 'Normalization', topic: '3NF' },
      university,
    )
    expect(crossed.chapter).toBe(PAPER_GENERATOR_EMPTY.chapter)
    expect(crossed.topic).toBe(PAPER_GENERATOR_EMPTY.topic)

    const valid = sanitizeCascadeValues(
      { course: COURSE_DSA, subject: 'Data Structures & Algorithms', chapter: 'Graphs', topic: 'Dijkstra' },
      university,
    )
    expect(valid).toMatchObject({ chapter: 'Graphs', topic: 'Dijkstra' })
  })

  it('keeps empty API responses empty (no fabricated options)', () => {
    const empty = buildPaperGeneratorCascade({ mode: 'University', exam: 'JEE', cfg: { courseCatalog: [], subjectCatalog: [] } })
    expect(empty.deriveOptions('course', { course: '' }, 'display')).toEqual([])
    expect(empty.deriveOptions('subject', { course: '' }, 'display')).toEqual([])
    expect(empty.deriveOptions('chapter', { subject: '' }, 'display')).toEqual([])
    expect(empty.deriveOptions('topic', { chapter: '' }, 'display')).toEqual([])
  })

  it('validates competitive URL values against the real competitive catalog', () => {
    const jee = buildPaperGeneratorCascade({ mode: 'Competitive', exam: 'JEE', cfg })
    const valid = sanitizeCascadeValues(
      { course: '', subject: 'Physics', chapter: 'Rotational Motion', topic: 'Torque' },
      jee,
    )
    expect(valid).toMatchObject({ subject: 'Physics', chapter: 'Rotational Motion', topic: 'Torque' })

    const jeeNeetLeak = sanitizeCascadeValues({ course: '', subject: 'Biology', chapter: 'Genetics', topic: 'Mendel' }, jee)
    expect(jeeNeetLeak.subject).toBe(PAPER_GENERATOR_EMPTY.subject)

    const neet = buildPaperGeneratorCascade({ mode: 'Competitive', exam: 'NEET', cfg })
    const neetKept = sanitizeCascadeValues({ course: '', subject: 'Biology', chapter: 'Genetics', topic: 'Mendel' }, neet)
    expect(neetKept).toMatchObject({ subject: 'Biology', chapter: 'Genetics', topic: 'Mendel' })
  })

  it('clears a family-only subject when switching JEE → NEET and keeps a shared subject valid', () => {
    // Mathematics is JEE-only: switching to NEET must reset it (and its
    // chapter/topic descendants).
    const jee = buildPaperGeneratorCascade({ mode: 'Competitive', exam: 'JEE', cfg })
    const jeeState = sanitizeCascadeValues({ course: '', subject: 'Mathematics', chapter: 'Calculus', topic: 'Limits' }, jee)
    expect(jeeState).toMatchObject({ subject: 'Mathematics' })
    const neet = buildPaperGeneratorCascade({ mode: 'Competitive', exam: 'NEET', cfg })
    const afterSwitch = sanitizeCascadeValues(jeeState, neet)
    expect(afterSwitch.subject).toBe(PAPER_GENERATOR_EMPTY.subject)
    expect(afterSwitch.chapter).toBe(PAPER_GENERATOR_EMPTY.chapter)
    expect(afterSwitch.topic).toBe(PAPER_GENERATOR_EMPTY.topic)

    // Biology is NEET-only: switching back to JEE must reset it too.
    const neetState = sanitizeCascadeValues({ course: '', subject: 'Biology', chapter: 'Genetics', topic: 'Mendel' }, neet)
    const afterSwitchBack = sanitizeCascadeValues(neetState, jee)
    expect(afterSwitchBack.subject).toBe(PAPER_GENERATOR_EMPTY.subject)

    // Physics exists in both families; the tab itself resets subject on an
    // exam-family click, but the engine correctly keeps a subject valid for
    // both families (a stale JEE-only selection can never survive).
    const sharedJee = sanitizeCascadeValues({ course: '', subject: 'Physics' }, jee)
    const sharedAfter = sanitizeCascadeValues(sharedJee, neet)
    expect(sharedAfter.subject).toBe('Physics')

    // JEE must offer all three subjects; NEET its own three, deterministically.
    const jeeSubjects = jee.deriveOptions('subject', { subject: '' }, 'sanitize')
    const neetSubjects = neet.deriveOptions('subject', { subject: '' }, 'sanitize')
    expect(jeeSubjects).toEqual(expect.arrayContaining(['Mathematics', 'Physics', 'Chemistry']))
    expect(jeeSubjects).not.toContain('Biology')
    expect(neetSubjects).toEqual(expect.arrayContaining(['Physics', 'Chemistry', 'Biology']))
    expect(neetSubjects).not.toContain('Mathematics')
  })
})

describe('Competitive Question Browser — exam → subject → chapter → topic', () => {
  const questions = [
    { exam: 'JEE Main', subject: 'Physics', chapter: 'Rotational Motion', topic: 'Torque' },
    { exam: 'NEET UG', subject: 'Physics', chapter: 'Optics', topic: 'Lenses' },
    { exam: 'NEET UG', subject: 'Biology', chapter: 'Genetics', topic: 'Mendel' },
  ]

  it('clears chapter/topic when the exam changes and they no longer exist', () => {
    const jee = buildCompetitiveBrowserCascade({ questions, exams: ['JEE Main', 'NEET UG'] })
    const jeeState = sanitizeCascadeValues({ exam: 'JEE Main', subject: 'Physics', chapter: 'Rotational Motion', topic: 'Torque' }, jee)
    expect(jeeState.topic).toBe('Torque')
    const afterSwitch = sanitizeCascadeValues({ ...jeeState, exam: 'NEET UG' }, jee)
    // subject Physics still exists under NEET UG, so it is kept;
    // the JEE chapter/topic are cleared
    expect(afterSwitch).toMatchObject({ exam: 'NEET UG', subject: 'Physics', chapter: 'All', topic: 'All' })
  })

  it('clears a subject that only existed in the previous exam', () => {
    const jee = buildCompetitiveBrowserCascade({ questions, exams: ['JEE Main', 'NEET UG'] })
    const state = sanitizeCascadeValues({ exam: 'NEET UG', subject: 'Biology', chapter: 'Genetics', topic: 'Mendel' }, jee)
    const afterSwitch = sanitizeCascadeValues({ ...state, exam: 'JEE Main' }, jee)
    expect(afterSwitch).toMatchObject({ exam: 'JEE Main', subject: 'All', chapter: 'All', topic: 'All' })
  })

  it('keeps independent keys (year/difficulty/type) untouched', () => {
    const jee = buildCompetitiveBrowserCascade({ questions, exams: ['JEE Main', 'NEET UG'] })
    const next = sanitizeCascadeValues({ exam: 'NEET UG', subject: 'Biology', chapter: 'Genetics', topic: 'Mendel', year: '2025', difficulty: 'Hard', type: 'MCQ' }, jee)
    expect(next.year).toBe('2025')
    expect(next.difficulty).toBe('Hard')
    expect(next.type).toBe('MCQ')
  })
})

describe('Question Studio — topic → concept (per source, per domain)', () => {
  const source = {
    domain: 'competitive',
    exam: 'JEE',
    topics: [
      { topic: 'Rotational Motion', concepts: ['Torque', 'Moment of Inertia'] },
      { topic: 'Calculus', concepts: ['Integration'] },
    ],
  }

  it('clears a concept that does not exist under the newly selected topic', () => {
    const cascade = buildStudioCascade(source)
    const state = sanitizeCascadeValues({ topic: 'Rotational Motion', concept: 'Torque' }, cascade)
    expect(state.concept).toBe('Torque')
    const afterSwitch = sanitizeCascadeValues({ ...state, topic: 'Calculus' }, cascade)
    expect(afterSwitch).toMatchObject({ topic: 'Calculus', concept: 'All concepts' })
  })

  it('keeps a concept that exists in both topics', () => {
    const cascade = buildStudioCascade(source)
    const next = sanitizeCascadeValues({ topic: 'Calculus', concept: 'Integration' }, cascade)
    expect(next.concept).toBe('Integration')
  })

  it('clears everything for a source that has no topics yet (analysis pending)', () => {
    const empty = buildStudioCascade(null)
    const next = sanitizeCascadeValues({ topic: 'Rotational Motion', concept: 'Torque' }, empty)
    expect(next).toMatchObject({ topic: 'All topics', concept: 'All concepts' })
  })
})
