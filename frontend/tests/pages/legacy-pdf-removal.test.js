import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = fileURLToPath(new URL('../../src/', import.meta.url))
const PARENT = join(SRC, 'pages/student/exam-analysis-pdf.js')
const PREMIUM = join(SRC, 'pages/student/premium-pdf')

function sourceFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full))
    else if (/\.(js|jsx|mjs)$/.test(name)) out.push(full)
  }
  return out
}

const FILES = sourceFiles(SRC)
const read = (p) => readFileSync(p, 'utf8')

const REMOVED = [
  'buildReportModel', 'buildAnalysisPdfHtml', 'buildReportPdf',
  'buildFullModel', 'buildFullAnalysisPdf', 'FAVICON_DATA_URI',
  'htmlEscape', 'badgeClassFor', 'loadBrandLogo', 'loadLogoPixels',
  'reportCss', 'revisionSectionHtml', 'metaCell', 'statCard',
  'masteryBadge', 'priorityBadge', 'faDrawHBar', 'faDrawPie',
  'faDrawVBar', 'faLegendRow', 'faSubjectColor', 'faMasteryInk',
  'HEADER_RGB', 'pdfSafe', 'FA_NAVY', 'FA_INDIGO', 'FA_BLUE',
  'FA_CYAN', 'FA_TEAL', 'FA_EMERALD', 'FA_AMBER', 'FA_ROSE',
  'FA_VIOLET', 'FA_SLATE', 'FA_LINE', 'FA_WHITE', 'FA_INK',
  'FA_MUTED', 'FA_STATUS_COLOR', 'FA_STATUS_SOFT', 'FA_DIFFICULTY_COLOR',
]

describe('single premium PDF engine — legacy removal audit', () => {
  it('has no production references to the retired writer or its helpers', () => {
    const offenders = []
    for (const file of FILES) {
      const text = read(file)
      for (const symbol of REMOVED) {
        if (new RegExp(`\\b${symbol}\\b`).test(text)) {
          offenders.push(`${file.replace(SRC, '')}: ${symbol}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('keeps the shared base normalisation inside the premium pipeline only', () => {
    const parent = read(PARENT)
    expect(parent).not.toContain('export function buildRevisionGroups')
    expect(parent).not.toContain('buildReportModel')
    expect(read(join(PREMIUM, 'base-model.js'))).toContain('function buildRevisionGroups(')
    expect(read(join(PREMIUM, 'model.js'))).toContain("import { buildBaseReportModel } from './base-model.js'")
  })

  it('keeps both premium production exports as the only PDF entry points', () => {
    const parent = read(PARENT)
    expect((parent.match(/export async function export/g) || [])).toHaveLength(2)
    expect(parent).toContain("import('./premium-pdf/model.js')")
    expect(parent).toContain("import('./premium-pdf/index.js')")
    expect(parent).not.toMatch(/\b(legacyPdf|useLegacyPdf|pdfFallback|legacyFallback|PDF_ENGINE|pdfFeatureFlag|featureFlagPdf)\b/i)
  })

  it('retains every premium renderer, font and brand asset file', () => {
    const required = [
      'index.js', 'renderer.js', 'model.js', 'base-model.js',
      'browser-assets.js', 'pdfkit-standard-fonts.js', 'theme.js',
      'layout.js', 'components.js', 'text.js', 'intelligence.js',
      'full-analysis.js', 'math.js',
    ]
    for (const name of required) expect(existsSync(join(PREMIUM, name)), name).toBe(true)
    expect(existsSync(join(SRC, 'assets/logo.png'))).toBe(true)
    for (const font of [
      'Inter-Regular.ttf', 'Inter-SemiBold.ttf', 'Inter-Bold.ttf',
      'Manrope-Bold.ttf', 'STIXTwoMath-Regular.ttf', 'STIXTwoText-Regular.ttf',
    ]) {
      expect(existsSync(join(SRC, 'assets/fonts', font)), font).toBe(true)
    }
  })

  it('leaves the unrelated program-results export untouched', () => {
    // Scope is the AI Exam Analysis PDF system, not the separate admin
    // program-results XLS/PDF exporter.
    expect(existsSync(join(SRC, 'pages/admin/program-results-export.js'))).toBe(true)
  })
})
