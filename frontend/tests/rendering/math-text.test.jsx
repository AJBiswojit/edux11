/**
 * MathText rendering pipeline — focused unit + integration tests.
 *
 * Strategy: test the exported pure-logic helpers (hasMarkupOrMath,
 * sanitizeLatex, fixMissingBegins) without DOM for most cases.  A small
 * jsdom section covers component rendering for image and legacy-format paths.
 *
 * Test cases (matching spec §Testing):
 *  1.  Markdown text
 *  2.  Inline LaTeX
 *  3.  Block LaTeX
 *  4.  Chemistry formulas (LaTeX)
 *  5.  Chemical / reaction arrows
 *  6.  Superscripts / subscripts
 *  7.  Mixed Markdown + LaTeX
 *  8.  Text + image (Markdown image syntax)
 *  9.  Image-based options
 * 10.  Multiple image options
 * 11.  Very tall / wide images
 * 12.  Mobile rendering
 * 13.  Existing legacy question formats (Unicode math, plain text)
 */

// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'

import {
  MathText,
  hasMarkupOrMath,
  sanitizeLatex,
  fixMissingBegins,
} from '../../src/components/shared/math-text.jsx'

// ---------------------------------------------------------------------------
// 1. Markdown text — routing and basic formatting detection
// ---------------------------------------------------------------------------
describe('1. Markdown text', () => {
  it('takes the fast path for truly plain text (no ReactMarkdown overhead)', () => {
    expect(hasMarkupOrMath('What is the speed of light?')).toBe(false)
    expect(hasMarkupOrMath('Option A')).toBe(false)
    expect(hasMarkupOrMath('Newton\'s second law of motion')).toBe(false)
  })

  it('routes bold through ReactMarkdown', () => {
    expect(hasMarkupOrMath('**bold text**')).toBe(true)
  })

  it('routes italic through ReactMarkdown', () => {
    expect(hasMarkupOrMath('*italic text*')).toBe(true)
    expect(hasMarkupOrMath('_italic text_')).toBe(true)
  })

  it('routes Markdown lists through ReactMarkdown', () => {
    expect(hasMarkupOrMath('- item one\n- item two')).toBe(true)
    expect(hasMarkupOrMath('1. first\n2. second')).toBe(true)
  })

  it('routes Markdown tables through ReactMarkdown', () => {
    expect(hasMarkupOrMath('| A | B |\n| - | - |\n| 1 | 2 |')).toBe(true)
  })

  it('routes inline code through ReactMarkdown', () => {
    expect(hasMarkupOrMath('Use `printf()` to print')).toBe(true)
  })

  it('routes Markdown headers through ReactMarkdown', () => {
    expect(hasMarkupOrMath('# Section\n\nParagraph')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 2. Inline LaTeX
// ---------------------------------------------------------------------------
describe('2. Inline LaTeX', () => {
  it('detects $...$ inline math', () => {
    expect(hasMarkupOrMath('Solve $2x^2 + 3x - 5 = 0$')).toBe(true)
    expect(hasMarkupOrMath('Find $\\alpha + \\beta$')).toBe(true)
  })

  it('detects \\(...\\) inline math', () => {
    expect(hasMarkupOrMath('The value is \\(x^2\\)')).toBe(true)
  })

  it('sanitizeLatex leaves well-formed inline math unchanged', () => {
    const input = 'Solve $2x^2 + 3x - 5 = 0$'
    expect(sanitizeLatex(input)).toBe(input)
  })

  it('sanitizeLatex passes through space-padded math unchanged (remark-math handles it)', () => {
    // remark-math v6 handles "$ x $" natively — sanitizeLatex no longer
    // needs to strip inner spaces, and doing so would corrupt adjacent
    // math expressions like "$a$ in $b$".
    expect(sanitizeLatex('$ x $')).toBe('$ x $')
    expect(sanitizeLatex('The value is $ \\alpha $.')).toBe('The value is $ \\alpha $.')
  })

  it('detects \\begin{ as LaTeX delimiter', () => {
    expect(hasMarkupOrMath('\\begin{cases}')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 3. Block LaTeX
// ---------------------------------------------------------------------------
describe('3. Block LaTeX', () => {
  it('detects $$...$$ block math', () => {
    expect(hasMarkupOrMath('$$N_2 + 3H_2 \\rightleftharpoons 2NH_3$$')).toBe(true)
    expect(hasMarkupOrMath('$$\\frac{a}{b} = c$$')).toBe(true)
  })

  it('detects \\[...\\] block math', () => {
    expect(hasMarkupOrMath('\\[E = mc^2\\]')).toBe(true)
  })

  it('sanitizeLatex leaves well-formed block math unchanged', () => {
    const input = '$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$'
    expect(sanitizeLatex(input)).toBe(input)
  })

  it('sanitizeLatex handles \\begin/\\end pairs correctly inside $$', () => {
    const input = '$$\\begin{cases} x & y \\\\ z & w \\end{cases}$$'
    expect(sanitizeLatex(input)).toBe(input)
  })
})

// ---------------------------------------------------------------------------
// 4. Chemistry formulas (LaTeX)
// ---------------------------------------------------------------------------
describe('4. Chemistry formulas (LaTeX)', () => {
  it('detects LaTeX chemistry with \\mathrm', () => {
    expect(hasMarkupOrMath('$\\mathrm{H_2O}$')).toBe(true)
    expect(hasMarkupOrMath('$\\mathrm{SO_4^{2-}}$')).toBe(true)
    expect(hasMarkupOrMath('$\\mathrm{NH_4^+}$')).toBe(true)
    expect(hasMarkupOrMath('$\\mathrm{KMnO_4}$')).toBe(true)
  })

  it('sanitizeLatex leaves \\mathrm chemistry unchanged', () => {
    const formulas = [
      '$\\mathrm{H_2O}$',
      '$\\mathrm{SO_4^{2-}}$',
      '$\\mathrm{NH_4^+}$',
      '$\\mathrm{N_2 + 3H_2 \\rightleftharpoons 2NH_3}$',
    ]
    for (const f of formulas) {
      expect(sanitizeLatex(f)).toBe(f)
    }
  })

  it('mixed question text: oxidation state of Mn in KMnO₄', () => {
    const text = 'Which is the oxidation state of $\\mathrm{Mn}$ in $\\mathrm{KMnO_4}$?'
    expect(hasMarkupOrMath(text)).toBe(true)
    expect(sanitizeLatex(text)).toBe(text)
  })
})

// ---------------------------------------------------------------------------
// 5. Chemical / reaction arrows
// ---------------------------------------------------------------------------
describe('5. Chemical / reaction arrows', () => {
  it('Unicode reaction arrows take the fast path (no ReactMarkdown needed)', () => {
    // These are plain Unicode — correct, no LaTeX processing required.
    expect(hasMarkupOrMath('N₂ + 3H₂ ⇌ 2NH₃')).toBe(false)
    expect(hasMarkupOrMath('A → B')).toBe(false)
    expect(hasMarkupOrMath('A ↔ B')).toBe(false)
  })

  it('LaTeX reaction arrows route through KaTeX', () => {
    expect(hasMarkupOrMath('$A \\rightarrow B$')).toBe(true)
    expect(hasMarkupOrMath('$A \\rightleftharpoons B$')).toBe(true)
    expect(hasMarkupOrMath('$\\mathrm{N_2 + 3H_2 \\rightleftharpoons 2NH_3}$')).toBe(true)
  })

  it('sanitizeLatex leaves LaTeX arrow expressions unchanged', () => {
    const input = '$\\mathrm{N_2 + 3H_2 \\rightleftharpoons 2NH_3}$'
    expect(sanitizeLatex(input)).toBe(input)
  })
})

// ---------------------------------------------------------------------------
// 6. Superscripts / subscripts
// ---------------------------------------------------------------------------
describe('6. Superscripts / subscripts', () => {
  it('Unicode superscripts/subscripts take the fast path', () => {
    // Common in demo seed data — no processing needed.
    expect(hasMarkupOrMath('2²⁰ operations')).toBe(false)
    expect(hasMarkupOrMath('H₂O molecule')).toBe(false)
    expect(hasMarkupOrMath('x² + y²')).toBe(false)
    expect(hasMarkupOrMath('CO₂ concentration')).toBe(false)
  })

  it('LaTeX superscripts/subscripts route through KaTeX', () => {
    expect(hasMarkupOrMath('$x^2 + y^2 = r^2$')).toBe(true)
    expect(hasMarkupOrMath('$H_2O$')).toBe(true)
    expect(hasMarkupOrMath('$a_{ij}$')).toBe(true)
    expect(hasMarkupOrMath('$e^{i\\pi} + 1 = 0$')).toBe(true)
  })

  it('sanitizeLatex leaves LaTeX sub/superscripts unchanged', () => {
    const cases = [
      '$x^2 + y^2 = r^2$',
      '$H_2O$',
      '$a_{ij}$',
      '$e^{i\\pi} + 1 = 0$',
    ]
    for (const c of cases) {
      expect(sanitizeLatex(c)).toBe(c)
    }
  })
})

// ---------------------------------------------------------------------------
// 7. Mixed Markdown + LaTeX
// ---------------------------------------------------------------------------
describe('7. Mixed Markdown + LaTeX', () => {
  it('detects mixed content', () => {
    expect(hasMarkupOrMath('The **quadratic formula** is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$')).toBe(true)
    expect(hasMarkupOrMath('Given *velocity* $v = \\frac{ds}{dt}$, find acceleration.')).toBe(true)
  })

  it('sanitizeLatex handles mixed content without corrupting Markdown', () => {
    const input = 'The **quadratic formula** is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$'
    const out = sanitizeLatex(input)
    // Markdown bold must be intact
    expect(out).toContain('**quadratic formula**')
    // LaTeX must be intact
    expect(out).toContain('$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$')
  })

  it('mixed content with a list and inline LaTeX', () => {
    const text = 'Properties:\n- Mass $m$\n- Velocity $v$\n- Kinetic energy $\\frac{1}{2}mv^2$'
    expect(hasMarkupOrMath(text)).toBe(true)
    expect(sanitizeLatex(text)).toBe(text)
  })
})

// ---------------------------------------------------------------------------
// 8. Text + image (Markdown image syntax)
// ---------------------------------------------------------------------------
describe('8. Text + image (Markdown image syntax)', () => {
  it('detects Markdown image syntax', () => {
    expect(hasMarkupOrMath('Look at the figure: ![circuit diagram](https://example.com/diagram.png)')).toBe(true)
    expect(hasMarkupOrMath('![alt](https://example.com/img.svg)')).toBe(true)
  })

  it('renders a Markdown image as a responsive <img> element', () => {
    const html = renderToString(
      <MathText>{'![circuit diagram](https://example.com/diagram.png)'}</MathText>,
    )
    expect(html).toContain('<img')
    expect(html).toContain('src="https://example.com/diagram.png"')
    expect(html).toContain('alt="circuit diagram"')
    // Responsive classes must be present
    expect(html).toContain('max-w-full')
    expect(html).toContain('object-contain')
  })

  it('image loading is lazy', () => {
    const html = renderToString(
      <MathText>{'![fig](https://example.com/figure.png)'}</MathText>,
    )
    expect(html).toContain('loading="lazy"')
  })
})

// ---------------------------------------------------------------------------
// 9. Image-based options (structured option objects with imageUrl)
// ---------------------------------------------------------------------------
describe('9. Image-based options', () => {
  // Structured options from the AI service: { key, text, imageUrl }
  // These are resolved by optionText() before being passed to MathText,
  // and the imageUrl is rendered separately as an <img> tag by each
  // question consumer (exam-agent-live, paper-parts).  MathText itself
  // only handles the text portion — rendering of imageUrl is a consumer
  // responsibility.  We test here that:
  //   (a) text from a structured option renders correctly through MathText
  //   (b) text with LaTeX in options is not treated as plain text

  it('plain option text takes the fast path', () => {
    expect(hasMarkupOrMath('Stack')).toBe(false)
    expect(hasMarkupOrMath('BFS traversal')).toBe(false)
  })

  it('option text with LaTeX routes through KaTeX', () => {
    expect(hasMarkupOrMath('$2\\pi r$')).toBe(true)
    expect(hasMarkupOrMath('$\\frac{1}{2}mv^2$')).toBe(true)
  })

  it('renders option text with LaTeX without errors', () => {
    const html = renderToString(<MathText>{'$\\frac{1}{2}mv^2$'}</MathText>)
    // KaTeX output is present (katex class or span)
    expect(html).toMatch(/katex|<span/)
    // No raw dollar signs rendered as text
    expect(html).not.toContain('$\\frac')
  })
})

// ---------------------------------------------------------------------------
// 10. Multiple image options
// ---------------------------------------------------------------------------
describe('10. Multiple image options', () => {
  // Multiple options with imageUrls each render an <img> independently.
  // The consumer (exam-agent-live / paper-parts) renders each option's
  // imageUrl alongside the label. The key invariant is that each option
  // text (label) still renders through MathText without cross-contamination.

  it('each option label is independent — no bleed between options', () => {
    const labels = [
      '$\\mathrm{H_2O}$',
      '$\\mathrm{CO_2}$',
      '$\\mathrm{NH_3}$',
      '$\\mathrm{SO_4^{2-}}$',
    ]
    for (const label of labels) {
      expect(hasMarkupOrMath(label)).toBe(true)
      // sanitizeLatex must not corrupt one option while fixing another
      expect(sanitizeLatex(label)).toBe(label)
    }
  })

  it('renders four chemical formula options without throwing', () => {
    const labels = ['$\\mathrm{H_2O}$', '$\\mathrm{CO_2}$', '$\\mathrm{NH_3}$', '$\\mathrm{SO_4^{2-}}$']
    expect(() => {
      for (const label of labels) {
        renderToString(<MathText>{label}</MathText>)
      }
    }).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// 11. Very tall / wide images
// ---------------------------------------------------------------------------
describe('11. Very tall / wide images', () => {
  it('Markdown image uses max-h-64 to cap very tall images', () => {
    const html = renderToString(
      <MathText>{'![tall diagram](https://example.com/tall.png)'}</MathText>,
    )
    expect(html).toContain('max-h-64')
  })

  it('Markdown image uses max-w-full to cap very wide images', () => {
    const html = renderToString(
      <MathText>{'![wide diagram](https://example.com/wide.png)'}</MathText>,
    )
    expect(html).toContain('max-w-full')
  })

  it('object-contain preserves aspect ratio for both orientations', () => {
    const html = renderToString(
      <MathText>{'![figure](https://example.com/portrait.png)'}</MathText>,
    )
    expect(html).toContain('object-contain')
    // Must NOT use object-cover (which would crop/distort)
    expect(html).not.toContain('object-cover')
  })
})

// ---------------------------------------------------------------------------
// 12. Mobile rendering
// ---------------------------------------------------------------------------
describe('12. Mobile rendering', () => {
  // MathText is a <span> wrapper — it doesn't own layout, the parent does.
  // The key mobile-safe contract is:
  //   - no fixed widths (px-based) set by MathText itself
  //   - max-w-full on images prevents overflow beyond the viewport
  //   - plain text uses whitespace-pre-wrap (text wraps naturally)

  it('plain text uses whitespace-pre-wrap (wraps on mobile)', () => {
    const html = renderToString(<MathText>{'Plain question text that should wrap'}</MathText>)
    expect(html).toContain('whitespace-pre-wrap')
  })

  it('Markdown path does not produce fixed-width inline styles', () => {
    const html = renderToString(<MathText>{'$E = mc^2$'}</MathText>)
    // No inline pixel widths that could overflow narrow viewports
    expect(html).not.toMatch(/style="[^"]*width:\s*\d+px/)
  })

  it('image rendered by MathText has max-w-full for mobile safety', () => {
    const html = renderToString(
      <MathText>{'![fig](https://example.com/mobile.png)'}</MathText>,
    )
    expect(html).toContain('max-w-full')
  })
})

// ---------------------------------------------------------------------------
// 13. Existing legacy question formats (backward compatibility)
// ---------------------------------------------------------------------------
describe('13. Legacy question formats (backward compatibility)', () => {
  // The existing demo/seed data uses Unicode math — plain text, no LaTeX.
  // These must take the fast path and render unchanged.

  it('Unicode subscripts/superscripts render as plain text', () => {
    const unicode = [
      'N₂ + 3H₂ ⇌ 2NH₃',
      '∫₀¹ x² dx = 1/3',
      '⌊log₂ n⌋ + 1 levels',
      '6.022 × 10²³ molecules',
      '1.6 × 10⁻¹⁹ coulombs',
      'K₄[Fe(CN)₆]',
    ]
    for (const text of unicode) {
      expect(hasMarkupOrMath(text)).toBe(false)
    }
  })

  it('Unicode arrows and operators render as plain text', () => {
    expect(hasMarkupOrMath('A → B → C')).toBe(false)
    expect(hasMarkupOrMath('A ⇌ B')).toBe(false)
    expect(hasMarkupOrMath('a ↔ b')).toBe(false)
    expect(hasMarkupOrMath('5 × 10⁶')).toBe(false)
  })

  it('plain text renders as a whitespace-pre-wrap span', () => {
    const html = renderToString(<MathText>{'Which data structure does BFS use?'}</MathText>)
    expect(html).toContain('whitespace-pre-wrap')
    expect(html).toContain('Which data structure does BFS use?')
  })

  it('existing Unicode question text is not corrupted by sanitizeLatex', () => {
    const legacyQuestions = [
      'In an undirected graph, BFS from a source visits all reachable vertices.',
      'N₂ + 3H₂ ⇌ 2NH₃ — name this reaction.',
      '⌊log₂ n⌋ + 1 is the height of a complete binary tree with n nodes.',
      'The Avogadro number is 6.022 × 10²³.',
    ]
    for (const q of legacyQuestions) {
      // sanitizeLatex must not alter text with no $ delimiters
      expect(sanitizeLatex(q)).toBe(q)
    }
  })

  it('AI LaTeX with missing \\begin is repaired by fixMissingBegins', () => {
    // AI models sometimes emit \end{cases} without \begin{cases}
    const broken = '\\end{cases} x = 1'
    const fixed = fixMissingBegins(broken)
    expect(fixed).toContain('\\begin{cases}')
    expect(fixed).toContain('\\end{cases}')
  })

  it('fixMissingBegins leaves well-formed LaTeX unchanged', () => {
    const ok = '\\begin{cases} x & \\text{if } x > 0 \\\\ 0 & \\text{otherwise} \\end{cases}'
    expect(fixMissingBegins(ok)).toBe(ok)
  })

  it('fixMissingBegins returns body unchanged when no \\end tags present', () => {
    const noEnd = 'x + y = z'
    expect(fixMissingBegins(noEnd)).toBe(noEnd)
  })

  it('sanitizeLatex wraps dollar-sign block containing orphan \\end', () => {
    const input = '$\\end{cases}$'
    const out = sanitizeLatex(input)
    expect(out).toContain('\\begin{cases}')
    expect(out).toContain('\\end{cases}')
  })
})
