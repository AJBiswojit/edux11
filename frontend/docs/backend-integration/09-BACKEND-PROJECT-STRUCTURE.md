# 09 — BACKEND PROJECT STRUCTURE SPECIFICATION

**Project:** MediXO EduX (`medixo-edux-platform` v1.0.0)
**Phase:** E — Python Backend Implementation Blueprint
**Date:** 2026-08-23 · **Branch:** `arena/01a02f45-edux`
**Status:** Complete & Verified Structural Specification

---

## 1. COMPLETE BACKEND FILE TREE

```
backend/
├── alembic/
│   ├── versions/                  # Versioned schema migration files
│   │   ├── 0001_initial_schema.py
│   │   ├── 0002_exam_attempts.py
│   │   └── 0003_interventions.py
│   ├── env.py                     # Alembic async migration environment
│   ├── script.py.mako             # Migration template
│   └── alembic.ini                # Alembic database connection configuration
│
├── app/
│   ├── api/
│   │   ├── v1/                    # API Version 1 Routers (Matching Phase B 145 Endpoints)
│   │   │   ├── auth.py            # POST /auth/login, /auth/register, /auth/verify-otp...
│   │   │   ├── platform.py        # GET /platform/blog, /platform/careers, /platform/contact...
│   │   │   ├── student/
│   │   │   │   ├── academics.py   # GET /student/mock-tests, /student/exams, /student/settings...
│   │   │   │   ├── exam_agent.py  # GET /student/exam-agent/exams, POST /student/exam-agent/attempts...
│   │   │   │   ├── exam_analysis.py # GET /student/exam-analysis/options, /student/exam-analysis/:id
│   │   │   │   ├── intelligence.py # GET /intelligence/profile, /intelligence/summary, /intelligence/exam-attempts...
│   │   │   │   ├── mentor.py      # GET /student/mentor/workspace
│   │   │   │   └── interventions.py # GET /student/interventions, POST /student/interventions/:id/practice-attempts...
│   │   │   ├── faculty/
│   │   │   │   ├── workspace.py   # GET /faculty/attendance, /faculty/assignments, /faculty/timetable...
│   │   │   │   ├── intelligence.py # GET /faculty-intelligence/summary
│   │   │   │   ├── students.py    # GET /faculty/students, /faculty/students/weak-topic-questions...
│   │   │   │   ├── student_360.py # GET /faculty/students/:id/360, /faculty/students/:id/exams/:attemptId/analysis
│   │   │   │   ├── similar_issues.py # GET /faculty/similar-issues, /faculty/similar-issues/:id/evidence...
│   │   │   │   ├── interventions.py # POST /faculty/similar-issues/:id/interventions, POST /faculty/interventions/:id/assign...
│   │   │   │   ├── question_studio.py # GET /faculty/question-studio/sources, POST /faculty/question-studio/generate...
│   │   │   │   ├── papers.py      # GET /faculty/paper-generator, POST /faculty/paper-generator/papers...
│   │   │   │   ├── pyq.py         # GET /faculty/pyq-analysis, /faculty/pyq-analysis/analytics...
│   │   │   │   ├── reports.py     # POST /faculty/reports, DELETE /faculty/reports/:id...
│   │   │   │   └── ai_studio.py   # POST /faculty/ai-studio/save
│   │   │   ├── admin/
│   │   │   │   ├── administration.py # GET /admin/users, /admin/departments, /admin/revenue, /admin/roles...
│   │   │   │   ├── intelligence.py # GET /admin-intelligence/summary
│   │   │   │   └── people.py      # GET /admin/students, /admin/faculty
│   │   │   ├── parent/
│   │   │   │   └── routes.py      # GET /parent/profile, /parent/dashboard, /parent/progress, /parent/fees...
│   │   │   ├── ai/
│   │   │   │   └── assistants.py  # GET /ai/tutor/threads, POST /ai/tutor/respond, /ai/assistant/respond...
│   │   │   └── router.py          # Master API router aggregating all 22 domain routers
│   │   └── router.py
│   │
│   ├── core/                      # Core Infrastructure & Cross-Cutting Concerns
│   │   ├── config.py              # Pydantic BaseSettings application configuration
│   │   ├── database.py            # Async SQLAlchemy engine & sessionmaker (asyncpg)
│   │   ├── security.py            # Password hashing (bcrypt), JWT encode/decode, token verification
│   │   ├── dependencies.py        # FastAPI dependency injectors (get_db, get_current_user, require_role)
│   │   ├── exceptions.py          # Custom domain exception classes & HTTP error mappers
│   │   ├── middleware.py          # Correlation ID, Security Headers, CORS, Error middleware
│   │   └── logging.py             # Structured JSON logger configuration (structlog)
│   │
│   ├── schemas/                   # Pydantic Data Validation & Contract Schemas
│   │   ├── auth.py                # Login, TokenResponse, RegisterRequest, OTPVerify
│   │   ├── user.py                # UserResponse, UserProfileUpdate
│   │   ├── student.py             # StudentProfileResponse, AcademicSettingsUpdate
│   │   ├── faculty.py             # FacultyProfileResponse, CourseRosterResponse
│   │   ├── exam.py                # ExamBlueprintResponse, SectionConfig
│   │   ├── attempt.py             # ExamAttemptCreate, ExamAttemptResponse, QuestionAttemptSchema
│   │   ├── question.py            # UniversalQuestionSchema, QuestionCreate, QuestionUpdate
│   │   ├── paper.py               # QuestionPaperCreate, QuestionPaperResponse, PaperShareRequest
│   │   ├── intervention.py        # InterventionCreate, InterventionResponse, RetestCreate
│   │   ├── intelligence.py        # Student360Response, AcademicDnaResponse, SimilarIssueGroupResponse
│   │   ├── admin.py               # AdminUsersResponse, RevenueMetrics, AuditLogsResponse
│   │   ├── parent.py              # ParentDashboardResponse, ParentFeesResponse
│   │   └── common.py              # GenericSuccess, ErrorMessage, PaginationParams
│   │
│   ├── models/                    # SQLAlchemy 2.0 Async ORM Models (PostgreSQL Tables)
│   │   ├── base.py                # DeclarativeBase, UUIDPrimaryKeyMixin, TimestampMixin
│   │   ├── user.py                # UserModel (users table)
│   │   ├── student.py             # StudentModel (students table)
│   │   ├── faculty.py             # FacultyModel (faculty table)
│   │   ├── academic.py            # InstitutionModel, DepartmentModel, ProgramModel
│   │   ├── batch.py               # BatchModel (batches table)
│   │   ├── course.py              # CourseModel, SubjectModel, ChapterModel, TopicModel, ConceptModel
│   │   ├── question.py            # QuestionModel, QuestionSourceModel, QuestionStudioSessionModel
│   │   ├── paper.py               # QuestionPaperModel, PaperQuestionJunction, PaperShareModel
│   │   ├── attempt.py             # ExamAttemptModel, QuestionAttemptModel
│   │   ├── intervention.py        # InterventionModel, InterventionStudentJunction, InterventionAttemptModel, InterventionRetestModel
│   │   ├── audit.py               # AuditLogModel (audit_logs table)
│   │   └── notification.py        # NotificationModel (notifications table)
│   │
│   ├── repositories/              # Data Access Layer (SQL Queries & Joins)
│   │   ├── base.py                # Generic BaseRepository[ModelType] (CRUD operations)
│   │   ├── user_repository.py
│   │   ├── student_repository.py
│   │   ├── faculty_repository.py
│   │   ├── attempt_repository.py  # Filters by studentId, domain, examFamily, is_demo
│   │   ├── question_repository.py # Selects practice question pools by context & difficulty
│   │   ├── paper_repository.py
│   │   ├── intervention_repository.py # Queries by student membership and status
│   │   └── admin_repository.py
│   │
│   ├── services/                  # Business Logic & Workflow Coordination
│   │   ├── auth_service.py        # Credentials verification, password hashing, JWT generation
│   │   ├── user_service.py
│   │   ├── student_service.py
│   │   ├── faculty_service.py
│   │   ├── exam_service.py
│   │   ├── attempt_service.py     # ExamAttempt persistence, scoring finalization, practice separation
│   │   ├── question_service.py
│   │   ├── question_studio_service.py # Source document analysis & question generation review
│   │   ├── paper_service.py       # Paper composition, duplication, batch sharing
│   │   ├── intervention_service.py # 9-state machine, preflight yield check, assignment, re-test
│   │   ├── document_service.py    # Multipart file validation & S3 blob storage upload
│   │   └── ai_service.py          # AI Tutor & Assistant reply generation with prompt security
│   │
│   ├── intelligence/              # Ported Deterministic Intelligence Engines
│   │   ├── dna.py                 # Academic DNA evidence calculation & trend classification
│   │   ├── student_360.py         # 360° individual student diagnostic assembly
│   │   ├── similar_issues.py      # Issue fingerprint extraction & cohort gap clustering
│   │   ├── intervention_lifecycle.py # Subsequent attempt matching & mathematical effectiveness calculation
│   │   ├── exam_attempt_intelligence.py # Multidimensional scorecards & topic performance
│   │   ├── question_intelligence.py # Weak topic question connector
│   │   ├── pyq_intelligence.py    # Historical PYQ recurring pattern prediction
│   │   └── institution_intelligence.py # Institution health score & department comparisons
│   │
│   └── main.py                    # FastAPI application factory, lifespan context, and route mounting
│
├── tests/                         # Comprehensive Pytest Test Suite
│   ├── conftest.py                # Test fixtures (async client, test database session, demo users)
│   ├── unit/                      # Unit tests for services and intelligence algorithms
│   ├── integration/               # Database repository and transaction tests
│   ├── api/                       # API contract tests for all 145 endpoints
│   └── security/                  # RBAC, IDOR, and domain isolation security tests
│
├── scripts/                       # Development & Migration Utilities
│   ├── seed_dev_data.py           # Seeds development database with DEMO_USERS and attemptSeeds
│   └── migrate_localstorage.py    # LocalStorage JSON import utility
│
├── Dockerfile                     # Multi-stage production container build
├── docker-compose.yml             # Local development stack (FastAPI + PostgreSQL + Redis)
├── pyproject.toml                 # Poetry / UV package dependencies & tools
└── README.md                      # Backend setup and developer guide
```

---

## 2. BACKEND MODULE OWNERSHIP MATRIX

Mapping of all functional domains to their designated backend modules:

| Functional Domain | API Router | Domain Service | Repository | Primary Model | Pydantic Schema | Intelligence Engine |
|---|---|---|---|---|---|---|
| **Authentication** | `api/v1/auth.py` | `AuthService` | `UserRepository` | `UserModel` | `schemas/auth.py` | — |
| **Platform Marketing** | `api/v1/platform.py` | `PlatformService` | `PlatformRepository` | `CmsArticleModel` | `schemas/common.py` | — |
| **Student Academics** | `api/v1/student/academics.py` | `StudentService` | `StudentRepository` | `StudentModel` | `schemas/student.py` | — |
| **AI Exam Agent** | `api/v1/student/exam_agent.py` | `AttemptService` | `AttemptRepository` | `ExamAttemptModel` | `schemas/attempt.py` | `exam_agent.py` |
| **AI Exam Analysis** | `api/v1/student/exam_analysis.py` | `AttemptService` | `AttemptRepository` | `ExamAttemptModel` | `schemas/attempt.py` | `exam_attempt_intelligence.py` |
| **Academic DNA** | `api/v1/student/intelligence.py` | `IntelligenceService`| `AttemptRepository` | `ExamAttemptModel` | `schemas/intelligence.py`| `dna.py` |
| **MediXO Mentor** | `api/v1/student/mentor.py` | `StudentService` | `QuestionRepository`| `QuestionModel` | `schemas/student.py` | — |
| **Student Interventions** | `api/v1/student/interventions.py`| `InterventionService`| `InterventionRepository`| `InterventionModel` | `schemas/intervention.py`| `intervention_lifecycle.py` |
| **Faculty Workspace** | `api/v1/faculty/workspace.py` | `FacultyService` | `FacultyRepository` | `FacultyModel` | `schemas/faculty.py` | — |
| **Faculty Intelligence** | `api/v1/faculty/intelligence.py`| `IntelligenceService`| `FacultyRepository` | `FacultyModel` | `schemas/intelligence.py`| `institution_intelligence.py` |
| **My Students Directory** | `api/v1/faculty/students.py` | `FacultyService` | `StudentRepository` | `StudentModel` | `schemas/faculty.py` | `student-360.py` |
| **Student 360** | `api/v1/faculty/student_360.py` | `IntelligenceService`| `AttemptRepository` | `ExamAttemptModel` | `schemas/intelligence.py`| `student_360.py` |
| **Similar Issues** | `api/v1/faculty/similar_issues.py` | `IntelligenceService`| `AttemptRepository` | `ExamAttemptModel` | `schemas/intelligence.py`| `similar_issues.py` |
| **Intervention Management**| `api/v1/faculty/interventions.py` | `InterventionService`| `InterventionRepository`| `InterventionModel` | `schemas/intervention.py`| `intervention_lifecycle.py` |
| **Question Paper Generator**| `api/v1/faculty/papers.py` | `PaperService` | `PaperRepository` | `QuestionPaperModel` | `schemas/paper.py` | — |
| **AI Question Studio** | `api/v1/faculty/question_studio.py`| `QuestionStudioService`| `QuestionRepository`| `QuestionModel` | `schemas/question.py` | `question_intelligence.py` |
| **PYQ Intelligence** | `api/v1/faculty/pyq.py` | `QuestionService` | `QuestionRepository` | `QuestionModel` | `schemas/question.py` | `pyq_intelligence.py` |
| **Admin Governance** | `api/v1/admin/administration.py`| `AdminService` | `AdminRepository` | `UserModel`, `AuditLogModel` | `schemas/admin.py` | — |
| **Institution Intelligence**| `api/v1/admin/intelligence.py` | `IntelligenceService`| `AdminRepository` | `InstitutionModel` | `schemas/intelligence.py`| `institution_intelligence.py` |
| **Parent Portal** | `api/v1/parent/routes.py` | `ParentService` | `ParentRepository` | `ParentModel` | `schemas/parent.py` | — |
| **AI Tutor & Copilot** | `api/v1/ai/assistants.py` | `AIService` | `UserRepository` | `ChatMessageModel` | `schemas/common.py` | `ai_service.py` |

---

## CONCLUSION
This document establishes the definitive Python backend project directory structure and module assignment for MediXO EduX.