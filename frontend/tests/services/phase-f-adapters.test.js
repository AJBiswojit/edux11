import { describe, expect, it } from 'vitest'
import {
  adaptQuestionBank,
  canonicalExamFamily,
  filterQuestions,
  inferIdentityFromQuestionId,
  normalizeQuestion,
  toCompetitiveBrowserQuestion,
} from '@/api/adapters/questions'
import { normalizePaper, normalizePaperGeneratorPayload } from '@/api/adapters/papers'
import { adaptExamAgentExams, normalizeAttempt } from '@/api/adapters/attempts'
import { isBackendFailurePayload, messageFromPayload } from '@/api/errors'

describe('Phase F — question adapter isolation', () => {
  it('never classifies JEE vs NEET from subject name', () => {
    const physics = normalizeQuestion({
      id: 'QB-001',
      subject: 'Physics',
      text: 'A kinematics item',
      type: 'mcq',
      difficulty: 'easy',
      options: ['A', 'B', 'C', 'D'],
    })
    expect(physics.domain).toBeNull()
    expect(physics.examFamily).toBeNull()
  })

  it('uses backend id prefixes, not subject, for exam-agent questions', () => {
    expect(inferIdentityFromQuestionId('EA-JEE-PHY-01-Q01')).toEqual({
      domain: 'Competitive', examFamily: 'JEE', source: 'id-prefix',
    })
    expect(inferIdentityFromQuestionId('EA-NEET-PHY-01-Q01')).toEqual({
      domain: 'Competitive', examFamily: 'NEET', source: 'id-prefix',
    })
    expect(inferIdentityFromQuestionId('EA-UNI-CS501-M1-Q01')).toEqual({
      domain: 'University', examFamily: null, source: 'id-prefix',
    })

    const jee = normalizeQuestion({ id: 'EA-JEE-PHY-01-Q01', subject: 'Physics', stem: 'JEE item', q_type: 'mcq' })
    const neet = normalizeQuestion({ id: 'EA-NEET-PHY-01-Q01', subject: 'Physics', stem: 'NEET item', q_type: 'mcq' })
    expect(jee.examFamily).toBe('JEE')
    expect(neet.examFamily).toBe('NEET')
    expect(jee.subject).toBe('Physics')
    expect(neet.subject).toBe('Physics')
  })

  it('filters Competitive JEE without leaking NEET or University', () => {
    const bank = adaptQuestionBank({
      questions: [
        { id: 'EA-UNI-CS501-M1-Q01', subject: 'CS501', text: 'uni', type: 'MCQ' },
        { id: 'EA-JEE-PHY-01-Q01', subject: 'Physics', text: 'jee', type: 'MCQ' },
        { id: 'EA-NEET-PHY-01-Q01', subject: 'Physics', text: 'neet', type: 'MCQ' },
      ],
    }, { domain: 'Competitive', examFamily: 'JEE Main' })
    expect(bank.questions.map((q) => q.id)).toEqual(['EA-JEE-PHY-01-Q01'])
    expect(bank.total).toBe(1)
  })

  it('maps stem / q_type / difficulty onto the faculty UI shape', () => {
    const q = normalizeQuestion({
      id: 'EA-UNI-CS501-M1-Q01',
      stem: 'What is a heap?',
      q_type: 'mcq',
      difficulty: 'hard',
      options: ['A', 'B'],
      concept: 'Heaps',
    })
    expect(q.text).toBe('What is a heap?')
    expect(q.type).toBe('MCQ')
    expect(q.difficulty).toBe('Hard')
    expect(q.domain).toBe('University')
  })

  it('canonicalExamFamily accepts JEE Main / NEET UG as JEE / NEET', () => {
    expect(canonicalExamFamily('JEE Main')).toBe('JEE')
    expect(canonicalExamFamily('NEET UG')).toBe('NEET')
    expect(canonicalExamFamily('jee')).toBe('JEE')
  })

  it('competitive browser records keep empty answers when the bank omits keys', () => {
    const record = toCompetitiveBrowserQuestion(normalizeQuestion({
      id: 'EA-JEE-PHY-01-Q01',
      text: 'A JEE stem',
      options: ['w', 'x', 'y', 'z'],
      type: 'MCQ',
    }))
    expect(record.question).toBe('A JEE stem')
    expect(record.options).toHaveLength(4)
    expect(record.answer).toBeNull()
    expect(record.exam).toBe('JEE Main')
  })

  it('does not treat missing identity as Competitive', () => {
    const rows = filterQuestions([
      normalizeQuestion({ id: 'QB-9', subject: 'Physics', text: 'x', type: 'MCQ' }),
    ], { domain: 'Competitive', examFamily: 'JEE' })
    expect(rows).toHaveLength(0)
  })

  it('resolves structured { key, text, imageUrl } options to their display text', () => {
    const q = normalizeQuestion({
      id: 'EA-JEE-PHY-02-Q01',
      text: 'A particle is projected at 20 m/s. Find the range.',
      type: 'MCQ',
      options: [
        { key: 'A', text: '20.4 m', imageUrl: 'https://assets.edux/a.png' },
        { key: 'B', text: '40.8 m', imageUrl: null },
        { key: 'C', text: '', imageUrl: 'https://assets.edux/c.png' },
      ],
    })
    // Every option the faculty UI renders must be a renderable string.
    expect(q.options).toEqual(['20.4 m', '40.8 m', 'C'])
    expect(q.options.every((o) => typeof o === 'string')).toBe(true)
    // String options pass through untouched (classic bank contract).
    expect(normalizeQuestion({ id: 'q2', text: 'x', options: ['a', 'b'] }).options).toEqual(['a', 'b'])
  })
})

describe('Phase F — paper adapter', () => {
  it('maps mode/exam onto domain/examFamily without inventing selectedQuestionIds', () => {
    const paper = normalizePaper({
      id: 'gp_new_1',
      title: 'Draft A',
      mode: 'Competitive',
      exam: 'jee',
      status: 'Draft',
    })
    expect(paper.domain).toBe('Competitive')
    expect(paper.examFamily).toBe('JEE')
    expect(paper.selectedQuestionIds).toBeUndefined()
  })

  it('normalises a generator payload library list', () => {
    const data = normalizePaperGeneratorPayload({
      generatedPapers: [{ id: '1', mode: 'University', title: 'Mid' }],
      config: { programs: ['B.Tech'] },
    })
    expect(data.generatedPapers[0].domain).toBe('University')
    expect(data.config.programs).toEqual(['B.Tech'])
  })
})

describe('Phase F — attempt / exam-agent adapter', () => {
  it('title-cases exam mode and family without stripping correctAnswer', () => {
    const exams = adaptExamAgentExams({
      items: [{
        id: 'EA-JEE-FULL-01',
        type: 'JEE',
        category: 'Competitive',
        questions: [{ id: 'Q01', correctAnswer: 2, question: '…', options: ['a', 'b', 'c', 'd'] }],
      }],
    })
    expect(exams.items[0].examFamily).toBe('JEE')
    expect(exams.items[0].domain).toBe('Competitive')
    expect(exams.items[0].questions[0].correctAnswer).toBe(2)
  })

  it('keeps UK behaviour spelling from the backend', () => {
    const attempt = normalizeAttempt({
      examMode: 'university',
      examFamily: 'neet',
      behaviour: { flips: 1 },
      examName: 'Paper',
    })
    expect(attempt.examMode).toBe('University')
    expect(attempt.examFamily).toBe('NEET')
    expect(attempt.behaviour).toEqual({ flips: 1 })
    expect(attempt.examTitle).toBe('Paper')
  })
})

describe('Phase F — error contract', () => {
  it('treats HTTP 200 { ok: false } as failure', () => {
    expect(isBackendFailurePayload({ ok: false, error: 'Duplicate paper name' })).toBe(true)
    expect(isBackendFailurePayload({ ok: true, paper: {} })).toBe(false)
    expect(isBackendFailurePayload({ questions: [] })).toBe(false)
  })

  it('reads FastAPI detail strings and validation arrays', () => {
    expect(messageFromPayload({ detail: 'Invalid email, password, or role' })).toBe('Invalid email, password, or role')
    expect(messageFromPayload({ detail: [{ msg: 'email is required' }] })).toBe('email is required')
    expect(messageFromPayload({ ok: false, error: 'Paper name is required.' })).toBe('Paper name is required.')
  })
})
