// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  buildPremiumIntelligenceModel: vi.fn(({ data, subject, user }) => ({
    examName: data?.meta?.examName ?? 'Examination',
    subject,
    user,
  })),
  buildPremiumFullModel: vi.fn(({ data, subject, user }) => ({
    examName: data?.meta?.examName ?? 'Examination',
    subject,
    user,
  })),
  createPremiumPdf: vi.fn(async () => ({
    bytes: new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]),
    pageCount: 4,
    flags: [],
  })),
  clicks: [],
}))

vi.mock('../../src/pages/student/premium-pdf/model.js', () => ({
  buildPremiumIntelligenceModel: h.buildPremiumIntelligenceModel,
  buildPremiumFullModel: h.buildPremiumFullModel,
}))

vi.mock('../../src/pages/student/premium-pdf/index.js', () => ({
  createPremiumPdf: h.createPremiumPdf,
}))

import * as pdf from '../../src/pages/student/exam-analysis-pdf.js'

beforeEach(() => {
  vi.clearAllMocks()
  h.clicks.length = 0
  URL.createObjectURL = vi.fn(() => 'blob:premium-test')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    h.clicks.push({ download: this.download, href: this.href })
  })
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('exam analysis PDF shared helpers', () => {
  it('formats stored minutes and hides zeros', () => {
    expect(pdf.formatReportTime(1.5)).toBe('1m 30s')
    expect(pdf.formatReportTime(0.75)).toBe('45s')
    expect(pdf.formatReportTime(40)).toBe('40m')
    expect(pdf.formatReportTime(0)).toBe('—')
    expect(pdf.formatReportTime(null)).toBe('—')
  })

  it('derives mastery from accuracy and maps option letters', () => {
    expect(pdf.masteryFromAccuracy(80)).toBe('Strong')
    expect(pdf.masteryFromAccuracy(62)).toBe('Average')
    expect(pdf.masteryFromAccuracy(50)).toBe('Weak')
    expect(pdf.masteryFromAccuracy(20)).toBe('Critical')
    expect(pdf.optLetter(2)).toBe('C')
  })

  it('prefers an explicit student identity, then the analysis payload', () => {
    expect(pdf.analysisPdfUser({}, { fullName: 'Aarav', rollNo: 'R1' })).toEqual({ fullName: 'Aarav', rollNo: 'R1' })
    expect(pdf.analysisPdfUser({
      student: { fullName: 'Meera Student', rollNo: 'N24-104' },
      attempt: { roll: 'ignored' },
    })).toEqual({ fullName: 'Meera Student', rollNo: 'N24-104' })
    expect(pdf.analysisPdfUser({
      meta: { rollNo: null },
      attempt: { roll: '21CS114', studentName: 'Ishita Gupta' },
    })).toEqual({ fullName: 'Ishita Gupta', rollNo: '21CS114' })
  })
})

describe('premium-only export API', () => {
  it('exposes the two production exports and no legacy writer surface', () => {
    expect(typeof pdf.exportAnalysisPDF).toBe('function')
    expect(typeof pdf.exportFullAnalysisPDF).toBe('function')
    expect(typeof pdf.analysisPdfUser).toBe('function')

    for (const name of [
      'buildReportModel', 'buildAnalysisPdfHtml', 'buildReportPdf',
      'buildFullModel', 'buildFullAnalysisPdf', 'buildRevisionGroups',
      'FAVICON_DATA_URI', 'htmlEscape', 'badgeClassFor',
    ]) {
      expect(pdf[name], name).toBeUndefined()
    }
  })

  it('routes Report through the premium renderer and downloads exactly once', async () => {
    const data = { meta: { examName: 'JEE Mock <Alpha>' } }
    const user = { fullName: 'Aarav Sharma', rollNo: '21CS114' }
    const result = await pdf.exportAnalysisPDF(data, 'Physics', user)

    expect(h.buildPremiumIntelligenceModel).toHaveBeenCalledOnce()
    expect(h.buildPremiumIntelligenceModel.mock.calls[0][0]).toMatchObject({ data, subject: 'Physics', user })
    expect(h.createPremiumPdf).toHaveBeenCalledOnce()
    expect(h.createPremiumPdf.mock.calls[0][0]).toMatchObject({ kind: 'intelligence' })
    expect(h.clicks).toHaveLength(1)
    expect(h.clicks[0].download).toMatch(/^MediXO_EduX_.*_Exam_Intelligence_Report\.pdf$/)
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
    expect(result.pageCount).toBe(4)
    expect(h.buildPremiumFullModel).not.toHaveBeenCalled()
  })

  it('routes Full Analysis through the premium renderer and downloads exactly once', async () => {
    const data = { meta: { examName: 'NEET UG Full Mock 01' } }
    const user = { fullName: 'Dev Student', rollNo: 'DEV-STU-001' }
    const result = await pdf.exportFullAnalysisPDF(data, 'All Subjects', user)

    expect(h.buildPremiumFullModel).toHaveBeenCalledOnce()
    expect(h.buildPremiumFullModel.mock.calls[0][0]).toMatchObject({ data, subject: 'All Subjects', user })
    expect(h.createPremiumPdf).toHaveBeenCalledOnce()
    expect(h.createPremiumPdf.mock.calls[0][0]).toMatchObject({ kind: 'full' })
    expect(h.clicks).toHaveLength(1)
    expect(h.clicks[0].download).toMatch(/^MediXO_EduX_.*_Full_Exam_Analysis_Report\.pdf$/)
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
    expect(result.pageCount).toBe(4)
    expect(h.buildPremiumIntelligenceModel).not.toHaveBeenCalled()
  })
})
