// @vitest-environment node

import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import { buildPremiumFullModel } from '../../src/pages/student/premium-pdf/model.js'
import { renderPremiumPdf } from '../../src/pages/student/premium-pdf/renderer.js'

const ASSETS = {
  logo: new URL('../../src/assets/logo.png', import.meta.url),
  coverDoorway: new URL('../../src/assets/premium-cover-doorway.png', import.meta.url),
  Inter: new URL('../../src/assets/fonts/Inter-Regular.ttf', import.meta.url),
  InterSemi: new URL('../../src/assets/fonts/Inter-SemiBold.ttf', import.meta.url),
  InterBold: new URL('../../src/assets/fonts/Inter-Bold.ttf', import.meta.url),
  Manrope: new URL('../../src/assets/fonts/Manrope-Bold.ttf', import.meta.url),
  STIXMath: new URL('../../src/assets/fonts/STIXTwoMath-Regular.ttf', import.meta.url),
  STIXText: new URL('../../src/assets/fonts/STIXTwoText-Regular.ttf', import.meta.url),
}

async function loadAssets() {
  const entries = await Promise.all(Object.entries(ASSETS).map(async ([name, url]) => (
    [name, new Uint8Array(await readFile(url))]
  )))
  const flat = Object.fromEntries(entries)
  const { logo, coverDoorway, ...fonts } = flat
  return { logo, coverDoorway, fonts }
}

async function renderQuestion(statement) {
  const data = JSON.parse(await readFile(
    new URL('../../../deliverables/pagination-fix/fixtures/failing-jee-phase2.json', import.meta.url),
    'utf8',
  ))
  data.questionReview = [{
    q: 'Q1', subject: 'Mathematics', chapter: 'Sequences and Series', topic: 'Series',
    difficulty: 'Medium', type: 'MCQ', status: 'Correct', marks: 4, time: 1,
    selected: 0, correctAnswer: 0, text: statement,
    options: ['$\\frac{3}{2}$', '$\\sqrt{2}$', '$\\pi$', 'Plain text option'],
    explanation: 'The option uses a fraction, a radical and pi.',
  }]
  data.questionIntelligence = {
    total: 1, attempted: 1, correct: 1, incorrect: 0, skipped: 0,
    accuracy: 100, successRate: 100, negativeMarks: 0, guessAttempts: 0, attemptRatio: 100,
  }
  const model = buildPremiumFullModel({
    data, subject: 'All Subjects', user: null,
    generatedAt: new Date('2026-11-04T00:00:00Z'),
  })
  return renderPremiumPdf({ kind: 'full', model, assets: await loadAssets() })
}

function expectTypesetOptions(result) {
  const math = result.layoutAudit.boxes
    .filter((box) => box.kind === 'math')
    .map((box) => box.tex)
  const text = result.layoutAudit.boxes
    .filter((box) => box.kind === 'text')
    .map((box) => box.text || '')
    .join(' ')
  expect(math).toContain('\\frac{3}{2}')
  expect(math).toContain('\\sqrt{2}')
  expect(math).toContain('\\pi')
  expect(text).not.toMatch(/\$\\(?:frac|sqrt|pi)/)
  expect(result.flags).toEqual([])
  expect(result.auditSummary.zeroUnintendedOverlaps).toBe(true)
}

describe('Premium PDF MCQ option mathematics', () => {
  it('typesets TeX options as vector math in a standard question card', async () => {
    const result = await renderQuestion('Choose the mathematically correct expression.')
    expectTypesetOptions(result)
  }, 120000)

  it('preserves vector math when a long question intro flows across pages', async () => {
    const statement = Array(160)
      .fill('A particle follows a uniform path through a measured coordinate system.')
      .join(' ')
    const result = await renderQuestion(statement)
    expectTypesetOptions(result)
    expect(result.layoutAudit.components.some((component) => (
      component.type === 'text-flow' && /question statement/i.test(component.label)
    ))).toBe(true)
  }, 120000)
})
