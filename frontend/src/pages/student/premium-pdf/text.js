/**
 * Rich-text measurement and drawing for the premium PDF engine.
 *
 * PDFKit's line wrapper is intentionally bypassed: report copy must never be
 * ellipsised, clipped, or silently shortened. Long words are broken at
 * character boundaries, mixed Latin / mathematical Unicode runs are measured
 * with their own fonts, and every drawn value is recorded for the data-preservation
 * register.
 */

import { CONTENT, FONTS, COLORS, TYPE } from './theme.js'

const MATH_UNICODE = /[∫∑√∛∞≤≥≠≈±×÷−∈∉⊂⊆⊇∪∩→←↔⇒⇔∝∂∇αβγδεζηθικλμνξοπρστυφχψωΓΔΘΛΞΠΣΦΨΩ⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉⁻⁺ℓ°Å]/u

function isMathChar(ch) {
  return MATH_UNICODE.test(ch)
}

export function splitRuns(text) {
  const chars = Array.from(String(text ?? ''))
  const runs = []
  for (const ch of chars) {
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

  measureRun(text, fontName, size, opts = {}) {
    if (!text) return 0
    this.doc.font(fontName).fontSize(size)
    const options = {
      characterSpacing: opts.characterSpacing || 0,
      features: opts.features || undefined,
    }
    return this.doc.widthOfString(text, options)
  }

  measureRuns(runs, size, opts = {}) {
    let total = 0
    for (const run of runs) total += this.measureRun(run.text, fontForRun(run, opts), size, opts)
    return total
  }

  makeToken(text, size, opts = {}) {
    const runs = splitRuns(text).map((run) => ({
      ...run,
      font: fontForRun(run, opts),
      width: this.measureRun(run.text, fontForRun(run, opts), size, opts),
    }))
    return {
      runs,
      width: runs.reduce((sum, run) => sum + run.width, 0),
      isSpace: /^\s+$/u.test(text),
    }
  }

  /** Break an over-long word into chunks that fit the column. */
  breakWord(text, width, size, opts = {}) {
    const chunks = []
    let current = []
    let currentW = 0
    const push = () => {
      if (!current.length) return
      const chunkText = current.map((r) => r.text).join('')
      chunks.push(this.makeToken(chunkText, size, opts))
      current = []
      currentW = 0
    }
    for (const ch of Array.from(text)) {
      const math = isMathChar(ch)
      const last = current[current.length - 1]
      const fontName = fontForRun({ text: ch, math }, opts)
      const charW = this.measureRun(ch, fontName, size, opts)
      if (currentW + charW > width && current.length) push()
      if (current.length && current[current.length - 1].math === math) {
        current[current.length - 1].text += ch
      } else {
        current.push({ text: ch, math })
      }
      currentW += charW
      // A single glyph wider than the column is scaled by the caller; do not loop.
      if (charW > width && current.length === 1) push()
    }
    push()
    return chunks
  }

  wrap(text, width, opts = {}) {
    const size = opts.size || TYPE.body
    const maxW = Math.max(12, width || CONTENT.w)
    const paragraphs = String(text ?? '').split(/\r?\n/u)
    const lines = []
    let current = []
    let currentW = 0
    const spaceToken = () => this.makeToken(' ', size, opts)

    const finish = () => {
      while (current.length && current[current.length - 1].isSpace) {
        currentW -= current[current.length - 1].width
        current.pop()
      }
      lines.push({ tokens: current, width: currentW })
      current = []
      currentW = 0
    }

    for (const paragraph of paragraphs) {
      const parts = paragraph.match(/\s+|\S+/gu) || ['']
      for (const part of parts) {
        if (/\s/u.test(part)) {
          const token = spaceToken()
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
    }
    if (!lines.length) lines.push({ tokens: [], width: 0 })
    return lines
  }

  lineHeight(opts = {}) {
    const size = opts.size || TYPE.body
    return opts.lineHeight || size * (opts.tight ? 1.28 : 1.45)
  }

  measure(text, width, opts = {}) {
    return this.wrap(text, width, opts).length * this.lineHeight(opts)
  }

  draw(text, x, y, width, opts = {}) {
    const size = opts.size || TYPE.body
    const color = opts.color || COLORS.deepInk
    const lines = this.wrap(text, width, opts)
    const lh = this.lineHeight(opts)
    const align = opts.align || 'left'
    const maxW = Math.max(12, width || CONTENT.w)

    if (opts.emit !== false) this.ctx.emit(String(text ?? ''))
    if (opts.chrome !== true) this.ctx.markContent()

    lines.forEach((line, lineIndex) => {
      const offset = align === 'right'
        ? Math.max(0, maxW - line.width)
        : align === 'center'
          ? Math.max(0, (maxW - line.width) / 2)
          : 0
      let cursor = x + offset
      const baseline = y + lineIndex * lh
      for (const token of line.tokens) {
        for (const run of token.runs) {
          if (!run.text) continue
          this.doc.font(run.font).fontSize(size)
          this.doc.fillColor(color)
          this.doc.text(run.text, cursor, baseline, {
            lineBreak: false,
            characterSpacing: opts.characterSpacing || 0,
            features: opts.features || undefined,
          })
          cursor += run.width
        }
      }
    })
    return lines.length * lh
  }
}
