/**
 * Reusable, measurement-driven V2 publication components.
 *
 * Flow components reserve their measured height through ReportContext. Static
 * specs can be placed inside editorial columns; they measure with the exact
 * width they will receive and draw only inside their frame. Chrome is fixed
 * and audited separately from content.
 */

import {
  A4, CONTENT, FOOTER, PAGE, COLORS, FONTS, TYPE,
  fmt, pct, mix, twoColumns, statusColor, statusSoft, masteryColor, priorityColor,
  difficultyColor, subjectColor,
} from './theme.js'
import { SolutionRenderer } from './math.js'
import {
  chunkable, chunkSpec, textChunkEntries, paginateSingle, paginateColumns,
  emptySpec, CONTINUATION_H, EPS,
} from './pagination.js'

const HAIRLINE = 0.5

/* ------------------------------------------------------------------ *
 * Content-driven pagination primitives
 * ------------------------------------------------------------------ */

/** A measured, line-chunkable text block used for oversized single entries. */
export function TextFlowSpec(ctx, {
  label = '', title = '', text = '', size = TYPE.body, accent = COLORS.indigo,
  tone = COLORS.ink, widthPadding = 16, paragraphGap = 2, topPad = 5, bottomPad = 8,
} = {}) {
  const bodyOpts = { size, font: FONTS.body, color: tone, paragraphGap }
  const bodyWidth = (w) => Math.max(20, w - widthPadding)
  const resolvedTitle = (opts = {}) => (opts.continuation && title ? `${title} · continued` : title)
  const fixed = (w, opts = {}) => {
    const t = resolvedTitle(opts)
    const titleH = t
      ? ctx.measureText(t, Math.max(20, w - 14), { size: TYPE.label, font: FONTS.bodySemi, characterSpacing: 0.7 }) + 3
      : 0
    return topPad + titleH + bottomPad
  }
  const build = (subset, opts = {}) => {
    const bodyText = subset.map((entry) => entry.text).join('\n')
    const t = resolvedTitle(opts)
    return {
      type: 'text-flow', label,
      measure: (w) => fixed(w, opts) + (bodyText ? ctx.measureText(bodyText, bodyWidth(w), bodyOpts) : 0),
      draw: (frame) => {
        ctx.canvas.rect(frame.x, frame.y + 3, 2, Math.max(2, frame.h - 10), { fill: accent, audit: false })
        let cursor = frame.y + topPad
        if (t) {
          cursor += ctx.text(t, frame.x + 12, cursor, frame.w - 14, {
            size: TYPE.label, font: FONTS.bodySemi, color: accent, characterSpacing: 0.7,
          }) + 3
        }
        if (bodyText) ctx.text(bodyText, frame.x + 12, cursor, bodyWidth(frame.w), bodyOpts)
      },
    }
  }
  const entries = [{ kind: 'text', text: fmt(text, '—') }]
  const split = (splitCtx, entry, w, maxHeight, opts) => textChunkEntries(
    splitCtx, entry.text, bodyWidth(w), bodyOpts,
    Math.max(12, maxHeight - fixed(w, opts)),
    (chunkText, height, continuation) => ({ kind: 'text', text: chunkText, continuation, height }),
  )
  return chunkable({
    type: 'text-flow', label: label || title, entries, build, split,
    continuationLabel: title || label,
  })
}

function cellChunkInfo(ctx, col, row, value, cw) {
  if (col.render === 'source') {
    const record = value || {}
    return {
      kind: 'source',
      text: `${fmt(record.path)}\n${fmt(record.value)}`,
      width: Math.max(12, cw - 8), extra: 2,
      opts: { size: 8.2, font: FONTS.body, color: COLORS.ink, paragraphGap: 2 },
    }
  }
  const text = fmt(value)
  const opts = cellTextOptions(col, text, row)
  if (col.render === 'pill') {
    return {
      kind: 'pill', text, width: Math.max(12, cw - 15), extra: 2,
      opts: { size: 8.2, font: FONTS.bodyBold, color: resolveColor(col.color, text, row, COLORS.indigo) },
    }
  }
  return {
    kind: col.render === 'bar' ? 'bar' : 'plain',
    text, width: Math.max(12, cw - 8), extra: col.render === 'bar' ? 8 : 0,
    opts: { ...opts, paragraphGap: 0 },
  }
}

function splitRowEntry(ctx, row, columns, widths, maxHeight, rowPadding) {
  const budget = Math.max(12, maxHeight - rowPadding * 2)
  const perColumn = columns.map((col, i) => {
    const info = cellChunkInfo(ctx, col, row, row[col.key], widths[i])
    return {
      info,
      chunks: textChunkEntries(
        ctx, info.text, info.width, info.opts,
        Math.max(12, budget - info.extra),
        (chunkText, height, continuation) => ({ kind: 'text', text: chunkText, continuation, height }),
      ),
    }
  })
  const count = Math.max(...perColumn.map((column) => column.chunks.length), 1)
  const out = []
  for (let line = 0; line < count; line += 1) {
    const next = { ...row, __continuation: line > 0 }
    columns.forEach((col, i) => {
      const text = perColumn[i].chunks[line]?.text ?? ''
      if (perColumn[i].info.kind === 'source') {
        const parts = text.split('\n')
        next[col.key] = { path: parts[0] || '', value: parts.slice(1).join('\n') }
      } else {
        next[col.key] = text
      }
    })
    out.push({ kind: 'row', row: next, index: row.__rowOffset ?? 0 })
  }
  return out
}

function splitBarEntry(ctx, bar, g, maxHeight, fixedBudget) {
  const budget = Math.max(12, maxHeight - fixedBudget - 6)
  const labelChunks = textChunkEntries(
    ctx, fmt(bar.label), g.labelW,
    { size: TYPE.bodySmall, font: FONTS.bodySemi, paragraphGap: 0 }, budget,
    (text, height, continuation) => ({ kind: 'text', text, continuation, height }),
  )
  const valueChunks = textChunkEntries(
    ctx, fmt(bar.valueLabel ?? bar.value), g.valueW,
    { size: TYPE.bodySmall, font: FONTS.bodyBold, align: 'right', features: ['tnum'], paragraphGap: 0 }, budget,
    (text, height, continuation) => ({ kind: 'text', text, continuation, height }),
  )
  const count = Math.max(labelChunks.length, valueChunks.length, 1)
  return Array.from({ length: count }, (_, line) => ({
    kind: 'bar',
    bar: {
      ...bar,
      label: labelChunks[line]?.text ?? '',
      valueLabel: valueChunks[line]?.text ?? '',
      __continuation: line > 0,
    },
  }))
}

function splitMetricItem(ctx, item, w, maxHeight, columns, gap, labelSize, valueSize) {
  const widths = equalColumns(columns, gap, w, CONTENT.x)
  const cw = Math.max(12, widths[0].w - 4)
  const budget = Math.max(12, maxHeight - 13)
  const labelChunks = textChunkEntries(
    ctx, String(item.label).toUpperCase(), cw,
    { size: labelSize, font: FONTS.bodySemi, characterSpacing: 0.5, paragraphGap: 0 }, budget,
    (text, height, continuation) => ({ kind: 'text', text, continuation, height }),
  )
  const valueChunks = textChunkEntries(
    ctx, fmt(item.value), cw,
    { size: valueSize, font: FONTS.bodyBold, features: ['tnum'], paragraphGap: 0 }, budget,
    (text, height, continuation) => ({ kind: 'text', text, continuation, height }),
  )
  const count = Math.max(labelChunks.length, valueChunks.length, 1)
  return Array.from({ length: count }, (_, line) => ({
    kind: 'metric',
    item: {
      ...item,
      label: labelChunks[line]?.text ?? '',
      value: valueChunks[line]?.text ?? '',
      __continuation: line > 0,
    },
  }))
}

function verticalSpec(ctx, specs, gap = 0, label = 'vertical-stack') {
  return {
    type: 'vertical-stack', label,
    measure: (w) => specs.reduce((sum, spec, index) => (
      sum + spec.measure(w) + (index < specs.length - 1 ? gap : 0)
    ), 0),
    draw: (frame) => {
      let y = frame.y
      specs.forEach((spec, index) => {
        const h = spec.measure(frame.w)
        ctx.child({
          type: spec.type || 'stack-item', label: spec.label || '',
          x: frame.x, y, w: frame.w, h,
        }, (childFrame) => spec.draw(childFrame))
        y += h + (index < specs.length - 1 ? gap : 0)
      })
    },
  }
}

export function StackSpec(ctx, { builders = [], gap = 0, label = 'Editorial column stack' } = {}) {
  const units = builders.map((build, index) => ({
    kind: 'spec', build, gapAfter: index < builders.length - 1 ? gap : 0,
  }))
  const build = (subset, opts = {}) => {
    const normalized = subset.map((unit, index) => ({
      ...unit,
      gapAfter: index < subset.length - 1 ? (unit.gapAfter || gap) : 0,
    }))
    const specFor = (unit, w) => (unit.kind === 'gap' ? null : unit.build(w))
    return {
      type: 'column-stack', label,
      measure: (w) => normalized.reduce((sum, unit) => (
        sum + (unit.kind === 'gap' ? unit.height : specFor(unit, w).measure(w)) + unit.gapAfter
      ), 0),
      draw: (frame) => {
        let y = frame.y
        normalized.forEach((unit) => {
          if (unit.kind === 'gap') {
            y += unit.height + unit.gapAfter
            return
          }
          const spec = specFor(unit, frame.w)
          const h = spec.measure(frame.w)
          ctx.child({
            type: spec.type || 'stack-item', label: spec.label || '',
            x: frame.x, y, w: frame.w, h,
          }, (childFrame) => spec.draw(childFrame))
          y += h + unit.gapAfter
        })
      },
    }
  }
  const split = (splitCtx, unit, w, maxHeight, opts) => {
    if (unit.kind === 'gap') return [unit]
    const nested = unit.build(w)
    const budget = Math.max(12, maxHeight - unit.gapAfter)
    const chunks = chunkSpec(splitCtx, nested, w, budget, {
      continuationLabel: opts.continuationLabel || label,
    })
    return chunks.map((chunk, index) => ({
      kind: 'spec', build: () => chunk.spec,
      gapAfter: index < chunks.length - 1 ? gap : unit.gapAfter,
    }))
  }
  return chunkable({
    type: 'column-stack', label, entries: units, build, split,
    continuationLabel: label,
  })
}

function asColor(value, fallback = COLORS.ink) {
  if (typeof value === 'function') return value() || fallback
  return value || fallback
}

function resolveColor(value, rowValue, row, fallback = COLORS.ink) {
  if (typeof value === 'function') return value(rowValue, row) || fallback
  return value || fallback
}

function equalColumns(count, gap, w, x) {
  const width = (w - gap * (count - 1)) / count
  return Array.from({ length: count }, (_, i) => ({ x: x + i * (width + gap), w: width }))
}

function drawLogo(ctx, x, y, width, role = 'content') {
  if (!ctx.assets?.logo) return
  ctx.canvas.image(ctx.assets.logo, x, y, width, width, { role })
}

/* ------------------------------------------------------------------ *
 * Fixed chrome
 * ------------------------------------------------------------------ */

export function drawHeader(ctx, { cover = false } = {}) {
  ctx.chrome({
    type: 'header', role: 'header',
    x: CONTENT.x, y: PAGE.headerTop, w: CONTENT.w, h: 40,
  }, (frame) => {
    const logoW = cover ? 24 : 18
    drawLogo(ctx, frame.x, frame.y + 1, logoW, 'header')
    const brandX = frame.x + logoW + 9
    ctx.text('MediXO EduX', brandX, frame.y + 3, 150, {
      size: cover ? 10 : 8.8, font: FONTS.heading, color: COLORS.midnight,
      chrome: true, emit: false, role: 'header',
    })
    const rightW = 250
    const rightX = frame.x + frame.w - rightW
    const rightLabel = ctx.kind === 'intelligence'
      ? 'EXAM INTELLIGENCE  /  PERFORMANCE BRIEFING'
      : 'ACADEMIC INTELLIGENCE  /  PUBLICATION'
    ctx.text(rightLabel, rightX, frame.y + 4, rightW, {
      size: 7.8, font: FONTS.bodySemi, color: COLORS.muted,
      align: 'right', characterSpacing: 0.7, chrome: true, emit: false, role: 'header',
    })
    if (!cover) {
      ctx.text(ctx.model.reportId, brandX, frame.y + 16, 200, {
        size: 7.8, font: FONTS.bodySemi, color: COLORS.muted,
        characterSpacing: 0.5, chrome: true, emit: false, role: 'header',
      })
      ctx.text(ctx.model.examTitleShort, rightX, frame.y + 16, rightW, {
        size: 7.8, font: FONTS.body, color: COLORS.muted,
        align: 'right', chrome: true, emit: false, role: 'header',
      })
    }
    ctx.canvas.line(frame.x, frame.y + 38, frame.x + frame.w, frame.y + 38, {
      color: COLORS.line, width: HAIRLINE, role: 'header',
    })
    ctx.canvas.line(frame.x, frame.y + 38, frame.x + 54, frame.y + 38, {
      color: COLORS.indigo, width: 1.7, role: 'header',
    })
  })
}

export function drawFooter(ctx, { pageNumber } = {}) {
  ctx.chrome({
    type: 'footer', role: 'footer',
    x: CONTENT.x, y: FOOTER.y, w: CONTENT.w, h: 24,
  }, (frame) => {
    ctx.canvas.line(frame.x, frame.y, frame.x + frame.w, frame.y, {
      color: COLORS.line, width: HAIRLINE, role: 'footer',
    })
    ctx.text('MediXO EduX', frame.x, frame.y + 9, 150, {
      size: TYPE.folio, font: FONTS.bodySemi, color: COLORS.muted,
      chrome: true, emit: false, role: 'footer',
    })
    ctx.text(ctx.model.reportId, frame.x + 150, frame.y + 9, frame.w - 300, {
      size: TYPE.folio, font: FONTS.body, color: COLORS.muted,
      align: 'center', chrome: true, emit: false, role: 'footer',
    })
    ctx.text(`PAGE ${String(pageNumber).padStart(2, '0')}`, frame.x + frame.w - 110, frame.y + 9, 74, {
      size: TYPE.folio, font: FONTS.bodySemi, color: COLORS.muted,
      align: 'right', chrome: true, emit: false, role: 'footer',
    })
  })
}

export function drawPageTotal(ctx, total) {
  ctx.chrome({
    type: 'page-total', role: 'footer',
    x: CONTENT.x + CONTENT.w - 34, y: FOOTER.y + 9, w: 34, h: 10,
  }, (frame) => {
    ctx.text(`/ ${String(total).padStart(2, '0')}`, frame.x, frame.y, frame.w, {
      size: TYPE.folio, font: FONTS.bodyBold, color: COLORS.midnight,
      align: 'right', chrome: true, emit: false, role: 'footer',
    })
  })
}

export function FinalBranding(ctx) {
  const placed = ctx.bottomFrame(54)
  return ctx.chrome({
    type: 'final-branding', role: 'content', label: 'End of report',
    x: placed.x, y: placed.y, w: placed.w, h: placed.h,
  }, (frame) => {
    ctx.canvas.line(frame.x, frame.y + 6, frame.x + frame.w, frame.y + 6, { color: COLORS.line, width: HAIRLINE })
    const cx = frame.x + frame.w / 2
    const logoW = 22
    drawLogo(ctx, cx - logoW / 2, frame.y + 14, logoW, 'content')
    ctx.text('MediXO EduX  ·  Examination Intelligence', frame.x, frame.y + 16, frame.w / 2 - 24, {
      size: 8.6, font: FONTS.heading, color: COLORS.midnight, align: 'right',
    })
    ctx.text(`End of report  ·  ${ctx.model.reportId}`, cx + 24, frame.y + 17, frame.w / 2 - 24, {
      size: 8, font: FONTS.body, color: COLORS.muted,
    })
    ctx.text('Missing values are shown as —.', frame.x, frame.y + 39, frame.w, {
      size: TYPE.folio, font: FONTS.body, color: COLORS.muted, align: 'center',
    })
  })
}

/* ------------------------------------------------------------------ *
 * Editorial primitives
 * ------------------------------------------------------------------ */

export function SectionHeading(ctx, {
  number, kicker, title, note = '', accent = COLORS.indigo,
  topSpacing = 4, bottomSpacing = 12, keepWithNext = 78,
} = {}) {
  const titleW = CONTENT.w - 52
  const measure = () => {
    const kickerH = kicker ? ctx.measureText(kicker, titleW, { size: TYPE.label, font: FONTS.bodySemi, characterSpacing: 1 }) : 0
    const titleH = ctx.measureText(title, titleW, { size: TYPE.section, font: FONTS.heading, lineHeight: TYPE.section * 1.18 })
    const noteH = note ? ctx.measureText(note, CONTENT.w, { size: TYPE.bodySmall, font: FONTS.body, color: COLORS.muted }) : 0
    return 6 + kickerH + 3 + titleH + (note ? 7 + noteH : 0) + 9
  }
  return ctx.component({
    type: 'section-heading', label: title, topSpacing, bottomSpacing, keepWithNext,
    measure,
    draw: (frame) => {
      let cursor = frame.y + 3
      if (number) {
        ctx.text(number, frame.x, cursor, 36, {
          size: 9, font: FONTS.bodyBold, color: accent, characterSpacing: 0.7,
        })
      }
      const tx = frame.x + (number ? 44 : 0)
      if (kicker) {
        const h = ctx.text(kicker, tx, cursor, titleW, {
          size: TYPE.label, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 1,
        })
        cursor += h + 2
      }
      const titleH = ctx.text(title, tx, cursor, titleW, {
        size: TYPE.section, font: FONTS.heading, color: COLORS.midnight,
        lineHeight: TYPE.section * 1.18,
      })
      cursor += titleH + 7
      if (note) {
        cursor += ctx.text(note, frame.x, cursor, frame.w, {
          size: TYPE.bodySmall, font: FONTS.body, color: COLORS.muted,
        })
      }
      ctx.canvas.line(frame.x, frame.y + frame.h - 8, frame.x + frame.w, frame.y + frame.h - 8, { color: COLORS.line, width: HAIRLINE })
      ctx.canvas.line(frame.x, frame.y + frame.h - 8, frame.x + 48, frame.y + frame.h - 8, { color: accent, width: 1.5 })
    },
  })
}

export function Subheading(ctx, { title, note = '', accent = COLORS.indigo, topSpacing = 6, bottomSpacing = 7 } = {}) {
  const measure = () => {
    const titleH = ctx.measureText(title, CONTENT.w - 14, { size: TYPE.subsection, font: FONTS.heading })
    const noteH = note ? ctx.measureText(note, CONTENT.w - 14, { size: 8.5, font: FONTS.body, color: COLORS.muted }) : 0
    return titleH + (note ? 2 + noteH : 0) + 5
  }
  return ctx.component({
    type: 'subsection-heading', label: title, topSpacing, bottomSpacing, keepWithNext: 30,
    measure,
    draw: (frame) => {
      ctx.canvas.rect(frame.x, frame.y + 3, 2.5, 12, { fill: accent })
      const h = ctx.text(title, frame.x + 12, frame.y, frame.w - 12, {
        size: TYPE.subsection, font: FONTS.heading, color: COLORS.midnight,
      })
      if (note) {
        ctx.text(note, frame.x + 12, frame.y + h + 1, frame.w - 12, {
          size: 8.5, font: FONTS.body, color: COLORS.muted,
        })
      }
      ctx.canvas.line(frame.x, frame.y + frame.h - 3, frame.x + frame.w, frame.y + frame.h - 3, { color: COLORS.line, width: 0.4 })
    },
  })
}

export function Paragraph(ctx, {
  text, title = '', accent = COLORS.indigo, size = TYPE.body,
  tone = COLORS.ink, bottomSpacing = 8, keepWithNext = 0, continuationLabel,
} = {}) {
  const spec = TextFlowSpec(ctx, {
    label: title || String(text).slice(0, 40), title, text, size, accent, tone,
    widthPadding: 18, paragraphGap: 3, topPad: 6, bottomPad: 8,
  })
  return paginateSingle(ctx, spec, {
    w: CONTENT.w,
    x: CONTENT.x,
    bottomSpacing,
    keepWithNext,
    continuationLabel: continuationLabel || title || 'Editorial paragraph',
  })
}


export function Pill(ctx, { x, y, text, color = COLORS.indigo, soft = mix(color, COLORS.white, 0.1), width, size = 8, emit = true } = {}) {
  const label = fmt(text, '—')
  const measured = ctx.textEngine.measureRun(label, FONTS.bodyBold, size, {})
  const w = width || measured + 14
  const h = size + 7
  ctx.canvas.rect(x, y, w, h, { fill: soft, radius: h / 2, kind: 'shape', role: 'pill' })
  ctx.text(label, x + 7, y + 2.5, w - 14, {
    size, font: FONTS.bodyBold, color, align: 'center', emit,
  })
  return { w, h }
}

export function ProgressBar(ctx, { x, y, w, value, max = 100, color = COLORS.indigo, track = COLORS.line, height = 4 } = {}) {
  const v = Math.max(0, Number(value) || 0)
  const m = Math.max(1, Number(max) || 100)
  ctx.canvas.bar(x, y, w, height, track, { variant: 'track' })
  const fillW = Math.min(w, (v / m) * w)
  if (fillW > 0.6) ctx.canvas.bar(x, y, fillW, height, color, { variant: 'value' })
  return height
}

/* ------------------------------------------------------------------ *
 * Static specs for editorial columns
 * ------------------------------------------------------------------ */

function flow(ctx, spec, opts = {}) {
  const w = opts.w || CONTENT.w
  const h = spec.measure(w)
  const topSpacing = Number(opts.topSpacing) || 0
  const bottomSpacing = Number(opts.bottomSpacing) || 0
  const keepWithNext = Number(opts.keepWithNext) || 0
  const capacity = CONTENT.h - topSpacing - bottomSpacing - keepWithNext - CONTINUATION_H
  if (spec.pagination || h > capacity + EPS) {
    return paginateSingle(ctx, spec, {
      ...opts,
      w,
      x: opts.x == null ? CONTENT.x : opts.x,
      continuationLabel: opts.continuationLabel || spec.pagination?.continuationLabel || spec.label || spec.type,
    })
  }
  return ctx.component({
    type: spec.type,
    label: spec.label || '',
    x: opts.x,
    w,
    topSpacing: opts.topSpacing,
    bottomSpacing: opts.bottomSpacing,
    keepWithNext: opts.keepWithNext,
    continuationLabel: opts.continuationLabel,
    allowSplit: opts.allowSplit,
    measure: () => h,
    draw: (frame) => spec.draw({ ...frame, w }),
  })
}

export function EditorialColumns(ctx, {
  id, columns, gap = 18, topSpacing = 0, bottomSpacing = 8, keepWithNext = 0,
  paginate = true, continuationLabel, sectionTitle, segmentHeight,
} = {}) {
  const frames = equalColumns(columns.length, gap, CONTENT.w, CONTENT.x)
  const specs = columns.map((entry, index) => (
    typeof entry === 'function' ? entry(frames[index].w) : entry
  ))
  const heights = specs.map((spec, index) => spec.measure(frames[index].w))
  const h = segmentHeight || Math.max(...heights, 1)
  const label = continuationLabel || sectionTitle || id || 'Editorial columns'
  const capacity = CONTENT.h - topSpacing - bottomSpacing - keepWithNext - CONTINUATION_H
  if (paginate && h > capacity + EPS) {
    return paginateColumns(ctx, {
      id, gap, topSpacing, bottomSpacing, keepWithNext,
      continuationLabel: label, sectionTitle,
    }, specs, frames, heights, (segmentOpts) => EditorialColumns(ctx, segmentOpts))
  }
  return ctx.component({
    type: 'editorial-columns', label: id || '', topSpacing, bottomSpacing, keepWithNext,
    continuationLabel,
    allowSplit: true,
    continuation: !!continuationLabel,
    measure: () => h,
    draw: (frame) => {
      const cols = equalColumns(columns.length, gap, frame.w, frame.x)
      specs.forEach((spec, index) => {
        const col = cols[index]
        ctx.child({
          type: spec.type || 'editorial-column',
          label: spec.label || '',
          x: col.x, y: frame.y, w: col.w, h,
        }, (childFrame) => spec.draw(childFrame))
      })
    },
  })
}


export function MetricLedgerSpec(ctx, { label = '', items = [], labelSize = TYPE.label, valueSize = 11, columns = 4, gap = 12 } = {}) {
  const entries = items.map((item, index) => ({ kind: 'metric', item, index }))
  const build = (subset) => {
    const rows = subset.map((entry) => entry.item)
    const measure = (w) => {
      const widths = equalColumns(columns, gap, w, 0)
      const rowCount = Math.ceil(rows.length / columns)
      let total = 0
      for (let row = 0; row < rowCount; row += 1) {
        let rowH = 0
        for (let col = 0; col < columns; col += 1) {
          const item = rows[row * columns + col]
          if (!item) continue
          const cw = widths[col].w - 4
          const labelH = ctx.measureText(String(item.label).toUpperCase(), cw, { size: labelSize, font: FONTS.bodySemi, characterSpacing: 0.5 })
          const valueH = ctx.measureText(fmt(item.value), cw, { size: valueSize, font: FONTS.bodyBold, color: item.color || COLORS.midnight, features: ['tnum'] })
          rowH = Math.max(rowH, labelH + valueH + 5)
        }
        total += rowH + 8
      }
      return total
    }
    const draw = (frame) => {
      const widths = equalColumns(columns, gap, frame.w, frame.x)
      let cursor = frame.y
      for (let row = 0; row < Math.ceil(rows.length / columns); row += 1) {
        let rowH = 0
        const cells = []
        for (let col = 0; col < columns; col += 1) {
          const item = rows[row * columns + col]
          if (!item) { cells.push(null); continue }
          const cw = widths[col].w - 4
          const labelH = ctx.measureText(String(item.label).toUpperCase(), cw, { size: labelSize, font: FONTS.bodySemi, characterSpacing: 0.5 })
          const valueH = ctx.measureText(fmt(item.value), cw, { size: valueSize, font: FONTS.bodyBold, color: item.color || COLORS.midnight, features: ['tnum'] })
          cells.push({ item, labelH, valueH, frame: widths[col] })
          rowH = Math.max(rowH, labelH + valueH + 5)
        }
        cells.forEach((cell) => {
          if (!cell) return
          const { item, labelH, frame: c } = cell
          ctx.text(String(item.label).toUpperCase(), c.x, cursor, c.w - 4, {
            size: labelSize, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.5,
          })
          ctx.text(fmt(item.value), c.x, cursor + labelH + 2, c.w - 4, {
            size: valueSize, font: FONTS.bodyBold, color: item.color || COLORS.midnight, features: ['tnum'],
          })
        })
        cursor += rowH
        ctx.canvas.line(frame.x, cursor + 3, frame.x + frame.w, cursor + 3, { color: COLORS.line, width: 0.4 })
        cursor += 8
      }
    }
    return { type: 'metric-ledger', label, measure, draw }
  }
  const split = (splitCtx, entry, w, maxHeight) => splitMetricItem(
    splitCtx, entry.item, w, maxHeight, columns, gap, labelSize, valueSize,
  )
  return chunkable({ type: 'metric-ledger', label, entries, build, split, continuationLabel: label })
}

export function MetricLedger(ctx, opts) {
  return flow(ctx, MetricLedgerSpec(ctx, opts), opts)
}

export function BarChartSpec(ctx, {
  label = '', title, subtitle = '', bars = [], legend = '', accent = COLORS.indigo,
  labelWidthRatio = 0.42, valueWidth = 54, minRowHeight = 21, rowGap = 3,
} = {}) {
  const geometry = (w) => {
    const pad = 10
    const innerW = Math.max(40, w - pad * 2)
    let labelW = Math.max(42, Math.min(165, innerW * labelWidthRatio))
    const valueW = Math.min(valueWidth, Math.max(34, innerW * 0.28))
    let barX = labelW + 6
    const valueX = innerW - valueW
    let barW = valueX - 6 - barX
    while (barW < 8 && labelW > 42) {
      labelW = Math.max(42, labelW - 4)
      barX = labelW + 6
      barW = valueX - 6 - barX
    }
    return { pad, innerW, labelW, valueW, barX, valueX, barW: Math.max(4, barW) }
  }
  const entries = bars.map((bar, index) => ({ kind: 'bar', bar, index }))
  const resolvedTitle = (opts = {}) => (opts.continuation && title ? `${title} · continued` : title)
  const fixedBudget = (w, opts = {}) => {
    const g = geometry(w)
    const t = resolvedTitle(opts)
    const titleH = t ? ctx.measureText(t, g.innerW, { size: TYPE.subsection, font: FONTS.heading }) : 0
    const subtitleH = subtitle ? ctx.measureText(subtitle, g.innerW, { size: TYPE.label, font: FONTS.body, color: COLORS.muted }) : 0
    const legendH = legend ? ctx.measureText(legend, g.innerW, { size: TYPE.label, font: FONTS.body, color: COLORS.muted }) : 0
    return 8 + titleH + (subtitle ? 3 + subtitleH : 0) + 8 + (legend ? 7 + legendH : 0) + 8 + Math.max(0, 1 - 1) * rowGap
  }
  const build = (subset, opts = {}) => {
    const rows = subset.map((entry) => entry.bar)
    const t = resolvedTitle(opts)
    const measure = (w) => {
      const g = geometry(w)
      const base = fixedBudget(w, opts)
      const rowHeights = rows.map((bar) => {
        const labelH = ctx.measureText(fmt(bar.label), g.labelW, { size: TYPE.bodySmall, font: FONTS.bodySemi })
        const valueH = ctx.measureText(fmt(bar.valueLabel ?? bar.value), g.valueW, { size: TYPE.bodySmall, font: FONTS.bodyBold, align: 'right', features: ['tnum'] })
        return Math.max(minRowHeight, labelH, valueH) + 6
      })
      return base + rowHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, rows.length - 1) * rowGap
    }
    const draw = (frame) => {
      const g = geometry(frame.w)
      const innerX = frame.x + g.pad
      const barX = frame.x + g.pad + g.barX
      const valueX = frame.x + g.pad + g.valueX
      const max = Math.max(...rows.map((bar) => Number(bar.value) || 0), 1)
      let cursor = frame.y + 5
      ctx.canvas.line(frame.x, frame.y, frame.x + frame.w, frame.y, { color: COLORS.line, width: HAIRLINE })
      if (t) cursor += ctx.text(t, innerX, cursor, g.innerW, { size: TYPE.subsection, font: FONTS.heading, color: COLORS.midnight }) + 2
      if (subtitle) cursor += ctx.text(subtitle, innerX, cursor, g.innerW, { size: TYPE.label, font: FONTS.body, color: COLORS.muted }) + 6
      else cursor += 4
      rows.forEach((bar) => {
        const labelH = ctx.measureText(fmt(bar.label), g.labelW, { size: TYPE.bodySmall, font: FONTS.bodySemi })
        const valueH = ctx.measureText(fmt(bar.valueLabel ?? bar.value), g.valueW, { size: TYPE.bodySmall, font: FONTS.bodyBold, align: 'right', features: ['tnum'] })
        const rowH = Math.max(minRowHeight, labelH, valueH) + 6
        ctx.text(fmt(bar.label), innerX, cursor, g.labelW, { size: TYPE.bodySmall, font: FONTS.bodySemi, color: COLORS.ink })
        const barY = cursor + Math.max(2, (rowH - 5) / 2)
        ProgressBar(ctx, { x: barX, y: barY, w: g.barW, value: Number(bar.value) || 0, max, color: bar.color || accent, height: 5 })
        ctx.text(fmt(bar.valueLabel ?? bar.value), valueX, cursor, g.valueW, {
          size: TYPE.bodySmall, font: FONTS.bodyBold, color: bar.color || accent, align: 'right', features: ['tnum'],
        })
        cursor += rowH + rowGap
      })
      if (legend) ctx.text(legend, innerX, cursor, g.innerW, { size: TYPE.label, font: FONTS.body, color: COLORS.muted })
    }
    return { type: 'bar-chart', label: label || t || '', measure, draw }
  }
  const split = (splitCtx, entry, w, maxHeight, opts) => splitBarEntry(
    splitCtx, entry.bar, geometry(w), maxHeight, fixedBudget(w, opts),
  )
  return chunkable({
    type: 'bar-chart', label: label || title || '', entries, build, split,
    continuationLabel: title || label,
  })
}

export function BarChart(ctx, opts) {
  return flow(ctx, BarChartSpec(ctx, opts), opts)
}

export function StackedBarSpec(ctx, { label = '', title, subtitle = '', segments = [], legend = true, height = 12 } = {}) {
  const entries = [{ kind: 'all' }]
  const resolvedTitle = (opts = {}) => (opts.continuation && title ? `${title} · continued` : title)
  const build = (subset, opts = {}) => {
    if (!subset.length) return { type: 'stacked-bar', label, measure: () => 0, draw: () => {} }
    if (subset.length === 1 && subset[0].kind === 'overflow') {
      return TextFlowSpec(ctx, {
        label: label || title, title: resolvedTitle(opts), text: subset[0].text,
        size: TYPE.bodySmall,
      })
    }
    const t = resolvedTitle(opts)
    const measure = (w) => {
      const innerW = w - 20
      const titleH = t ? ctx.measureText(t, innerW, { size: TYPE.subsection, font: FONTS.heading }) : 0
      const subtitleH = subtitle ? ctx.measureText(subtitle, innerW, { size: TYPE.label, font: FONTS.body, color: COLORS.muted }) : 0
      const legendH = legend ? segments.reduce((sum, seg) => (
        sum + ctx.measureText(`${fmt(seg.label)}  ${fmt(seg.value)}`, innerW - 12, { size: TYPE.bodySmall, font: FONTS.body }) + 3
      ), 0) : 0
      return 8 + titleH + (subtitle ? 3 + subtitleH : 0) + 10 + height + 12 + legendH + 8
    }
    const draw = (frame) => {
      const innerX = frame.x + 10
      const innerW = frame.w - 20
      let cursor = frame.y + 5
      ctx.canvas.line(frame.x, frame.y, frame.x + frame.w, frame.y, { color: COLORS.line, width: HAIRLINE })
      if (t) cursor += ctx.text(t, innerX, cursor, innerW, { size: TYPE.subsection, font: FONTS.heading, color: COLORS.midnight }) + 2
      if (subtitle) cursor += ctx.text(subtitle, innerX, cursor, innerW, { size: TYPE.label, font: FONTS.body, color: COLORS.muted }) + 7
      else cursor += 5
      const total = segments.reduce((sum, seg) => sum + (Number(seg.value) || 0), 0) || 1
      let x = innerX
      segments.forEach((seg) => {
        const segW = ((Number(seg.value) || 0) / total) * innerW
        if (segW > 0.5) ctx.canvas.bar(x, cursor, segW, height, seg.color || COLORS.indigo, { variant: 'segment' })
        x += segW
      })
      cursor += height + 11
      if (legend) {
        segments.forEach((seg) => {
          ctx.canvas.rect(innerX, cursor + 3, 7, 7, { fill: seg.color || COLORS.indigo, kind: 'shape', role: 'legend' })
          const h = ctx.text(`${fmt(seg.label)}  ${fmt(seg.value)}`, innerX + 12, cursor, innerW - 12, {
            size: TYPE.bodySmall, font: FONTS.body, color: COLORS.ink,
          })
          cursor += h + 3
        })
      }
    }
    return { type: 'stacked-bar', label: label || t || '', measure, draw }
  }
  const split = () => [{
    kind: 'overflow',
    text: segments.map((seg) => `${fmt(seg.label)}  ·  ${fmt(seg.value)}`).join('\n') || '—',
  }]
  return chunkable({ type: 'stacked-bar', label: label || title || '', entries, build, split, continuationLabel: title || label })
}

export function StackedBar(ctx, opts) {
  return flow(ctx, StackedBarSpec(ctx, opts), opts)
}

export function DonutGaugeSpec(ctx, {
  label = '', title, subtitle = '', slices = [], centerValue = '', centerLabel = '',
  accent = COLORS.indigo, ringWidth = 10,
} = {}) {
  const entries = [{ kind: 'all' }]
  const resolvedTitle = (opts = {}) => (opts.continuation && title ? `${title} · continued` : title)
  const build = (subset, opts = {}) => {
    if (!subset.length) return { type: 'donut-gauge', label, measure: () => 0, draw: () => {} }
    if (subset.length === 1 && subset[0].kind === 'overflow') {
      return TextFlowSpec(ctx, {
        label: label || title, title: resolvedTitle(opts), text: subset[0].text,
        size: TYPE.bodySmall,
      })
    }
    const t = resolvedTitle(opts)
    const measure = (w) => {
      const innerW = w - 20
      const titleH = t ? ctx.measureText(t, innerW, { size: TYPE.subsection, font: FONTS.heading }) : 0
      const subtitleH = subtitle ? ctx.measureText(subtitle, innerW, { size: TYPE.label, font: FONTS.body, color: COLORS.muted }) : 0
      const legendH = slices.reduce((sum, slice) => (
        sum + ctx.measureText(`${fmt(slice.label)}  ${fmt(slice.value)}`, innerW * 0.52, { size: TYPE.bodySmall, font: FONTS.body }) + 5
      ), 0)
      const circle = Math.min(132, Math.max(96, w * 0.42))
      return 8 + titleH + (subtitle ? 3 + subtitleH : 0) + 8 + Math.max(circle, legendH) + 8
    }
    const draw = (frame) => {
      const innerX = frame.x + 10
      const innerW = frame.w - 20
      let cursor = frame.y + 5
      ctx.canvas.line(frame.x, frame.y, frame.x + frame.w, frame.y, { color: COLORS.line, width: HAIRLINE })
      if (t) cursor += ctx.text(t, innerX, cursor, innerW, { size: TYPE.subsection, font: FONTS.heading, color: COLORS.midnight }) + 2
      if (subtitle) cursor += ctx.text(subtitle, innerX, cursor, innerW, { size: TYPE.label, font: FONTS.body, color: COLORS.muted }) + 7
      else cursor += 5
      const radius = Math.min(58, Math.max(42, frame.w * 0.19)) - ringWidth / 2
      const cx = innerX + radius + ringWidth / 2 + 6
      const cy = cursor + radius + ringWidth / 2
      const total = slices.reduce((sum, slice) => sum + (Number(slice.value) || 0), 0) || 1
      ctx.canvas.arc(cx, cy, radius, -Math.PI / 2, Math.PI * 1.5, { color: COLORS.line, width: ringWidth })
      let angle = -Math.PI / 2
      slices.forEach((slice) => {
        const sweep = ((Number(slice.value) || 0) / total) * Math.PI * 2
        if (sweep > 0.001) ctx.canvas.arc(cx, cy, radius, angle, angle + sweep, { color: slice.color || accent, width: ringWidth })
        angle += sweep
      })
      if (centerValue) {
        ctx.text(centerValue, cx - 40, cy - 10, 80, {
          size: 17, font: FONTS.heading, color: COLORS.midnight, align: 'center', features: ['tnum'],
        })
      }
      if (centerLabel) {
        ctx.text(centerLabel, cx - 44, cy + 10, 88, {
          size: TYPE.label, font: FONTS.bodySemi, color: COLORS.muted, align: 'center', characterSpacing: 0.6,
        })
      }
      const legendX = innerX + radius * 2 + ringWidth + 24
      const legendW = Math.max(40, innerW - (legendX - innerX))
      let ly = cursor + 4
      slices.forEach((slice) => {
        ctx.canvas.rect(legendX, ly + 3, 7, 7, { fill: slice.color || accent, kind: 'shape', role: 'legend' })
        ly += ctx.text(`${fmt(slice.label)}  ${fmt(slice.value)}`, legendX + 12, ly, legendW - 12, {
          size: TYPE.bodySmall, font: FONTS.body, color: COLORS.ink,
        }) + 4
      })
    }
    return { type: 'donut-gauge', label: label || t || '', measure, draw }
  }
  const split = () => [{
    kind: 'overflow',
    text: [
      centerValue && `${centerLabel || 'Value'}: ${fmt(centerValue)}`,
      ...slices.map((slice) => `${fmt(slice.label)}  ·  ${fmt(slice.value)}`),
    ].filter(Boolean).join('\n') || '—',
  }]
  return chunkable({ type: 'donut-gauge', label: label || title || '', entries, build, split, continuationLabel: title || label })
}

export function DonutGauge(ctx, opts) {
  return flow(ctx, DonutGaugeSpec(ctx, opts), opts)
}

/* ------------------------------------------------------------------ *
 * Tables — measured rows, repeated headers
 * ------------------------------------------------------------------ */

function resolveWidths(columns, w) {
  const weights = columns.map((col) => Number(col.width) || 1)
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  return weights.map((weight) => (weight / sum) * w)
}

function cellTextOptions(col, value, row) {
  return {
    size: col.size || TYPE.table,
    font: col.font || FONTS.body,
    color: resolveColor(col.color, value, row, COLORS.ink),
    align: col.align || 'left',
    features: col.features,
    characterSpacing: col.characterSpacing || 0,
  }
}

function sourceTextOptions(col, row, part) {
  return {
    size: part === 'path' ? 7.5 : 8.2,
    font: part === 'path' ? FONTS.bodySemi : FONTS.body,
    color: part === 'path' ? COLORS.muted : COLORS.ink,
  }
}

function measureCell(ctx, col, row, value, cw) {
  if (col.render === 'source') {
    const record = value || {}
    const pathH = ctx.measureText(fmt(record.path), cw - 8, sourceTextOptions(col, row, 'path'))
    const valueH = ctx.measureText(fmt(record.value), cw - 8, sourceTextOptions(col, row, 'value'))
    return pathH + valueH + 2
  }
  const opts = cellTextOptions(col, fmt(value), row)
  const textH = ctx.measureText(fmt(value), cw - 8, opts)
  if (col.render === 'bar') return textH + 8
  if (col.render === 'pill') return ctx.measureText(fmt(value), cw - 15, { size: 8.2, font: FONTS.bodyBold }) + 2
  return textH
}

function drawCell(ctx, col, row, value, x, y, cw, ch, padding) {
  if (col.render === 'source') {
    const record = value || {}
    const pathOpts = sourceTextOptions(col, row, 'path')
    const valueOpts = sourceTextOptions(col, row, 'value')
    const pathH = ctx.text(fmt(record.path), x + 4, y + padding, cw - 8, pathOpts)
    ctx.text(fmt(record.value), x + 4, y + padding + pathH + 1, cw - 8, valueOpts)
    return
  }
  const text = fmt(value)
  const opts = cellTextOptions(col, text, row)
  if (col.render === 'pill') {
    const color = resolveColor(col.color, text, row, COLORS.indigo)
    ctx.canvas.rect(x + 4, y + padding + 4, 4, 4, { fill: color, kind: 'shape', role: 'marker' })
    ctx.text(text, x + 11, y + padding, cw - 15, {
      size: 8.2, font: FONTS.bodyBold, color,
    })
    return
  }
  const textH = ctx.text(text, x + 4, y + padding, cw - 8, opts)
  if (col.render === 'bar') {
    const numeric = Number(String(text).replace('%', '').trim()) || 0
    const color = resolveColor(col.color, text, row, COLORS.indigo)
    ProgressBar(ctx, {
      x: x + 4, y: y + padding + textH + 3, w: cw - 8, value: numeric, max: 100,
      color, height: 3,
    })
  }
}

function tableRowOverflowSpec(ctx, { row, columns, title, groupValue, index }) {
  const lines = columns.map((col) => {
    const value = row[col.key]
    if (col.render === 'source' && value && typeof value === 'object') {
      return `${col.label}: ${fmt(value.path)} — ${fmt(value.value)}`
    }
    return `${col.label}: ${fmt(value)}`
  })
  const heading = [title, groupValue && `${groupValue} · row ${index + 1}`].filter(Boolean).join('  ·  ')
  return TextFlowSpec(ctx, {
    label: heading || `Table row ${index + 1}`, title: heading, text: lines.join('\n'),
    size: TYPE.table, widthPadding: 16, paragraphGap: 2, topPad: 5, bottomPad: 6,
  })
}

export function MeasuredTable(ctx, {
  id, title = '', rows = [], columns = [], x = CONTENT.x, w = CONTENT.w,
  rowPadding = 3, fontSize = TYPE.table, zebra = true, header = true,
  groupKey = '', groupPrefix = '', topSpacing = 0, bottomSpacing = 8, keepWithNext = 0,
} = {}) {
  if (!rows.length) return null
  const widths = resolveWidths(columns, w)
  const headerH = header
    ? Math.max(16, ...columns.map((col, i) => ctx.measureText(String(col.label).toUpperCase(), widths[i] - 8, {
      size: 7.8, font: FONTS.bodySemi, characterSpacing: 0.2,
    }) + 5))
    : 0
  const rowSpecs = rows.map((row) => {
    const cellHeights = columns.map((col, i) => measureCell(ctx, col, row, row[col.key], widths[i]))
    return Math.max(18, ...cellHeights) + rowPadding * 2
  })
  const titleH = title ? ctx.measureText(title, w, { size: TYPE.label, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.7 }) + 4 : 0
  const tableId = id || `table-${Math.random().toString(36).slice(2)}`

  if (title) {
    ctx.component({
      type: 'table-title', label: title, x, w, topSpacing, bottomSpacing: 2,
      keepWithNext: Math.max(keepWithNext, headerH + (rowSpecs[0] || 0) + 8),
      measure: () => titleH,
      draw: (frame) => {
        ctx.text(title, frame.x, frame.y, frame.w, {
          size: TYPE.label, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.7,
        })
      },
    })
  }

  let headerOnPage = false
  let lastGroup = null
  const paintHeader = () => {
    if (!header) return null
    const result = ctx.component({
      type: 'table-header', tableId, x, w, bottomSpacing: 0,
      measure: () => headerH,
      draw: (frame) => {
        ctx.canvas.rect(frame.x, frame.y - 1, frame.w, 2, { fill: COLORS.midnight, audit: false })
        ctx.canvas.rect(frame.x, frame.y, frame.w, headerH - 2, { fill: COLORS.midnight, audit: false })
        ctx.canvas.rect(frame.x, frame.y, 2, headerH - 2, { fill: COLORS.indigo, audit: false })
        let cx = frame.x
        columns.forEach((col, i) => {
          ctx.text(String(col.label).toUpperCase(), cx + 4, frame.y + 2, widths[i] - 8, {
            size: 7.8, font: FONTS.bodySemi, color: COLORS.white,
            align: col.align || 'left', characterSpacing: 0.2,
          })
          cx += widths[i]
        })
      },
    })
    headerOnPage = true
    return result
  }

  rowSpecs.forEach((rowH, index) => {
    const row = rows[index]
    const groupValue = groupKey ? fmt(row[groupKey], '') : ''
    const groupChanged = groupKey && groupValue !== lastGroup
    const groupH = groupChanged ? ctx.measureText(`${groupPrefix}${groupValue}`, w, { size: TYPE.label, font: FONTS.bodyBold, color: COLORS.indigo, characterSpacing: 0.7 }) + 6 : 0
    const required = rowH + groupH
    const continuationReserve = CONTINUATION_H
    if (ctx.y + required + (headerOnPage ? 0 : headerH) + continuationReserve > CONTENT.bottom) {
      const broke = ctx.newPage()
      if (broke) ctx.drawContinuation(`${title || 'Table'} · continued`)
      headerOnPage = false
      lastGroup = null
    }
    if (!headerOnPage) paintHeader()
    if (groupChanged) {
      const groupResult = ctx.component({
        type: 'table-group', tableId, x, w, label: groupValue, bottomSpacing: 0,
        measure: () => groupH,
        draw: (frame) => {
          ctx.canvas.rect(frame.x, frame.y + 2, 2, 10, { fill: subjectColor(groupValue), audit: false })
          ctx.text(`${groupPrefix}${groupValue}`, frame.x + 10, frame.y, frame.w - 10, {
            size: TYPE.label, font: FONTS.bodyBold, color: COLORS.indigo, characterSpacing: 0.7,
          })
        },
      })
      if (groupResult?.pageChanged) {
        headerOnPage = false
        lastGroup = null
      }
      lastGroup = groupValue
    }
    const rowCapacity = CONTENT.h - headerH - CONTINUATION_H - 10
    if (rowH > rowCapacity + EPS) {
      const overflow = tableRowOverflowSpec(ctx, {
        row, columns, title, groupValue, index,
      })
      const pageBefore = ctx.currentPageIndex
      paginateSingle(ctx, overflow, {
        x, w, topSpacing: 0, bottomSpacing: 0, keepWithNext: 0,
        continuationLabel: `${title || 'Table'} · continued`,
      })
      if (ctx.currentPageIndex !== pageBefore) {
        headerOnPage = false
        lastGroup = null
      }
    } else {
      const rowResult = ctx.component({
        type: 'table-row', tableId, x, w, bottomSpacing: 0,
        allowSplit: true,
        measure: () => rowH,
        draw: (frame) => {
          if (zebra && index % 2 === 1) {
            ctx.canvas.rect(frame.x, frame.y, frame.w, frame.h, { fill: COLORS.paper, audit: false })
          }
          ctx.canvas.line(frame.x, frame.y, frame.x + frame.w, frame.y, { color: COLORS.line, width: 0.35 })
          let cx = frame.x
          columns.forEach((col, i) => {
            drawCell(ctx, col, row, row[col.key], cx, frame.y, widths[i], frame.h, rowPadding)
            cx += widths[i]
          })
        },
      })
      if (rowResult?.pageChanged) {
        headerOnPage = false
        lastGroup = null
      }
    }
  })
  ctx.y += bottomSpacing
  return tableId
}

export function StaticTableSpec(ctx, {
  label = '', title = '', rows = [], columns = [], rowPadding = 2.5, zebra = true, header = true,
} = {}) {
  const entries = rows.map((row, index) => ({
    kind: 'row', row: { ...row, __rowOffset: index }, index,
  }))
  const resolvedTitle = (opts = {}) => (opts.continuation && title ? `${title} · continued` : title)
  const build = (subset, opts = {}) => {
    const tableRows = subset.map((entry) => entry.row)
    const t = resolvedTitle(opts)
    const rowHeights = (w) => {
      const widths = resolveWidths(columns, w)
      return tableRows.map((row) => Math.max(
        18,
        ...columns.map((col, i) => measureCell(ctx, col, row, row[col.key], widths[i])),
      ) + rowPadding * 2)
    }
    const measure = (w) => {
      const widths = resolveWidths(columns, w)
      const headerH = header ? Math.max(16, ...columns.map((col, i) => ctx.measureText(String(col.label).toUpperCase(), widths[i] - 8, { size: 7.8, font: FONTS.bodySemi, characterSpacing: 0.2 }) + 5)) : 0
      const titleH = t ? ctx.measureText(t, w, { size: TYPE.label, font: FONTS.bodySemi, color: COLORS.indigo }) + 4 : 0
      return titleH + headerH + rowHeights(w).reduce((sum, h) => sum + h, 0)
    }
    const draw = (frame) => {
      const widths = resolveWidths(columns, frame.w)
      const heights = rowHeights(frame.w)
      let cursor = frame.y
      if (t) {
        cursor += ctx.text(t, frame.x, cursor, frame.w, { size: TYPE.label, font: FONTS.bodySemi, color: COLORS.indigo }) + 4
      }
      if (header) {
        const headerH = Math.max(16, ...columns.map((col, i) => ctx.measureText(String(col.label).toUpperCase(), widths[i] - 8, { size: 7.8, font: FONTS.bodySemi, characterSpacing: 0.2 }) + 5))
        ctx.canvas.rect(frame.x, cursor, frame.w, headerH, { fill: COLORS.midnight, audit: false })
        let hx = frame.x
        columns.forEach((col, i) => {
          ctx.text(String(col.label).toUpperCase(), hx + 4, cursor + 2, widths[i] - 8, {
            size: 7.8, font: FONTS.bodySemi, color: COLORS.white, align: col.align || 'left', characterSpacing: 0.2,
          })
          hx += widths[i]
        })
        cursor += headerH
      }
      tableRows.forEach((row, index) => {
        const rowH = heights[index]
        const visualIndex = row.__rowOffset ?? index
        if (zebra && visualIndex % 2 === 1) ctx.canvas.rect(frame.x, cursor, frame.w, rowH, { fill: COLORS.paper, audit: false })
        ctx.canvas.line(frame.x, cursor, frame.x + frame.w, cursor, { color: COLORS.line, width: 0.35 })
        let cx = frame.x
        columns.forEach((col, i) => {
          drawCell(ctx, col, row, row[col.key], cx, cursor, widths[i], rowH, rowPadding)
          cx += widths[i]
        })
        cursor += rowH
      })
    }
    return { type: 'static-table', label, measure, draw }
  }
  const split = (splitCtx, entry, w, maxHeight, opts) => {
    const widths = resolveWidths(columns, w)
    const fixed = build([], opts).measure(w)
    return splitRowEntry(splitCtx, entry.row, columns, widths, Math.max(12, maxHeight - fixed), rowPadding)
  }
  return chunkable({
    type: 'static-table', label, entries, build, split,
    continuationLabel: title || label,
  })
}

export function StaticTable(ctx, opts) {
  return flow(ctx, StaticTableSpec(ctx, opts), opts)
}

/* ------------------------------------------------------------------ *
 * Question intelligence
 * ------------------------------------------------------------------ */

function prepareSolution(ctx, source, fontSize, width, sourceLabel = '') {
  const renderer = new SolutionRenderer(ctx, { fontSize, maxWidth: width, sourceLabel })
  const lines = renderer.layout(source)
  return { renderer, lines, height: lines.reduce((sum, line) => sum + line.height, 0) }
}

function questionSource(question) {
  if (!question.questionText && !question.options.length) return '—'
  const parts = []
  parts.push(`Question: ${question.questionText || '—'}`)
  parts.push(`Options: ${question.options.length ? question.options.map((option, i) => `${String.fromCharCode(65 + i)} · ${option}`).join('   ') : '—'}`)
  return parts.join('\n')
}

function prepareQuestion(ctx, question, w) {
  const pad = 16
  const innerW = w - pad * 2
  const status = fmt(question.status)
  const accent = statusColor(status)
  const headerH = 26
  const metaItems = [
    ['Subject', question.subject], ['Chapter', question.chapter], ['Topic', question.topic],
    ['Difficulty', question.difficulty], ['Type', question.type], ['Status', status],
  ]
  const metaCols = equalColumns(3, 10, innerW, 0)
  const metaRows = []
  for (let i = 0; i < metaItems.length; i += 3) {
    let rowH = 0
    for (let j = 0; j < 3; j += 1) {
      const item = metaItems[i + j]
      if (!item) continue
      const cw = metaCols[j].w - 4
      const labelH = ctx.measureText(item[0].toUpperCase(), cw, { size: 7.8, font: FONTS.bodySemi, characterSpacing: 0.4 })
      const valueH = ctx.measureText(fmt(item[1]), cw, { size: TYPE.bodySmall, font: FONTS.bodySemi })
      rowH = Math.max(rowH, labelH + valueH + 2)
    }
    metaRows.push(rowH + 4)
  }
  const metaH = metaRows.reduce((a, b) => a + b, 0)

  const answerItems = [
    ['Student answer', question.selected], ['Correct answer', question.correct],
    ['Marks', question.marks], ['Time', question.time],
  ]
  const answerCols = equalColumns(4, 10, innerW, 0)
  let answerH = 0
  answerItems.forEach((item, i) => {
    const cw = answerCols[i].w - 4
    const labelH = ctx.measureText(item[0].toUpperCase(), cw, { size: 7.8, font: FONTS.bodySemi, characterSpacing: 0.4 })
    const valueH = ctx.measureText(fmt(item[1]), cw, { size: 10.4, font: FONTS.bodyBold, features: ['tnum'] })
    answerH = Math.max(answerH, labelH + valueH + 3)
  })

  const mistakeText = question.mistakeCategory && question.mistakeCategory !== '—'
    ? `Mistake category  ·  ${question.mistakeCategory}`
    : ''
  const mistakeH = mistakeText ? ctx.measureText(mistakeText, innerW, { size: TYPE.bodySmall, font: FONTS.bodySemi, color: COLORS.error }) + 5 : 0

  const qSource = questionSource(question)
  const questionText = prepareSolution(ctx, qSource, 9.4, innerW, question.q)
  const qLabelH = ctx.measureText('QUESTION / OPTIONS', innerW, { size: TYPE.label, font: FONTS.bodySemi, characterSpacing: 0.7 }) + 2
  const qBlockH = qLabelH + questionText.height + 4

  const parts = question.solutionParts.length
    ? question.solutionParts.map((part) => ({
      label: part.label,
      ...prepareSolution(ctx, part.text, 10.2, innerW, question.q),
    }))
    : [{ label: 'Explanation', ...prepareSolution(ctx, '—', 10.2, innerW, question.q) }]
  const solutionLabelH = ctx.measureText('SOLUTION / EXPLANATION', innerW, { size: TYPE.label, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.7 }) + 2
  const partsH = parts.reduce((sum, part) => (
    sum + ctx.measureText(part.label.toUpperCase(), innerW, { size: 7.8, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.4 }) + 2 + part.height + 3
  ), 0)
  const solutionH = 6 + solutionLabelH + partsH + 6

  const totalH = 6 + headerH + metaH + 4 + qBlockH + 4 + answerH + 3 + mistakeH + solutionH + 6
  const introH = 6 + headerH + metaH + 4 + qBlockH + 4 + answerH + 3 + mistakeH + 2
  return {
    question, pad, innerW, status, accent, headerH, metaItems, metaCols, metaRows, metaH,
    answerItems, answerCols, answerH, mistakeText, mistakeH, qSource, questionText, qLabelH, qBlockH,
    parts, solutionLabelH, solutionH, totalH, introH,
  }
}

function drawQuestionHeader(ctx, p, x, y, w) {
  ctx.canvas.rect(x, y + 3, 2.5, 20, { fill: p.accent, audit: false })
  ctx.text(p.question.q, x + 12, y, 52, {
    size: 15, font: FONTS.heading, color: COLORS.midnight, features: ['tnum'],
  })
  ctx.text(`${p.question.q}  ·  ${p.status}`, x + 70, y + 2, w - 175, {
    size: 11, font: FONTS.heading, color: COLORS.midnight,
  })
  Pill(ctx, {
    x: x + w - 92, y: y + 1, text: p.status, color: p.accent,
    soft: statusSoft(p.status), width: 88, size: 8,
  })
}

function drawQuestionIntro(ctx, p, frame, continuation = false) {
  const x = frame.x + p.pad
  const w = p.innerW
  let cursor = frame.y + 6
  drawQuestionHeader(ctx, p, x, cursor, w)
  cursor += p.headerH + 2
  if (continuation) {
    // The label itself is part of the reserved intro height.
    cursor += 2
  }
  for (let row = 0; row < p.metaRows.length; row += 1) {
    const rowH = p.metaRows[row]
    for (let col = 0; col < 3; col += 1) {
      const item = p.metaItems[row * 3 + col]
      if (!item) continue
      const c = p.metaCols[col]
      const cx = x + c.x
      const labelH = ctx.text(item[0].toUpperCase(), cx, cursor, c.w - 4, {
        size: 7.8, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.4,
      })
      ctx.text(fmt(item[1]), cx, cursor + labelH + 2, c.w - 4, {
        size: TYPE.bodySmall, font: FONTS.bodySemi, color: COLORS.ink,
      })
    }
    cursor += rowH
  }
  ctx.canvas.line(x, cursor - 2, x + w, cursor - 2, { color: COLORS.line, width: 0.4 })
  cursor += 4

  ctx.text('QUESTION / OPTIONS', x, cursor, w, {
    size: TYPE.label, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.7,
  })
  cursor += p.qLabelH
  p.questionText.renderer.maxWidth = w
  p.questionText.lines.forEach((line) => {
    p.questionText.renderer.drawLine(line, x, cursor, w)
    cursor += line.height
  })
  cursor += 4
  ctx.canvas.line(x, cursor - 2, x + w, cursor - 2, { color: COLORS.line, width: 0.4 })

  p.answerItems.forEach((item, i) => {
    const c = p.answerCols[i]
    const cx = x + c.x
    const labelH = ctx.text(item[0].toUpperCase(), cx, cursor, c.w - 4, {
      size: 7.8, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.4,
    })
    ctx.text(fmt(item[1]), cx, cursor + labelH + 2, c.w - 4, {
      size: 10.4, font: FONTS.bodyBold, color: i === 0 ? statusColor(p.status) : COLORS.midnight, features: ['tnum'],
    })
  })
  cursor += p.answerH + 3
  if (p.mistakeText) {
    ctx.canvas.rect(x, cursor + 3, 5, 5, { fill: COLORS.error, kind: 'shape', role: 'marker' })
    ctx.text(p.mistakeText, x + 10, cursor, w - 10, {
      size: TYPE.bodySmall, font: FONTS.bodySemi, color: COLORS.error,
    })
    cursor += p.mistakeH
  }
}

function drawSolutionBackground(ctx, x, y, w, h) {
  ctx.canvas.rect(x, y, w, h, { fill: COLORS.paper, audit: false })
  ctx.canvas.rect(x, y, 2.5, h, { fill: COLORS.indigo, audit: false })
}

function questionIntroOverflowSpec(ctx, p, question) {
  const lines = [
    `${question.q}  ·  ${p.status}`,
    `Subject: ${fmt(question.subject)}  ·  Chapter: ${fmt(question.chapter)}  ·  Topic: ${fmt(question.topic)}`,
    `Difficulty: ${fmt(question.difficulty)}  ·  Type: ${fmt(question.type)}  ·  Status: ${p.status}`,
    questionSource(question),
    `Student answer: ${fmt(question.selected)}  ·  Correct answer: ${fmt(question.correct)}`,
    `Marks: ${fmt(question.marks)}  ·  Time: ${fmt(question.time)}`,
    p.mistakeText,
  ].filter(Boolean)
  return TextFlowSpec(ctx, {
    label: `${question.q} · question statement`,
    title: `${fmt(question.subject)} · ${question.q} · question continued`,
    text: lines.join('\n'), size: TYPE.bodySmall, widthPadding: 18,
    paragraphGap: 3, topPad: 6, bottomPad: 8,
  })
}

export function QuestionCard(ctx, { question } = {}) {
  const p = prepareQuestion(ctx, question, CONTENT.w)
  const capacity = CONTENT.h - 16
  const remaining = CONTENT.bottom - ctx.y
  // Normal cards are kept together. An unusually long solution uses the
  // labelled continuation flow when the current page cannot hold the whole
  // card, instead of leaving a half-used page behind.
  const longCard = p.totalH > CONTENT.h * 0.52
  const keepTogether = p.totalH <= capacity && (!longCard || remaining >= p.totalH + 2)
  if (keepTogether) {
    return ctx.component({
      type: 'question-card', label: `${question.q} · complete`, allowSplit: false,
      bottomSpacing: 2,
      measure: () => p.totalH,
      draw: (frame) => {
        drawQuestionIntro(ctx, p, frame)
        const sy = frame.y + p.introH
        drawSolutionBackground(ctx, frame.x + p.pad, sy, p.innerW, p.solutionH)
        let cursor = sy + 6
        cursor += ctx.text('SOLUTION / EXPLANATION', frame.x + p.pad + 10, cursor, p.innerW - 20, {
          size: TYPE.label, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.7,
        }) + 2
        p.parts.forEach((part) => {
          cursor += ctx.text(part.label.toUpperCase(), frame.x + p.pad + 10, cursor, p.innerW - 20, {
            size: 7.8, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.4,
          }) + 2
          part.renderer.maxWidth = p.innerW - 20
          part.lines.forEach((line) => {
            part.renderer.drawLine(line, frame.x + p.pad + 10, cursor, p.innerW - 20)
            cursor += line.height
          })
          cursor += 3
        })
        ctx.canvas.line(frame.x, frame.y + frame.h - 2, frame.x + frame.w, frame.y + frame.h - 2, { color: COLORS.line, width: 0.4 })
      },
    })
  }

  // Unusually long solution: keep the question's identity, metadata and answer
  // comparison together, then flow the source solution with explicit labels.
  const introContinuation = `${fmt(question.subject)} · ${question.q} · question continued`
  const introCapacity = CONTENT.h - 34 - CONTINUATION_H - 8
  if (p.introH > introCapacity + EPS) {
    paginateSingle(ctx, questionIntroOverflowSpec(ctx, p, question), {
      w: CONTENT.w, x: CONTENT.x, topSpacing: 0, bottomSpacing: 0,
      keepWithNext: 34, continuationLabel: introContinuation,
    })
  } else {
    ctx.component({
      type: 'question-card-intro', label: `${question.q} · question statement`, allowSplit: false,
      keepWithNext: 34, bottomSpacing: 0, continuationLabel: introContinuation,
      measure: () => p.introH,
      draw: (frame) => drawQuestionIntro(ctx, p, frame),
    })
  }
  p.parts.forEach((part) => {
    ctx.component({
      type: 'solution-label', label: `${question.q} · ${part.label}`,
      continuationLabel: `${fmt(question.subject)} · ${question.q} · solution continued`,
      keepWithNext: 20, bottomSpacing: 0,
      measure: () => ctx.measureText(part.label.toUpperCase(), p.innerW - 20, {
        size: 7.8, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.4,
      }) + 5,
      draw: (frame) => {
        drawSolutionBackground(ctx, frame.x + p.pad, frame.y, p.innerW, frame.h)
        ctx.text(part.label.toUpperCase(), frame.x + p.pad + 10, frame.y + 3, p.innerW - 20, {
          size: 7.8, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.4,
        })
      },
    })
    part.renderer.maxWidth = p.innerW - 20
    part.lines.forEach((line, index) => {
      ctx.component({
        type: 'question-solution-line', label: `${question.q} · solution line ${index + 1}`,
        allowSplit: true,
        continuationLabel: `${fmt(question.subject)} · ${question.q} · solution continued`,
        bottomSpacing: index === part.lines.length - 1 ? 6 : 0,
        measure: () => line.height + 4,
        draw: (frame) => {
          drawSolutionBackground(ctx, frame.x + p.pad, frame.y, p.innerW, frame.h)
          part.renderer.drawLine(line, frame.x + p.pad + 10, frame.y + 2, p.innerW - 20)
        },
      })
    })
  })
  return { type: 'split-question-card', label: question.q }
}

/* ------------------------------------------------------------------ *
 * Revision + source register
 * ------------------------------------------------------------------ */

export function SubjectBand(ctx, { subject, index = 0, note = '', x = CONTENT.x, w = CONTENT.w, bottomSpacing = 7 } = {}) {
  const accent = subjectColor(subject, index)
  const measure = () => {
    const titleH = ctx.measureText(subject, w - 42, { size: 13, font: FONTS.heading })
    const noteH = note ? ctx.measureText(note, w - 42, { size: 8.5, font: FONTS.body, color: COLORS.muted }) : 0
    return 5 + titleH + (note ? 2 + noteH : 0) + 5
  }
  return ctx.component({
    type: 'subject-band', label: subject, x, w, bottomSpacing, keepWithNext: 30,
    measure,
    draw: (frame) => {
      ctx.canvas.rect(frame.x, frame.y + 3, 2.5, 16, { fill: accent, audit: false })
      ctx.text(String(index + 1).padStart(2, '0'), frame.x + 8, frame.y + 3, 24, {
        size: 9, font: FONTS.bodyBold, color: accent, features: ['tnum'],
      })
      const h = ctx.text(subject, frame.x + 36, frame.y, frame.w - 42, {
        size: 13, font: FONTS.heading, color: COLORS.midnight,
      })
      if (note) {
        ctx.text(note, frame.x + 36, frame.y + h + 1, frame.w - 42, {
          size: 8.5, font: FONTS.body, color: COLORS.muted,
        })
      }
      ctx.canvas.line(frame.x, frame.y + frame.h - 3, frame.x + frame.w, frame.y + frame.h - 3, { color: COLORS.line, width: 0.4 })
    },
  })
}

export function SourceRegister(ctx, { rows = [] } = {}) {
  if (!rows.length) return null
  const isLong = (row) => (
    String(row?.value ?? '').length > 80 || String(row?.path ?? '').length > 58
  )
  const shortRows = rows.filter((row) => !isLong(row))
  const longRows = rows.filter(isLong)
  const pack = (list, count) => {
    const packed = []
    for (let i = 0; i < list.length; i += count) {
      const record = {}
      for (let col = 0; col < count; col += 1) record[`col${col}`] = list[i + col] || null
      packed.push(record)
    }
    return packed
  }
  const sourceColumns = (count) => Array.from({ length: count }, (_, index) => ({
    key: `col${index}`, label: 'Source / value', width: 1, render: 'source',
  }))
  if (shortRows.length) {
    MeasuredTable(ctx, {
      id: 'source-register-short',
      title: `Source data register  ·  ${rows.length} canonical payload values`,
      rows: pack(shortRows, 4),
      columns: sourceColumns(4),
      rowPadding: 0.5,
      bottomSpacing: 6,
    })
  }
  if (longRows.length) {
    MeasuredTable(ctx, {
      id: 'source-register-extended',
      title: `Extended source values  ·  ${longRows.length} verbatim entries`,
      rows: pack(longRows, 2),
      columns: sourceColumns(2),
      rowPadding: 0.5,
      bottomSpacing: 8,
    })
  }
  return true
}
