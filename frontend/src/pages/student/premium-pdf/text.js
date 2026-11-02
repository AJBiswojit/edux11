/**
 * Measurement-first rich text engine for the V2 publication renderer.
 *
 * Every text element is measured with the exact registered font and size that
 * will draw it. A line reserves at least the font's natural ascender-to-
 * descender height plus leading; mixed Latin / mathematical Unicode runs are
 * measured per run; long words are broken at character boundaries; explicit
 * paragraphs and paragraph gaps are included in the returned height.
 *
 * `measure()` and `draw()` use the same `layout()` result, so the calculated
 * and rendered heights agree. Every drawn line records a text box in the
 * layout audit for geometric validation.
 */

import { CONTENT, COLORS, FONTS, TYPE } from './theme.js'

const MATH_UNICODE = /[∫∑∬∭√∛∞≤≥≠≈±×÷−∈∉⊂⊆⊇∪∩→←↔⇒⇔∝∂∇αβγδεζηθικλμνξοπρστυφχψωΓΔΘΛΞΠΣΦΨΩ⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉⁻⁺ℓ°Å∠∴∵∥⊥]/u

function isMathChar(ch) {
  return MATH_UNICODE.test(ch)
}

export function splitRuns(text) {
  const runs = []
  for (const ch of Array.from(String(text ?? ''))) {
    const math = isMathChar(ch)
    const last = runs[runs.length - 1]
    if (last && last.math === math) last.text += ch
    else runs.push({ text: ch, math })
  }
  return runs
}

function fontForRun(run, opts) {
  if (opts.forceFont) return opts.forceFont
  return run.math ? (opts.mathFont || FONTS.math) : (opts.font || FONTS.body)
}

export class TextEngine {
  constructor(ctx) {
    this.ctx = ctx
  }

  get doc() {
    return this.ctx.doc
  }

  /** Natural glyph height for a registered font at a given size, in points. */
  fontMetrics(fontName, size) {
    this.doc.font(fontName).fontSize(size)
    const font = this.doc._font || {}
    const units = Number(font.unitsPerEm) || 1000
    const ascender = ((Number(font.ascender) || 800) / units) * size
    const descender = ((Number(font.descender) || -200) / units) * size
    const lineGap = ((Number(font.lineGap) || 0) / units) * size
    const natural = Math.max(size, ascender - descender + lineGap)
    return { ascender, descender, lineGap, natural }
  }

  lineNatural(opts = {}) {
    const size = Number(opts.size) || TYPE.body
    const base = opts.forceFont || opts.font || FONTS.body
    const math = opts.forceFont || opts.mathFont || FONTS.math
    return Math.max(this.fontMetrics(base, size).natural, this.fontMetrics(math, size).natural)
  }

  lineHeight(opts = {}) {
    const size = Number(opts.size) || TYPE.body
    const natural = this.lineNatural(opts)
    const explicit = Number(opts.lineHeight) || 0
    return Math.max(explicit, natural + 1.6, size * (opts.tight ? 1.26 : 1.36))
  }

  measureRun(text, fontName, size, opts = {}) {
    if (!text) return 0
    this.doc.font(fontName).fontSize(size)
    const options = { characterSpacing: opts.characterSpacing || 0 }
    if (opts.features) options.features = opts.features
    return this.doc.widthOfString(text, options)
  }

  measureRuns(runs, size, opts = {}) {
    return runs.reduce((sum, run) => sum + this.measureRun(run.text, fontForRun(run, opts), size, opts), 0)
  }

  makeToken(text, size, opts = {}) {
    const runs = splitRuns(text).map((run) => {
      const font = fontForRun(run, opts)
      return { ...run, font, width: this.measureRun(run.text, font, size, opts) }
    })
    return {
      text,
      runs,
      width: runs.reduce((sum, run) => sum + run.width, 0),
      isSpace: /^\s+$/u.test(text),
    }
  }

  breakWord(text, width, size, opts = {}) {
    const chunks = []
    let current = []
    let currentW = 0
    const push = () => {
      if (!current.length) return
      const chunkText = current.map((run) => run.text).join('')
      chunks.push(this.makeToken(chunkText, size, opts))
      current = []
      currentW = 0
    }
    for (const ch of Array.from(text)) {
      const math = isMathChar(ch)
      const font = fontForRun({ text: ch, math }, opts)
      const charW = this.measureRun(ch, font, size, opts)
      if (currentW + charW > width && current.length) push()
      const last = current[current.length - 1]
      if (last && last.math === math) last.text += ch
      else current.push({ text: ch, math })
      currentW += charW
      if (charW > width && current.length === 1) push()
    }
    push()
    return chunks
  }

  wrapParagraph(paragraph, width, opts = {}) {
    const size = Number(opts.size) || TYPE.body
    const maxW = Math.max(12, width || CONTENT.w)
    const lines = []
    let current = []
    let currentW = 0
    const finish = () => {
      while (current.length && current[current.length - 1].isSpace) {
        currentW -= current[current.length - 1].width
        current.pop()
      }
      lines.push({
        tokens: current,
        width: currentW,
        text: current.map((token) => token.text).join(''),
      })
      current = []
      currentW = 0
    }
    const parts = String(paragraph).match(/\s+|\S+/gu) || ['']
    for (const part of parts) {
      if (/^\s+$/u.test(part)) {
        const token = this.makeToken(' ', size, opts)
        if (current.length && currentW + token.width <= maxW) {
          current.push(token)
          currentW += token.width
        }
        continue
      }
      let tokens = [this.makeToken(part, size, opts)]
      if (tokens[0].width > maxW) tokens = this.breakWord(part, maxW, size, opts)
      for (const token of tokens) {
        if (current.length && currentW + token.width > maxW) finish()
        current.push(token)
        currentW += token.width
      }
    }
    finish()
    if (!lines.length) lines.push({ tokens: [], width: 0, text: '' })
    return lines
  }

  /** Shared by measure() and draw(); includes paragraph spacing. */
  layout(text, width = CONTENT.w, opts = {}) {
    const maxW = Math.max(12, width || CONTENT.w)
    const lh = this.lineHeight(opts)
    const paragraphGap = Number(opts.paragraphGap) || 0
    const paragraphs = String(text ?? '').split(/\r?\n/u)
    const lines = []
    let y = 0
    paragraphs.forEach((paragraph, index) => {
      for (const line of this.wrapParagraph(paragraph, maxW, opts)) {
        lines.push({ ...line, y, height: lh })
        y += lh
      }
      if (index < paragraphs.length - 1) y += paragraphGap
    })
    return { lines, height: y, lineHeight: lh, width: maxW }
  }

  measure(text, width = CONTENT.w, opts = {}) {
    return this.layout(text, width, opts).height
  }

  draw(text, x, y, width = CONTENT.w, opts = {}) {
    const size = Number(opts.size) || TYPE.body
    const color = opts.color || COLORS.ink
    const { lines, height, lineHeight: lh, width: maxW } = this.layout(text, width, opts)
    const natural = this.lineNatural(opts)
    const leading = Math.max(0, (lh - natural) / 2)
    const align = opts.align || 'left'
    const role = opts.role || (opts.chrome ? 'chrome' : 'text')

    if (opts.emit !== false) this.ctx.emit(String(text ?? ''))

    for (const line of lines) {
      if (!line.text) continue
      const offset = align === 'right'
        ? Math.max(0, maxW - line.width)
        : align === 'center'
          ? Math.max(0, (maxW - line.width) / 2)
          : 0
      const baseline = y + line.y + leading
      let cursor = x + offset
      for (const token of line.tokens) {
        for (const run of token.runs) {
          if (!run.text) continue
          this.ctx.canvas.textRun(run.text, cursor, baseline, {
            font: run.font,
            size,
            color,
            characterSpacing: opts.characterSpacing || 0,
            features: opts.features,
            audit: false,
          })
          cursor += run.width
        }
      }
      this.ctx.recordBox('text', x + offset, baseline, Math.max(1, line.width), natural, {
        text: line.text,
        font: opts.font || FONTS.body,
        size,
        role,
        logicalHeight: lh,
        chrome: !!opts.chrome,
      })
    }
    return height
  }
}
