/**
 * V2 premium PDF renderer — shared by browser exports and Node deliverables.
 *
 * PDFKit embeds Inter, Manrope and STIX Two fonts; all placement goes through
 * ReportContext. The returned audit manifest is used by the independent
 * geometric verifier. Data-generation remains in model.js; this module only
 * orchestrates presentation.
 */

import PDFDocument from 'pdfkit'

import { ensurePdfKitStandardFonts } from './pdfkit-standard-fonts.js'
import { A4, FONTS, FONT_FILES, normalizeForMatch } from './theme.js'
import { ReportContext } from './layout.js'
import { FinalBranding } from './components.js'
import { renderFullAnalysis } from './full-analysis.js'
import { renderIntelligenceReport } from './intelligence.js'

function registerFonts(doc, assets) {
  const fonts = assets?.fonts || {}
  Object.entries(FONT_FILES).forEach(([name, file]) => {
    const bytes = fonts[name] || fonts[file]
    if (!bytes) throw new Error(`Premium PDF font missing: ${name} (${file})`)
    doc.registerFont(name, bytes)
  })
  doc.font(FONTS.body).fontSize(10)
}

function concat(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function collectBytes(doc) {
  return new Promise((resolve, reject) => {
    const chunks = []
    doc.on('data', (chunk) => {
      if (chunk instanceof Uint8Array) chunks.push(chunk)
      else if (ArrayBuffer.isView(chunk)) chunks.push(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength))
      else if (chunk instanceof ArrayBuffer) chunks.push(new Uint8Array(chunk))
      else chunks.push(new Uint8Array(chunk))
    })
    doc.on('end', () => resolve(concat(chunks)))
    doc.on('error', reject)
  })
}

export async function renderPremiumPdf({ kind = 'full', model, assets } = {}) {
  if (!model) throw new Error('A report model is required')
  // The Vite browser build of PDFKit does not preload Base 14 font metrics.
  // PDFDocument resolves Helvetica in its constructor, before our embedded
  // fonts are registered, so this must happen first.
  await ensurePdfKitStandardFonts()
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    autoFirstPage: false,
    bufferPages: true,
    compress: true,
    info: {
      Title: model.reportTitle,
      Author: 'MediXO EduX',
      Subject: `${model.examName} · ${model.reportTitle}`,
      Keywords: `MediXO EduX, academic intelligence, ${model.examName}`,
      Creator: 'MediXO EduX Premium Academic Editorial Engine V2',
      Producer: 'MediXO EduX / PDFKit',
    },
  })
  registerFonts(doc, assets)
  const done = collectBytes(doc)
  const ctx = new ReportContext({ doc, assets, model, kind })

  ctx.startPage({ cover: kind === 'full' })
  if (kind === 'intelligence') renderIntelligenceReport(ctx)
  else renderFullAnalysis(ctx)

  FinalBranding(ctx)
  const finalization = ctx.finalize()
  const questions = Array.isArray(model.questions) ? model.questions : []
  const figureAssets = questions.reduce((sum, question) => (
    sum
    + (question.media?.statement?.length || 0)
    + Object.values(question.media?.options || {}).reduce((count, list) => count + list.length, 0)
    + (question.media?.explanation?.length || 0)
  ), 0)
  const figureFailures = questions.reduce((sum, question) => sum + (question.media?.failures?.length || 0), 0)
  const figureReferences = questions.reduce((sum, question) => sum + (question.figureCount || 0), 0)
  const figuresEmbedded = finalization.audit.boxes.filter((box) => box.kind === 'image' && box.figureField).length
  const rendered = new Set(ctx.renderedQuestions)
  // The intelligence briefing is deliberately question-free; completeness is
  // enforced only for the full analysis, where every row must appear.
  const questionsMissing = kind === 'full'
    ? questions.filter((question) => !rendered.has(question.index))
    : []
  const missingValues = questionsMissing.map((question) => `${question.q} was not rendered`)
  doc.end()
  const bytes = await done

  return {
    bytes,
    pageCount: finalization.pageCount,
    layoutAudit: finalization.audit,
    auditSummary: finalization.summary,
    flags: ctx.flags,
    sourceValueCount: (model.sourceValues || []).length,
    missingValues,
    contentCoverage: {
      questionsSupplied: questions.length,
      questionsRendered: rendered.size,
      explanationsRendered: kind === 'full'
        ? questions.filter((question) => question.explanation || question.explanationParts?.length).length
        : 0,
      figureReferences,
      figuresResolved: figureAssets,
      figuresEmbedded,
      figuresFailed: figureFailures,
    },
    figureFailures: questions.flatMap((question) => question.media?.failures || []),
    emittedCharacters: ctx.emittedText.length,
    pageSize: [A4.width, A4.height],
  }
}

export { normalizeForMatch }
