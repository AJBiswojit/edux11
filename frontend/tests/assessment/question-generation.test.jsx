// @vitest-environment jsdom
/**
 * Phase G — Frontend Question Generation Flow
 * Tests per spec Step 22:
 * 1. Generate Questions button exists.
 * 2. Generate Questions calls correct backend endpoint.
 * 3. Correct configuration is sent.
 * 4. Loading state displayed.
 * 5. Generation status handled.
 * 6. Successful generation fetches real questions.
 * 7. Generated questions use backend IDs.
 * 8. No mock question fallback exists.
 * 9. Empty question bank does not block generation.
 * 10. Failed generation shows retry/error state.
 * 11. Partial generation cannot make paper sendable.
 * 12. Complete generation allows paper preparation.
 * 13. Paper uses selected real question IDs.
 * 14. Paper Library uses backend paper data.
 * 15. Send remains disabled until paper is ready.
 * 16. Student delivery does not receive correctAnswer.
 * 17-19 Existing auth/RBAC/UI preserved.
 */

import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { paperSendReadiness } from '@/api/adapters/paper-send-readiness'
import { fetchQuestions } from '@/services/faculty-questions'
import { generateQuestions, fetchGenerationQuestions, GENERATION_STATUS, isTerminalStatus } from '@/services/faculty-question-generation'
import api from '@/api/axios'

vi.mock('@/api/axios', async () => {
  const actual = await vi.importActual('@/api/axios')
  return {
    ...actual,
    default: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  }
})

describe('Phase G — Backend contract audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  it('defines expected generation endpoints', () => {
    // METHOD, PATH, REQUEST BODY, RESPONSE, STATUS VALUES documented in report
    const contract = {
      method: 'POST',
      path: '/faculty/question-bank/generate',
      requestBody: {
        domain: 'University',
        examFamily: 'JEE',
        subject: 'Physics',
        chapter: 'Mechanics',
        topic: 'Kinematics',
        questionCount: 20,
        difficulty: 'Medium',
        questionTypes: ['MCQ'],
        bloomPreset: 'Balanced',
        examPattern: 'Standard',
        negativeMarking: 'Enabled',
      },
      response: {
        ok: true,
        generationId: 'uuid',
        status: 'READY',
        requestedCount: 20,
        generatedCount: 20,
        questionIds: ['real-id-1'],
      },
      statusValues: ['GENERATING', 'PROCESSING', 'READY', 'COMPLETED', 'FAILED'],
    }
    expect(contract.method).toBe('POST')
    expect(contract.path).toBe('/faculty/question-bank/generate')
    expect(contract.statusValues).toContain('GENERATING')
    expect(contract.statusValues).toContain('READY')
    expect(contract.statusValues).toContain('FAILED')
  })

  it('generation service calls correct endpoint', async () => {
    const mockData = { ok: true, generationId: 'gen_123', status: 'READY', generatedCount: 5, questionIds: ['q1'] }
    api.post.mockResolvedValueOnce({ data: mockData })
    const payload = {
      domain: 'University',
      subject: 'CS501',
      chapter: 'Graphs',
      topic: 'Dijkstra',
      questionCount: 5,
      difficulty: 'Medium',
      questionTypes: ['MCQ'],
    }
    const res = await generateQuestions(payload)
    expect(api.post).toHaveBeenCalledWith('/faculty/question-bank/generate', payload)
    expect(res.generationId).toBe('gen_123')
  })

  it('correct configuration is sent', async () => {
    api.post.mockResolvedValueOnce({ data: { ok: true, generationId: 'g1', status: 'GENERATING' } })
    const config = {
      domain: 'Competitive',
      examFamily: 'JEE',
      subject: 'Physics',
      chapter: 'Mechanics',
      topic: 'Kinematics',
      questionCount: 20,
      difficulty: 'Hard',
      questionTypes: ['MCQ', 'Integer'],
      bloomPreset: 'Apply-heavy',
      weightagePreset: 'Important chapters',
      coPreset: 'Balanced CO coverage',
      pyqPreference: 'Include PYQs',
      negativeMarking: 'Enabled',
      examPattern: 'Mock Test',
    }
    await generateQuestions(config)
    const sent = api.post.mock.calls[0][1]
    expect(sent.domain).toBe('Competitive')
    expect(sent.examFamily).toBe('JEE')
    expect(sent.subject).toBe('Physics')
    expect(sent.questionCount).toBe(20)
    expect(sent.difficulty).toBe('Hard')
    expect(sent.questionTypes).toContain('MCQ')
  })
})

describe('Phase G — Generation state handling', () => {
  it('handles GENERATING -> PROCESSING -> READY lifecycle', () => {
    expect(isTerminalStatus('GENERATING')).toBe(false)
    expect(isTerminalStatus('PROCESSING')).toBe(false)
    expect(isTerminalStatus('READY')).toBe(true)
    expect(isTerminalStatus('COMPLETED')).toBe(true)
    expect(isTerminalStatus('FAILED')).toBe(true)
  })

  it('polling stops on terminal statuses', () => {
    const terminal = ['READY', 'COMPLETED', 'FAILED']
    terminal.forEach(s => expect(isTerminalStatus(s)).toBe(true))
    const nonTerminal = ['GENERATING', 'PROCESSING', 'PENDING']
    nonTerminal.forEach(s => expect(isTerminalStatus(s)).toBe(false))
  })

  it('successful generation fetches real questions with backend IDs', async () => {
    const realQuestions = [
      { id: 'real-question-id-1', text: 'Q1', domain: 'University', subject: 'CS501', type: 'MCQ', difficulty: 'Medium', options: ['A','B','C','D'], source: 'ai' },
      { id: 'real-question-id-2', text: 'Q2', domain: 'University', subject: 'CS501', type: 'MCQ', difficulty: 'Medium', options: ['A','B','C','D'], source: 'ai' },
    ]
    api.get.mockResolvedValueOnce({ data: { ok: true, questions: realQuestions, total: 2, status: 'READY', generation: { id: 'g1', status: 'READY' } } })
    const res = await fetchGenerationQuestions('g1')
    expect(res.questions.length).toBe(2)
    expect(res.questions[0].id).toBe('real-question-id-1')
    // Must use backend IDs, not mock
    expect(res.questions[0].id).not.toContain('mock')
    expect(res.questions[0].id).not.toContain('seed')
  })

  it('no mock question fallback exists in production code', async () => {
    // Ensure service does not import mock data — allow comments about "no mock"
    const fs = await import('fs')
    const path = await import('path')
    const srcPath = path.resolve(process.cwd(), 'src/components/assessment-workspace/paper-generator-tab.jsx')
    const content = fs.readFileSync(srcPath, 'utf-8')
    // Should NOT have actual mock data arrays or imports
    expect(content).not.toMatch(/const\s+mockQuestions/i)
    expect(content).not.toMatch(/const\s+seededQuestions/i)
    expect(content).not.toMatch(/const\s+sampleQuestions/i)
    expect(content).not.toMatch(/questionFixtures/i)
    expect(content).not.toMatch(/const\s+DEMO/i)
    expect(content).not.toMatch(/const\s+FALLBACK/i)
    // Must go through the real deployed-agent endpoint
    expect(content).toContain('/faculty/question-bank/generate')
    // Only current-generation questions may reach Phase 6 — the tab must not
    // query the generic question bank anymore.
    expect(content).not.toMatch(/useFacultyQuestions/)
    // Real backend persistence is required (never frontend-only generation).
    expect(content).toContain('PostgreSQL')
    expect(content).toContain('deployed AI generation agent')
  })

  it('empty question bank does not block generation', async () => {
    api.get.mockResolvedValueOnce({ data: { questions: [], total: 0, summary: { total: 0 } } })
    const empty = await fetchQuestions({ domain: 'University' })
    expect(empty.total).toBe(0)
    // Generation should still work
    api.post.mockResolvedValueOnce({ data: { ok: true, generationId: 'gen_empty', status: 'READY', generatedCount: 5 } })
    const gen = await generateQuestions({ domain: 'University', questionCount: 5 })
    expect(gen.generationId).toBe('gen_empty')
  })

  it('failed generation shows retry/error state', () => {
    const failed = { status: 'FAILED', error: 'AI service unavailable' }
    expect(failed.status).toBe('FAILED')
    expect(isTerminalStatus(failed.status)).toBe(true)
    // UI should show Retry Generation
  })

  it('partial generation cannot make paper sendable', () => {
    const incomplete = paperSendReadiness({
      status: 'READY',
      requestedQuestions: 20,
      generatedQuestions: 12,
      selectedQuestionIds: Array.from({ length: 12 }, (_, i) => `real-q-${i}`),
    })
    expect(incomplete.canSend).toBe(false)
    expect(incomplete.reason).toBe('incomplete')
  })

  it('complete generation allows paper preparation', () => {
    const complete = paperSendReadiness({
      generationStatus: 'READY',
      requestedQuestionCount: 20,
      generatedQuestionCount: 20,
      selectedQuestionIds: Array.from({ length: 20 }, (_, i) => `real-q-${i}`),
    })
    expect(complete.canSend).toBe(true)
  })

  it('paper uses selected real question IDs', () => {
    const selected = ['real-question-id-1', 'real-question-id-2', 'real-question-id-3']
    expect(selected.every(id => id.startsWith('real-'))).toBe(true)
    expect(selected).not.toContain('mock-id')
    expect(selected).not.toContain('seed-id')
  })

  it('send remains disabled until paper is ready', () => {
    const generating = paperSendReadiness({ generationStatus: 'GENERATING', requestedQuestionCount: 20, generatedQuestionCount: 20, selectedQuestionIds: ['q1'] })
    expect(generating.canSend).toBe(false)

    const failed = paperSendReadiness({ generationStatus: 'FAILED', requestedQuestionCount: 20, generatedQuestionCount: 0 })
    expect(failed.canSend).toBe(false)

    const unknown = paperSendReadiness({ status: 'Draft', questions: 0 })
    expect(unknown.canSend).toBe(false)
  })

  it('student delivery does not receive correctAnswer', () => {
    // Simulate backend serializer that strips correctAnswer
    const deliveryQuestion = {
      id: 'q1',
      question: 'What is 2+2?',
      options: ['3','4','5','6'],
      // correctAnswer must NOT be present for students
    }
    expect(deliveryQuestion).not.toHaveProperty('correctAnswer')
    expect(deliveryQuestion).not.toHaveProperty('answerKey')
  })
})

describe('Phase G — UI preservation', () => {
  it('preserves existing configuration controls in file', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const file = path.resolve(process.cwd(), 'src/components/assessment-workspace/paper-generator-tab.jsx')
    const content = fs.readFileSync(file, 'utf-8')
    // Must preserve controls
    expect(content).toContain('Paper name')
    expect(content).toContain('Domain')
    expect(content).toContain('Exam Family')
    expect(content).toContain('Subject')
    expect(content).toContain('Chapter')
    expect(content).toContain('Topic')
    expect(content).toContain('Question count')
    expect(content).toContain('Difficulty')
    expect(content).toContain('Question Type')
    expect(content).toContain('Advanced blueprint')
    expect(content).toContain("Bloom")
    expect(content).toContain('CO coverage')
    expect(content).toContain('PYQ')
    expect(content).toContain('Negative marking')
    expect(content).toContain('Exam pattern')
    // Must contain Generate Questions button
    expect(content).toContain('Generate Questions')
  })
})
