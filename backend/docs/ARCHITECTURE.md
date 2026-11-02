# MediXO EduX — Enterprise Backend Architecture

This document specifies a **production-ready, multi-tenant backend** for the MediXO EduX frontend. It is derived from:

- Product scope in `README.md`
- Mock API contracts in `src/api/mock-routes*.js`
- Canonical exam-attempt contract in `src/intelligence/engine/exam-agent.js`
- Intelligence engines in `src/intelligence/`
- Auth client in `src/api/axios.js` (`Bearer` + refresh)

The frontend already targets `VITE_API_BASE_URL` (default `https://api.medixoedux.edu/v1`). This design is the drop-in server for that contract, extended for security, scale, and real AI.

---

## 1. Design principles

1. **One identity, many roles.** `users` is the login principal. `student_profiles`, `faculty_profiles`, `admin_memberships`, and `guardians` are role extensions — never duplicate people.
2. **University and Competitive never mix.** Every assessment, attempt, DNA snapshot, paper, and intervention row carries `exam_mode` (`university` | `competitive`) and optional `exam_family` (`jee` | `neet` | `gate` | …). Aggregations always partition on these columns.
3. **Raw vs derived.** Exam interactions are immutable facts. Scores, DNA, 360°, similar-issues, and institution health are **recomputable projections** written to snapshot tables by workers.
4. **Tenant isolation.** Every operational row has `institution_id`. Platform CMS (blog, pricing) is global. Row-level security in Postgres is mandatory.
5. **AI is a platform, not a chat box.** LLMs never write canonical scores. They produce *candidates* (questions, lesson plans, chat) that pass validators; intelligence metrics stay rule-based or model-scored with provenance.
6. **Audit everything privileged.** Permission changes, paper share, intervention assign, grade overwrite, data export, AI config.

---

## 2. Target stack

| Layer | Choice | Why |
|---|---|---|
| API | NestJS (TypeScript) + OpenAPI 3 | Same language as the client; versioned `/v1` matching Axios |
| Auth | Keycloak or Auth0 *or* first-party JWT (RS256) | Frontend already uses access + refresh tokens |
| OLTP | PostgreSQL 16 | Relational academic graph, RLS, JSONB for blueprints |
| Cache / sessions | Redis 7 | Rate limits, OTP, exam lock, IQ snapshot cache |
| Search | OpenSearch | Question bank, PYQ, forum, CMS |
| Objects | S3-compatible | Sources, assignments, avatars, generated PDFs |
| Queue | Kafka *or* SQS + workers | Exam submit → score → DNA → 360 → similar-issues |
| AI workers | Python 3.12 (FastAPI internal) | RAG, generation, embeddings; isolated from the public API |
| Vector | pgvector *or* Pinecone | Source library + GraphRAG citations |
| Observability | OpenTelemetry → Grafana / Datadog | Trace exam submit and LLM calls |
| Jobs | Temporal *or* BullMQ | Long paper generation, report PDF, bulk import |

Deploy as Kubernetes (EKS/GKE/AKS): `api`, `worker-intelligence`, `worker-ai`, `worker-files`, `scheduler`.

---

## 3. Bounded contexts (services)

Keep a **modular monolith** for v1 (one NestJS app, modules = contexts). Split only when load or team size requires it. Exam runtime and AI workers should be **separate processes** from day one.

```
                    ┌─────────────┐
   Clients          │  API GW /   │  WAF, TLS, JWT, rate limit
   (Vite SPA)  ───► │  Kong/APISIX│
                    └──────┬──────┘
           ┌───────────────┼────────────────┐
           ▼               ▼                ▼
     identity-api     academic-api     assessment-api
     (auth, RBAC)     (catalog, LMS)   (bank, papers, exams)
           │               │                │
           │               │                ▼
           │               │         exam-runtime (sticky, WS optional)
           │               │                │
           └───────────────┴──────► intelligence-worker
                                    ai-gateway-worker
                                    notification-worker
```

| Context | Owns | Frontend mapping |
|---|---|---|
| **Identity & access** | Users, sessions, OTP, RBAC, feature flags | `/auth/*`, parent gate |
| **Institution catalog** | Campuses, depts, programs, courses, subjects, batches, calendar | Admin academics |
| **People** | Student/faculty profiles, enrollments, guardian links | Admin people, My Students |
| **Teaching ops** | Timetable, attendance, assignments, announcements | Faculty teaching, student academics |
| **Assessment** | Question bank, PYQ, papers, studio sessions, shares | Assessment Intelligence |
| **Exam runtime** | Live attempts, timers, autosubmit, locks | Exam Agent |
| **Interventions** | Issue groups, lifecycle, practice/retest attempts | Faculty + student interventions |
| **Intelligence** | DNA, 360, readiness, health pillars, reports | `/intelligence/*`, faculty/admin intelligence |
| **AI platform** | Models, prompts, traces, RAG corpora, quotas | Mentor, Teaching Studio, Question Studio, Executive AI |
| **CMS & growth** | Blog, careers, contact, newsletter | Landing |
| **Finance** | Invoices, scholarships (phase) | Admin revenue |
| **Governance** | Audit log, CMS, API keys, import/export | Admin governance |
| **Support & comms** | Tickets, forum, notifications | Student/faculty/admin support |

---

## 4. Multi-tenancy and security

- **Tenant key:** `institution_id` UUID.
- **Postgres RLS** policies: `institution_id = current_setting('app.institution_id')::uuid`.
- **Postgres schema:** application objects live in `edux` (`DB_SCHEMA=edux`). Do not write to `public` or sibling schemas on a shared database.
- **Super-admin** (MediXO operator) uses a separate `platform` schema with no tenant RLS.
- **JWT claims:** `sub`, `institution_id`, `roles[]`, `permissions[]`, `jti`.
- **Refresh:** rotate refresh tokens in `auth_sessions`; match existing Axios 401 replay.
- **OTP:** 6-digit, Redis TTL 10 min, hashed, purpose `register | reset | verify_email`.
- **Passwords:** Argon2id; never store demo plaintext.
- **PII:** encrypt phone at rest (column encryption or app-level); access logged.
- **Exam integrity:** signed attempt start; server clock; heartbeat; no client-trusted scores.
- **Parent portal:** `FEATURE_FLAGS.parentPortal` stays server-driven; APIs exist but return 403 until enabled.

---

## 5. Canonical exam attempt (must match frontend)

On `POST /student/exam-agent/attempts` (submit):

1. Persist **raw** `exam_attempt_events` (per-question visits, answer changes, timestamps).
2. Persist **canonical** `exam_attempts` + `exam_question_attempts` (embedded question snapshot so later bank edits cannot rewrite history).
3. Enqueue `ExamSubmitted` → scoring → intelligence rebuild.

**Never** mix `mode = intervention_practice | intervention_retest` into official exam KPIs (frontend rule). Filter `attempt_kind = official | practice` vs `intervention_*`.

**Exclude** `is_demo = true` from DNA / 360 / similar-issues by default (`includeDemo` query flag).

Identity on every attempt: `student_id`, `roll_no`, `batch_id`, `section_id`, `exam_mode`, `exam_family`, `source` (`exam-agent` | `imported` | `paper-share`).

---

## 6. Intelligence pipeline

Replace in-browser engines with **asynchronous, idempotent jobs**:

| Job | Trigger | Writes |
|---|---|---|
| `ScoreAttempt` | exam submit | `exam_attempts.scoring`, classifications |
| `RebuildStudentDna` | after score; nightly | `student_dna_snapshots` partitioned by exam_mode/family |
| `RebuildStudent360` | faculty open or nightly | `student_360_snapshots` |
| `RebuildReadiness` | exam catalog change | `exam_readiness` |
| `DetectSimilarIssues` | after 360 batch | `issue_groups`, `issue_group_members` |
| `RebuildFacultyDashboard` | hourly | `faculty_intelligence_snapshots` |
| `RebuildInstitutionHealth` | hourly | `institution_health_snapshots` (six pillars) |
| `ProgressReport` | on demand | cached document + object storage PDF |

Jobs must be **pure given inputs** (same as current JS engines) so results stay explainable. LLM text (summaries) is a *layer on top* of these numbers, stored with `prompt_version` and `model_id`.

---

## 7. API surface (v1)

Keep existing paths where the SPA already calls them. Prefix `/v1`.

**Auth:** `POST /auth/login`, `/refresh`, `/logout`, `/forgot-password`, `/verify-otp`, `/resend-otp`, `/reset-password`, `/verify-email`, `/register`, `/register/verify`, `GET /auth/registration/options`, `POST /auth/profile-setup`.

**Student:** programs, academics, assignments, attendance, calendar, forum, support, examinations, exam-agent, exam-analysis, performance-accuracy, mentor, interventions, progress-report.

**Faculty:** teaching workspace aggregates, students, 360, similar-issues, interventions, question-intelligence, pyq, paper-generator, question-studio, reports, ai-studio.

**Admin:** institution-intelligence, catalog, people, revenue, scholarships, roles, permissions, audit-logs, ai-config, cms, api-config, data-tools.

**Intelligence (internal + SPA):**  
`GET /intelligence/profile|datasets|derived|summary|exam-attempts|exam-dna-signals`  
`GET /faculty-intelligence/summary`  
`GET /admin-intelligence/profile|datasets|derived|summary`

List endpoints are **paginated** (`cursor` or `page/size`). Mock “return entire bank” is not production-safe.

---

## 8. Non-functional targets

| Concern | Target |
|---|---|
| Exam submit p99 | < 300 ms API ack; scoring async < 5 s |
| Live exam heartbeat | 5 s; autosubmit on server expiry |
| Question bank search | < 200 ms (OpenSearch) |
| Mentor first token | < 1.5 s (stream SSE) |
| Institution health job | < 10 min for 15k students |
| RPO / RTO | 5 min WAL archive / 30 min regional failover |
| Availability | 99.9% API; exam-runtime 99.95% in exam windows |

---

## 9. Implementation phases (backend)

1. **Identity + tenant + catalog + people** — login works against Postgres.
2. **Assessment + exam runtime + canonical attempts** — Exam Agent is real.
3. **Intelligence workers** — DNA, analysis, 360, health from attempts.
4. **Interventions + paper studio + question studio** — faculty workflows.
5. **AI gateway** — Mentor, teaching studio, executive AI, generation with traces.
6. **Finance, CMS, import/export, parent APIs** — remaining admin + parent flag.

Schema: `docs/backend/schema.sql`. AI: `docs/backend/AI-PLATFORM.md`.
