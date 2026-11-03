/**
 * Render one Premium PDF from a JSON fixture and record the result or error.
 *
 * Usage:
 *   node deliverables/pagination-fix/scripts/render.mjs \
 *     --payload fixtures/failing-jee-phase2.json \
 *     --kind intelligence --out before/intelligence.pdf --json before/intelligence.json
 *
 * Set PAGINATION_BASELINE to an absolute directory containing the original
 * premium-pdf/*.js files to reproduce the pre-fix failure. The baseline needs
 * a node_modules symlink/copy with pdfkit available.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = new URL('../../../', import.meta.url)
const FRONTEND = new URL('frontend/', ROOT)
const ASSETS = {
  logo: new URL('src/assets/logo.png', FRONTEND),
  Inter: new URL('src/assets/fonts/Inter-Regular.ttf', FRONTEND),
  InterSemi: new URL('src/assets/fonts/Inter-SemiBold.ttf', FRONTEND),
  InterBold: new URL('src/assets/fonts/Inter-Bold.ttf', FRONTEND),
  Manrope: new URL('src/assets/fonts/Manrope-Bold.ttf', FRONTEND),
  STIXMath: new URL('src/assets/fonts/STIXTwoMath-Regular.ttf', FRONTEND),
  STIXText: new URL('src/assets/fonts/STIXTwoText-Regular.ttf', FRONTEND),
}

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && index + 1 < process.argv.length ? process.argv[index + 1] : fallback
}

function absolute(value) {
  return resolve(process.cwd(), value)
}

async function loadAssets() {
  const entries = await Promise.all(Object.entries(ASSETS).map(async ([name, url]) => (
    [name, new Uint8Array(await readFile(url))]
  )))
  const flat = Object.fromEntries(entries)
  const { logo, ...fonts } = flat
  return { logo, fonts }
}

async function loadModule(base, name) {
  const path = base ? resolve(base, `${name}.js`) : fileURLToPath(new URL(`src/pages/student/premium-pdf/${name}.js`, FRONTEND))
  return import(pathToFileURL(path).href)
}

function fileURLToPath(url) {
  // Node's fileURLToPath is available, but keep the helper local for clarity.
  return new URL(url).pathname
}

async function main() {
  const payloadPath = absolute(arg('payload', 'deliverables/pagination-fix/fixtures/failing-jee-phase2.json'))
  const kind = arg('kind', 'intelligence')
  const subject = arg('subject', 'All Subjects')
  const role = arg('role', 'student')
  const outPath = absolute(arg('out', 'deliverables/pagination-fix/before/report.pdf'))
  const jsonPath = absolute(arg('json', 'deliverables/pagination-fix/before/report.json'))
  const baseline = process.env.PAGINATION_BASELINE || ''
  const generatedAt = new Date('2026-11-03T09:00:00Z')
  await mkdir(dirname(outPath), { recursive: true })
  await mkdir(dirname(jsonPath), { recursive: true })

  const raw = JSON.parse(await readFile(payloadPath, 'utf8'))
  const data = raw.data || raw
  const user = raw.user || data.user || {
    fullName: { student: 'Aarav Sharma', faculty: 'Faculty Verification User', admin: 'Admin Verification User' }[role],
    rollNo: role === 'student' ? '21CS114' : 'DEV-STU-001',
  }
  const assets = await loadAssets()
  const modelModule = await loadModule(baseline, 'model')
  const rendererModule = await loadModule(baseline, 'renderer')
  const build = kind === 'full' ? modelModule.buildPremiumFullModel : modelModule.buildPremiumIntelligenceModel
  const model = build({ data, subject, user, generatedAt })
  let result
  let error = null
  try {
    result = await rendererModule.renderPremiumPdf({ kind, model, assets })
    await writeFile(outPath, result.bytes)
  } catch (caught) {
    error = {
      name: caught?.name || 'Error',
      message: String(caught?.message || caught),
      stack: String(caught?.stack || '').split('\n').slice(0, 12).join('\n'),
    }
  }
  const match = error && /Component height ([0-9.]+) pt exceeds/.exec(error.message)
  const record = {
    generatedAt: generatedAt.toISOString(),
    source: payloadPath,
    kind, subject, role,
    user,
    examName: model.examName,
    examId: model.examId,
    studentName: model.studentName,
    rollNo: model.rollNo,
    reportTitle: model.reportTitle,
    sourceValueCount: model.sourceValues?.length || 0,
    baseline: !!baseline,
    engine: baseline ? 'premium-v2-baseline' : 'premium-v2-pagination-fix',
    ok: !error,
    error,
    componentHeight: match ? Number(match[1]) : null,
    pageCount: result?.pageCount ?? null,
    auditSummary: result?.auditSummary ?? null,
    layoutAudit: result?.layoutAudit ?? null,
    flags: result?.flags ?? null,
    missingValues: result?.missingValues ?? null,
    emittedCharacters: result?.emittedCharacters ?? null,
    pageSize: result?.pageSize ?? null,
    bytes: result?.bytes?.length ?? null,
    output: error ? null : outPath,
  }
  await writeFile(jsonPath, `${JSON.stringify(record, null, 2)}\n`)
  console.log(JSON.stringify({ ok: record.ok, error: record.error?.message || null, componentHeight: record.componentHeight, pageCount: record.pageCount, output: record.output }, null, 2))
  if (error && process.env.PAGINATION_STRICT === '1') process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
