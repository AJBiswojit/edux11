// @vitest-environment jsdom
/**
 * Question Paper Studio — Syllabus/content filter regression test.
 *
 * Verifies the real-data-dependent Course → Subject → Chapter → Topic
 * hierarchy and that selected filters are sent to the deployed AI generation
 * agent (POST /faculty/question-bank/generate payload). No mocked course
 * catalog is hardcoded in the component — this test supplies the same
 * contract the FastAPI /faculty/paper-generator endpoint returns.
 */
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { PaperGeneratorTab } from '../../src/components/assessment-workspace/paper-generator-tab.jsx'
import { ToastProvider } from '../../src/components/ui/toast.jsx'
import { act, openSelect, optionsOf, menuOf, renderDom, triggerOf } from '../setup/dom.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const mocks = vi.hoisted(() => ({
  paperData: null,
  generatedPayloads: [],
}))

vi.mock('@/services/faculty-papers', () => ({
  usePaperGeneratorBackend: () => ({ data: mocks.paperData, isLoading: false, isError: false, refetch: vi.fn() }),
  usePaperCreateBackend: () => ({ mutateAsync: vi.fn() }),
  usePaperDeleteBackend: () => ({ mutateAsync: vi.fn() }),
  usePaperDuplicateBackend: () => ({ mutateAsync: vi.fn() }),
  usePaperRegenerateBackend: () => ({ mutateAsync: vi.fn() }),
  usePaperArchiveBackend: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock('@/services/faculty-question-generation', () => ({
  useQuestionGeneration: () => ({
    mutateAsync: vi.fn(async (payload) => {
      mocks.generatedPayloads.push(payload)
      return { ok: true, generationId: 'gen-1', id: 'gen-1', status: 'READY', requestedCount: 20, generatedCount: 0 }
    }),
  }),
  useGenerationStatus: () => ({ data: null }),
  useGenerationQuestions: () => ({ data: null, refetch: vi.fn() }),
  useCurrentGeneration: () => ({ data: null }),
  GENERATION_STATUS: { GENERATING: 'GENERATING', PROCESSING: 'PROCESSING', READY: 'READY', COMPLETED: 'COMPLETED', FAILED: 'FAILED' },
  isTerminalStatus: (s) => ['READY', 'COMPLETED', 'FAILED'].includes(s),
}))

vi.mock('@/components/assessment-workspace/paper-parts', () => ({
  PaperCard: () => null,
  PaperPreviewDialog: () => null,
  PaperDeleteDialog: () => null,
  SharePaperDialog: () => null,
  PaperQualityPanel: () => null,
  PaperPrintPreview: () => null,
  ShareHistoryList: () => null,
  DIFF_STYLES: { Easy: 'success', Medium: 'warning', Hard: 'danger' },
}))

const COURSE_DSA = 'CS501 — Data Structures & Algorithms'
const COURSE_DBMS = 'CS502 — Database Management Systems'

const REAL_CATALOG = {
  courseCatalog: [
    { id: 'c1', code: 'CS501', name: 'Data Structures & Algorithms', subjectCode: 'CS501', subjectName: 'Data Structures & Algorithms' },
    { id: 'c2', code: 'CS502', name: 'Database Management Systems', subjectCode: 'CS502', subjectName: 'Database Management Systems' },
  ],
  subjectCatalog: [
    { id: 'CS501', code: 'CS501', name: 'Data Structures & Algorithms', examMode: 'university', examFamily: null, chapters: [{ id: 'ch1', name: 'Trees', topics: ['AVL', 'Heaps'] }, { id: 'ch2', name: 'Graphs', topics: ['Dijkstra', 'BFS'] }] },
    { id: 'CS502', code: 'CS502', name: 'Database Management Systems', examMode: 'university', examFamily: null, chapters: [{ id: 'ch3', name: 'Normalization', topics: ['3NF', 'BCNF'] }] },
  ],
  competitiveSubjects: { JEE: [], NEET: [] },
}

const cleanups = []
beforeEach(() => {
  mocks.paperData = { generatedPapers: [], config: REAL_CATALOG, versionHistory: {} }
  mocks.generatedPayloads = []
})
afterEach(() => {
  while (cleanups.length) cleanups.shift()()
  document.body.innerHTML = ''
})

function mount() {
  const view = renderDom(
    <ToastProvider>
      <MemoryRouter>
        <PaperGeneratorTab />
      </MemoryRouter>
    </ToastProvider>,
  )
  cleanups.push(view.unmount)
  return view
}

async function choose(view, label, optionText) {
  const trigger = triggerOf(view.container, label)
  await openSelect(trigger)
  const menu = menuOf(view.container, label)
  const option = optionsOf(menu).find((o) => o.textContent.trim() === optionText)
  expect(option, `${optionText} should be an option for ${label}`).toBeTruthy()
  await act(async () => { option.click() })
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)) })
}

describe('Question Paper Studio — Syllabus/content filter', () => {
  it('removes the standalone Search field and derives Course options from the real catalog', async () => {
    const view = mount()
    const text = view.container.textContent

    expect(view.container.querySelector('input[placeholder="Search questions…"]')).toBeNull()
    expect(text).not.toContain('Search questions…')
    expect(text).not.toContain('CS503 — OS')
    expect(text).not.toContain('CS505 — ML')
    expect(text).not.toContain('CS506')

    const courseTrigger = triggerOf(view.container, 'Course')
    await openSelect(courseTrigger)
    const courseOptions = optionsOf(menuOf(view.container, 'Course')).map((o) => o.textContent.trim())
    expect(courseOptions).toEqual([COURSE_DSA, COURSE_DBMS])
    expect(courseOptions).not.toContain('CS501 — DSA')
  })

  it('keeps Children disabled until each real parent is chosen and sends the selected filters to the generation agent', async () => {
    const view = mount()

    const subjectTrigger = triggerOf(view.container, 'Subject')
    const chapterTrigger = triggerOf(view.container, 'Chapter')
    const topicTrigger = triggerOf(view.container, 'Topic')
    expect(subjectTrigger.disabled).toBe(true)
    expect(chapterTrigger.disabled).toBe(true)
    expect(topicTrigger.disabled).toBe(true)

    await choose(view, 'Course', COURSE_DSA)
    expect(subjectTrigger.disabled).toBe(false)

    await choose(view, 'Subject', 'Data Structures & Algorithms')
    expect(chapterTrigger.disabled).toBe(false)

    await choose(view, 'Chapter', 'Trees')
    expect(topicTrigger.disabled).toBe(false)

    await choose(view, 'Topic', 'AVL')

    expect(mocks.generatedPayloads).toHaveLength(0)
    const button = view.container.querySelector('[data-testid="generate-questions-button"]')
    await act(async () => { button.click() })
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)) })

    expect(mocks.generatedPayloads).toHaveLength(1)
    expect(mocks.generatedPayloads[0]).toMatchObject({
      domain: 'University',
      course: COURSE_DSA,
      subject: 'Data Structures & Algorithms',
      chapter: 'Trees',
      topic: 'AVL',
    })
  })

  it('changing Course clears Subject/Chapter/Topic and refuses to generate without an explicit University subject', async () => {
    const view = mount()

    await choose(view, 'Course', COURSE_DSA)
    await choose(view, 'Subject', 'Data Structures & Algorithms')
    await choose(view, 'Chapter', 'Trees')
    await choose(view, 'Topic', 'AVL')

    await choose(view, 'Course', COURSE_DBMS)

    const subjectTrigger = triggerOf(view.container, 'Subject')
    const chapterTrigger = triggerOf(view.container, 'Chapter')
    const topicTrigger = triggerOf(view.container, 'Topic')

    expect(subjectTrigger.textContent).toContain('All subjects')
    expect(chapterTrigger.textContent).toContain('Select a subject first')
    expect(topicTrigger.textContent).toContain('Select a chapter first')

    // A University paper without an explicit subject is a configuration
    // error — the agent must never be called with a half-cleared scope.
    const button = view.container.querySelector('[data-testid="generate-questions-button"]')
    await act(async () => { button.click() })
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)) })
    expect(mocks.generatedPayloads).toHaveLength(0)
  })

  it('keeps an empty API catalog empty instead of injecting demo/sample options', async () => {
    mocks.paperData = { generatedPapers: [], config: { courseCatalog: [], subjectCatalog: [], competitiveSubjects: { JEE: [], NEET: [] } }, versionHistory: {} }
    const view = mount()
    const text = view.container.textContent
    expect(text).toContain('No courses available')
    expect(triggerOf(view.container, 'Course').disabled).toBe(true)
    expect(text).not.toContain('CS501 — DSA')
    expect(text).not.toContain('CS503 — OS')
    expect(text).not.toContain('CS505 — ML')
  })
})
