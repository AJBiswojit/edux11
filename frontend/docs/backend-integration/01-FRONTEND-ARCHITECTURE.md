# 01 — FRONTEND ARCHITECTURE

**Project:** MediXO EduX (`medixo-edux-platform` v1.0.0)
**Phase:** A — documentation only. This document describes the CURRENT frontend exactly as implemented. Nothing here prescribes backend design.
**Stack (from `package.json`):** React 18.3, Vite 5, React Router DOM 6.27, TanStack Query 5.59, Axios 1.7, Tailwind CSS 3.4 (+ tailwindcss-animate), Recharts 2.13, framer-motion 11, react-hook-form, react-dropzone, react-markdown + remark-gfm, date-fns, lucide-react, clsx + tailwind-merge. Dev: Vitest 2.1.
**Test runner:** Vitest (`npm test` → `vitest run`). **Build:** `npm run build` → `vite build`. **Dev:** `npm run dev` (port 5173, host binding on, per `vite.config.js`).

---

## 1. Repository Structure

Root layout (actual):

```
/home/user/edux
├── index.html                  # SPA entry
├── vite.config.js              # '@' → ./src alias; manual vendor chunks; dev server config
├── tailwind.config.js / postcss.config.js
├── package.json                # scripts: dev | build | preview | test
├── src/                        # application code (445 js/jsx files)
├── tests/                      # Vitest suites (7 files, 153 tests)
├── docs/backend-integration/   # Phase A documentation (this folder — new)
├── README.md, CHANGE-LOG.md    # product + phase history narrative
├── AUDIT-REPORT.md, PHASE-0-ARCHITECTURE-AUDIT.md, PHASE-2…8 reports
└── public/
```

Responsibilities of the important `src/` directories (actual, current):

| Directory | Responsibility |
|---|---|
| `src/api/` | **API layer.** `client.js` (unified `request()`), `axios.js` (real-backend HTTP client + token refresh), `core/router.js` (the in-browser prototype adapter: `defineRoute`/`dispatchRequest`), `core/exam-attempts-store.js` (shared canonical-attempt reader), and one folder per API domain (`auth`, `platform`, `student`, `exam`, `faculty`, `admin`, `parent`, `interventions`, `ai`) whose modules **register endpoints by side effect** when imported. `index.js` imports every route module and re-exports the dispatch surface. |
| `src/services/` | **Service layer.** TanStack Query hooks (one hook per endpoint concern) + `query.js` shared helper. 10 hook modules + the helper: `index.js`, `auth.js`, `extra.js`, `intelligence.js`, `faculty-intelligence.js`, `admin-intelligence.js`, `faculty-students.js`, `faculty-interventions.js`, `exam-agent.js`, `question-studio.js`. Pages/components import hooks from here — never API modules. |
| `src/intelligence/` | **Intelligence layer.** Three foundations: Student (`index.js`, `master-profile.js`, `datasets/`, `engine/`), Faculty (`faculty/`), Admin (`admin/`). Pure, UI-free, deterministic derivation functions + master profiles + grouped datasets. Engines are Node-runnable (used directly by tests). |
| `src/datasets/` | **Dataset layer (reference/demo data).** Deterministic seed data grouped by domain: `admin/`, `ai/`, `exams/`, `faculty/`, `parent/`, `platform/`, `student/`. Imported by API handlers and intelligence foundations; behaves like a seeded database in mock mode. |
| `src/pages/` | **Presentation.** Route-level pages: `landing/` (10), `auth/` (7), `student/` (25), `faculty/` (21), `admin/` (26), `parent/` (15), plus shared `Forbidden.jsx` / `NotFound.jsx`. All lazy-loaded in `src/routes/index.jsx`. |
| `src/components/` | **Presentation.** Workspace component families: `layout/` (AppLayout, LandingLayout, AuthLayout, sidebar, topbar, command palette, ai-copilot), `shared/` (error-boundary, loading, empty-state, data-table, stat-card, timeline…), `ui/` (design-system primitives incl. toast), `charts/`, plus per-domain families: `academic-workspace`, `admin-ai`, `admin-dashboard`, `admin-reports`, `ai-studio`, `ai-workspace`, `assessment-workspace` (paper generator, PYQ, question intelligence, paper library), `exam-workspace` (+ `exam-agent/` live exam UI), `faculty-dashboard`, `institution-workspace`, `intervention-workspace`, `question-studio`, `reports-workspace`, `students-workspace` (Student 360 panels, intervention center), `teaching-workspace`, `dashboard`, `landing`, `settings`, `support`. |
| `src/routes/` | Route registration: `index.jsx` (all `<Route>` declarations, legacy redirects, parent gate) and `ProtectedRoute.jsx` (auth + role guard). |
| `src/config/` | `index.js` — `APP_CONFIG` (name, `USE_MOCK_API`, `API_BASE_URL`, storage keys), `FEATURE_FLAGS` (`parentPortal: false`), `NAV_GROUPS` (sidebar per role), `ROLE_LABELS`, `ROLE_HOME`, `ROLES`. |
| `src/contexts/` | React contexts: `auth-context.jsx` (session/login/logout prototype) and `theme-context.jsx` (theme + reduced motion). |
| `src/hooks/` | UI utility hooks: `use-chat-assistant`, `use-count-up`, `use-debounce`, `use-focus-trap`, `use-in-view`, `use-media-query`. |
| `src/constants/ui/` | UI constants (`src/constants/ui/index.js`). |
| `src/utils/` | `cn.js` (class merge), `format.js`, `student-360-url.js` (Student 360 deep-link contract helpers). |
| `src/validators/` | Form validators (`index.js`). |
| `src/theme/`, `src/assets/` | Theme tokens and static assets. |
| `tests/` | Vitest suites: `setup/api.js` (localStorage shim + router boot + request helpers), `fixtures/` (attempts, students), `intelligence/` (Student 360 domain isolation / consolidation / evidence-action / routes / UI render, phase-6 multi-student outcomes), `services/service-surface.test.js`. Tests import production intelligence code and the API layer directly. |

Notable convention: **`docs/PHASE_0_FACULTY_EXAM_INTEGRATION_AUDIT.md` is referenced in code comments** (`src/intelligence/engine/exam-agent.js` §9–§13) as the origin of the canonical ExamAttempt contract — but that file is **not present in the repository** (only `PHASE-0-ARCHITECTURE-AUDIT.md`, a different document, exists). The contract itself is fully defined in code; the referenced audit doc is **NOT CURRENTLY DEFINED** in-repo.

---

## 2. Architectural Layers

### 2.1 Presentation Layer
- **Pages** (`src/pages/**`) — one lazy component per route; own local UI state and URL state; consume service hooks only.
- **Components** (`src/components/**`) — domain workspace families + `ui/` primitives.
- **Layouts** (`src/components/layout/`) — `LandingLayout` (public), `AuthLayout`, `AppLayout` (role portal shell: sidebar from `NAV_GROUPS`, topbar, command palette, AI copilot).
- **Workspace UI** — merged multi-tab workspaces (Teaching Workspace, Assessment Intelligence, My Students, Institution Intelligence, AI Workspace) implementing `?tab=`/`?view=` deep-link state.
- **Allowed dependencies:** services, contexts, hooks, utils, ui components, intelligence **pure display helpers only where exported for that purpose** (e.g. `formatClock`/`formatPace` from the exam-agent engine, used by the Exam Agent UI). Pages never import `src/api/**` route modules.

### 2.2 Service Layer
- **Hooks/Services** (`src/services/**`) — TanStack Query `useQuery`/`useMutation` wrappers; `query.js` centralizes query options (`getQuery(path, key)`); mutations invalidate the right query keys (e.g. creating an intervention invalidates faculty + student intervention queries).
- **Data fetching** — always through `request()` from `src/api/client.js`.
- **Allowed dependencies:** API layer (`@/api/client`), config. Re-exports the deterministic tutor-reply fallback (`generateTutorReply`) so chat UIs keep consuming the service layer even for offline fallback.

### 2.3 API Layer
- **Domain APIs** (`src/api/<domain>/*.js`) — each module registers endpoints with `defineRoute(method, pattern, handler)`; handlers read datasets/stores and call intelligence engines.
- **Router** (`src/api/core/router.js`) — `dispatchRequest()` matches method+pattern, adds 380–780 ms simulated latency, returns an axios-shaped `{ data, status: 200, … }`; unknown URL ⇒ throws error with `response.status = 404`.
- **Request/response handling** (`src/api/client.js`) — `request(config)`: mock mode ⇒ dispatch to adapter; otherwise ⇒ axios instance.
- **Prototype adapter** — the router + domain modules **are the current backend**, in-browser.
- **Allowed dependencies:** datasets, intelligence layer, config, localStorage stores. Route modules never import React or pages.

### 2.4 Intelligence Layer
- **Engines** (`src/intelligence/**/engine/`) — deterministic derivation: student (scores, derive, dna, exams, readiness, university, competitive, progress-report, exam-agent, exam-attempt-intelligence), faculty (analytics, assessment, similar-issues, intervention-lifecycle, student-360, students-directory, question-studio, reports, ai-studio, alerts, attention, engagement, timeline, dashboard, insights, ground-level-intelligence, scores, students, assignments, attendance, classes…), admin (health, students, assessments, reports, scores + `ai/` response engine).
- **Derived intelligence** — `computeDerivedIntelligence()` / `computeFacultyIntelligence()` / `computeAdminIntelligence()` snapshots, recomputed on every call (changing a base dataset immediately changes every derived value).
- **Canonical signals** — the canonical ExamAttempt contract + its adapter (`buildAttemptSignals`, `buildExamEvidence`).
- **Analysis** — per-attempt analysis variants, trends, fingerprints, effectiveness.
- **Allowed dependencies:** datasets only (UI-free, relative imports, Node-runnable). Never imports services/api/pages/components.

### 2.5 Dataset Layer
- **Deterministic datasets** (`src/datasets/**`) — seed/reference data for every domain (19 files).
- **Reference data** — master profiles (`src/intelligence/*/master-profile.js`), students directory, batches, exam papers, question banks, PYQ sets, platform content, demo users.
- **Demo data** — fictional institution/people/marks (README: "Demo project — fictional institution data").
- **Allowed dependencies:** none (leaf layer; may import each other, e.g. paper-generator pulls from the competitive question foundation).

### 2.6 Persistence Layer
- **localStorage** — session/theme + the prototype persistence keys (full table in `00-BACKEND-INTEGRATION-MASTER.md` §8).
- **In-memory stores** — adapter module state (papers, reports, studio sessions), memoized snapshots, fingerprint cache.
- **Prototype persistence** — the three intervention stores, exam attempts store, paper shares, registered students.
- **Allowed dependencies:** none beyond `window.localStorage`.

---

## 3. Dependency Direction

Primary (data-fetch) direction:

```
UI (pages / components)
 ↓ imports hooks
Services (src/services)
 ↓ calls request()
API Layer (src/api/client.js)
 ↓ USE_MOCK_API ? adapter : axios
Prototype Adapter (src/api/core/router.js + domain modules)     [CURRENT]
 ↓ reads / mutates
Datasets · localStorage stores · Intelligence engines
```

Intelligence (derive) direction:

```
ExamAttempt (canonical, raw)
 ↓
Intelligence Engines (exam-agent → exam-attempt-intelligence adapter → dna/readiness/university/competitive; faculty student-360 / similar-issues / intervention-lifecycle)
 ↓
Derived Intelligence (signals, evidence, snapshots, effectiveness)
 ↓
Services (expose via API endpoints as queries)
 ↓
UI
```

**Prohibited dependencies** (as enforced by convention/architecture comments in the code, and validated by the Phase 8 test suite):

- **UI → raw route handlers (`src/api/<domain>/*`) = prohibited.** "No UI or page ever imports a route module directly" (`src/api/index.js`). Services are the boundary (the `generateTutorReply` re-export exists precisely to preserve this).
- **UI → test fixtures (`tests/fixtures/**`) = prohibited.** Fixtures live under `tests/` and are consumed only by tests; production seed data lives in `src/datasets/` (e.g. `examAttemptSeeds` — distinct from `tests/fixtures/attempts.js`).
- **Production code (`src/`) → tests (`tests/`) = prohibited.** Test files import production code, never the reverse.
- **Intelligence → UI/API = prohibited.** Engines are UI-free and don't call `request()`.
- **Pages → axios directly = prohibited by convention** — everything goes through `request()`/services.
- Tests currently assert the service surface and Student 360 contracts (`tests/services/service-surface.test.js`, `tests/intelligence/*`).

---

## 4. Major Frontend Modules

### 4.1 Student module
- **Purpose:** student portal (dashboard, academics, courses, attendance, assignments, calendar, portfolio, progress report, AI learning surfaces, exams, interventions).
- **Entry points:** `/student` (index Dashboard) + 24 child paths (full list in `03-ROUTES-AND-UI-MODULES.md` §3).
- **Routes services:** `services/index.js`, `extra.js`, `intelligence.js`, `exam-agent.js`, faculty-interventions (student-side hooks).
- **API dependencies:** `/intelligence/*` (4), `/student/*` (16), `/student/exam-agent/*` (4), `/student/interventions*` (4), `/ai/*` where used (tutor/copilot/learning-path).
- **Datasets:** `src/datasets/student/*` + `src/intelligence/datasets/*` + `src/datasets/exams/*`.
- **Intelligence dependencies:** Student Intelligence Foundation (all engines).
- **Persistence:** localStorage exam attempts + intervention practice/retest stores; TanStack Query cache.

### 4.2 Faculty module
- **Purpose:** faculty workspace, teaching analytics, assessment intelligence, my students/Student 360, similar issues/interventions, reports, AI workspace.
- **Entry points:** `/faculty` + 24 child paths (6 of them legacy redirects).
- **Services:** `faculty-intelligence.js`, `faculty-students.js`, `faculty-interventions.js`, `question-studio.js`, `index.js`, `extra.js`.
- **API dependencies:** `/faculty-intelligence/summary`, `/faculty/*` workspace (13), question-bank, pyq (4), paper-generator (7), question-studio (12), reports (3), ai-studio (1), students (4), similar-issues (4), interventions (14).
- **Datasets:** `src/datasets/faculty/*` + `src/intelligence/faculty/datasets/*` (incl. students directory: 7 batches / 126 students).
- **Intelligence dependencies:** Faculty foundation incl. `computeStudent360`, similar-issues, intervention-lifecycle, question-studio engines.
- **Persistence:** intervention stores, paper shares; in-memory adapter state for papers/reports/sessions.

### 4.3 Admin module
- **Purpose:** institution intelligence, executive reports, AI workspace, governance, people, academics, finance.
- **Entry points:** `/admin` + 31 child paths (6 legacy redirects).
- **Services:** `admin-intelligence.js`, `index.js` (admin hooks), `extra.js`.
- **API dependencies:** `/admin-intelligence/summary` + 22 `/admin/*` endpoints.
- **Datasets:** `src/datasets/admin/*` + `src/intelligence/admin/datasets/*`.
- **Intelligence dependencies:** Admin foundation (health pillars, student/assessment intelligence, reports) + admin AI response engine.
- **Persistence:** in-memory adapter state (GET payloads); localStorage for report library UI state (`admin-reports/library-tab.jsx`) and admin AI chat history (`admin-ai/*`).

### 4.4 Parent module (disabled)
- **Purpose:** guardian portal for a future version.
- **Entry points:** `/parent` + 13 child paths behind `ParentGate` (`FEATURE_FLAGS.parentPortal === false` ⇒ redirect to `/auth/login?role=parent`).
- **Services:** parent hooks in `index.js`/`extra.js`.
- **API dependencies:** 17 `/parent/*` endpoints (still registered).
- **Datasets:** `src/datasets/parent/*`.
- **Intelligence:** none dedicated.
- **Persistence:** localStorage settings PATCH simulated in-memory.

### 4.5 Assessment module (faculty Assessment Intelligence)
- **Purpose:** question intelligence, PYQ intelligence, paper generator (studio), paper library, assessment analytics, AI question studio.
- **Entry points:** `/faculty/question-intelligence` (+ legacy redirects `question-bank`, `paper-generator`, `pyq-analysis`); tabs via `?tab=`.
- **Services/API/Datasets/Intelligence:** see domain map §4.12–4.15 of the master doc.
- **Persistence:** in-memory papers + `EduX_faculty_paper_shares`; question-studio sessions in adapter memory.

### 4.6 Question Intelligence module
- Covered under Assessment; university bank + competitive foundation + studio approvals; deep-link pre-filters `?subject=&chapter=&family=`.

### 4.7 Paper System (Generator + Library + Share)
- Covered under Assessment; re-test prefill `?intervention=…` from the intervention center; share = prototype persistence.

### 4.8 Interventions module
- **Entry points:** faculty `/faculty/my-students?view=interventions` (+ intervention center component, also reachable from Student 360); student `/student/interventions` (entry strip also on `/student/examinations`).
- **Services/API/Intelligence/Persistence:** see master doc §4.16–4.20.

### 4.9 Exam Agent module
- **Entry point:** `/student/exam-agent`; query deep links `?exam=&attempt=&mode=demo|manual`.
- **Services:** `services/exam-agent.js`; **API:** 4 endpoints; **Datasets:** 9 papers + seeds; **Intelligence:** exam-agent engine; **Persistence:** `EduX_student_exam_attempts`.

### 4.10 AI Intelligence module (conversation surfaces)
- **Purpose:** AI Tutor (`/student/ai-tutor`), AI Copilot (`/student/ai-copilot`, global via layout), MediXO Mentor (`/student/mentor`), Learning Path (`/student/learning-path`), faculty AI Teaching Assistant (`/faculty/ai-assistant`), admin AI Workspace (`/admin/ai-workspace`).
- **Services:** `useAITutorThreads/Respond`, `useCopilotSuggestions`, `useGraphSearch`, `useAIAssistantThreads/Respond`, `useAIStats`, `useLearningPath`, `useMentorWorkspace`; faculty/admin intelligence snapshots.
- **API:** `/ai/*` (8 endpoints) + `/student/mentor/workspace`.
- **Datasets:** `src/datasets/ai/assistants.js`, intelligence workspace datasets.
- **Intelligence:** deterministic reply engines (`src/api/ai/tutor-reply.js`, `assistant-reply.js`, admin `ai/response-engine.js`); fallback: chat surfaces fall back to `generateTutorReply` when the assistant request fails, so they never show an "offline" state.

---

## 5. Intelligence Architecture

High-level chain (no algorithms rewritten here — semantics only):

```
Canonical ExamAttempt  (buildCanonicalExamAttempt — identity · context · snapshot · questionAttempts · raw interactions)
 ↓
Attempt Signals        (buildAttemptSignals — cross-attempt subject/chapter aggregation, University vs Competitive isolated)
 ↓
Derived Intelligence   (buildExamEvidence → DNA evidence pools; computeAcademicDna; readiness; university/competitive strategies)
 ↓
Student 360            (computeStudent360 — faculty-side 8/14-tab bundle over the SAME canonical attempts)
 ↓
Similar Issues         (fingerprints → partition grouping → similarity score → recommendations)
 ↓
Intervention Intelligence (lifecycle engine → practice selection → re-test → effectiveness)
```

Engine classification:

- **Canonical:** `exam-agent.js` (ExamAttempt contract, classifications, report), `intervention-lifecycle.js` (status machine, practice/re-test/effectiveness).
- **Adapters (thin, no new intelligence):** `exam-attempt-intelligence.js` (attempt→existing engines), `students-directory.js` reads (canonicalAttemptsFor merges stored + deterministic history).
- **Derived:** `dna.js`, `readiness.js`, `university.js`, `competitive.js`, `derive.js`, `scores.js`, `exams.js`, `progress-report.js` (student); `student-360.js`, `similar-issues.js`, `reports.js`, `health.js` etc. (faculty/admin).
- **Presentation-only intelligence:** label/tone maps (e.g. `ATTEMPT_CLASSIFICATIONS` display metadata), `formatClock`/`formatPace`, chart projections inside components; the admin AI response engine produces workspace chat replies (presentation of intelligence, not new analysis).

Honesty contract (stated in engine headers): this is a deterministic rule-based engine over real interaction data, **not a trained model**; consumers label it "(prototype)". No psychological claims; only observable exam data; no concept invention.

---

## 6. State Management

| Mechanism | Where used today |
|---|---|
| **React state (`useState`/`useMemo`)** | Every page: filters, selections, wizard steps (Exam Agent home→live→report), dialogs, forms. |
| **Context** | `AuthProvider` (session user/status, login/logout) and `ThemeProvider` (theme, reduced motion). Only these two app-wide contexts (+ `ToastProvider` for notifications UI). |
| **URL state (`useSearchParams`)** | Deep links: `?tab=`, `?view=`, `?context=`, `?subject=`, `?chapter=`, `?family=`, `?exam=`, `?attempt=`, `?mode=`, `?period=`, `?template=`, `?intervention=`, `?role=` (details in `03-ROUTES-AND-UI-MODULES.md` §8). Student 360 mirrors its four canonical params through `src/utils/student-360-url.js`. |
| **localStorage** | Session/tokens/user/theme/reduced-motion + prototype persistence (attempts, interventions, practice, re-tests, paper shares, registrations). |
| **In-memory stores** | Adapter module state (papers, reports, studio sessions, memoized intelligence snapshots, fingerprint cache). |
| **Server/API state (TanStack Query)** | All service-hook data: queries keyed per endpoint concern (`['intelligence','summary']`, `['faculty','students']`, …), staleTime 60 s, retry 1, no refetch on focus (`src/main.jsx`); mutations invalidate keys. |

---

## 7. Routing Architecture

- **Registration:** single `AppRoutes` in `src/routes/index.jsx`; every page is `lazy()`-loaded and wrapped per-route with `ErrorBoundary` + `Suspense` (`withSuspense`), so a failed chunk shows a recoverable card instead of a blank screen.
- **Protected routes:** `ProtectedRoute` — unauthenticated ⇒ `Navigate` to `/auth/login` with `state.from`; role mismatch ⇒ `/403`.
- **Role-based routing:** four portals (`/student`, `/faculty`, `/admin`, `/parent`), each guarded with its role from `ROLES`; `ROLE_HOME` maps login destination per role.
- **Redirects:** legacy redirects (see `03-ROUTES-AND-UI-MODULES.md` §7) — faculty superseded pages → canonical destinations preserving `?query`; legacy Student 360 alias and attempt-analysis alias → canonical `my-students` routes; admin legacy analytics → Institution Intelligence tabs; Parent gate redirect.
- **Legacy routes:** kept as redirects only; the superseded page files still exist but are no longer routed (e.g. `pages/faculty/PYQAnalysis.jsx` is imported nowhere in the router — the `pyq-analysis` path redirects to `question-intelligence?tab=pyq`).
- **Deep links:** documented in `03-ROUTES-AND-UI-MODULES.md` §8.
- **Query parameters:** read defensively (unknown values fall back to defaults via allow-lists, e.g. `MyStudents ?view=`, `student-360-url.js` `TABS`).
- **Fallback:** `*` → `NotFound` page; `/403` → `Forbidden`.

---

## 8. Error Handling (CURRENT frontend behavior only)

- **HTTP errors (real-backend mode):** axios instance rejects; response interceptor handles **401** by attempting one token refresh (`POST /auth/refresh`) and replaying the original request; concurrent 401s queue on the refresh; failed refresh clears tokens and hard-redirects to `/auth/login`. Other statuses propagate to TanStack Query.
- **Prototype adapter errors:** unmatched route ⇒ thrown error with `response.status = 404` (`No handler for METHOD /url`); missing entities (attempt/paper/student/intervention not found) ⇒ handlers throw errors shaped `{ status: 404, data: { message } }`.
- **400:** no prototype endpoint currently returns 400 (validation is client-side via `src/validators` + react-hook-form). Real-backend 400 behavior: **NOT CURRENTLY DEFINED** beyond generic query error states.
- **401:** handled only by the axios refresh flow above (mock mode never produces it). Session expiry UI beyond the redirect: **NOT CURRENTLY DEFINED**.
- **403:** route-level only (role mismatch → `/403` page). API-level 403 handling: **NOT CURRENTLY DEFINED**.
- **404:** adapter miss / entity-not-found as above; router fallback page for unknown URLs.
- **409:** no prototype endpoint returns 409; duplicate email/phone in registration is rejected with an inline message from the mock handler. API-level 409 contract: **NOT CURRENTLY DEFINED**.
- **Loading states:** shared `PageLoader` / `DashboardSkeleton` / skeletons per workspace; every service-hook consumer renders a loading branch (`isLoading`).
- **Error states:** `ErrorState` shared component with retry (`refetch`) on query failures; global + per-route `ErrorBoundary` catches render errors with a recovery card (reload/home).
- **Empty states:** shared `EmptyState` component; e.g. "No competitive activity recorded yet." on the Progress Report; forum/support lists.
- **Insufficient data:** explicit honest handling — missing report metrics show "N/A"; no attempts ⇒ intelligence graph computes exactly as before (`attemptSignals = null`).
- **Question-pool shortfall:** the paper generator returns `{ insufficient: true, available, required, suggestions }` and the UI shows "Available vs Required" + **"Broaden filters"** guidance — never a silently thin paper; a low-match generation includes an honest low-match notice. The competitive question browser shows "Not enough questions match this configuration — Broaden the filters to see matching questions."
- **Chat fallbacks:** AI chat surfaces fall back to the deterministic tutor reply engine when the assistant request fails — no "Assistant Offline" states.

No backend error contracts are invented here; anything not observable in code is marked **NOT CURRENTLY DEFINED**.

---

## 9. Data Ownership

| Data category | Current owner | Notes |
|---|---|---|
| Master student profile & academic datasets | Frontend dataset (`src/intelligence/master-profile.js`, `src/intelligence/datasets/*`) | Demo identity (Aarav Sharma, `u_stu_001`) |
| Derived student intelligence | Intelligence engine (derived state, recomputed) | Future backend ownership of durable analytics — **not implemented** |
| Faculty/admin datasets & derived snapshots | Frontend datasets + engines | Same |
| Exam papers (Exam Agent) | Frontend dataset (`src/datasets/exams/exam-agent.js`) | 9 papers |
| ExamAttempts (real) | localStorage (`EduX_student_exam_attempts`) via API adapter | **Future backend ownership — not implemented** |
| ExamAttempt seeds (sample history) | Frontend dataset (`attempt-seeds.js`, `mock: true`) | Demo data — must not become real data |
| Question banks (university + competitive + PYQ + studio) | Frontend datasets | Stable ids are part of the contract |
| Question-studio sessions/questions | API adapter in-memory store | **Future backend ownership — not implemented** |
| Generated papers / library | API adapter in-memory (dataset-seeded) | **Future backend ownership — not implemented** |
| Paper shares | localStorage (`EduX_faculty_paper_shares`) | **Future backend ownership — not implemented** |
| Interventions / practice / re-tests | localStorage (`EduX_*` intervention keys) via one store | **Future backend ownership — not implemented** |
| Effectiveness | Derived (computed on read) | Semantics must remain stable |
| Users / session / tokens | `DEMO_USERS` dataset + localStorage (`EduX_user`, tokens) + registered-students registry | Real auth — **Future backend ownership — not implemented** |
| Platform content (blog/careers/…) | Frontend dataset | |
| Theme / preferences | localStorage (`EduX_theme`, `EduX_reduced_motion`) + settings endpoints | |
| Query cache | TanStack Query (client state) | Never a source of truth |

---

## 10. Backend Replacement Boundary

What the future backend replaces — **the adapter and the persistence, not the UI/services**:

```
CURRENT (per endpoint):

Service hook (src/services)
 ↓
request() — src/api/client.js  [USE_MOCK_API = true]
 ↓
Frontend API Adapter — src/api/core/router.js + src/api/<domain>/* handlers
 ↓
Deterministic datasets (src/datasets, src/intelligence/*/datasets)
+ localStorage prototype stores
+ intelligence engines invoked by handlers
```

```
FUTURE:

Service hook (src/services)              ← unchanged
 ↓
request() — src/api/client.js            ← unchanged (USE_MOCK_API = false)
 ↓
HTTP API (axios instance, bearer token)  ← unchanged code path, already implemented
 ↓
Python Backend                           ← to be built (Phase B+)
 ↓
Database + AI/Intelligence services      ← NOT CURRENTLY DEFINED
```

- The **frontend UI should remain largely unchanged**: pages/components keep consuming the same service hooks with the same query keys.
- The **service layer is stable**; only `APP_CONFIG.USE_MOCK_API` flips (env `VITE_USE_MOCK=false`).
- The **endpoint contracts to serve** are exactly the 145 registered routes (inventory in `03-ROUTES-AND-UI-MODULES.md` §2); response shapes are defined by the current handlers/datasets.
- **Intelligence placement is open**: engines currently run in the browser (and in tests via Node). Whether equivalent semantics move server-side, or stay client-side over backend-served raw data, is a **later-phase decision — NOT CURRENTLY DEFINED**.
- **localStorage prototype stores are the migration surface** (exam attempts, interventions, practice, re-tests, paper shares, registered students) — to be planned in `10-LOCALSTORAGE-TO-DATABASE-MIGRATION.md` (future phase).
