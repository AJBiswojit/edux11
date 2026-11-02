# Premium PDF V2 verification results

The two named content-reference PDFs were not present in the workspace. These V2 deliverables preserve the canonical in-app analysis payload that feeds the same export workflow; no examination values were invented.

- Source payload: `backend/app/data/spa/student-portal.json :: examAnalysis`
- Unique canonical source values checked: **247**
- Full Exam Analysis Report: **16 pages**
- Exam Intelligence Report: **4 pages**
- Minimum rendered font size: full 7.5 pt, intelligence 7.8 pt
- Overall result: **PASS**

## Checks

| Check | Result |
| --- | --- |
| canonical full report generated | PASS |
| canonical intelligence 3 to 4 pages | PASS |
| distinct report visual identities | PASS |
| a4 portrait all pages | PASS |
| embedded inter manrope stix math | PASS |
| official logo on every page | PASS |
| header footer report id consistent | PASS |
| page numbers and totals consistent | PASS |
| no blank pages | PASS |
| no unintended manifest collisions | PASS |
| zero rendered text overlaps | PASS |
| no footer collisions or clipping | PASS |
| no out of bounds text | PASS |
| print readable minimum font | PASS |
| balanced page composition | PASS |
| canonical source values preserved | PASS |
| all question ids preserved | PASS |
| all full sections present | PASS |
| all intelligence sections present | PASS |
| no raw tex in student facing pdfs | PASS |
| malformed math flagged in qa | PASS |
| qa scenarios have different page counts | PASS |
| qa covers 2 and 3 subjects | PASS |
| qa covers 30 plus question rows | PASS |
| qa covers large revision lists | PASS |
| every page rendered for visual review | PASS |

## Geometric validation

- The renderer emits a component manifest declaring required width, required height, actual rendered height, top/bottom spacing and split policy.
- Sibling-component, text/text, text/math, text/chart-bar, footer, clipping and component-overflow intersections were independently recomputed from that manifest.
- Actual PDF line bounding boxes were compared against each other, chart bars, the footer region and page bounds.
- Zero unintended intersections: **YES**

## Data preservation

- Missing source values in the Full Analysis Report: **0**
- Missing question identifiers: **0**
- All 14 supplied question-review identifiers were located in the PDF text.

## Visual QA

- Every page was rendered to `deliverables/previews/v2/pages`.
- Contact sheets and the two-cover overview are indexed in `deliverables/previews/v2/REVIEW_INDEX.md`.
- Covers, charts, long tables, mathematical explanations, repeated table headers, final source register and footer alignment were reviewed on those renders.
