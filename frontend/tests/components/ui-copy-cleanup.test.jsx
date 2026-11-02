// @vitest-environment jsdom
/**
 * UI copy cleanup — product terminology only.
 *
 * Guards the surfaces that used to expose internal implementation wording
 * ("Backend-Ready", "Phase G", "Real DB record", "backend-oriented",
 * "Generation: IDLE", …). Every surface below is mounted for real and its
 * rendered text is asserted, so the assertion fails if the implementation
 * wording is ever reintroduced into product copy.
 */
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/* --- service boundary stubs (contract-shaped, no fake records invented) --- */
vi.mock('../../src/services/faculty-papers', () => {
  const noop = () => ({ mutateAsync: async () => ({ ok: true }) })
  return {
    usePaperGeneratorBackend: () => ({
      data: { generatedPapers: [
        {
          id: 'paper-1', title: 'Mid Semester — DSA — Paper A', status: 'Ready', domain: 'University',
          totalMarks: 50, duration: 120, selectedQuestionIds: ['q-1', 'q-2'], created: '2026-01-05',
        },
      ] },
      isLoading: false, isError: false, error: null, refetch: () => {},
    }),
    usePaperLibrary: () => ({
      data: { generatedPapers: [
        {
          id: 'paper-1', title: 'Mid Semester — DSA — Paper A', status: 'Ready', domain: 'University',
          totalMarks: 50, duration: 120, selectedQuestionIds: ['q-1', 'q-2'], created: '2026-01-05',
        },
      ] },
      isLoading: false, isError: false, error: null, refetch: () => {},
    }),
    usePaperCreateBackend: noop,
    usePaperDeleteBackend: noop,
    usePaperDuplicateBackend: noop,
    usePaperRegenerateBackend: noop,
    usePaperArchiveBackend: noop,
    usePaperPublishBackend: noop,
    usePaperShareBackend: noop,
    useAiPaperLibrary: () => ({
      data: { generatedPapers: [
        {
          id: 'paper-1', title: 'Mid Semester — DSA — Paper A', status: 'Ready', domain: 'University',
          totalMarks: 50, duration: 120, selectedQuestionIds: ['q-1', 'q-2'], created: '2026-01-05',
        },
      ], versionHistory: {} },
      isLoading: false, isError: false, error: null, refetch: () => {},
    }),
    useAiPaperDetail: () => ({ data: null, isLoading: false, isError: false }),
  }
})

vi.mock('../../src/services/faculty-questions', () => ({
  useFacultyQuestions: () => ({
    data: {
      questions: [
        {
          id: 'q-1', subject: 'DSA', chapter: 'Graphs', topic: 'Traversal', difficulty: 'Medium',
          questionType: 'MCQ', marks: 2, domain: 'University', source: 'Bank',
          question: 'Which traversal uses a queue?', options: ['BFS', 'DFS', 'Both', 'Neither'],
        },
      ],
      total: 1,
    },
    isLoading: false, isError: false, error: null, refetch: () => {},
  }),
}))

vi.mock('../../src/services/faculty-question-generation', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    useQuestionGeneration: () => ({ mutateAsync: async () => ({ ok: true }), isPending: false }),
    useGenerationStatus: () => ({ data: undefined, isLoading: false }),
    useGenerationQuestions: () => ({ data: undefined, refetch: () => {} }),
    useCurrentGeneration: () => ({ data: null, isLoading: false }),
  }
})

vi.mock('../../src/services/student-examinations', () => ({
  useMockTestsBackend: () => ({
    data: {
      items: [
        {
          id: 'mt-1', title: 'JEE Main Mock Test', subject: 'Physics', type: 'Mock Test',
          domain: 'Competitive', status: 'Scheduled', difficulty: 'Medium', questionCount: 30,
          marks: 120, duration: '180 min',
        },
      ],
    },
    isLoading: false, isError: false, error: null, refetch: () => {},
  }),
}))

vi.mock('../../src/services', async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, useFacultyRoster: () => ({ data: { students: [] } }) }
})

import { PaperGeneratorTab } from '../../src/components/assessment-workspace/paper-generator-tab.jsx'
import { PaperLibraryTab } from '../../src/components/assessment-workspace/paper-library-tab.jsx'
import { MockTestsContent } from '../../src/components/exam-workspace/mock-tests-content.jsx'
import { ToastProvider } from '../../src/components/ui/toast.jsx'
import { act, renderDom, settle } from '../setup/dom'

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

async function mount(ui) {
  const view = renderDom(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  cleanups.push(view.unmount)
  await settle(40)
  return view
}

/** Words that must never appear in rendered product copy. */
const FORBIDDEN = [
  /backend/i,
  /postgres/i,
  /real db/i,
  /db record/i,
  /phase g\b/i,
  /\bIDLE\b/,
  /backend-oriented/i,
  /backend-ready/i,
  /samplePapers/i,
  /seeded/i,
  /GET \/faculty/i,
  /POST \/faculty/i,
]

function expectNoImplementationCopy(text, label) {
  for (const pattern of FORBIDDEN) {
    expect(text, `${label} must not expose ${pattern}`).not.toMatch(pattern)
  }
}

describe('UI copy cleanup — implementation terminology removed from product surfaces', () => {
  it('Question Paper Studio renders product copy and a capitalised generation state', async () => {
    const { container } = await mount(<PaperGeneratorTab />)
    const text = container.textContent

    expect(text).toContain('Question Paper Studio')
    expect(text).toContain('Question Generation')
    expect(text).toContain('Question Bank')
    expect(text).toContain('Generation: Idle')
    // Phase 6 shows ONLY the current generation — with no generation it must
    // render the honest empty state, never question-bank records.
    expect(text).toContain('No questions generated yet.')
    expect(text).not.toContain('Which traversal uses a queue?')

    expectNoImplementationCopy(text, 'Question Paper Studio')
  })

  it('Paper Library renders product copy', async () => {
    const { container } = await mount(<PaperLibraryTab />)
    const text = container.textContent

    expect(text).toContain('Papers in library')
    expect(text).toContain('Mid Semester — DSA — Paper A')
    const searchInput = container.querySelector('input[type="text"], input:not([type])')
    expect(searchInput?.getAttribute('placeholder')).toBe('Search papers…')

    expectNoImplementationCopy(text, 'Paper Library')
    expect(text).not.toMatch(/ID-based/i)
  })

  it('Mock Tests renders product copy', async () => {
    const { container } = await mount(<MockTestsContent />)
    const text = container.textContent

    expect(text).toContain('Tests taken')
    expect(text).toContain('JEE Main Mock Test')
    expect(text).toContain('Start mock test')

    expectNoImplementationCopy(text, 'Mock Tests')
  })
})
