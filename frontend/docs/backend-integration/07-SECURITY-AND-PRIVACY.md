# 07 — SECURITY & PRIVACY SPECIFICATION

**Project:** MediXO EduX (`medixo-edux-platform` v1.0.0)
**Phase:** D — Authentication, Authorization, RBAC & Security Contract
**Date:** 2026-08-23 · **Branch:** `arena/01a02f45-edux`
**Status:** Complete & Verified Security Specification

---

## TABLE OF CONTENTS
1. [Security Scope & Threat Model](#1-security-scope--threat-model)
2. [Data Sensitivity Classification](#2-data-sensitivity-classification)
3. [Privacy Boundaries & Cross-Role Matrices](#3-privacy-boundaries--cross-role-matrices)
4. [Student Privacy & Diagnostic Isolation](#4-student-privacy--diagnostic-isolation)
5. [Faculty Privacy & Pedagogical Protection](#5-faculty-privacy--pedagogical-protection)
6. [Parent Privacy & Guardian Boundaries](#6-parent-privacy--guardian-boundaries)
7. [Exam Security & Assessment Integrity](#7-exam-security--assessment-integrity)
8. [Exam Agent Security & Real-Time Monitoring](#8-exam-agent-security--real-time-monitoring)
9. [Intervention Security & Remediation Privacy](#9-intervention-security--remediation-privacy)
10. [Question Security & Intellectual Property](#10-question-security--intellectual-property)
11. [Question Paper Security & Release Confidentiality](#11-question-paper-security--release-confidentiality)
12. [File & Source Document Security](#12-file--source-document-security)
13. [AI & LLM Security (Prompt & Source Ingestion)](#13-ai--llm-security)
14. [AI Data Isolation Invariants](#14-ai-data-isolation-invariants)
15. [University / JEE / NEET Security Isolation](#15-university--jee--neet-security-isolation)
16. [Tenant & Multi-Institution Isolation](#16-tenant--multi-institution-isolation)
17. [Insecure Direct Object Reference (IDOR) Audit](#17-insecure-direct-object-reference-idor-audit)
18. [Role Escalation Risks & Client Manipulation](#18-role-escalation-risks--client-manipulation)
19. [API Input Validation Requirements](#19-api-input-validation-requirements)
20. [Rate Limiting & Abuse Protection](#20-rate-limiting--abuse-protection)
21. [CORS, CSRF & Security Headers](#21-cors-csrf--security-headers)
22. [Secrets & Environment Configuration Audit](#22-secrets--environment-configuration-audit)
23. [Session & Token Security Lifecycle](#23-session--token-security-lifecycle)
24. [Audit Logging Requirements](#24-audit-logging-requirements)
25. [Security-Sensitive Events Inventory](#25-security-sensitive-events-inventory)
26. [Security Gap Register](#26-security-gap-register)
27. [Future Python Backend Security Architecture](#27-future-python-backend-security-architecture)
28. [Comprehensive Security Test Plan](#28-comprehensive-security-test-plan)

---

## 1. SECURITY SCOPE & THREAT MODEL

The MediXO EduX security architecture protects an advanced educational intelligence ecosystem handling sensitive student assessment data, faculty pedagogical evaluations, AI-generated questions, and institutional revenue records.

### Threat Vectors & Mitigations
1. **Unauthorized Access & IDOR:** Malicious users manipulating URL parameters (`studentId`, `attemptId`, `paperId`) to read peer grades or unreleased test papers $\rightarrow$ *Mitigation: Server-side authorization verifying identity and institutional relationship.*
2. **Domain Pollution:** Accidental cross-contamination of JEE, NEET, and University assessment scores $\rightarrow$ *Mitigation: Database CHECK constraints on `(domain, exam_family)` and isolated query partitions.*
3. **Prompt & Document Injection:** Malicious text in uploaded PDFs or student chat queries attempting to alter AI system behavior $\rightarrow$ *Mitigation: Input sanitization, strict system prompt delimiting, and model parameter tuning.*
4. **Transcript Tampering:** Client-side falsification of practice scores to inflate official academic standing $\rightarrow$ *Mitigation: Strict partition between `exam_attempts` and `intervention_attempts`.*

---

## 2. DATA SENSITIVITY CLASSIFICATION

Every data entity and intelligence output is classified into one of 5 sensitivity tiers:

| Sensitivity Tier | Description | Data Models & Attributes | Security & Storage Controls |
|---|---|---|---|
| **1. PUBLIC** | Publicly accessible marketing and informational content | Blog posts, careers, case studies, contact info, landing metrics | CDN caching, public GET endpoints |
| **2. INTERNAL** | Institutional reference and course catalog data | Departments, programs, subjects, courses, calendar events | Authenticated user access |
| **3. CONFIDENTIAL** | Proprietary educational content and faculty artifacts | Universal Question Bank, PYQs, Question Studio sources, custom paper blueprints, teaching lesson plans | Authenticated faculty/admin RBAC |
| **4. SENSITIVE** | Private user and student educational records | User emails/phones, student enrollment, intervention plans, re-tests, practice submissions, parent messages | Enforced resource ownership, TLS in-transit |
| **5. HIGHLY SENSITIVE** | Deep diagnostic evaluations, audit logs, and finances | Canonical `ExamAttempt` scorecards, per-question telemetry, `Student 360` bundles, `Academic DNA` strengths/weaknesses, `AuditLog`, `Revenue` | Row-level tenant isolation, audit logging, encrypted at rest (AES-256) |

---

## 3. PRIVACY BOUNDARIES & CROSS-ROLE MATRICES

| Data Domain | Student (Self) | Student (Peer) | Faculty (Assigned) | Faculty (Unassigned) | Admin | Parent (Linked Ward) | Public |
|---|---|---|---|---|---|---|---|
| **Profile & Demographics** | ALLOW | DENY | ALLOW | CONDITIONAL | ALLOW | ALLOW | DENY |
| **Exam Attempts & Scorecards** | ALLOW | DENY | ALLOW | DENY | ALLOW | ALLOW (Grades only) | DENY |
| **Per-Question Telemetry** | ALLOW | DENY | ALLOW | DENY | CONDITIONAL | DENY | DENY |
| **Student 360 Bundle** | DENY (Views DNA) | DENY | ALLOW | DENY | ALLOW | DENY | DENY |
| **Academic DNA Signals** | ALLOW | DENY | ALLOW | DENY | ALLOW | ALLOW (Summary) | DENY |
| **Intervention Tasks & Practice**| ALLOW (Own) | DENY | ALLOW | DENY | ALLOW | ALLOW (Status) | DENY |
| **Faculty Pedagogical Notes** | DENY | DENY | ALLOW | DENY | ALLOW | DENY | DENY |
| **Unreleased Question Papers** | DENY | DENY | ALLOW (Author) | DENY | ALLOW | DENY | DENY |
| **Institutional Revenue** | DENY | DENY | DENY | DENY | ALLOW | DENY | DENY |
| **Security Audit Logs** | DENY | DENY | DENY | DENY | ALLOW | DENY | DENY |

---

## 4. STUDENT PRIVACY & DIAGNOSTIC ISOLATION

- **Diagnostic Visibility:** Students have full visibility into their own performance, Exam Analysis, and Academic DNA signals, but have zero access to peer data.
- **Intervention Roster Sanitization:** Group interventions delivered to students MUST be sanitized. A student must only see the remedial tasks assigned to themselves; peer rosters and group statistics are omitted.

---

## 5. FACULTY PRIVACY & PEDAGOGICAL PROTECTION

- Draft question papers, unassigned intervention plans, and internal diagnostic notes created by faculty remain private until explicitly shared or assigned.
- Faculty access to Student 360 diagnostic profiles is strictly scoped to students enrolled in their assigned departments, courses, or batches.

---

## 6. PARENT PRIVACY & GUARDIAN BOUNDARIES

- Parent visibility is strictly authorized through verified relationship records in the `parent_students` database junction table.
- Parents receive grade cards, attendance summaries, and fee receipts, but do NOT receive raw per-question click/dwell telemetry.

---

## 7. EXAM SECURITY & ASSESSMENT INTEGRITY

- **Answer Key Concealment:** The examination client (`src/pages/student/ExamAgent.jsx`) MUST NOT receive correct answers or explanations until the attempt is finalized and submitted.
- **Negative Marking Enforcement:** Evaluation rubrics (JEE Main $+4/-1$, NEET UG $+4/-1$) must be computed server-side on submission.
- **Practice vs. Official Partition:** Remedial practice attempts submitted for interventions are stored in `intervention_attempts` and NEVER alter official examination records in `exam_attempts`.

---

## 8. EXAM AGENT SECURITY & REAL-TIME MONITORING

- Test conductors run locally and submit the completed `ExamAttempt` payload upon finalization.
- Backend verifies that the submitting student matches the attempt token, ensuring no student can submit events on behalf of another.

---

## 9. INTERVENTION SECURITY & REMEDIATION PRIVACY

- Similar Issues cohort clusters group students sharing identical conceptual gaps without exposing personal data across unassigned faculty.
- When faculty assigns a group intervention, the backend creates individual member links (`intervention_students`) so that individual practice attempts remain private to each student.

---

## 10. QUESTION SECURITY & INTELLECTUAL PROPERTY

- Master Question Bank repository items are protected against unauthorized modification.
- Source document uploads (NCERT books, PDF materials) are restricted to faculty and administrative staff.

---

## 11. QUESTION PAPER SECURITY & RELEASE CONFIDENTIALITY

- Generated question papers remain in `'Draft'` status until published.
- Students in target batches may only view or attempt papers once the status transitions to `'Shared'` / `'Published'`.

---

## 12. FILE & SOURCE DOCUMENT SECURITY

- Upload endpoint (`POST /faculty/question-studio/sources/upload`) must enforce:
  1. MIME validation: `application/pdf`, `application/epub+zip`.
  2. Size limits: Maximum 50MB per document.
  3. Malware scanning via ClamAV / AWS GuardDuty prior to ingestion.
  4. Storage in private S3 buckets with time-limited pre-signed URLs.

---

## 13. AI & LLM SECURITY

- **Prompt Injection Defense:** AI Tutor (`/ai/tutor/respond`) and Teaching Assistant (`/ai/assistant/respond`) use strict system prompt delimiters to prevent user inputs from altering core instructional guidelines.
- **Document Ingestion Sanitization:** Source text parsed from uploaded PDFs is stripped of executable scripts and raw binary content before processing.

---

## 14. AI DATA ISOLATION INVARIANTS

1. **Cross-Student Isolation:** AI analysis for Student A MUST NEVER consume Student B's private attempt data.
2. **Cross-Domain Isolation:** JEE analysis must never consume NEET-only biology or medical datasets.
3. **Contextual Scoping:** Intelligence engines calculate strictly within authorized student and course boundaries.

---

## 15. UNIVERSITY / JEE / NEET SECURITY ISOLATION

### ⚠️ Critical Security Invariant
- **University:** `domain = "university"`, `examFamily = null`.
- **JEE:** `domain = "competitive"`, `examFamily = "JEE"`.
- **NEET:** `domain = "competitive"`, `examFamily = "NEET"`.
- **Mandate:** Backend authorization queries MUST NOT use subject string matching alone (e.g. `subject = 'Physics'`). They MUST verify the composite key `(domain, exam_family)`.

---

## 16. TENANT & MULTI-INSTITUTION ISOLATION

- Every query executed in the production backend MUST include `WHERE institution_id = current_user.institution_id`.
- Multi-institution data leakage is classified as a **Critical Severity Vulnerability**.

---

## 17. INSECURE DIRECT OBJECT REFERENCE (IDOR) AUDIT

| Endpoint / Route | Target Resource | IDOR Vulnerability Risk | Required Backend Control |
|---|---|---|---|
| `GET /student/exam-analysis/:id` | `ExamAttempt` | Student alters `:id` to inspect peer exam review | Verify attempt `student_id == current_user.id` |
| `GET /student/exam-agent/attempts/:id` | `ExamAttempt` | Student inspects peer telemetry | Verify attempt `student_id == current_user.id` |
| `GET /faculty/students/:id/360` | `Student 360` | Faculty inspects unauthorized student | Verify student is in faculty's department/course |
| `GET /faculty/interventions/:id` | `Intervention` | Unauthorized faculty alters plan | Verify faculty created or oversees intervention |
| `GET /student/interventions/:id/practice` | `Intervention` | Student attempts unassigned intervention | Verify student is assigned to intervention |
| `GET /faculty/paper-generator/papers/:id` | `QuestionPaper` | Faculty accesses peer draft exam | Verify paper ownership or shared status |

---

## 18. ROLE ESCALATION RISKS & CLIENT MANIPULATION

- **Risk:** Modifying `localStorage.getItem('EduX_user')` (`role='admin'`) unlocks frontend routes.
- **Backend Countermeasure:** Client-supplied role claims are completely ignored. The backend validates role strictly from cryptographically signed JWT claims signed by server private key.

---

## 19. API INPUT VALIDATION REQUIREMENTS

Backend Pydantic validation schemas must enforce strict validation rules:
- Numeric bounds: Scores between $0$ and `maxScore`; accuracy between $0.0$ and $100.0$; question count between $1$ and $100$.
- String constraints: Non-empty titles (max 255 chars); normalized email formatting.
- Enums: Strict validation of `domain`, `examFamily`, `difficulty`, `questionType`, `status`.

---

## 20. RATE LIMITING & ABUSE PROTECTION

| Endpoint Category | Sensitive Endpoints | Target Rate Limit | Protection Mechanism |
|---|---|---|---|
| **Authentication & Recovery** | `POST /auth/login`, `POST /auth/verify-otp`, `POST /auth/forgot-password` | 5 requests / minute per IP | Exponential backoff / IP block |
| **Registration** | `POST /auth/register` | 3 registrations / hour per IP | Captcha verification |
| **AI Generation** | `POST /faculty/question-studio/generate`, `/ai/tutor/respond` | 20 requests / minute per user | Token bucket rate limiter |
| **Paper Generation** | `POST /faculty/paper-generator/papers` | 10 requests / minute per user | Concurrency queue |
| **Exam Submission** | `POST /student/exam-agent/attempts` | 1 submission per attempt ID | Duplicate submission lock |

---

## 21. CORS, CSRF & SECURITY HEADERS

- **CORS:** Restrict `Access-Control-Allow-Origin` to trusted frontend domains (`https://*.medixoedux.edu`).
- **Security Headers:** Enforce `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security: max-age=31536000`.
- **CSRF:** Stateless JWT in `Authorization` header provides inherent CSRF immunity; if cookie sessions are introduced, enforce `SameSite=Strict` and CSRF tokens.

---

## 22. SECRETS & ENVIRONMENT CONFIGURATION AUDIT

- **Audit Finding:** The prototype codebase contains mock passwords (`"Edux12345"`), demo OTPs (`"482193"`, `"731205"`), and API base URLs in `src/config/index.js`.
- **Backend Security Rule:** Production secrets (JWT private keys, database passwords, S3 credentials, SMS gateway keys) MUST be loaded exclusively via environment variables (`.env` / AWS Secrets Manager) and never committed to source control.

---

## 23. SESSION & TOKEN SECURITY LIFECYCLE

- Short-lived Access Token: 15-minute expiration.
- Single-use Refresh Token: 14-day expiration with automatic token rotation upon each refresh.
- Instant Token Revocation: Redis blacklist on logout or password reset.

---

## 24. AUDIT LOGGING REQUIREMENTS

All security-sensitive operations MUST be written to an immutable append-only `audit_logs` table in PostgreSQL:
- Attributes: `id`, `user_id`, `user_role`, `action`, `resource_type`, `resource_id`, `ip_address`, `user_agent`, `status`, `timestamp`.

---

## 25. SECURITY-SENSITIVE EVENTS INVENTORY

| Event Code | Triggering Action | Actor Role | Current Status in Prototype | Future Backend Requirement |
|---|---|---|---|---|
| `AUTH_LOGIN_SUCCESS` | User signs in successfully | Any | Handled in React state | Log to `audit_logs` with IP |
| `AUTH_LOGIN_FAILED` | Incorrect password / OTP | Anonymous | Handled in React state | Track for brute-force lockout |
| `AUTH_PASSWORD_RESET` | Password reset completed | Any | Prototype return | Log to `audit_logs` |
| `EXAM_ATTEMPT_SUBMIT` | Student submits examination | Student | Writes to localStorage | Log score & finalization |
| `INTERVENTION_ASSIGN` | Faculty assigns remedial tasks | Faculty | Writes to localStorage | Log target student roster |
| `PAPER_SHARE_BATCH` | Faculty shares question paper | Faculty | Writes to localStorage | Log audience & recipients |
| `QUESTION_APPROVED` | Faculty approves generated item | Faculty | Writes to localStorage | Log question addition to bank |
| `RBAC_ROLE_MODIFIED` | Admin updates role permissions | Admin | Stored in static dataset | Critical audit log entry |

---

## 26. SECURITY GAP REGISTER

| Gap ID | Area | Current Prototype State | Vulnerability Risk | Severity | Backend Mitigation Requirement |
|---|---|---|---|---|---|
| `GAP-01` | Authentication | Hardcoded password (`Edux12345`) & OTPs (`482193`, `731205`) | Trivial unauthorized sign-in | **Critical** | Implement bcrypt password hashing & live SMS/Email TOTP |
| `GAP-02` | Authorization | Client-side role checking (`ProtectedRoute.jsx`) | Role escalation via localStorage tampering | **Critical** | Server-side JWT signature & RBAC route dependencies |
| `GAP-03` | IDOR | Client supplies arbitrary `studentId` in query params | Cross-student data exposure | **Critical** | Server-side session ownership enforcement |
| `GAP-04` | Persistence | Exam attempts stored in browser `localStorage` | Client tampering with scorecards | **Critical** | Server-side evaluation & PostgreSQL ACID storage |
| `GAP-05` | File Ingestion | Simulated upload via filename keyword matching | Malicious file upload / RCE | High | Strict MIME validation, 50MB cap, ClamAV scanning, private S3 |
| `GAP-06` | Multi-Tenancy | Single-tenant prototype assumption | Cross-institutional data leak | High | Enforce `institution_id` partition on all database queries |
| `GAP-07` | Rate Limiting | No rate limits on OTP or generation endpoints | DoS / Resource exhaustion | Medium | Redis token bucket rate limiting middleware |

---

## 27. FUTURE PYTHON BACKEND SECURITY ARCHITECTURE

```
Client Browser
  │ (HTTPS / TLS 1.3)
  ▼
Reverse Proxy / API Gateway (Nginx / Cloudflare)
  │ - Enforces DDoS Protection, WAF Rules, Security Headers, CORS Policy
  ▼
FastAPI Security Middleware Pipeline
  │ 1. Rate Limiting Middleware (Redis token bucket)
  │ 2. JWT Authentication Dependency (Verifies signature, expiration, blacklist)
  │ 3. Tenant Boundary Filter (Injects current_user.institution_id)
  │ 4. RBAC Permission Checker (Enforces role in allowed_roles)
  │ 5. Resource Ownership Validator (Verifies student_id / faculty_id authorization)
  ▼
Service & Intelligence Layer
  │ - Enforces Domain Isolation (University vs JEE vs NEET)
  │ - Sanitizes AI prompt context and source document inputs
  ▼
PostgreSQL Relational Database (Encrypted at Rest with AES-256)
```

---

## 28. COMPREHENSIVE SECURITY TEST PLAN

The future Python backend must execute the following 10 automated security test suites:
1. **Authentication Suite:** Tests valid login, invalid password lockout, OTP verification, token refresh rotation, and logout blacklisting.
2. **RBAC Authorization Suite:** Tests unauthorized role access across all 145 endpoints (verifying 403 Forbidden).
3. **IDOR & Ownership Suite:** Tests cross-student attempt queries, unauthorized Student 360 requests, and peer intervention modifications.
4. **Multi-Tenant Isolation Suite:** Verifies that queries under Institution A never return data for Institution B.
5. **Domain Isolation Suite:** Verifies that JEE Physics queries never return NEET Physics attempts or University course items.
6. **Transcript Contamination Suite:** Verifies that practice attempts NEVER alter official examination GPA or transcript tables.
7. **Input Validation & Injection Suite:** Tests SQL injection, XSS payloads in titles/notes, and invalid numeric parameters.
8. **File Upload Security Suite:** Tests oversized files (>50MB), invalid MIME types (e.g. `.exe`), and malicious PDF payloads.
9. **AI Prompt Injection Suite:** Tests prompt escape sequences and verifies that AI Tutor replies adhere to instructional bounds.
10. **Rate Limiting Suite:** Tests rapid burst requests to `/auth/login` and `/faculty/question-studio/generate` (verifying 429 Too Many Requests).

---

## CONCLUSION
This document establishes the comprehensive Security and Privacy specification for MediXO EduX, defining the strict protection barriers required for backend implementation.