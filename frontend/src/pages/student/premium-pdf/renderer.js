/**
 * Premium PDF renderer — shared by the browser export workflow and the Node
 * deliverable/QA scripts. The library is PDFKit: it embeds the licensed Inter,
 * Manrope and STIX Two Math/Text fonts, supports vector SVG equations and
 * paged buffers for consistent headers, footers and page numbering.
 */

import PDFDocument from 'pdfkit'

import { A4, COLORS, FONTS, FONT_FILES, normalizeForMatch } from './theme.js'
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
  doc.font(FONTS.body).fontSize(9)
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

/**
 * Render a report. Returns PDF bytes plus QA metadata.
 * assets = { logo: Uint8Array, fonts: { Inter: Uint8Array, ... } }
 */
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
      Keywords: `MediXO EduX, exam analysis, ${model.examId}, ${model.sourceHash}`,
      Creator: 'MediXO EduX Premium Report Engine',
      Producer: 'MediXO EduX / PDFKit',
    },
  })
  registerFonts(doc, assets)
  const done = collectBytes(doc)
  const ctx = new ReportContext({ doc, theme: COLORS, assets, model, kind })

  ctx.startPage({ cover: true })
  if (kind === 'intelligence') renderIntelligenceReport(ctx)
  else renderFullAnalysis(ctx)

  if (kind === 'full') {
    let missing = ctx.missingSourceValues()
    if (missing.length) {
      ctx.startFreshPage()
      SectionHeading(ctx, {
        number: '07', kicker: 'DATA INTEGRITY', title: 'Source data register',
        note: `${missing.length} unique source values are listed below with their payload paths. This register guarantees that no field was lost in the redesign.`,
        accent: COLORS.info,
      })
      SourceRegister(ctx, { rows: missing })
      missing = ctx.missingSourceValues()
    }
    // Defensive second pass for values whose normalisation did not match the
    // first emission (for example short numeric tokens).
    if (missing.length) {
      ctx.startFreshPage()
      SectionHeading(ctx, {
        number: '07A', kicker: 'DATA INTEGRITY', title: 'Source value addendum',
        note: 'Additional source values shown verbatim for verification.', accent: COLORS.info, compact: true,
      })
      SourceRegister(ctx, { rows: missing })
    }
  }

  FinalBranding(ctx)
  const pageCount = ctx.finalize()
  doc.end()
  const bytes = await done
  const remaining = ctx.missingSourceValues().map((row) => row.value)
  return {
    bytes,
    pageCount,
    flags: ctx.flags,
    sourceValueCount: (model.sourceValues || []).length,
    missingValues: remaining,
    emittedCharacters: ctx.emittedText.length,
    pageSize: [A4.width, A4.height],
  }
}

export { normalizeForMatch }
