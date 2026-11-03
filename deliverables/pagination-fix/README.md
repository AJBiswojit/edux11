# Premium PDF pagination fix — verification evidence

This directory accompanies `deliverables/PREMIUM_PDF_PAGINATION_FIX_REPORT.md`.
All fixtures and generated PDFs here are **synthetic / local integration
evidence**, not production data. The original failing production examination
payload is unavailable in this checkout.

## Source changes

- `frontend/src/pages/student/premium-pdf/pagination.js` — new content-driven
  pagination helpers.
- `frontend/src/pages/student/premium-pdf/components.js` — chunkable specs,
  flow/table/card pagination, `MeasuredTable` repeated-header fixes.
- `frontend/src/pages/student/premium-pdf/layout.js` — reserves 18 pt for a
  continuation label while keeping the 708 pt printable-area guard.
- `frontend/src/pages/student/premium-pdf/full-analysis.js` and
  `intelligence.js` — shared specs, continuation section titles, measured
  cover-coordinate height.
- `frontend/tests/pages/premium-pdf-pagination.test.js` — 8 regression tests.

## Reproduce

From the repository root:

```bash
cd frontend
npm ci
npx vitest run tests/pages/premium-pdf-pagination.test.js
npm run build
cd ..
node deliverables/pagination-fix/scripts/make-fixtures.mjs
node deliverables/pagination-fix/scripts/render.mjs \
  --payload deliverables/pagination-fix/fixtures/failing-jee-phase2.json \
  --kind intelligence \
  --out /tmp/failing-intelligence.pdf \
  --json /tmp/failing-intelligence.json
```

`PAGINATION_BASELINE=/tmp/pagination-baseline/src/pages/student/premium-pdf`
makes `render.mjs` load the original HEAD-derived Premium modules; that
temporary baseline also needs a `node_modules` symlink to `frontend/node_modules`.
`PAGINATION_STRICT=1` makes a render error exit nonzero.

Regenerate the compact result summary with:

```bash
python3 deliverables/pagination-fix/scripts/summarize-results.py
```

## Local PDF and browser validation

```bash
/tmp/pagination-venv/bin/python deliverables/pagination-fix/scripts/validate_pdfs.py
/tmp/pagination-venv/bin/python deliverables/pagination-fix/scripts/validate_browser_pdfs.py
```

The browser run requires the documented local dev accounts, a seeded
`/tmp/edux-live.db`, FastAPI on `:8000`, and Vite on `:5173`:

```bash
cd backend
DATABASE_URL=sqlite:////tmp/edux-live.db python -m scripts.create_dev_accounts
PYTHONPATH=$PWD DATABASE_URL=sqlite:////tmp/edux-live.db \
  python ../deliverables/pagination-fix/scripts/seed-live-data.py
DATABASE_URL=sqlite:////tmp/edux-live.db QUEUE_ENABLED=false \
  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
cd ../frontend
VITE_API_BASE_URL=/v1 npm run dev -- --host 0.0.0.0
cd ..
EDUX_STUDENT_PASSWORD=... EDUX_FACULTY_PASSWORD=... EDUX_ADMIN_PASSWORD=... \
  node deliverables/pagination-fix/scripts/verify-pagination-browser.mjs
```

The seed script and browser verifier use local dev-account passwords supplied
via environment variables; no credentials are stored in this repository.
`deliverables/forensic-audit/live/live-data.json` records only the local
paper/attempt IDs used by the verifier.

## Committed evidence

- `calibration.json`, `fixture-config.json`, `generation-results.json`,
  `generation-results.txt`, `pdf-validation-summary.json`, `pdf-validation.txt`.
- `before/failing-intelligence.json` — the pre-fix 1844.95 pt failure record.
- `scripts/` — fixture generation, baseline/fixed rendering, PDF validation,
  compact summarisation, local live-data seeding, and browser verification.
- `fixtures/` — synthetic payloads.
- `previews/representative-pages-contact-sheet.png`.
- `browser-verification/` — compact browser results, freshness, network data,
  PDF validation summary, first/last-page contact sheets, and text logs.
- `*-suite.txt`, `build.txt` — test/build transcripts.

Generated PDFs, individual page PNGs, downloaded browser PDFs, and full
per-render layout-audit JSONs are ignored; they are local artifacts.
