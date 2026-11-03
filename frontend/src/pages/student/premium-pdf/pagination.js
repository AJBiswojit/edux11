/**
 * Content-driven pagination helpers for the Premium PDFKit engine.
 *
 * The original renderer measured a whole editorial component and reserved it
 * as one indivisible frame. That is correct for a short chart or table, but a
 * content-rich component can legitimately be taller than one A4 printable
 * area. These helpers split measured entries into page-sized renderable
 * segments using the existing component/spec drawing code — no font, margin,
 * typography or visual-design changes are made.
 *
 * A "chunkable" spec exposes `pagination.entries`, `pagination.build(subset,
 * options)` and, where a single entry can be taller than a page,
 * `pagination.split(...)`. `build` returns an ordinary static spec with
 * `measure(w)` and `draw(frame)`. All emitted text and geometry therefore
 * still come from the original Premium components.
 */

import { CONTENT } from './theme.js'

export const CONTINUATION_H = 18
export const EPS = 0.01

export function emptySpec(label = 'empty column') {
  return {
    type: 'empty', label,
    measure: () => 0,
    draw: () => {},
    pagination: {
      entries: [],
      build: () => emptySpec(label),
      fixed: () => 0,
      continuationLabel: label,
    },
  }
}

/**
 * Wrap a list of measured entries into an ordinary static spec. The returned
 * spec is compatible with the existing `flow()` / `EditorialColumns()` code.
 */
export function chunkable({ type, label, entries, build, split, continuationLabel }) {
  const full = (opts = {}) => build(entries, { continuation: false, chunkIndex: 0, ...opts })
  return {
    type,
    label,
    measure: (w) => full().measure(w),
    draw: (frame) => full().draw(frame),
    pagination: {
      entries,
      build,
      split,
      continuationLabel: continuationLabel || label,
      fixed: (w, opts = {}) => build([], opts).measure(w),
    },
  }
}

function clampHeight(spec, w) {
  const h = Math.max(0, Number(spec.measure(w)) || 0)
  return h
}

/**
 * Split text into line-boundary chunks that each fit inside `maxHeight`.
 * `makeEntry(chunkText, height, isContinuation)` converts each chunk back into
 * the caller's entry shape. Explicit paragraph gaps are preserved by joining
 * the selected lines with newlines and re-measuring with the same text opts.
 */
export function textChunkEntries(ctx, value, width, opts, maxHeight, makeEntry) {
  const source = String(value ?? '')
  const textOpts = { ...opts }
  const layout = ctx.textEngine.layout(source, width, textOpts)
  const boundaries = [0]
  layout.lines.forEach((line, index) => {
    const end = index + 1 < layout.lines.length
      ? layout.lines[index + 1].y
      : layout.height
    boundaries.push(end)
  })
  if (boundaries[boundaries.length - 1] < layout.height) boundaries.push(layout.height)
  const lineOpts = { ...textOpts, paragraphGap: 0 }
  const splitLongLine = (line) => {
    const chars = Array.from(line.text || '')
    if (!chars.length) return ['']
    const pieces = []
    let cursor = 0
    while (cursor < chars.length) {
      let low = cursor + 1
      let high = chars.length
      let best = cursor + 1
      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        const candidate = chars.slice(cursor, mid).join('')
        const h = ctx.textEngine.measure(candidate, width, lineOpts)
        if (h <= maxHeight + EPS) {
          best = mid
          low = mid + 1
        } else {
          high = mid - 1
        }
      }
      pieces.push(chars.slice(cursor, best).join(''))
      cursor = best
    }
    return pieces
  }
  const out = []
  let start = 0
  while (start < boundaries.length - 1) {
    let end = start + 1
    while (end < boundaries.length && boundaries[end] - boundaries[start] <= maxHeight + EPS) end += 1
    end = Math.max(start + 1, end - 1)
    if (boundaries[end] - boundaries[start] > maxHeight + EPS) {
      const line = layout.lines[start] || { text: '' }
      splitLongLine(line).forEach((piece, index) => {
        const h = ctx.textEngine.measure(piece, width, lineOpts)
        out.push(makeEntry(piece, h, start > 0 || index > 0))
      })
      start = end
      continue
    }
    const lineTexts = layout.lines.slice(start, end).map((line) => line.text)
    const chunkText = lineTexts.join('\n')
    const h = ctx.textEngine.measure(chunkText, width, textOpts)
    out.push(makeEntry(chunkText, h, start > 0))
    start = end
  }
  return out.length ? out : [makeEntry(source, ctx.textEngine.measure(source, width, textOpts), false)]
}

/**
 * Build page-sized chunks for one static spec. A chunk is an ordinary spec
 * whose measured height is guaranteed to be <= `maxHeight`.
 */
export function chunkSpec(ctx, spec, w, maxHeight, options = {}) {
  const p = spec.pagination
  if (!p) {
    const h = clampHeight(spec, w)
    if (h > maxHeight + EPS) {
      throw new Error(`Component height ${h.toFixed(2)} pt exceeds ${maxHeight.toFixed(2)} pt chunk capacity: ${spec.label || spec.type}`)
    }
    return [{ spec, height: h }]
  }
  const chunks = []
  let cursor = 0
  let chunkIndex = 0
  while (cursor < p.entries.length) {
    const continuation = chunkIndex > 0
    const buildOpts = {
      continuation,
      chunkIndex,
      continuationLabel: options.continuationLabel || p.continuationLabel || spec.label,
    }
    const fixed = Math.max(0, Number(p.fixed(w, buildOpts)) || 0)
    if (fixed > maxHeight + EPS) {
      throw new Error(`Component fixed height ${fixed.toFixed(2)} pt exceeds ${maxHeight.toFixed(2)} pt chunk capacity: ${spec.label || spec.type}`)
    }
    let subset = []
    let best = null
    let bestHeight = fixed
    let i = cursor
    while (i < p.entries.length) {
      const candidate = subset.concat([p.entries[i]])
      const candidateSpec = p.build(candidate, buildOpts)
      const candidateHeight = clampHeight(candidateSpec, w)
      if (candidateHeight > maxHeight + EPS) break
      subset = candidate
      best = candidateSpec
      bestHeight = candidateHeight
      i += 1
    }
    if (best && subset.length) {
      chunks.push({ spec: best, height: bestHeight })
      cursor = i
      chunkIndex += 1
      continue
    }

    // One indivisible entry is taller than the remaining page capacity. Ask
    // the owning spec to turn it into smaller, line-based entries.
    const entry = p.entries[cursor]
    const pieces = p.split ? p.split(ctx, entry, w, maxHeight, buildOpts) : null
    if (!pieces || !pieces.length) {
      throw new Error(`Component entry exceeds ${maxHeight.toFixed(2)} pt chunk capacity and cannot be split: ${spec.label || spec.type}`)
    }
    const builtPieces = p.build(pieces, buildOpts)
    const pieceSpec = builtPieces.pagination
      ? builtPieces
      : {
        ...spec,
        measure: (width) => builtPieces.measure(width),
        draw: (frame) => builtPieces.draw(frame),
        pagination: { ...p, entries: pieces },
      }
    const depth = Number(options.depth) || 0
    if (depth > 8) {
      throw new Error(`Pagination recursion limit reached while splitting ${spec.label || spec.type}`)
    }
    const subChunks = chunkSpec(ctx, pieceSpec, w, maxHeight, { ...options, depth: depth + 1 })
    if (subChunks.length === 1 && subChunks[0].height > maxHeight + EPS) {
      throw new Error(`Component entry remains ${subChunks[0].height.toFixed(2)} pt after splitting: ${spec.label || spec.type}`)
    }
    chunks.push(...subChunks)
    cursor += 1
    chunkIndex += subChunks.length
  }
  return chunks
}

/**
 * Flow one chunkable spec through as many pages as its content requires.
 * Used by standalone charts/tables/paragraphs; the same `ctx.component`
 * page-breaking and footer machinery is retained.
 */
function pageCapacity(ctx, { topSpacing = 0, bottomSpacing = 0, keepWithNext = 0 } = {}) {
  const full = CONTENT.h - topSpacing - bottomSpacing - keepWithNext - CONTINUATION_H
  const remaining = CONTENT.bottom - ctx.y - topSpacing - bottomSpacing - keepWithNext - CONTINUATION_H
  // Use a partially filled current page when there is meaningful room left;
  // otherwise let reserve start a fresh page instead of stranding a heading.
  if (remaining >= 140) return Math.min(full, Math.max(140, remaining))
  return full
}

export function paginateSingle(ctx, spec, opts = {}) {
  const w = opts.w || CONTENT.w
  const x = opts.x == null ? CONTENT.x : opts.x
  const topSpacing = Number(opts.topSpacing) || 0
  const bottomSpacing = Number(opts.bottomSpacing) || 0
  const keepWithNext = Number(opts.keepWithNext) || 0
  const continuationLabel = opts.continuationLabel || spec.pagination?.continuationLabel || spec.label || spec.type
  const capacity = pageCapacity(ctx, { topSpacing, bottomSpacing, keepWithNext })
  if (capacity <= 0) throw new Error('Pagination capacity is not positive')
  const chunks = chunkSpec(ctx, spec, w, capacity, { continuationLabel })
  const total = chunks.length
  chunks.forEach((chunk, index) => {
    ctx.component({
      type: spec.type,
      label: `${spec.label || spec.type}${index ? ' · continued' : ''}`,
      x, w,
      topSpacing: index === 0 ? topSpacing : 0,
      bottomSpacing: index === total - 1 ? bottomSpacing : 0,
      keepWithNext: index === total - 1 ? keepWithNext : 0,
      continuationLabel,
      allowSplit: true,
      continuation: index > 0,
      measure: () => chunk.height,
      draw: (frame) => chunk.spec.draw({ ...frame, w }),
    })
  })
  return total
}

/**
 * Split an oversized two-column editorial component into aligned page-sized
 * segments. `renderColumns` is supplied by `components.js` to avoid a circular
 * import; it calls the original `EditorialColumns` with `paginate:false`.
 */
export function paginateColumns(ctx, opts, specs, frames, heights, renderColumns) {
  const gap = Number(opts.gap) || 0
  const topSpacing = Number(opts.topSpacing) || 0
  const bottomSpacing = Number(opts.bottomSpacing) || 0
  const keepWithNext = Number(opts.keepWithNext) || 0
  const continuationLabel = opts.continuationLabel || opts.sectionTitle || opts.id || 'Editorial columns'
  const capacity = pageCapacity(ctx, { topSpacing, bottomSpacing, keepWithNext })
  if (capacity <= 0) throw new Error('Pagination capacity is not positive')
  const chunkLists = specs.map((spec, index) => (
    chunkSpec(ctx, spec, frames[index].w, capacity, { continuationLabel })
  ))
  const total = Math.max(...chunkLists.map((list) => list.length), 1)
  for (let index = 0; index < total; index += 1) {
    const columnSpecs = chunkLists.map((list, col) => (
      list[index]?.spec || emptySpec(`empty column ${col + 1}`)
    ))
    const segmentHeight = Math.max(
      ...chunkLists.map((list) => list[index]?.height || 0),
      0,
    )
    if (segmentHeight <= EPS) continue
    renderColumns({
      ...opts,
      id: `${opts.id || 'editorial-columns'}-segment-${index + 1}`,
      gap,
      columns: columnSpecs.map((spec) => () => spec),
      paginate: false,
      continuationLabel,
      sectionTitle: opts.sectionTitle,
      topSpacing: index === 0 ? topSpacing : 0,
      bottomSpacing: index === total - 1 ? bottomSpacing : 0,
      keepWithNext: index === total - 1 ? keepWithNext : 0,
      segmentHeight,
    })
  }
  return { chunks: total, capacity, continuationLabel, sourceHeights: heights }
}
