import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import {
  MICRO_ASSESSMENT_COUNTS,
  buildMicroSource,
  computeConceptCoverage,
  computeMicroAssessmentResults,
  filterMicroSources,
  generateMicroQuestions,
  sameMicroContext,
  processMicroSource,
  buildPrototypeMicroAttempts,
  studentAttemptStatus,
  sourceFilterOptions,
} from '../../src/intelligence/faculty/engine/micro-assessments.js'
import { MICRO_ASSESSMENT_SOURCE_TYPES, MICRO_ASSESSMENT_EXAM_FAMILIES, MICRO_ASSESSMENT_DOMAINS } from '../fixtures/micro-assessments.js'
import { microAssessmentSources } from '../fixtures/micro-assessments.js'
import { activeSourceFilters, deriveSourceFilterOptions, sanitizeSourceFilters, sourceMatchesFilters } from '../../src/components/micro-assessment-studio/source-library-filters.js'
import { Select, SelectItem } from '../../src/components/ui/select.jsx'
import { containsInternalGenerationLabel, formatFacultyAnswer } from '../../src/components/micro-assessment-studio/question-presentation.js'
import { installTestStorage } from '../setup/api.js'

/**
 * AI Micro-Assessment Studio — engine + UI contract suite.
 *
 * Phase 11 (Complete Physical Mock-Shim Removal) — the in-browser prototype
 * API router and its route handlers (sources/process/generate/participants/
 * send/results/intervention) have been deleted. The "faculty send → student
 * flow → results" section that exercised the prototype STORE now has no
 * production behaviour to verify (there is no backend in this repo, so
 * nothing is persisted or exposed to a student at runtime). Those tests are
 * intentionally dropped — they only verified deleted mock infrastructure.
 *
 * The remaining assertions are all legitimate ENGINE/UI contract tests:
 *   · curated source contract (10 sources / domain-family isolation)
 *   · Source Library filter derivation + connected Selects
 *   · deterministic question generation + concept coverage
 *   · progress/comprehension helpers (formatFacultyAnswer, internal labels)
 *   · engine-level processMicroSource / prototype attempts / results
 *     (these do NOT touch storage and never create an intervention
 *      automatically — results.automatic === false and noAutoIntervention)
 */

installTestStorage()

const { storage } = installTestStorage()

describe('curated source contract and canonical context isolation', () => {
  it('contains exactly five University, three JEE and two NEET sources', () => {
    expect(microAssessmentSources).toHaveLength(10)
    expect(microAssessmentSources.filter((source) => source.domain === 'university')).toHaveLength(5)
    expect(microAssessmentSources.filter((source) => source.domain === 'competitive' && source.examFamily === 'JEE')).toHaveLength(3)
    expect(microAssessmentSources.filter((source) => source.domain === 'competitive' && source.examFamily === 'NEET')).toHaveLength(2)
    expect(microAssessmentSources.every((source) => source.wordCount >= 170 && source.wordCount <= 220)).toBe(true)
  })

  it('keeps University Physics, JEE Physics and NEET Physics in distinct contexts', () => {
    const university = filterMicroSources({ domain: 'university', subject: 'Physics' }, microAssessmentSources)
    const jee = filterMicroSources({ domain: 'competitive', examFamily: 'JEE', subject: 'Physics' }, microAssessmentSources)
    const neet = filterMicroSources({ domain: 'competitive', examFamily: 'NEET', subject: 'Physics' }, microAssessmentSources)
    expect(university.map((source) => source.id)).toEqual(['mas-uni-physics-wave-particle'])
    expect(jee.map((source) => source.id)).toEqual(['mas-jee-physics-rotational-motion'])
    expect(neet).toEqual([])
    expect(sameMicroContext(university[0], jee[0])).toBe(false)
  })

  it('keeps JEE Chemistry separate from NEET Chemistry without subject heuristics', () => {
    const jee = filterMicroSources({ domain: 'competitive', examFamily: 'JEE', subject: 'Chemistry' }, microAssessmentSources)
    const neet = filterMicroSources({ domain: 'competitive', examFamily: 'NEET', subject: 'Chemistry' }, microAssessmentSources)
    expect(jee).toHaveLength(1)
    expect(jee[0].chapter).toBe('Chemical Equilibrium')
    expect(neet).toHaveLength(1)
    expect(neet[0].chapter).toBe('Coordination Compounds')
    expect(sameMicroContext(jee[0], neet[0])).toBe(false)
  })

  it('exposes source metadata and ten pre-seeded questions per source', () => {
    const required = ['id', 'title', 'domain', 'examFamily', 'subject', 'chapter', 'topic', 'sourceType', 'content', 'wordCount', 'estimatedReadingTime', 'detectedConcepts', 'questionOpportunities', 'generatedQuestions']
    for (const source of microAssessmentSources) {
      for (const field of required) expect(source).toHaveProperty(field)
      expect(source.generatedQuestions).toHaveLength(10)
      expect(source.generatedQuestions.every((question) => question.sourceId === source.id)).toBe(true)
      expect(source.generatedQuestions.every((question) => question.chapter === source.chapter && question.topic === source.topic)).toBe(true)
    }
  })

  it('keeps canonical source-type / domain / family contract constants', () => {
    expect(MICRO_ASSESSMENT_SOURCE_TYPES).toEqual(expect.arrayContaining(['Textbook', 'NCERT', 'Custom Text']))
    expect(MICRO_ASSESSMENT_DOMAINS).toEqual(['university', 'competitive'])
    expect(MICRO_ASSESSMENT_EXAM_FAMILIES).toEqual(['JEE', 'NEET'])
    // UI derives its filter options from the source catalog, never from a mock route
    expect(sourceFilterOptions(microAssessmentSources).subjects.length).toBeGreaterThan(0)
  })
})

describe('connected Source Library filters', () => {
  const catalog = microAssessmentSources.map(({ generatedQuestions: _generatedQuestions, ...metadata }) => metadata)
  const base = { search: '', domain: '', examFamily: '', subject: '', chapter: '', topic: '', sourceType: '' }

  it('derives downstream options from the selected canonical context', () => {
    const jee = deriveSourceFilterOptions({ ...base, domain: 'competitive', examFamily: 'JEE' }, catalog)
    expect(jee.examFamilies).toEqual(['JEE', 'NEET'])
    expect(jee.subjects).toEqual(expect.arrayContaining(['Physics', 'Chemistry', 'Mathematics']))
    expect(jee.subjects).not.toContain('Biology')
    const neetPhysics = deriveSourceFilterOptions({ ...base, domain: 'competitive', examFamily: 'NEET', subject: 'Physics' }, catalog)
    expect(neetPhysics.chapters).toEqual([])
    expect(neetPhysics.topics).toEqual([])
  })

  it('derives subject, chapter and topic options in the hierarchy', () => {
    const subject = deriveSourceFilterOptions({ ...base, domain: 'competitive', examFamily: 'JEE', subject: 'Physics' }, catalog)
    expect(subject.chapters).toEqual(['Rotational Motion'])
    expect(subject.topics).toEqual([])
    const chapter = deriveSourceFilterOptions({ ...base, domain: 'competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion' }, catalog)
    expect(chapter.topics).toEqual(['Torque and Angular Momentum'])
  })

  it('keeps Source Type independent while combining it with hierarchy filters', () => {
    const options = deriveSourceFilterOptions({ ...base, domain: 'competitive', examFamily: 'JEE', sourceType: 'Study Material' }, catalog)
    expect(options.subjects).toEqual(expect.arrayContaining(['Chemistry', 'Mathematics']))
    expect(options.domains).toEqual(['competitive'])
  })

  it('resets invalid downstream values when a parent changes', () => {
    const current = { ...base, domain: 'competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion', topic: 'Torque and Angular Momentum' }
    expect(sanitizeSourceFilters({ ...current, examFamily: 'NEET' }, catalog)).toMatchObject({ domain: 'competitive', examFamily: 'NEET', subject: '', chapter: '', topic: '' })
    expect(sanitizeSourceFilters({ ...current, subject: 'Chemistry' }, catalog)).toMatchObject({ examFamily: 'JEE', subject: 'Chemistry', chapter: '', topic: '' })
    expect(sanitizeSourceFilters({ ...current, chapter: 'Chemical Equilibrium' }, catalog)).toMatchObject({ subject: 'Physics', chapter: '', topic: '' })
  })

  it('does not clear valid hierarchy values just because search/source type creates no matches', () => {
    const current = { ...base, domain: 'university', subject: 'Physics', chapter: 'Quantum Mechanics', topic: 'Wave-Particle Duality' }
    const next = sanitizeSourceFilters({ ...current, search: 'torque' }, catalog)
    expect(next).toMatchObject({ ...current, search: 'torque' })
    expect(sourceMatchesFilters(microAssessmentSources[4], next)).toBe(false)
  })

  it('supports case-insensitive content search and combined final matching', () => {
    expect(sourceMatchesFilters(microAssessmentSources[5], { ...base, domain: 'competitive', examFamily: 'JEE', subject: 'Physics', search: 'ANGULAR MOMENTUM' })).toBe(true)
    expect(filterMicroSources({ domain: 'competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion', topic: 'Torque and Angular Momentum', search: 'torque' }, microAssessmentSources)).toHaveLength(1)
    expect(filterMicroSources({ domain: 'university', subject: 'Physics', sourceType: 'Textbook' }, microAssessmentSources)).toHaveLength(1)
    expect(filterMicroSources({ domain: 'competitive', examFamily: 'JEE', sourceType: 'NCERT / Study Material' }, microAssessmentSources)).toHaveLength(1)
    expect(filterMicroSources({ search: 'not-a-real-source' }, microAssessmentSources)).toHaveLength(0)
  })

  it('normalizes All placeholders, exposes active filters, and supports clear-all state', () => {
    expect(sanitizeSourceFilters({ domain: 'All', examFamily: 'All competitive exams', subject: 'All subjects', chapter: 'All chapters', topic: 'All topics', sourceType: 'All source types' }, catalog)).toEqual(base)
    const active = activeSourceFilters({ ...base, domain: 'university', subject: 'Physics', search: 'wave' })
    expect(active.map((item) => item.key)).toEqual(['search', 'domain', 'subject'])
    expect(sanitizeSourceFilters(base, catalog)).toEqual(base)
  })

  it('renders the selected filter value in the trigger, not a generic Select placeholder', () => {
    const html = renderToString(React.createElement(Select, { value: 'Physics', ariaLabel: 'Subject filter', collision: true }, [
      React.createElement(SelectItem, { key: 'all', value: 'All' }, 'All subjects'),
      React.createElement(SelectItem, { key: 'physics', value: 'Physics' }, 'Physics'),
    ]))
    expect(html).toContain('Physics')
    expect(html).toContain('Subject filter: Physics')
    expect(html).not.toContain('Select…')
  })
})

describe('deterministic understanding, question generation and coverage', () => {
  it('generates deterministic questions for 5, 10, 15 and 20 counts', () => {
    const source = microAssessmentSources[5]
    for (const count of MICRO_ASSESSMENT_COUNTS) {
      const first = generateMicroQuestions({ source, count, difficulty: 'Mixed' })
      const second = generateMicroQuestions({ source, count, difficulty: 'Mixed' })
      expect(first.questions).toHaveLength(count)
      expect(first.questions).toEqual(second.questions)
      expect(new Set(first.questions.map((question) => question.id)).size).toBe(count)
    }
  })

  it('does not leak internal Source check labels into question text while keeping source metadata', () => {
    const result = generateMicroQuestions({ source: microAssessmentSources[9], count: 20 })
    expect(result.questions).toHaveLength(20)
    expect(result.questions.every((question) => !containsInternalGenerationLabel(question.question))).toBe(true)
    expect(result.questions.every((question) => !/source check/i.test(question.question))).toBe(true)
    expect(result.questions.every((question) => question.sourceId && question.chapter && question.topic && question.sourceTitle && question.sourceReference)).toBe(true)
    expect(result.questions.some((question) => question.generationMetadata?.kind === 'source-pool-extension')).toBe(true)
  })

  it('formats answers by question type without inventing explanations', () => {
    const mcq = { questionType: 'Direct MCQ', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi'], answerIndex: 1, correctAnswer: 'Mitochondria' }
    const blank = { questionType: 'Fill in the Blank', options: [], correctAnswer: 'Ionic' }
    const statement = { questionType: 'Statement Based', options: [], correctAnswer: 'Statement I is correct; Statement II is incorrect.' }
    const match = { questionType: 'Match the Following', options: [], correctAnswer: 'A–3, B–1, C–4, D–2' }
    expect(formatFacultyAnswer(mcq)).toBe('B. Mitochondria')
    expect(formatFacultyAnswer(blank)).toBe('Ionic')
    expect(formatFacultyAnswer(statement)).toBe('Statement I is correct; Statement II is incorrect.')
    expect(formatFacultyAnswer(match)).toBe('A–3, B–1, C–4, D–2')
  })

  it('renders the selected assessment size and never leaves a Select placeholder after a choice', () => {
    const html = renderToString(React.createElement(Select, { value: '20', ariaLabel: 'Choose the size of the micro-assessment', placeholder: 'Select size' }, [
      React.createElement(SelectItem, { key: '5', value: '5' }, '5 questions'),
      React.createElement(SelectItem, { key: '20', value: '20' }, '20 questions'),
    ]))
    expect(html).toContain('20 questions')
    expect(html).toContain('Choose the size of the micro-assessment: 20 questions')
    expect(html).not.toContain('Select size')
    expect(html).not.toContain('Select…')
  })

  it('returns varied question types and complete visible metadata', () => {
    const result = generateMicroQuestions({ source: microAssessmentSources[0], count: 10 })
    expect(new Set(result.questions.map((question) => question.questionType)).size).toBeGreaterThan(5)
    expect(result.questions.every((question) => question.chapter && question.topic && question.concept && question.difficulty && question.questionType && question.sourceId)).toBe(true)
    expect(result.questions.every((question) => question.validation.sourceGrounded && question.validation.answerSupported && question.validation.noDuplicate)).toBe(true)
  })

  it('maps difficulty preferences deterministically without mixing contexts', () => {
    const result = generateMicroQuestions({ source: microAssessmentSources[6], count: 10, difficulty: 'Hard' })
    expect(result.questions[0].difficulty).toBe('Hard')
    expect(result.questions.every((question) => question.chapter === 'Chemical Equilibrium' && question.examFamily === undefined)).toBe(true)
    expect(result.note).toContain('deterministic')
  })

  it('computes concept coverage and can identify lower-coverage concepts', () => {
    const source = microAssessmentSources[5]
    const questions = generateMicroQuestions({ source, count: 5 }).questions
    const coverage = computeConceptCoverage(questions, source)
    expect(coverage).toHaveLength(source.detectedConcepts.length)
    expect(coverage.some((item) => item.percentage < 100)).toBe(true)
  })

  it('supports a pasted source with structured metadata and no dataset shortcut', () => {
    const source = buildMicroSource({ id: 'custom-source-test', title: 'Faculty note', domain: 'university', subject: 'Biology', chapter: 'Cell Biology', topic: 'Membranes', sourceType: 'Custom Text', content: 'A membrane regulates movement of substances across a cell boundary and supports selective transport.' })
    const result = generateMicroQuestions({ source, count: 10 })
    expect(result.questions).toHaveLength(10)
    expect(result.questions.every((question) => question.sourceId === 'custom-source-test' && question.topic === 'Membranes')).toBe(true)
  })
})

describe('engine-level processing, prototype attempts and results (no store, no storage writes)', () => {
  it('processes source content and returns AI Understanding without a real model', () => {
    const source = microAssessmentSources[0]
    const processed = processMicroSource(source)
    expect(processed.ok).toBe(true)
    expect(processed.understanding.chapter).toBe('Data Structures')
    expect(processed.understanding.concepts.length).toBeGreaterThan(2)
    expect(processed.processingSteps).toEqual(['Reading source', 'Identifying concepts', 'Finding question opportunities', 'Preparing assessment'])
    expect(processed.note).toContain('no real LLM')
  })

  it('computes results from prototype attempts without creating an intervention automatically', () => {
    const source = microAssessmentSources[0]
    const generated = generateMicroQuestions({ source, count: 10 })
    const assessment = {
      id: 'ma-1', sourceId: source.id, questions: generated.questions,
      target: { studentIds: ['s1', 's2', 's3', 's4', 's5'] },
    }
    const storageBefore = storage.getItem('EduX_faculty_interventions')
    const attempts = buildPrototypeMicroAttempts(assessment, assessment.target.studentIds)
    const results = computeMicroAssessmentResults(assessment, attempts)
    expect(results.studentsCompleted).toBe(attempts.length)
    expect(results.averageAccuracy).toBeLessThan(100)
    expect(results.weakConcepts.length).toBeGreaterThan(0)
    expect(results.interventionRecommendation?.automatic).toBe(false)
    expect(results.noAutomaticIntervention).toBe(true)
    // No intervention is persisted anywhere — no storage write happened
    expect(storage.getItem('EduX_faculty_interventions')).toBe(storageBefore)
  })

  it('reports student attempt status from the engine without a store', () => {
    const source = microAssessmentSources[0]
    const generated = generateMicroQuestions({ source, count: 5 })
    // buildPrototypeMicroAttempts derives completed attempts from the target list,
    // deliberately excluding the very first student id (s1) as the "not yet attempted".
    const assessment = { id: 'ma-2', sourceId: source.id, questions: generated.questions, target: { studentIds: ['s1', 's2'] } }
    const attempts = buildPrototypeMicroAttempts(assessment, ['s1', 's2'])
    expect(attempts.length).toBeGreaterThan(0)
    expect(studentAttemptStatus(assessment, attempts[0].studentId, attempts).status).toBe('Completed')
    expect(studentAttemptStatus(assessment, 's1', attempts).status).toBe('Not Started')
    expect(studentAttemptStatus(assessment, 's-missing', attempts).status).toBe('Not Started')
    expect(studentAttemptStatus(assessment, 's-missing', attempts).attempt).toBeNull()
  })
})
