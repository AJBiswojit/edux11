# 00 — BACKEND INTEGRATION MASTER DOCUMENT

**Project:** MediXO EduX (`medixo-edux-platform` v1.0.0)
**Phase:** A — Frontend Architecture & UI/API Traceability (documentation only)
**Source of truth:** the repository at this commit. Where the repository does not define something, this document says **"NOT CURRENTLY DEFINED"** — nothing is invented.
**Scope guard:** Phase A creates documentation only. No backend code, no database, no schema, no API contract changes, no frontend changes.

---

## 1. Project Overview

### 1.1 What the platform is

MediXO EduX is described in `package.json` and `README.md` as an **AI-powered education platform** for schools, colleges, universities, healthcare institutions and enterprise learning. **In its current state it is a frontend-only prototype**: every screen runs on deterministic in-browser datasets served through an in-browser mock API adapter (`src/api/core/router.js`), with simulated ("prototype") AI. There is **no backend and no database today**.

Key facts as implemented:

- React 18 + Vite SPA (`vite.config.js`, `src/main.jsx`), React Router v6 (`src/routes/index.jsx`), TanStack Query v5, Axios, Tailwind CSS, Recharts, framer-motion.
- 4 user roles: **Student, Faculty, Admin (Administrator), Parent/Guardian** (`ROLES` in `src/config/index.js`).
- The **Parent portal is currently disabled** by feature flag (`FEATURE_FLAGS.parentPortal = false`). Its pages, routes and API endpoints remain in the codebase for a future version; a parent login is redirected back to `/auth/login?role=parent` (see `ParentGate` in `src/routes/index.jsx`).
- Auth is a **prototype**: login is validated client-side in `src/contexts/auth-context.jsx` against a demo user directory (`DEMO_USERS`, `src/datasets/platform/users.js`; all demo passwords `Edux12345`) plus an in-browser registration registry (`EduX_registered_students` in localStorage). There is **no `POST /auth/login` API endpoint in the current prototype adapter** — this is a gap the future backend will fill (see §5 Authentication flows).
- The README labels the dataset a **fictional institution** (Meridian Institute of Technology, Pune) — all people, marks and analytics are demo data.

### 1.2 Major user roles

| Role | Home route | Guard | Current state |
|---|---|---|---|
| Student | `/student` | `ProtectedRoute roles=['student']` | Active; the largest module (25 pages) |
| Faculty | `/faculty` | `ProtectedRoute roles=['faculty']` | Active; assessment/intelligence focus (21 pages) |
| Admin | `/admin` | `ProtectedRoute roles=['admin']` | Active; institution intelligence + governance (26 pages) |
| Parent | `/parent` | `ParentGate` + `ProtectedRoute roles=['parent']` | **Disabled** behind `FEATURE_FLAGS.parentPortal === false` (15 pages kept for the future) |

### 1.3 Major product modules (as actually implemented)

- **Landing / public site** — marketing pages (`/`, `/about`, `/pricing`, `/case-studies`, `/blog`, `/contact`, `/careers`, `/media`, `/privacy`, `/terms`) fed by `src/api/platform/content.js` endpoints and `src/datasets/platform/content.js`.
- **Authentication & Registration** — Login (with role deep link `/auth/login/:role`), forgot-password → OTP → reset, verify-email, 2-step Student Registration (basic info + academic context: *University education* and/or *Competitive exam preparation*), OTP verification, profile hydration (`src/pages/auth/*`, `src/api/auth/session.js`, `src/contexts/auth-context.jsx`).
- **Student portal** — Dashboard, Calendar, Programs, Academics hub, Assignments, Attendance, Courses/Subjects, Portfolio, Progress Report, AI Tutor, AI Copilot, MediXO Mentor, Learning Path, Mock Tests, Exams, Examinations, **AI Exam Conducting Agent**, **My Interventions**, **AI Exam Analysis**, Performance & Accuracy, Settings, Forum, Support.
- **Faculty portal** — Dashboard, **Teaching Workspace**, **Assessment Intelligence** (Question Intelligence · PYQ Intelligence · AI Question Paper Generator · Paper Library · Assessment Analytics · AI Question Studio tab), **My Students** (directory · batches · Similar Issues · Intervention Center), **Student 360 profile**, per-attempt analysis, Reports, **AI Workspace (AI Teaching Assistant)**, Courses, Quiz Builder, Timetable, Announcements, Attendance, Assignments, Research, Lecture Planner, Exam Builder, Settings, Support.
- **Admin portal** — Dashboard, **Institution Intelligence** workspace, Executive Reports, **AI Workspace**, Question Bank, Users/Faculty/Students/Departments, Programs/Subjects/Courses/Batches/Academic Calendar, Revenue, Scholarships, Research, Roles/Permissions/Audit Logs, AI Configuration, CMS, API Configuration, Data Tools, Settings, Support.
- **Parent portal** (disabled) — Dashboard, Progress, Attendance, Performance, Assignments, Exam Results, Behaviour, Reports, Downloads, Fees, Communication, Notifications, AI Insights, Calendar, Settings.
- **Intelligence layer** (not UI): Student Intelligence Foundation, Faculty Academic Intelligence Foundation, Admin (Institution) Intelligence Foundation — see §1.5.

### 1.4 Academic / assessment intelligence architecture (current implementation)

All "AI" in the current frontend is **deterministic, rule-based computation over datasets** — the code and UI honestly label it "prototype" (e.g. "AI Exam Agent (prototype)", "Prototype Intervention Effectiveness", "Prototype Content Intelligence"). There is **no trained model, no external AI service, no inference API** in the repository. The intelligence architecture is:

1. **Canonical ExamAttempt contract** (Phase 1 of the cleanup phases; `src/intelligence/engine/exam-agent.js`) — the single canonical record produced by the AI Exam Conducting Agent. It carries identity (`studentId`, `roll`), provenance (`source`, `mode`), context (`examMode` = `University|Competitive`, `examFamily` = `JEE|NEET|null`), a denormalized exam snapshot, canonical `questionAttempts[]` (per-question response/timing/behaviour/evaluation), plus the raw `interactions` and derived `summary` for backward compatibility.
2. **Attempt intelligence adapter** (`src/intelligence/engine/exam-attempt-intelligence.js`) — a *thin* adapter that aggregates canonical attempts into: `buildAttemptSignals` (cross-attempt subject/chapter signals, University vs Competitive fully isolated), `buildExamEvidence` (Academic DNA evidence pools with traceable evidence + longitudinal trends), `buildAttemptAnalysisVariant` (per-attempt analysis for the existing AI Exam Analysis dashboard), `classifyChapterTrend` (improving/declining/stable/persistent/resolved).
3. **Student Intelligence Foundation** (`src/intelligence/index.js`) — one master student profile (`master-profile.js`) + grouped datasets (`src/intelligence/datasets/*`) + engines (`src/intelligence/engine/*`: scores, derive, dna, exams, readiness, university, competitive, progress-report, exam-agent) producing a fully derived snapshot (`getStudentIntelligence()`) with `derived.university`, `derived.competitive`, `derived.readiness` (including `readiness.byExamFamily` for JEE/NEET), `derived.dnaWorkspace`, interventions, recommendations, etc.
4. **Faculty Academic Intelligence Foundation** (`src/intelligence/faculty/`) — master faculty profile, faculty datasets (teaching, assessment, classes, engagement, reports, competitive questions, question-studio sources/questions, students directory), and engines incl. `computeStudent360` (8-tab 360° student intelligence), similar-issue fingerprinting/grouping (`similar-issues.js`), the **intervention lifecycle engine** (`intervention-lifecycle.js` — statuses, transitions, practice selection, re-test building, effectiveness computation), question studio generation/quality (`question-studio.js`), and teaching/assessment/reports analytics.
5. **Admin (Institution) Intelligence Foundation** (`src/intelligence/admin/`) — institution profile, admin datasets, health engines (academic/attendance/assessment/faculty/student-success/outcomes/department/institution), student & assessment intelligence, executive report builders, plus an admin AI workspace response engine (`src/intelligence/admin/ai/`).

### 1.5 Competitive exam support; University / JEE / NEET separation

The platform carries a **dual academic architecture** (introduced in the code as "Phase 27.1"):

- A student may hold **both** a university education and a competitive-exam preparation — this is a valid state in the master profile.
- **University context**: semester/course/academic signals (CGPA, attendance, course subjects).
- **Competitive context**: exam/paper/PYQ/mock signals (percentile, negative marking, PYQ performance).
- Context isolation is **enforced in the engines**: university calculations never consume percentile/negative-marking/PYQ signals; competitive calculations never consume CGPA/university attendance. Subject Intelligence in Student 360 shows "University course subjects · JEE P/C/M · NEET P/C/B — never merged".
- Canonical rule (`classifyAttemptContext` in `src/intelligence/engine/exam-agent.js`): University ⇒ `{domain:'university', examMode:'University', examFamily:null}`; JEE ⇒ `{domain:'competitive', examMode:'Competitive', examFamily:'JEE'}`; NEET ⇒ `{domain:'competitive', examMode:'Competitive', examFamily:'NEET'}`. See §7 — **JEE Physics MUST NOT merge with NEET Physics**.

### 1.6 Faculty intelligence

Delivered through `/faculty` pages: Teaching Workspace (teaching health/effectiveness/engagement/alerts/recommendations), Assessment Intelligence (question intelligence, PYQ intelligence, paper generation, paper library, assessment analytics, AI question studio), My Students (batch directory + statuses), **Student 360** (overview, examinations, subject/chapter/question/time-behaviour/trends/DNA tabs), **Similar Issues** (cross-student issue fingerprints → grouped similar issues with AI similarity score — labelled prototype), **Interventions** (full lifecycle, see §1.8), Reports, AI Workspace. All served by `GET /faculty-intelligence/summary` plus dedicated endpoints (§4).

### 1.7 Student intelligence

Delivered through `/student` pages: the canonical snapshot `GET /intelligence/summary` (profile + datasets + derived intelligence incl. Academic DNA, readiness, university/competitive strategies) powers Dashboard, Academics, Attendance, Assignments, Courses, Subjects, Calendar, Portfolio, Progress Report, Performance & Accuracy and the Examinations hub; `GET /intelligence/exam-attempts` and `GET /intelligence/exam-dna-signals` expose canonical attempts and DNA evidence pools; the **AI Exam Conducting Agent** (`/student/exam-agent`) runs practice papers and stores canonical attempts; **AI Exam Analysis** (`/student/exam-analysis`) analyses per-attempt data; **My Interventions** (`/student/interventions`) runs assigned practice and re-tests.

### 1.8 Intervention system

One intervention system, one store, one lifecycle (comments in `src/api/interventions/*`):

- **Similar Issues** — every student's canonical attempts → 360 intelligence → deterministic **issue fingerprint** (domain · family · subject · chapter · conservative `issueType`: Persistent Weakness / Declining Performance / Low Accuracy / Time Management / High Skip Rate / Careless Errors, else honest "Performance Gap") → partition-based grouping (domain→family→subject→chapter; **no cross-domain mixing**) → weighted **AI Similarity Score** (prototype label) → group evidence + `whyDetected` explanation + evidence-based recommendation with derived priority.
- **Intervention lifecycle** — statuses `Detected → Recommended → Approved → Planned → Assigned → In Progress → Completed → Re-test Pending → Evaluating → Resolved | Improving | Persistent` (+ `Dismissed` allowed pre-assignment; invalid jumps rejected — `INTERVENTION_STATUSES` / `TRANSITIONS` / `canTransition` in `src/intelligence/faculty/engine/intervention-lifecycle.js`).
- **Execution** — faculty creates interventions (from similar-issue groups or Student 360 individual issues), modifies them (evidence never editable), assigns students; students run **targeted practice** (questions selected from the existing datasets — never a second bank) and a linked **re-test** (different questions, same chapter, linked via `interventionId`; re-test papers generated through the Question Paper Studio carry the intervention link and are badged "Intervention re-test" in the Paper Library).
- **Effectiveness** — deterministic **Prototype Intervention Effectiveness**: before/practice/retest deltas (accuracy +pp · time −s · incorrect −n) with documented outcome rules (Resolved / Improving / Persistent…). Completion ≠ effectiveness.
- Practice/re-test attempts are stored with `mode: 'intervention-practice' | 'intervention-retest'` and never contaminate official exam attempts.

### 1.9 Question intelligence, PYQ intelligence, paper generation, Exam Agent

- **Question Intelligence** (faculty Assessment Intelligence tab): University | Competitive toggle; the university bank lives in `src/datasets/faculty/workspace.js` (`questionBank`); competitive questions (JEE P/M/C + NEET P/C/B, stable `CQ-*`-style ids, full metadata) live in `src/intelligence/faculty/datasets/competitive-questions.js`; approved AI Question Studio questions sync into the same bank (`source: 'AI Question Studio'`).
- **PYQ Intelligence**: actual previous-year questions in both modes, linked to the bank via stable identities (`UPYQ-*` bankId links; competitive questions ARE the PYQ records) — `src/api/faculty/pyq-analysis.js` endpoints over `src/datasets/faculty/pyq-analysis.js`.
- **AI Question Paper Generator** ("Question Paper Studio"): 5-section generation flow, deterministic generation from the existing question foundation, respects mode/exam/subject/chapter/topic/difficulty/types/marks/count/PYQ preference, honest "Available vs Required + Broaden filters" insufficiency state, review (edit/replace/remove), quality panel, save to library.
- **Paper Library**: single library of University + Competitive (JEE/NEET) papers with filters, search, edit-from-library, print/preview, share + share history (prototype persistence: `EduX_faculty_paper_shares` in localStorage).
- **AI Question Studio** (faculty tab; Phase 42): Source Library (12 original demo sources) → Source analysis ("Prototype Content Intelligence") → deterministic generation from a 305-question curated pool → Draft→Approved review workflow → approved questions sync into the existing Question Bank and feed the Paper Generator.
- **AI Exam Conducting Agent** (student): 9 practice papers (3 University: CS501/CS503/CS505; 3 JEE: 2 full mocks + Physics; 3 NEET: 2 full mocks + Biology) in `src/datasets/exams/exam-agent.js`; flow Home → Instructions → Live exam (manual, or "Demo Monitoring" simulation) → deterministic analysis → AI Exam Performance Report (`buildExamAgentReport`); completed attempts persisted as canonical ExamAttempts to localStorage (`EduX_student_exam_attempts`) via `POST /student/exam-agent/attempts`.

---

## 2. Current Frontend Architecture

```
Frontend UI (pages / components / layouts)
        ↓
Services / Hooks (src/services — TanStack Query hooks; src/hooks — UI utilities)
        ↓
API Layer (src/api — request() in api/client.js; domain route modules)
        ↓
Current Prototype Adapter (src/api/core/router.js — in-browser deterministic
router when APP_CONFIG.USE_MOCK_API === true, otherwise the axios instance
src/api/axios.js pointed at APP_CONFIG.API_BASE_URL)
        ↓
Datasets / Local Persistence (src/datasets + src/intelligence/*/datasets —
deterministic seed data; localStorage for attempts, interventions, practice,
re-tests, paper shares, registrations, session/theme)
```

Explanation of each hop (as implemented):

1. **UI → Services.** Pages/components import hooks from `src/services/*` (never API modules directly; `src/services/index.js` even re-exports the tutor-reply fallback so chat UIs still consume the service layer).
2. **Services → API Layer.** Every hook calls `request({ method, url, data, params })` from `src/api/client.js`.
3. **API Layer → Adapter.** `request()` checks `APP_CONFIG.USE_MOCK_API` (env `VITE_USE_MOCK_API`, default mock). In mock mode it dispatches to `dispatchRequest()` in `src/api/core/router.js`, which matches `method + url pattern` against every endpoint registered by the domain modules in `src/api/<domain>/`, adds simulated latency (380–780 ms), and returns an axios-shaped response. In real mode it calls the shared axios instance (`src/api/axios.js`) which attaches the bearer token and implements the prototype refresh flow (`POST /auth/refresh`) for a future backend.
4. **Adapter → Data.** Handlers read deterministic datasets (in-memory, mutable for the session) and/or the localStorage stores; intelligence endpoints compute derived snapshots on demand via the intelligence foundations.

**The adapter is a stand-in for the real backend.** Setting `VITE_USE_MOCK=false` sends the exact same requests over HTTP to `APP_CONFIG.API_BASE_URL` (default `https://api.medixoedux.edu/v1`) with zero service/UI changes — that is the seam the future Python backend will occupy. (Note: with no backend deployed, that mode is currently untested against a live server; the endpoint contracts to serve are enumerated in `03-ROUTES-AND-UI-MODULES.md` §2.)

---

## 3. Future Backend Direction

Intended direction only — **the backend is NOT implemented yet**. No framework choice, schema, auth design, or AI-service design has been decided in this repository; anything not stated here is **NOT CURRENTLY DEFINED**.

```
Frontend (unchanged UI)
        ↓
Service Layer (src/services — stays the frontend abstraction boundary)
        ↓
API Layer (src/api/client.js + axios instance)
        ↓
Python Backend   ← to be implemented in a future phase (stack: Python — per project decision)
        ↓
Database         ← NOT CURRENTLY DEFINED (no schema exists or is designed in Phase A)
        ↓
AI / Intelligence Services   ← NOT CURRENTLY DEFINED (today's intelligence is
                                deterministic frontend code; whether it moves
                                server-side is a later-phase decision)
```

What *is* already decided by the existing code:

- The HTTP boundary the backend must serve is the set of prototype endpoints registered in `src/api/**` (145 endpoints — full inventory in `03-ROUTES-AND-UI-MODULES.md` §2). Auth header shape (`Authorization: Bearer <token>`) and the refresh call (`POST /auth/refresh` with `{ refreshToken }` returning `{ accessToken, refreshToken }`) are already coded in `src/api/axios.js`.
- The frontend must keep working with `VITE_USE_MOCK=false` pointed at the backend, with zero service/UI changes.
- Beyond that: database engine, ORM, migrations, deployment, real auth provider, AI services — all **NOT CURRENTLY DEFINED**.

---

## 4. Major Frontend Domains

For each domain: purpose · primary frontend pages · primary services · primary API surface · important datasets · important intelligence engines. (Endpoint counts are from the actual `defineRoute` registrations.)

### 4.1 Authentication
- **Purpose:** login, session, forgot/OTP/reset password, verify-email, student registration (2-step, university + competitive context), OTP verification.
- **Pages:** `Login`, `Login/:role`, `ForgotPassword`, `OTPVerify`, `ResetPassword`, `VerifyEmail`, `Register`, `ProfileSetup` (`src/pages/auth/*`).
- **Services:** `src/services/auth.js` (mutations/queries), `AuthContext` (`src/contexts/auth-context.jsx`) for login/logout/session.
- **API surface (8):** `POST /auth/forgot-password|verify-otp|reset-password|verify-email|resend-otp|register|register/verify`; `GET /auth/registration/options`. **Note:** login/logout themselves are client-side prototype operations — no `/auth/login` or `/auth/logout` endpoint exists today; the axios layer additionally expects `POST /auth/refresh` from a real backend.
- **Datasets:** `src/datasets/platform/users.js` (`DEMO_USERS`), `src/datasets/platform/registration.js`.
- **Intelligence:** none.

### 4.2 Student (portal at large)
- **Purpose:** the student's daily academic home — dashboard, academics hub, courses/subjects, attendance, assignments, calendar, portfolio, progress report, exams, mock tests, forum/support/settings.
- **Pages:** 25 files in `src/pages/student/` (see `03-ROUTES-AND-UI-MODULES.md` §3).
- **Services:** `src/services/index.js`, `src/services/extra.js`, `src/services/intelligence.js`, `src/services/exam-agent.js`, `src/services/faculty-interventions.js` (student-side hooks).
- **API surface:** `/student/*` endpoints (academics, exams, mock-tests, settings, programs, forum, support, admit-card, exam-analysis, mentor/workspace — 16 endpoints) + `/intelligence/*` (4).
- **Datasets:** `src/datasets/student/*` (academics, growth, mentor, portal) + the whole Student Intelligence dataset set (`src/intelligence/datasets/*`, 11 files).
- **Intelligence:** Student Intelligence Foundation (`computeDerivedIntelligence`, university/competitive/readiness engines, DNA workspace, progress report engine).

### 4.3 Faculty
- **Purpose:** faculty workspace — teaching analytics, courses, attendance, assignments, quiz/exam builders, timetable, announcements, research, lecture planner, reports, settings, support, AI workspace.
- **Pages:** 21 files in `src/pages/faculty/`.
- **Services:** `src/services/index.js`, `extra.js`, `faculty-intelligence.js`, `faculty-students.js`, `faculty-interventions.js`, `question-studio.js`.
- **API surface:** `/faculty/*` workspace endpoints (13), `/faculty-intelligence/summary`, reports (3), roster, plus the assessment/intervention sets below.
- **Datasets:** `src/datasets/faculty/*` (paper-generator, pyq-analysis, teaching, workspace incl. questionBank), `src/intelligence/faculty/datasets/*` (11 files incl. students-directory, competitive-questions, question-studio-*).
- **Intelligence:** Faculty Academic Intelligence Foundation (`computeFacultyIntelligence`) — teaching health, engagement, insights, dashboard, AI studio generation.

### 4.4 Admin
- **Purpose:** institution management + intelligence — dashboard, institution intelligence workspace, reports, AI workspace, people (users/faculty/students/departments), academics (programs/subjects/courses/batches/calendar), finance (revenue/scholarships), governance (roles/permissions/audit logs/AI config/CMS/API config/data tools).
- **Pages:** 26 files in `src/pages/admin/`.
- **Services:** `src/services/index.js`, `extra.js`, `admin-intelligence.js`.
- **API surface:** `/admin/*` (22 endpoints: users, departments, courses, research, roles, permissions, audit-logs, ai-config, settings, revenue, programs, subjects, batches, calendar, question-bank, scholarships, cms, api-config, data-tools, students, faculty) + `/admin-intelligence/summary`.
- **Datasets:** `src/datasets/admin/*` (core, operations) + `src/intelligence/admin/datasets/*` (academics, ai, analytics, institutions, people).
- **Intelligence:** Admin Intelligence Foundation (`computeAdminIntelligence`) — health pillars, student/assessment intelligence, executive report builders, AI workspace response engine.

### 4.5 Parent (disabled)
- **Purpose:** guardian view of one student's progress — kept for a future version; unreachable while `FEATURE_FLAGS.parentPortal === false`.
- **Pages:** 15 files in `src/pages/parent/`.
- **Services:** `src/services/index.js` (parent hooks), `extra.js` (assignments/fees/behavior/events/downloads/notifications/settings).
- **API surface:** 17 `/parent/*` endpoints (profile, dashboard, progress, attendance, performance, exam-results, communication, ai-insights, reports, assignments, fees, behavior, events, downloads, notifications, settings GET/PATCH) — endpoints kept registered even though the portal is gated.
- **Datasets:** `src/datasets/parent/*` (core, portal).
- **Intelligence:** none dedicated (dataset-driven).

### 4.6 Courses / Academics (Student)
- **Purpose:** enrolled program/semester view, courses, subjects, course detail, academic resources, modules.
- **Pages:** `Programs`, `Academics`, `Courses`, `CourseDetail`, `Subjects`.
- **Services/API:** via `useStudentIntelligence` (`GET /intelligence/summary`) and `GET /student/programs`.
- **Datasets:** `academics.js` (courses, subjects, courseModules, academicResources…), `master-profile.js` (academicProgram).
- **Intelligence:** university engine (`buildUniversityIntelligence`).

### 4.7 Examinations (Student)
- **Purpose:** exam hub — upcoming/past university + competitive exams, admit card, mock tests, entry strip into interventions & Exam Agent.
- **Pages:** `Examinations`, `Exams`, `MockTests`.
- **Services:** `useStudentIntelligence`, `useExams`, `useMockTests`, `useAdmitCard`, `useExamAgentExams`, `useStudentInterventions`, `useMasterStudentProfile`.
- **API:** `GET /student/exams|mock-tests|admit-card`, `/intelligence/summary`, `/student/exam-agent/exams`, `/student/interventions`.
- **Datasets:** `src/intelligence/datasets/examinations.js` (universityExams, competitiveExams), `src/datasets/exams/exam-agent.js`.
- **Intelligence:** exam intelligence (`buildExamIntelligence`), readiness.

### 4.8 Exam Agent (AI Exam Conducting Agent)
- **Purpose:** run practice exams (manual or demo simulation), produce the canonical ExamAttempt + AI Exam Performance Report.
- **Pages:** `ExamAgent` (steps: home → instructions → live → analyzing → report) + components in `src/components/exam-workspace/exam-agent/`.
- **Services:** `src/services/exam-agent.js`.
- **API (4):** `GET /student/exam-agent/exams`, `GET /student/exam-agent/attempts`, `GET /student/exam-agent/attempts/:id`, `POST /student/exam-agent/attempts`.
- **Datasets:** `src/datasets/exams/exam-agent.js` (9 papers), `src/datasets/exams/attempt-seeds.js` (seed history, `mock: true`).
- **Intelligence:** `src/intelligence/engine/exam-agent.js` — `buildExamAgentReport`, `buildCanonicalExamAttempt`, `buildCanonicalQuestionAttempts`, `normalizeExamAttempt`, `classifyAttemptContext`, `filterExamAttempts`, speed thresholds, attempt classifications.

### 4.9 Exam Analysis (AI Exam Analysis)
- **Purpose:** per-attempt deep analysis for students (and faculty view of a student's attempt).
- **Pages:** student `ExamAnalysis`; faculty `FacultyAttemptAnalysis`.
- **Services:** `useExamAnalysisOptions` / `useExamAnalysisById` (`src/services/extra.js`); faculty `useFacultyAttemptAnalysis` (`src/services/faculty-students.js`).
- **API:** `GET /student/exam-analysis/options`, `GET /student/exam-analysis/:id`; `GET /faculty/students/:id/exams/:attemptId/analysis`.
- **Datasets:** `src/datasets/exams/exam-analysis.js` (static variants + options fallback).
- **Intelligence:** `buildAttemptAnalysisVariant` adapter (derives from the attempt's own embedded metadata; previous same-domain attempts feed comparison/trajectory).

### 4.10 Academic DNA
- **Purpose:** cross-attempt strengths/weaknesses with traceable evidence, longitudinal trends, health breakdown, mistake intelligence, weekly plan, prediction; supports both contexts.
- **Pages:** surfaces inside Student 360 (DNA tab), student intelligence workspaces, Progress Report; evidence card reused on the faculty student profile.
- **Services/API:** `GET /intelligence/summary` (embeds `derived.dnaWorkspace` / `derived.academicDna` incl. `academicDna.competitive`), `GET /intelligence/exam-dna-signals` (evidence pools, University vs Competitive fully separate).
- **Datasets:** `src/intelligence/datasets/dna.js`, `signals.js`.
- **Intelligence:** `computeAcademicDna`, `buildDnaExecutiveSummary`, `buildStrengthAnalysis`, `buildWeaknessAnalysis`, `buildChapterMastery`, `buildTopicMastery`, `buildMistakeIntelligence`, `buildImprovementPrediction` (engine/dna.js), plus `buildExamEvidence` evidence pools.

### 4.11 Student 360 (Faculty)
- **Purpose:** the faculty's 360° view of one student — 14 canonical tabs incl. overview, strengths, weaknesses, subjects, chapters, questions, time, errors, trends, comparison, dna, similar, interventions.
- **Pages:** `StudentProfile` at `/faculty/my-students/:studentId` (+ legacy alias `students/:studentId/360` redirect).
- **Services:** `useFacultyStudent360`, `useFacultyStudentInterventions`, `useWeakTopicQuestions` (`src/services/faculty-students.js`, `faculty-interventions.js`).
- **API:** `GET /faculty/students/:id/360`, `GET /faculty/students/:id/interventions`, `GET /faculty/students/weak-topic-questions`.
- **Datasets:** `src/intelligence/faculty/datasets/students-directory.js` (7 batches, 126 students, deterministic per-student attempts).
- **Intelligence:** `computeStudent360` (consumer of canonical attempts via the adapter — no second engine).

### 4.12 Question Intelligence
- **Purpose:** browse/filter the university question bank and the competitive question foundation; deep-link pre-filtering (`?subject=&chapter=&family=`).
- **Pages:** faculty `QuestionIntelligence` (Assessment Intelligence workspace; tabs overview / question-intelligence / pyq / paper-generator / library / analytics) + `AIQuestionStudio`; admin `QuestionBank`.
- **Services:** `useQuestionBank` (`src/services/index.js`); admin `useAdminQuestionBank`.
- **API:** `GET /faculty/question-bank`, `GET /admin/question-bank`.
- **Datasets:** `questionBank` in `src/datasets/faculty/workspace.js`; `competitiveQuestions` in `src/intelligence/faculty/datasets/competitive-questions.js`.
- **Intelligence:** `computeAssessmentIntelligence`, `computeCompetitiveQuestionIntelligence` (faculty foundation).

### 4.13 PYQ Intelligence
- **Purpose:** previous-year-question patterns/analytics in university + competitive modes; actual PYQ questions linked to the bank.
- **Pages:** PYQ tab of `QuestionIntelligence` (legacy page `PYQAnalysis` kept but route redirects).
- **Services:** `usePYQAnalysis`, `usePYQFilters` (+ patterns/analytics hooks in `src/services/extra.js`).
- **API (4):** `GET /faculty/pyq-analysis`, `/faculty/pyq-analysis/filters`, `/faculty/pyq-analysis/patterns`, `/faculty/pyq-analysis/analytics?subject=`.
- **Datasets:** `src/datasets/faculty/pyq-analysis.js`.
- **Intelligence:** `computePyqIntelligence`.

### 4.14 Question Paper Generator (Question Paper Studio)
- **Purpose:** configure + deterministically generate question papers (University / JEE / NEET), review/edit, save to library; re-test prefill via `?intervention=`.
- **Pages:** paper-generator tab of `QuestionIntelligence`; components in `src/components/assessment-workspace/`.
- **Services:** `usePaperGenerator`, `usePaperCreate`, `usePaperDuplicate`, `usePaperRegenerate`, `usePaperArchive`, `usePaperDelete`, `usePaperShare` (`src/services/extra.js`).
- **API (7):** `GET /faculty/paper-generator`; `POST /faculty/paper-generator/papers` (+ `/:id/duplicate`, `/:id/regenerate`, `/:id/share`); `PATCH /faculty/paper-generator/papers/:id/archive`; `DELETE /faculty/paper-generator/papers/:id`.
- **Datasets:** `src/datasets/faculty/paper-generator.js` (per-paper question lists; competitive seeds pull from the competitive foundation).
- **Intelligence:** deterministic selection from existing question foundations; coverage/quality panels computed in the component layer.

### 4.15 Paper Library
- **Purpose:** the single library of generated + seeded papers (University + Competitive) with filters, edit-from-library, print/preview, share history; "Intervention re-test" badges.
- **Pages:** library tab of `QuestionIntelligence`.
- **Services/API:** same paper-generator endpoints; shares persisted to `EduX_faculty_paper_shares`.
- **Datasets:** `paperGenerator.generatedPapers` (incl. 6 pre-generated competitive papers).
- **Intelligence:** none beyond generator selection.

### 4.16 Similar Issues (Faculty)
- **Purpose:** "which students share the same problem?" — fingerprints → grouped similar issues (≥2 students; singletons become "Individual issue") with evidence and recommendations.
- **Pages:** `MyStudents` (`?view=issues`), intervention workspace components.
- **Services:** `useSimilarIssues`, `useSimilarIssueGroupEvidence`, `useGroupInterventionPreflight`, `useCreateGroupInterventions` (`src/services/faculty-interventions.js`).
- **API (4):** `GET /faculty/similar-issues?scope=`, `GET /faculty/similar-issues/:groupId/evidence`, `GET /faculty/similar-issues/:groupId/intervention-preflight`, `POST /faculty/similar-issues/:groupId/interventions`.
- **Datasets:** derived from the students directory + canonical attempts (no separate dataset).
- **Intelligence:** `computeStudentIssueFingerprints`, `groupSimilarIssues`, `similarityBetween` (`SIMILARITY_WEIGHTS`), `buildInterventionFromGroup`.

### 4.17 Interventions
- **Purpose:** the full intervention lifecycle across faculty and student surfaces (one store, one lifecycle) — see §1.8.
- **Pages:** faculty `MyStudents` (`?view=interventions`) + intervention center components; student `Interventions` (My Interventions).
- **Services:** faculty hooks in `src/services/faculty-interventions.js` (list/detail/practice/status/modify/assign/retest/related-resources/create-from-360); student hooks (`useStudentInterventions`, `useStudentInterventionPractice`, `useStudentInterventionRetest`, `useSubmitInterventionAttempt`).
- **API (14 faculty + 4 student):** `GET /faculty/interventions` (+ `/:id`, `/:id/practice`, `/related-resources`), `POST /faculty/interventions/:groupId/status|modify|assign|retest`, `GET /faculty/students/:id/interventions`, `POST /faculty/students/:studentId/interventions`; `GET /student/interventions`, `GET /student/interventions/:id/practice`, `GET /student/interventions/:id/retest`, `POST /student/interventions/:id/practice-attempts`.
- **Datasets:** question pools come from existing datasets (competitive questions / university PYQs) — never a second bank.
- **Intelligence:** intervention-lifecycle engine (statuses/transitions/practice selection/re-test/effectiveness), `computeEffectiveness`, `computeGroupEffectiveness`.

### 4.18 Practice
- **Purpose:** targeted practice sets generated for an intervention, selected from existing question datasets (`selectPracticeQuestions`), with honest insufficiency handling + broaden levels.
- **Pages/API:** student practice runner inside `Interventions` page; `GET /student/interventions/:id/practice`, `POST /student/interventions/:id/practice-attempts` (`kind: 'practice'`).
- **Persistence:** `EduX_intervention_practice_attempts`.

### 4.19 Re-tests
- **Purpose:** post-practice verification exam for an intervention — same chapter, different questions, linked by `interventionId`; created by faculty (optionally via the Paper Studio prefill) and run by the student through the same runner/Exam Agent storage (`mode: 'intervention-retest'`).
- **API:** `POST /faculty/interventions/:groupId/retest`, `GET /student/interventions/:id/retest`, attempts via `POST /student/interventions/:id/practice-attempts` (`kind: 'retest'`).
- **Persistence:** `EduX_intervention_retests` + practice-attempts store.

### 4.20 Effectiveness
- **Purpose:** deterministic before/practice/retest outcome computation (accuracy +pp · time −s · incorrect −n) with documented outcome rules; surfaced on both faculty and student intervention surfaces.
- **API:** embedded in intervention payloads (`outcome`, `effectiveness`, `postExam` fields).
- **Intelligence:** `computeEffectiveness` / `computeGroupEffectiveness` (faculty engine).

### 4.21 Notifications
- **Purpose:** in-app notification feeds (student dashboard daily brief, recent activities, upcoming deadlines; parent notifications page).
- **Where:** `src/intelligence/datasets/outcomes.js` (`notifications`) via the intelligence snapshot; `GET /parent/notifications` for parent.
- **Note:** there is **no standalone notifications API domain or notification center page** in the current student/faculty portals beyond these feeds — **NOT CURRENTLY DEFINED** as a separate subsystem.

### 4.22 Platform / Dashboard
- **Purpose:** public content (blog, careers, case studies, contact, newsletter) and role dashboards (student/faculty/admin/parent home pages).
- **API:** 7 `/platform/*` endpoints; dashboards via `/intelligence/summary`, `/faculty-intelligence/summary`, `/admin-intelligence/summary`, `/parent/dashboard`.
- **Datasets:** `src/datasets/platform/content.js`.
- **Intelligence:** `buildDailyBrief`, `computeDashboardIntelligence` (faculty), admin health pillars.

---

## 5. Data Flow

### 5.1 Student Exam flow (the canonical chain, exactly as implemented)

```
Student
 ↓  (login: AuthContext → session user; identity from GET /intelligence/profile)
Exam Agent                     /student/exam-agent — pick paper (manual or Demo Monitoring)
 ↓  buildCanonicalExamAttempt(...) in the page → POST /student/exam-agent/attempts
ExamAttempt (canonical)        persisted to localStorage 'EduX_student_exam_attempts'
 ↓                              (seeds from attempt-seeds.js join for longitudinal views)
Exam Analysis                  GET /student/exam-analysis/options|:id — buildAttemptAnalysisVariant
 ↓                              (per-attempt analysis from embedded question metadata)
Academic DNA                   GET /intelligence/summary with attemptSignals = buildExamEvidence(manual attempts)
 ↓                              → derived.academicDna + derived.dnaWorkspace (evidence + trends)
Student 360 (faculty)          GET /faculty/students/:id/360 — computeStudent360 over canonical attempts
 ↓
Weakness                       strengths/weaknesses with traceable evidence (attempt/question/accuracy/time)
 ↓
Evidence                       evidence dialog + whyDetected explanations; GET /faculty/similar-issues/:groupId/evidence
 ↓
Similar Issue                  fingerprints → grouping (domain→family→subject→chapter; no cross-domain)
 ↓
Intervention                   POST /faculty/similar-issues/:groupId/interventions or /faculty/students/:studentId/interventions
 ↓                              lifecycle: Detected → … → Assigned (student sees it via GET /student/interventions)
Practice                       GET /student/interventions/:id/practice → selectPracticeQuestions → POST …/practice-attempts (kind=practice)
 ↓
Re-test                        POST /faculty/interventions/:groupId/retest → GET /student/interventions/:id/retest → run (kind=retest)
 ↓
Exam Attempt                   re-test attempt stored (mode 'intervention-retest'), never mixed with official exams
 ↓
Effectiveness                  computeEffectiveness — before/practice/retest deltas → Resolved/Improving/Persistent…
```

Stage notes (all from code): demo attempts (`mode: 'demo'`) are excluded from every intelligence consumer unless explicitly included; seed attempts are flagged `mock: true` and labelled "Sample"; practice/re-test attempts live in a separate store and never contaminate official exam attempts.

### 5.2 Other important flows

- **Faculty intelligence flow:** `GET /faculty-intelligence/summary` → teaching/assessment analytics → Teaching Workspace / Dashboard.
- **Paper flow:** Question Intelligence / PYQ → Generator (deterministic selection) → Save → Paper Library → Share (prototype persistence) → (optional re-test prefill `?intervention=`).
- **Admin intelligence flow:** `GET /admin-intelligence/summary` → health pillars → Dashboard / Institution Intelligence / Executive Reports / AI Workspace.
- **Registration flow:** `/auth/register` (2 steps) → `POST /auth/register` → OTP (`/auth/verify-otp?purpose=register`, `POST /auth/register/verify`) → `AuthContext.login(registerDraft)` → Student Dashboard.

---

## 6. Critical Canonical Contracts

The backend MUST preserve the meaning of these frontend contracts (shapes as they exist in the frontend today; **no database schemas are being defined here**):

| Contract | What it represents in the frontend | Defined in |
|---|---|---|
| User | Session identity (id, role, name, email, institution…); demo directory + registered students | `src/contexts/auth-context.jsx`, `src/datasets/platform/users.js` |
| Student | Master student identity + academic identity (program, semester, roll, batch, CGPA, competitive prep) | `src/intelligence/master-profile.js` |
| Faculty | Master faculty profile + teaching context | `src/intelligence/faculty/master-profile.js` |
| Batch | Canonical batch model (7: CSE-2026-A/B/C university · JEE-2027-A/B · NEET-2027-A/B) | `src/intelligence/faculty/datasets/students-directory.js` |
| Course | University course entity (student courses + courseModules) | `src/intelligence/datasets/academics.js` |
| Subject | University subject / competitive subject (isolated per domain+family) | academics/competitive datasets |
| Chapter | Chapter within a subject (mastery, trends) | dna datasets + exam papers |
| Topic | Topic within a chapter (question metadata, PYQ) | question datasets |
| Question | Bank question (university bank `questionBank`; competitive foundation with stable ids; studio-approved questions with `source:'AI Question Studio'`) | `src/datasets/faculty/workspace.js`, `src/intelligence/faculty/datasets/competitive-questions.js`, `question-studio-questions.js` |
| PYQ | Previous-year question (bank-linked via `UPYQ-*` bankId; competitive questions ARE the PYQ records) | `src/datasets/faculty/pyq-analysis.js` |
| Question Paper | Generated/seeded paper (per-paper `questionList`, config, versions, archive state) | `src/datasets/faculty/paper-generator.js` |
| Exam | Practice paper served by the Exam Agent (9 papers; `type: University|JEE|NEET`) | `src/datasets/exams/exam-agent.js` |
| **ExamAttempt** | **The canonical attempt record** (identity, context `examMode`/`examFamily`, exam snapshot, `questionAttempts[]`, raw `interactions`, derived `summary`) | `buildCanonicalExamAttempt` in `src/intelligence/engine/exam-agent.js` |
| QuestionAttempt | Canonical per-question row (`question`, `academicContext`, `response`, `timing`, `behaviour`, `evaluation`) | `buildCanonicalQuestionAttempts` (same file) |
| Academic DNA | Derived strength/weakness graph with evidence pools + trends (`derived.academicDna`, `dnaWorkspace`) | `src/intelligence/engine/dna.js` + `exam-attempt-intelligence.js` |
| Similar Issue | Issue fingerprint + similarity group (domain/family/subject/chapter scoped) | `src/intelligence/faculty/engine/similar-issues.js` |
| Intervention | Lifecycle record (status machine, evidence-locked, practiceConfig, students, effectiveness) | `intervention-lifecycle.js` + `src/api/interventions/store.js` |
| Practice Attempt | Student practice run for an intervention (`kind:'practice'`) | `EduX_intervention_practice_attempts` |
| Re-test | Linked verification exam entity + its attempt (`kind:'retest'`, `mode:'intervention-retest'`) | `EduX_intervention_retests` + practice store |
| Effectiveness | Deterministic outcome (before/practice/retest deltas; Resolved/Improving/Persistent) | `computeEffectiveness` |
| Paper Share | Prototype share record (audience, recipients, message, status "Sent (prototype)") | `EduX_faculty_paper_shares` via `/faculty/paper-generator/papers/:id/share` |

---

## 7. Domain Isolation (critical backend requirement)

Canonical distinction (implemented in `classifyAttemptContext`, `src/intelligence/engine/exam-agent.js`):

| Domain | `domain` | `examMode` | `examFamily` |
|---|---|---|---|
| University | `university` | `'University'` | `null` |
| JEE | `competitive` | `'Competitive'` | `'JEE'` |
| NEET | `competitive` | `'Competitive'` | `'NEET'` |

Rules the backend must preserve:

1. **JEE Physics MUST NOT merge with NEET Physics.** Same subject *name* is a different subject when the family differs. Grouping is always domain → family → subject → chapter; the similar-issues engine partitions by this key *before* comparing (no cross-domain mixing), and Student 360 subject intelligence keeps "University course subjects · JEE P/C/M · NEET P/C/B" separate.
2. Explicit attempt metadata is authoritative: a University attempt is never competitive even if a legacy record carries a family value.
3. University calculations never consume percentile/negative-marking/PYQ signals; competitive calculations never consume CGPA/university attendance (enforced in the readiness/university/competitive engines).
4. Demo attempts (`mode: 'demo'`) are excluded from all intelligence by default; seed attempts are flagged `mock: true` and labelled "Sample" — demo/prototype data must never be treated as real user data.
5. A student holding both a university education and a competitive preparation is a VALID state — isolation is by context, not by student.

---

## 8. Current Persistence

Everything persists **in the browser** today. Nothing is migrated or redesigned in Phase A.

### 8.1 localStorage keys (complete inventory)

| Key | Owner module | Contents |
|---|---|---|
| `EduX_access_token` / `EduX_refresh_token` | `AuthContext`, `src/api/axios.js` (keys from `APP_CONFIG`) | prototype tokens |
| `EduX_user` | `AuthContext` | session user JSON |
| `EduX_theme` | `src/contexts/theme-context.jsx` | theme preference |
| `EduX_reduced_motion` | `src/main.jsx` + theme context | reduced-motion preference |
| `EduX_student_exam_attempts` | `src/api/exam/exam-agent.js`, `src/api/core/exam-attempts-store.js` | canonical ExamAttempts produced by the Exam Agent (Exam Agent's own endpoints read only this store — seeds never appear in the student's own history list) |
| `EduX_faculty_interventions` | `src/api/interventions/store.js` | groupId → intervention status record |
| `EduX_intervention_practice_attempts` | same store | practice/re-test attempts (`kind` discriminator) |
| `EduX_intervention_retests` | same store | re-test entities |
| `EduX_faculty_paper_shares` | `src/api/faculty/papers.js` | paper share records |
| `EduX_registered_students` | `src/api/auth/session.js` (+ AuthContext) | verified registration drafts (can sign back in) |

### 8.2 In-memory stores (session-only, lost on reload)

- The prototype adapter's dataset mutations: generated/duplicated/regenerated papers, archived papers/reports, question-studio sessions/questions, admin/faculty/parent GET payloads — all in-memory module state inside `src/api/**` handlers.
- Module-level caches: intelligence summary snapshots (`snapshot ??=` in faculty/admin intelligence routes), fingerprint cache in `src/api/interventions/lifecycle.js`.
- TanStack Query cache (staleTime 60 s) — client state only.

### 8.3 Deterministic datasets (immutable reference/demo data)

`src/datasets/**` (19 files) and `src/intelligence/*/datasets/**` — imported by API handlers and intelligence engines; behave like a seeded database in mock mode.

---

## 9. Backend Integration Principles

1. **Backend must preserve existing frontend contracts.** The 145 registered endpoints and their response shapes are the contract; the frontend must work unchanged with `VITE_USE_MOCK=false`.
2. **Backend must not recreate domain leakage.** University / JEE / NEET isolation (§7) must hold server-side, including in any aggregation, search, or analytics.
3. **ExamAttempt is canonical.** All attempt-derived intelligence flows from the canonical ExamAttempt record and its embedded `questionAttempts`; the backend owns attempt persistence and must keep raw vs derived separation (`interactions` raw; `summary`/analyses derived and recomputable).
4. **Services remain the frontend abstraction boundary.** UI talks to `src/services` hooks; hooks call `request()`; no page imports an API route module directly.
5. **Intelligence semantics must remain stable.** Classifications (fast-correct…), statuses/transitions (intervention machine), similarity grouping semantics, effectiveness rules, readiness strategies — the deterministic semantics are product behavior, not implementation detail.
6. **Demo/prototype data must not be treated as real user data.** `mode:'demo'` excluded by default; `mock:true` seeds labelled "Sample"; the institution/people datasets are fictional.
7. **University/JEE/NEET remain isolated.** See §7.
8. **Intervention lifecycle must remain compatible.** Statuses and `TRANSITIONS` must be honoured server-side; evidence is immutable; practice/re-test attempts stay separate from official exam attempts.
9. **Question IDs must remain stable.** Bank ids, competitive foundation ids, `UPYQ-*` bank links and paper `questionList` ids are cross-referenced across modules (weak-topic questions, PYQ links, paper generation, studio approvals).
10. **Existing frontend routes must not dictate database structure blindly.** Routes are a navigation inventory (03-ROUTES-AND-UI-MODULES.md), not a data model; the backend models domains, not URL shapes.

---

## 10. Documentation Map

Phase A documents (created now, in `docs/backend-integration/`):

- `00-BACKEND-INTEGRATION-MASTER.md` (this file)
- `01-FRONTEND-ARCHITECTURE.md`
- `03-ROUTES-AND-UI-MODULES.md`
- `PHASE-A-FRONTEND-DOCUMENTATION-REPORT.md` (phase report)

Future documentation phases (referenced, **not created yet**):

- `02-API-CONTRACT.md`
- `04-DATA-MODELS.md`
- `05-EXAM-ATTEMPT-CONTRACT.md`
- `06-AI-INTELLIGENCE-SPECIFICATION.md`
- `07-QUESTION-PAPER-INTELLIGENCE.md`
- `08-INTERVENTION-AND-OUTCOME-SPECIFICATION.md`
- `09-AUTH-RBAC-SECURITY.md`
- `10-LOCALSTORAGE-TO-DATABASE-MIGRATION.md`
- `11-PYTHON-BACKEND-IMPLEMENTATION-GUIDE.md`

**STOP condition:** Phase A ends here. No API contract generation, OpenAPI generation, database modeling, authentication design, or Python implementation is undertaken in this phase.
