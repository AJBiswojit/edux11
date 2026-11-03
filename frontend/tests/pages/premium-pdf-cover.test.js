// @vitest-environment node

import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

import { coverData } from '../../src/pages/student/premium-pdf/cover.js'
import { buildPremiumFullModel } from '../../src/pages/student/premium-pdf/model.js'
import { renderPremiumPdf } from '../../src/pages/student/premium-pdf/renderer.js'

const CANONICAL = new URL('../../../backend/app/data/spa/student-portal.json', import.meta.url)
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
const generatedAt = new Date('2026-11-03T09:00:00Z')

async function loadAssets() {
  const entries = await Promise.all(Object.entries(ASSETS).map(async ([name, url]) => (
    [name, new Uint8Array(await readFile(url))]
  )))
  const flat = Object.fromEntries(entries)
  const { logo, coverDoorway, ...fonts } = flat
  return { logo, coverDoorway, fonts }
}

async function canonicalModel() {
  const payload = JSON.parse(await readFile(CANONICAL, 'utf8')).examAnalysis
  return buildPremiumFullModel({
    data: payload,
    subject: 'All Subjects',
    user: { fullName: 'Signed-in Faculty Should Not Appear', rollNo: 'FAC-001' },
    generatedAt,
  })
}

describe('Premium PDF Full Exam Analysis cover', () => {
  it('maps cover fields from the examinee analysis payload and never fabricates a missing score', async () => {
    const model = await canonicalModel()
    const data = coverData(model)
    expect(data.examName).toBe('All India Test Series — JEE Main Pattern')
    expect(data.studentName).toBe('Aarav Sharma')
    expect(data.rollNo).toBe('21CS114')
    expect(data.scoreLabel).toBe('182')
    expect(data.totalLabel).toBe('300')
    expect(data.percentage).toBe(60.7)
    expect(data.counts.map(({ value }) => value)).toEqual(['47', '14', '7'])

    const unavailable = coverData({
      meta: { totalMarks: null },
      hero: { score: null, maxScore: null, percentage: null },
      qi: {},
      subjectValues: [],
      examName: 'NEET UG',
      studentName: 'Examinee',
      rollNo: 'N-42',
    })
    expect(unavailable.percentage).toBeNull()
    expect(unavailable.scoreText).toBe('')
    expect(unavailable.counts).toEqual([])
  })

  it('renders a numberless A4 editorial cover with selectable dynamic values and clean layout audit', async () => {
    const model = await canonicalModel()
    const result = await renderPremiumPdf({ kind: 'full', model, assets: await loadAssets() })
    const pageOneText = result.layoutAudit.boxes
      .filter((box) => box.page === 0 && box.kind === 'text')
      .map((box) => String(box.text || ''))
      .join('\n')

    expect(new TextDecoder().decode(result.bytes.subarray(0, 5))).toBe('%PDF-')
    expect(result.pageCount).toBeLessThan(17)
    expect(result.contentCoverage.questionsRendered).toBe(model.questions.length)
    expect(result.auditSummary.zeroUnintendedOverlaps).toBe(true)
    expect(result.layoutAudit.boxes.some((box) => box.page === 0 && box.role === 'cover-illustration')).toBe(true)
    for (const value of ['FULL EXAM', 'ANALYSIS', 'REPORT', '182 / 300', 'Aarav Sharma', '21CS114', '47', '14', '7']) {
      expect(pageOneText).toContain(value)
    }
    expect(pageOneText).not.toContain('Signed-in Faculty')
    expect(pageOneText).not.toContain('PAGE 01')
  }, 120000)
})
