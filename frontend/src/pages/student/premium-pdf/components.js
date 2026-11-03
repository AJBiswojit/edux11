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
import { layoutFigureStack, drawFigureItems } from './figures.js'
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
  if (!fmt(text) && !title) return emptySpec(label || 'empty text')
  const entries = fmt(text) ? [{ kind: 'text', text: fmt(text) }] : []
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
      opts: { size: TYPE.tableLabel, font: FONTS.bodyBold, color: resolveColor(col.color, text, row, COLORS.indigo) },
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
  // The Full Exam Analysis cover supplies its own art-directed branding.
  if (cover) return
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
    const reportLabel = ctx.kind === 'intelligence'
      ? 'EXAM INTELLIGENCE REPORT'
      : 'FULL EXAM ANALYSIS'
    ctx.text(reportLabel, rightX, frame.y + 4, rightW, {
      size: TYPE.tableLabel, font: FONTS.bodySemi, color: COLORS.muted,
      align: 'right', characterSpacing: 0.7, chrome: true, emit: false, role: 'header',
    })
    if (!cover) {
      ctx.text(ctx.model.examTitleShort, brandX, frame.y + 16, 260, {
        size: 8.2, font: FONTS.body, color: COLORS.muted,
        chrome: true, emit: false, role: 'header',
      })
      ctx.text(ctx.model.subjectText, rightX, frame.y + 16, rightW, {
        size: 8.2, font: FONTS.body, color: COLORS.muted,
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
  if (ctx.cover) return
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
    // The running header already carries the examination name; the footer
    // carries the reader instead, so no line is repeated verbatim on a page.
    ctx.text(ctx.model.who || ctx.model.examTitleShort, frame.x + 150, frame.y + 9, frame.w - 300, {
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
  // The full-analysis cover is intentionally numberless even though the
  // renderer revisits pages after the context has advanced to interior pages.
  if (ctx.cover || (ctx.kind === 'full' && ctx.currentPageIndex === 0)) return
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
    ctx.text(`End of report  ·  ${ctx.model.generatedDate}`, cx + 24, frame.y + 17, frame.w / 2 - 24, {
      size: 8, font: FONTS.body, color: COLORS.muted,
    })
  })
}

/* ------------------------------------------------------------------ *
 * Editorial primitives
 * ------------------------------------------------------------------ */

export function SectionHeading(ctx, {
  number, kicker, title, note = '', accent = COLORS.indigo,
  topSpacing = 4, bottomSpacing = 12, keepWithNext = 260,
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
    type: 'subsection-heading', label: title, topSpacing, bottomSpacing, keepWithNext: 170,
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
  if (!fmt(text) && !title) return null
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
  const label = fmt(text)
  if (!label) return { w: 0, h: 0 }
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
  const entries = items
    .filter((item) => fmt(item?.label) && fmt(item?.value))
    .map((item, index) => ({ kind: 'metric', item, index }))
  if (!entries.length) return emptySpec(label || 'empty metrics')
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
    text: segments.map((seg) => `${fmt(seg.label)}  ·  ${fmt(seg.value)}`).join('\n'),
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
    ].filter(Boolean).join('\n'),
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
  if (col.render === 'pill') return ctx.measureText(fmt(value), cw - 15, { size: TYPE.tableLabel, font: FONTS.bodyBold }) + 2
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
      size: TYPE.tableLabel, font: FONTS.bodyBold, color,
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
      const parts = [fmt(value.path), fmt(value.value)].filter(Boolean)
      return parts.length ? `${col.label}: ${parts.join(': ')}` : ''
    }
    const content = fmt(value)
    return content ? `${col.label}: ${content}` : ''
  }).filter(Boolean)
  const heading = [title, groupValue && `${groupValue} · row ${index + 1}`].filter(Boolean).join('  ·  ')
  return TextFlowSpec(ctx, {
    label: heading || `Table row ${index + 1}`, title: heading, text: lines.join('\n'),
    size: TYPE.table, widthPadding: 16, paragraphGap: 2, topPad: 5, bottomPad: 6,
  })
}

function hasTableValue(column, row) {
  const value = row?.[column.key]
  if (column.render === 'source' && value && typeof value === 'object') {
    return Boolean(fmt(value.path) || fmt(value.value))
  }
  return Boolean(fmt(value))
}

export function MeasuredTable(ctx, {
  id, title = '', rows = [], columns = [], x = CONTENT.x, w = CONTENT.w,
  rowPadding = 3, fontSize = TYPE.table, zebra = true, header = true,
  groupKey = '', groupPrefix = '', topSpacing = 0, bottomSpacing = 8, keepWithNext = 0,
} = {}) {
  if (!rows.length || !columns.length) return null
  // A grouped table already prints the group value as its band; repeating it in
  // a dedicated column on every row is pure noise.
  if (groupKey) columns = columns.filter((col) => col.key !== groupKey)
  rows = rows.filter((row) => columns.some((column) => hasTableValue(column, row)))
  if (!rows.length) return null
  columns = columns.filter((column) => rows.some((row) => hasTableValue(column, row)))
  if (!columns.length) return null
  const widths = resolveWidths(columns, w)
  const headerH = header
    ? Math.max(16, ...columns.map((col, i) => ctx.measureText(String(col.label).toUpperCase(), widths[i] - 8, {
      size: TYPE.tableLabel, font: FONTS.bodySemi, characterSpacing: 0.3,
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
      keepWithNext: Math.max(keepWithNext, headerH + (rowSpecs[0] || 0) + 44),
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
            size: TYPE.tableLabel, font: FONTS.bodySemi, color: COLORS.white,
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
      const headerH = header ? Math.max(16, ...columns.map((col, i) => ctx.measureText(String(col.label).toUpperCase(), widths[i] - 8, { size: TYPE.tableLabel, font: FONTS.bodySemi, characterSpacing: 0.3 }) + 5)) : 0
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
        const headerH = Math.max(16, ...columns.map((col, i) => ctx.measureText(String(col.label).toUpperCase(), widths[i] - 8, { size: TYPE.tableLabel, font: FONTS.bodySemi, characterSpacing: 0.3 }) + 5))
        ctx.canvas.rect(frame.x, cursor, frame.w, headerH, { fill: COLORS.midnight, audit: false })
        let hx = frame.x
        columns.forEach((col, i) => {
          ctx.text(String(col.label).toUpperCase(), hx + 4, cursor + 2, widths[i] - 8, {
            size: TYPE.tableLabel, font: FONTS.bodySemi, color: COLORS.white, align: col.align || 'left', characterSpacing: 0.2,
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

function present(value) {
  return fmt(value) !== ''
}

function questionNumber(question) {
  const index = Number(question?.index)
  if (Number.isFinite(index) && index > 0) {
    return String(index).padStart(index > 99 ? 3 : 2, '0')
  }
  return String(question?.numberLabel || '').replace(/^Q/i, '').padStart(2, '0')
}

/** One restrained metadata line: only the classifications the exam supplies. */
/** Mark weight as a reader would say it: 4 marks, 1 mark, 1 mark deducted. */
function marksLabel(value, { awarded = false } = {}) {
  const marks = Number(value)
  if (!Number.isFinite(marks)) return ''
  const magnitude = Math.abs(marks)
  const unit = `${magnitude} ${magnitude === 1 ? 'mark' : 'marks'}`
  if (marks < 0) return awarded ? `${unit} deducted` : `−${unit}`
  return unit
}

function questionMetaLine(question) {
  const parts = []
  if (present(question.chapter)) parts.push(question.chapter)
  if (present(question.topic) && question.topic !== question.chapter) parts.push(question.topic)
  if (present(question.difficulty)) parts.push(question.difficulty)
  if (present(question.type)) parts.push(question.type)
  const marks = marksLabel(question.marks)
  if (marks) parts.push(marks)
  if (present(question.time)) parts.push(question.time)
  return parts.join('   ·   ')
}

function responseLabel(value, status = '') {
  if (present(value)) return String(value)
  return /skip|unattempt|not visited/i.test(String(status)) ? 'Not attempted' : ''
}

function optionFigureLayout(question, option, width, budget) {
  // Option figures are attached to the question's media map by option label,
  // which is what keeps a figure bound to its own option.
  const assets = question?.media?.options?.[option?.label] || option?.media || []
  if (!assets.length) return { items: [], height: 0 }
  return layoutFigureStack(assets, { field: 'option', available: width, gap: 7, budget })
}

function prepareQuestion(ctx, question, w) {
  const pad = 18
  const innerW = w - pad * 2
  const status = fmt(question.status)
  const accent = statusColor(status)
  const title = `QUESTION ${questionNumber(question)}`
  const subject = present(question.subject) ? String(question.subject).toUpperCase() : ''

  const headerH = 22
  const metaText = questionMetaLine(question)
  const metaH = metaText ? ctx.measureText(metaText, innerW, { size: 9.2, font: FONTS.body }) + 6 : 0

  const statement = question.statement
    ? prepareSolution(ctx, question.statement, 10.6, innerW, question.q)
    : null
  const statementH = statement ? statement.height + 5 : 0

  const statementNote = ''
  const statementNoteH = 0

  const statementFigures = layoutFigureStack(question.media?.statement || [], {
    field: 'statement', available: innerW, gap: 9, budget: 296,
  })
  const statementFigureH = statementFigures.items.length ? statementFigures.height + 6 : 0

  const isSkipped = /skip|unattempt|not visited/i.test(status)
  const rawOptions = question.optionItems?.length
    ? question.optionItems
    : (question.options || []).map((option, index) => ({
      label: String.fromCharCode(65 + index),
      text: typeof option === 'string' ? option : '',
      media: [],
    }))
  const optionCount = rawOptions.length
  const imageOptions = rawOptions.filter((option) => (
    question?.media?.options?.[option.label] || option.media || []
  ).length).length
  const perOptionBudget = imageOptions ? Math.min(118, 264 / imageOptions) : 0
  const optionBlocks = rawOptions.map((option) => {
    const textWidth = innerW - 22
    const textH = option.text
      ? ctx.measureText(option.text, textWidth, { size: 10.2, font: FONTS.body, lineHeight: 14.2 })
      : 0
    const figures = optionFigureLayout(question, option, textWidth, perOptionBudget)
    return {
      option,
      textH,
      figures,
      height: Math.max(15, textH) + (figures.items.length ? 4 + figures.height : 0),
    }
  })
  const optionsH = optionCount
    ? ctx.measureText('OPTIONS', innerW, { size: 8.6, font: FONTS.bodySemi, characterSpacing: 0.8 }) + 5
      + optionBlocks.reduce((sum, block) => sum + block.height + 6, 0)
    : 0

  const responseEntries = []
  if (present(question.selected)) responseEntries.push({ label: 'STUDENT RESPONSE', value: String(question.selected), color: statusColor(status) })
  else if (isSkipped) responseEntries.push({ label: 'STUDENT RESPONSE', value: 'Not attempted', color: COLORS.warning })
  if (present(question.correct)) responseEntries.push({ label: 'CORRECT ANSWER', value: String(question.correct), color: COLORS.midnight })
  const responseH = responseEntries.length ? 36 : 0
  const awarded = marksLabel(question.marks, { awarded: true })
  const outcome = isSkipped
    ? 'Not attempted — no marks awarded'
    : /incorrect|wrong/i.test(status)
      ? `Answered incorrectly${awarded ? ` — ${awarded}` : ''}`
      : /correct/i.test(status)
        ? `Answered correctly${awarded ? ` — ${awarded}` : ''}`
        : status ? `${status}${awarded ? ` — ${awarded}` : ''}` : ''
  const insightText = [
    outcome,
    present(question.mistakeCategory) ? question.mistakeCategory : null,
    present(question.mistakeNote) ? question.mistakeNote : null,
  ].filter(Boolean).join('   ·   ')
  // The insight can wrap (a mistake note is a full sentence), so it is
  // measured rather than given a fixed height.
  const insightH = insightText ? 12 + ctx.measureText(insightText, innerW, { size: 9.6, font: FONTS.body }) : 0

  const explanationParts = question.explanationParts?.length
    ? question.explanationParts
    : String(question.explanation ?? '').trim() ? [{ label: 'Explanation', text: question.explanation }] : []
  const parts = explanationParts.map((part) => ({
    label: part.label,
    ...prepareSolution(ctx, part.text, 10.2, innerW - 24, question.q),
  }))
  const showPartLabels = parts.length > 1 && parts.some((part, index) => (
    index > 0 && String(part.label || '').toLowerCase() !== 'explanation'
  ))
  const PART_LABELS = showPartLabels
  const partsH = parts.reduce((sum, part, index) => (
    sum + (PART_LABELS && index > 0 ? ctx.measureText(part.label.toUpperCase(), innerW - 24, {
      size: TYPE.tableLabel, font: FONTS.bodySemi, characterSpacing: 0.5,
    }) + 3 : 0) + part.height + 5
  ), 0)
  const explanationFigures = layoutFigureStack(question.media?.explanation || [], {
    field: 'explanation', available: innerW - 24, gap: 8, budget: 210,
  })
  const explanationFigureH = explanationFigures.items.length ? explanationFigures.height + 8 : 0
  const hasSolution = parts.length > 0 || explanationFigures.items.length > 0
  const solutionH = hasSolution ? 12 + 16 + partsH + explanationFigureH + 8 : 0

  const introH = pad + headerH + metaH + statementH + statementNoteH + statementFigureH
    + optionsH + responseH + insightH
  const totalH = introH + solutionH + pad

  return {
    question, pad, innerW, status, accent, title, subject, headerH,
    metaText, metaH, statement, statementH, statementNote, statementNoteH,
    statementFigures, statementFigureH,
    optionBlocks, optionsH, responseEntries, responseH, insightText, insightH, isSkipped,
    parts, showPartLabels, hasSolution, solutionH,
    explanationFigures,
    totalH, introH,
  }
}

function drawQuestionHeader(ctx, p, x, y, w) {
  ctx.canvas.rect(x, y + 1, 3, 20, { fill: p.accent, audit: false })
  const titleW = ctx.textEngine.measureRun(p.title, FONTS.heading, 14)
  ctx.text(p.title, x + 12, y, Math.min(w - 12, titleW + 2), {
    size: 14, font: FONTS.heading, color: COLORS.midnight,
  })
  if (p.subject) {
    ctx.text(p.subject, x + 12 + titleW + 10, y + 4, Math.max(40, w - titleW - 118), {
      size: 10, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.6,
    })
  }
  if (p.status && p.status !== '—') {
    ctx.text(String(p.status).toUpperCase(), x + w - 112, y + 4, 112, {
      size: 8.6, font: FONTS.bodySemi, color: p.accent,
      align: 'right', characterSpacing: 0.7,
    })
  }
}

function drawOptions(ctx, p, x, cursor) {
  if (!p.optionBlocks.length) return cursor
  cursor += ctx.text('OPTIONS', x, cursor, p.innerW, {
    size: 8.6, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.8,
  }) + 5
  p.optionBlocks.forEach((block) => {
    const { option, textH, figures } = block
    const textWidth = p.innerW - 22
    ctx.text(`${option.label}.`, x, cursor, 20, {
      size: 10.6, font: FONTS.bodyBold, color: COLORS.midnight,
    })
    let textCursor = cursor
    if (option.text) {
      textCursor += ctx.text(option.text, x + 22, cursor, textWidth, {
        size: 10.2, font: FONTS.body, color: COLORS.ink, lineHeight: 14.2,
      })
    }
    let blockBottom = Math.max(cursor + Math.max(15, textH), textCursor)
    if (figures.items.length) {
      // An image-only option keeps the letter on the same baseline row as its
      // figure instead of leaving a bare "A." above a stranded picture.
      const figureTop = option.text ? blockBottom + 4 : cursor
      const drawn = drawFigureItems(ctx, figures.items, x + 22, figureTop, textWidth, {
        field: 'option', gap: 7, role: 'option-figure', align: 'left',
      })
      blockBottom = Math.max(blockBottom, figureTop + drawn)
    }
    cursor = blockBottom + 6
  })
  return cursor
}

function drawResponse(ctx, p, x, cursor) {
  if (!p.responseEntries.length) return cursor
  const start = cursor
  const columnW = p.innerW / p.responseEntries.length
  ctx.canvas.line(x, cursor, x + p.innerW, cursor, { color: COLORS.line, width: 0.4 })
  cursor += 6
  p.responseEntries.forEach((entry, index) => {
    const cx = x + index * columnW
    ctx.text(entry.label, cx, cursor, columnW - 10, {
      size: 8.4, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.6,
    })
    ctx.text(entry.value, cx, cursor + 12, columnW - 10, {
      size: 12, font: FONTS.bodyBold, color: entry.color, features: ['tnum'],
    })
  })
  return start + p.responseH
}

function drawInsight(ctx, p, x, cursor) {
  if (!p.insightText) return cursor
  ctx.text('PERFORMANCE INSIGHT', x, cursor, p.innerW, {
    size: 8.4, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.6,
  })
  ctx.text(p.insightText, x, cursor + 12, p.innerW, {
    size: 9.6, font: FONTS.body, color: COLORS.ink,
  })
  return cursor + p.insightH
}

function drawQuestionIntro(ctx, p, frame) {
  const x = frame.x + p.pad
  let cursor = frame.y + p.pad
  drawQuestionHeader(ctx, p, x, cursor, p.innerW)
  cursor += p.headerH
  if (p.metaText) {
    cursor += ctx.text(p.metaText, x, cursor, p.innerW, {
      size: 9.2, font: FONTS.body, color: COLORS.muted,
    }) + 6
  }
  if (p.statement) {
    p.statement.renderer.maxWidth = p.innerW
    p.statement.lines.forEach((line) => {
      p.statement.renderer.drawLine(line, x, cursor, p.innerW)
      cursor += line.height
    })
    cursor += 5
  } else if (p.statementNote) {
    cursor += ctx.text(p.statementNote, x, cursor, p.innerW, {
      size: 9.2, font: FONTS.body, color: COLORS.muted,
    }) + 8
  }
  if (p.statementFigures.items.length) {
    cursor += drawFigureItems(ctx, p.statementFigures.items, x, cursor, p.innerW, {
      field: 'statement', gap: 9, role: 'question-figure',
    }) + 6
  }
  cursor = drawOptions(ctx, p, x, cursor)
  cursor = drawResponse(ctx, p, x, cursor)
  cursor = drawInsight(ctx, p, x, cursor)
  return cursor
}

function drawSolutionLabel(ctx, x, y, w, accent = COLORS.indigo) {
  ctx.canvas.rect(x, y, 2.5, 13, { fill: accent, audit: false })
  ctx.text('EXPLANATION', x + 10, y + 1, w - 10, {
    size: 9.4, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.8,
  })
}

function drawSolutionBackground(ctx, x, y, w, h) {
  ctx.canvas.rect(x, y, w, h, { fill: COLORS.paper, audit: false })
}

function drawExplanationParts(ctx, p, x, cursor, width) {
  p.parts.forEach((part, index) => {
    const labelled = p.showPartLabels && index > 0
    if (labelled) {
      cursor += ctx.text(String(part.label).toUpperCase(), x, cursor, width, {
        size: TYPE.tableLabel, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.5,
      }) + 3
    }
    part.renderer.maxWidth = width
    part.lines.forEach((line) => {
      part.renderer.drawLine(line, x, cursor, width)
      cursor += line.height
    })
    cursor += 5
  })
  return cursor
}

function questionIntroOverflowSpec(ctx, p, question) {
  const lines = []
  if (p.metaText) lines.push(p.metaText)
  if (p.statement) lines.push(question.statement)
  const textOptions = p.optionBlocks.filter((block) => block.option.text)
  if (textOptions.length) {
    lines.push('OPTIONS')
    textOptions.forEach((block) => {
      lines.push(`${block.option.label}. ${block.option.text}`)
    })
  }
  const response = responseLabel(question.selected, p.status)
  const correct = present(question.correct) ? String(question.correct) : ''
  if (response) lines.push(`Student response: ${response}`)
  if (correct) lines.push(`Correct answer: ${correct}`)
  if (p.insightText) lines.push(p.insightText)
  return TextFlowSpec(ctx, {
    label: `${question.q} · question statement`,
    title: `${p.title}${p.subject ? `  ·  ${p.subject}` : ''}`,
    text: lines.join('\n'), size: TYPE.bodySmall, widthPadding: 20,
    paragraphGap: 4, topPad: 8, bottomPad: 10,
  })
}

/**
 * Image-only answer choices on a question whose intro overflowed a page.
 *
 * Each letter sits on the same row as its own figure, two choices per row, so
 * the figure can never read as belonging to the next option. Rendering four
 * separate full-width stacks instead wasted half the page per question.
 */
function optionFigureBoard(ctx, p, question) {
  const gapX = 18
  const gapY = 10
  const colW = (CONTENT.w - 36 - gapX) / 2
  const cells = p.optionBlocks
    .filter((block) => block.figures.items.length)
    .map((block) => ({
      label: block.option.label,
      layout: layoutFigureStack(
        question?.media?.options?.[block.option.label] || [],
        { field: 'option', available: colW - 26, gap: 6, budget: 150 },
      ),
    }))
  // When the choices also carry text, the flow above already printed them, so
  // the board is introduced as the figures for those choices rather than as a
  // second list of options.
  const hasTextOptions = p.optionBlocks.some((block) => block.option.text)
  const boardLabel = hasTextOptions ? 'OPTION FIGURES' : 'OPTIONS'
  const labelH = ctx.measureText(boardLabel, CONTENT.w - 36, {
    size: 8.6, font: FONTS.bodySemi, characterSpacing: 0.8,
  }) + 5
  const rows = Math.ceil(cells.length / 2)
  const rowTops = Array.from({ length: rows }, (_, row) => {
    const rowCells = cells.slice(row * 2, row * 2 + 2)
    return Math.max(...rowCells.map((cell) => cell.layout.height))
  })
  const height = rowTops.reduce((sum, value) => sum + value, 0) + gapY * Math.max(0, rows - 1)
  return ctx.component({
    type: 'option-figure-board',
    label: `${question.q} · option figures`,
    continuationLabel: `${fmt(question.subject)} · ${question.q} · options continued`,
    bottomSpacing: 8,
    measure: () => height + labelH + 4,
    draw: (frame) => {
      ctx.text(boardLabel, frame.x + 18, frame.y + 2, CONTENT.w - 36, {
        size: 8.6, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.8,
      })
      frame = { ...frame, y: frame.y + labelH }
      let cursor = frame.y + 2
      cells.forEach((cell, index) => {
        const row = Math.floor(index / 2)
        const column = index % 2
        const rowTop = frame.y + 2
          + rowTops.slice(0, row).reduce((sum, value) => sum + value + gapY, 0)
        const x = frame.x + 18 + column * (colW + gapX)
        ctx.text(`${cell.label}.`, x, rowTop, 20, {
          size: 10.6, font: FONTS.bodyBold, color: COLORS.midnight,
        })
        drawFigureItems(ctx, cell.layout.items, x + 22, rowTop, colW - 22, {
          field: 'option', gap: 6, role: 'option-figure', align: 'left',
        })
        if (column === 1) cursor = rowTop + rowTops[row] + gapY
      })
      return cursor
    },
  })
}

/** Figure components used when a question's intro is taller than one page. */
function renderIntroFigures(ctx, p, question) {
  const groups = []
  if (p.statementFigures.items.length) {
    groups.push({ field: 'statement', items: p.statementFigures.items, role: 'question-figure' })
  }
  groups.forEach((group) => {
    const gap = group.field === 'statement' ? 9 : 7
    ctx.component({
      type: 'question-figure-group',
      label: group.label || `${question.q} · figure`,
      bottomSpacing: 8,
      continuationLabel: `${question.q} · figure continued`,
      measure: () => group.items.reduce((sum, item) => sum + item.h, 0) + gap * Math.max(0, group.items.length - 1) + 4,
      draw: (frame) => {
        drawFigureItems(ctx, group.items, frame.x + 18, frame.y + 2, CONTENT.w - 36, {
          field: group.field, gap, role: group.role,
        })
      },
    })
  })
  // Statement figures are placed before the answer choices, matching the
  // reading order of an examination question.
  if (p.optionBlocks.some((block) => block.figures.items.length)) {
    optionFigureBoard(ctx, p, question)
  }
}

/**
 * Height a question card will occupy. Callers use it to keep a subject band
 * with its first question instead of stranding the band at a page foot.
 */
export function measureQuestionCard(ctx, question) {
  return prepareQuestion(ctx, question, CONTENT.w).totalH
}

export function QuestionCard(ctx, { question } = {}) {
  const p = prepareQuestion(ctx, question, CONTENT.w)
  ctx.renderedQuestions?.push(question.index)
  const capacity = CONTENT.h - 16
  const remaining = CONTENT.bottom - ctx.y
  const longCard = p.totalH > CONTENT.h * 0.52
  const keepTogether = p.totalH <= capacity && (!longCard || remaining >= p.totalH + 2)

  if (keepTogether) {
    return ctx.component({
      type: 'question-card', label: `${question.q} · complete`, allowSplit: false,
      bottomSpacing: 4,
      measure: () => p.totalH,
      draw: (frame) => {
        drawQuestionIntro(ctx, p, frame)
        if (p.hasSolution) {
          const sy = frame.y + p.introH
          const innerPad = 12
          drawSolutionBackground(ctx, frame.x + p.pad, sy, p.innerW, p.solutionH)
          let cursor = sy + innerPad
          drawSolutionLabel(ctx, frame.x + p.pad + 12, cursor, p.innerW - 24)
          cursor += 16
          cursor = drawExplanationParts(ctx, p, frame.x + p.pad + 12, cursor, p.innerW - 24)
          if (p.explanationFigures.items.length) {
            drawFigureItems(ctx, p.explanationFigures.items, frame.x + p.pad + 12, cursor, p.innerW - 24, {
              field: 'explanation', gap: 8, role: 'explanation-figure',
            })
          }
        }
        ctx.canvas.line(frame.x, frame.y + frame.h - 4, frame.x + frame.w, frame.y + frame.h - 4, {
          color: COLORS.line, width: 0.4,
        })
      },
    })
  }

  // Long question: keep the identity, statement, figures, options and answer
  // comparison together, then flow the explanation with explicit labels.
  const introContinuation = `${fmt(question.subject)} · ${question.q} · question continued`
  const introCapacity = CONTENT.h - 34 - CONTINUATION_H - 8
  if (p.introH > introCapacity) {
    paginateSingle(ctx, questionIntroOverflowSpec(ctx, p, question), {
      w: CONTENT.w, x: CONTENT.x, topSpacing: 0, bottomSpacing: 10,
      keepWithNext: 34, continuationLabel: introContinuation,
    })
    renderIntroFigures(ctx, p, question)
  } else {
    ctx.component({
      type: 'question-card-intro', label: `${question.q} · question statement`, allowSplit: false,
      keepWithNext: 40, bottomSpacing: 0, continuationLabel: introContinuation,
      measure: () => p.introH,
      draw: (frame) => drawQuestionIntro(ctx, p, frame),
    })
  }
  if (p.hasSolution) {
  ctx.component({
    type: 'solution-label', label: `${question.q} · explanation`,
    continuationLabel: `${fmt(question.subject)} · ${question.q} · explanation continued`,
    keepWithNext: 20, bottomSpacing: 0,
    measure: () => 20,
    draw: (frame) => {
      drawSolutionBackground(ctx, frame.x + p.pad, frame.y, p.innerW, frame.h)
      drawSolutionLabel(ctx, frame.x + p.pad + 12, frame.y + 4, p.innerW - 24)
    },
  })
  p.parts.forEach((part, index) => {
    if (p.showPartLabels && index > 0) {
      ctx.component({
        type: 'solution-label', label: `${question.q} · ${part.label}`,
        continuationLabel: `${fmt(question.subject)} · ${question.q} · explanation continued`,
        keepWithNext: 20, bottomSpacing: 0,
        measure: () => ctx.measureText(part.label.toUpperCase(), p.innerW - 24, {
          size: TYPE.tableLabel, font: FONTS.bodySemi, characterSpacing: 0.5,
        }) + 5,
        draw: (frame) => {
          drawSolutionBackground(ctx, frame.x + p.pad, frame.y, p.innerW, frame.h)
          ctx.text(part.label.toUpperCase(), frame.x + p.pad + 12, frame.y + 2, p.innerW - 24, {
            size: TYPE.tableLabel, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.5,
          })
        },
      })
    }
    part.renderer.maxWidth = p.innerW - 24
    part.lines.forEach((line, index) => {
      ctx.component({
        type: 'question-solution-line', label: `${question.q} · explanation line ${index + 1}`,
        allowSplit: true,
        continuationLabel: `${fmt(question.subject)} · ${question.q} · explanation continued`,
        bottomSpacing: index === part.lines.length - 1 ? 4 : 0,
        measure: () => line.height + 4,
        draw: (frame) => {
          drawSolutionBackground(ctx, frame.x + p.pad, frame.y, p.innerW, frame.h)
          part.renderer.drawLine(line, frame.x + p.pad + 12, frame.y + 2, p.innerW - 24)
        },
      })
    })
  })
  if (p.explanationFigures.items.length) {
    p.explanationFigures.items.forEach((item) => {
      ctx.component({
        type: 'explanation-figure', label: `${question.q} · explanation figure`,
        continuationLabel: `${fmt(question.subject)} · ${question.q} · explanation continued`,
        bottomSpacing: 6,
        measure: () => item.h + 8,
        draw: (frame) => {
          drawSolutionBackground(ctx, frame.x + p.pad, frame.y, p.innerW, frame.h)
          drawFigureItems(ctx, [item], frame.x + p.pad + 12, frame.y + 4, p.innerW - 24, {
            field: 'explanation', role: 'explanation-figure',
          })
        },
      })
    })
  }
  }
  return { type: 'split-question-card', label: question.q }
}

/* ------------------------------------------------------------------ *
 * Revision + source register
 * ------------------------------------------------------------------ */

export function SubjectBand(ctx, { subject, index = 0, note = '', x = CONTENT.x, w = CONTENT.w, bottomSpacing = 7, keepWithNext = 210 } = {}) {
  const accent = subjectColor(subject, index)
  const measure = () => {
    const titleH = ctx.measureText(subject, w - 42, { size: 13, font: FONTS.heading })
    const noteH = note ? ctx.measureText(note, w - 42, { size: 8.5, font: FONTS.body, color: COLORS.muted }) : 0
    return 5 + titleH + (note ? 2 + noteH : 0) + 5
  }
  return ctx.component({
    // A subject band must never close a page on its own: the reserve covers the
    // opening of the first question under it, or the whole card when it fits a
    // page (the caller measures it).
    type: 'subject-band', label: subject, x, w, bottomSpacing, keepWithNext,
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
