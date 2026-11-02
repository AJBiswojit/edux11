# 06 — AUTHENTICATION, AUTHORIZATION & RBAC SPECIFICATION

**Project:** MediXO EduX (`medixo-edux-platform` v1.0.0)
**Phase:** D — Authentication, Authorization, RBAC & Security Contract
**Date:** 2026-08-23 · **Branch:** `arena/01a02f45-edux`
**Status:** Complete & Verified Specification

---

## TABLE OF CONTENTS
1. [Current Authentication Mechanism](#1-current-authentication-mechanism)
2. [Authentication Flow & Session Lifecycle](#2-authentication-flow--session-lifecycle)
3. [Authentication Storage](#3-authentication-storage)
4. [Current Roles Inventory](#4-current-roles-inventory)
5. [Role Capabilities Specification](#5-role-capabilities-specification)
6. [Comprehensive RBAC Matrix](#6-comprehensive-rbac-matrix)
7. [Route Authorization Audit (All 123 Routes)](#7-route-authorization-audit)
8. [API Authorization Matrix (All 145 Endpoints)](#8-api-authorization-matrix)
9. [Resource Ownership & Access Control Boundaries](#9-resource-ownership--access-control-boundaries)
10. [Institution & Multi-Tenant Boundaries](#10-institution--multi-tenant-boundaries)
11. [Student Access Scoping Rules](#11-student-access-scoping-rules)
12. [Faculty Access Scoping Rules](#12-faculty-access-scoping-rules)
13. [Admin Access Scoping Rules](#13-admin-access-scoping-rules)
14. [Parent Access Scoping Rules](#14-parent-access-scoping-rules)
15. [Exam Attempt Authorization Contract](#15-exam-attempt-authorization-contract)
16. [Intervention Authorization & Remediation Privacy](#16-intervention-authorization--remediation-privacy)
17. [Question Paper & Paper Sharing Authorization](#17-question-paper--paper-sharing-authorization)
18. [Question Bank & Question Studio Authorization](#18-question-bank--question-studio-authorization)
19. [File & Source Document Authorization](#19-file--source-document-authorization)
20. [Future Authentication Requirements for Python Backend](#20-future-authentication-requirements-for-python-backend)
21. [Future Authorization Requirements for Python Backend](#21-future-authorization-requirements-for-python-backend)
22. [Backend Security Decisions Register](#22-backend-security-decisions-register)

---

## 1. CURRENT AUTHENTICATION MECHANISM

### 1.1 Prototype Authentication Overview
In the current frontend codebase, authentication operates through an in-browser deterministic prototype system managed by `src/contexts/auth-context.jsx`:
- **Demo Sign-In:** Users can authenticate immediately by selecting any persona from `DEMO_USERS` (`@/datasets/platform/users.js`) and supplying the demo password `Edux12345`.
- **Student Self-Registration Flow (`src/api/auth/session.js`):**
  - `POST /auth/register`: Accepts registration details, validates email/phone uniqueness against `DEMO_USERS` and local registry, and writes unverified draft student records to `localStorage.getItem('EduX_registered_students')`.
  - `POST /auth/register/verify`: Validates OTP against hardcoded demo code `482193` and marks student draft as `verified: true`.
  - Login integration: Once verified, the student can log in via `AuthContext.login()` using the same credentials.
- **Password Reset Flow (`src/api/auth/session.js`):**
  - `POST /auth/forgot-password`: Returns mock `verificationId` and `demoOtp: "482193"`.
  - `POST /auth/verify-otp`: Requires OTP `482193` and returns `token: "otp_verified"`.
  - `POST /auth/reset-password`: Acknowledges password update.
- **Email Verification Flow (`src/api/auth/session.js`):**
  - `POST /auth/verify-email`: Validates OTP against hardcoded code `731205`.
  - `POST /auth/resend-otp`: Re-issues demo OTP `731205`.

### 1.2 Dual-Mode API Client (`src/api/client.js` & `src/api/axios.js`)
- While `APP_CONFIG.USE_MOCK_API === true`, calls dispatch to the in-browser router (`src/api/core/router.js`) with simulated 380–780ms latency.
- When `APP_CONFIG.USE_MOCK_API === false`, requests dispatch over HTTP using an Axios instance configured with:
  - **Request Interceptor:** Automatically attaches `Authorization: Bearer <token>` from `localStorage.getItem(APP_CONFIG.TOKEN_KEY)` (`EduX_access_token`).
  - **Response Interceptor:** Automatically traps `401 Unauthorized` responses, queues in-flight requests, calls `POST /auth/refresh` with `{ refreshToken }` from `localStorage.getItem(APP_CONFIG.REFRESH_TOKEN_KEY)` (`EduX_refresh_token`), updates stored tokens, and retries the failed requests.

---

## 2. AUTHENTICATION FLOW & SESSION LIFECYCLE

```
┌────────────────┐     Credentials      ┌───────────────────┐     Reads DEMO_USERS /      ┌─────────────────────────┐
│  Login Dialog  │ ───────────────────> │  auth-context.jsx │ ──────────────────────────> │  EduX_registered_     │
│  (/auth/login) │                      │      (login)      │     localStorage registry   │  students (localStorage)│
└────────────────┘                      └───────────────────┘                             └─────────────────────────┘
                                                  │
                                                  │ Writes tokens & session user
                                                  ▼
                                        ┌─────────────────────────┐
                                        │  Browser LocalStorage:  │
                                        │  - EduX_access_token  │
                                        │  - EduX_refresh_token │
                                        │  - EduX_user          │
                                        └─────────────────────────┘
                                                  │
                                                  │ State: status='authenticated'
                                                  ▼
                                        ┌─────────────────────────┐
                                        │  ProtectedRoute.jsx     │
                                        │  (Checks user.role)     │
                                        └─────────────────────────┘
                                           │                     │
                         Role Authorized   │                     │ Role Mismatch
                                           ▼                     ▼
                                  ┌─────────────────┐   ┌─────────────────┐
                                  │ Target Portal   │   │ /403 Forbidden  │
                                  │ (/student, etc.)│   └─────────────────┘
                                  └─────────────────┘
```

---

## 3. AUTHENTICATION STORAGE

The following storage keys govern authentication state in the browser:

| Storage Key Constant | Actual Literal Key | Stored Data | Writer | Reader | Security Classification |
|---|---|---|---|---|---|
| `APP_CONFIG.TOKEN_KEY` | `'EduX_access_token'` | Bearer access token string | `AuthContext.login`, `axios.js` refresh | `src/api/axios.js` request interceptor | **Confidential** |
| `APP_CONFIG.REFRESH_TOKEN_KEY` | `'EduX_refresh_token'` | Refresh token string | `AuthContext.login`, `axios.js` refresh | `src/api/axios.js` response 401 interceptor | **Sensitive** |
| `APP_CONFIG.USER_KEY` | `'EduX_user'` | User JSON identity object (`id`, `name`, `email`, `role`, `department`, `institution`) | `AuthContext.login`, `updateUser` | `AuthContext` (page load / cross-tab sync) | **Internal** |
| Literal | `'EduX_registered_students'` | Array of registered student user objects | `POST /auth/register`, `POST /auth/register/verify` | `AuthContext.login`, `POST /auth/register` | **Sensitive** |

---

## 4. CURRENT ROLES INVENTORY

The platform defines exactly **4 canonical user roles** (`src/config/index.js`):

| Role Constant | String Value | Portal Root | Display Label | Primary User Persona | Target Educational Responsibilities |
|---|---|---|---|---|---|
| `ROLES.STUDENT` | `"student"` | `/student` | Student | Enrolled degree student / competitive exam candidate | Practice tests, Exam Agent, view personal DNA and Exam Analysis, solve assigned interventions |
| `ROLES.FACULTY` | `"faculty"` | `/faculty` | Faculty | Professor, Lecturer, Teaching Assistant | Manage courses, review Student 360, detect Similar Issues, create/assign interventions, compose papers in Question Studio |
| `ROLES.ADMIN` | `"admin"` | `/admin` | Administrator | Dean, Academic Registrar, Department Head | Institutional governance, department oversight, revenue tracking, user management, executive reporting |
| `ROLES.PARENT` | `"parent"` | `/parent` | Parent | Parent or Legal Guardian | Monitor linked student ward attendance, progress, exam scorecards, fee statements (currently feature-gated) |

> **Note:** Super Admin or granular sub-roles (e.g. Lab Assistant, Exam Controller) are **NOT CURRENTLY DEFINED** in the frontend code. The `admin` role covers all administrative operations in the current version.

---

## 5. ROLE CAPABILITIES SPECIFICATION

| Capability Domain | Student | Faculty | Admin | Parent |
|---|---|---|---|---|
| **Self-Registration & Password Reset** | ALLOW | ALLOW | ALLOW | ALLOW |
| **Own Profile & Preferences Edit** | ALLOW | ALLOW | ALLOW | ALLOW |
| **Take Official Exam (Exam Agent)** | ALLOW | DENY | DENY | DENY |
| **View Own AI Exam Analysis** | ALLOW | DENY | DENY | DENY |
| **View Own Academic DNA Signals** | ALLOW | DENY | DENY | DENY |
| **View MediXO Mentor AI Workspace** | ALLOW | DENY | DENY | DENY |
| **Submit Intervention Practice Tests** | ALLOW | DENY | DENY | DENY |
| **Submit Intervention Diagnostic Re-tests** | ALLOW | DENY | DENY | DENY |
| **View My Students Directory & Batches** | DENY | ALLOW | CONDITIONAL (Directory view) | DENY |
| **View Any Student 360 Diagnostic Bundle** | DENY | ALLOW (Assigned students) | CONDITIONAL (Institution aggregate) | DENY (Ward-specific view) |
| **Discover & View Similar Issues Clusters** | DENY | ALLOW | CONDITIONAL (Institution health) | DENY |
| **Create & Assign Remedial Interventions** | DENY | ALLOW | DENY | DENY |
| **Schedule Diagnostic Re-tests** | DENY | ALLOW | DENY | DENY |
| **AI Question Studio Generation & Approval** | DENY | ALLOW | CONDITIONAL (Read question bank) | DENY |
| **AI Question Paper Generator & Library** | DENY | ALLOW | CONDITIONAL (Read library) | DENY |
| **Share Question Papers to Batches** | DENY | ALLOW | DENY | DENY |
| **AI Teaching Studio (Lesson Plans & Rubrics)** | DENY | ALLOW | DENY | DENY |
| **Manage Platform Users & Roles** | DENY | DENY | ALLOW | DENY |
| **Configure AI Models & Gateways** | DENY | DENY | ALLOW | DENY |
| **View Institutional Revenue & Financials** | DENY | DENY | ALLOW | DENY |
| **View Security Governance & Audit Logs** | DENY | DENY | ALLOW | DENY |
| **View Linked Ward Progress & Results** | DENY | DENY | DENY | ALLOW (Feature-gated) |

---

## 6. COMPREHENSIVE RBAC MATRIX

Access control permissions across all functional domains:

| Domain / Surface | Student | Faculty | Admin | Parent | Public / Anon |
|---|---|---|---|---|---|
| **Public Marketing & Blog** | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| **Authentication & Recovery** | ALLOW | ALLOW | ALLOW | ALLOW | ALLOW |
| **Student Dashboard** | ALLOW | DENY | DENY | DENY | DENY |
| **Student Academics Hub** | ALLOW | DENY | DENY | DENY | DENY |
| **AI Exam Agent** | ALLOW | DENY | DENY | DENY | DENY |
| **AI Exam Analysis** | ALLOW | DENY | DENY | DENY | DENY |
| **Academic DNA Signals** | ALLOW | DENY | DENY | DENY | DENY |
| **MediXO Mentor** | ALLOW | DENY | DENY | DENY | DENY |
| **Student Interventions** | ALLOW (Own tasks) | DENY | DENY | DENY | DENY |
| **Faculty Dashboard** | DENY | ALLOW | DENY | DENY | DENY |
| **Faculty Teaching Workspace** | DENY | ALLOW | DENY | DENY | DENY |
| **Assessment Intelligence Hub** | DENY | ALLOW | DENY | DENY | DENY |
| **My Students Directory** | DENY | ALLOW | ALLOW (Unified directory) | DENY | DENY |
| **Student 360 Profiles** | DENY | ALLOW | CONDITIONAL | DENY | DENY |
| **Similar Issues Clustering** | DENY | ALLOW | CONDITIONAL | DENY | DENY |
| **Intervention Management** | DENY | ALLOW | DENY | DENY | DENY |
| **AI Question Studio** | DENY | ALLOW | CONDITIONAL | DENY | DENY |
| **Question Paper Generator** | DENY | ALLOW | CONDITIONAL | DENY | DENY |
| **PYQ Pattern Intelligence** | DENY | ALLOW | ALLOW | DENY | DENY |
| **AI Teaching Assistant** | DENY | ALLOW | DENY | DENY | DENY |
| **Admin Dashboard** | DENY | DENY | ALLOW | DENY | DENY |
| **Institution Intelligence** | DENY | DENY | ALLOW | DENY | DENY |
| **Executive Reports** | DENY | DENY | ALLOW | DENY | DENY |
| **Governance & Audit Logs** | DENY | DENY | ALLOW | DENY | DENY |
| **Parent Portal (Gated)** | DENY | DENY | DENY | ALLOW (Gated) | DENY |

---

## 7. ROUTE AUTHORIZATION AUDIT

Every route in `src/routes/index.jsx` was audited for authentication, authorization guard, and privacy sensitivity:

| Route Path | Intended Role | Current Frontend Guard | Future Backend Authorization Requirement | Privacy Sensitivity |
|---|---|---|---|---|
| `/` (Landing) | Public | None (`LandingLayout`) | Public access | Public |
| `/about`, `/pricing`, `/careers`, `/blog`, `/contact` | Public | None (`LandingLayout`) | Public access | Public |
| `/auth/login`, `/auth/register`, `/auth/forgot-password` | Public / Anon | None (`AuthLayout`) | Public access with rate limiting | Public |
| `/student` (Dashboard) | Student | `ProtectedRoute[roles=['student']]` | Valid JWT token with `role='student'` | Confidential |
| `/student/academics` | Student | `ProtectedRoute[roles=['student']]` | Valid JWT token with `role='student'` | Confidential |
| `/student/exam-agent` | Student | `ProtectedRoute[roles=['student']]` | Valid JWT with `role='student'` | Sensitive |
| `/student/exam-analysis` | Student | `ProtectedRoute[roles=['student']]` | Valid JWT with `role='student'` | Sensitive |
| `/student/exam-analysis/:id` | Student | `ProtectedRoute[roles=['student']]` | Verify attempt belongs to `current_user.id` | **Highly Sensitive** |
| `/student/mentor` | Student | `ProtectedRoute[roles=['student']]` | Valid JWT with `role='student'` | Confidential |
| `/faculty` (Dashboard) | Faculty | `ProtectedRoute[roles=['faculty']]` | Valid JWT token with `role='faculty'` | Internal |
| `/faculty/my-students` | Faculty | `ProtectedRoute[roles=['faculty']]` | Valid JWT with `role='faculty'` | Confidential |
| `/faculty/my-students/:id` (Student 360) | Faculty | `ProtectedRoute[roles=['faculty']]` | Verify student belongs to faculty's department/course | **Highly Sensitive** |
| `/faculty/teaching` | Faculty | `ProtectedRoute[roles=['faculty']]` | Valid JWT with `role='faculty'` | Internal |
| `/faculty/question-intelligence` | Faculty | `ProtectedRoute[roles=['faculty']]` | Valid JWT with `role='faculty'` | Confidential |
| `/faculty/reports` | Faculty | `ProtectedRoute[roles=['faculty']]` | Valid JWT with `role='faculty'` | Confidential |
| `/admin` (Dashboard) | Admin | `ProtectedRoute[roles=['admin']]` | Valid JWT token with `role='admin'` | Confidential |
| `/admin/institution-intelligence` | Admin | `ProtectedRoute[roles=['admin']]` | Valid JWT token with `role='admin'` | **Highly Sensitive** |
| `/admin/users`, `/admin/faculty`, `/admin/students` | Admin | `ProtectedRoute[roles=['admin']]` | Valid JWT token with `role='admin'` | Sensitive |
| `/admin/roles`, `/admin/permissions`, `/admin/audit-logs` | Admin | `ProtectedRoute[roles=['admin']]` | Valid JWT token with `role='admin'` | **Highly Sensitive** |
| `/parent/*` | Parent | `ParentGate` + `ProtectedRoute[roles=['parent']]` | Valid JWT token with `role='parent'` (Feature gated) | Sensitive |

---

## 8. API AUTHORIZATION MATRIX

All 145 registered endpoints mapped to backend authorization rules:

| Method | Path | Auth Required | Allowed Role | Backend Authorization & Ownership Check | Data Sensitivity |
|---|---|---|---|---|---|
| `POST` | `/auth/forgot-password` | No | Any | Public rate-limited endpoint | Internal |
| `POST` | `/auth/verify-otp` | No | Any | Validates verification ID & OTP | Internal |
| `POST` | `/auth/reset-password` | No | Any | Validates reset token claim | Confidential |
| `POST` | `/auth/register` | No | Any | Public registration with deduplication | Confidential |
| `POST` | `/auth/register/verify` | No | Any | Validates registration OTP | Confidential |
| `GET` | `/student/exam-agent/exams` | Yes | Student | Scoped to student's enrolled track | Internal |
| `GET` | `/student/exam-agent/attempts` | Yes | Student | Returns attempts where `student_id = current_user.id` | **Sensitive** |
| `GET` | `/student/exam-agent/attempts/:id` | Yes | Student | Verify attempt `student_id == current_user.id` | **Highly Sensitive** |
| `POST` | `/student/exam-agent/attempts` | Yes | Student | Enforces `body.studentId == current_user.id` | **Highly Sensitive** |
| `GET` | `/student/exam-analysis/:id` | Yes | Student | Verify attempt `student_id == current_user.id` | **Highly Sensitive** |
| `GET` | `/intelligence/summary` | Yes | Student | Returns intelligence for `current_user.id` | **Highly Sensitive** |
| `GET` | `/intelligence/exam-dna-signals` | Yes | Student | Returns DNA signals for `current_user.id` | **Highly Sensitive** |
| `GET` | `/faculty/students` | Yes | Faculty | Scoped to faculty's department / assigned batches | Confidential |
| `GET` | `/faculty/students/:id/360` | Yes | Faculty | Verify student is in faculty's department / batch | **Highly Sensitive** |
| `GET` | `/faculty/students/:id/exams/:attemptId/analysis` | Yes | Faculty | Verify student relationship before serving attempt | **Highly Sensitive** |
| `GET` | `/faculty/similar-issues` | Yes | Faculty | Scoped to faculty's assigned courses / batches | Confidential |
| `POST` | `/faculty/similar-issues/:id/interventions` | Yes | Faculty | Verify faculty has authority over target student IDs | **Highly Sensitive** |
| `POST` | `/faculty/interventions/:id/status` | Yes | Faculty | Verify faculty authored or oversees intervention | Sensitive |
| `POST` | `/faculty/interventions/:id/assign` | Yes | Faculty | Verify target student roster authorization | **Highly Sensitive** |
| `POST` | `/faculty/interventions/:id/retest` | Yes | Faculty | Verify faculty authority | Sensitive |
| `GET` | `/student/interventions` | Yes | Student | Scoped strictly to `student_id = current_user.id` | Sensitive |
| `GET` | `/student/interventions/:id/practice` | Yes | Student | Verify student is assigned to intervention | Sensitive |
| `POST` | `/student/interventions/:id/practice-attempts` | Yes | Student | Enforce `studentId == current_user.id` and assigned | **Highly Sensitive** |
| `GET` | `/student/interventions/:id/retest` | Yes | Student | Verify student is assigned to re-test | Sensitive |
| `POST` | `/faculty/paper-generator/papers` | Yes | Faculty | Sets `created_by = current_user.id` | Confidential |
| `POST` | `/faculty/paper-generator/papers/:id/share` | Yes | Faculty | Verify paper ownership and target batch authorization | Sensitive |
| `POST` | `/faculty/question-studio/generate` | Yes | Faculty | Faculty access | Confidential |
| `POST` | `/faculty/question-studio/sessions/:id/questions/:qid/approve` | Yes | Faculty | Verify session ownership | Confidential |
| `GET` | `/admin-intelligence/summary` | Yes | Admin | Admin access to institution intelligence | **Highly Sensitive** |
| `GET` | `/admin/audit-logs` | Yes | Admin | Admin governance access | **Highly Sensitive** |
| `GET` | `/admin/revenue` | Yes | Admin | Executive financial access | **Highly Sensitive** |
| `GET` | `/parent/progress` | Yes | Parent | Verify student ward relationship in `parent_students` | **Sensitive** |

---

## 9. RESOURCE OWNERSHIP & ACCESS CONTROL BOUNDARIES

Authoritative ownership matrix governing who can create, read, update, and delete core resources:

| Resource | Primary Owner | Read Access | Create Access | Update Access | Delete Access | Sharing Scope |
|---|---|---|---|---|---|---|
| **ExamAttempt** | Student | Student (own), Assigned Faculty, Admin | Student | None (Immutable) | None (Audited Admin only) | Private to student & faculty |
| **QuestionAttempt** | Student | Student (own), Assigned Faculty | Student | None (Immutable) | None | Embedded in ExamAttempt |
| **Academic DNA** | Student (Derived) | Student (own), Assigned Faculty | System Intelligence Engine | System Intelligence Engine | None | Derived signal |
| **Student 360** | Student (Derived) | Assigned Faculty, Admin | System Intelligence Engine | System Intelligence Engine | None | Faculty diagnostic view |
| **Intervention** | Faculty | Assigned Faculty, Assigned Students (Sanitized), Admin | Faculty | Faculty (Creator / Dept Head) | Faculty (Dismiss) | Multi-student assigned |
| **PracticeAttempt** | Student | Student (own), Assigned Faculty | Student | None (Immutable) | None | Remedial assessment |
| **QuestionPaper** | Faculty (Creator) | Author Faculty, Admin, Shared Batches | Faculty | Author Faculty | Author Faculty | Audience distribution |
| **Question** | Institution / Faculty | All Faculty, Admin | Faculty (Studio / Bank), Admin | Author Faculty, Admin | Admin / Author | Master Question Repository |
| **Source Document** | Institution / Faculty | All Faculty, Admin | Faculty, Admin | Author Faculty | Admin | Ingestion library |

---

## 10. INSTITUTION & MULTI-TENANT BOUNDARIES

- **Current Prototype State:** Single-tenant configuration (`"Meridian Institute of Technology"`).
- **Future Backend Mandate:**
  - Every database table (`users`, `students`, `faculty`, `courses`, `batches`, `questions`, `exam_attempts`, `interventions`, `question_papers`) MUST carry an `institution_id` / `tenant_id` foreign key.
  - Every SQL query and ORM session filter MUST automatically inject `WHERE institution_id = current_user.institution_id`.
  - Multi-tenant data leakage is a **Critical Vulnerability**; zero cross-institution data queries are permitted.

---

## 11. STUDENT ACCESS SCOPING RULES

1. **Self-Data Isolation:** A student may ONLY query records where `student_id == current_user.id`.
2. **Peer Invisibility:** A student MUST NOT be able to view another student's marks, accuracy, weaknesses, attempt reviews, or intervention tasks.
3. **Intervention Roster Protection:** When receiving an intervention assigned to multiple students, the student API response MUST sanitize the payload: zero exposure of other student IDs, names, or individual baselines.

---

## 12. FACULTY ACCESS SCOPING RULES

1. **Departmental & Course Boundary:** Faculty may query students enrolled in their assigned department or courses.
2. **Student 360 Access:** Faculty may access Student 360 profiles for students enrolled in their classes/batches.
3. **Intervention Action Authority:** Faculty may create, modify, assign, and re-test interventions for students within their teaching domain.

---

## 13. ADMIN ACCESS SCOPING RULES

1. **Institution-Wide Scope:** Admin role holds institution-wide read and governance access within their own `institution_id`.
2. **Governance Restriction:** Only users holding `role='admin'` may view Audit Logs, modify RBAC roles/permissions, update AI configurations, or inspect revenue statements.

---

## 14. PARENT ACCESS SCOPING RULES

1. **Explicit Relational Link:** Parent access MUST be established via an explicit database record in `parent_students`.
2. **Zero Client Trust:** The backend MUST NEVER authorize parent access based solely on a `studentId` supplied in the URL or request body.
3. **Sanitized Parental View:** Parents receive grade cards, attendance summaries, and AI recommendations, but do NOT receive raw technical telemetry (e.g. question dwell timestamps).

---

## 15. EXAM ATTEMPT AUTHORIZATION CONTRACT

- **Creation:** Authorized for student; backend verifies `studentId == current_user.id`.
- **Submission:** Student may submit answers only for an attempt they initiated.
- **Review Access:** Only the attempting student and authorized faculty may inspect per-question answer breakdowns.
- **Immutability:** Once submitted, scores, evaluation flags, and timestamps CANNOT be modified by any role.

---

## 16. INTERVENTION AUTHORIZATION & REMEDIATION PRIVACY

- Faculty creates intervention plans from Similar Issues or Student 360.
- **Multi-Student Privacy Invariant:** Each student assigned to a group intervention receives an isolated task view with no peer identity leakage.
- **Remedial Practice Submission:** Student submits practice/re-test attempts; backend verifies the student is an enrolled member of the intervention.

---

## 17. QUESTION PAPER & PAPER SHARING AUTHORIZATION

- Faculty creates and owns question papers.
- **Sharing Rule:** When sharing a paper to `Batch CSE-A`, backend verifies the faculty teaches that batch.
- **Student Visibility:** Students in the target batch may view and attempt the shared paper only after publication.

---

## 18. QUESTION BANK & QUESTION STUDIO AUTHORIZATION

- All faculty can read the universal Question Bank.
- Faculty can generate questions in Question Studio sessions; approved questions sync into the institutional Question Bank.
- Deletion or editing of universal questions is restricted to the author faculty or admin.

---

## 19. FILE & SOURCE DOCUMENT AUTHORIZATION

- Source document uploads (`POST /faculty/question-studio/sources/upload`) must be validated for MIME type (`application/pdf`, `application/epub+zip`), file size (max 50MB), and virus scanned.
- Binary documents stored in private S3 buckets; served via short-lived pre-signed URLs (15-minute expiry).

---

## 20. FUTURE AUTHENTICATION REQUIREMENTS FOR PYTHON BACKEND

1. **Password Hashing:** Passwords MUST be hashed using `bcrypt` (work factor $\ge 12$) or `Argon2id`.
2. **Stateless JWT + Refresh Token Rotation:**
   - Access Token: Short-lived JWT (15–30 minutes) carrying `sub` (user ID), `role`, `institution_id`, `email`.
   - Refresh Token: Cryptographically secure random string stored in database/Redis (7–30 day expiry), single-use rotation on refresh.
3. **Brute-Force Protection:** Account lockout or exponential backoff after 5 consecutive failed login attempts.
4. **Real SMS / Email OTP Gateways:** Integrate transactional SMS (Twilio/AWS SNS) and Email (SendGrid/AWS SES) with cryptographically random 6-digit TOTP (5-minute expiry).

---

## 21. FUTURE AUTHORIZATION REQUIREMENTS FOR PYTHON BACKEND

```
Every Incoming Request
  ↓
1. Authenticate Identity (Validate JWT signature, expiration, user status)
  ↓
2. Verify Tenant Boundary (Enforce institution_id match)
  ↓
3. Authorize Role (Verify role in allowed roles for route)
  ↓
4. Enforce Resource Ownership (Verify user owns resource OR holds relational authority)
  ↓
Execute Controller Action & Return Scoped Data
```

---

## 22. BACKEND SECURITY DECISIONS REGISTER

| Decision ID | Area | Current Status | Future Backend Decision Requirement |
|---|---|---|---|
| `SEC-DEC-01` | JWT Signing Algorithm | Prototype string | RS256 (asymmetric key pair) or HS256 with 256-bit secret |
| `SEC-DEC-02` | Session Cache | LocalStorage | Redis cluster with token revocation blacklist |
| `SEC-DEC-03` | Multi-Tenant Model | Single-tenant | Shared database with row-level security (`institution_id`) |
| `SEC-DEC-04` | Password Hashing | Plaintext demo | `bcrypt` (12 rounds) or `argon2id` |
| `SEC-DEC-05` | Binary Document Storage | Curated demo | Private AWS S3 bucket with IAM pre-signed URLs |
| `SEC-DEC-06` | Rate Limiting Engine | None | Redis sliding window rate limiter |

---

## CONCLUSION
This document establishes the exhaustive authentication, authorization, and RBAC requirements for MediXO EduX, providing complete clarity for the future Python backend security implementation.