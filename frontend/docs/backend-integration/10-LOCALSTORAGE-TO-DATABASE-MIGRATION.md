# 10 — LOCALSTORAGE TO DATABASE MIGRATION SPECIFICATION

**Project:** MediXO EduX (`medixo-edux-platform` v1.0.0)
**Phase:** C — Data Model & Database Mapping Specification
**Document:** LocalStorage Persistence Audit & PostgreSQL Database Migration Strategy
**Date:** 2026-08-23 · **Branch:** `arena/01a02f45-edux`
**Status:** Complete & Verified Specification

---

## 1. EXECUTIVE SUMMARY

In the current frontend prototype (`APP_CONFIG.USE_MOCK_API === true`), state mutations and user interactions are persisted across browser sessions using browser `localStorage` and mutable in-memory module arrays. This architecture allowed rapid UI and intelligence engine development without live backend dependencies.

As the platform transitions to a production Python backend (`FastAPI` + `PostgreSQL`), this document specifies the complete mapping, transformation rules, deduplication logic, and migration safety boundaries required to retire browser-local persistence in favor of ACID-compliant relational storage.

---

## 2. COMPLETE LOCALSTORAGE AUDIT

Every `localStorage` key in the codebase was audited via static code analysis:

| # | Storage Key Constant / Literal | Key Name | Current Data Stored | Primary Writer | Primary Reader | Future Database Entity | Migration Priority |
|---|---|---|---|---|---|---|---|
| 1 | `APP_CONFIG.TOKEN_KEY` | `'EduX_access_token'` | JWT access token string (`'mock_access_...'`) | `AuthContext.login`, `axios.js` refresh | `axios.js` request interceptor | Redis Token Cache / Stateless JWT | High |
| 2 | `APP_CONFIG.REFRESH_TOKEN_KEY` | `'EduX_refresh_token'` | JWT refresh token string (`'mock_refresh_...'`) | `AuthContext.login`, `axios.js` refresh | `axios.js` response interceptor on 401 | PostgreSQL `user_sessions` table / Redis | High |
| 3 | `APP_CONFIG.USER_KEY` | `'EduX_user'` | Current authenticated user JSON object | `AuthContext.login`, `updateUser` | `AuthContext` (on page load / cross-tab) | PostgreSQL `users` + `students` / `faculty` | High |
| 4 | Literal | `'EduX_registered_students'` | Array of registered student user drafts | `POST /auth/register`, `POST /auth/register/verify` | `AuthContext.login`, `POST /auth/register` | PostgreSQL `users` + `students` | High |
| 5 | `ATTEMPTS_STORAGE_KEY` / `STORAGE_KEY` | `'EduX_student_exam_attempts'` | Array of canonical completed ExamAttempt records | `POST /student/exam-agent/attempts` | `GET /student/exam-agent/attempts`, `readAllAttempts` | PostgreSQL `exam_attempts` + `question_attempts` | **Critical** |
| 6 | `STATUS_KEY` | `'EduX_faculty_interventions'` | Key-value dictionary (`groupId` → intervention override record) | `POST /faculty/interventions/:id/*`, `POST /faculty/students/:id/interventions` | `GET /faculty/interventions`, `GET /faculty/similar-issues` | PostgreSQL `interventions` table | **Critical** |
| 7 | `PRACTICE_KEY` | `'EduX_intervention_practice_attempts'` | Array of practice test and re-test submission attempts | `POST /student/interventions/:id/practice-attempts` | `GET /student/interventions`, `groupOutcome` | PostgreSQL `intervention_attempts` | **Critical** |
| 8 | `RETEST_KEY` | `'EduX_intervention_retests'` | Array of scheduled diagnostic re-test entities | `POST /faculty/interventions/:id/retest` | `GET /student/interventions/:id/retest`, `GET /faculty/interventions` | PostgreSQL `intervention_retests` | **Critical** |
| 9 | Literal | `'EduX_faculty_paper_shares'` | Array of question paper share distribution records | `POST /faculty/paper-generator/papers/:id/share` | Paper library sharing UI | PostgreSQL `paper_shares` | Medium |
| 10 | `SESSION_KEY` | `'EduX_question_studio_sessions'` | Array of AI Question Studio generation & review sessions | `POST /faculty/question-studio/generate`, question actions | `GET /faculty/question-studio/sessions`, metrics engine | PostgreSQL `question_studio_sessions` + `question_studio_questions` | High |
| 11 | `HISTORY_KEY` | `'EduX_admin_chat_history'` | Executive AI Workspace conversation message history | `AIWorkspace.jsx`, `chat-panel.jsx` | `AIWorkspace.jsx` | PostgreSQL `chat_threads` + `chat_messages` | Low |
| 12 | `INSIGHTS_KEY` | `'EduX_admin_saved_insights'` | Array of pinned executive insight cards | `AIWorkspace.jsx` | `AIWorkspace.jsx` | PostgreSQL `admin_saved_insights` | Low |
| 13 | `LIBRARY_KEY` | `'EduX_admin_reports_library'` | Array of saved administrative analytical reports | `Reports.jsx` (Admin), `library-tab.jsx` | `Reports.jsx` | PostgreSQL `admin_reports` + S3 PDF storage | Medium |
| 14 | `HISTORY_KEY` | `'EduX_faculty_teaching_assistant_history'` | Faculty Teaching Assistant conversation thread history | `assistant-tab.jsx` | `assistant-tab.jsx` | PostgreSQL `chat_threads` + `chat_messages` | Low |
| 15 | `APP_CONFIG.THEME_KEY` | `'EduX_theme'` | UI theme preference string (`'light'` / `'dark'` / `'system'`) | `ThemeContext` | `ThemeContext` | Client-side only (Keep in localStorage) | Low |
| 16 | Literal | `'EduX_reduced_motion'` | Accessibility motion preference (`'true'` / `'false'`) | `ThemeContext`, `main.jsx` | `ThemeContext`, framer-motion | Client-side only (Keep in localStorage) | Low |

---

## 3. MASTER LOCALSTORAGE MIGRATION TABLE

### In-Memory Dataset Mutations Requiring Backend Persistence
In addition to `localStorage`, several prototype endpoints currently mutate in-memory JavaScript module datasets. These must also transition to database tables:
1. `paperGenerator.generatedPapers` (`@/datasets/faculty/paper-generator.js`) → PostgreSQL `question_papers` + `paper_questions`.
2. `facultyReports` (`@/datasets/faculty/workspace.js`) → PostgreSQL `faculty_reports`.
3. `aiStudioHistory` & `savedLessonPlans` (`@/intelligence/faculty/datasets/ai-studio.js`) → PostgreSQL `ai_studio_artifacts`.
4. `aiTeachingAssistantThreads` (`@/datasets/ai/assistants.js`) → PostgreSQL `chat_threads`.
5. `supportTickets` (`@/datasets/student/portal.js`) → PostgreSQL `support_tickets`.

---

## 4. MIGRATION ARCHITECTURE & DATA FLOW

```
CURRENT PROTOTYPE DATA FLOW:
  UI Component
    ↓ (TanStack Query hook)
  src/services/*
    ↓ (request())
  src/api/client.js (USE_MOCK_API === true)
    ↓ (dispatchRequest)
  src/api/core/router.js
    ↓ (localStorage.getItem / setItem)
  Browser localStorage / Memory Module

FUTURE PRODUCTION DATA FLOW (ZERO UI / SERVICE CHANGES):
  UI Component
    ↓ (Identical TanStack Query hook)
  src/services/*
    ↓ (request())
  src/api/client.js (USE_MOCK_API === false)
    ↓ (Axios HTTP instance with Bearer Auth)
  FastAPI Gateway (/api/...)
    ↓ (Pydantic validation & Dependency Injection)
  SQLAlchemy Service Layer
    ↓ (Asyncpg driver)
  PostgreSQL Relational Database
```

---

## 5. DETAILED KEY-BY-KEY MIGRATION PROCEDURES

### 5.1 `EduX_registered_students` → PostgreSQL `users` & `students`
- **Current Data Shape:** Array of user draft objects containing `id`, `fullName`, `email`, `phone`, `password`, `category`, `verified`, `university`, `competitive`.
- **Target PostgreSQL Schema:**
  - `users`: `id`, `email`, `password_hash` (bcrypt), `role='student'`, `first_name`, `last_name`, `phone`, `is_verified`, `created_at`.
  - `students`: `id` (FK `users.id`), `institution_id`, `department_id`, `program_id`, `semester`, `roll_number`, `category`, `competitive_target_exam`, `competitive_target_year`.
- **Transformation Rules:**
  1. Hash plaintext passwords (`Edux12345` or student-entered passwords) with bcrypt.
  2. Split `fullName` into `first_name` and `last_name`.
  3. Resolve string branch/degree names to foreign keys in `departments` and `programs`.
  4. Filter out duplicate demo emails before seeding production.

### 5.2 `EduX_student_exam_attempts` → PostgreSQL `exam_attempts` & `question_attempts`
- **Current Data Shape:** Array of canonical `ExamAttempt` JSON objects containing `scoring`, `timing`, `questionAttempts` array, `interactions`.
- **Target PostgreSQL Schema:**
  - `exam_attempts`: `id` (UUID), `student_id`, `exam_id`, `exam_title`, `exam_mode`, `exam_family`, `exam_type`, `started_at`, `submitted_at`, `score`, `max_score`, `accuracy`, `elapsed_seconds`, `summary` (JSONB), `interactions` (JSONB).
  - `question_attempts`: `id` (UUID), `attempt_id` (FK `exam_attempts.id`), `question_id`, `subject`, `chapter`, `topic`, `selected_answer`, `is_correct`, `is_skipped`, `marks_earned`, `time_spent`.
- **Transformation Rules:**
  1. Normalize client IDs (`ea-attempt-1724425200000`) to UUIDs.
  2. Extract `questionAttempts` array and insert as child rows in `question_attempts`.
  3. Filter out seed records (`mock: true`) so test seeds do not pollute production student analytics.

### 5.3 `EduX_faculty_interventions` → PostgreSQL `interventions`
- **Current Data Shape:** Key-value dictionary: `groupId` → intervention override object (`title`, `status`, `priority`, `practiceConfig`, `notes`, `studentIds`, `s360Group`).
- **Target PostgreSQL Schema:**
  - `interventions`: `id` (PK), `group_id`, `title`, `domain`, `exam_family`, `subject`, `chapter`, `issue_type`, `priority`, `status`, `created_by` (FK faculty), `objectives` (JSONB), `practice_config` (JSONB), `notes`, `baseline` (JSONB), `created_at`, `updated_at`.
  - `intervention_students`: Composite table linking `intervention_id` and `student_id`.
- **Transformation Rules:**
  1. Iterate object entries (`Object.entries(overrides)`).
  2. Insert master intervention record.
  3. Populate `intervention_students` junction table for each student ID in `studentIds`.

### 5.4 `EduX_intervention_practice_attempts` → PostgreSQL `intervention_attempts`
- **Current Data Shape:** Array of student practice submission objects (`interventionId`, `studentId`, `kind`, `score`, `accuracy`, `questionAttempts`).
- **Target PostgreSQL Schema:**
  - `intervention_attempts`: `id` (UUID), `intervention_id` (FK `interventions.id`), `student_id` (FK `students.id`), `kind` (`'practice'` or `'retest'`), `score`, `max_score`, `accuracy`, `attempt_rate`, `avg_time`, `submitted_at`, `question_attempts` (JSONB).

### 5.5 `EduX_intervention_retests` → PostgreSQL `intervention_retests`
- **Current Data Shape:** Array of scheduled diagnostic re-test objects (`id`, `interventionId`, `title`, `questionCount`, `timeLimit`, `studentIds`).
- **Target PostgreSQL Schema:**
  - `intervention_retests`: `id` (PK), `intervention_id` (FK `interventions.id`), `title`, `domain`, `exam_family`, `subject`, `chapter`, `difficulty`, `question_count`, `time_limit`, `status`, `created_at`.
  - `retest_students`: Junction table linking `retest_id` and `student_id`.

### 5.6 `EduX_faculty_paper_shares` → PostgreSQL `paper_shares`
- **Current Data Shape:** Array of share objects (`id`, `paperId`, `audience`, `recipients`, `message`, `sharedAt`, `status`).
- **Target PostgreSQL Schema:**
  - `paper_shares`: `id` (PK), `paper_id` (FK `question_papers.id`), `faculty_id` (FK `faculty.id`), `audience_type`, `target_batch_id`, `message`, `shared_at`, `status`.

### 5.7 `EduX_question_studio_sessions` → PostgreSQL `question_studio_sessions` & `questions`
- **Current Data Shape:** Array of generation session objects (`studioSessionId`, `sourceId`, `sourceTitle`, `settings`, `questions` array).
- **Target PostgreSQL Schema:**
  - `question_studio_sessions`: `id` (PK), `source_id` (FK `question_sources.id`), `faculty_id`, `settings` (JSONB), `status`, `created_at`.
  - `question_studio_questions`: Individual questions with review status (`'Draft'`, `'Reviewed'`, `'Approved'`, `'Rejected'`). Approved questions insert directly into `questions` table.

---

## 6. SEED / DEMO DATA ISOLATION STRATEGY

The prototype repository contains rich deterministic seed history to support instant evaluation:
- `examAttemptSeeds` (`@/datasets/exams/attempt-seeds.js`): Sample longitudinal attempts for student `u_stu_001`.
- `DEMO_USERS` (`@/datasets/platform/users.js`): Demo sign-in accounts (`student@meridian.edu`, `faculty@meridian.edu`, `admin@meridian.edu`).
- `REGISTRATION_OPTIONS`, `ADMIN_USERS`, `DEPARTMENTS`.

### Isolation Directives for Database Migration
1. **Seed Script Separation:** Create a dedicated `seed_dev_data.py` script for development environments. NEVER execute seed scripts in production.
2. **Explicit `is_demo` Column:** All user accounts and attempts generated for demonstration must carry `is_demo = TRUE`.
3. **Analytical Filter Invariant:** Production analytical queries (Student 360, Academic DNA, Similar Issues, Batch Health) MUST filter `WHERE is_demo = FALSE`.

---

## 7. MIGRATION RISKS & MITIGATION MATRIX

| Migration Risk | Failure Mode | Severity | Technical Mitigation Strategy |
|---|---|---|---|
| **Duplicate Primary Keys** | Client timestamp collisions (`ea-attempt-${Date.now()}`) | High | Generate server-side UUIDv4 on backend ingest; maintain legacy ID mapping table. |
| **LocalStorage Schema Drift** | Differing field shapes across browser versions | High | Implement lenient Pydantic schema ingest filters with backward-compatible aliases. |
| **Domain Leakage (JEE/NEET)** | Merging JEE Physics and NEET Physics attempts | **Critical** | Enforce database CHECK constraint `CHECK (domain = 'competitive' AND exam_family IN ('JEE', 'NEET') OR domain = 'university' AND exam_family IS NULL)`. |
| **Orphaned Intervention Records** | Interventions referencing deleted student IDs | Medium | Enforce foreign key constraints with `ON DELETE RESTRICT` or `ON DELETE CASCADE`. |
| **Contaminated Official Transcripts** | Practice attempts inflating official GPA | **Critical** | Strict database separation: `exam_attempts` (official) vs `intervention_attempts` (remedial practice). |

---

## 8. DATA RETENTION & PRIVACY BOUNDARIES

### Data Retention Policy
- **Current Status:** `RETENTION POLICY NOT CURRENTLY DEFINED`.
- **Recommended Backend Policy:** Maintain active student assessment attempts for duration of degree enrollment $+ 3$ years; archive raw question telemetry after 1 academic year to cold storage.

### Privacy Boundaries
- Student 360 diagnostic records, Academic DNA strengths/weaknesses, and intervention logs represent sensitive educational data.
- **Backend Authorization Invariant:** Students may only query their own records (`WHERE student_id = current_user.id`). Faculty may only query students enrolled in their assigned department or courses.

---

## 9. ROLLBACK & DISASTER RECOVERY

1. **Dual-Read Feature Flag:** During initial rollout, `APP_CONFIG.USE_MOCK_API` allows instant fallback to in-browser prototype mode if backend connection fails.
2. **Pre-Migration Export:** Provide client-side export utility in Data Tools (`GET /admin/data-tools`) to download full localStorage JSON dump prior to account transition.