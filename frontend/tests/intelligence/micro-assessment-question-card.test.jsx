// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { QuestionCard, QuestionReview } from '../../src/components/micro-assessment-studio/question-review.jsx'
import { act, renderDom } from '../setup/dom.js'

const cleanups = []
afterEach(() => {
  while (cleanups.length) cleanups.shift()()
  document.body.innerHTML = ''
})

function sampleQuestion(overrides = {}) {
  return {
    id: 'q-1',
    question: 'A ligand donates a _____ pair to the central metal.',
    questionType: 'Fill in the Blank',
    difficulty: 'Easy',
    chapter: 'Coordination Compounds',
    topic: 'Coordination Number',
    concept: 'Central metal and ligands',
    options: [],
    correctAnswer: 'Ionic',
    explanation: 'A coordinate bond forms when the ligand supplies both bonding electrons.',
    sourceId: 'mas-neet-chemistry-coordination',
    sourceTitle: 'NCERT — Coordination Compounds',
    sourceReference: 'Coordination Compounds · Coordination Number',
    validation: { sourceGrounded: true, answerSupported: true, noDuplicate: true, label: 'Prototype AI Validation' },
    ...overrides,
  }
}

describe('micro-assessment question card presentation', () => {
  it('hides the answer until Show answer is pressed and can hide it again', async () => {
    const view = renderDom(<QuestionCard question={sampleQuestion()} index={0} onUpdate={() => {}} onRegenerate={() => {}} onDelete={() => {}} />)
    cleanups.push(view.unmount)
    expect(view.container.textContent).toContain('A ligand donates a _____ pair to the central metal.')
    expect(view.container.textContent).not.toContain('Source check')
    expect(view.container.textContent).not.toMatch(/Answer[\s\S]*Ionic/)
    const toggle = [...view.container.querySelectorAll('button')].find((button) => button.textContent.includes('Show answer'))
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    await act(async () => { toggle.click() })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.textContent).toContain('Hide answer')
    expect(view.container.textContent).toContain('Ionic')
    expect(view.container.textContent).toContain('A coordinate bond forms')
    await act(async () => { toggle.click() })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(view.container.textContent).not.toMatch(/Answer[\s\S]*Ionic/)
  })

  it('does not fabricate an explanation when none exists', async () => {
    const view = renderDom(<QuestionCard question={sampleQuestion({ explanation: '' })} index={0} onUpdate={() => {}} onRegenerate={() => {}} onDelete={() => {}} />)
    cleanups.push(view.unmount)
    const toggle = [...view.container.querySelectorAll('button')].find((button) => button.textContent.includes('Show answer'))
    await act(async () => { toggle.click() })
    expect(view.container.textContent).toContain('Ionic')
    expect(view.container.textContent).not.toContain('Why')
  })

  it('keeps answer reveal state independent per question', async () => {
    const questions = [
      sampleQuestion({ id: 'q-1', correctAnswer: 'Ionic' }),
      sampleQuestion({ id: 'q-2', question: 'Which organelle produces ATP?', questionType: 'Direct MCQ', options: ['Nucleus', 'Mitochondria'], answerIndex: 1, correctAnswer: 'Mitochondria', explanation: '' }),
    ]
    const view = renderDom(<QuestionReview questions={questions} coverage={[]} diversity={40} onUpdate={() => {}} onRegenerate={() => {}} onDelete={() => {}} onGenerateMissing={() => {}} />)
    cleanups.push(view.unmount)
    const toggles = [...view.container.querySelectorAll('button')].filter((button) => button.textContent.includes('Show answer'))
    expect(toggles).toHaveLength(2)
    await act(async () => { toggles[1].click() })
    expect(toggles[0].getAttribute('aria-expanded')).toBe('false')
    expect(toggles[1].getAttribute('aria-expanded')).toBe('true')
    expect(view.container.textContent).toContain('B. Mitochondria')
    expect(view.container.textContent).not.toMatch(/Answer[\s\S]*Ionic/)
  })
})
