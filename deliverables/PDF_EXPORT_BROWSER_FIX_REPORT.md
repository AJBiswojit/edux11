# Browser PDF export fix — verification report

## Exact root cause

Both buttons failed for the same reason. In a real browser, Vite resolves
`pdfkit@0.20.2` to `js/pdfkit.browser.mjs`. Unlike the Node entry point
(`js/pdfkit.node.mjs`), that browser build does **not** install lazy standard
font loaders. It exports `registerStdFonts()` and expects the caller to supply
the Base 14 font metrics.

`new PDFDocument(...)` immediately calls `initFonts()` → `font('Helvetica')` →
`getStandardFont('Helvetica')`. Because no standard font had been registered,
the constructor threw before any PDF bytes, Blob or download link existed:

```text
Error: Standard font "Helvetica" is not registered. Call registerStdFonts() before using it.
    at getStandardFont (pdfkit.browser.mjs)
    at PDFFontFactory.open (pdfkit.browser.mjs)
    at PDFDocument.font (pdfkit.browser.mjs)
    at PDFDocument.initFonts (pdfkit.browser.mjs)
    at new PDFDocument (pdfkit.browser.mjs)
    at renderPremiumPdf (premium-pdf/renderer.js)
    at createPremiumPdf (premium-pdf/index.js)
    at exportAnalysisPDF / exportFullAnalysisPDF (exam-analysis-pdf.js)
```

The Node generator and Vitest/jsdom runs used the Node build, which registers
its standard fonts automatically. That is why the generator worked while the
browser failed. The browser reproduction showed all seven logo/font requests
returning HTTP 200, successful dynamic imports, a correctly shaped
`analysis_from_attempt` response and no Blob/anchor/download events before the
exception. The page's previous `.catch(() => toast.error(...))` swallowed the
stack, leaving only the friendly error toast.

## Fix

- Added `frontend/src/pages/student/premium-pdf/pdfkit-standard-fonts.js`.
  It imports the 14 official PDFKit standard-font metric modules and calls the
  browser build's `registerStdFonts(...)` once, before document construction.
  Node builds are left untouched because they do not export this function.
- `renderer.js` now awaits `ensurePdfKitStandardFonts()` before constructing
  `PDFDocument`, so the default Helvetica lookup succeeds in both dev and
  production bundles.
- `ExamAnalysis.jsx` now logs the actual exception and stack with the
  `[EduX PDF Export] …` prefix in development while retaining the friendly
  toast.
- `exam-analysis-pdf.js` now logs `[EduX PDF Export] … blob created and
  download initiated` in development after `new Blob(...)` and
  `triggerDownload(...)`. The success toast still follows the resolved export
  promise; it cannot appear before Blob creation and download initiation.
- Added a focused Vitest regression suite and an independent browser-download
  verifier. No PDF library, font, math, report-content or API contract was
  replaced or removed.

## Console verification

Headless Chromium was driven through the real `/student/exam-analysis`
workflow: select exam → select subject → Generate analysis → click Report /
Full Analysis. The intercepted API response was produced by the actual backend
`analysis_from_attempt()` builder from a real exam-agent NEET attempt.

Before the fix:

- Both buttons produced the exact `Standard font "Helvetica" is not registered`
  exception and stack above.
- All seven asset fetches returned 200; the backend payload and dynamic imports
  were not the cause.
- No PDF Blob, anchor click or downloaded file was produced.

After the fix:

- Development browser console showed:
  `[EduX PDF Export] Report blob created and download initiated` and
  `[EduX PDF Export] Full Analysis blob created and download initiated`.
- Instrumented event order for Report: `blob-created` → `download-initiated`
  → `blob-revoked` → `Report downloaded` toast. Full Analysis followed the same
  order with `Full analysis downloaded`.
- Forced asset failure in development still showed the friendly `PDF failed`
  toast and logged both `[EduX PDF Export] Report failed` and
  `[EduX PDF Export] Report stack` with the real `TypeError` and stack.
- Successful runs had zero caught export errors, zero page errors and zero
  failed logo/font responses. The only network failure in the sandbox was an
  unrelated Google Fonts stylesheet request from the app shell.

## Download verification

All files below were downloaded by clicking the browser buttons and then
opened independently with PyMuPDF and pypdf. Every page was rendered; PDF
header/EOF/trailer, page size, embedded Inter/Manrope/STIX fonts, logo image
on every page, report title, selected subject and expected section text were
checked. Results are stored in `deliverables/browser-export-verification.json`.

| Case | Pages | Bytes | Embedded font families | Logo pages | Rendered pages | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| All Subjects / Report | 4 | 385,041 | 4 | 4/4 | 4/4 | Pass |
| All Subjects / Full Analysis | 20 | 1,570,631 | 5 | 20/20 | 20/20 | Pass |
| Physics / Report | 4 | 380,949 | 4 | 4/4 | 4/4 | Pass |
| Physics / Full Analysis | 14 | 1,129,783 | 5 | 14/14 | 14/14 | Pass |
| QA edge cases / Report | 4 | 388,556 | 4 | 4/4 | 4/4 | Pass |
| QA edge cases / Full Analysis | 40 | 3,549,182 | 5 | 40/40 | 40/40 | Pass |

`all_checks_passed: true` for all six browser downloads. Repeated Report and
Full Analysis clicks also produced fresh PDF Blobs, anchor clicks, download
files and success paths with no caught errors. The QA payload deliberately
included 32 question rows, long mathematical derivations, malformed TeX, long
labels and missing optional values; malformed expressions were flagged in the
browser console and left verbatim for verification.

Original downloaded filenames followed the existing API contract, e.g.
`MediXO_EduX_NEET_UG_Full_Mock_01_Exam_Intelligence_Report.pdf` and
`MediXO_EduX_NEET_UG_Full_Mock_01_Full_Exam_Analysis_Report.pdf`.

## Build and tests

- `npm run build` with `VITE_API_BASE_URL=/v1`: passed; only the pre-existing
  large-chunk warning remains.
- Targeted PDF suites: 24/24 passed, including the new browser PDFKit font
  regression suite.
- `npm run pdf:generate`: canonical 16-page full and 4-page intelligence
  reports plus all six QA fixtures generated with `layout: true`.
- `npm run pdf:verify`: `all_checks_passed: true`, 26/26 checks, 100 pages
  rendered.
- Full Vitest suite: 419 passed / 26 failed. The 26 failures are pre-existing
  failures in unrelated dashboard, navigation, filter, paper-generator,
  student-360 and adapter modules; no PDF suite failed.

## Files changed

- `frontend/src/pages/student/premium-pdf/pdfkit-standard-fonts.js` — new
  browser Base 14 font registration.
- `frontend/src/pages/student/premium-pdf/renderer.js` — call registration
  before `new PDFDocument`.
- `frontend/src/pages/student/exam-analysis-pdf.js` — development success
  diagnostics after Blob/download initiation.
- `frontend/src/pages/student/ExamAnalysis.jsx` — development error/stack
  logging while preserving friendly toasts.
- `frontend/tests/pages/premium-pdf-browser-fonts.test.js` — new regression
  tests for browser and Node PDFKit module shapes.
- `scripts/verify_browser_pdf_exports.py` — independent browser-download PDF
  integrity verifier.
- `deliverables/browser-export/` — six downloaded PDFs verified above.
- `deliverables/browser-export-verification.json` — machine-readable checks.
- `deliverables/PDF_EXPORT_BROWSER_FIX_REPORT.md` — this report.

## Remaining issues

- The full Vitest suite still has 26 unrelated, pre-existing failures; they
  are outside the PDF export path.
- The production build still emits a large-chunk warning from the existing
  bundle configuration.
- The app shell requests a Google Fonts stylesheet that cannot be reached in
  this restricted sandbox; it is unrelated to PDF generation and does not
  affect the embedded report fonts.
- Browser verification used a headless Chromium binary installed only in the
  sandbox and an intercepted payload produced by the real backend builder. It
  did not require or alter a live production database.
