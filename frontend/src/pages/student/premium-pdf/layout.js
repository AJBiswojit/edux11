/**
 * V2 measurement-driven layout engine.
 *
 * A component declares its required width and height through a measure()
 * function. The cursor reserves exactly that height (plus declared top and
 * bottom spacing), creates an audited boundary, draws inside it, and then
 * records the actual height derived from every rendered box. Nested
 * components are tracked as a containment tree; page chrome is fixed and
 * never shares the content cursor.
 *
 * No component is allowed to draw beyond its frame. The resulting manifest
 * is consumed by scripts/verify_report_pdfs.py for independent geometric
 * validation against the rendered PDF.
 */

import { A4, CONTENT, FOOTER, PAGE, COLORS, FONTS, TYPE, isPresentIn, normalizeForMatch } from './theme.js'
import { TextEngine } from './text.js'
import { drawHeader, drawFooter, drawPageTotal } from './components.js'

const EPS = 0.5

function round(value) {
  return Math.round(Number(value || 0) * 100) / 100
}

function intersection(a, b) {
  const x0 = Math.max(a.x, b.x)
  const y0 = Math.max(a.y, b.y)
  const x1 = Math.min(a.x + a.w, b.x + b.w)
  const y1 = Math.min(a.y + a.h, b.y + b.h)
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) }
}

function overlaps(a, b, eps = EPS) {
  const i = intersection(a, b)
  return i.w > eps && i.h > eps
}

function boxOf(node) {
  return { x: node.x, y: node.y, w: node.w, h: node.h }
}

export class Canvas {
  constructor(ctx) {
    this.ctx = ctx
  }

  get doc() {
    return this.ctx.doc
  }

  textRun(text, x, y, opts = {}) {
    const font = opts.font || FONTS.body
    const size = Number(opts.size) || TYPE.body
    const characterSpacing = opts.characterSpacing || 0
    const drawOptions = { lineBreak: false, characterSpacing }
    if (opts.features) drawOptions.features = opts.features
    this.doc.save()
    this.doc.font(font).fontSize(size).fillColor(opts.color || COLORS.ink)
    this.doc.text(text, x, y, drawOptions)
    this.doc.restore()
    if (opts.audit !== false) {
      const width = opts.width || this.ctx.textEngine.measureRun(text, font, size, { characterSpacing, features: opts.features }) || 1
      const height = opts.height || this.ctx.textEngine.fontMetrics(font, size).natural
      this.ctx.recordBox('text', x, y, width, height, {
        text,
        role: opts.role || 'text',
        font,
        size,
        chrome: !!opts.chrome,
      })
    }
  }

  rect(x, y, w, h, opts = {}) {
    const doc = this.doc
    const radius = Number(opts.radius) || 0
    const lineWidth = Number(opts.lineWidth) || 0.6
    doc.save()
    doc.lineWidth(lineWidth)
    if (opts.fill && opts.stroke) {
      if (radius) doc.roundedRect(x, y, w, h, radius).fillAndStroke(opts.fill, opts.stroke)
      else doc.rect(x, y, w, h).fillAndStroke(opts.fill, opts.stroke)
    } else if (opts.fill) {
      if (radius) doc.roundedRect(x, y, w, h, radius).fill(opts.fill)
      else doc.rect(x, y, w, h).fill(opts.fill)
    } else if (opts.stroke) {
      if (radius) doc.roundedRect(x, y, w, h, radius).stroke(opts.stroke)
      else doc.rect(x, y, w, h).stroke(opts.stroke)
    }
    doc.restore()
    if (opts.audit !== false) {
      this.ctx.recordBox(opts.kind || 'shape', x, y, w, h, {
        role: opts.role || 'shape',
        fill: opts.fill,
        stroke: opts.stroke,
        ...(opts.meta || {}),
      })
    }
  }

  bar(x, y, w, h, color, meta = {}) {
    this.rect(x, y, w, h, {
      fill: color,
      radius: Math.min(h / 2, 2),
      kind: 'bar',
      role: 'bar',
      meta,
    })
  }

  line(x1, y1, x2, y2, opts = {}) {
    const doc = this.doc
    doc.save()
    doc.lineWidth(opts.width || 0.6).strokeColor(opts.color || COLORS.line)
      .moveTo(x1, y1).lineTo(x2, y2).stroke()
    doc.restore()
    if (opts.audit !== false) {
      this.ctx.recordBox('rule', Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1), {
        role: 'rule',
        ...(opts.meta || {}),
      })
    }
  }

  arc(cx, cy, radius, start, end, opts = {}) {
    const doc = this.doc
    doc.save()
    doc.lineWidth(opts.width || 8).strokeColor(opts.color || COLORS.indigo).lineCap(opts.cap || 'butt')
      .arc(cx, cy, radius, start, end).stroke()
    doc.restore()
    if (opts.audit !== false) {
      this.ctx.recordBox('shape', cx - radius - opts.width / 2, cy - radius - opts.width / 2, radius * 2 + opts.width, radius * 2 + opts.width, {
        role: 'arc',
        ...(opts.meta || {}),
      })
    }
  }

  image(bytes, x, y, w, h, opts = {}) {
    this.doc.image(bytes, x, y, { width: w, height: h })
    if (opts.audit !== false) {
      this.ctx.recordBox('image', x, y, w, h, { role: opts.role || 'image', ...(opts.meta || {}) })
    }
  }
}

export class LayoutAudit {
  constructor() {
    this.components = []
    this.boxes = []
    this.stack = []
    this.counter = 0
    this.page = 0
  }

  nextId(prefix) {
    this.counter += 1
    return `${prefix}-${String(this.counter).padStart(5, '0')}`
  }

  begin(meta) {
    const parent = this.stack[this.stack.length - 1] || null
    const node = {
      id: this.nextId(meta.type || 'component'),
      type: meta.type || 'component',
      parent: parent?.id || null,
      page: this.page,
      x: round(meta.x ?? CONTENT.x),
      y: round(meta.y ?? CONTENT.y),
      w: round(meta.w ?? CONTENT.w),
      h: round(meta.h ?? 0),
      requiredWidth: round(meta.w ?? CONTENT.w),
      requiredHeight: round(meta.h ?? 0),
      actualRenderedHeight: 0,
      topSpacing: round(meta.topSpacing || 0),
      bottomSpacing: round(meta.bottomSpacing || 0),
      allowSplit: !!meta.allowSplit,
      keepWithNext: round(meta.keepWithNext || 0),
      tableId: meta.tableId || null,
      role: meta.role || 'content',
      continuation: !!meta.continuation,
      label: meta.label || '',
    }
    this.components.push(node)
    this.stack.push(node)
    this.record('component', node.x, node.y, node.w, node.h, {
      role: 'component',
      componentId: node.id,
      type: node.type,
    })
    return node
  }

  end(node) {
    const related = this.boxes.filter((box) => box.ownerPath.includes(node.id))
    const bottom = related.reduce((max, box) => Math.max(max, box.y + box.h), node.y)
    node.actualRenderedHeight = round(Math.max(0, bottom - node.y))
    const index = this.stack.lastIndexOf(node)
    if (index >= 0) this.stack.splice(index, 1)
    return node
  }

  record(kind, x, y, w, h, meta = {}) {
    const path = this.stack.map((node) => node.id)
    const owner = path[path.length - 1] || null
    const box = {
      id: this.nextId(kind),
      kind,
      page: this.page,
      x: round(x),
      y: round(y),
      w: round(Math.max(0, w)),
      h: round(Math.max(0, h)),
      owner,
      ownerPath: path,
      role: meta.role || kind,
      ...meta,
    }
    this.boxes.push(box)
    return box
  }

  serialise() {
    return {
      geometry: {
        page: { ...A4 },
        content: { ...CONTENT },
        footer: { ...FOOTER },
        headerTop: PAGE.headerTop,
        headerBottom: PAGE.headerBottom,
      },
      components: this.components,
      boxes: this.boxes,
    }
  }
}

export function validateLayout(audit) {
  const components = audit.components || []
  const boxes = audit.boxes || []
  const byId = new Map(components.map((node) => [node.id, node]))
  const out = {
    componentCount: components.length,
    boxCount: boxes.length,
    textTextOverlaps: [],
    textBarOverlaps: [],
    siblingComponentOverlaps: [],
    componentBoundaryViolations: [],
    footerCollisions: [],
    orphanHeadings: [],
    repeatedTableHeaderFailures: [],
    overflowingComponents: [],
    zeroUnintendedOverlaps: false,
  }

  const textBoxes = boxes.filter((box) => box.kind === 'text' || box.kind === 'math')
  const bars = boxes.filter((box) => box.kind === 'bar')

  for (let i = 0; i < textBoxes.length; i += 1) {
    for (let j = i + 1; j < textBoxes.length; j += 1) {
      const a = textBoxes[i]
      const b = textBoxes[j]
      if (a.page !== b.page || !overlaps(a, b)) continue
      out.textTextOverlaps.push({
        page: a.page + 1,
        a: { id: a.id, text: String(a.text || a.tex || '').slice(0, 48), owner: a.owner, box: [a.x, a.y, a.w, a.h] },
        b: { id: b.id, text: String(b.text || b.tex || '').slice(0, 48), owner: b.owner, box: [b.x, b.y, b.w, b.h] },
        intersection: intersection(a, b),
      })
    }
  }

  for (const textBox of textBoxes) {
    for (const bar of bars) {
      if (textBox.page !== bar.page || !overlaps(textBox, bar)) continue
      out.textBarOverlaps.push({
        page: textBox.page + 1,
        text: String(textBox.text || textBox.tex || '').slice(0, 48),
        textOwner: textBox.owner,
        barOwner: bar.owner,
        intersection: intersection(textBox, bar),
      })
    }
  }

  const siblings = new Map()
  for (const node of components) {
    const key = `${node.page}:${node.parent || 'root'}`
    if (!siblings.has(key)) siblings.set(key, [])
    siblings.get(key).push(node)
  }
  for (const group of siblings.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const a = group[i]
        const b = group[j]
        const fixedChrome = (node) => ['chrome', 'header', 'footer'].includes(node.role)
        // Footer folios are intentionally contained in the fixed footer band.
        if (fixedChrome(a) && fixedChrome(b)) continue
        if (overlaps(boxOf(a), boxOf(b))) {
          out.siblingComponentOverlaps.push({
            page: a.page + 1,
            a: { id: a.id, type: a.type, box: [a.x, a.y, a.w, a.h] },
            b: { id: b.id, type: b.type, box: [b.x, b.y, b.w, b.h] },
            intersection: intersection(boxOf(a), boxOf(b)),
          })
        }
      }
    }
  }

  for (const node of components) {
    const isChrome = node.role === 'chrome' || node.role === 'header' || node.role === 'footer'
    if (!isChrome) {
      if (node.x < CONTENT.x - 0.6 || node.x + node.w > CONTENT.x + CONTENT.w + 0.6
        || node.y < CONTENT.y - 0.6 || node.y + node.h > CONTENT.bottom + 0.6) {
        out.componentBoundaryViolations.push({ id: node.id, type: node.type, page: node.page + 1, box: [node.x, node.y, node.w, node.h] })
      }
      if (node.actualRenderedHeight > node.h + 0.6) {
        out.overflowingComponents.push({ id: node.id, type: node.type, page: node.page + 1, required: node.h, actual: node.actualRenderedHeight })
      }
      if (node.type === 'section-heading' && node.y + node.h > CONTENT.bottom - 70) {
        out.orphanHeadings.push({ id: node.id, page: node.page + 1, label: node.label, y: node.y })
      }
    }
  }

  for (const box of boxes) {
    if (!box.owner || box.role === 'footer' || box.role === 'chrome' || box.role === 'component') continue
    const node = byId.get(box.owner)
    if (!node || !box.ownerPath.includes(node.id)) continue
    if (box.x < node.x - 0.8 || box.y < node.y - 0.8
      || box.x + box.w > node.x + node.w + 0.8 || box.y + box.h > node.y + node.h + 0.8) {
      out.componentBoundaryViolations.push({
        id: box.id, kind: box.kind, page: box.page + 1,
        component: node.id, box: [box.x, box.y, box.w, box.h],
        componentBox: [node.x, node.y, node.w, node.h],
      })
    }
    if ((box.kind === 'text' || box.kind === 'math' || box.kind === 'bar')
      && box.y < FOOTER.y + FOOTER.h && box.y + box.h > FOOTER.y - 2) {
      out.footerCollisions.push({ id: box.id, page: box.page + 1, kind: box.kind, box: [box.x, box.y, box.w, box.h] })
    }
  }

  const tablePages = new Map()
  for (const node of components) {
    if (!node.tableId || (node.type !== 'table-row' && node.type !== 'table-header')) continue
    const key = `${node.tableId}:${node.page}`
    if (!tablePages.has(key)) tablePages.set(key, { tableId: node.tableId, page: node.page, rows: 0, headers: 0 })
    const entry = tablePages.get(key)
    if (node.type === 'table-row') entry.rows += 1
    else entry.headers += 1
  }
  for (const entry of tablePages.values()) {
    if (entry.rows > 0 && entry.headers === 0) out.repeatedTableHeaderFailures.push(entry)
  }

  out.zeroUnintendedOverlaps = [
    'textTextOverlaps', 'textBarOverlaps', 'siblingComponentOverlaps',
    'componentBoundaryViolations', 'footerCollisions', 'orphanHeadings',
    'repeatedTableHeaderFailures', 'overflowingComponents',
  ].every((key) => out[key].length === 0)
  return out
}

export class ReportContext {
  constructor({ doc, assets, model, kind }) {
    this.doc = doc
    this.assets = assets
    this.model = model
    this.kind = kind
    this.canvas = new Canvas(this)
    this.textEngine = new TextEngine(this)
    this.audit = new LayoutAudit()
    this.flags = []
    this.emittedParts = []
    this.renderedQuestions = []
    this.pageCount = 0
    this.currentPageIndex = -1
    this.cover = false
    this.y = CONTENT.y
  }

  get emittedText() {
    return this.emittedParts.join(' | ')
  }

  emit(value) {
    const normalized = normalizeForMatch(value)
    if (normalized) this.emittedParts.push(normalized)
  }

  emittedIncludes(value) {
    return isPresentIn(this.emittedText, value)
  }

  missingSourceValues() {
    return (this.model.sourceValues || []).filter((row) => !this.emittedIncludes(row.value))
  }

  recordBox(kind, x, y, w, h, meta = {}) {
    return this.audit.record(kind, x, y, w, h, meta)
  }

  text(value, x, y, width = CONTENT.w, opts = {}) {
    return this.textEngine.draw(value, x, y, width, opts)
  }

  drawText(value, x, y, width = CONTENT.w, opts = {}) {
    return this.text(value, x, y, width, opts)
  }

  measureText(value, width = CONTENT.w, opts = {}) {
    return this.textEngine.measure(value, width, opts)
  }

  startPage({ cover = false } = {}) {
    this.doc.addPage({ size: 'A4', margin: 0 })
    this.pageCount += 1
    this.currentPageIndex = this.pageCount - 1
    this.audit.page = this.currentPageIndex
    this.cover = cover
    this.y = CONTENT.y
    if (this.kind === 'intelligence') {
      this.doc.save()
      this.doc.rect(0, 0, A4.width, A4.height).fill(COLORS.paper)
      this.doc.restore()
    }
    drawHeader(this, { cover })
    drawFooter(this, { pageNumber: this.pageCount })
    return this.currentPageIndex
  }

  get pageHasContent() {
    return this.audit.components.some((node) => (
      node.page === this.currentPageIndex
      && node.role !== 'chrome'
      && node.role !== 'header'
      && node.role !== 'footer'
    ))
  }

  newPage() {
    if (this.pageCount > 0 && !this.pageHasContent) {
      this.y = CONTENT.y
      return false
    }
    this.startPage({ cover: false })
    return true
  }

  /**
   * Start a fresh editorial spread only when the current page is already
   * well used. A short continuation page is filled by the next section rather
   * than becoming a nearly blank page.
   */
  sectionBreak(minCoverage = 0.74) {
    const coverage = (this.y - CONTENT.y) / CONTENT.h
    if (coverage >= minCoverage) {
      this.startPage({ cover: false })
      return true
    }
    this.y += 6
    return false
  }

  /** Place quiet final branding at the foot of a lightly used final page. */
  reserveFinalBranding(height = 54) {
    const coverage = (this.y - CONTENT.y) / CONTENT.h
    if (coverage < 0.72) this.y = Math.max(this.y, CONTENT.bottom - height - 8)
  }

  /** Return a reserved content frame anchored to the bottom of the final page. */
  bottomFrame(height) {
    const chromeIds = new Set(
      this.audit.components
        .filter((node) => ['chrome', 'header', 'footer'].includes(node.role))
        .map((node) => node.id),
    )
    const contentBoxes = this.audit.boxes.filter((entry) => (
      entry.page === this.currentPageIndex
      && entry.kind !== 'component'
      && !['chrome', 'header', 'footer'].includes(entry.role)
      && !entry.ownerPath.some((id) => chromeIds.has(id))
    ))
    const maxY = contentBoxes.reduce((max, entry) => Math.max(max, entry.y + entry.h), CONTENT.y)
    if (maxY > CONTENT.bottom - height - 12) this.startPage({ cover: false })
    // Anchor the colophon to the foot of the closing page. A colophon floated
    // into the middle of a partially filled page reads as a mistake, so the
    // remaining space is left above it as deliberate white space.
    const bottomY = CONTENT.bottom - height - 8
    const y = bottomY
    return {
      x: CONTENT.x,
      y,
      w: CONTENT.w,
      h: height,
      page: this.currentPageIndex,
    }
  }

  /** Draw a fixed, non-flowing audited frame. Cursor does not move. */
  chrome(meta, draw) {
    const node = this.audit.begin({
      ...meta,
      role: meta.role || 'chrome',
      allowSplit: false,
    })
    const frame = { x: node.x, y: node.y, w: node.w, h: node.h, page: node.page }
    draw(frame)
    this.audit.end(node)
    return frame
  }

  /** Draw an audited child component inside an already-reserved parent frame. */
  child(meta, draw) {
    const node = this.audit.begin({
      ...meta,
      allowSplit: !!meta.allowSplit,
    })
    draw({ x: node.x, y: node.y, w: node.w, h: node.h, page: node.page, node })
    this.audit.end(node)
    return node
  }

  drawContinuation(label) {
    this.chrome({
      type: 'continuation',
      role: 'continuation',
      x: CONTENT.x,
      y: this.y,
      w: CONTENT.w,
      h: 14,
      label,
    }, (frame) => {
      this.canvas.rect(frame.x, frame.y + 2, 2.5, 9, { fill: COLORS.indigo, audit: false })
      this.text(label, frame.x + 10, frame.y, frame.w - 10, {
        size: 8,
        font: FONTS.bodySemi,
        color: COLORS.muted,
        characterSpacing: 0.4,
        emit: false,
        role: 'continuation',
      })
    })
    this.y += 18
  }

  /**
   * Reserve a page-aware vertical frame. `continuationLabel` is drawn only
   * when a page break actually occurs, and its height is added before the
   * returned frame.
   */
  reserve(height, opts = {}) {
    const h = Math.max(0, Number(height) || 0)
    const top = Number(opts.topSpacing) || 0
    const bottom = Number(opts.bottomSpacing) || 0
    const keep = Number(opts.keepWithNext) || 0
    const continuationH = opts.continuationLabel ? 18 : 0
    const printable = CONTENT.h - continuationH - top - bottom
    if (h > printable + 0.01) {
      throw new Error(`Component height ${round(h)} pt exceeds the ${round(printable)} pt printable area: ${opts.label || opts.type || 'unnamed component'}`)
    }
    const needed = h + top + bottom
    const pageBefore = this.currentPageIndex
    const willBreak = this.y + needed + keep + continuationH > CONTENT.bottom
    if (willBreak) {
      this.startPage({ cover: false })
      if (opts.continuationLabel) this.drawContinuation(opts.continuationLabel)
    }
    const y = this.y + top
    this.y = y + h + bottom
    return {
      x: opts.x ?? CONTENT.x,
      y,
      w: opts.w ?? CONTENT.w,
      h,
      page: this.currentPageIndex,
      pageChanged: this.currentPageIndex !== pageBefore,
    }
  }

  component(spec) {
    const measure = typeof spec.measure === 'function' ? spec.measure : () => Number(spec.measure) || 0
    const requiredHeight = Math.max(0, Number(measure({ ctx: this })) || 0)
    const frame = this.reserve(requiredHeight, {
      x: spec.x,
      w: spec.w,
      topSpacing: spec.topSpacing,
      bottomSpacing: spec.bottomSpacing,
      keepWithNext: spec.keepWithNext,
      continuationLabel: spec.continuationLabel,
      label: spec.label || spec.type,
      type: spec.type,
    })
    const node = this.audit.begin({
      type: spec.type || 'component',
      x: frame.x,
      y: frame.y,
      w: frame.w,
      h: frame.h,
      topSpacing: spec.topSpacing,
      bottomSpacing: spec.bottomSpacing,
      allowSplit: spec.allowSplit,
      keepWithNext: spec.keepWithNext,
      tableId: spec.tableId,
      role: spec.role || 'content',
      continuation: !!frame.pageChanged,
      label: spec.label || '',
    })
    try {
      if (spec.draw) spec.draw(frame, { measured: requiredHeight, node })
    } finally {
      this.audit.end(node)
    }
    return { ...frame, node, requiredHeight, actualRenderedHeight: node.actualRenderedHeight }
  }

  finalize() {
    const total = this.pageCount
    for (let index = 0; index < total; index += 1) {
      this.doc.switchToPage(index)
      this.currentPageIndex = index
      this.audit.page = index
      drawPageTotal(this, total)
    }
    const summary = validateLayout(this.audit)
    return {
      pageCount: total,
      audit: this.audit.serialise(),
      summary,
    }
  }
}
