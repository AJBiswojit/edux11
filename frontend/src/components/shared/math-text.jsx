/**
 * MathText — renders question/option text that may contain LaTeX math,
 * Markdown formatting, or inline/block images.
 *
 * Supports:
 *   - Block math:  $$...$$ or \[...\]
 *   - Inline math: $...$ or \(...\)
 *   - Plain text with no math (zero overhead — just a span)
 *   - Markdown formatting (bold, italic, lists, tables) via react-markdown
 *   - Inline images via Markdown ![alt](url) syntax (responsive, object-contain)
 *   - Chemistry: H₂O, SO₄²⁻, NH₄⁺, ⇌ — Unicode renders as plain text;
 *     LaTeX chemistry ($\mathrm{H_2O}$) renders via KaTeX
 *   - Superscripts, subscripts, fractions, roots, Greek symbols via KaTeX
 *   - Reaction arrows: →, ⇌, ↔ render as-is (Unicode); \rightarrow etc. in LaTeX
 *
 * Usage:
 *   <MathText>{question.question}</MathText>
 *   <MathText className="text-sm">{opt}</MathText>
 */
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import { cn } from '@/utils/cn'

const REMARK_PLUGINS = [remarkGfm, remarkMath]
// throwOnError: false — render a styled fallback instead of crashing on
// malformed LaTeX (e.g. \end{cases} with no matching \begin{cases}).
// errorColor matches the surrounding text so broken LaTeX never turns red.
const REHYPE_PLUGINS = [[rehypeKatex, { throwOnError: false, errorColor: 'currentColor' }]]

/**
 * Returns true if the string contains any LaTeX math delimiters or Markdown
 * constructs that need react-markdown processing (bold, italic, links, images,
 * code, headers, tables, lists).
 * Used to skip the heavier ReactMarkdown path for truly plain text.
 */
function hasMarkupOrMath(text) {
  // LaTeX delimiters
  if (/\$|\\\(|\\\[|\\begin\{/.test(text)) return true
  // Markdown: bold/italic (**/*/_), inline code (`), links/images (](, ![),
  // headers (# at line start), tables (|), horizontal rules (---/***),
  // ordered/unordered lists at line start
  if (/\*\*|__|\*[^*]|_[^_]|`|\]\(|!\[|^#+\s|^\s*[-*+]\s|^\s*\d+\.\s|\|/m.test(text)) return true
  return false
}

/**
 * Pre-process AI-generated LaTeX before handing it to remark-math.
 *
 * Repairs: \end{cases} / \end{array} etc. without a matching \begin{…}
 * inside a $…$ or $$…$$ block, by prepending the missing \begin{env}.
 *
 * Stray lone $ (e.g. currency) are left alone — remark-math ignores
 * unmatched delimiters.
 */
function sanitizeLatex(text) {
  if (!text) return text

  // Step 1 — Separate adjacent inline math spans that share a $$ boundary.
  //
  // remark-math v6 treats $$ as a block-math delimiter. When two inline $…$
  // spans appear back-to-back (e.g. "$\sqrt{3}$$\hat{j}$"), the parser sees
  // the middle "$\sqrt{3}$" closing dollar immediately followed by the opening
  // dollar of "$\hat{j}$", forming "$$" which remark-math misreads as a block
  // delimiter. This causes everything after to be misrendered.
  //
  // Fix: when a non-whitespace character (typically } or a letter/digit) is
  // immediately followed by $$ followed by a backslash or letter (start of
  // LaTeX), insert a space between the two $'s so they are seen as separate.
  //
  // Pattern: [^\s$]  $$  [\\a-zA-Z]  → the $$ is a junction, not a block delim.
  // We deliberately leave true $$ block delimiters alone (they are at the start
  // of a line or after a space, not after a closing } or non-$ character ending
  // a prior math span).
  let out = text.replace(/([^\s$])(\$\$)([\\a-zA-Z0-9(])/g, (match, before, dollars, after) => {
    return `${before}$ $${after}`
  })

  // Step 2 — Fix \end{env} inside $…$ blocks with no matching \begin{env}.
  // Only attempt repair when the body actually contains \end{ to avoid
  // incorrectly spanning two adjacent math expressions.
  out = out.replace(/(\$\$?)([\s\S]*?)(\$\$?)/g, (match, open, body, close) => {
    // Only process when open and close delimiters have the same length.
    if (open.length !== close.length) return match
    // Skip repair entirely when there is no \end tag to fix (the common case).
    if (!body.includes('\\end{')) return match

    const fixed = fixMissingBegins(body)
    return fixed === body ? match : `${open}${fixed}${close}`
  })

  return out
}

/**
 * Scan a LaTeX body (the content between $ delimiters) and prepend any
 * \begin{env} that is required by an \end{env} but missing.
 */
function fixMissingBegins(body) {
  // Collect all \begin{X} and \end{X} tags in order.
  const beginRe = /\\begin\{([^}]+)\}/g
  const endRe = /\\end\{([^}]+)\}/g

  const begins = []
  let m
  while ((m = beginRe.exec(body)) !== null) begins.push(m[1])

  const ends = []
  while ((m = endRe.exec(body)) !== null) ends.push(m[1])

  if (ends.length === 0) return body

  // Find \end{X} entries that have no matching \begin{X} (in order).
  const beginStack = [...begins]
  const missing = []
  for (const env of ends) {
    const idx = beginStack.indexOf(env)
    if (idx !== -1) {
      beginStack.splice(idx, 1)
    } else {
      missing.push(env)
    }
  }

  if (missing.length === 0) return body

  // Prepend the missing \begin{X} tags at the start of the body.
  const prefix = missing.map((env) => `\\begin{${env}}`).join('')
  return prefix + body
}

export function MathText({ children, className }) {
  const text = children ?? ''

  // Fast path: truly plain text — no LaTeX or Markdown markup detected.
  // Unicode math symbols (²³₂, ⇌, ∫, ×, →) render correctly as-is.
  if (!hasMarkupOrMath(text)) {
    return (
      <span className={cn('whitespace-pre-wrap', className)}>{text}</span>
    )
  }

  const sanitized = sanitizeLatex(text)

  return (
    <span className={cn('math-text', className)}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={{
          // Render paragraphs as block spans so the outer <span> stays valid.
          p: ({ children: c }) => <span className="block">{c}</span>,
          // Keep code readable in question context.
          code: ({ children: c }) => (
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em] dark:bg-slate-800">
              {c}
            </code>
          ),
          // Images embedded via Markdown syntax ![alt](url) — responsive,
          // aspect-ratio preserved, no distortion, works portrait/landscape.
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt ?? ''}
              loading="lazy"
              className="mt-2 block max-h-64 max-w-full rounded-lg border border-slate-200 object-contain dark:border-slate-700"
            />
          ),
        }}
      >
        {sanitized}
      </ReactMarkdown>
    </span>
  )
}

export default MathText

// Export internal helpers for unit testing.
export { hasMarkupOrMath, sanitizeLatex, fixMissingBegins }
