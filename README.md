# MediXO EduX

**An AI-assisted education operating system for universities, competitive coaching, and institutional leadership.**

MediXO EduX is a role-based platform that unifies **learning, teaching, assessment, academic intelligence, and governance** in one product. It is built for institutions that run **degree programmes and competitive preparation (JEE / NEET)** side by side — without mixing those two academic worlds.

This repository is **EduX Beta v1**: a production-shaped Vite SPA plus a FastAPI backend. Auth, people directories, and selected live APIs are real. Remaining product surfaces still fall back to an in-browser mock until they are ported.

| | |
|---|---|
| **Product** | MediXO EduX |
| **Branch** | `edux_beta_v1` |
| **Clients** | Student · Faculty · Administrator · Parent (built, currently disabled) |
| **Frontend** | React 18 · Vite 5 · Tailwind CSS 3 |
| **Backend** | FastAPI · SQLAlchemy · PostgreSQL 16 / SQLite · Redis |
| **API** | `http://localhost:8000/v1` · OpenAPI at `/docs` |

---

## What this project is

EduX is not a single LMS page or a chatbot wrapper. It is an **institution operating system** with four jobs:

1. **Help students learn and prove mastery** — courses, attendance, timed exams, exam analysis, Academic DNA, mentor support, and targeted interventions.
2. **Help faculty teach and intervene with evidence** — class operations, 360° student profiles, similar-issue grouping, paper generation, PYQ intelligence, and intervention lifecycle.
3. **Help administrators see and govern the institution** — health pillars, department comparison, people and catalogue, roles/permissions, audit, executive reports, and AI workspace.
4. **Keep university academics and competitive prep strictly partitioned** — every exam, DNA snapshot, paper, and intervention carries `exam_mode` (`university` | `competitive`) and optional `exam_family` (`jee` | `neet` | …). Aggregations never merge them.

The product thesis is simple: **raw academic events are facts; intelligence is a recomputable projection; generative AI is a candidate layer that must never write canonical scores.**

```
Landing website  →  Auth (login / register / OTP)  →  Role portal
                                                       ├── Student
                                                       ├── Faculty
                                                       ├── Admin
                                                       └── Parent (feature-flagged off)
```

---

## Who it is for

| Audience | Why EduX exists for them |
|---|---|
| **Engineering / university colleges** | One platform for degree CGPA, attendance, semester papers **and** JEE/NEET coaching batches |
| **Schools and junior colleges** | Competitive mocks, PYQs, timed CBT/OMR practice, and faculty intervention loops |
| **Professional / healthcare institutions** | Structured assessment banks, evidence-based reporting, and governance |
| **Coaching centres** | Paper studio, question banks, similar-issue detection, and batch-level health |
| **Deans, HODs, and operators** | Institution health, risk, placements, revenue/scholarships, audit, and board packs |
| **Enterprise L&D / evaluators** | A full EduTech UX and API contract to review before a larger rollout |

---

## Product principles

1. **One identity, many roles.** A person logs in as a `user`. Student, faculty, admin, and guardian profiles are extensions — people are not duplicated.
2. **University and Competitive never mix.** Filters, DNA, readiness, papers, and interventions always partition on exam mode / family.
3. **Raw vs derived.** Exam interactions are immutable. Scores, DNA, 360° views, similar-issues, and institution health are rebuilt by workers.
4. **AI is a platform, not a chat box.** LLMs may draft questions, lesson plans, and chat. They **must not** write exam scores, Academic DNA, similar-issue metrics, or institution health numbers.
5. **Evidence before intervention.** Faculty assign practice and re-tests from detected issues; those attempts never pollute official exam KPIs.
6. **Tenant-ready design.** Operational rows carry `institution_id`. Production schema is PostgreSQL with RLS in mind.

---

## Platform modules

Six systems, designed to run as one product:

| System | What it covers |
|---|---|
| **Learning** | Student academics, assignments, attendance, calendar, mentor, learning path, forum |
| **Teaching** | Faculty command center, timetable, lecture planner, announcements, AI teaching studio |
| **Assessment** | Question bank, PYQ intelligence, paper studio, quiz/exam builders, Exam Agent |
| **Intelligence** | Exam analysis, Academic DNA, 360° profiles, similar issues, readiness, institution health |
| **Governance** | RBAC, audit logs, CMS, API config, data import/export, settings |
| **Family engagement** | Parent portal (progress, attendance, fees, communication) — **disabled in this beta** |

---

## Use cases

### Students

| Use case | How EduX supports it |
|---|---|
| See academic standing at a glance | Dashboard KPIs: identity, CGPA, attendance, competitive readiness, AI daily brief |
| Keep up with courses and homework | Academics hub, assignments with file dropzone, calendar and deadlines |
| Track attendance against a 75% floor | Attendance ring, calendar (present / absent / leave / holiday), subject bars |
| Prepare for university exams | Examinations hub, midsems, mock tests, Exam Agent papers |
| Prepare for JEE / NEET | Competitive mode, family filters, subject-wise readiness, PYQ-aligned mocks |
| Sit a timed practice paper | **AI Exam Conducting Agent** — timer, navigator, mark-for-review, auto-submit |
| Understand a score | **AI Exam Analysis** — question, chapter, topic, mistake, and time intelligence |
| Know long-term strengths and gaps | **AI Academic DNA** (university vs JEE vs NEET, never merged) |
| Close a faculty-flagged weakness | **My Interventions** — targeted practice and re-test, isolated from official KPIs |
| Get a mentor in the loop | MediXO Mentor — chat, resources, practice centre, notes, history |
| Share a formal progress pack | Academic Progress Report (preview / print / PDF) |
| Talk to peers or raise a ticket | Discussion forum and student support |

### Faculty

| Use case | How EduX supports it |
|---|---|
| Start the day knowing what needs attention | Teaching Command Center, AI brief, at-risk and intervention cards |
| Run class operations | Timetable, attendance sheets, assignment grading, announcements |
| Understand one student in depth | **360° profile** — exams, subjects, chapters, time & behaviour, DNA |
| Find students with the same problem | **Similar Issues** (chapter / accuracy / time / skips) |
| Assign remedial work | Detect → approve → assign practice → re-test → measure effectiveness |
| Build a class test or competitive mock | **Question Paper Studio** with syllabus, blueprint, negative marking |
| Generate items from source content | **AI Question Studio** — source library, generate, review, approve into the bank |
| Analyse past-year papers | PYQ Intelligence (university + JEE Main / Advanced / NEET UG) |
| Keep the bank healthy | Question Intelligence — Bloom, difficulty, tags, quality, bulk actions |
| Reuse previous papers | Paper Library — view, duplicate, share, print |
| Plan a lecture | AI Teaching Studio — assistant, lesson planner, content studio |
| Report to HOD / admin | Reports Intelligence and export centre |

### Administrators

| Use case | How EduX supports it |
|---|---|
| Answer “is the institution healthy?” | Institution Command Center and six health pillars |
| Compare departments | Department intelligence and comparison reports |
| Reduce student risk | Intervention centre, at-risk trends, attendance floors |
| Watch faculty load and quality | Faculty health roll-up |
| Track assessments at scale | Assessment intelligence and question-bank coverage |
| Track placements and outcomes | Institutional outcomes, CTC, drives |
| Produce a board / management pack | Executive report generator, preview, and library |
| Ask a high-level question in plain language | Executive AI Workspace |
| Manage catalogue and people | Programs, courses, subjects, batches, users, departments |
| Control money and aid | Revenue and scholarships |
| Control access and compliance | Roles, permission matrix, audit logs |
| Configure the product | AI config, CMS, API keys, data import/export, settings |

### Institution operating loop (end-to-end)

1. Admin sets programmes, batches, departments, and users.
2. Faculty teaches, marks attendance, and publishes assessments.
3. Faculty generates university or competitive papers from the bank, PYQs, or Question Studio.
4. Students attempt papers in the Exam Agent; attempts become **canonical records**.
5. Intelligence rebuilds DNA, exam analysis, and faculty 360° views.
6. Faculty groups similar issues and assigns interventions; students practise and re-test.
7. Admin sees risk, coverage, and department health in executive reports.

### Parent (future)

The parent portal is implemented in the SPA (progress, attendance, performance, fees, teacher communication, reports) but is **not reachable** while `FEATURE_FLAGS.parentPortal` / `PARENT_PORTAL_ENABLED` is `false`. APIs are expected to return 403 until the flag is enabled.

---

## Basic technicalities

### Repository layout

```
EduX/
├── frontend/                 # Vite React SPA (product UI)
│   ├── src/api/              # Axios client + in-browser mock server
│   ├── src/pages/            # Landing, auth, student, faculty, admin, parent
│   ├── src/intelligence/     # Deterministic student / faculty / admin engines
│   ├── src/services/         # API services + TanStack Query hooks
│   └── src/mock-data/        # Demo datasets used when APIs return 501/404
├── backend/                  # FastAPI API
│   ├── app/api/v1/           # Auth, student, faculty, admin, AI routers
│   ├── app/models/           # Identity, catalog, people, exams, intelligence, AI
│   ├── app/ai/               # LLM gateway + prompt packs
│   ├── app/workers/          # Rule-based DNA / health / scoring jobs
│   ├── sql/schema.sql        # Production PostgreSQL + pgvector schema
│   └── docs/ARCHITECTURE.md  # Target enterprise architecture
└── README.md                 # This file
```

### Architecture (Beta v1)

```
┌─────────────────────┐         Bearer JWT + refresh          ┌─────────────────────┐
│  Vite SPA           │  ──────────────────────────────────►  │  FastAPI /v1        │
│  React 18           │         CORS: localhost:5173          │  Uvicorn :8000      │
│  Axios interceptor  │  ◄── 501/404 ── mock fallback ──►     │                     │
│  Role-guarded routes│                                       │  SQLAlchemy ORM     │
└─────────────────────┘                                       │  SQLite or Postgres │
                                                              │  Redis (OTP/cache)  │
                                                              │  AI gateway         │
                                                              └─────────────────────┘
```

- The SPA always talks to `VITE_API_BASE_URL` (default `http://localhost:8000/v1`).
- Live routes (auth, selected people/intelligence reads) hit FastAPI.
- Unimplemented product routes return **501/404**; with `VITE_MOCK_FALLBACK=true` the SPA continues on the in-browser mock so demos never go blank.
- Exam submit contract: `POST /v1/student/exam-agent/attempts` → persist attempt → intelligence rebuilds DNA.

### Stack

| Layer | Technology |
|---|---|
| UI | React 18, Vite 5, React Router 6, Tailwind CSS 3, Framer Motion, Recharts, Lucide |
| Client data | Axios (Bearer + silent refresh), TanStack Query 5, React Hook Form |
| API | FastAPI 0.115, Pydantic v2, Uvicorn |
| Auth | First-party JWT (HS256 in beta), access + refresh tokens, OTP flows |
| Passwords | PBKDF2 hashes in `users.password_hash` (never plaintext) |
| OLTP | SQLite for zero-setup local; PostgreSQL 16 schema `edux` for production (`sql/schema.sql`, `DB_SCHEMA=edux`) |
| Cache / OTP | Redis 7 |
| AI | OpenAI when `OPENAI_API_KEY` is set; otherwise deterministic fallback |
| Intelligence | Rule-based workers in `backend/app/workers/intelligence.py` (and JS engines in the SPA) |
| Observability | Rotating JSON logs in `backend/logs/` (`medixo.log`, `medixo-error.log`) |
| Containers | `backend/Dockerfile` + `docker-compose.yml` (API, Postgres, Redis) |

### Auth contract

```
POST /v1/auth/login      → { accessToken, refreshToken, user }
POST /v1/auth/refresh    → { accessToken, refreshToken }
Authorization: Bearer <accessToken>
```

Session keys in the browser: `aurora_access_token`, `aurora_user`. Axios retries once on 401 after refresh.

### Intelligence and AI rules

| Allowed to use an LLM | Must stay rule-based |
|---|---|
| Mentor / teaching studio / question studio / executive chat | Exam scores |
| Lesson plans and generated question *candidates* | Academic DNA |
| Cited explanations layered on top of numbers | Similar-issues and institution health |

Without an API key, the gateway returns labelled prototype text (`model: deterministic-fallback`). That is intentional: demos stay honest.

### Multi-tenancy and security (design)

Production intent (see `backend/docs/ARCHITECTURE.md`):

- Tenant key `institution_id` on operational rows; Postgres RLS
- JWT claims: `sub`, `institution_id`, `roles[]`, `permissions[]`, `jti`
- Rotating refresh tokens; hashed OTPs with TTL
- Exam integrity: server clock, attempt lock, no client-trusted scores
- Audit of permission changes, paper share, intervention assign, grade overwrite, export, AI config

Beta v1 implements the **API shape and identity model**. Full RLS, Argon2id, object storage, and search are on the production path, not all wired in this branch.

### Current API coverage

Live reads that do not need mock fallback (seeded demo directory):

- `GET /v1/faculty/students`
- `GET /v1/admin/students`
- `GET /v1/admin/faculty`
- `GET /v1/student/profile`
- `GET /v1/intelligence/profile`

Auth (login, register, OTP, refresh) is live. Other product routes may still 501/404 by design.

Seeded directory on boot: **126 students** (7 batches × 18), **10 faculty**, **1 admin**, **1 parent**, plus departments, B.Tech CSE, University + JEE + NEET batches.

---

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
copy .env.example .env          # then set SECRET_KEY

# Zero-setup local DB:
# DATABASE_URL=sqlite:///./medixo.db
#
# Shared Postgres (RDS): keep other schemas untouched
# DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/postgres
# DB_SCHEMA=edux

uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000/v1
- Health: http://localhost:8000/health
- OpenAPI: http://localhost:8000/docs

Optional stack: `docker compose up` in `backend/` (Postgres 16 + Redis 7 + API).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

`frontend/.env`:

```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8000/v1
VITE_MOCK_FALLBACK=true
```

### Demo accounts

Password for every seeded account: **`aurora123`**

| Role | Email | Lands at |
|---|---|---|
| Student (Aarav) | `aarav.sharma@medixoedux.edu` | `/student` |
| Student (Ishita) | `ishita.gupta@medixoedux.edu` | `/student` |
| Faculty | `meera.krishnan@medixoedux.edu` | `/faculty` |
| Admin | `ananya.iyer@medixoedux.edu` | `/admin` |
| Parent | `rajesh.sharma@medixoedux.edu` | Disabled (feature flag) |

Suspended or pending accounts cannot log in. Use **Fill for me** on `/auth/login`, or register a new student at `/auth/register`.

---

## What is real vs simulated in this beta

| Real | Simulated / prototype |
|---|---|
| Role-based SPA, routing, RBAC guards | Some admin/faculty/student screens still on mock APIs |
| FastAPI auth, JWT, people directory seed | Uploads, some PDF/DOCX export, and share flows are labelled simulations |
| Canonical exam-attempt contract | Exam “demo monitoring” auto-plays; **no webcam / proctoring** |
| Deterministic intelligence engines | Institution names, roster, and metrics are **fictional demo data** |
| Optional live LLM when a key is set | Parent portal is **off** |

---

## Documentation map

| Document | Purpose |
|---|---|
| [`frontend/README.md`](frontend/README.md) | Full product map, portal features, frontend runbook |
| [`backend/README.md`](backend/README.md) | API runbook, seed users, AI rules |
| [`backend/docs/ARCHITECTURE.md`](backend/docs/ARCHITECTURE.md) | Enterprise backend target: bounded contexts, SLOs, phases |
| [`backend/sql/schema.sql`](backend/sql/schema.sql) | Production PostgreSQL schema |
| [`frontend/CHANGE-LOG.md`](frontend/CHANGE-LOG.md) | Phase-by-phase frontend engineering history |

---

## License and data

Demo project with fictional institution data for product evaluation.

MediXO EduX Learning Systems Pvt. Ltd. (fictional brand used in this codebase).
