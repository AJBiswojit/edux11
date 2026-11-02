// @vitest-environment jsdom
/**
 * Question Paper Studio — Competitive subject mapping regression.
 *
 *  - Competitive + JEE  → Mathematics, Physics, Chemistry
 *  - Competitive + NEET → Physics, Chemistry, Biology
 *  - Switching exam family clears a subject that belongs to the previous
 *    family only (Mathematics for JEE; Biology for NEET) together with its
 *    chapter/topic descendants, so stale filters are never sent to the AI
 *    generation agent (POST /faculty/question-bank/generate).
 */
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const state = vi.hoisted(() => ({ posts: [], gets: [] }))

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn(async (url, config = {}) => {
      state.gets.push({ url, params: config.params ?? null })
      if (url === '/faculty/paper-generator') {
        return { data: { generatedPapers: [], config: CATALOG, versionHistory: {} } }
      }
      if (url === '/faculty/question-bank/generations/current') return { data: { generation: null } }
      if (url.endsWith('/questions') && url.includes('/generations/')) {
        return { data: { ok: true, status: 'READY', total: 0, requestedCount: 0, generatedCount: 0, questions: [] } }
      }
      return { data: {} }
    }),
    post: vi.fn(async (url, body) => {
      state.posts.push({ url, body })
      if (url === '/faculty/question-bank/generate') {
        return { data: { ok: true, generationId: 'gen-1', id: 'gen-1', status: 'READY', requestedCount: 20, generatedCount: 0 } }
      }
      return { data: { ok: true } }
    }),
    patch: vi.fn(async () => ({ data: { ok: true } })),
    delete: vi.fn(async () => ({ data: { ok: true } })),
  },
}))

import { PaperGeneratorTab } from '../../src/components/assessment-workspace/paper-generator-tab.jsx'
import { ToastProvider } from '../../src/components/ui/toast.jsx'
import { act, openSelect, optionsOf, menuOf, renderDom, settle, triggerOf } from '../setup/dom.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

/* Real catalog contract: the backend sends the full competitive subject
 * lists for an institution that manages its own competitive subjects. */
const CATALOG = {
  courseCatalog: [],
  subjectCatalog: [
    { id: 's-math', code: 'MATH', name: 'Mathematics', examMode: 'competitive', examFamily: 'JEE', chapters: [{ id: 'ch-calc', name: 'Calculus', topics: ['Limits'] }] },
    { id: 's-phy', code: 'PHY', name: 'Physics', examMode: 'competitive', examFamily: 'JEE', chapters: [{ id: 'ch-mech', name: 'Mechanics', topics: ['Kinematics'] }] },
    { id: 's-chem', code: 'CHEM', name: 'Chemistry', examMode: 'competitive', examFamily: 'JEE', chapters: [] },
  ],
  competitiveSubjects: {
    JEE: ['Mathematics', 'Physics', 'Chemistry'],
    NEET: ['Physics', 'Chemistry', 'Biology'],
  },
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

beforeEach(() => {
  state.posts = []
  state.gets = []
})
afterEach(() => {
  while (cleanups.length) cleanups.shift()()
  document.body.innerHTML = ''
})

const button = (container, label) => [...container.querySelectorAll('button')].find((b) => b.textContent.trim().endsWith(label))
const generatePosts = () => state.posts.filter((c) => c.url === '/faculty/question-bank/generate')

async function goCompetitive(container) {
  const comp = button(container, '🎯 Competitive') || button(container, 'Competitive')
  expect(comp, 'Competitive domain toggle should exist').toBeTruthy()
  await act(async () => { comp.click() })
  await settle(150)
}

async function subjectOptions(container) {
  const trigger = triggerOf(container, 'Subject')
  await openSelect(trigger)
  return optionsOf(menuOf(container, 'Subject')).map((o) => o.textContent.trim())
}

async function choose(container, label, optionText) {
  const trigger = triggerOf(container, label)
  await openSelect(trigger)
  const option = optionsOf(menuOf(container, label)).find((o) => o.textContent.trim() === optionText)
  expect(option, `${optionText} should be an option for ${label}`).toBeTruthy()
  await act(async () => { option.click() })
  await settle(60)
}

/** Set a numeric field (Total marks / Duration / Question count) by placeholder. */
async function setNumber(container, label, value) {
  const field = [...container.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(label))
  const input = field?.parentElement?.querySelector('input') ?? field?.nextElementSibling?.querySelector?.('input')
  const el = input ?? [...container.querySelectorAll('input[type="number"]')][0]
  expect(el, `${label} input should exist`).toBeTruthy()
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => {
    setter.call(el, String(value))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await settle(20)
}

describe('Competitive exam subject mapping', () => {
  it('offers Mathematics, Physics, Chemistry for JEE', async () => {
    const view = mount()
    await settle(120)
    await goCompetitive(view.container)
    // Multi-select keeps the "All subjects" select-all shortcut as the first option.
    expect(await subjectOptions(view.container)).toEqual(['All subjects', 'Mathematics', 'Physics', 'Chemistry'])
  })

  it('offers Physics, Chemistry, Biology for NEET', async () => {
    const view = mount()
    await settle(120)
    await goCompetitive(view.container)
    await act(async () => { button(view.container, 'NEET').click() })
    await settle(120)
    expect(await subjectOptions(view.container)).toEqual(['All subjects', 'Physics', 'Chemistry', 'Biology'])
  })

  it('clears a JEE-only subject (Mathematics) when switching JEE → NEET', async () => {
    const view = mount()
    await settle(120)
    await goCompetitive(view.container)
    await choose(view.container, 'Subject', 'Mathematics')

    await act(async () => { button(view.container, 'NEET').click() })
    await settle(250)

    // The stale subject is cleared — the UI never keeps Mathematics for
    // NEET.
    expect(triggerOf(view.container, 'Subject').textContent).toContain('All subjects')
    expect(triggerOf(view.container, 'Chapter').textContent).toContain('Select a subject first')
    const trigger = triggerOf(view.container, 'Subject')
    await openSelect(trigger)
    expect(optionsOf(menuOf(view.container, 'Subject')).map((o) => o.textContent.trim())).toEqual(['All subjects', 'Physics', 'Chemistry', 'Biology'])

    // The generation payload must not carry a stale JEE subject either —
    // 'All subjects' is the valid Competitive distribution contract.
    await setNumber(view.container, 'Total marks', 100)
    await setNumber(view.container, 'Duration', 120)
    await setNumber(view.container, 'Question count', 20)
    const genButton = view.container.querySelector('[data-testid="generate-questions-button"]')
    await act(async () => { genButton.click() })
    await settle(200)
    expect(generatePosts()).toHaveLength(1)
    expect(generatePosts()[0].body).toMatchObject({
      domain: 'Competitive',
      examFamily: 'NEET',
      subject: 'All subjects',
    })
  })

  it('clears a NEET-only subject (Biology) when switching NEET → JEE', async () => {
    const view = mount()
    await settle(120)
    await goCompetitive(view.container)
    await act(async () => { button(view.container, 'NEET').click() })
    await settle(120)
    await choose(view.container, 'Subject', 'Biology')

    await act(async () => { button(view.container, 'JEE').click() })
    await settle(250)

    // The post-switch UI carries no stale NEET subject.
    expect(triggerOf(view.container, 'Subject').textContent).toContain('All subjects')
    expect(triggerOf(view.container, 'Chapter').textContent).toContain('Select a subject first')

    await setNumber(view.container, 'Total marks', 100)
    await setNumber(view.container, 'Duration', 120)
    await setNumber(view.container, 'Question count', 20)
    const genButton = view.container.querySelector('[data-testid="generate-questions-button"]')
    await act(async () => { genButton.click() })
    await settle(200)
    expect(generatePosts()).toHaveLength(1)
    expect(generatePosts()[0].body).toMatchObject({
      domain: 'Competitive',
      examFamily: 'JEE',
      subject: 'All subjects',
    })
  })

  it('sends ticked subjects as an array in the generation payload', async () => {
    const view = mount()
    await settle(120)
    await goCompetitive(view.container)

    // Tick TWO subjects — the menu stays open in multi-select mode.
    const subjectTrigger = triggerOf(view.container, 'Subject')
    await openSelect(subjectTrigger)
    const opts = optionsOf(menuOf(view.container, 'Subject'))
    await act(async () => { opts.find((o) => o.textContent.trim() === 'Mathematics').click() })
    await settle(40)
    const opts2 = optionsOf(menuOf(view.container, 'Subject'))
    await act(async () => { opts2.find((o) => o.textContent.trim() === 'Physics').click() })
    await settle(60)

    // Trigger summarises the multi-selection.
    expect(triggerOf(view.container, 'Subject').textContent).toContain('2 selected')

    await setNumber(view.container, 'Total marks', 100)
    await setNumber(view.container, 'Duration', 120)
    await setNumber(view.container, 'Question count', 20)

    const genButton = view.container.querySelector('[data-testid="generate-questions-button"]')
    await act(async () => { genButton.click() })
    await settle(200)

    expect(generatePosts()).toHaveLength(1)
    const body = generatePosts()[0].body
    expect(body.domain).toBe('Competitive')
    expect(body.examFamily).toBe('JEE')
    // Two ticked subjects -> array payload (backend fans out one job each).
    expect(body.subject).toEqual(['Mathematics', 'Physics'])
  })

  it('ticking "All subjects" selects every subject and sends the All sentinel', async () => {
    const view = mount()
    await settle(120)
    await goCompetitive(view.container)

    const subjectTrigger = triggerOf(view.container, 'Subject')
    await openSelect(subjectTrigger)
    const allOpt = optionsOf(menuOf(view.container, 'Subject')).find((o) => o.textContent.trim() === 'All subjects')
    await act(async () => { allOpt.click() })
    await settle(60)

    // The trigger summarises the select-all state.
    expect(triggerOf(view.container, 'Subject').textContent).toContain('All subjects')

    await setNumber(view.container, 'Total marks', 100)
    await setNumber(view.container, 'Duration', 120)
    await setNumber(view.container, 'Question count', 20)
    const genButton = view.container.querySelector('[data-testid="generate-questions-button"]')
    await act(async () => { genButton.click() })
    await settle(200)

    expect(generatePosts()).toHaveLength(1)
    // Every subject ticked collapses to the "All subjects" sentinel so the
    // backend uses its whole-family distribution path.
    expect(generatePosts()[0].body.subject).toBe('All subjects')
  })

  it('combines chapters from every ticked subject in the Chapter dropdown', async () => {
    const view = mount()
    await settle(120)
    await goCompetitive(view.container)

    // Tick Mathematics (chapter: Calculus) + Physics (chapter: Mechanics).
    const subjectTrigger = triggerOf(view.container, 'Subject')
    await openSelect(subjectTrigger)
    await act(async () => { optionsOf(menuOf(view.container, 'Subject')).find((o) => o.textContent.trim() === 'Mathematics').click() })
    await settle(40)
    await act(async () => { optionsOf(menuOf(view.container, 'Subject')).find((o) => o.textContent.trim() === 'Physics').click() })
    await settle(60)

    // The Chapter dropdown shows the UNION of both subjects' chapters.
    const chapterTrigger = triggerOf(view.container, 'Chapter')
    await openSelect(chapterTrigger)
    const chapterOpts = optionsOf(menuOf(view.container, 'Chapter')).map((o) => o.textContent.trim())
    expect(chapterOpts).toContain('Calculus')
    expect(chapterOpts).toContain('Mechanics')
  })
})
