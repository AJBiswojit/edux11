# PHASE A — FRONTEND DOCUMENTATION REPORT

**Project:** MediXO EduX (`medixo-edux-platform` v1.0.0)
**Phase:** A — Frontend Architecture & UI/API Traceability
**Nature:** Documentation-only phase. No application code was modified, no backend code created, no database designed.
**Date:** 2026-08-23 · **Branch:** `arena/01a02f03-edux`

---

## Documents Created

All in `docs/backend-integration/` (the only location created/modified in this phase):

1. **`00-BACKEND-INTEGRATION-MASTER.md`** — project overview, current architecture, future direction, 22-domain map, data flows, critical canonical contracts, University/JEE/NEET domain isolation, current persistence, 10 backend integration principles, documentation map.
2. **`01-FRONTEND-ARCHITECTURE.md`** — repository structure, 6 architectural layers + allowed dependencies, dependency direction & prohibited dependencies, 10 major modules, intelligence architecture (canonical/adapters/derived/presentation classification), state management, routing architecture, error handling, data ownership, backend replacement boundary.
3. **`03-ROUTES-AND-UI-MODULES.md`** — full route inventory by portal, complete UI→Service→API matrix (all 145 endpoints), student/faculty/admin/parent route detail, all 12 legacy redirects, deep-link query-parameter catalogue, 4 critical user journeys mapped UI→service→API→data, CRITICAL/IMPORTANT/STANDARD/LEGACY classification, discrepancies list, Appendix A endpoint list.
4. **`PHASE-A-FRONTEND-DOCUMENTATION-REPORT.md`** — this report.

## Repository Sources Inspected

- Router & guards: `src/routes/index.jsx`, `src/routes/ProtectedRoute.jsx`
- Config: `src/config/index.js` (APP_CONFIG, FEATURE_FLAGS, NAV_GROUPS, ROLES)
- API layer: `src/api/client.js`, `src/api/axios.js`, `src/api/index.js`, `src/api/core/router.js`, `src/api/core/exam-attempts-store.js`, all 23 domain route modules (`src/api/{auth,platform,student,exam,faculty,admin,parent,interventions,ai}/`)
- Services: all 11 modules in `src/services/`
- Intelligence: `src/intelligence/index.js`, `master-profile.js`, `engine/*` (incl. `exam-agent.js` canonical contract, `exam-attempt-intelligence.js` adapter), `faculty/**` (incl. `intervention-lifecycle.js`, `similar-issues.js`, `student-360.js`, students-directory), `admin/**`
- Datasets: all 19 files in `src/datasets/**` + intelligence dataset folders
- Pages: all 108 page files across `src/pages/**`; key components (`exam-workspace/exam-agent/*`, `students-workspace/*`, `assessment-workspace/*`, `question-studio/*`, `shared/*`, `layout/*`)
- Contexts/hooks/utils: `auth-context.jsx`, `theme-context.jsx`, `src/hooks/*`, `src/utils/student-360-url.js`
- Entry: `src/main.jsx`, `src/App.jsx`, `vite.config.js`, `package.json`
- Tests: `tests/setup/api.js`, `tests/fixtures/*`, all 7 test suites
- Narrative docs (context only, code wins on conflict): `README.md`, `CHANGE-LOG.md`, `PHASE-2…8` reports, `PHASE-0-ARCHITECTURE-AUDIT.md`, `AUDIT-REPORT.md`

## Route Count

**123 `<Route>` registrations** in `src/routes/index.jsx`:
113 leaf path routes (incl. 12 legacy redirects, `/403`, `*`) + 4 portal wrappers + 4 index routes + 2 pathless layout routes.
By portal: Landing 11 · Auth 8 · **Student 25** (index + 24) · **Faculty 25** (index + 24, incl. 6 redirects) · **Admin 32** (index + 31, incl. 6 redirects) · **Parent 14** (index + 13, feature-gated/disabled) · Shared 2.
Parent portal is disabled (`FEATURE_FLAGS.parentPortal === false`).

## API Count

**145 endpoints** registered in the prototype adapter (`defineRoute`): **105 GET · 34 POST · 4 PATCH · 2 DELETE**, grouped: auth 8 · platform 7 · student 16 (+/intelligence/ 4) · exam-agent 4 · faculty 49 (workspace 13, intelligence 1, reports 3, papers 7, pyq 4, students 4, question-studio 12, ai-studio 1) · interventions 18 (14 faculty + 4 student) · admin 23 (22 + summary) · parent 17 · ai 8.
Also noted: `POST /auth/refresh` is expected by the axios layer for a real backend but is **not** registered in the adapter; **no `/auth/login` endpoint exists** (login is client-side prototype).

## Service Count

**11 service modules** (`src/services/`): `index.js`, `auth.js`, `extra.js`, `intelligence.js`, `faculty-intelligence.js`, `admin-intelligence.js`, `faculty-students.js`, `faculty-interventions.js`, `exam-agent.js`, `question-studio.js`, `query.js` (shared helper). **~140 exported `use*` hooks** across them; 136 unique hooks verified referenced-and-existing in doc 03.

## Intelligence Modules

- **Student Intelligence Foundation** (`src/intelligence/`): 10 engine files (scores, derive, dna, exams, readiness, university, competitive, progress-report, **exam-agent** — canonical ExamAttempt contract, **exam-attempt-intelligence** — adapter), 11 dataset files, master profile.
- **Faculty Academic Intelligence Foundation** (`src/intelligence/faculty/`): 21 engine files (incl. **similar-issues**, **intervention-lifecycle**, **student-360**, students-directory, question-studio, assessment/analytics/reports/ai-studio…), 11 dataset files (incl. students directory 7 batches/126 students, competitive questions, studio pools), master profile.
- **Admin (Institution) Intelligence Foundation** (`src/intelligence/admin/`): 5 engine files + `ai/` response engine (3 files), 5 dataset files, master profile.
- Classification (canonical / adapters / derived / presentation-only) documented in `01-FRONTEND-ARCHITECTURE.md` §5. All intelligence is deterministic and honestly labelled "(prototype)" — no trained models, no external AI services.

## Persistence Mechanisms

- **localStorage (10 keys):** `EduX_access_token`, `EduX_refresh_token`, `EduX_user`, `EduX_theme`, `EduX_reduced_motion`, `EduX_student_exam_attempts`, `EduX_faculty_interventions`, `EduX_intervention_practice_attempts`, `EduX_intervention_retests`, `EduX_faculty_paper_shares`, `EduX_registered_students` (11 including registry).
- **In-memory adapter state:** generated/duplicated/regenerated/archived papers, faculty reports CRUD, question-studio sessions/questions, memoized faculty/admin snapshots, fingerprint cache.
- **Deterministic datasets:** 19 files in `src/datasets/**` + intelligence dataset modules — immutable reference/demo data.
- **Client cache:** TanStack Query (staleTime 60 s).

## Critical Contracts Identified

User · Student · Faculty · Batch · Course · Subject · Chapter · Topic · Question · PYQ · Question Paper · Exam · **ExamAttempt** (canonical) · **QuestionAttempt** · Academic DNA · Similar Issue · Intervention · Practice Attempt · Re-test · Effectiveness · Paper Share — each mapped to its defining module in `00-BACKEND-INTEGRATION-MASTER.md` §6 (no database schemas designed).

## Critical User Journeys

1. **Student Exam Journey:** Login → Exam Agent → canonical ExamAttempt (`POST /student/exam-agent/attempts`) → Exam Analysis → Academic DNA.
2. **Faculty Intelligence Journey:** Faculty → My Students → Student 360 → Evidence → Similar Issues → Intervention.
3. **Intervention Journey:** Issue → Evidence (preflight) → Intervention (lifecycle) → Practice → Re-test → Exam Attempt → Effectiveness.
4. **Assessment Journey:** Question Intelligence → PYQ → Generator → Paper Library → Share.
Each mapped UI → service → API → data in `03-ROUTES-AND-UI-MODULES.md` §9.

## Domain Isolation Rules

- University: `domain=university`, `examMode='University'`, `examFamily=null`.
- JEE: `domain=competitive`, `examMode='Competitive'`, `examFamily='JEE'`.
- NEET: `domain=competitive`, `examMode='Competitive'`, `examFamily='NEET'`.
- **JEE Physics MUST NOT merge with NEET Physics** (grouping key domain→family→subject→chapter; no cross-domain mixing). Enforced in `classifyAttemptContext` (`src/intelligence/engine/exam-agent.js`), the similar-issues partitioning, Student 360 subject intelligence, and the university/competitive engines. Explicit attempt metadata is authoritative; demo attempts (`mode:'demo'`) excluded by default; `mock:true` seeds labelled "Sample"; a student with both university + competitive contexts is valid.

## Backend Replacement Boundary

CURRENT: `Service hook → request() → prototype adapter → datasets + localStorage + engines`.
FUTURE: `Service hook → request() (unchanged, VITE_USE_MOCK=false) → HTTP/axios → Python backend → database + AI services (NOT CURRENTLY DEFINED)`.
The UI and services stay; the adapter + localStorage stores are the migration surface. Backend must serve the 145 documented endpoint contracts with `Authorization: Bearer` + `POST /auth/refresh`.

## Undocumented / Undefined Areas (explicitly marked)

- No `POST /auth/login` / logout / session endpoints (login is client-side prototype) — real auth **NOT CURRENTLY DEFINED**.
- `POST /auth/refresh` expected by axios interceptor but not implemented anywhere.
- Database engine/schema/ORM — **NOT CURRENTLY DEFINED**.
- Backend AI/intelligence service placement — **NOT CURRENTLY DEFINED**.
- API-level 400/401/403/409 error contract — **NOT CURRENTLY DEFINED** (only route-level 403 + adapter 404 + axios 401-refresh exist).
- Notification subsystem (no dedicated domain/API beyond dataset feeds + parent endpoint).
- Referenced-but-absent doc: `docs/PHASE_0_FACULTY_EXAM_INTEGRATION_AUDIT.md` (cited in engine comments; not in repo).

**Documented discrepancies (current code wins):**
1. `/parent/notifications`: page + endpoint + nav entry exist, but **no route registration** (falls through to NotFound).
2. `pages/faculty/AIQuestionStudio.jsx` is fully wired but has **no dedicated route** (lives inside the Assessment Intelligence workspace).
3. Faculty Support page consumes the **student** support endpoints (`/student/support`).
4. `pages/auth/ProfileSetup.jsx` exists and is routed but its service hooks were retired (Phase 3) — placeholder flow.

## Validation (read-only)

- Route inventory cross-checked against `src/routes/index.jsx` — all documented routes exist; 12 redirects verified.
- All 108 documented page components exist under `src/pages/**`.
- 136 referenced service hooks verified present in `src/services/**` (4 naming corrections applied after check).
- Endpoint audit: **145 documented endpoints ↔ 145 registered endpoints — zero fabricated, zero omitted** (script-checked with structural param normalization).
- No intelligence capability documented beyond what exists in `src/intelligence/**` (all cited functions verified exported).

## Test Result

`npm test` (Vitest): **PASS — 7 test files, 153 tests passed, 0 failed** (includes Student 360 domain isolation, consolidation, evidence-action, routes, UI render, phase-6 multi-student outcomes, service surface).

## Build Result

`npm run build` (Vite): **PASS** — built successfully (pre-existing chunk-size warning >1200 kB on the main chunk; unrelated to documentation).

## Recommended Phase B

`02-API-CONTRACT.md` — formalize the 145 endpoint contracts (request/response shapes extracted from the current handlers/datasets, status-code semantics, error envelope, pagination/filter conventions like `includeDemo`/`includeSeeds`/`scope`, and the auth endpoints gap: login/logout/refresh). This directly precedes `04-DATA-MODELS.md` and `05-EXAM-ATTEMPT-CONTRACT.md`, all still documentation-only.

**Phase A stops here** — no API contract generation, OpenAPI generation, database modeling, authentication design, or Python implementation was performed.
