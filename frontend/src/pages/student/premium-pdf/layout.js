/**
 * Paged layout context.
 *
 * Coordinates are PDF points from the top-left of the printable content box.
 * reserve() is the single source of truth for vertical flow: it decides when a
 * page break is needed, repeats table/column headers when requested and
 * reports page transitions back to the component. Chrome (headers, footers,
 * grid) never counts as page content, so a section never creates an empty page.
 */

import { A4, CONTENT, COLORS, FONTS, TYPE, isPresentIn, normalizeForMatch } from './theme.js'
import { TextEngine } from './text.js'
import { ReportHeader, ReportFooter, drawPageTotal, drawGrid } from './components.js'

export class ReportContext {
  constructor({ doc, theme, assets, model, kind }) {
    this.doc = doc
    this.theme = theme
    this.assets = assets
    this.model = model
    this.kind = kind
    this.textEngine = new TextEngine(this)
    this.flags = []
    this.emittedParts = []
    this.pageCount = 0
    this.currentPageIndex = -1
    this.y = CONTENT.y
    this.pageHasContent = false
    this.cover = false
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

  markContent() {
    this.pageHasContent = true
  }

  drawText(text, x, y, width = CONTENT.w, opts = {}) {
    return this.textEngine.draw(text, x, y, width, opts)
  }

  measureText(text, width = CONTENT.w, opts = {}) {
    return this.textEngine.measure(text, width, opts)
  }

  startPage({ cover = false } = {}) {
    this.doc.addPage({ size: 'A4', margin: 0 })
    this.pageCount += 1
    this.currentPageIndex = this.pageCount - 1
    this.cover = cover
    this.y = CONTENT.y
    this.pageHasContent = false
    drawGrid(this)
    ReportHeader(this, { cover })
    ReportFooter(this, { pageNumber: this.pageCount })
    return this.currentPageIndex
  }

  startFreshPage() {
    if (this.pageHasContent) return this.startPage({ cover: false })
    this.y = CONTENT.y
    return this.currentPageIndex
  }

  ensureBlock(needed) {
    const capacity = CONTENT.h
    if (needed > capacity) {
      if (this.y > CONTENT.y) this.startPage({ cover: false })
      return true
    }
    if (this.y + needed > CONTENT.bottom) {
      this.startPage({ cover: false })
      return true
    }
    return false
  }

  /**
   * Reserve vertical space and return its top coordinate.
   * opts.onNewPage(y) is called with the original top when a page break occurs;
   * opts.newPageExtra is added above the returned y for repeated headers.
   * opts.continuationLabel draws a compact continuation rule and reserves 14 pt.
   */
  reserve(height, opts = {}) {
    const h = Math.max(0, Number(height) || 0)
    const capacity = CONTENT.h
    const pageBefore = this.currentPageIndex
    if (h > capacity) {
      if (this.y > CONTENT.y) this.startPage({ cover: false })
    } else if (this.y + h > CONTENT.bottom) {
      this.startPage({ cover: false })
    }
    const pageChanged = this.currentPageIndex !== pageBefore
    let extra = 0
    if (pageChanged && opts.newPageExtra) extra += opts.newPageExtra
    if (pageChanged && opts.continuationLabel) extra += 14
    const originalY = this.y
    if (pageChanged && opts.onNewPage) opts.onNewPage(originalY)
    if (pageChanged && opts.continuationLabel) {
      this.doc.rect(CONTENT.x, originalY, 3, 11).fill(COLORS.indigo)
      this.drawText(opts.continuationLabel, CONTENT.x + 11, originalY, CONTENT.w - 11, {
        size: 7.1,
        font: FONTS.bodySemi,
        color: COLORS.slate,
        characterSpacing: 0.5,
        chrome: true,
        emit: false,
      })
    }
    const y = originalY + extra
    this.y = y + h
    this.markContent()
    return { y, pageChanged, extra }
  }

  space(height) {
    return this.reserve(height).y
  }

  finalize() {
    const total = this.pageCount
    for (let index = 0; index < total; index += 1) {
      this.doc.switchToPage(index)
      drawPageTotal(this, total)
    }
    return total
  }
}
