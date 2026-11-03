# Implementation verification evidence

This directory accompanies `deliverables/PREMIUM_PDF_CONSOLIDATION_IMPLEMENTATION_REPORT.md`.

## Committed with the PR

- `verify-implementation.mjs` — real-backend / real-auth / real-Chromium six-combination success run.
- `verify-implementation-fault.mjs` — controlled runtime font-fetch failure for all six combinations.

Both browser scripts read `EDUX_STUDENT_PASSWORD`, `EDUX_FACULTY_PASSWORD`, and `EDUX_ADMIN_PASSWORD` from the environment (with optional `EDUX_*_EMAIL` overrides). No credentials are stored in the repository.
- `validate_pdfs.py` — PDF syntax, parsing, identity, content, pagination, font/logo and overlap checks.
- `legacy-audit.txt` — repository-wide legacy-removal and fallback/flag audit.
- `baseline-full-suite.txt`, `final-full-suite.txt` — proof that the 26 full-suite failures pre-exist at HEAD.
- `implementation-runtime-results.json`, `fault-injection-results.json`, `freshness.json`, `browser-network.json`, `pdf-validation.json` — compact machine-readable results.
- `pdf-previews/first-pages-contact-sheet.png`, `pdf-previews/last-pages-contact-sheet.png` — visual evidence for all six PDFs.

## Local-only workspace evidence (intentionally not committed)

The six downloaded PDFs under `downloads/`, the 14 per-page PNG previews, `browser-network.log`, console logs, `targeted-tests.log`, `final-build.log`, and other `*.log` files remain untracked. They are generated artifacts or match the repository's `*.log` ignore rule. The earlier `deliverables/forensic-audit/` investigation evidence — especially `original/exam-analysis-pdf.js` — is also deliberately excluded so no legacy writer is reintroduced into the repository.
