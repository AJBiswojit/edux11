# Premium PDF — Content Rendering, Image Integration & Editorial Cleanup

**Scope:** MediXO EduX AI Exam Analysis exports built by the Premium PDFKit pipeline
(`frontend/src/pages/student/premium-pdf/`) — *Full Exam Analysis* and *Exam Intelligence Report*.
**Branch:** `arena/dad435e3-edux11` · **Engine:** `premium-academic-editorial-v2 + figure-asset-layer`
**Verified:** `deliverables/refinement/verification.json` — **11 PDFs, 322 pages, 215 embedded figures, all checks passed.**

---

## 1. Root cause of the missing figures

Figures never reached the page for four independent reasons; each one alone was enough to hide an image.

| # | Root cause | Where it lived | Effect |
|---|---|---|---|
| 1 | **Question normalisation dropped the image fields.** `buildQuestions()` copied `q`, `subject`, `topic`, `type`, `status`, `marks`, `time` and nothing else, so `imageUrl` / `stemImageUrls` / `option.imageUrl` were silently discarded before the renderer ever ran. | `premium-pdf/model.js` (`buildQuestions`) | No figure reference existed to draw. |
| 2 | **Series and object options were stringified.** Options arrived as `{ key, text, imageUrl }` and answers as objects; `asText()` / `displayAnswer()` fell back to `String(value)` / `JSON.stringify(value)`. | `premium-pdf/model.js` | Option figures had no owner, and raw JSON could be printed as an "option". |
| 3 | **No asset layer at all.** The renderer drew only text and vector charts; there was no fetch, no format detection, no intrinsic-size read, no placement budget. | `premium-pdf/*` (pre-refinement) | Even a present `imageUrl` had nowhere to go. |
| 4 | **Wrong origin / no credentials.** Stored references are `/media/...` paths served by the backend, while the export runs in the browser from the Vite origin (or an absolute API origin in production). PDFKit also refuses WebP/AVIF/SVG outright, and it cannot open a path with a `?v=2` cache-buster. | asset resolution | 404s, "Incomplete or corrupt PNG file" aborts, silently missing figures. |

The fix therefore needed a normalisation layer, an asynchronous asset layer that runs **before** the synchronous
PDFKit layout, a measured placement model, and a diagnostic channel that never aborts a report.

---

## 2. Supported image fields

`premium-pdf/questions.js` normalises every spelling the bank and the exam engine have ever produced, into one
internal contract: `question.media.statement[]`, `question.media.options[label][]`, `question.media.explanation[]`.

**Stem / question figure**

```
imageUrl, image_url, imageURL
imageUrls, image_urls, imageURLs
stemImageUrl, stem_image_url            (legacy pipe-joined: "a.png|b.png")
stemImageUrls, stem_image_urls, stem_images
questionImageUrl, question_image_url
questionImageUrls, question_image_urls
figureUrl, figure_url, figureUrls, figure_urls
images, image, figure, figures, diagram, diagrams      (each { url|src|href|path|imageUrl|file|location })
```

**Option figure** (`question.options[]`, each option normalised to `{ label, key, text, images[] }`)

```
imageUrl, image_url, imageURL, imageUrls, image_urls
images, image, figureUrl, figure_url, figureUrls, figure_urls
option.imageUrl, option.image_url  (object options)
```

**Explanation figure**

```
explanationImageUrl, explanation_image_url, explanationImageUrls, explanation_image_urls
solutionImageUrl, solution_image_url, solutionImageUrls, solution_image_urls
explanationImages, solutionImages
inline markdown images inside the explanation / solution text
```

Value forms accepted for any of the above: absolute `http(s)` URL, same-origin `/media/...` path, `data:image/...`
data URL, `blob:` URL, nested `{ url }` object, and a single string or array. Duplicates are de-duplicated by URL,
and a reference that is also present in the stem is not drawn twice for the same option.

---

## 3. Asset resolution

`premium-pdf/media.js` is the only place that decides where an image comes from.

1. **Reference → URL** (`resolveAssetUrl`): `data:`/`blob:` and absolute URLs pass through; `/media/...` stays
   same-origin when `VITE_API_BASE_URL` is same-origin (the documented Vite/nginx `/media` proxy), and is
   re-based onto the API origin when `VITE_API_BASE_URL` is absolute. No host is hard-coded.
2. **Fetch with the app's own credentials** — the browser loader reuses the existing authenticated request path;
   the Node harness maps `/media/x` to `backend/media/x` on disk.
3. **Preload before layout.** `renderPremiumPdf()` awaits `loadQuestionMedia()` first, because PDFKit layout is
   synchronous. Figures are requested with a small worker pool (default 4) and a URL cache, so a repeated crop is
   fetched once.
4. **Real bytes only.** Format is detected from the file signature, never from the extension, and the intrinsic
   pixel size is read from those bytes so the renderer can reserve the exact drawn height.
5. **Diagnostics, never aborts.** Every failure produces
   `{ code, questionId, questionIndex, field, option, message }`. Codes: `http-error`, `no-loader`,
   `unsupported-format`, `convert-failed`, `too-large`, `decode-failed`, `load-failed`.
   The generator prints them to the console in dev and stores them in `generation-results.json`; nothing appears
   on a student page.
6. **Clean placeholder.** A missing figure renders as an indented ruled note — *"The figure for this question
   could not be displayed."* — with no URL, no filename and no JSON.

The harness also strips `?query`/`#hash` before opening a local file, which is what fixed the
`p0001_qQ5_diagram_13.png?v=2` `http-error`.

---

## 4. Format handling

PDFKit can embed **PNG** and **JPEG** only. Everything else is converted to PNG, never stretched, never re-encoded
twice, never upscaled.

| Container | Strategy |
|---|---|
| PNG, JPEG | Embedded byte-for-byte (no quality loss, no recompression). |
| WebP, AVIF, SVG, GIF, BMP, TIFF | Converted to PNG through an injected converter. Browser: `createImageBitmap` + `OffscreenCanvas`. Node harness: `frontend/scripts/lib/convert_question_image.py` (Pillow, with `pillow_avif` for AVIF and `cairosvg` for SVG), cached by content hash. |
| Unknown / corrupt | Diagnostic `unsupported-format` / `decode-failed`, placeholder drawn, report continues. |

**Aspect ratio** is preserved by construction: every figure is measured once (`measureFigure`) to a
width ≤ its field limit, then height = `width × pixels_h / pixels_w`; nothing is ever drawn outside the measured
box. A group of figures under one field shares a single scale factor, so relative sizes stay truthful.

Field limits (`FIGURE_LIMITS`): statement 356×250 pt (min 130), option 232×118 pt (min 104),
explanation 340×210 pt (min 120). A small source image is never blown up beyond its natural size.

**Placement order** inside a question block is exactly the reading order:

```
number + metadata → statement → statement figures → OPTIONS A–D (+ option figures)
→ STUDENT RESPONSE / CORRECT ANSWER → PERFORMANCE INSIGHT → EXPLANATION (+ explanation figures)
```

Option figures sit **beside their own letter** (left-aligned, not centred) so a figure can never read as belonging
to the next option. On a question whose intro overflows a page, the answer-choice figures move to a two-column
`OPTION FIGURES` board where each letter is on the same row as its own picture.

---

## 5. JSON / internal-field cleanup

Every student-facing string now passes through one text gateway (`asText`, `toDisplayText`, `displayAnswer`,
`responseLabel`, `marksLabel`). Objects are reduced to their human field; a serialised object is never printed.

| Leak (before) | Behaviour now |
|---|---|
| `{"key":"A","text":"20.4 m","imageUrl":"…"}` printed as an option | option text only; the image is fetched and drawn |
| `"[object Object]"` / `"null"` / `"undefined"` | replaced by `—` or an honest note |
| `imageUrl`, `image_url`, `/media/…`, `https://…` | never printed; figures are drawn, not described |
| `Source fingerprint 91357BA6 · 2026-11-02T09:00:00.000Z` | removed (source register + fingerprint deleted) |
| `FAR / ATS-JEE-2026-07`, `EIR / …` in header and footer | removed; the footer now carries the reader (`Aarav Sharma · Roll 21CS114`) |
| Internal `reportId` / `examId` / `sourceHash` | retained on the model for diagnostics only, never drawn |
| `-1 marks`, `-1 marks awarded` | `−1 mark` and `1 mark deducted` (plural-aware, sign-aware) |
| `Not attempted` while an answer simply was not published | `Not published` when the status says the question *was* attempted |

Preserved academic content: exam name, subject(s), dates, question number, chapter/topic, difficulty, type, marks,
time, statement, options, selected answer, correct answer, explanation (all parts), mistake category/note.

`scripts/verify_refinement_pdfs.py` re-opens every produced PDF and greps the *visible* text for 19 forbidden
patterns (URLs, `/media/`, image filenames, JSON braces/quotes, `image_url`, `undefined`, `NaN`,
`[object Object]`, fingerprints, `FAR /`/`EIR /`, report/exam ids, `sha256`/`md5`, UUIDs, 16-char hex, `null`).
Result: **0 hits across 322 pages**.

---

## 6. Two-column audit

The legacy layout composed "sections" with `EditorialColumns`, which put two independent table groups side by side.
Each group paginated inside half the content width, so headers repeated twice, cells wrapped early and the reading
order jumped left-right instead of down.

Audit result of every render site:

| Site | Was | Now |
|---|---|---|
| Chapter mastery by subject | 2 columns | full-width `MeasuredTable`, grouped by subject |
| Topic-level accuracy | 2 columns | full-width table |
| Subject-wise weak/strong topics | 2 columns | full-width stack |
| Mistake pattern analysis | 2 columns | full-width bar chart |
| Subject and chapter mastery (report) | 2 columns | stacked full-width tables |
| Priority revision board | 2 columns | single full-width table |
| Subject performance / comparison | 2 columns | stacked table + ledger |
| Question | Subject | Accuracy | Mastery | **kept multi-column** — it is genuinely tabular |
| Benchmark register | **kept multi-column** (Benchmark / Score / Percentile / Grade / Reference) |
| Question block OPTIONS grid | **kept 2-up only for image-only choices**, letters are always in reading order |

Grouped tables also drop their own group column (`Subject`) automatically, because the subject band above the rows
already states it on every page — that removes one repeated column from chapter mastery, topic accuracy, revision
and time tables.

`EditorialColumns`, `StaticTableSpec` and `StackSpec` remain exported but are no longer called; the new verifier
fails the build if two table header bands ever sit at the same height on a page
(`check_single_column_tables`, which reads the actual midnight header rectangles from the PDF drawings).
Result: **0 side-by-side table bands across 322 pages.** Tables repeat their header on every continuation page
(`tableId` + `headerOnPage` logic, verified by `repeatedTableHeaderFailures: []` in the layout audit).

---

## 7. Typography and visual-noise cleanup

| Removed | Replaced by |
|---|---|
| "ACADEMIC INTELLIGENCE / PUBLICATION" header, "08 Source data register", "08A addendum" | header carries `FULL EXAM ANALYSIS` / `EXAM INTELLIGENCE REPORT` + subject |
| FAR/EIR code, exam id, `Source fingerprint <hash>`, ISO timestamp | nothing — internal values never printed |
| `Q14 · Q14 · Incorrect` double title, status chips ("Incorrect", "Skipped") | single `QUESTION 14` + colour-coded status word aligned right |
| Six-up KPI grid (SUBJECT / CHAPTER / TOPIC / DIFFICULTY / TYPE / STATUS) | one metadata line: `Mechanics · MCQ · 4 marks · 2m 06s` |
| Cover KPI strip repeating score and response split | secondary-only strip: Accuracy · Percentile · Rank (· Average pace) |
| Duplicate "SOLUTION / EXPLANATION" + "EXPLANATION" head | one `EXPLANATION` head, part labels only when a part is not the explanation |
| Benchmark chart + benchmark table saying the same thing | the table alone |
| `Answered correctly — -1 marks awarded` | `Answered correctly — 1 mark deducted` |

Type scale was **raised**, never lowered, to fit pages (`TYPE`: coverTitle 31, reportTitle 24, section 21,
subsection 14, body 10, bodySmall 9.4, table 9.2, tableLabel 8.6, folio 8.2). No page was shrunk to fit; pagination
decides where content goes.

Editorial rules enforced while doing this: one heading per section, headings never close a page
(`keepWithNext` measured against the next real block, and a subject band measures the first question card it
introduces, capped at 330 pt so a figure-heavy question cannot strand it), colophon anchored to the foot of the
closing page, and the reader's identity in the footer instead of a repeated exam title.

---

## 8. Question-block improvements

```
┌ QUESTION 12  PHYSICS                                        CORRECT ┐
│ Chemical Bonding · Molecular geometry · Medium · MCQ · 4 marks · 3m 36s
│ <statement, markdown + inline math rendered>
│ <statement figures — centred plate, aspect preserved>
│ OPTIONS
│ A. <text>        <option figure, aligned to its own letter>
│ B. <text>        <option figure>
│ ...
│ STUDENT RESPONSE            CORRECT ANSWER
│ C                           A
│ PERFORMANCE INSIGHT
│ Answered incorrectly — 1 mark deducted · Concept Error · <note>
│ ─ EXPLANATION ─────────────────────────────────────────────
│ <solution parts, MathJax→SVG, headings only when meaningful>
│ <explanation figures>
└─────────────────────────────────────────────────────────────┘
```

* Missing statement/options → one honest note, no empty grid; never a raw payload.
* Image-only options → letter and picture on one baseline; the `OPTION FIGURES` board is used only when the intro
  had to break across pages, two choices per row.
* Long option text wraps inside its own column (`textWidth = innerW − 22`), never colliding with the letter.
* Heights are measured with the same engine that draws, so `measure()` = `actualRenderedHeight`; the earlier
  `+5.2 pt` drift (which produced 729 overlaps in `full-edge-cases-2-subjects`) is gone.

---

## 9. Pagination compatibility

The existing content-driven paginator was kept — no page-count target, no font shrinking, no dropped content.

* **Question cards stay together** when they fit (`keepTogether`, `allowSplit: false`); a long card splits into
  `question-card-intro` → `solution-label` → per-line solution components, each with a continuation heading
  (`Chemistry · Q10 · question continued` / `explanation continued`).
* **Continuation headings** are drawn by the page guard, not by the caller, so they cannot duplicate the card title.
* **Page guards** (`paginateSingle`) reject any component taller than the printable area and split it instead of
  overflowing; `overflowingComponents: 0` on every report.
* **Tables** repeat their header and never split a row that fits a page; a row taller than a page is expanded into
  a `tableRowOverflowSpec` flow rather than clipped.
* **Subject transitions** keep the band with the first question of that subject (measured lookahead).
* **End matter**: the colophon is anchored to the foot of the last page; no blank page is created for it.
* 180-question NEET payload (196 pages) renders all 180 questions, explanations and subject separations.

---

## 10. Exact files modified

**Added**

| File | Purpose |
|---|---|
| `frontend/src/pages/student/premium-pdf/questions.js` | question/option/explanation normalisation, figure-reference collection, de-JSON-ification |
| `frontend/src/pages/student/premium-pdf/media.js` | `resolveAssetUrl`, `createAssetLoader`, `loadQuestionMedia`, `questionMediaSlots`, `summariseMedia` |
| `frontend/src/pages/student/premium-pdf/figures.js` | `FIGURE_LIMITS`, `measureFigure`, `layoutFigureStack`, `drawFigureItems` (align), `drawFigure` |
| `frontend/scripts/lib/convert_question_image.py` | Pillow/cairosvg stdin→PNG converter for WebP/AVIF/SVG/GIF/BMP/TIFF |
| `frontend/scripts/lib/node-media-loader.mjs` | Node asset loader: `/media/...` → `backend/media/...`, signature sniffing, conversion cache |
| `frontend/scripts/lib/figure-fixtures.mjs` | figure-rich 18-question fixture (all field spellings, data URL, WebP, AVIF, missing file, pipe-joined) |
| `frontend/scripts/generate-refinement-pdfs.mjs` | refinement harness: canonical + figures + six Role×Report + NEET-180 → `deliverables/refinement/` |
| `scripts/verify_refinement_pdfs.py` | independent PDF verification + previews → `deliverables/refinement/verification.json` |
| `backend/media/pdf_extract/qa-figures/circuit.webp` / `.avif` | conversion test assets (5 754 B / 3 970 B) |
| `deliverables/refinement/**` | generated PDFs, QA PDFs, six exports, previews, `generation-results.json`, `layout-audit.json`, `verification.json` |

**Modified**

| File | Change |
|---|---|
| `premium-pdf/model.js` | normalised question content, `optionItems`, `explanationParts`, `media` stub, `reportLabel`, `figureQuestionCount`, `figureReferenceCount`, `compactExamTitle`, `rankLabel`/`percentileLabel`/`paceLabel`, safe text gateways |
| `premium-pdf/renderer.js` | removed source register + addendum, added `contentCoverage`/`figureFailures`/`missingValues`, per-kind handling (intelligence is question-free) |
| `premium-pdf/components.js` | `QuestionCard` prepare/draw split, figure stacks + option board, insight/response measurement, part labels, header/footer de-duplication, `SubjectBand` lookahead, `marksLabel`, `responseLabel`, `measureQuestionCard`, heading `keepWithNext` |
| `premium-pdf/full-analysis.js` | full-width single-column tables, cover secondary signals, duplicate benchmark chart removed, question sections wired to the measured band |
| `premium-pdf/intelligence.js` | full-width stacked tables, no coordinates/legends, section headers recomposed |
| `premium-pdf/layout.js` | colophon anchored to page foot, section-break policy documented |
| `premium-pdf/theme.js` | type scale raised, `tableLabel`, palette unchanged |
| `premium-pdf/index.js` | awaits `loadQuestionMedia`, returns `mediaDiagnostics` |
| `premium-pdf/browser-assets.js` | exposes `imageLoader` for the browser asset layer |
| `frontend/src/pages/student/exam-analysis-pdf.js` | dev-time figure coverage log + media diagnostics warning |
| `frontend/src/intelligence/engine/exam-attempt-intelligence.js` | carries `imageUrl` / `stemImageUrls` / `stemImageUrl` / `explanationImages` into the analysis snapshot |
| `backend/app/services/spa_exams.py` | review rows expose `imageUrl`, `stemImageUrls`, `stemImageUrl` (additive, no API contract change) |
| `frontend/package.json` | `pdf:refinement`, `pdf:verify-refinement` |
| `frontend/tests/pages/premium-pdf-pagination.test.js` | page-count/content floors re-based on the single-column layout |

No legacy PDF generator was restored, no second PDF engine was introduced, no TypeScript, no Vite alias change,
no backend API redesign.

---

## 11. Tests and build results

| Check | Command | Result |
|---|---|---|
| PDF/generation test files | `npx vitest run tests/pages` (premium-pdf, premium-pdf-pagination, exam-analysis-pdf, legacy-pdf-removal) | **27/27 pass** |
| Full frontend suite | `npx vitest run` | **440 passed, 26 failed, 466 total** — byte-for-byte the base-commit outcome measured in a `git worktree` at `3d24287` (26 failed / 440 passed). The pre-existing failures are dashboard KPIs, syllabus filter, sidebar state, Student 360 SSR, cascading filters and phase-F adapters; every PDF test file is green. |
| Production build | `npm run build` | **pass**, built in 19.27 s |
| Refinement generation | `npm run pdf:refinement` | **pass** (≈41 s), 11 PDFs, `Error:` none |
| PDF verification | `npm run pdf:verify-refinement` | **PASSED** — 11 PDFs, 322 pages, 215 figures, NEET 180/196 |
| Legacy harness (regression) | `npm run pdf:generate` | **pass**, 12 PDFs; the only flags are 9 intentional malformed-TeX fixtures in `full-large-revision-3-subjects` (unbalanced `\frac{1}{2` → literals kept, no crash) |
| Backend exam/spa tests | `/tmp/venv/bin/python -m pytest test` | 39 failed / 189 passed / 1 skipped — **identical to the base commit run** (same 39 names). They are cross-test isolation artifacts of this sandbox (each fails-in-suite but passes alone, e.g. `test_demo_allowed_until_exam_completed`), not caused by the additive review-row keys. |
| Backend targeted | `pytest test/test_exam_analysis_*.py test/test_spa_question_cleanup.py` | all pass individually |

Layout-audit invariants on the canonical exports and the figure/NEET QA payloads:
`textTextOverlaps 0`, `textBarOverlaps 0`, `siblingComponentOverlaps 0`, `componentBoundaryViolations 0`,
`footerCollisions 0`, `orphanHeadings 0`, `overflowingComponents 0`, `flags 0`.

---

## 12. Six-export verification (Role × Report)

| Export | Pages | Questions | Figures | Layout | Identity |
|---|---|---|---|---|---|
| `exports/student-full-analysis.pdf` | 19 | 14/14 | 13 | clean | Aarav Sharma · Roll 21CS114 |
| `exports/student-report.pdf` | 5 | — (question-free by design) | 13 resolved | clean | Aarav Sharma · Roll 21CS114 |
| `exports/faculty-full-analysis.pdf` | 19 | 14/14 | 13 | clean | Faculty reader |
| `exports/faculty-report.pdf` | 5 | — | 13 | clean | Faculty reader |
| `exports/admin-full-analysis.pdf` | 19 | 14/14 | 13 | clean | Admin reader |
| `exports/admin-report.pdf` | 5 | — | 13 | clean | Admin reader |

All six: A4, header/footer on every page, no internal values, no image/text overlaps, no side-by-side tables,
`missingValues: []`. Role changes only the identity line and the reader's scope — the design system, section order
and figure behaviour are shared, and the two report types keep distinct purposes: the **Full Exam Analysis** carries
the question-by-question body; the **Exam Intelligence Report** is a 5-section aggregate with no question cards.

---

## 13. 180-question NEET validation

`deliverables/refinement/qa/neet-180-full-analysis.pdf` — synthetic 180-question NEET payload
(Physics 45 / Chemistry 45 / Botany 45 / Zoology 45) with figures injected every 4th question.

| Metric | Value |
|---|---|
| Pages | **196** |
| Questions rendered | **180 / 180** (`contentCoverage` confirms none unrendered) |
| Figure references | 143 |
| Figures embedded | 138 |
| Figures failed | 5 — deliberately `qa-figures/does-not-exist.png` (Q029, Q061, Q093, Q125, Q157) → placeholder + diagnostic, report continued |
| Layout audit | overlaps 0, boundary violations 0, footer collisions 0, overflowing components 0, orphan headings 0 |
| Subject separation | 4 subject bands, each with its first question; continuation headings on every split card |
| Size | 17.8 MB |

The same payload is what the old layout could not survive: it is the proof that "keep question blocks together +
graceful splits + content-driven pages" still holds at 180 questions with figures.

---

## 14. Before / after previews

Before = base commit `3d24287` PDFs; after = current exports. All images at 96 dpi.

| Page | Before | After |
|---|---|---|
| Cover | `deliverables/refinement/previews/before/before-full-p01.png` | `deliverables/refinement/previews/pages/canonical-full-analysis-p01.png` |
| Question page (dense KPI grid, duplicate titles, no figure) | `.../before-full-p08.png` | `.../pages/canonical-full-analysis-p08.png` |
| Figure question (statement + option figures) | *(no figure could render)* | `.../pages/figure-exam-full-p17.png`, `figure-exam-full-p18.png` |
| Intelligence, chapter mastery (was 2-up) | `.../before-intelligence-p02.png` | `.../pages/canonical-intelligence-p02.png` |
| NEET 180 (stress) | — | `.../previews/figure-exam-full-contact-sheet.png`, `neet-180-full-contact-sheet.png` |

What the before/after pair shows concretely:

* **Cover** — `FAR / ATS-JEE-2026-07 · Source fingerprint 91357BA6 · 2026-11-02T09:00:00.000Z` under the brief and
  `FAR / ATS-JEE-2026-07` in the footer are gone; the KPI strip no longer repeats the score/response split.
* **Question page** — six-up KPI grid, status chip, `Q14 · Q14 · Incorrect`, and a `SOLUTION / EXPLANATION` +
  `EXPLANATION` double heading collapse into `QUESTION 14` + one metadata line + `EXPLANATION`; evidence, response,
  insight and explanation read top-to-bottom.
* **Figure question** — the same payload that produced text-only questions now prints the statement plate, the
  four lettered option figures beside their own letters, and the explanation figures inside the shaded panel.
* **Intelligence** — chapter mastery and topic accuracy are single full-width tables with repeated headers instead
  of two half-width columns.

(Every page of every export is rendered to `deliverables/refinement/previews/pages/`; contact sheets per PDF sit in
`deliverables/refinement/previews/*-contact-sheet.png`.)

---

## 15. Remaining limitations

1. **Canonical demo payload is thin.** `backend/app/data/spa/student-portal.json → examAnalysis.questionReview`
   contains only `q/subject/topic/type/status/marks/time`. The canonical PDF therefore prints the honest
   *"Question statement and options were not published for this attempt."* and `Not published` for the response —
   a data gap, not a renderer gap. Real exam data (`deliverables/pagination-fix/fixtures/`, figure fixture) renders
   in full. Filling the demo payload is a backend/seed task, not a PDF one.
2. **One orphan heading in the 196-page NEET PDF** (`05 QUESTION INTELLIGENCE`, page 7): the first card of that
   section is taller than the remaining page even after the heading reserve, and PDFKit cannot move already-drawn
   content. All other reports (canonical full/intelligence, six exports, figure QA) have zero orphan headings.
3. **Page-bottom whitespace of up to ~300 pt** can appear where a whole question card or figure plate cannot be
   split (by design: a question block is never cut for cosmetics).
4. **Malformed TeX is not repaired.** Unbalanced sources such as `\frac{1}{2` fall back to their literal text with a
   flag; the report still renders. 9 such flags exist in the intentional edge-case fixture only.
5. **SVG/GIF/BMP/TIFF conversion is exercised through the converter contract but not by a shipped fixture** — QA
   assets cover PNG, data-URL PNG, WebP and AVIF. The Node converter path for SVG requires `cairosvg` in the
   generation environment.
6. **Image deduplication is per question.** The same crop referenced by a stem and an option of one question is drawn
   once for its proper field; cross-question reuse is intentionally not merged (each question is a self-contained
   block).
7. **`scripts/verify_report_pdfs.py` still describes the pre-refinement deck** (it asserts `FAR /` prefixes and the
   source register). It is used only by the legacy `pdf:verify` script and its report text is now stale; the
   authoritative verifier for this work is `scripts/verify_refinement_pdfs.py`.

---

### Reproduce

```bash
cd frontend
npm run pdf:refinement          # regenerate 11 PDFs + generation-results.json + layout-audit.json
npm run pdf:verify-refinement   # independent verification + previews -> deliverables/refinement/verification.json
npm run pdf:generate            # legacy 12-PDF regression deck (deliverables/)
npx vitest run tests/pages      # PDF test files
npm run build
```
