/**
 * Reusable publication components.
 *
 * Every component is a pure drawing function over a ReportContext. None of
 * them reads the API directly; all values arrive through the model. Text is
 * always drawn through ctx.drawText so values are measured, wrapped, embedded
 * with the correct font and recorded for the preservation register.
 */

import {
  A4, CONTENT, COLORS, FONTS, TYPE, PAGE,
  fmt, pct, statusColor, statusSoft, masteryColor, priorityColor,
  difficultyColor, subjectColor, twoColumns, threeColumns,
} from './theme.js'
import { SolutionRenderer } from './math.js'

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */

export function drawGrid(ctx) {
  const doc = ctx.doc
  doc.save()
  doc.opacity(0.62).lineWidth(0.3).strokeColor(COLORS.grid)
  for (let i = 0; i <= 12; i += 1) {
    const x = CONTENT.x + (CONTENT.w / 12) * i
    doc.moveTo(x, CONTENT.y - 8).lineTo(x, CONTENT.bottom + 8).stroke()
  }
  doc.restore()
}

function drawLogo(ctx, x, y, width) {
  if (!ctx.assets?.logo) return false
  try {
    ctx.doc.image(ctx.assets.logo, x, y, { width })
    return true
  } catch {
    return false
  }
}

export function ReportHeader(ctx, { cover = false } = {}) {
  const doc = ctx.doc
  const y = cover ? 22 : 20
  const logoW = cover ? 27 : 16
  const logoX = cover ? CONTENT.x : CONTENT.x
  const hasLogo = drawLogo(ctx, logoX, y, logoW)
  const brandX = logoX + (hasLogo ? logoW + 8 : 0)
  const brandSize = cover ? 10 : 8.2
  ctx.drawText('MediXO EduX', brandX, y + (cover ? 5 : 2), 150, {
    size: brandSize,
    font: FONTS.heading,
    color: COLORS.midnight,
    characterSpacing: 0.2,
    chrome: true,
    emit: false,
  })
  if (cover) {
    ctx.drawText('EXAMINATION INTELLIGENCE  /  PUBLICATION', CONTENT.x + CONTENT.w - 260, y + 6, 260, {
      size: 7.2,
      font: FONTS.bodySemi,
      color: COLORS.slate,
      align: 'right',
      characterSpacing: 0.9,
      chrome: true,
      emit: false,
    })
    doc.lineWidth(1).strokeColor(COLORS.indigo).moveTo(CONTENT.x, y + logoW + 9).lineTo(CONTENT.x + 64, y + logoW + 9).stroke()
    doc.lineWidth(0.5).strokeColor(COLORS.border).moveTo(CONTENT.x + 64, y + logoW + 9).lineTo(CONTENT.x + CONTENT.w, y + logoW + 9).stroke()
  } else {
    ctx.drawText(ctx.model.reportId, CONTENT.x + 122, y + 2, 210, {
      size: 7.2,
      font: FONTS.bodySemi,
      color: COLORS.slate,
      characterSpacing: 0.8,
      chrome: true,
      emit: false,
    })
    ctx.drawText(ctx.model.examTitleShort, CONTENT.x + CONTENT.w - 225, y + 2, 225, {
      size: 7.2,
      font: FONTS.body,
      color: COLORS.slate,
      align: 'right',
      chrome: true,
      emit: false,
    })
    doc.lineWidth(0.55).strokeColor(COLORS.border)
      .moveTo(CONTENT.x, y + logoW + 7).lineTo(CONTENT.x + CONTENT.w, y + logoW + 7).stroke()
    doc.lineWidth(1.6).strokeColor(COLORS.indigo)
      .moveTo(CONTENT.x, y + logoW + 7).lineTo(CONTENT.x + 52, y + logoW + 7).stroke()
  }
}

export function ReportFooter(ctx, { pageNumber } = {}) {
  const doc = ctx.doc
  const y = A4.height - 38
  doc.lineWidth(0.5).strokeColor(COLORS.border)
    .moveTo(CONTENT.x, y - 7).lineTo(CONTENT.x + CONTENT.w, y - 7).stroke()
  ctx.drawText('MediXO EduX', CONTENT.x, y, 150, {
    size: 7.2, font: FONTS.bodySemi, color: COLORS.slate, chrome: true, emit: false,
  })
  ctx.drawText(ctx.model.reportId, CONTENT.x + 150, y, CONTENT.w - 300, {
    size: 7.2, font: FONTS.body, color: COLORS.slate, align: 'center', chrome: true, emit: false,
  })
  ctx.drawText('PAGE', CONTENT.x + CONTENT.w - 92, y, 34, {
    size: 7.2, font: FONTS.bodySemi, color: COLORS.slate, align: 'right', characterSpacing: 0.6, chrome: true, emit: false,
  })
  ctx.drawText(String(pageNumber).padStart(2, '0'), CONTENT.x + CONTENT.w - 56, y, 20, {
    size: 7.2, font: FONTS.bodyBold, color: COLORS.midnight, align: 'right', chrome: true, emit: false,
  })
}

export function drawPageTotal(ctx, total) {
  ctx.drawText(`/ ${String(total).padStart(2, '0')}`, CONTENT.x + CONTENT.w - 32, A4.height - 38, 32, {
    size: 7.2, font: FONTS.bodyBold, color: COLORS.midnight, chrome: true, emit: false,
  })
}

export function FinalBranding(ctx, { reserve = true, y: explicitY } = {}) {
  const y = reserve ? ctx.reserve(58).y : explicitY ?? ctx.y
  const doc = ctx.doc
  doc.lineWidth(0.5).strokeColor(COLORS.border)
    .moveTo(CONTENT.x, y + 4).lineTo(CONTENT.x + CONTENT.w, y + 4).stroke()
  const logoW = 22
  const cx = CONTENT.x + CONTENT.w / 2
  drawLogo(ctx, cx - logoW / 2, y + 15, logoW)
  ctx.drawText('MediXO EduX  ·  Examination Intelligence', cx - 180, y + 16, 180, {
    size: 8.4, font: FONTS.heading, color: COLORS.midnight, align: 'right',
  })
  ctx.drawText(`End of report  ·  ${ctx.model.reportId}`, cx + 20, y + 17, 180, {
    size: 7.6, font: FONTS.body, color: COLORS.slate,
  })
  ctx.drawText('Academic data reproduced without inference. Missing values are shown as —.', CONTENT.x, y + 41, CONTENT.w, {
    size: 7.2, font: FONTS.body, color: COLORS.slate, align: 'center',
  })
  return 58
}

/* ------------------------------------------------------------------ *
 * Primitive components
 * ------------------------------------------------------------------ */

export function rule(ctx, x, y, w, color = COLORS.border, width = 0.5) {
  ctx.doc.lineWidth(width).strokeColor(color).moveTo(x, y).lineTo(x + w, y).stroke()
}

export function Pill(ctx, { x, y, text, color = COLORS.indigo, soft = COLORS.indigoSoft, width, size = 7.4 } = {}) {
  const label = fmt(text, '—')
  const labelW = width || ctx.textEngine.measureRun(label, FONTS.bodyBold, size, {}) + 14
  const h = size + 7
  ctx.doc.roundedRect(x, y, labelW, h, h / 2).fill(soft)
  ctx.drawText(label, x + 7, y + 2.5, labelW - 14, {
    size, font: FONTS.bodyBold, color, align: 'center',
  })
  return { w: labelW, h }
}

export function ProgressBar(ctx, { x, y, w, value, max = 100, color = COLORS.indigo, track = COLORS.border, height = 4 } = {}) {
  const v = Math.max(0, Number(value) || 0)
  const m = Math.max(1, Number(max) || 100)
  ctx.doc.roundedRect(x, y, w, height, height / 2).fill(track)
  const fillW = Math.min(w, (v / m) * w)
  if (fillW > 0.6) ctx.doc.roundedRect(x, y, fillW, height, height / 2).fill(color)
  return height
}

export function MetricCard(ctx, { x, y, w, h = 56, label, value, sub = '', tone = COLORS.indigo, soft = COLORS.white, size = TYPE.metric } = {}) {
  const doc = ctx.doc
  doc.roundedRect(x, y, w, h, 4).fill(soft).stroke(COLORS.border)
  doc.rect(x + 8, y, Math.max(18, w * 0.22), 2).fill(tone)
  ctx.drawText(String(label).toUpperCase(), x + 8, y + 7, w - 16, {
    size: TYPE.label, font: FONTS.bodySemi, color: COLORS.slate, characterSpacing: 0.7,
  })
  ctx.drawText(fmt(value), x + 8, y + 18, w - 16, {
    size, font: FONTS.heading, color: tone, features: ['tnum'], lineHeight: size,
  })
  if (sub) {
    ctx.drawText(fmt(sub), x + 8, y + h - 10, w - 16, {
      size: 7.2, font: FONTS.body, color: COLORS.slate, lineHeight: 9,
    })
  }
  return h
}

export function SectionHeading(ctx, { number, title, kicker = '', note = '', accent = COLORS.indigo, compact = false } = {}) {
  const noteH = note ? ctx.measureText(note, CONTENT.w, { size: 8.2, font: FONTS.body, color: COLORS.slate }) + 4 : 0
  const headingH = compact ? 31 : 40
  const totalH = headingH + noteH + 8
  ctx.ensureBlock(totalH + 52)
  const { y } = ctx.reserve(totalH)
  if (number) {
    ctx.drawText(number, CONTENT.x, y, 34, {
      size: 7.6, font: FONTS.bodyBold, color: accent, characterSpacing: 1.1,
    })
  }
  const titleX = CONTENT.x + (number ? 38 : 0)
  if (kicker) {
    ctx.drawText(kicker, titleX, y, CONTENT.w - 38, {
      size: 7.2, font: FONTS.bodySemi, color: COLORS.slate, characterSpacing: 1.2,
    })
  }
  ctx.drawText(title, titleX, y + (kicker ? 12 : 2), CONTENT.w - 38, {
    size: compact ? TYPE.subsection + 1 : TYPE.section,
    font: FONTS.heading,
    color: COLORS.midnight,
    lineHeight: (compact ? TYPE.subsection + 1 : TYPE.section) * 1.25,
  })
  let lineY = y + headingH - 6
  rule(ctx, CONTENT.x, lineY, CONTENT.w, COLORS.border, 0.5)
  ctx.doc.rect(CONTENT.x, lineY - 1, 46, 2).fill(accent)
  if (note) {
    ctx.drawText(note, CONTENT.x, lineY + 7, CONTENT.w, {
      size: 8.2, font: FONTS.body, color: COLORS.slate,
    })
  }
  return totalH
}

export function SubsectionHeading(ctx, { x = CONTENT.x, y, w = CONTENT.w, title, note = '', accent = COLORS.indigo } = {}) {
  const noteH = note ? ctx.measureText(note, w - 14, { size: 7.6, font: FONTS.body, color: COLORS.slate }) + 2 : 0
  const h = 22 + noteH
  ctx.doc.rect(x, y + 3, 3, 11).fill(accent)
  ctx.drawText(title, x + 11, y, w - 11, {
    size: 9.4, font: FONTS.heading, color: COLORS.midnight,
  })
  if (note) {
    ctx.drawText(note, x + 11, y + 13, w - 11, {
      size: 7.6, font: FONTS.body, color: COLORS.slate,
    })
  }
  rule(ctx, x, y + h - 3, w, COLORS.border, 0.4)
  return h
}

export function KeyValueGrid(ctx, { x = CONTENT.x, y, w = CONTENT.w, items = [], columns = 4, gap = 8, cardH = 38, valueSize = 9.2, valueLineHeight = 10.5 } = {}) {
  const colW = (w - gap * (columns - 1)) / columns
  let maxH = 0
  items.forEach((item, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    const cx = x + col * (colW + gap)
    const cy = y + row * (cardH + 6)
    ctx.doc.roundedRect(cx, cy, colW, cardH, 3).fill(COLORS.ivory).stroke(COLORS.border)
    ctx.drawText(String(item.label).toUpperCase(), cx + 7, cy + 6, colW - 14, {
      size: 6.9, font: FONTS.bodySemi, color: COLORS.slate, characterSpacing: 0.5,
    })
    ctx.drawText(fmt(item.value), cx + 7, cy + 15, colW - 14, {
      size: valueSize, font: FONTS.bodyBold, color: item.color || COLORS.midnight,
      features: ['tnum'], lineHeight: valueLineHeight,
    })
  })
  maxH = Math.ceil(items.length / columns) * (cardH + 6)
  return maxH
}

/* ------------------------------------------------------------------ *
 * Charts
 * ------------------------------------------------------------------ */

function drawDonut(ctx, { cx, cy, r, slices, centerValue, centerLabel }) {
  const doc = ctx.doc
  const total = slices.reduce((sum, s) => sum + (Number(s.value) || 0), 0) || 1
  doc.save()
  doc.lineWidth(11).strokeColor(COLORS.border).lineCap('butt')
    .arc(cx, cy, r, -Math.PI / 2, Math.PI * 1.5).stroke()
  let angle = -Math.PI / 2
  doc.lineCap('butt')
  slices.forEach((slice) => {
    const sweep = ((Number(slice.value) || 0) / total) * Math.PI * 2
    if (sweep > 0.001) {
      doc.lineWidth(11).strokeColor(slice.color || COLORS.indigo)
        .arc(cx, cy, r, angle, angle + sweep).stroke()
    }
    angle += sweep
  })
  doc.restore()
  if (centerValue) {
    ctx.drawText(centerValue, cx - 36, cy - 10, 72, {
      size: 16, font: FONTS.heading, color: COLORS.midnight, align: 'center', features: ['tnum'],
    })
  }
  if (centerLabel) {
    ctx.drawText(centerLabel, cx - 40, cy + 10, 80, {
      size: 6.8, font: FONTS.bodySemi, color: COLORS.slate, align: 'center', characterSpacing: 0.5,
    })
  }
}

export function PerformanceChart(ctx, {
  x, y, w, h = 130, title, subtitle = '', type = 'hbar',
  bars = [], slices = [], legend = '', centerValue = '', centerLabel = '', accent = COLORS.indigo,
} = {}) {
  const doc = ctx.doc
  doc.roundedRect(x, y, w, h, 4).fill(COLORS.white).stroke(COLORS.border)
  doc.rect(x, y, 2.5, h).fill(accent)
  ctx.drawText(title, x + 11, y + 9, w - 22, {
    size: 9.2, font: FONTS.heading, color: COLORS.midnight,
  })
  if (subtitle) {
    ctx.drawText(subtitle, x + 11, y + 22, w - 22, {
      size: 7.4, font: FONTS.body, color: COLORS.slate,
    })
  }
  const top = y + (subtitle ? 38 : 28)
  const innerW = w - 22
  const innerX = x + 11

  if (type === 'hbar') {
    const count = Math.max(1, bars.length)
    const rowH = Math.min(19, Math.max(12, (h - (top - y) - 14) / count))
    bars.forEach((bar, index) => {
      const by = top + index * rowH
      const labelW = Math.min(112, innerW * 0.42)
      const valueW = 52
      const trackX = innerX + labelW + 5
      const trackW = Math.max(20, innerW - labelW - valueW - 10)
      ctx.drawText(fmt(bar.label), innerX, by, labelW, {
        size: 7.4, font: FONTS.bodySemi, color: COLORS.deepInk, lineHeight: rowH,
      })
      ProgressBar(ctx, { x: trackX, y: by + (rowH - 4) / 2, w: trackW, value: bar.value, max: bar.max || Math.max(...bars.map((b) => b.value), 1), color: bar.color || accent, height: 4 })
      ctx.drawText(fmt(bar.valueLabel ?? bar.value), trackX + trackW + 4, by, valueW, {
        size: 7.4, font: FONTS.bodyBold, color: bar.color || accent, align: 'right', features: ['tnum'], lineHeight: rowH,
      })
    })
  } else if (type === 'donut') {
    const chartW = Math.min(innerW * 0.48, h - (top - y) - 12)
    const r = Math.max(20, Math.min(chartW / 2 - 8, 42))
    const cx = innerX + r + 10
    const cy = top + (h - (top - y)) / 2 - 4
    drawDonut(ctx, { cx, cy, r, slices, centerValue, centerLabel })
    const legendX = innerX + chartW + 22
    const legendW = Math.max(40, innerW - chartW - 22)
    const rowH = 13
    slices.slice(0, 8).forEach((slice, index) => {
      const ly = top + index * rowH
      doc.rect(legendX, ly + 2, 6, 6).fill(slice.color || COLORS.indigo)
      ctx.drawText(`${fmt(slice.label)}  ${fmt(slice.value)}`, legendX + 10, ly, legendW - 10, {
        size: 7.2, font: FONTS.body, color: COLORS.deepInk, lineHeight: rowH,
      })
    })
  } else if (type === 'stacked') {
    const total = bars.reduce((sum, bar) => sum + (Number(bar.value) || 0), 0) || 1
    let cursor = innerX
    const barY = top + 12
    const barH = 14
    bars.forEach((bar) => {
      const segW = ((Number(bar.value) || 0) / total) * innerW
      if (segW > 0.5) doc.rect(cursor, barY, segW, barH).fill(bar.color || accent)
      cursor += segW
    })
    const legendY = barY + 24
    let lx = innerX
    bars.forEach((bar) => {
      const text = `${fmt(bar.label)} ${fmt(bar.value)}`
      const tw = ctx.textEngine.measureRun(text, FONTS.body, 7.2, {}) + 16
      if (lx + tw > innerX + innerW) {
        lx = innerX
      }
      doc.rect(lx, legendY + 2, 6, 6).fill(bar.color || accent)
      ctx.drawText(text, lx + 10, legendY, tw - 10, { size: 7.2, font: FONTS.body, color: COLORS.deepInk, lineHeight: 12 })
      lx += tw + 6
    })
  }
  if (legend) {
    ctx.drawText(legend, innerX, y + h - 12, innerW, {
      size: 6.9, font: FONTS.body, color: COLORS.slate,
    })
  }
  return h
}

/* ------------------------------------------------------------------ *
 * Tables
 * ------------------------------------------------------------------ */

function columnColor(col, value, row, fallback = COLORS.deepInk) {
  if (typeof col.color === 'function') return col.color(value, row)
  return col.color || fallback
}

function columnSoft(col, value, row, fallback = COLORS.indigoSoft) {
  if (typeof col.soft === 'function') return col.soft(value, row)
  return col.soft || fallback
}

function resolveWidths(columns, w) {
  const widths = columns.map((col) => (col.width || 1))
  const sum = widths.reduce((a, b) => a + b, 0) || 1
  return widths.map((n) => (n / sum) * w)
}

export function SimpleTable(ctx, {
  x = CONTENT.x, y = ctx.y, w = CONTENT.w, columns = [], rows = [], header = true,
  fontSize = 7.8, rowPadding = 5, zebra = true, title = '',
} = {}) {
  if (!rows.length) return 0
  const widths = resolveWidths(columns, w)
  const headerH = header ? 18 : 0
  const cellTextOpts = (col, row, value) => ({
    size: col.size || fontSize,
    font: col.font || FONTS.body,
    color: columnColor(col, value, row),
    align: col.align || 'left',
    lineHeight: (col.size || fontSize) * 1.35,
    features: col.features || undefined,
  })
  const measureCell = (col, row, value, cw) => {
    if (col.render === 'bar') return 11
    if (col.render === 'pill') return 15
    return ctx.measureText(fmt(value), cw - 8, cellTextOpts(col, row, value))
  }
  const rowHeights = rows.map((row) => Math.max(
    15,
    ...columns.map((col, i) => measureCell(col, row, row[col.key], widths[i]) + rowPadding * 2),
  ))
  const titleH = title ? ctx.measureText(title, w, { size: 8.4, font: FONTS.bodySemi, color: COLORS.slate }) + 5 : 0
  ctx.ensureBlock(titleH + headerH + (rowHeights[0] || 0) + 10)
  let total = 0
  if (title) {
    const reserved = ctx.reserve(titleH)
    ctx.drawText(title, x, reserved.y, w, { size: 8.4, font: FONTS.bodySemi, color: COLORS.slate })
    total += titleH
  }
  const paintHeader = (hy) => {
    if (!header) return
    ctx.doc.roundedRect(x, hy, w, headerH, 2).fill(COLORS.midnight)
    let hx = x
    columns.forEach((col, i) => {
      ctx.drawText(String(col.label).toUpperCase(), hx + 4, hy + 4, widths[i] - 8, {
        size: 6.9, font: FONTS.bodySemi, color: COLORS.white, align: col.align || 'left', characterSpacing: 0.5,
      })
      hx += widths[i]
    })
  }
  if (header) {
    const reserved = ctx.reserve(headerH)
    paintHeader(reserved.y)
    total += headerH
  }
  const paintRow = (row, ry, rowH, index) => {
    const bg = zebra && index % 2 === 1 ? COLORS.ivory : COLORS.white
    ctx.doc.rect(x, ry, w, rowH).fill(bg)
    ctx.doc.lineWidth(0.35).strokeColor(COLORS.border).rect(x, ry, w, rowH).stroke()
    let cx = x
    columns.forEach((col, i) => {
      const cw = widths[i]
      const value = row[col.key]
      if (col.render === 'bar') {
        ctx.drawText(fmt(value), cx + 4, ry + 2, cw - 8, {
          size: 7, font: FONTS.bodyBold, color: columnColor(col, value, row, COLORS.midnight), align: 'right', features: ['tnum'],
        })
        ProgressBar(ctx, { x: cx + 4, y: ry + 12, w: cw - 8, value: Number(String(value).replace('%', '')) || 0, max: 100, color: columnColor(col, value, row, COLORS.indigo), height: 3 })
      } else if (col.render === 'pill') {
        const color = columnColor(col, value, row, COLORS.indigo)
        const soft = columnSoft(col, value, row)
        Pill(ctx, { x: cx + 4, y: ry + 3, text: value, color, soft, size: 6.8 })
      } else {
        ctx.drawText(fmt(value), cx + 4, ry + rowPadding, cw - 8, cellTextOpts(col, row, value))
      }
      cx += cw
    })
  }
  for (let r = 0; r < rows.length; r += 1) {
    const rowH = rowHeights[r]
    const reserved = ctx.reserve(rowH, {
      newPageExtra: headerH,
      onNewPage: (hy) => paintHeader(hy),
    })
    paintRow(rows[r], reserved.y, rowH, r)
    total += rowH + reserved.extra
  }
  return total
}

/**
 * A table drawn at a fixed coordinate without changing ctx.y.
 * Used by the two-page intelligence edition where the complete page is laid
 * out on an editorial grid instead of flowing through the pagination engine.
 */
export function StaticTable(ctx, {
  x = CONTENT.x, y, w = CONTENT.w, columns = [], rows = [], header = true,
  fontSize = 7.6, rowPadding = 4, zebra = true, title = '', accent = COLORS.indigo,
} = {}) {
  if (!rows.length) return 0
  const widths = resolveWidths(columns, w)
  const headerH = header ? 16 : 0
  const optsFor = (col, row, value) => ({
    size: col.size || fontSize,
    font: col.font || FONTS.body,
    color: columnColor(col, value, row),
    align: col.align || 'left',
    lineHeight: (col.size || fontSize) * 1.3,
    features: col.features || undefined,
  })
  const measureCell = (col, row, value, cw) => {
    if (col.render === 'bar') return 11
    if (col.render === 'pill') return 14
    return ctx.measureText(fmt(value), cw - 8, optsFor(col, row, value))
  }
  const rowHeights = rows.map((row) => Math.max(
    14,
    ...columns.map((col, i) => measureCell(col, row, row[col.key], widths[i]) + rowPadding * 2),
  ))
  let cursor = y
  if (title) {
    const titleH = ctx.measureText(title, w, { size: 8.2, font: FONTS.bodySemi, color: COLORS.slate })
    ctx.drawText(title, x, cursor, w, { size: 8.2, font: FONTS.bodySemi, color: COLORS.slate })
    cursor += titleH + 4
  }
  const paintHeader = (hy) => {
    if (!header) return
    ctx.doc.rect(x, hy, w, headerH).fill(COLORS.midnight)
    ctx.doc.rect(x, hy, 2, headerH).fill(accent)
    let hx = x
    columns.forEach((col, i) => {
      ctx.drawText(String(col.label).toUpperCase(), hx + 4, hy + 3, widths[i] - 8, {
        size: 6.5, font: FONTS.bodySemi, color: COLORS.white, align: col.align || 'left', characterSpacing: 0.4,
      })
      hx += widths[i]
    })
  }
  paintHeader(cursor)
  cursor += headerH
  rows.forEach((row, index) => {
    const rowH = rowHeights[index]
    ctx.doc.rect(x, cursor, w, rowH).fill(zebra && index % 2 === 1 ? COLORS.ivory : COLORS.white)
    ctx.doc.lineWidth(0.3).strokeColor(COLORS.border).rect(x, cursor, w, rowH).stroke()
    let cx = x
    columns.forEach((col, i) => {
      const cw = widths[i]
      const value = row[col.key]
      if (col.render === 'bar') {
        ctx.drawText(fmt(value), cx + 4, cursor + 2, cw - 8, {
          size: 6.8, font: FONTS.bodyBold, color: columnColor(col, value, row, COLORS.midnight), align: 'right', features: ['tnum'],
        })
        ProgressBar(ctx, { x: cx + 4, y: cursor + 11, w: cw - 8, value: Number(String(value).replace('%', '')) || 0, max: 100, color: columnColor(col, value, row, COLORS.indigo), height: 3 })
      } else if (col.render === 'pill') {
        Pill(ctx, {
          x: cx + 4, y: cursor + 2, text: value, size: 6.5,
          color: columnColor(col, value, row, COLORS.indigo),
          soft: columnSoft(col, value, row),
        })
      } else {
        ctx.drawText(fmt(value), cx + 4, cursor + rowPadding, cw - 8, optsFor(col, row, value))
      }
      cx += cw
    })
    cursor += rowH
  })
  return cursor - y
}

export function SubjectPerformance(ctx, { x = CONTENT.x, y, w = CONTENT.w, subjects = [] } = {}) {
  if (!subjects.length) return 0
  const rows = subjects.map((s, i) => ({
    subject: fmt(s.name),
    score: `${fmt(s.score)} / ${fmt(s.maxMarks)}`,
    accuracy: pct(s.accuracy),
    time: fmt(s.time),
    rank: fmt(s.rank),
    difficulty: fmt(s.difficulty),
    attempted: fmt(s.attempted),
    correct: fmt(s.correct),
    weak: (s.weakAreas || []).join(' · ') || '—',
    strong: (s.strongAreas || []).join(' · ') || '—',
    color: subjectColor(s.name, i),
  }))
  return SimpleTable(ctx, {
    x, y, w, rows,
    title: 'Subject performance — marks, accuracy, pace and evidence areas',
    columns: [
      { key: 'subject', label: 'Subject', width: 1.25, font: FONTS.bodyBold },
      { key: 'score', label: 'Marks', width: 0.95, align: 'right', features: ['tnum'] },
      { key: 'accuracy', label: 'Accuracy', width: 0.85, render: 'bar', color: (v) => masteryColor(v) },
      { key: 'time', label: 'Time', width: 0.75, align: 'right' },
      { key: 'attempted', label: 'Att.', width: 0.6, align: 'right' },
      { key: 'correct', label: 'Corr.', width: 0.6, align: 'right' },
      { key: 'rank', label: 'Rank', width: 0.6, align: 'right' },
      { key: 'difficulty', label: 'Level', width: 0.8, render: 'pill', color: (v) => difficultyColor(v), soft: () => COLORS.ivory },
      { key: 'weak', label: 'Weak areas', width: 1.7 },
      { key: 'strong', label: 'Strong areas', width: 1.7 },
    ],
    fontSize: 7.4,
  })
}

export function ChapterMastery(ctx, { x = CONTENT.x, y, w = CONTENT.w, chapters = [], compact = false } = {}) {
  if (!chapters.length) return 0
  const rows = chapters.map((c) => ({
    chapter: fmt(c.chapter || c.name),
    subject: fmt(c.subject),
    accuracy: fmt(c.accuracy),
    marks: fmt(c.marks),
    time: fmt(c.time),
    attempted: fmt(c.attempted, '—'),
    mastery: fmt(c.mastery),
  }))
  return SimpleTable(ctx, {
    x, y, w, rows,
    title: compact ? 'Chapter mastery' : 'Chapter mastery — accuracy, marks and time',
    columns: [
      { key: 'chapter', label: 'Chapter', width: 2.3, font: FONTS.bodySemi },
      { key: 'subject', label: 'Subject', width: 1.25 },
      { key: 'accuracy', label: 'Accuracy', width: 1.05, render: 'bar', color: (v) => masteryColor(v) },
      { key: 'marks', label: 'Marks', width: 0.75, align: 'right', features: ['tnum'] },
      { key: 'time', label: 'Time', width: 0.85, align: 'right' },
      { key: 'attempted', label: 'Att. %', width: 0.8, align: 'right' },
      { key: 'mastery', label: 'Mastery', width: 1.0, render: 'pill', color: (v) => masteryColor(v), soft: (v) => (v === 'Strong' ? COLORS.successSoft : v === 'Critical' ? COLORS.errorSoft : v === 'Weak' ? COLORS.warningSoft : COLORS.infoSoft) },
    ],
    fontSize: 7.3,
  })
}

export function ChapterTime(ctx, { x = CONTENT.x, y = ctx.y, w = CONTENT.w, chapters = [] } = {}) {
  if (!chapters.length) return 0
  const max = Math.max(...chapters.map((c) => Number(c.timeMinutes) || 0), 1)
  const bars = chapters.map((c) => ({
    label: `${fmt(c.chapter)}  ·  ${fmt(c.subject)}`,
    value: Number(c.timeMinutes) || 0,
    max,
    valueLabel: `${fmt(c.time)}  (${fmt(c.share)})`,
    color: subjectColor(c.subject),
  }))
  const h = Math.min(220, 46 + bars.length * 11)
  const reserved = ctx.reserve(h)
  return PerformanceChart(ctx, {
    x, y: reserved.y, w, h, type: 'hbar', title: 'Chapter time consumption',
    subtitle: 'Recorded time and share of total chapter time',
    bars,
    legend: ctx.model.hasChapterTime ? 'Values are reproduced from the attempt payload.' : 'Chapter timing was not recorded for this attempt.',
    accent: COLORS.info,
  })
}

/* ------------------------------------------------------------------ *
 * Question analysis
 * ------------------------------------------------------------------ */

export function AnswerComparison(ctx, { x, y, w, question }) {
  const doc = ctx.doc
  const gap = 8
  const boxW = (w - gap * 2) / 3
  const h = 38
  const status = fmt(question.status)
  const statusC = statusColor(status)
  const boxes = [
    { label: 'STUDENT ANSWER', value: question.selected, color: status === 'Correct' ? COLORS.success : status === 'Incorrect' ? COLORS.error : COLORS.slate, soft: statusSoft(status) },
    { label: 'CORRECT ANSWER', value: question.correct, color: COLORS.success, soft: COLORS.successSoft },
    { label: 'MARKS  ·  TIME', value: `${question.marks}  ·  ${question.time}`, color: COLORS.midnight, soft: COLORS.ivory },
  ]
  boxes.forEach((box, i) => {
    const bx = x + i * (boxW + gap)
    doc.roundedRect(bx, y, boxW, h, 3).fill(box.soft).stroke(COLORS.border)
    doc.rect(bx, y, 2, h).fill(box.color)
    ctx.drawText(box.label, bx + 8, y + 5, boxW - 16, {
      size: 6.7, font: FONTS.bodySemi, color: COLORS.slate, characterSpacing: 0.6,
    })
    ctx.drawText(box.value, bx + 8, y + 17, boxW - 16, {
      size: 11, font: FONTS.heading, color: box.color, features: ['tnum'], lineHeight: 13,
    })
  })
  if (question.mistakeCategory && question.mistakeCategory !== '—') {
    ctx.drawText(`Mistake category  ·  ${question.mistakeCategory}`, x, y + h + 3, w, {
      size: 7.2, font: FONTS.bodySemi, color: COLORS.error,
    })
    return h + 12
  }
  return h
}

function metaLine(ctx, question, x, y, w) {
  const chips = [
    ['SUBJECT', question.subject],
    ['CHAPTER', question.chapter],
    ['TOPIC', question.topic],
    ['DIFFICULTY', question.difficulty],
    ['TYPE', question.type],
  ]
  const gap = 6
  const chipW = (w - gap * (chips.length - 1)) / chips.length
  chips.forEach(([label, value], i) => {
    const cx = x + i * (chipW + gap)
    ctx.drawText(label, cx, y, chipW, {
      size: 6.4, font: FONTS.bodySemi, color: COLORS.slate, characterSpacing: 0.5,
    })
    ctx.drawText(value, cx, y + 9, chipW, {
      size: 7.8, font: FONTS.bodySemi, color: COLORS.deepInk, lineHeight: 10,
    })
  })
  return metaMeasure(ctx, { subject: chips[0][1], chapter: chips[1][1], topic: chips[2][1], difficulty: chips[3][1], type: chips[4][1] }, w)
}

function solutionSource(question) {
  if (question.solutionParts.length) {
    return question.solutionParts.map((part) => `${part.label}: ${part.text}`).join('\n')
  }
  return 'No explanation was supplied in the source payload.'
}

function questionTextSource(question) {
  const parts = []
  if (question.questionText) parts.push(`Question: ${question.questionText}`)
  else parts.push('Question text: —')
  if (question.options.length) {
    parts.push(`Options: ${question.options.map((option, i) => `${String.fromCharCode(65 + i)} · ${option}`).join('   ')}`)
  } else {
    parts.push('Options: —')
  }
  return parts.join('   ')
}

export function QuestionAnalysisCard(ctx, { question, x = CONTENT.x, w = CONTENT.w } = {}) {
  const doc = ctx.doc
  const pad = 12
  const innerW = w - pad * 2
  const innerX = x + pad
  const status = fmt(question.status)
  const accent = statusColor(status)
  const solution = new SolutionRenderer(ctx, { fontSize: 8.5, maxWidth: innerW, sourceLabel: question.q })
  const questionSolution = new SolutionRenderer(ctx, { fontSize: 8.4, maxWidth: innerW, sourceLabel: question.q })
  const qSource = questionTextSource(question)
  const headerH = 26
  const metaH = metaMeasure(ctx, question, innerW)
  const answerH = 38 + (question.mistakeCategory && question.mistakeCategory !== '—' ? 12 : 0)
  const qTextH = questionSolution.measure(qSource)
  const qSectionH = 12 + qTextH + 2
  const answerSectionH = answerH + 4
  const solutionParts = question.solutionParts.length
    ? question.solutionParts.map((part) => ({ label: part.label, text: part.text, height: solution.measure(part.text) }))
    : [{ label: 'Solution', text: 'No explanation was supplied in the source payload.', height: solution.measure('No explanation was supplied in the source payload.') }]
  const solutionBodyH = solutionParts.reduce((sum, part) => sum + 10 + part.height + 3, 0)
  const solutionSectionH = 14 + solutionBodyH + 2
  const cardH = headerH + metaH + qSectionH + answerSectionH + solutionSectionH + 12
  const capacity = CONTENT.h - 24

  ctx.ensureBlock(Math.min(cardH, capacity) + 16)
  const headerBlock = ctx.reserve(headerH + metaH, { continuationLabel: `${question.q} · question continued` })
  let hy = headerBlock.y
  doc.rect(x, hy, 3, headerH + metaH).fill(accent)
  doc.roundedRect(x + 3, hy, w - 3, headerH + metaH, 3).fill(COLORS.white).stroke(COLORS.border)
  doc.roundedRect(innerX, hy + 8, 28, 22, 2).fill(COLORS.midnight)
  ctx.drawText(question.q, innerX, hy + 13, 28, {
    size: 8.4, font: FONTS.heading, color: COLORS.white, align: 'center',
  })
  ctx.drawText(`${question.q}  ·  ${status}`, innerX + 36, hy + 9, 210, {
    size: 9.2, font: FONTS.heading, color: COLORS.midnight,
  })
  Pill(ctx, {
    x: x + w - 92, y: hy + 9, text: status, color: accent,
    soft: statusSoft(status), width: 78, size: 7.2,
  })
  metaLine(ctx, question, innerX, hy + headerH, innerW)

  const qReserved = ctx.reserve(qSectionH, { continuationLabel: `${question.q} · question text continued` })
  const qy = qReserved.y
  doc.rect(x, qy, 3, qSectionH).fill(COLORS.border)
  doc.roundedRect(x + 3, qy, w - 3, qSectionH, 3).fill(COLORS.white).stroke(COLORS.border)
  ctx.drawText('QUESTION  /  OPTIONS', innerX, qy + 2, innerW, {
    size: 6.7, font: FONTS.bodySemi, color: COLORS.slate, characterSpacing: 0.7,
  })
  questionSolution.renderAt(qSource, innerX, qy + 12, innerW)

  const aReserved = ctx.reserve(answerSectionH, { continuationLabel: `${question.q} · answer comparison continued` })
  const ay = aReserved.y
  doc.rect(x, ay, 3, answerSectionH).fill(accent)
  AnswerComparison(ctx, { x: innerX, y: ay + 3, w: innerW, question })

  const sReserved = ctx.reserve(solutionSectionH, { continuationLabel: `${question.q} · solution continued` })
  let sy = sReserved.y
  doc.rect(x, sy, 3, solutionSectionH).fill(accent)
  doc.roundedRect(x + 3, sy, w - 3, solutionSectionH, 3).fill(COLORS.ivory).stroke(COLORS.border)
  ctx.drawText('SOLUTION  /  EXPLANATION', innerX, sy + 3, innerW, {
    size: 6.9, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.8,
  })
  sy += 14
  for (const part of solutionParts) {
    ctx.drawText(part.label.toUpperCase(), innerX, sy, innerW, {
      size: 6.7, font: FONTS.bodySemi, color: COLORS.slate, characterSpacing: 0.6,
    })
    solution.renderAt(part.text, innerX, sy + 8, innerW)
    sy += 10 + part.height + 3
  }
  ctx.space(12)
  return cardH
}

function metaMeasure(ctx, question, w) {
  const gap = 6
  const chipW = (w - gap * 4) / 5
  const values = [question.subject, question.chapter, question.topic, question.difficulty, question.type]
  const valueH = Math.max(...values.map((value) => ctx.measureText(value, chipW, {
    size: 7.8, font: FONTS.bodySemi, color: COLORS.deepInk, lineHeight: 10,
  })))
  return 9 + valueH + 4
}

function drawCardContinuation(ctx, x, w, y, question) {
  ctx.doc.rect(x, y, 3, 16).fill(statusColor(question.status))
  ctx.drawText(`${question.q}  ·  continued`, x + 12, y, w - 12, {
    size: 7.4, font: FONTS.bodySemi, color: COLORS.slate, characterSpacing: 0.5, chrome: true, emit: false,
  })
}

/* ------------------------------------------------------------------ *
 * Revision intelligence
 * ------------------------------------------------------------------ */

export function SubjectSection(ctx, { subject, x = CONTENT.x, y, w = CONTENT.w, index = 0, note = '' } = {}) {
  const accent = subjectColor(subject, index)
  const h = 26 + (note ? 12 : 0)
  ctx.doc.roundedRect(x, y, w, h, 3).fill(COLORS.ivory).stroke(COLORS.border)
  ctx.doc.rect(x, y, 3, h).fill(accent)
  ctx.drawText(String(index + 1).padStart(2, '0'), x + 10, y + 7, 22, {
    size: 8.4, font: FONTS.bodyBold, color: accent, features: ['tnum'],
  })
  ctx.drawText(subject, x + 34, y + 5, w - 44, {
    size: 11, font: FONTS.heading, color: COLORS.midnight,
  })
  if (note) {
    ctx.drawText(note, x + 34, y + 17, w - 44, {
      size: 7.2, font: FONTS.body, color: COLORS.slate,
    })
  }
  return h
}

export function RevisionPriorityTable(ctx, { groups = [], x = CONTENT.x, y = ctx.y, w = CONTENT.w, emphasis = false } = {}) {
  if (!groups.length) return 0
  let total = 0
  groups.forEach((group, index) => {
    const note = group.accuracyLabel && group.accuracyLabel !== '—'
      ? `${group.accuracyLabel} subject accuracy  ·  ${group.mastery || 'Review'}`
      : `${group.mastery || 'Review'}  ·  ordered by lowest accuracy`
    const subjectH = 26 + (note ? 12 : 0)
    const reserved = ctx.reserve(subjectH + 5, { continuationLabel: `${group.subject} · revision priorities continued` })
    SubjectSection(ctx, { subject: group.subject, x, y: reserved.y, w, index, note })
    total += subjectH + 5 + reserved.extra
    const rows = group.topics.map((topic) => ({
      topic: fmt(topic.name),
      chapter: fmt(topic.chapter),
      accuracy: fmt(topic.accuracyLabel),
      priority: fmt(topic.priority),
    }))
    const tableH = SimpleTable(ctx, {
      x, y: ctx.y, w, rows,
      columns: [
        { key: 'topic', label: emphasis ? 'Priority topic' : 'Topic', width: 2.5, font: FONTS.bodySemi },
        { key: 'chapter', label: 'Chapter', width: 2.0 },
        { key: 'accuracy', label: 'Accuracy', width: 1.0, align: 'right', color: (v) => masteryColor(v) },
        { key: 'priority', label: 'Classification', width: 1.15, render: 'pill', color: (v) => priorityColor(v), soft: (v) => (v === 'Critical' ? COLORS.errorSoft : v === 'Weak' ? COLORS.warningSoft : COLORS.infoSoft) },
      ],
      fontSize: 7.6,
    })
    total += tableH + 10
    ctx.space(10)
  })
  return total
}

/* ------------------------------------------------------------------ *
 * Source data register
 * ------------------------------------------------------------------ */

export function SourceRegister(ctx, { rows = [], x = CONTENT.x, y = ctx.y, w = CONTENT.w } = {}) {
  if (!rows.length) return 0
  const gap = 12
  const colW = (w - gap) / 2
  const headerH = 18
  let total = 0
  const paintColumnHeaders = (cy) => {
    ctx.doc.rect(x, cy, w, headerH).fill(COLORS.midnight)
    ctx.drawText('SOURCE FIELD', x + 6, cy + 4, colW - 12, {
      size: 6.7, font: FONTS.bodySemi, color: COLORS.white, characterSpacing: 0.6, chrome: true, emit: false,
    })
    ctx.drawText('SOURCE VALUE', x + colW + gap + 6, cy + 4, colW - 12, {
      size: 6.7, font: FONTS.bodySemi, color: COLORS.white, characterSpacing: 0.6, chrome: true, emit: false,
    })
  }
  const firstHeader = ctx.reserve(headerH + 4)
  paintColumnHeaders(firstHeader.y)
  total += headerH + 4
  for (let i = 0; i < rows.length; i += 2) {
    const left = rows[i]
    const right = rows[i + 1]
    const measure = (row) => {
      if (!row) return 22
      const pathH = ctx.measureText(row.path, colW - 12, { size: 6.5, font: FONTS.bodySemi, color: COLORS.slate, lineHeight: 8 })
      const valueH = ctx.measureText(row.value, colW - 12, { size: 7.6, font: FONTS.body, color: COLORS.deepInk, lineHeight: 10 })
      return Math.max(22, pathH + valueH + 7)
    }
    const rowH = Math.max(measure(left), measure(right))
    const reserved = ctx.reserve(rowH, {
      newPageExtra: headerH + 4,
      onNewPage: (hy) => paintColumnHeaders(hy),
    })
    drawPair(left, right, reserved.y, rowH)
    total += rowH + reserved.extra
  }
  function drawPair(left, right, ry, rowH) {
    const drawCell = (row, cx) => {
      if (!row) return
      ctx.doc.lineWidth(0.3).strokeColor(COLORS.border).rect(cx, ry, colW, rowH).stroke()
      ctx.drawText(row.path, cx + 6, ry + 3, colW - 12, {
        size: 6.5, font: FONTS.bodySemi, color: COLORS.slate, lineHeight: 8,
      })
      ctx.drawText(row.value, cx + 6, ry + 12, colW - 12, {
        size: 7.6, font: FONTS.body, color: COLORS.deepInk, lineHeight: 10,
      })
    }
    drawCell(left, x)
    drawCell(right, x + colW + gap)
  }
  return total
}

