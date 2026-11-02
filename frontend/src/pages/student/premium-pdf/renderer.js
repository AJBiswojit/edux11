/**
 * V2 premium PDF renderer — shared by browser exports and Node deliverables.
 *
 * PDFKit embeds Inter, Manrope and STIX Two fonts; all placement goes through
 * ReportContext. The returned audit manifest is used by the independent
 * geometric verifier. Data-generation remains in model.js; this module only
 * orchestrates presentation.
 */

import PDFDocument from 'pdfkit'

import { A4, FONTS, FONT_FILES, COLORS, normalizeForMatch } from './theme.js'
import { ReportContext } from './layout.js'
import { SectionHeading, SourceRegister, FinalBranding } from './components.js'
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
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    autoFirstPage: false,
    bufferPages: true,
    compress: true,
    info: {
      Title: model.reportTitle,
      Author: 'MediXO EduX',
      Subject: `${model.examName} · ${model.reportId}`,
      Keywords: `MediXO EduX, academic intelligence, ${model.examId}, ${model.sourceHash}`,
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

  if (kind === 'full') {
    ctx.sectionBreak(0.62)
    SectionHeading(ctx, {
      number: '08', kicker: 'DATA INTEGRITY', title: 'Source data register',
      note: '',
      accent: COLORS.indigo,
    })
    SourceRegister(ctx, { rows: model.sourceValues || [] })
    let missing = ctx.missingSourceValues()
    if (missing.length) {
      ctx.sectionBreak(0.62)
      SectionHeading(ctx, {
        number: '08A', kicker: 'DATA INTEGRITY', title: 'Source value addendum',
        note: '',
        accent: COLORS.indigo,
      })
      SourceRegister(ctx, { rows: missing })
    }
  }

  FinalBranding(ctx)
  const finalization = ctx.finalize()
  const remaining = ctx.missingSourceValues().map((row) => row.value)
  doc.end()
  const bytes = await done

  return {
    bytes,
    pageCount: finalization.pageCount,
    layoutAudit: finalization.audit,
    auditSummary: finalization.summary,
    flags: ctx.flags,
    sourceValueCount: (model.sourceValues || []).length,
    missingValues: remaining,
    emittedCharacters: ctx.emittedText.length,
    pageSize: [A4.width, A4.height],
  }
}

export { normalizeForMatch }
