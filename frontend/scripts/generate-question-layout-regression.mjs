/**
 * Rebuild the two supplied Full Exam Analysis references with the shared
 * production renderer and the checked-in, question-matched JEE figures.
 *
 *   cd frontend && node scripts/generate-question-layout-regression.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

import { buildPremiumFullModel } from '../src/pages/student/premium-pdf/model.js'
import { renderPremiumPdf } from '../src/pages/student/premium-pdf/renderer.js'
import { loadQuestionMedia } from '../src/pages/student/premium-pdf/media.js'
import { createNodeAssetLoader } from './lib/node-media-loader.mjs'

const ROOT = new URL('../../deliverables/question-layout-fix/', import.meta.url)
const FIXTURES = new URL('fixtures/', ROOT)
const OUT = new URL('after/', ROOT)
const AUDIT = new URL('layout-audit.json', ROOT)
const RESULTS = new URL('generation-results.json', ROOT)
const GENERATED_AT = new Date('2026-11-04T00:00:00.000Z')
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

function sha256(bytes) {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex')
}

async function loadAssets() {
  const base = new URL('../src/assets/', import.meta.url)
  const entries = await Promise.all(Object.entries(ASSET_FILES).map(async ([name, file]) => (
    [name, new Uint8Array(await readFile(new URL(file, base)))]
  )))
  const flat = Object.fromEntries(entries)
  const { logo, coverDoorway, ...fonts } = flat
  return { logo, coverDoorway, fonts }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const assets = await loadAssets()
  const loader = createNodeAssetLoader()
  const results = { generatedAt: GENERATED_AT.toISOString(), reports: {} }
  const audit = { generatedAt: GENERATED_AT.toISOString(), reports: {} }

  for (const [slug, inputFile, outputFile] of [
    ['jee-phase2', 'jee-phase2-regression.json', 'jee-phase2-full-analysis.pdf'],
    ['neet-set2', 'neet-set2-regression.json', 'neet-set2-full-analysis.pdf'],
  ]) {
    const fixture = JSON.parse(await readFile(new URL(inputFile, FIXTURES), 'utf8'))
    const model = buildPremiumFullModel({
      data: fixture.data,
      subject: 'All Subjects',
      generatedAt: GENERATED_AT,
    })
    const media = await loadQuestionMedia(model.questions, { loader })
    const result = await renderPremiumPdf({ kind: 'full', model, assets })
    const path = new URL(outputFile, OUT)
    await writeFile(path, result.bytes)

    const record = {
      reference: fixture.reference,
      file: `after/${outputFile}`,
      bytes: result.bytes.length,
      sha256: sha256(result.bytes),
      pages: result.pageCount,
      pageSize: result.pageSize,
      questionsSupplied: result.contentCoverage.questionsSupplied,
      questionsRendered: result.contentCoverage.questionsRendered,
      explanationsRendered: result.contentCoverage.explanationsRendered,
      figureReferences: result.contentCoverage.figureReferences,
      figuresResolved: result.contentCoverage.figuresResolved,
      figuresEmbedded: result.contentCoverage.figuresEmbedded,
      figuresFailed: result.contentCoverage.figuresFailed,
      mediaDiagnostics: media.diagnostics.map(({ code, questionId, field, option }) => ({ code, questionId, field, option })),
      missingQuestions: result.missingValues,
      flags: result.flags.length,
      audit: {
        zeroUnintendedOverlaps: result.auditSummary.zeroUnintendedOverlaps,
        textTextOverlaps: result.auditSummary.textTextOverlaps.length,
        textBarOverlaps: result.auditSummary.textBarOverlaps.length,
        siblingComponentOverlaps: result.auditSummary.siblingComponentOverlaps.length,
        componentBoundaryViolations: result.auditSummary.componentBoundaryViolations.length,
        footerCollisions: result.auditSummary.footerCollisions.length,
        orphanHeadings: result.auditSummary.orphanHeadings.length,
        repeatedTableHeaderFailures: result.auditSummary.repeatedTableHeaderFailures.length,
        overflowingComponents: result.auditSummary.overflowingComponents.length,
      },
    }
    results.reports[slug] = record
    audit.reports[slug] = result.layoutAudit
    await writeFile(RESULTS, `${JSON.stringify(results, null, 2)}\n`)
    await writeFile(AUDIT, `${JSON.stringify(audit, null, 2)}\n`)
    if (record.questionsRendered !== record.questionsSupplied || record.missingQuestions.length) {
      throw new Error(`${slug}: not all question cards were rendered: ${JSON.stringify(record)}`)
    }
    if (record.figuresFailed || record.mediaDiagnostics.length) {
      throw new Error(`${slug}: unresolved source figures: ${JSON.stringify(record.mediaDiagnostics)}`)
    }
    if (!record.audit.zeroUnintendedOverlaps) {
      throw new Error(`${slug}: renderer layout audit failed: ${JSON.stringify(record.audit)}`)
    }
    console.log(`${slug}: ${record.pages} pages; ${record.questionsRendered}/${record.questionsSupplied} questions; ${record.figuresEmbedded} figures`)
  }

  await writeFile(RESULTS, `${JSON.stringify(results, null, 2)}\n`)
  await writeFile(AUDIT, `${JSON.stringify(audit, null, 2)}\n`)
  console.log(`cover asset sha256: ${sha256(await readFile(fileURLToPath(new URL('../src/assets/premium-cover-doorway.png', import.meta.url))))}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
