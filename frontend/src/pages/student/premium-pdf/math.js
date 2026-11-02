/**
 * Mathematical typesetting for EduX reports.
 *
 * TeX / LaTeX fragments are converted to self-contained SVG by MathJax and
 * embedded as vector paths with svg-to-pdfkit. Unicode scientific notation is
 * rendered with the embedded STIX Two Math font. Malformed source expressions
 * are never guessed or silently corrected: they are flagged and shown verbatim.
 */

import { mathjax } from 'mathjax-full/js/mathjax.js'
import { TeX } from 'mathjax-full/js/input/tex.js'
import { SVG } from 'mathjax-full/js/output/svg.js'
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js'
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js'
import SVGtoPDF from 'svg-to-pdfkit'

import { COLORS, FONTS, TYPE } from './theme.js'

let MATHJAX = null
const SVG_CACHE = new Map()

function mathjaxInstance() {
  if (MATHJAX) return MATHJAX
  const adaptor = liteAdaptor()
  try {
    RegisterHTMLHandler(adaptor)
  } catch {
    // The handler is process-global. A cached instance below means this is a
    // harmless re-registration from a second module realm.
  }
  const input = new TeX({ packages: AllPackages })
  const output = new SVG({ fontCache: 'local' })
  const document = mathjax.document('', { InputJax: input, OutputJax: output }, adaptor)
  MATHJAX = { adaptor, document }
  return MATHJAX
}

function balancedBraces(tex) {
  let depth = 0
  for (let i = 0; i < tex.length; i += 1) {
    const ch = tex[i]
    if (ch === '\\' && (tex[i + 1] === '{' || tex[i + 1] === '}')) {
      i += 1
      continue
    }
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth < 0) return false
    }
  }
  return depth === 0
}

function environmentPairs(tex) {
  const begin = /\\begin\{([^}]+)\}/gu
  const end = /\\end\{([^}]+)\}/gu
  const begins = [...tex.matchAll(begin)].map((m) => m[1])
  const ends = [...tex.matchAll(end)].map((m) => m[1])
  if (begins.length !== ends.length) return false
  return begins.every((name, i) => name === ends[i])
}

export function isMalformedTeX(tex) {
  const value = String(tex ?? '')
  if (!balancedBraces(value)) return true
  if (!environmentPairs(value)) return true
  const left = (value.match(/\\left\b/gu) || []).length
  const right = (value.match(/\\right\b/gu) || []).length
  if (left !== right) return true
  const unescapedDollars = (value.match(/(^|[^\\])\$/gu) || []).length
  if (unescapedDollars % 2 !== 0) return true
  return false
}

const DELIMITERS = [
  { open: '$$', close: '$$', display: true },
  { open: '\\[', close: '\\]', display: true },
  { open: '\\(', close: '\\)', display: false },
  { open: '$', close: '$', display: false },
]

const MATH_COMMAND = /^\\(frac|dfrac|tfrac|int|iint|oint|sum|prod|sqrt|root|binom|dbinom|overline|underline|vec|hat|bar|tilde|operatorname|mathrm|mathbf|mathit|text|ce|pu|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|phi|omega|Delta|Omega|infty|partial|nabla|sin|cos|tan|log|ln|lim|left|right|begin|end|cdot|times|div|pm|mp|le|ge|ne|approx|to|Rightarrow|Rightarrow|in|notin|subset|subseteq|cup|cap)\b/u

/** Consume a bare TeX command and its braced/script arguments. */
function consumeCommand(text, start) {
  const rest = text.slice(start)
  const match = rest.match(MATH_COMMAND)
  if (!match) return null
  let i = match[0].length
  const command = match[1]
  if (command === 'begin' || command === 'end') return null
  let consumedGroups = 0
  const takeGroupOrChar = () => {
    if (text[start + i] === '{') {
      let depth = 0
      let j = i
      for (; j < text.length - start; j += 1) {
        const ch = text[start + j]
        if (ch === '\\' && (text[start + j + 1] === '{' || text[start + j + 1] === '}')) {
          j += 1
          continue
        }
        if (ch === '{') depth += 1
        else if (ch === '}') {
          depth -= 1
          if (depth === 0) {
            i = j + 1
            consumedGroups += 1
            return true
          }
        }
      }
      return false
    }
    if (text[start + i] === '\\') {
      const cmd = text.slice(start + i).match(/^\\[a-zA-Z]+/u)
      if (cmd) {
        i += cmd[0].length
        return true
      }
    }
    if (i < text.length - start && !/[\s+\-=,.;:]/u.test(text[start + i])) {
      i += 1
      return true
    }
    return false
  }
  while (i < text.length - start) {
    const ch = text[start + i]
    if (ch === '{') {
      if (!takeGroupOrChar()) break
      continue
    }
    if (ch === '_' || ch === '^') {
      i += 1
      if (!takeGroupOrChar()) break
      continue
    }
    if (ch === '\\' && /^\\(?:left|right)/u.test(text.slice(start + i))) {
      const cmd = text.slice(start + i).match(/^\\(?:left|right)/u)
      i += cmd[0].length
      if (i < text.length - start && /[()[\]|.]/u.test(text[start + i])) i += 1
      continue
    }
    break
  }
  // Commands such as \sin need at least an argument to be meaningful.
  if (i <= match[0].length && !consumedGroups) i = match[0].length
  return { end: start + i, tex: text.slice(start, start + i) }
}

/**
 * Split a solution into plain text, inline math, display math and flagged
 * malformed fragments. No source expression is rewritten.
 */
export function parseSolution(source) {
  const text = Array.isArray(source)
    ? source.map((part) => (typeof part === 'string' ? part : String(part?.text ?? part?.value ?? ''))).join('\n')
    : String(source ?? '')
  const segments = []
  let plain = ''
  let i = 0
  const pushPlain = () => {
    if (plain) {
      segments.push({ type: 'text', value: plain })
      plain = ''
    }
  }
  const pushMalformed = (raw, reason) => {
    pushPlain()
    segments.push({ type: 'malformed', raw, reason })
  }

  while (i < text.length) {
    let matched = false
    for (const delimiter of DELIMITERS) {
      if (!text.startsWith(delimiter.open, i)) continue
      const from = i + delimiter.open.length
      const closeAt = text.indexOf(delimiter.close, from)
      if (closeAt === -1) {
        pushMalformed(text.slice(i), `Unclosed ${delimiter.open} delimiter`)
        i = text.length
        matched = true
        break
      }
      const tex = text.slice(from, closeAt).trim()
      pushPlain()
      if (!tex) {
        i = closeAt + delimiter.close.length
        matched = true
        break
      }
      if (isMalformedTeX(tex)) pushMalformed(tex, 'Unbalanced TeX source')
      else segments.push({ type: 'math', tex, display: delimiter.display })
      i = closeAt + delimiter.close.length
      matched = true
      break
    }
    if (matched) continue

    if (text.startsWith('\\begin{', i)) {
      const envMatch = text.slice(i).match(/^\\begin\{([^}]+)\}/u)
      const env = envMatch?.[1]
      const closeTag = `\\end{${env}}`
      const closeAt = text.indexOf(closeTag, i + envMatch[0].length)
      if (!env || closeAt === -1) {
        pushMalformed(text.slice(i), 'Unclosed LaTeX environment')
        i = text.length
        continue
      }
      const end = closeAt + closeTag.length
      const tex = text.slice(i, end).trim()
      pushPlain()
      if (isMalformedTeX(tex)) pushMalformed(tex, 'Unbalanced LaTeX environment')
      else segments.push({ type: 'math', tex, display: true })
      i = end
      continue
    }

    if (text[i] === '\\' && MATH_COMMAND.test(text.slice(i))) {
      const consumed = consumeCommand(text, i)
      if (consumed && consumed.tex.trim()) {
        pushPlain()
        if (isMalformedTeX(consumed.tex)) pushMalformed(consumed.tex, 'Unbalanced TeX source')
        else segments.push({ type: 'math', tex: consumed.tex.trim(), display: false })
        i = consumed.end
        continue
      }
    }

    plain += text[i]
    i += 1
  }
  pushPlain()
  return segments
}

function extractSvg(html) {
  const start = html.indexOf('<svg')
  const end = html.lastIndexOf('</svg>')
  if (start === -1 || end === -1) return ''
  return html.slice(start, end + 6)
}

function parseViewBox(svg) {
  const match = svg.match(/viewBox="([^"]+)"/u)
  if (!match) return { minX: 0, minY: 0, w: 1000, h: 1000 }
  const [minX, minY, w, h] = match[1].trim().split(/[\s,]+/u).map(Number)
  return {
    minX: Number.isFinite(minX) ? minX : 0,
    minY: Number.isFinite(minY) ? minY : 0,
    w: Number.isFinite(w) && w > 0 ? w : 1000,
    h: Number.isFinite(h) && h > 0 ? h : 1000,
  }
}

function parseVerticalAlign(svg) {
  const match = svg.match(/vertical-align:\s*(-?[\d.]+)ex/u)
  return match ? Number(match[1]) : 0
}

export class MathRenderer {
  constructor(ctx) {
    this.ctx = ctx
  }

  get doc() {
    return this.ctx.doc
  }

  /** Measure a TeX fragment in points. Returns null for malformed source. */
  measure(tex, { fontSize = TYPE.body, maxWidth = 400, display = false } = {}) {
    const key = `${display ? 'D' : 'I'}:${fontSize}:${maxWidth}:${tex}`
    if (SVG_CACHE.has(key)) return SVG_CACHE.get(key)
    let result
    try {
      if (isMalformedTeX(tex)) return null
      const { adaptor, document } = mathjaxInstance()
      const node = document.convert(tex, { display })
      const html = adaptor.outerHTML(node)
      const svg = extractSvg(html)
      if (!svg) return null
      if (/data-mml-node="merror"|mjx-merror/u.test(svg)) return null
      const view = parseViewBox(svg)
      let scale = fontSize / 1000
      if (view.w * scale > maxWidth) scale = maxWidth / view.w
      const width = view.w * scale
      const height = view.h * scale
      const verticalAlignEx = parseVerticalAlign(svg)
      const shift = display ? 0 : Math.max(0, -verticalAlignEx * fontSize * 0.442)
      result = { svg, width, height, shift, scale, view, tex, display }
      SVG_CACHE.set(key, result)
    } catch {
      return null
    }
    return result
  }

  draw(info, x, y, color = COLORS.midnight) {
    if (!info) return
    const svg = info.svg.replace(/<svg\b/u, `<svg fill="${color}"`)
    this.doc.save()
    try {
      SVGtoPDF(this.doc, svg, x, y, {
        width: info.width,
        height: info.height,
        assumePt: true,
        preserveAspectRatio: 'xMinYMin meet',
      })
    } finally {
      this.doc.restore()
    }
  }
}

export class SolutionRenderer {
  constructor(ctx, { fontSize = TYPE.body, maxWidth = 400, sourceLabel = '' } = {}) {
    this.ctx = ctx
    this.fontSize = fontSize
    this.maxWidth = maxWidth
    this.sourceLabel = sourceLabel
    this.math = new MathRenderer(ctx)
    this.text = ctx.textEngine
  }

  flag(raw, reason) {
    const entry = {
      report: this.ctx.kind,
      source: this.sourceLabel,
      value: String(raw),
      reason,
    }
    const duplicate = this.ctx.flags.some((existing) => (
      existing.report === entry.report
      && existing.source === entry.source
      && existing.value === entry.value
      && existing.reason === entry.reason
    ))
    if (!duplicate) this.ctx.flags.push(entry)
  }

  /** Build a list of renderable lines/blocks. Shared by measure() and render(). */
  layout(source) {
    const segments = parseSolution(source)
    const lines = []
    let current = []
    let currentW = 0
    const textOpts = {
      size: this.fontSize,
      font: FONTS.body,
      mathFont: FONTS.math,
      color: COLORS.deepInk,
      lineHeight: this.fontSize * 1.5,
      tight: false,
    }
    const spaceW = this.text.measureRun(' ', FONTS.body, this.fontSize, textOpts)
    const finish = () => {
      while (current.length && current[current.length - 1].kind === 'space') {
        currentW -= current[current.length - 1].width
        current.pop()
      }
      const height = Math.max(
        this.fontSize * 1.5,
        ...current.map((item) => item.height || this.fontSize * 1.5),
        1,
      )
      lines.push({ items: current, width: currentW, height })
      current = []
      currentW = 0
    }
    const addItem = (item) => {
      if (current.length && currentW + item.width > this.maxWidth) finish()
      current.push(item)
      currentW += item.width
    }

    for (const segment of segments) {
      if (segment.type === 'text') {
        const parts = segment.value.match(/\s+|\S+/gu) || []
        for (const part of parts) {
          if (/^\s+$/u.test(part)) {
            if (current.length && currentW + spaceW <= this.maxWidth) {
              current.push({ kind: 'space', width: spaceW })
              currentW += spaceW
            }
            continue
          }
          let tokens = [this.text.makeToken(part, this.fontSize, textOpts)]
          if (tokens[0].width > this.maxWidth) tokens = this.text.breakWord(part, this.maxWidth, this.fontSize, textOpts)
          for (const token of tokens) addItem({ kind: 'text', token, width: token.width, height: this.fontSize * 1.5 })
        }
        // Explicit line breaks inside a text segment are preserved.
        const breaks = segment.value.match(/\n/gu)
        if (breaks) for (let n = 0; n < breaks.length; n += 1) finish()
        continue
      }

      if (segment.type === 'malformed') {
        this.flag(segment.raw, segment.reason)
        finish()
        const label = 'EXPRESSION FLAGGED FOR VERIFICATION — SOURCE SHOWN VERBATIM'
        const labelH = this.text.measure(label, this.maxWidth, { size: 7.4, font: FONTS.bodyBold, color: COLORS.error, lineHeight: 10 })
        const rawH = this.text.measure(segment.raw, this.maxWidth, { ...textOpts, color: COLORS.deepInk })
        lines.push({ kind: 'malformed', label, raw: segment.raw, width: this.maxWidth, height: labelH + rawH + 8 })
        continue
      }

      const info = this.math.measure(segment.tex, {
        fontSize: segment.display ? this.fontSize + 1.2 : this.fontSize,
        maxWidth: this.maxWidth - 8,
        display: segment.display,
      })
      if (!info) {
        this.flag(segment.tex, 'MathJax could not typeset the expression')
        finish()
        const label = 'EXPRESSION FLAGGED FOR VERIFICATION — SOURCE SHOWN VERBATIM'
        const labelH = this.text.measure(label, this.maxWidth, { size: 7.4, font: FONTS.bodyBold, color: COLORS.error, lineHeight: 10 })
        const rawH = this.text.measure(segment.tex, this.maxWidth, { ...textOpts, color: COLORS.deepInk })
        lines.push({ kind: 'malformed', label, raw: segment.tex, width: this.maxWidth, height: labelH + rawH + 8 })
        continue
      }
      this.ctx.emit(segment.tex)
      if (segment.display) {
        finish()
        lines.push({
          kind: 'displayMath',
          info,
          width: info.width,
          height: info.height + 10,
        })
        continue
      }
      addItem({
        kind: 'math',
        info,
        width: info.width + 2,
        height: Math.max(info.height, this.fontSize * 1.5),
      })
    }
    finish()
    return lines
  }

  measure(source) {
    return this.layout(source).reduce((sum, line) => sum + line.height, 0)
  }

  drawLine(line, x, y, width, opts = {}) {
    const drawY = y
    if (line.kind === 'malformed') {
      this.ctx.doc.roundedRect(x, drawY, width, line.height - 4, 3).fill(COLORS.errorSoft)
      this.ctx.doc.roundedRect(x, drawY, 2.5, line.height - 4, 1).fill(COLORS.error)
      this.ctx.drawText(line.label, x + 9, drawY + 5, width - 18, {
        size: 7.4,
        font: FONTS.bodyBold,
        color: COLORS.error,
        characterSpacing: 0.4,
        lineHeight: 10,
      })
      this.ctx.drawText(line.raw, x + 9, drawY + 15, width - 18, {
        size: this.fontSize,
        font: FONTS.body,
        mathFont: FONTS.math,
        color: COLORS.deepInk,
      })
      return line.height
    }
    if (line.kind === 'displayMath') {
      const mathX = x + Math.max(0, (width - line.info.width) / 2)
      this.math.draw(line.info, mathX, drawY + 3, COLORS.midnight)
      return line.height
    }
    let cursor = x + (opts.align === 'center' ? Math.max(0, (width - line.width) / 2) : 0)
    for (const item of line.items) {
      if (item.kind === 'space') {
        cursor += item.width
        continue
      }
      if (item.kind === 'text') {
        for (const run of item.token.runs) {
          if (!run.text) continue
          this.ctx.doc.font(run.font).fontSize(this.fontSize).fillColor(COLORS.deepInk)
          this.ctx.doc.text(run.text, cursor, drawY, { lineBreak: false })
          cursor += run.width
        }
        continue
      }
      if (item.kind === 'math') {
        const mathY = drawY + Math.max(0, (line.height - item.info.height) / 2) + Math.min(item.info.shift, this.fontSize * 0.8)
        this.math.draw(item.info, cursor, mathY, COLORS.midnight)
        cursor += item.width
      }
    }
    return line.height
  }

  /** Draw inside space already reserved by the caller; never changes ctx.y. */
  renderAt(source, x, y, width, opts = {}) {
    this.maxWidth = width
    const lines = this.layout(source)
    let cursor = y
    for (const line of lines) {
      this.drawLine(line, x, cursor, width, opts)
      cursor += line.height
    }
    return cursor - y
  }

  /** Flow across as many pages as the explanation actually needs. */
  render(source, x, width, opts = {}) {
    this.maxWidth = width
    const lines = this.layout(source)
    let total = 0
    for (const line of lines) {
      const reserved = this.ctx.reserve(line.height, { continuationLabel: opts.continuationLabel })
      this.drawLine(line, x, reserved.y, width, opts)
      total += line.height + reserved.extra
    }
    return total
  }
}
