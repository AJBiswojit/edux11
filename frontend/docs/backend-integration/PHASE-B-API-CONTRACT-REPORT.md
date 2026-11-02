# PHASE B — API CONTRACT DOCUMENTATION REPORT

**Project:** MediXO EduX (`medixo-edux-platform` v1.0.0)
**Phase:** B — API Contract & OpenAPI Specification
**Nature:** Documentation-only phase. Zero application source code was modified, zero backend code implemented, zero database created.
**Date:** 2026-08-23 · **Branch:** `arena/01a02f45-edux`

---

## Baseline Endpoint Count
- **Initial Estimated Endpoint Count (from Phase A / audit):** ~145-169 endpoints
- **Source Files Audited in `src/api/`:** 22 route files across 9 domain folders + 9 support files

## Final Endpoint Count
- **Total Registered Endpoints in Current Codebase:** **145 endpoints**
- **By HTTP Method:**
  - `GET`: **105 endpoints** (72.4%)
  - `POST`: **34 endpoints** (23.4%)
  - `PATCH`: **4 endpoints** (2.8%)
  - `DELETE`: **2 endpoints** (1.4%)
- **Total Documented Endpoints in 02-API-CONTRACT.md:** **145 endpoints**
- **Total Operations in openapi.yaml:** **145 operations**
- **Discrepancy:** **0** (100% exact parity)

## API Domains
The 145 registered endpoints are grouped across **22 distinct functional domains**:

| # | Domain | Endpoint Count | Methods |
|---|---|---|---|
| 1 | **AI Workspace** | 8 | `GET, POST` |
| 2 | **Academic DNA** | 4 | `GET` |
| 3 | **Admin** | 21 | `GET` |
| 4 | **Authentication** | 8 | `GET, POST` |
| 5 | **Exam Agent** | 4 | `GET, POST` |
| 6 | **Exam Analysis** | 2 | `GET` |
| 7 | **Faculty AI Studio** | 1 | `POST` |
| 8 | **Faculty Academic Intelligence** | 1 | `GET` |
| 9 | **Faculty Students** | 1 | `GET` |
| 10 | **Faculty Workspace** | 11 | `GET` |
| 11 | **Institution Intelligence** | 1 | `GET` |
| 12 | **Interventions** | 9 | `GET, POST` |
| 13 | **PYQ Intelligence** | 4 | `GET` |
| 14 | **Paper Generator** | 7 | `DELETE, GET, PATCH, POST` |
| 15 | **Parent** | 17 | `GET, PATCH` |
| 16 | **Platform** | 7 | `GET, POST` |
| 17 | **Practice** | 3 | `GET, POST` |
| 18 | **Question Bank** | 1 | `GET` |
| 19 | **Question Intelligence** | 2 | `GET` |
| 20 | **Question Studio** | 12 | `GET, POST` |
| 21 | **Re-tests** | 2 | `GET, POST` |
| 22 | **Reports** | 4 | `DELETE, GET, PATCH, POST` |
| 23 | **Similar Issues** | 2 | `GET` |
| 24 | **Student 360** | 3 | `GET, POST` |
| 25 | **Student Academics** | 9 | `GET, PATCH, POST` |
| 26 | **Student Mentor** | 1 | `GET` |

## Endpoint Inventory
All 145 endpoints are comprehensively cataloged in `02-API-CONTRACT.md` with:
- HTTP Method & Path
- Functional Domain & Explicit Purpose
- Authentication & Role Expectations
- Exact Path & Query Parameters with types, defaults, and examples
- Complete Request Bodies (types, required fields, validation, nullability)
- Complete Response Bodies (JSON schemas, nested objects, metadata)
- Success (200/201) & Error (400, 403, 404, 409) Status Codes and payloads
- Service Hooks, Page Consumers, and UI Components
- Prototype Persistence Mechanism (localStorage keys, in-memory datasets)
- Intelligence Dependencies & Backend Ownership Classification
- Future Python Backend Route Mapping

## Request Contracts
38 endpoints accept structured request bodies (34 POST + 4 PATCH). Key request schemas include:
- Student Registration (`POST /auth/register`): `{ fullName, email, phone, password, category, university, competitive }`
- Exam Attempt Submission (`POST /student/exam-agent/attempts`): Full canonical ExamAttempt with `questionAttempts` array, scoring, timing, telemetry.
- Question Paper Generation (`POST /faculty/paper-generator/papers`): Blueprint config, marks, questions, Blooms distribution, question list.
- Question Studio Generation (`POST /faculty/question-studio/generate`): `{ sourceId, settings: { count, difficulty, qType, bloomsLevel } }`
- Intervention Creation (`POST /faculty/similar-issues/:id/interventions` & `POST /faculty/students/:id/interventions`): `{ studentIds, priority, objective, practiceConfig, notes }`
- Practice / Retest Submission (`POST /student/interventions/:id/practice-attempts`): `{ studentId, kind, questionAttempts, score, accuracy, timing }`

## Response Contracts
Response contracts span 4 primary archetypes:
1. Composite Intelligence Snapshots (`/intelligence/summary`, `/faculty-intelligence/summary`, `/admin-intelligence/summary`, `/faculty/students/:id/360`)
2. Entity Collections (`{ items: [...], count, total }` or `{ students: [...] }`, `{ questions: [...] }`)
3. Entity Detail Objects (`{ attempt: {...} }`, `{ source: {...} }`, `{ intervention: {...} }`)
4. Action Acknowledgments (`{ ok: true, message: '...' }`)

## Authentication Observations
- Prototype manages tokens in `localStorage` (`medixo_auth_token`, `medixo_refresh_token`, `medixo_user_profile`).
- `src/api/axios.js` attaches `Bearer <token>` and implements token refresh via `POST /auth/refresh` on 401.
- Role gating is enforced on the frontend by `src/routes/ProtectedRoute.jsx`.
- Demo directory (`DEMO_USERS`) provides instant sign-in with demo password `Edux12345`.
- Student self-registration writes verified student records to `EduX_registered_students` in localStorage.
- Production authentication backend (JWT, OAuth2, RBAC database models) will be designed in Phase D.

## Error Contracts
- `400 Bad Request`: Validation failure (e.g. invalid OTP, missing chapter/subject, lack of question evidence).
- `401 Unauthorized`: Missing or invalid token.
- `403 Forbidden`: Unauthorized role or intervention student ID mismatch.
- `404 Not Found`: Resource not found in dataset or storage.
- `409 Conflict`: Duplicate email, phone, or paper title.

## Pagination / Filtering
Documented all active query parameters across 145 endpoints:
- Filter params: `domain`, `examFamily`, `examMode`, `subject`, `chapter`, `batchId`, `sectionId`, `scope`, `status`, `featured`, `search`, `q`.
- Flag params: `includeDemo`, `includeSeeds`.

## File Uploads
- Question Studio Upload (`POST /faculty/question-studio/sources/upload`): Currently simulated by filename keyword matching to demo sources. Future backend will accept `multipart/form-data` with S3 storage.

## Intelligence Endpoints
8 specialized calculation pipelines documented with Input → Engine → Derived Output → API Response → UI Consumer:
1. Student 360 Diagnostic Bundle (`GET /faculty/students/:id/360`)
2. AI Exam Analysis (`GET /student/exam-analysis/:id`)
3. Academic DNA Evidence Pools (`GET /intelligence/exam-dna-signals`)
4. Similar Issues Clustering (`GET /faculty/similar-issues`)
5. Intervention Effectiveness Engine (`GET /faculty/interventions`)
6. Question Intelligence (`GET /faculty/students/weak-topic-questions` & `/faculty/interventions/related-resources`)
7. PYQ Pattern Intelligence (`GET /faculty/pyq-analysis/patterns`)
8. Question Studio Content Intelligence (`POST /faculty/question-studio/sources/:id/analyze`)

## ExamAttempt Contract
- Dedicated canonical contract documented in Section 8 of `02-API-CONTRACT.md`.
- **Strict Domain Isolation:**
  - University: `examMode = "University"`, `examFamily = null`
  - JEE: `examMode = "Competitive"`, `examFamily = "JEE"`
  - NEET: `examMode = "Competitive"`, `examFamily = "NEET"`
- **Rule:** JEE Physics and NEET Physics MUST NEVER merge in storage, calculations, or Student 360 views.

## Question Contract
- Universal Question Schema documented in Section 9 of `02-API-CONTRACT.md` preserving all fields across Question Bank, PYQs, Competitive Questions, and Question Studio.

## Paper Contract
- Documented Question Paper Generator blueprint, question list, Blooms taxonomy, marks, negative marking, and sharing registry (`EduX_faculty_paper_shares`).

## Intervention Contract
- Full 9-state lifecycle state machine documented in Section 11 of `02-API-CONTRACT.md` (Detection → Recommended → Planned → Assigned → In Progress → Completed → Re-test Pending → Evaluating → Resolved / Improving / Persistent).

## localStorage-backed APIs
- Complete migration table of 13 localStorage and in-memory endpoints mapped to future PostgreSQL tables.

## Service → API Traceability
- All 145 endpoints mapped to their service hooks across 11 service modules.

## Page → Service → API Traceability
- Full end-to-end mapping across 108 page components and UI components.

## API Dependency Graph
- Student, Faculty, and Assessment cross-domain dependency flows mapped in Section 18.

## Backend Ownership Classification
- **A. Database-backed:** 58 endpoints (40.0%)
- **B. Computed intelligence:** 23 endpoints (15.9%)
- **C. AI/LLM-backed:** 5 endpoints (3.4%)
- **D. File/storage-backed:** 1 endpoint (0.7%)
- **E. Authentication/session:** 6 endpoints (4.1%)
- **F. Reference/catalog data:** 52 endpoints (35.9%)
- **G. Temporary prototype-only:** 0 endpoints (0.0%)

## Critical Contracts
- Identified and explained the 13 most critical backend contracts (ExamAttempt, Question, Student 360, Academic DNA, Similar Issues, Interventions, Practice, Retests, Effectiveness, Paper Generator, Paper Share, Student Directory, JEE/NEET Isolation).

## Contract Inconsistencies
- Documented current naming variations, error payload variations, and client-side prototype login behavior honestly without modification.

## Security Observations
- Documented frontend-only role checks, lack of server-side ownership checks in prototype, and hardcoded demo secrets.

## OpenAPI Validation
- `docs/backend-integration/openapi.yaml` generated in **OpenAPI 3.1.0** format.
- **Operations Count:** 145 operations (exactly matches 145 registered endpoints).
- **Zero fabricated endpoints.**

## Test Result
- `npm test` executed: **153 / 153 tests passed** (100% pass rate).

## Build Result
- `npm run build` executed: **Production build completed successfully** (dist bundles created with 0 errors).

## Application Changes
**NO APPLICATION CODE CHANGED.**
Only `docs/backend-integration/` contains new/modified files.

## Recommended Phase C
Recommend progressing to **DOCUMENTATION PHASE C: DATA MODEL + DATABASE MAPPING DOCUMENTATION**.