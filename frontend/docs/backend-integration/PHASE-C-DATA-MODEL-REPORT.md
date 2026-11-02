# PHASE C — DATA MODEL + DATABASE MAPPING REPORT

**Project:** MediXO EduX (`medixo-edux-platform` v1.0.0)
**Phase:** C — Data Model & Database Mapping Specification
**Nature:** Documentation-only phase. Zero application source code was modified, zero backend code implemented, zero database created.
**Date:** 2026-08-23 · **Branch:** `arena/01a02f45-edux`

---

## 1. Baseline
- **Pre-requisites Completed:** Phase A (Architecture & UI Traceability) and Phase B (API Contract & OpenAPI Specification).
- **Audited Subsystems:** All 22 API route modules, 11 service modules, 19 datasets, 3 intelligence foundations, and 108 UI pages.

## 2. Entities Discovered
- **Total Distinct Major Entities Cataloged:** **32 entities**.
- Entities span Identity, Academic Hierarchy, Question Management, Assessment Delivery, Intelligence Models, Remediation Lifecycle, and Administrative Operations.

## 3. Entity Classification
Categorized into 9 distinct persistence tiers:
- `Tier A (Persistent Database Entity)`: 19 entities (Core PostgreSQL tables).
- `Tier B (Derived Intelligence)`: 4 entities (Computed dynamically by Python services).
- `Tier C (Reference / Catalog Data)`: 3 entities (Taxonomies and seed lookup tables).
- `Tier D (User / Session Data)`: 1 entity (Redis token cache / stateless JWT).
- `Tier E (Event / History Data)`: 1 entity (Append-only audit logs).
- `Tier F (AI-Generated Data)`: 1 entity (Chat threads & message history).
- `Tier G (File / Document Metadata)`: 2 entities (Descriptors linked to S3 storage).
- `Tier H (Temporary / Prototype Data)`: 1 entity (Sample test fixtures).
- `Tier I (Frontend Presentation State)`: UI component state.

## 4. Core Identity Models
- Single polymorphic inheritance structure rooted in `User` (`email`, `password_hash`, `role`, `verified`).
- Role-specific extension tables: `Student`, `Faculty`, `Admin`, `Parent`.

## 5. Academic Models
- 9-level hierarchical curriculum model: `Institution → Department → Program → Batch → Course → Subject → Chapter → Topic → Concept`.

## 6. Batch Model
- Primary cohort grouping (`Batch`) with 1:N student membership.
- Feeds cohort-wide intelligence, batch health indicators, and Similar Issues clustering.

## 7. University/JEE/NEET Context
- **Strict Invariant:** Canonical domain isolation:
  - `University`: `domain="university"`, `examFamily=null`.
  - `JEE`: `domain="competitive"`, `examFamily="JEE"`.
  - `NEET`: `domain="competitive"`, `examFamily="NEET"`.
- **Mandate:** JEE Physics and NEET Physics must NEVER merge in storage, calculations, or student profiles.

## 8. Question Models
- Universal question model (`Question`) supporting both MCQ and Subjective formats with Blooms taxonomy, difficulty, marks, and provenance.

## 9. Exam Models
- Clear triad separation: `ExamDefinition` (blueprint) vs `QuestionPaper` (composed paper) vs `ExamAttempt` (student sitting).

## 10. ExamAttempt Model
- Comprehensive canonical contract documented in `05-EXAM-ATTEMPT-CONTRACT.md`.

## 11. QuestionAttempt Model
- Granular question-level telemetry record capturing `selectedAnswer`, `isCorrect`, `isSkipped`, `marksEarned`, `timeSpent`, `revisitCount`, and `answerChanges`.

## 12. Exam Agent Data
- Client-side exam conductor state machine delivering 9 standardized blueprints and compiling `ExamAttempt` on submission.

## 13. Student 360
- Composite derived view computed on request by `buildStudent360` engine; **DO NOT create a `student_360` table**.

## 14. Academic DNA
- Longitudinal mastery and trend signals derived dynamically from canonical attempts; separated into University, JEE, and NEET pools.

## 15. Similar Issues
- Algorithmic cohort clustering engine (`groupSimilarIssues`) grouping students by shared conceptual/speed deficits within isolated exam domains.

## 16. Intervention
- 9-state remediation machine (`Recommended → Planned → Assigned → In Progress → Completed → Re-test Pending → Evaluating → Resolved / Improving / Persistent`).

## 17. Practice / Re-test / Effectiveness
- `PracticeAttempt` and `RetestEntity` partitioned in PostgreSQL tables; evaluated by mathematical `computeEffectiveness` engine.

## 18. Question Paper / Paper Share
- Faculty paper generation blueprints and distribution share logs (`paper_shares`).

## 19. Notification
- Persistent user notification items in PostgreSQL `notifications` table.

## 20. File / Document Model
- Source document descriptors in `question_sources` referencing PDF binaries in S3.

## 21. Relationships
- Complete Mermaid ER diagram documented in Section 26 of `04-DATA-MODELS.md`.

## 22. ID Strategy
- Standardized PostgreSQL `UUIDv4` primary keys with semantic slug aliases for questions and sources.

## 23. Timestamp Strategy
- ISO 8601 UTC timestamps across all models; monotonicity invariant `submittedAt >= startedAt`.

## 24. Enum / Status Inventory
- Comprehensive table of 12 distinct system enums (Roles, Exam Modes, Exam Families, Difficulties, Question Types, Intervention Statuses, Outcomes).

## 25. Query Patterns
- Catalog of 6 primary operational query patterns across student, faculty, and administration.

## 26. Future Indexing Candidates
- Identified 9 high-impact B-Tree and Composite database indexes.

## 27. Current Data Ownership
- Mapped current prototype state across `localStorage`, in-memory datasets, and static modules.

## 28. Future Backend Ownership
- Mapped each entity to its future Python service, PostgreSQL table, or Redis cache.

## 29. localStorage Migration
- Complete migration guide documented in `10-LOCALSTORAGE-TO-DATABASE-MIGRATION.md` covering all 16 storage keys.

## 30. Demo / Prototype Data
- Isolation rules established (`WHERE is_demo = FALSE`) to prevent sample test fixtures from polluting production analytics.

## 31. Migration Risks
- 5 major migration risks identified with technical mitigation strategies.

## 32. Privacy Boundaries
- Student diagnostic data, weaknesses, and interventions restricted to authorized students and assigned faculty.

## 33. Database Design Warnings
- 8 strict negative constraints documented in Section 33 of `04-DATA-MODELS.md`.

## 34. Python/PostgreSQL Conceptual Mapping
- FastAPI $\rightarrow$ Pydantic $\rightarrow$ Service $\rightarrow$ Repository $\rightarrow$ SQLAlchemy $\rightarrow$ PostgreSQL architecture.

## 35. Normalization Observations
- Normalization directives for `paper_questions`, `intervention_students`, and telemetry JSONB columns.

## 36. Critical Entities
- Top 20 priority relational tables ranked for backend implementation.

## 37. API ↔ Data Model Mismatches
- Catalog of 5 known prototype shape differences mapped to relational target resolutions.

## 38. Intelligence ↔ Data Model Mismatches
- Verified that Student 360, Academic DNA, Similar Issues, and Effectiveness remain computed intelligence.

## 39. Validation
- Full cross-validation performed between Phase A, Phase B API contracts, Phase B OpenAPI specification, and Phase C data models.

## 40. Tests
- **`npm test`**: **153 / 153 passed** (100% pass rate).

## 41. Build
- **`npm run build`**: **Production build succeeded** without errors.

## 42. Application Changes
**NO APPLICATION CODE CHANGED.**
Only `docs/backend-integration/` contains new documentation files.

## Recommended Phase D
Recommend progressing to **DOCUMENTATION PHASE D: AUTHENTICATION, RBAC & SECURITY SPECIFICATION** (`docs/backend-integration/09-AUTH-RBAC-SECURITY.md`).