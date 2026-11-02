# MediXO EduX API — FastAPI

Python backend for the MediXO EduX frontend. Separate from the Vite SPA. Matches product scope in the root `README.md` and the domain model in `sql/schema.sql`.

## Run locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
copy .env.example .env          # then set SECRET_KEY

# SQLite (zero-setup):
# in .env set DATABASE_URL=sqlite:///./medixo.db

uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000/v1  
- Health: http://localhost:8000/health  
- OpenAPI: http://localhost:8000/docs  

Logs: rotating JSON files in `backend/logs/medixo.log` (all requests) and `backend/logs/medixo-error.log` (errors). The Vite app does not write these files — only the API does. Restart uvicorn after pulling logging changes (`--reload` should pick them up).

Point the SPA at this API (`frontend/.env` is already set this way):

```
VITE_USE_MOCK=false
VITE_API_BASE_URL=http://localhost:8000/v1
VITE_MOCK_FALLBACK=true
```

Auth (login, register, OTP, refresh) is live. Unimplemented product routes return 501/404 so the SPA can fall back to mock data until those APIs are ported.

## Local development accounts

`python -m scripts.create_dev_accounts` (run from `backend/`) creates three real local dev accounts — `student@edux.dev`, `faculty@edux.dev`, `admin@edux.dev` — as regular rows in your local database, authenticated by the normal login flow. Idempotent and non-destructive. See [`docs/LOCAL-DEVELOPMENT-ACCOUNTS.md`](../docs/LOCAL-DEVELOPMENT-ACCOUNTS.md).

Demo password for **every seeded account**: `aurora123` (stored as PBKDF2 hash in `users.password_hash`, never plaintext).

On boot the API upserts the SPA mock directory into SQLite:

- **126 students** (7 batches × 18, same ids/rolls as Faculty My Students). Aarav stays `u_stu_001`.
- **10 faculty**, **1 admin**, **1 parent**
- Departments, B.Tech CSE program, University + JEE + NEET batches

Live reads (no mock fallback needed): `GET /v1/faculty/students`, `GET /v1/admin/students`, `GET /v1/admin/faculty`, `GET /v1/student/profile`, `GET /v1/intelligence/profile`.

| Role | Email |
|---|---|
| Student (Aarav) | aarav.sharma@medixoedux.edu |
| Student (Ishita) | ishita.gupta@medixoedux.edu |
| Faculty | meera.krishnan@medixoedux.edu |
| Admin | ananya.iyer@medixoedux.edu |
| Parent | rajesh.sharma@medixoedux.edu (portal still feature-flagged off) |

Other roster students use `{firstname}.{lastname}@medixoedux.edu` (see `ADMIN_USERS` / seed). Generated batch students use a unique `*.{id}@medixoedux.edu` address. Suspended/pending accounts cannot log in.

## Layout

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, /health
│   ├── core/                # settings, JWT, dependencies
│   ├── db/                  # engine, session, Base
│   ├── models/              # SQLAlchemy (identity, catalog, exams, AI, …)
│   ├── schemas/             # Pydantic request/response
│   ├── api/v1/              # routers matching SPA paths
│   ├── services/            # seed, auth helpers
│   ├── ai/                  # LLM gateway + prompt packs
│   └── workers/             # DNA / intelligence jobs (no LLM scoring)
├── sql/schema.sql           # production PostgreSQL + pgvector
├── ARCHITECTURE.md
└── requirements.txt
```

## Production database

Use PostgreSQL 16. Apply `sql/schema.sql` (creates schema `edux`, enums, RLS-ready `institution_id`, pgvector). Set:

```
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/postgres
DB_SCHEMA=edux
```

All app tables stay in `edux`. Other schemas in the same database are not used.

## AI

`app/ai/gateway.py` calls OpenAI when `OPENAI_API_KEY` is set. Without a key it uses **deterministic fallback** (same honesty as the SPA prototype).

Rules:

- Mentor / teaching studio / question studio / executive chat may use an LLM.
- Exam scores, Academic DNA, similar-issues, and institution health are **rule-based workers** (`app/workers/intelligence.py`). Models must not write those numbers.

## Auth contract (SPA)

`POST /v1/auth/login` → `{ accessToken, refreshToken, user }`  
`POST /v1/auth/refresh` → `{ accessToken, refreshToken }`  
Bearer token on subsequent calls. Axios in the SPA already sends `Authorization` and retries on 401.

Canonical exam submit: `POST /v1/student/exam-agent/attempts` then intelligence rebuilds DNA.
