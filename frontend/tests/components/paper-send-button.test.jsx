// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaperCard } from '../../src/components/assessment-workspace/paper-parts.jsx'
import { ToastProvider } from '../../src/components/ui/toast.jsx'
import { act, renderDom } from '../setup/dom.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const cleanups = []
afterEach(() => {
  while (cleanups.length) cleanups.shift()()
  document.body.innerHTML = ''
})

function mountCard(paper, onShare = vi.fn()) {
  const view = renderDom(
    <ToastProvider>
      <PaperCard paper={paper} onShare={onShare} />
    </ToastProvider>,
  )
  cleanups.push(view.unmount)
  return { ...view, onShare }
}

function shareButton(container) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent.includes('Share'))
}

describe('Paper Library Share/Send button', () => {
  it('disables Share for a generating paper and does not open send', async () => {
    const { container, onShare } = mountCard({
      id: 'gen',
      title: 'Generating paper',
      generationStatus: 'GENERATING',
      requestedQuestionCount: 20,
      generatedQuestionCount: 8,
      selectedQuestionIds: ['q1'],
    })
    const btn = shareButton(container)
    expect(btn.disabled).toBe(true)
    expect(container.textContent).toContain('Questions are still being generated')
    await act(async () => { btn.click() })
    expect(onShare).not.toHaveBeenCalled()
  })

  it('disables Share for PROCESSING papers', () => {
    const { container } = mountCard({ id: 'p', title: 'P', status: 'PROCESSING', questions: 10 })
    expect(shareButton(container).disabled).toBe(true)
  })

  it('disables Share for failed generation', () => {
    const { container } = mountCard({ id: 'p', title: 'P', generationStatus: 'FAILED' })
    const btn = shareButton(container)
    expect(btn.disabled).toBe(true)
    expect(container.textContent).toContain('Question generation failed')
  })

  it('disables Share for an incomplete question set', () => {
    const { container } = mountCard({
      id: 'p',
      title: 'P',
      status: 'READY',
      requestedQuestions: 20,
      generatedQuestions: 15,
    })
    expect(shareButton(container).disabled).toBe(true)
  })

  it('enables Share for a READY complete paper and calls onShare', async () => {
    const { container, onShare } = mountCard({
      id: 'ready',
      title: 'Ready paper',
      generationStatus: 'READY',
      requestedQuestionCount: 2,
      generatedQuestionCount: 2,
      selectedQuestionIds: ['a', 'b'],
    })
    const btn = shareButton(container)
    expect(btn.disabled).toBe(false)
    await act(async () => { btn.click() })
    expect(onShare).toHaveBeenCalledTimes(1)
  })

  it('keeps Share enabled for published/sent papers (existing lifecycle)', async () => {
    const { container, onShare } = mountCard({
      id: 'pub',
      title: 'Published',
      status: 'Published',
      selectedQuestionIds: ['q1'],
    })
    const btn = shareButton(container)
    expect(btn.disabled).toBe(false)
    await act(async () => { btn.click() })
    expect(onShare).toHaveBeenCalled()
  })

  it('fails closed — Share disabled when status is missing', async () => {
    const { container, onShare } = mountCard({
      id: 'draft',
      title: 'Draft',
      status: 'Draft',
      selectedQuestionIds: ['q1', 'q2'],
      questions: 2,
    })
    const btn = shareButton(container)
    expect(btn.disabled).toBe(true)
    await act(async () => { btn.click() })
    expect(onShare).not.toHaveBeenCalled()
  })
})
