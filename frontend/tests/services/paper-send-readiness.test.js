import { describe, expect, it } from 'vitest'
import { paperSendReadiness, PAPER_SEND_MESSAGES } from '@/api/adapters/paper-send-readiness'

describe('Paper Library Send readiness', () => {
  it('disables Send while generation is GENERATING even if counts match', () => {
    const result = paperSendReadiness({
      id: 'p1',
      generationStatus: 'GENERATING',
      requestedQuestionCount: 20,
      generatedQuestionCount: 20,
      selectedQuestionIds: Array.from({ length: 20 }, (_, i) => `q${i}`),
    })
    expect(result.canSend).toBe(false)
    expect(result.reason).toBe('generating')
    expect(result.message).toBe(PAPER_SEND_MESSAGES.generating)
  })

  it('disables Send while status is PROCESSING / IN_PROGRESS', () => {
    expect(paperSendReadiness({ status: 'PROCESSING', questions: 10 }).canSend).toBe(false)
    expect(paperSendReadiness({ generation_status: 'IN_PROGRESS', questions: 10 }).canSend).toBe(false)
    expect(paperSendReadiness({ generationStatus: 'in-progress', selectedQuestionIds: ['a'] }).reason).toBe('generating')
  })

  it('disables Send when generation failed', () => {
    const failed = paperSendReadiness({ generationStatus: 'FAILED', requestedQuestionCount: 20, generatedQuestionCount: 0 })
    expect(failed.canSend).toBe(false)
    expect(failed.reason).toBe('failed')
    expect(failed.message).toBe(PAPER_SEND_MESSAGES.failed)
    expect(paperSendReadiness({ status: 'ERROR' }).canSend).toBe(false)
  })

  it('disables Send when the question set is incomplete even if status is READY', () => {
    const result = paperSendReadiness({
      status: 'READY',
      requestedQuestions: 20,
      generatedQuestions: 15,
      selectedQuestionIds: Array.from({ length: 15 }, (_, i) => `q${i}`),
    })
    expect(result.canSend).toBe(false)
    expect(result.reason).toBe('incomplete')
    expect(result.message).toBe(PAPER_SEND_MESSAGES.generating)
  })

  it('enables Send when generation is READY/COMPLETE and questions are complete', () => {
    const ready = paperSendReadiness({
      generationStatus: 'READY',
      requestedQuestionCount: 20,
      generatedQuestionCount: 20,
      selectedQuestionIds: Array.from({ length: 20 }, (_, i) => `q${i}`),
    })
    expect(ready.canSend).toBe(true)
    expect(ready.reason).toBe('ready')
    expect(ready.message).toBeNull()

    const complete = paperSendReadiness({
      status: 'Complete',
      config: { count: 5 },
      questionList: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }],
    })
    expect(complete.canSend).toBe(true)
  })

  it('preserves published/sent lifecycle — Send remains available', () => {
    const published = paperSendReadiness({
      status: 'Published',
      selectedQuestionIds: ['q1', 'q2'],
    })
    expect(published.canSend).toBe(true)
    expect(published.reason).toBe('published')

    const sent = paperSendReadiness({ status: 'SENT', questions: 8 })
    expect(sent.canSend).toBe(true)
    expect(sent.reason).toBe('published')
  })

  it('fails closed when readiness status is missing or undefined', () => {
    expect(paperSendReadiness(undefined).canSend).toBe(false)
    expect(paperSendReadiness(null).reason).toBe('unknown')
    expect(paperSendReadiness({}).canSend).toBe(false)
    expect(paperSendReadiness({ id: 'p', selectedQuestionIds: ['q1'] }).canSend).toBe(false)
    expect(paperSendReadiness({ status: 'Draft', questions: 22, selectedQuestionIds: Array.from({ length: 22 }, (_, i) => `q${i}`) }).canSend).toBe(false)
    expect(paperSendReadiness({ status: 'Draft' }).message).toBe(PAPER_SEND_MESSAGES.unknown)
  })

  it('does not treat a UI question count as proof when backend status is still generating', () => {
    const result = paperSendReadiness({
      status: 'GENERATING',
      questions: 20,
      selectedQuestionIds: Array.from({ length: 20 }, (_, i) => `q${i}`),
    })
    expect(result.canSend).toBe(false)
    expect(result.reason).toBe('generating')
  })
})
