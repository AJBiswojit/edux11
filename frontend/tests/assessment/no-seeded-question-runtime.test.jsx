// @vitest-environment jsdom
/**
 * Runtime no-seeded-question guarantee (FRONTEND-SEEDED-QUESTION-REMOVAL).
 *
 * The Assessment Intelligence surfaces must render question RECORDS only
 * from the live question-bank API. When GET /faculty/question-bank returns
 * questions: [], no seeded record embedded in any other payload (e.g. the
 * faculty-intelligence summary's datasets/derived blocks) may appear, and
 * the existing empty state must render instead. When the bank returns real
 * rows, the same surfaces must render those rows.
 */
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/* The PYQ analytics service is a thin API wrapper; tests stub it at the
   service boundary (no fake backend, per tests/setup/api.js contract). */
vi.mock('../../src/services/extra', () => ({
  usePYQAnalysis: () => ({ data: { overview: { totalPapers: 0, totalQuestions: 0, yearsCovered: [] } } }),
  usePYQFilters: () => ({ data: { subjects: [], chapters: {}, yearRanges: [] } }),
  usePYQPatterns: () => ({ data: { items: [] } }),
  usePYQAnalytics: () => ({ data: undefined }),
}))
vi.mock('../../src/services', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, useQuestionBank: () => ({ data: { summary: { total: 0 }, questions: [] } }) }
})

import { PyqIntelligenceTab } from '../../src/components/assessment-workspace/pyq-intelligence-tab.jsx'
import { QuestionIntelligenceContent } from '../../src/components/assessment-workspace/question-intelligence-content.jsx'
import { withLiveQuestionStats } from '../../src/intelligence/faculty/engine/assessment'
import { ToastProvider } from '../../src/components/ui/toast.jsx'
import { act, renderDom } from '../setup/dom'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let queryClient
beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
const cleanups = []
afterEach(() => {
  while (cleanups.length) cleanups.shift()()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

function mount(ui) {
  const view = renderDom(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  cleanups.push(view.unmount)
  return view
}

/* An intelligence-summary payload shaped like the real backend fixture:
   its derived/datasets blocks are full of seeded question records. */
const SEEDED_INTEL = {
  derived: {
    assessment: { questionStats: { total: 14, avgAccuracy: 80.4, qualityAvg: 75, aiGenerated: 4, usedThisTerm: 9, flagged: 1 } },
    competitiveQuestionIntelligence: {
      total: 168,
      pyqRecords: [
        { id: 'CQ-JEE Main-PHY-001', exam: 'JEE Main', subject: 'Physics', year: '2025', session: 'S1', chapter: 'Kinematics', topic: 'Motion in one dimension', question: 'SEEDED JEE stem — a particle moves with velocity', options: ['4 m', '8 m'], answer: 'B', difficulty: 'Easy', questionType: 'MCQ', marks: 4, negativeMarks: 1, isPyq: true },
        { id: 'CQ-NEET UG-BIO-001', exam: 'NEET UG', subject: 'Biology', year: '2024', chapter: 'Genetics', topic: 'Heredity', question: 'SEEDED NEET stem — Mendelian inheritance', options: ['A', 'B'], answer: 'A', difficulty: 'Medium', questionType: 'MCQ', marks: 4, negativeMarks: 1, isPyq: true },
      ],
      universityPyq: [
        { id: 'UPYQ-CS501-001', exam: 'University', year: '2025', session: 'End Sem', subject: 'CS501', question: 'Trace Dijkstra shortest paths on a 5-vertex weighted graph from a given source.', options: ['A', 'B'], answer: 'B', difficulty: 'Easy', questionType: 'MCQ', isPyq: true },
      ],
      universityPyqCount: 1,
    },
  },
}

/* Real question-bank rows (the only legitimate runtime record source). */
const LIVE_BANK = [
  {
    id: 'QB-U-1', domain: 'University', subject: 'CS501', chapter: 'Graph Algorithms', topic: 'Shortest paths',
    text: 'LIVE university PYQ — trace Dijkstra on the given weighted graph', options: ['A', 'B', 'C', 'D'],
    type: 'MCQ', difficulty: 'Easy', status: 'Approved', source: 'Bank', isPyq: true, pyqYear: 2024, correctAnswer: 1,
  },
  {
    id: 'EA-JEE-PHY-01-Q01', domain: 'Competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Kinematics', topic: 'Motion',
    text: 'LIVE JEE PYQ — a block slides down an incline', options: ['1 m', '2 m'], type: 'MCQ', difficulty: 'Medium',
    status: 'Approved', source: 'Bank', isPyq: true, pyqYear: 2025, correctAnswer: 0,
  },
  {
    id: 'EA-NEET-BIO-01-Q02', domain: 'Competitive', examFamily: 'NEET', subject: 'Biology', chapter: 'Genetics', topic: 'Heredity',
    text: 'LIVE NEET PYQ — a cross between two hybrids', options: ['3:1'], type: 'MCQ', difficulty: 'Easy',
    status: 'Approved', source: 'Bank', pyqFrequency: 2, correctAnswer: 0,
  },
]

const EMPTY_BANK_RESPONSE = { summary: { total: 0 }, questions: [] }

describe('PYQ Intelligence tab — records come only from the live bank', () => {
  it('renders zero seeded records when the backend bank is empty (empty state instead)', () => {
    const { container } = mount(<PyqIntelligenceTab data={SEEDED_INTEL} questions={EMPTY_BANK_RESPONSE.questions} />)
    const text = container.textContent
    expect(text).not.toContain('Trace Dijkstra')
    expect(text).not.toContain('SEEDED JEE stem')
    expect(text).not.toContain('SEEDED NEET stem')
    expect(text).not.toContain('CQ-JEE Main-PHY-001')
    expect(text).not.toContain('UPYQ-CS501-001')
    /* 0 PYQs badges + the browser's existing empty state */
    expect(text).toContain('0 PYQs')
    expect(text).toContain('Not enough questions match this configuration')
  })

  it('renders live bank PYQ records for the university browser', () => {
    const { container } = mount(<PyqIntelligenceTab data={SEEDED_INTEL} questions={LIVE_BANK} />)
    const text = container.textContent
    expect(text).toContain('LIVE university PYQ — trace Dijkstra on the given weighted graph')
    expect(text).toContain('1 PYQs')
    /* The seeded summary records must still never render */
    expect(text).not.toContain('UPYQ-CS501-001')
  })

  it('renders live JEE / NEET records in the competitive browser with strict isolation', async () => {
    const { container } = mount(<PyqIntelligenceTab data={SEEDED_INTEL} questions={LIVE_BANK} />)
    const competitiveButton = [...container.querySelectorAll('button')].find((b) => b.textContent.includes('Competitive'))
    expect(competitiveButton).toBeDefined()
    await act(async () => { competitiveButton.click() })
    const text = container.textContent
    expect(text).toContain('LIVE JEE PYQ — a block slides down an incline')
    expect(text).toContain('LIVE NEET PYQ — a cross between two hybrids')
    expect(text).not.toContain('SEEDED JEE stem')
    expect(text).not.toContain('SEEDED NEET stem')
    /* University rows never leak into the competitive browser */
    expect(text).not.toContain('LIVE university PYQ')
  })
})

describe('Question Intelligence tab — honest KPIs from the live bank', () => {
  it('shows zeros and neutral stats for an empty bank, never seeded stats', () => {
    /* Production composition: the page re-derives questionStats from the
       live bank before the tab ever sees the summary payload. */
    const { container } = mount(
      <QuestionIntelligenceContent
        data={EMPTY_BANK_RESPONSE}
        intelData={withLiveQuestionStats(SEEDED_INTEL, EMPTY_BANK_RESPONSE)}
      />,
    )
    const text = container.textContent
    expect(text).toContain('Total questions')
    expect(text).toContain('No questions match these filters')
    /* Seeded stats from the summary payload must not surface */
    expect(text).not.toContain('80.4%')
    expect(text).not.toContain('75/100')
    expect(text).not.toContain('undefined')
  })
})
