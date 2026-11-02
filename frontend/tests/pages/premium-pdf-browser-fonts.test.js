// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

const EXPECTED_NAMES = [
  'Courier',
  'Courier-Bold',
  'Courier-BoldOblique',
  'Courier-Oblique',
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-BoldOblique',
  'Helvetica-Oblique',
  'Symbol',
  'Times-Bold',
  'Times-BoldItalic',
  'Times-Italic',
  'Times-Roman',
  'ZapfDingbats',
]

async function loadSetup(mockExports) {
  vi.resetModules()
  vi.doMock('pdfkit', () => mockExports)
  return import('../../src/pages/student/premium-pdf/pdfkit-standard-fonts.js')
}

describe('PDFKit browser standard-font registration', () => {
  afterEach(() => {
    vi.doUnmock('pdfkit')
    vi.resetModules()
  })

  it('registers all Base 14 font metrics once for the browser build', async () => {
    const registerStdFonts = vi.fn()
    const setup = await loadSetup({ default: class PDFDocument {}, registerStdFonts })

    await setup.ensurePdfKitStandardFonts()
    await setup.ensurePdfKitStandardFonts()

    expect(registerStdFonts).toHaveBeenCalledTimes(1)
    const fonts = registerStdFonts.mock.calls[0]
    expect(fonts).toHaveLength(14)
    expect(fonts.map((font) => font.name)).toEqual(EXPECTED_NAMES)
    expect(fonts.find((font) => font.name === 'Helvetica')).toMatchObject({
      ascender: expect.any(Number),
      descender: expect.any(Number),
    })
  })

  it('leaves the Node build untouched when registerStdFonts is unavailable', async () => {
    const setup = await loadSetup({ default: class PDFDocument {}, registerStdFonts: undefined })
    await expect(setup.ensurePdfKitStandardFonts()).resolves.toBeUndefined()
  })
})
