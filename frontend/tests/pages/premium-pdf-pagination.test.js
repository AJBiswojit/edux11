// @vitest-environment node

import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import { ReportContext } from '../../src/pages/student/premium-pdf/layout.js'
import { CONTENT } from '../../src/pages/student/premium-pdf/theme.js'
import { EditorialColumns } from '../../src/pages/student/premium-pdf/components.js'
import {
  buildPremiumFullModel,
  buildPremiumIntelligenceModel,
} from '../../src/pages/student/premium-pdf/model.js'
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
const FIXTURE = (name) => new URL(`../../../deliverables/pagination-fix/fixtures/${name}`, import.meta.url)
const generatedAt = new Date('2026-11-03T09:00:00Z')

async function assets() {
  const entries = await Promise.all(Object.entries(ASSETS).map(async ([name, url]) => (
    [name, new Uint8Array(await readFile(url))]
  )))
  const flat = Object.fromEntries(entries)
  const { logo, coverDoorway, ...fonts } = flat
  return { logo, coverDoorway, fonts }
}

async function fixture(name) {
  return JSON.parse(await readFile(FIXTURE(name), 'utf8'))
}

async function renderFixture(name, kind, user = { fullName: 'Aarav Sharma', rollNo: '21CS114' }) {
  const data = await fixture(name)
  const model = kind === 'full'
    ? buildPremiumFullModel({ data, subject: 'All Subjects', user, generatedAt })
    : buildPremiumIntelligenceModel({ data, subject: 'All Subjects', user, generatedAt })
  return { model, result: await renderPremiumPdf({ kind, model, assets: await assets() }) }
}

function tallEditorialSpec({ total = 1850.15, entryHeight = 18.5, onDraw } = {}) {
  const count = Math.ceil(total / entryHeight)
  const entries = Array.from({ length: count }, (_, index) => ({ id: index, h: entryHeight }))
  return {
    type: 'calibration-table',
    label: 'mistake-topic-columns',
    measure: () => total,
    draw: () => onDraw?.(count),
    pagination: {
      entries,
      fixed: () => 0,
      continuationLabel: 'Error patterns and topic accuracy',
      build: (subset) => ({
        type: 'calibration-table-chunk',
        label: 'mistake-topic-columns',
        measure: () => subset.reduce((sum, entry) => sum + entry.h, 0),
        draw: () => subset.forEach((entry) => onDraw?.(entry.id)),
      }),
      split: (ctx, entry, w, maxHeight) => [{ ...entry, h: Math.min(entry.h, maxHeight) }],
    },
  }
}

describe('Premium PDF content-driven pagination', () => {
  it('reproduces the exact 1850.15 pt indivisible reserve failure', () => {
    const ctx = Object.create(ReportContext.prototype)
    ctx.y = CONTENT.y
    ctx.currentPageIndex = 0
    ctx.audit = { begin: () => ({}), end: () => {} }
    ctx.doc = {}
    ctx.assets = {}
    ctx.model = {}
    ctx.kind = 'intelligence'
    expect(() => ctx.reserve(1850.15, { label: 'mistake-topic-columns' }))
      .toThrow(/Component height 1850\.15 pt exceeds the 708 pt printable area: mistake-topic-columns/)
  })

  it('splits a 1850.15 pt editorial component into page-sized segments without losing entries', () => {
    const drawn = []
    const componentHeights = []
    const shortSpec = {
      type: 'short-table', label: 'short column', measure: () => 120,
      draw: () => {},
    }
    const tallSpec = tallEditorialSpec({ total: 1850.15, onDraw: (id) => drawn.push(id) })
    const ctx = {
      y: CONTENT.y,
      currentPageIndex: 0,
      component(spec) {
        const h = Number(spec.measure({ ctx: this })) || 0
        componentHeights.push(h)
        if (h > CONTENT.h + 0.01) throw new Error(`Component height ${h} exceeds printable area`)
        const frame = { x: CONTENT.x, y: CONTENT.y, w: CONTENT.w, h, page: 0 }
        spec.draw?.(frame)
        return frame
      },
      child(meta, draw) {
        draw({ x: meta.x, y: meta.y, w: meta.w, h: meta.h, page: 0 })
        return null
      },
      text() { return 0 },
      measureText() { return 0 },
      canvas: { rect() {}, line() {}, bar() {}, arc() {}, image() {} },
      textEngine: { measure: () => 0, layout: () => ({ lines: [], height: 0 }) },
      emit() {},
      recordBox() {},
      newPage() { return false },
      sectionBreak() {},
      chrome() { return null },
      drawContinuation() {},
      audit: { begin: () => ({}), end: () => {} },
    }
    EditorialColumns(ctx, {
      id: 'mistake-topic-columns',
      sectionTitle: 'Error patterns and topic accuracy',
      gap: 18,
      columns: [() => tallSpec, () => shortSpec],
    })
    expect(componentHeights.length).toBeGreaterThanOrEqual(3)
    expect(componentHeights.every((h) => h <= CONTENT.h + 0.01)).toBe(true)
    expect(drawn.length).toBe(Math.ceil(1850.15 / 18.5))
    expect(new Set(drawn).size).toBe(drawn.length)
  })

  it('renders the calibrated failing intelligence report after the fix', async () => {
    const { result } = await renderFixture('failing-jee-phase2.json', 'intelligence')
    expect(result.pageCount).toBeGreaterThan(2)
    expect(result.auditSummary.zeroUnintendedOverlaps).toBe(true)
    expect(result.flags).toEqual([])
    expect(result.bytes.length).toBeGreaterThan(10000)
  }, 120000)

  it('uses the remaining space on a partially filled page instead of leaving a nearly blank sheet', async () => {
    const { result } = await renderFixture('failing-jee-phase2.json', 'intelligence')
    const textBoxesPerPage = Array.from({ length: result.pageCount }, () => 0)
    for (const box of result.layoutAudit.boxes) {
      if (box.role === 'text' && box.page >= 0 && box.page < result.pageCount) {
        textBoxesPerPage[box.page] += 1
      }
    }
    // The pre-capacity regression stranded only a section heading on page 2 and
    // pushed the first table segment to page 3. Every page now carries content.
    // The upper bound reflects the single-column table layout: independent
    // tables are stacked at full width instead of being squeezed side by side.
    expect(result.pageCount).toBeLessThanOrEqual(12)
    // The final page is a legitimate table continuation plus the colophon;
    // every page still carries a substantial block of content.
    expect(Math.min(...textBoxesPerPage)).toBeGreaterThan(30)
    // Page 2 carries a continued chapter table plus two full tables; the exact
    // count shifts with the single-column layout, so the floor is generous.
    expect(textBoxesPerPage[1]).toBeGreaterThan(45)
  }, 120000)

  it('renders the calibrated failing full report with a clean layout', async () => {
    const { result } = await renderFixture('failing-jee-phase2.json', 'full')
    expect(result.pageCount).toBeGreaterThan(5)
    expect(result.auditSummary.zeroUnintendedOverlaps).toBe(true)
    expect(result.missingValues).toEqual([])
  }, 120000)

  it('renders a single oversized topic entry across continuation pages', async () => {
    const { result } = await renderFixture('oversized-topic.json', 'intelligence')
    expect(result.pageCount).toBeGreaterThan(2)
    expect(result.auditSummary.zeroUnintendedOverlaps).toBe(true)
    expect(result.flags).toEqual([])
  }, 120000)

  it('renders long question statements and explanations without clipping', async () => {
    const { result } = await renderFixture('long-question.json', 'full')
    expect(result.pageCount).toBeGreaterThan(3)
    expect(result.auditSummary.zeroUnintendedOverlaps).toBe(true)
    expect(result.missingValues).toEqual([])
  }, 120000)

  it('preserves all 180 NEET questions, explanations and subject separation', async () => {
    const data = await fixture('neet-180.json')
    const model = buildPremiumFullModel({ data, subject: 'All Subjects', user: null, generatedAt })
    expect(model.questions).toHaveLength(180)
    expect(model.questions.map((q) => q.q)).toEqual(
      Array.from({ length: 180 }, (_, i) => `Q${String(i + 1).padStart(3, '0')}`),
    )
    expect(model.questions.every((q) => q.explanation && q.options.length === 4)).toBe(true)
    const counts = model.questions.reduce((acc, q) => ({ ...acc, [q.subject]: (acc[q.subject] || 0) + 1 }), {})
    expect(counts).toEqual({ Physics: 60, Chemistry: 60, Biology: 60 })

    const { result } = await renderFixture('neet-180.json', 'full')
    expect(result.pageCount).toBeGreaterThan(40)
    expect(result.auditSummary.zeroUnintendedOverlaps).toBe(true)
    expect(result.missingValues).toEqual([])
    expect(result.flags).toEqual([])
  }, 180000)
})
