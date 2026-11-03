/**
 * Original examination figure placement.
 *
 * Figures keep their source aspect ratio and are never stretched, cropped or
 * recompressed. Each slot has a width/height limit so a diagram stays readable
 * on A4, and an optional shared height budget shrinks a group of figures
 * uniformly instead of letting one question consume a whole page.
 */

export const FIGURE_LIMITS = Object.freeze({
  statement: { maxWidth: 356, maxHeight: 250, minWidth: 130 },
  option: { maxWidth: 232, maxHeight: 118, minWidth: 104 },
  explanation: { maxWidth: 340, maxHeight: 210, minWidth: 120 },
})

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Compute the drawn size of one figure inside a slot.
 * `available` is the width of the column the figure lives in.
 */
export function measureFigure(asset, { field = 'statement', available = 356 } = {}) {
  if (!asset || !(asset.width > 0) || !(asset.height > 0)) return { w: 0, h: 0 }
  const limits = FIGURE_LIMITS[field] || FIGURE_LIMITS.statement
  const maxWidth = Math.max(40, Math.min(limits.maxWidth, available))
  // Crops are usually exported at 2x. Sizing at half the pixel width keeps
  // diagrams crisp; a small source image is never blown up past its min width
  // unless the column is narrower than that.
  const natural = asset.width * 0.5 + limits.minWidth * 0.5
  let width = clamp(natural, Math.min(limits.minWidth, maxWidth), maxWidth)
  let height = (width * asset.height) / asset.width
  if (height > limits.maxHeight) {
    const scale = limits.maxHeight / height
    width *= scale
    height = limits.maxHeight
  }
  return { w: Math.round(width * 100) / 100, h: Math.round(height * 100) / 100 }
}

/**
 * Lay out a stack of figures in one column, optionally under a total height
 * budget. Every figure in the group is scaled by the same factor so relative
 * sizes — and therefore the reading of the diagrams — stay consistent.
 */
export function layoutFigureStack(assets = [], {
  field = 'statement', available = 356, gap = 8, budget = Infinity,
} = {}) {
  const measured = assets.map((asset) => ({ asset, ...measureFigure(asset, { field, available }) }))
  const raw = measured.reduce((sum, item) => sum + item.h, 0) + gap * Math.max(0, measured.length - 1)
  if (!measured.length || !Number.isFinite(budget) || raw <= budget) {
    return { items: measured, height: Math.max(0, raw) }
  }
  const availableForFigures = Math.max(0, budget - gap * Math.max(0, measured.length - 1))
  const scale = Math.min(1, Math.max(0, fitScale(measured, availableForFigures)))
  const items = measured.map((item) => ({
    ...item,
    w: Math.round(item.w * scale * 100) / 100,
    h: Math.round(item.h * scale * 100) / 100,
    scaled: true,
  }))
  const height = items.reduce((sum, item) => sum + item.h, 0) + gap * Math.max(0, items.length - 1)
  return { items, height }
}

function fitScale(measured, availableHeight) {
  const heights = measured.reduce((sum, item) => sum + item.h, 0)
  return heights > 0 ? availableHeight / heights : 1
}

/** Draw a laid-out stack of figures centred in the column. */
export function drawFigureItems(ctx, items = [], x, y, available, {
  field = 'statement', gap = 8, role = 'figure', align = 'center',
} = {}) {
  let cursor = y
  items.forEach((item, index) => {
    if (!item.w || !item.h) return
    // Statement and explanation figures are centred like plates; an option
    // figure sits directly beside its letter so it cannot read as belonging to
    // a neighbouring option.
    const drawX = align === 'left' ? x : x + Math.max(0, (available - item.w) / 2)
    ctx.canvas.image(item.asset.bytes, drawX, cursor, item.w, item.h, {
      role,
      meta: {
        figureIndex: index,
        figureField: field,
        figureFormat: item.asset.format,
        figureConvertedFrom: item.asset.convertedFrom || null,
        figurePixels: `${item.asset.width}x${item.asset.height}`,
      },
    })
    cursor += item.h + gap
  })
  return Math.max(0, cursor - y - (items.length ? gap : 0))
}

/** Draw one figure given pre-measured dimensions. */
export function drawFigure(ctx, asset, x, y, w, h, { field = 'statement', role = 'figure' } = {}) {
  ctx.canvas.image(asset.bytes, x, y, w, h, {
    role,
    meta: { figureField: field, figureFormat: asset.format, figurePixels: `${asset.width}x${asset.height}` },
  })
}

export default { measureFigure, layoutFigureStack, drawFigureItems, drawFigure, FIGURE_LIMITS }
