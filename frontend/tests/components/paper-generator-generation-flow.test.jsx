// @vitest-environment jsdom
/**
 * Question Paper Studio — generation lifecycle + Competitive mode regression.
 *
 * Covers the two production defects the studio shipped with:
 *  1. A stale AI paper (ai-active resume) being re-surfaced as a *fresh*
 *     generation on mount — "AI paper ready … generated while you were away".
 *  2. Competitive bank questions carrying structured option records
 *     ({ key, text, imageUrl }) being rendered directly as JSX text.
 *
 * Everything runs against the REAL services/adapters — only the axios client
 * is mocked, so the exact payload contract of /faculty/question-bank and
 * /faculty/question-bank/generate is exercised.
 */
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { PaperGeneratorTab } from '../../src/components/assessment-workspace/paper-generator-tab.jsx'
import { ToastProvider } from '../../src/components/ui/toast.jsx'
import { act, openSelect, optionsOf, menuOf, renderDom, triggerOf } from '../setup/dom.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const state = vi.hoisted(() => ({
  gets: [],
  posts: [],
  aiActive: { active: null },
  aiPaper: null,
  currentGeneration: null,
  generation: null,
  generationStatus: null,
  generationQuestions: null,
  bank: null,
}))

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(async (url, config = {}) => {
      state.gets.push({ url, params: config.params ?? null })
      if (url === '/faculty/paper-generator') {
        return { data: { generatedPapers: [], config: CATALOG, versionHistory: {} } }
      }
      if (url === '/faculty/paper-generator/ai-active') return { data: state.aiActive }
      if (url.startsWith('/faculty/paper-generator/ai-paper/')) return { data: state.aiPaper }
      if (url === '/faculty/question-bank') {
        const params = config.params ?? {}
        const bank = state.bank
        return { data: typeof bank === 'function' ? bank(params) : bank }
      }
      if (url === '/faculty/question-bank/generations/current') return { data: { generation: state.currentGeneration } }
      if (url.endsWith('/questions') && url.includes('/generations/')) {
        return { data: state.generationQuestions }
      }
      if (url.includes('/generations/') && url.endsWith('/status') === false && !url.endsWith('/questions')) {
        return { data: { generation: state.generationStatus } }
      }
      return { data: {} }
    }),
    post: vi.fn(async (url, body) => {
      state.posts.push({ url, body })
      if (url === '/faculty/question-bank/generate') return { data: state.generation }
      return { data: { ok: true } }
    }),
    patch: vi.fn(async () => ({ data: { ok: true } })),
    delete: vi.fn(async () => ({ data: { ok: true } })),
  },
}))

/* Real catalog contract: GET /faculty/paper-generator → config */
const CATALOG = {
  programs: ['B.Tech — CSE'],
  universityTypes: ['Mid Semester', 'End Semester'],
  competitiveTypes: ['Full Mock Test', 'Practice Test'],
  durations: [60, 90, 120],
  courseCatalog: [
    { id: 'c1', code: 'CS501', name: 'Data Structures & Algorithms', subjectCode: 'CS501', subjectName: 'Data Structures & Algorithms' },
  ],
  subjectCatalog: [
    { id: 's1', code: 'CS501', name: 'Data Structures & Algorithms', examMode: 'university', examFamily: null, chapters: [{ id: 'ch1', name: 'Trees', topics: ['AVL', 'Heaps'] }] },
    { id: 's2', code: 'PHY', name: 'Physics', examMode: 'competitive', examFamily: 'JEE', chapters: [{ id: 'ch2', name: 'Mechanics', topics: ['Kinematics'] }] },
  ],
  competitiveSubjects: { JEE: ['Physics', 'Mathematics', 'Chemistry'], NEET: ['Physics', 'Chemistry', 'Biology'] },
}

const UNI_QUESTIONS = [
  {
    id: 'q-uni-1', subject: 'CS501', chapter: 'Trees', topic: 'AVL', type: 'MCQ', difficulty: 'Medium',
    domain: 'University', examFamily: null, text: 'University bank question on AVL rotations',
    options: ['Left rotation', 'Right rotation', 'Recoloring', 'No rebalance'],
  },
]

/* Competitive records use the AI service option contract: { key, text, imageUrl }. */
const COMP_QUESTIONS = [
  {
    id: 'q-comp-1', subject: 'PHY', subjectName: 'Physics', chapter: 'Mechanics', topic: 'Kinematics', type: 'MCQ', difficulty: 'Hard',
    domain: 'Competitive', examFamily: 'JEE', text: 'A particle is projected at 20 m/s. Find the range.',
    options: [
      { key: 'A', text: '20.4 m', imageUrl: 'https://assets.edux/q-comp-1-a.png' },
      { key: 'B', text: '40.8 m', imageUrl: null },
      { key: 'C', text: '61.2 m', imageUrl: null },
      { key: 'D', text: '81.6 m', imageUrl: null },
    ],
  },
]

const bankFor = (params = {}) => {
  const questions = params.domain === 'Competitive' ? COMP_QUESTIONS : UNI_QUESTIONS
  return { questions, total: questions.length, summary: { total: questions.length } }
}

const GENERATED = {
  ok: true, generationId: 'gen-100', id: 'gen-100', status: 'READY',
  requestedCount: 10, generatedCount: 10,
  questionIds: Array.from({ length: 10 }, (_, i) => `gen-q-${i + 1}`),
  questions: Array.from({ length: 10 }, (_, i) => `gen-q-${i + 1}`),
}

const GENERATED_QUESTIONS = {
  ok: true, status: 'READY', total: 10, requestedCount: 10, generatedCount: 10,
  questions: Array.from({ length: 10 }, (_, i) => ({
    id: `gen-q-${i + 1}`, subject: 'CS501', chapter: 'Trees', topic: 'AVL', type: 'MCQ', difficulty: 'Medium',
    domain: 'University', examFamily: null, text: `Generated question ${i + 1} on AVL trees`,
    options: ['Alpha', 'Beta', 'Gamma', 'Delta'],
  })),
}

const cleanups = []
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const view = renderDom(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <PaperGeneratorTab />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  cleanups.push(view.unmount)
  return view
}

const settle = (ms = 200) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

/** Selects without an explicit aria-label (e.g. "Question count") are found by trigger text. */
const triggerByText = (container, text) =>
  [...container.querySelectorAll('button[aria-haspopup="listbox"]')].find((b) => b.textContent.includes(text))

async function choose(view, label, optionText) {
  const trigger = triggerOf(view.container, label)
  await openSelect(trigger)
  const option = optionsOf(menuOf(view.container, label)).find((o) => o.textContent.trim() === optionText)
  expect(option, `${optionText} should be an option for ${label}`).toBeTruthy()
  await act(async () => { option.click() })
  await settle(60)
}

async function chooseByTriggerText(view, triggerText, optionText) {
  const trigger = triggerByText(view.container, triggerText)
  expect(trigger, `${triggerText} trigger should exist`).toBeTruthy()
  await openSelect(trigger)
  const menu = document.getElementById(trigger.getAttribute('aria-controls'))
  const option = optionsOf(menu).find((o) => o.textContent.trim() === optionText)
  expect(option, `${optionText} should be an option for ${triggerText}`).toBeTruthy()
  await act(async () => { option.click() })
  await settle(60)
}

const bodyText = () => document.body.textContent ?? ''
const generatePosts = () => state.posts.filter((c) => c.url === '/faculty/question-bank/generate')

/** Set a numeric field (Total marks / Duration / Question count) by label. */
async function setNumber(container, label, value) {
  const field = [...container.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(label))
  const el = field?.parentElement?.querySelector('input') ?? [...container.querySelectorAll('input[type="number"]')][0]
  expect(el, `${label} input should exist`).toBeTruthy()
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setter.call(el, String(value))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await settle(20)
}

/** Fill the three required numeric fields so the Generate action is allowed. */
async function fillPaperConfig(container) {
  await setNumber(container, 'Total marks', 100)
  await setNumber(container, 'Duration', 120)
  await setNumber(container, 'Question count', 10)
}


beforeEach(() => {
  state.gets = []
  state.posts = []
  state.aiActive = { active: null }
  state.aiPaper = null
  state.currentGeneration = null
  state.generation = null
  state.generationStatus = null
  state.generationQuestions = null
  state.bank = bankFor
})
afterEach(() => {
  while (cleanups.length) cleanups.shift()()
  document.body.innerHTML = ''
})

describe('Generate Paper — no automatic generation on open', () => {
  it('starts in a clean configuration state and never calls the generation API', async () => {
    const view = mount()
    await settle()

    expect(generatePosts()).toHaveLength(0)
    // Only the refresh-recovery probe (current generation) may run; no
    // generation-status/questions polling without a real generation id.
    expect(state.gets.filter((c) => c.url.includes('/generations/') && !c.url.endsWith('/current')).length).toBe(0)
    expect(bodyText()).toContain('Generation: Idle')
    expect(bodyText()).not.toContain('AI paper ready')
    expect(bodyText()).not.toContain('questions generated while you were away')
    // Section 6 shows ONLY the current generation — no generation means the
    // honest empty state, never question-bank records.
    expect(bodyText()).toContain('No questions generated yet.')
    expect(bodyText()).not.toContain('University bank question on AVL rotations')
    expect(view.container.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(0)
  })

  it('does not restore a persisted AI paper as a new generation (stale-state isolation)', async () => {
    state.aiActive = {
      active: { paper_id: 'ai-paper-1', status: 'completed', examFamily: 'JEE', subject: 'Physics', generated: 10, total: 10 },
    }
    state.aiPaper = {
      ok: true, paper_id: 'ai-paper-1', status: 'completed', requested: 10, generated: 10,
      questions: Array.from({ length: 10 }, (_, i) => ({ id: `ai-q-${i}`, text: `Restored AI question ${i}`, options: ['a', 'b', 'c', 'd'] })),
    }

    const view = mount()
    await settle(400)

    expect(bodyText()).not.toContain('AI paper ready')
    expect(bodyText()).not.toContain('Restored AI question')
    expect(bodyText()).toContain('Generation: Idle')
    expect(view.container.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(0)
    // No generation result state may be derived from persisted AI papers.
    expect(state.gets.some((c) => c.url.includes('/ai-paper/'))).toBe(false)
    expect(generatePosts()).toHaveLength(0)
  })

  it('rehydrates the persisted backend current generation on refresh (without regenerating)', async () => {
    state.currentGeneration = {
      id: 'gen-current', generationId: 'gen-current', status: 'READY',
      requestedCount: 2, generatedCount: 2,
    }
    state.generationStatus = {
      id: 'gen-current', generationId: 'gen-current', status: 'READY',
      requestedCount: 2, generatedCount: 2,
    }
    state.generationQuestions = {
      ok: true, status: 'READY', total: 2, requestedCount: 2, generatedCount: 2,
      questions: Array.from({ length: 2 }, (_, i) => ({
        id: `gen-current-q-${i + 1}`, subject: 'NEET-BIO', subjectName: 'Biology',
        chapter: 'Cell Biology', topic: 'Cell Structure', type: 'MCQ',
        difficulty: 'Medium', domain: 'Competitive', examFamily: 'NEET',
        text: `Persisted generation question ${i + 1}`, options: ['A', 'B', 'C', 'D'],
      })),
    }

    const view = mount()
    await settle(400)
    // The current-generation probe resolves asynchronously, which enables the
    // generation-questions query; flush until the rehydrated questions render.
    for (let i = 0; i < 20 && !bodyText().includes('Persisted generation question 1'); i += 1) {
      await settle(50)
    }

    expect(generatePosts()).toHaveLength(0)
    expect(bodyText()).toContain('Generation: Ready')
    expect(bodyText()).toContain('Persisted generation question 1')
    // Nothing is auto-selected for a restored generation.
    expect(view.container.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(0)
  })
})

describe('Generate Paper — generation only after the Generate action', () => {
  it('posts the selected configuration exactly once and renders the real response', async () => {
    state.generation = GENERATED
    state.generationQuestions = GENERATED_QUESTIONS
    const view = mount()
    await settle()

    await choose(view, 'Course', 'CS501 — Data Structures & Algorithms')
    await choose(view, 'Subject', 'Data Structures & Algorithms')
    await choose(view, 'Chapter', 'Trees')
    await choose(view, 'Topic', 'AVL')
    await fillPaperConfig(view.container)

    expect(generatePosts()).toHaveLength(0)

    const button = view.container.querySelector('[data-testid="generate-questions-button"]')
    expect(button).toBeTruthy()
    await act(async () => { button.click() })
    await settle(400)

    expect(generatePosts()).toHaveLength(1)
    const body = generatePosts()[0].body
    expect(body).toMatchObject({
      domain: 'University',
      subject: 'Data Structures & Algorithms',
      chapter: 'Trees',
      topic: 'AVL',
      questionCount: 10,
      difficulty: 'Mixed',
    })
    expect(body.questionTypes).toContain('MCQ')

    // Generated questions render only after the successful response.
    expect(bodyText()).toContain('Generated question 1 on AVL trees')
    expect(bodyText()).toContain('10 questions generated')
    expect(bodyText()).toContain('Questions Generated')
    expect(bodyText()).toContain('Generation: Ready')
  })

  it('shows the failure state and no success notification when generation fails', async () => {
    const { default: api } = await import('@/api/axios')
    api.post.mockImplementationOnce(async () => {
      throw Object.assign(new Error('Request failed with status code 500'), { response: { status: 500, data: { detail: 'AI service down' } } })
    })
    const view = mount()
    await settle()

    await choose(view, 'Course', 'CS501 — Data Structures & Algorithms')
    await choose(view, 'Subject', 'Data Structures & Algorithms')
    await fillPaperConfig(view.container)

    const button = view.container.querySelector('[data-testid="generate-questions-button"]')
    await act(async () => { button.click() })
    await settle(200)

    expect(bodyText()).toContain('Generation: Failed')
    expect(bodyText()).not.toContain('Questions Generated')
    expect(bodyText()).not.toContain('AI paper ready')
    expect(view.container.textContent).not.toContain('Generated question')
  })

  it('does not call the generation API when a required filter is missing', async () => {
    const view = mount()
    await settle()

    const button = view.container.querySelector('[data-testid="generate-questions-button"]')
    await act(async () => { button.click() })
    await settle(100)

    expect(generatePosts()).toHaveLength(0)
    expect(bodyText()).toContain('Select a subject')
    expect(bodyText()).toContain('Generation: Idle')
  })
})

describe('Generate Paper — Competitive domain', () => {
  it('renders generated structured option records as their text and stays mounted', async () => {
    state.generation = {
      ok: true, generationId: 'gen-comp', id: 'gen-comp', status: 'READY',
      requestedCount: 3, generatedCount: 3,
    }
    state.generationQuestions = {
      ok: true, status: 'READY', total: 3, requestedCount: 3, generatedCount: 3,
      questions: COMP_QUESTIONS.map((q, i) => ({ ...q, id: `gen-comp-q-${i + 1}`, source: 'AI' })),
    }

    const view = mount()
    await settle()

    const compButton = [...view.container.querySelectorAll('button')].find((b) => b.textContent.trim() === '🎯 Competitive')
    expect(compButton).toBeTruthy()
    await act(async () => { compButton.click() })
    await settle(300)

    expect(generatePosts()).toHaveLength(0)
    expect(state.gets.some((c) => c.url === '/faculty/question-bank')).toBe(false)

    await fillPaperConfig(view.container)
    const button = view.container.querySelector('[data-testid="generate-questions-button"]')
    expect(button).toBeTruthy()
    await act(async () => { button.click() })
    await settle(400)

    // No React "Objects are not valid as a React child" crash — the page
    // stays mounted and the generated Competitive question renders. Only the
    // current generation's questions may appear in Section 6.
    expect(view.container.textContent).toContain('A particle is projected at 20 m/s')
    expect(bodyText()).toContain('Generation: Ready')

    // Structured options render the human-readable text, never the object.
    expect(view.container.textContent).toContain('40.8 m')
    expect(view.container.textContent).not.toContain('[object Object]')
    expect(view.container.textContent).not.toContain('imageUrl')

    // Competitive subject options come from the real catalog — the full
    // JEE subject list, not just the first/only subject row.
    const subjectTrigger = triggerOf(view.container, 'Subject')
    await openSelect(subjectTrigger)
    expect(optionsOf(menuOf(view.container, 'Subject')).map((o) => o.textContent.trim())).toEqual(['All subjects', 'Physics', 'Mathematics', 'Chemistry'])
  })
})

describe('Generate Paper — University regression and domain switching', () => {
  it('keeps the University cascade working and sends real filters to the agent', async () => {
    const view = mount()
    await settle()

    await choose(view, 'Course', 'CS501 — Data Structures & Algorithms')
    await choose(view, 'Subject', 'Data Structures & Algorithms')
    await choose(view, 'Chapter', 'Trees')
    await choose(view, 'Topic', 'AVL')
    await fillPaperConfig(view.container)

    // Section 6 must NEVER render question-bank records.
    expect(state.gets.some((c) => c.url === '/faculty/question-bank')).toBe(false)
    expect(view.container.textContent).not.toContain('University bank question on AVL rotations')

    const button = view.container.querySelector('[data-testid="generate-questions-button"]')
    await act(async () => { button.click() })
    await settle(200)

    expect(generatePosts()).toHaveLength(1)
    expect(generatePosts()[0].body).toMatchObject({
      domain: 'University',
      course: 'CS501 — Data Structures & Algorithms',
      subject: 'Data Structures & Algorithms',
      chapter: 'Trees',
      topic: 'AVL',
    })
  })

  it('survives University → Competitive → University with consistent dependent filters', async () => {
    const view = mount()
    await settle()

    await choose(view, 'Course', 'CS501 — Data Structures & Algorithms')
    await choose(view, 'Subject', 'Data Structures & Algorithms')

    const uni = () => [...view.container.querySelectorAll('button')].find((b) => b.textContent.trim() === '🏛️ University')
    const comp = () => [...view.container.querySelectorAll('button')].find((b) => b.textContent.trim() === '🎯 Competitive')

    await act(async () => { comp().click() })
    await settle(300)
    expect(triggerOf(view.container, 'Subject').textContent).toContain('All subjects')

    await act(async () => { uni().click() })
    await settle(300)

    // No generation exists, so Section 6 stays in the honest empty state —
    // no stale Competitive or University bank records can leak through.
    expect(view.container.textContent).toContain('No questions generated yet.')
    expect(view.container.textContent).not.toContain('40.8 m')
    expect(view.container.textContent).not.toContain('University bank question on AVL rotations')
    expect(triggerOf(view.container, 'Course').textContent).toContain('Select course…')
    expect(triggerOf(view.container, 'Subject').textContent).toContain('Select a course first')
    expect(view.container.textContent).not.toContain('[object Object]')
  })
})
