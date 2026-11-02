# Premium PDF verification results

The two content-reference PDFs named in the brief were not present in the workspace; these deliverables preserve the canonical in-app analysis payload that feeds the same export workflow.

- Source payload: `backend/app/data/spa/student-portal.json :: examAnalysis`
- Unique source values checked: **247**
- Full Exam Analysis Report: **14 pages**
- Exam Intelligence Report: **2 pages**
- Embedded fonts: CZZZZZ+Inter-Regular, DZZZZZ+Manrope-ExtraLight, EZZZZZ+Inter-Regular, FZZZZZ+Inter-Regular, GZZZZZ+STIXTwoMath-Regular
- Minimum rendered font size: full 6.4 pt, intelligence 6.4 pt
- Overall result: **PASS**

## Checks

| Check | Result |
| --- | --- |
| full report page count at least 9 | PASS |
| intelligence report exactly 2 pages | PASS |
| a4 portrait all pages | PASS |
| embedded fonts | PASS |
| logo on every page | PASS |
| header footer consistent | PASS |
| report identification consistent | PASS |
| page numbering consistent | PASS |
| page totals consistent | PASS |
| no blank pages | PASS |
| no out of bounds text | PASS |
| print readable minimum font | PASS |
| canonical source values preserved | PASS |
| all question ids preserved | PASS |
| all full analysis sections present | PASS |
| all intelligence sections present | PASS |
| charts and vector math rendered | PASS |
| no raw tex in student facing pdf | PASS |
| malformed expression flagged in qa | PASS |
| qa multiple question pages | PASS |

## Data preservation

- Missing source values in the full PDF: **0**
- Missing source values reported by the generator: **0**
- Missing question identifiers: **0**
- All 14 supplied question-review identifiers were located in the PDF text.

## Visual QA

Representative-page previews and the contact sheet were written to `deliverables/previews/`.
Table alignment, mathematical baselines, whitespace balance and absence of overlap were reviewed on those renders;
text-span bounds and minimum type size are machine-checked above.
