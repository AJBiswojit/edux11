/**
 * Premium PDF content & design refinement harness.
 *
 *   cd frontend && npm run pdf:refinement
 *
 * Produces:
 *   deliverables/refinement/*.pdf                 canonical reports
 *   deliverables/refinement/exports/*.pdf         six role/report combinations
 *   deliverables/refinement/qa/*.pdf              figure-rich and 180-question QA
 *   deliverables/refinement/generation-results.json
 *   deliverables/refinement/layout-audit.json
 *
 * Every figure is resolved from the real `backend/media` store through the
 * same asset pipeline the browser uses; WebP/AVIF files are converted with the
 * Node-only Pillow bridge because the harness has no canvas.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

import { buildPremiumFullModel, buildPremiumIntelligenceModel } from '../src/pages/student/premium-pdf/model.js'
import { renderPremiumPdf } from '../src/pages/student/premium-pdf/renderer.js'
import { loadQuestionMedia } from '../src/pages/student/premium-pdf/media.js'
import { createNodeAssetLoader } from './lib/node-media-loader.mjs'
import { buildFigureExamFixture, withFigures } from './lib/figure-fixtures.mjs'

const ROOT = new URL('../../deliverables/refinement/', import.meta.url)
const CANONICAL = new URL('../../backend/app/data/spa/student-portal.json', import.meta.url)
const NEET_180 = new URL('../../deliverables/pagination-fix/fixtures/neet-180.json', import.meta.url)
const ROLE_FIXTURE = (role) => new URL(`../../deliverables/pagination-fix/fixtures/role-${role}.json`, import.meta.url)

const ASSET_FILES = {
  logo: 'logo.png',
  coverDoorway: 'premium-cover-doorway.png',
  Inter: 'fonts/Inter-Regular.ttf',
  InterSemi: 'fonts/Inter-SemiBold.ttf',
  InterBold: 'fonts/Inter-Bold.ttf',
  Manrope: 'fonts/Manrope-Bold.ttf',
  STIXMath: 'fonts/STIXTwoMath-Regular.ttf',
  STIXText: 'fonts/STIXTwoText-Regular.ttf',
}

const generatedAt = new Date('2026-11-03T09:00:00Z')

async function loadAssets() {
  const base = new URL('../src/assets/', import.meta.url)
  const entries = await Promise.all(Object.entries(ASSET_FILES).map(async ([name, file]) => (
    [name, new Uint8Array(await readFile(new URL(file, base)))]
  )))
  const flat = Object.fromEntries(entries)
  const { logo, coverDoorway, ...fonts } = flat
  return { logo, coverDoorway, fonts }
}

function sha256(bytes) {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex').slice(0, 16)
}

async function main() {
  await mkdir(ROOT, { recursive: true })
  await mkdir(new URL('exports/', ROOT), { recursive: true })
  await mkdir(new URL('qa/', ROOT), { recursive: true })
  const assets = await loadAssets()
  const loader = createNodeAssetLoader()

  const canonical = JSON.parse(await readFile(CANONICAL, 'utf8')).examAnalysis
  const neet = JSON.parse(await readFile(NEET_180, 'utf8'))
  const roles = {}
  for (const role of ['student', 'faculty', 'admin']) {
    roles[role] = JSON.parse(await readFile(ROLE_FIXTURE(role), 'utf8'))
  }

  const results = {
    generatedAt: generatedAt.toISOString(),
    engine: 'premium-academic-editorial-v2 + figure-asset-layer',
    reports: {},
    exports: {},
    qa: {},
  }
  const layoutAudit = { generatedAt: generatedAt.toISOString(), reports: {} }

  async function renderOne({
    slug, kind, data, subject = 'All Subjects', user = null, file, label, group = 'reports',
  }) {
    const model = kind === 'full'
      ? buildPremiumFullModel({ data, subject, user, generatedAt })
      : buildPremiumIntelligenceModel({ data, subject, user, generatedAt })
    const media = await loadQuestionMedia(model.questions, { loader })
    const result = await renderPremiumPdf({ kind, model, assets })
    await writeFile(new URL(file, ROOT), result.bytes)
    layoutAudit.reports[slug] = result.layoutAudit
    const record = {
      file, label, kind, synthetic: group === 'qa',
      pages: result.pageCount,
      bytes: result.bytes.length,
      sha256: sha256(result.bytes),
      questionsSupplied: result.contentCoverage.questionsSupplied,
      questionsRendered: result.contentCoverage.questionsRendered,
      figureReferences: result.contentCoverage.figureReferences,
      figuresEmbedded: result.contentCoverage.figuresEmbedded,
      figuresFailed: result.contentCoverage.figuresFailed,
      figureQuestions: model.figureQuestionCount,
      mediaFailures: media.diagnostics.map((entry) => ({
        code: entry.code, questionId: entry.questionId, field: entry.field, option: entry.option,
      })),
      layout: {
        zeroUnintendedOverlaps: result.auditSummary.zeroUnintendedOverlaps,
        textTextOverlaps: result.auditSummary.textTextOverlaps.length,
        textBarOverlaps: result.auditSummary.textBarOverlaps.length,
        siblingComponentOverlaps: result.auditSummary.siblingComponentOverlaps.length,
        componentBoundaryViolations: result.auditSummary.componentBoundaryViolations.length,
        footerCollisions: result.auditSummary.footerCollisions.length,
        overflowingComponents: result.auditSummary.overflowingComponents.length,
      },
      flags: result.flags.length,
      missingValues: result.missingValues,
    }
    if (!result.auditSummary.zeroUnintendedOverlaps) {
      throw new Error(`${slug}: layout audit failed ${JSON.stringify(record.layout)}`)
    }
    if (result.missingValues.length) {
      throw new Error(`${slug}: ${result.missingValues.length} questions were not rendered`)
    }
    results[group][slug] = record
    return record
  }

  // Canonical publications.
  await renderOne({
    slug: 'full', kind: 'full', data: canonical,
    file: 'MediXO_EduX_Full_Exam_Analysis_Report.pdf', label: 'Full Exam Analysis Report',
  })
  await renderOne({
    slug: 'intelligence', kind: 'intelligence', data: canonical,
    file: 'MediXO_EduX_Exam_Intelligence_Report.pdf', label: 'Exam Intelligence Report',
  })

  // Figure-rich examination coverage.
  const figureExam = buildFigureExamFixture()
  await renderOne({
    slug: 'figure-exam-full', kind: 'full', data: figureExam, group: 'qa',
    file: 'qa/figure-exam-full-analysis.pdf', label: 'Figure-rich JEE paper · full analysis',
  })
  await renderOne({
    slug: 'figure-exam-report', kind: 'intelligence', data: figureExam, group: 'qa',
    file: 'qa/figure-exam-intelligence.pdf', label: 'Figure-rich JEE paper · intelligence report',
  })

  // 180-question NEET full analysis with figures.
  const neetWithFigures = withFigures(neet, { every: 4, limit: 180 })
  const neetRecord = await renderOne({
    slug: 'neet-180-full', kind: 'full', data: neetWithFigures, group: 'qa',
    file: 'qa/neet-180-full-analysis.pdf', label: 'NEET 180-question full analysis with figures',
  })
  if (neetRecord.questionsRendered !== 180) throw new Error('NEET validation did not render all 180 questions')

  // Six role/report export combinations.
  for (const role of ['student', 'faculty', 'admin']) {
    const payload = roles[role]
    const data = withFigures(payload.data, { every: 3, limit: 12 })
    for (const kind of ['full', 'intelligence']) {
      const suffix = kind === 'full' ? 'full-analysis' : 'report'
      await renderOne({
        slug: `${role}-${suffix}`, kind, data, user: payload.user, group: 'exports',
        file: `exports/${role}-${suffix}.pdf`, label: `${role} · ${kind === 'full' ? 'Full Analysis' : 'Report'}`,
      })
    }
  }

  await writeFile(new URL('generation-results.json', ROOT), `${JSON.stringify(results, null, 2)}\n`)
  await writeFile(new URL('layout-audit.json', ROOT), `${JSON.stringify(layoutAudit, null, 2)}\n`)
  console.log(JSON.stringify({
    reports: Object.fromEntries(Object.entries(results.reports).map(([k, v]) => [k, { pages: v.pages, figures: v.figuresEmbedded }])),
    qa: Object.fromEntries(Object.entries(results.qa).map(([k, v]) => [k, { pages: v.pages, questions: `${v.questionsRendered}/${v.questionsSupplied}`, figures: v.figuresEmbedded, failed: v.figuresFailed }])),
    exports: Object.fromEntries(Object.entries(results.exports).map(([k, v]) => [k, { pages: v.pages, figures: v.figuresEmbedded }])),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
