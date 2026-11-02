# V2 technical audit — layout failures and engine correction

This audit was performed before the V1 compositions were replaced. It records the concrete causes of the rejected reports' overlapping text, compressed charts, incorrect vertical spacing and poorly used pages.

## Phase 1 — measured evidence from V1 PDFs

A PyMuPDF bounding-box audit of the V1 deliverables found:

| V1 file | Pages | Geometric flags | Representative failure |
| --- | ---: | ---: | --- |
| Full Exam Analysis Report | 14 | 107 | `182` overprinting the breakdown line; `182` overprinting `of 300`; chart labels overprinting progress tracks; subject bands overprinting notes |
| Exam Intelligence Report | 2 | 112 | chapter-time labels crossing the footer; header/footer text overprinting chart rows; revision-band titles overprinting their notes |
| V1 synthetic full QA | 24 | 95 | long chapter labels overprinting adjacent rows; wrapped chart labels colliding with legends |
| V1 synthetic intelligence QA | 2 | 59 | long chapter labels overprinting each other; many text/bar intersections |

The false positives among those counts were pill backgrounds intentionally containing text; the validator excluded those by treating contained elements as valid. Real text/text and text/footer collisions remained.

## Root causes

1. **Fixed-height metric and heading blocks.** `MetricCard`, `SectionHeading`, `SubsectionHeading`, `SubjectSection` and `KeyValueGrid` reserved hard-coded heights such as `56`, `40`, `26 + (note ? 12 : 0)` and `38`. Wrapped values and notes were drawn outside those boxes.
2. **Incorrect cursor advancement.** `flow()` reserved a declared height, but components were free to draw more than that height. `ctx.y` advanced by the declaration, not the real rendered bottom.
3. **Question cards were fragmented.** `QuestionAnalysisCard` split one logical card into four independently reserved slices (`header`, question text, answer comparison, solution). A page break could occur inside a normal card, and continuation labels were not tied to actual content boundaries.
4. **Chart rows used fixed coordinates.** `PerformanceChart` computed `rowH = min(19, max(12, available / count))` and passed that value as a text `lineHeight`. Long labels such as `Calculation Error`, `NCERT Detail Error` and long chapter names wrapped into two or more lines while the next row still began after one fixed row height.
5. **Chart labels, bars and legends were not measured together.** Labels, tracks, numeric values and legends used fixed `top`, `rowH`, `legendY` and `y + h - 12` coordinates. `ChapterTime` also capped height with `min(220, 46 + bars.length * 11)`.
6. **The intelligence report bypassed the cursor.** `pageOne()` called `ctx.reserve(CONTENT.h)` and then drew from a local `y = CONTENT.y`; `pageTwo()` did the same and manually rewrote `ctx.y = CONTENT.bottom - 58`. This caused the chapter-time chart to enter the footer region and `FinalBranding` to collide with evidence tables.
7. **Footer and source-register collisions.** The source register used two-column rows with fixed-ish coordinates, while `FinalBranding` was placed at a manually selected Y. No fixed footer-reserved boundary was enforced.
8. **Text measurement did not use font metrics.** V1 used PDFKit's wrapper with `lineHeight` values such as `rowH` or `10` that could be smaller than the glyph's natural ascender-to-descender height. Mixed Inter/STIX Unicode runs were measured run-by-run but their line box did not reserve the maximum natural height.
9. **No component boundary contract.** Components did not declare required width/height, actual rendered height, spacing or split policy, and there was no independent geometry manifest to compare against the rendered PDF.
10. **Decorative full-page grid.** `drawGrid()` drew twelve vertical rules across every page, creating a dashboard feel rather than an editorial publication.

## V2 engine corrections

- `ReportContext.component()` now takes a `measure()` function, reserves exactly the measured height plus declared top/bottom spacing, creates an audited boundary, draws inside it, and records `actualRenderedHeight` from every descendant box. No component can silently exceed its frame.
- `TextEngine` uses registered-font ascender/descender metrics, a shared `layout()` for measurement and drawing, per-run font measurement for Inter/STIX Unicode, explicit paragraph gaps, character-boundary breaking for over-long words, and line boxes that always exceed the natural glyph height.
- `Canvas` records every text, math, bar, image, rule and shape box. `LayoutAudit` stores a containment tree so intentional parent-child containment is allowed while sibling/independent collisions are rejected.
- `BarChartSpec` computes its column geometry from the available width, measures every label and numeric value, derives each row height from those measurements, centres the bar inside that row, and places the legend after all measured rows.
- `MeasuredTable` derives row heights from measured cells, repeats headers after page breaks, supports measured subject-group separators, and places progress bars below their value text.
- Pagination reserves header/footer space, keeps section headings with following content, repeats table headers, keeps normal question cards together, and labels only genuinely long solution continuations.
- `sectionBreak()` fills a short continuation page with the next section rather than forcing a nearly blank spread. `bottomFrame()` distributes the remaining space around final branding.
- Fixed chrome is audited separately. Page numbers and totals are drawn only after pagination is final.
- `scripts/verify_report_pdfs.py` independently recomputes manifest intersections and compares actual PyMuPDF line boxes against each other, chart bars, the footer region and page bounds. Generation fails if the JS audit reports any unintended collision.

## Verified outcome

- Full Exam Analysis Report: **16 pages**.
- Exam Intelligence Report: **4 pages**.
- Canonical source values preserved: **247 / 247**.
- Generator layout audit: **zero unintended overlaps** for both canonical reports and all six synthetic QA PDFs.
- Independent rendered-PDF validation: **zero text/text, text/bar, footer, clipping or out-of-bounds defects**.
- Minimum rendered type size: **7.5 pt** in the full report and **7.8 pt** in the intelligence report.
- All 26 automated checks pass. See `VERIFICATION_RESULTS.md` and `verification-results.json`.
