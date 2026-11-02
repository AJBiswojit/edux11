// @vitest-environment jsdom
/**
 * Paper Library card + View modal regression.
 *
 * Covers the production defects:
 *  - Library cards were an action toolbar (Duplicate / V1 / DOCX / Print /
 *    Archive) instead of a focused View / Edit / Share / Delete hierarchy.
 *  - The View modal always rendered "No questions in this paper yet" because
 *    it read paper.questionList only — the library list payload has counts,
 *    not questions — and never fetched the paper detail endpoint.
 *  - Structured option records ({ key, text, imageUrl }) could be rendered
 *    as raw objects.
 */
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const state = vi.hoisted(() => ({
  detailRequests: [],
  aiDetail: null,
}))

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(async (url) => {
      if (url.startsWith('/faculty/paper-generator/ai-paper/')) {
        state.detailRequests.push(url)
        return { data: state.aiDetail }
      }
      if (url === '/faculty/roster') return { data: { students: [] } }
      return { data: {} }
    }),
    post: vi.fn(async () => ({ data: { ok: true } })),
    patch: vi.fn(async () => ({ data: { ok: true } })),
    delete: vi.fn(async () => ({ data: { ok: true } })),
  },
}))

vi.mock('@/services', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, useFacultyRoster: () => ({ data: { students: [] } }) }
})

import { PaperCard, PaperPreviewDialog } from '../../src/components/assessment-workspace/paper-parts.jsx'
import { ToastProvider } from '../../src/components/ui/toast.jsx'
import { renderDom, settle } from '../setup/dom.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const AI_PAPER = {
  id: 'ai-paper-1',
  paperCode: 'AIP-001',
  title: 'JEE Main · Physics Full Mock',
  status: 'Draft',
  domain: 'Competitive',
  mode: 'Competitive',
  examFamily: 'JEE',
  subject: 'Physics',
  examType: 'AI Generated',
  paperType: 'AI Generated',
  totalMarks: 8,
  duration: 60,
  questions: 2,
  created: '2026-08-01',
  modified: '2026-08-02',
  faculty: 'Dr. Meera Krishnan',
  source: 'ai',
}

const AI_DETAIL = {
  ok: true,
  paper_id: 'ai-paper-1',
  title: 'JEE Main · Physics Full Mock',
  examFamily: 'JEE',
  domain: 'Competitive',
  subject: 'Physics',
  status: 'draft',
  requested: 2,
  generated: 2,
  questions: [
    {
      id: 'ai-q-1',
      type: 'MCQ',
      difficulty: 'Medium',
      marks: 4,
      chapter: 'Mechanics',
      text: 'A particle is projected at 20 m/s at 45°. Find the range.',
      options: [
        { key: 'A', text: '20.4 m', imageUrl: null },
        { key: 'B', text: '40.8 m', imageUrl: null },
        { key: 'C', text: '61.2 m', imageUrl: null },
        { key: 'D', text: '81.6 m', imageUrl: null },
      ],
      correctOption: 'B',
      explanation: 'Range = u²sin(2θ)/g = 400/9.8 ≈ 40.8 m.',
    },
    {
      id: 'ai-q-2',
      type: 'MCQ',
      difficulty: 'Hard',
      marks: 4,
      text: 'Plain string options render as plain text.',
      options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
      correctOption: '2',
    },
  ],
}

const cleanups = []
function mount(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const view = renderDom(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  cleanups.push(view.unmount)
  return view
}

beforeEach(() => {
  state.detailRequests = []
  state.aiDetail = null
})
afterEach(() => {
  while (cleanups.length) cleanups.shift()()
  document.body.innerHTML = ''
})

describe('Paper Library card — focused action hierarchy', () => {
  it('renders View/Edit/Share/Delete and none of the removed toolbar actions', () => {
    const onView = vi.fn()
    const { container } = mount(
      <PaperCard paper={AI_PAPER} onView={onView} onEdit={vi.fn()} onShare={vi.fn()} onDelete={vi.fn()} />,
    )
    const text = container.textContent
    expect(text).toContain('View')
    expect(text).toContain('Edit')
    expect(text).toContain('Share')
    expect(container.querySelector('button[aria-label="Delete paper"]')).toBeTruthy()

    // Removed actions must be absent from the card.
    expect(text).not.toContain('Duplicate')
    expect(text).not.toContain('DOCX')
    expect(text).not.toContain('Print')
    expect(text).not.toContain('Archive')
    expect(text).not.toMatch(/\bv1\b/i)
    // Information hierarchy — question count appears once, in metadata.
    expect(text).toContain('2 questions')
    expect((text.match(/2 questions/g) || []).length).toBe(1)
    // AI provenance and Competitive exam family shown.
    expect(text).toContain('AI Generated')
    expect(text).toContain('JEE')
  })

  it('hides competitive exam-family metadata on University papers', () => {
    const uni = {
      id: 'u1',
      title: 'Mid Semester — DSA — Paper A',
      status: 'Draft',
      domain: 'University',
      mode: 'University',
      examFamily: null,
      exam: null,
      subject: 'Data Structures & Algorithms',
      examType: 'Mid Semester',
      paperType: 'Mid Semester',
      totalMarks: 50,
      duration: 120,
      questions: 10,
      created: '2026-08-01',
    }
    const { container } = mount(<PaperCard paper={uni} onView={vi.fn()} onEdit={vi.fn()} onShare={vi.fn()} onDelete={vi.fn()} />)
    const text = container.textContent
    expect(text).toContain('University')
    expect(text).not.toContain('JEE')
    expect(text).not.toContain('NEET')
    expect(text).not.toContain('AI Generated')
  })

  it('View is the primary action and fires with the paper', async () => {
    const onView = vi.fn()
    const { container } = mount(<PaperCard paper={AI_PAPER} onView={onView} />)
    const viewBtn = [...container.querySelectorAll('button')].find((b) => b.textContent.includes('View'))
    expect(viewBtn).toBeTruthy()
    viewBtn.click()
    await settle(20)
    expect(onView).toHaveBeenCalledTimes(1)
    expect(onView.mock.calls[0][0].id).toBe('ai-paper-1')
  })
})

describe('Paper View modal — real questions from the detail endpoint', () => {
  it('fetches ai-paper detail and renders the actual questions (no false empty state)', async () => {
    state.aiDetail = AI_DETAIL
    const { container } = mount(<PaperPreviewDialog open paper={AI_PAPER} onOpenChange={vi.fn()} />)
    await settle(120)

    // The detail endpoint was called for the selected paper.
    expect(state.detailRequests.some((url) => url.includes('/ai-paper/ai-paper-1'))).toBe(true)

    const text = document.body.textContent
    expect(text).toContain('A particle is projected at 20 m/s')
    expect(text).toContain('Plain string options render as plain text')
    // Structured option records render their text, never the object.
    expect(text).toContain('40.8 m')
    expect(text).not.toContain('[object Object]')
    expect(text).not.toContain('imageUrl')
    // Correct answer + explanation are shown when provided.
    expect(text).toContain('Explanation:')
    expect(text).toContain('Range = u²sin(2θ)/g')
    // No false empty state.
    expect(text).not.toContain('No questions in this paper yet')
    // Removed modal actions are absent.
    expect(text).not.toContain('DOCX')
    expect(text).not.toContain('Print')
    expect(text).not.toContain('Shuffle')
  })

  it('renders an honest empty state for a genuinely empty paper and does not crash', async () => {
    const emptyPaper = { ...AI_PAPER, id: 'ai-paper-empty', questions: 0 }
    state.aiDetail = { ok: true, generated: 0, questions: [] }
    const { container } = mount(<PaperPreviewDialog open paper={emptyPaper} onOpenChange={vi.fn()} />)
    await settle(120)
    const text = document.body.textContent
    expect(text).toContain('No questions in this paper yet')
  })

  it('flags a metadata/relationship inconsistency instead of pretending questions exist', async () => {
    // Library card says 2 questions; the backend read-back has zero rows.
    state.aiDetail = { ok: true, generated: 0, questions: [] }
    const { container } = mount(<PaperPreviewDialog open paper={AI_PAPER} onOpenChange={vi.fn()} />)
    await settle(120)
    const text = document.body.textContent
    expect(text).toContain('out of sync')
    expect(text).not.toContain('A particle is projected')
  })

  it('renders embedded questionList (SQL papers) without a detail fetch', async () => {
    const sqlPaper = {
      ...AI_PAPER,
      id: 'sql-paper-1',
      source: undefined,
      selectedQuestionIds: ['q-1'],
      questionList: [
        { id: 'q-1', type: 'MCQ', difficulty: 'Easy', marks: 2, text: 'SQL paper question?', options: ['One', 'Two', 'Three', 'Four'] },
      ],
    }
    const view = mount(<PaperPreviewDialog open paper={sqlPaper} onOpenChange={vi.fn()} />)
    await settle(60)
    const text = document.body.textContent
    expect(text).toContain('SQL paper question?')
    expect(text).not.toContain('No questions in this paper yet')
    // SQL papers carry questionList in the paper payload — no ai-paper fetch.
    expect(state.detailRequests).toHaveLength(0)
  })
})
