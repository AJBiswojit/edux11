# 05 — CANONICAL EXAMATTEMPT API & DATA CONTRACT

**Project:** MediXO EduX (`medixo-edux-platform` v1.0.0)
**Phase:** C — Data Model & Database Mapping Specification
**Document:** Canonical ExamAttempt Architecture & Contract
**Date:** 2026-08-23 · **Branch:** `arena/01a02f45-edux`
**Status:** Complete & Verified Specification

---

## 1. PURPOSE

The `ExamAttempt` is the foundational diagnostic data backbone of the MediXO EduX platform. Every analytical calculation, diagnostic engine, student profile metric, and faculty remediation workflow depends directly on the integrity and granularity of this contract.

Specifically, `ExamAttempt` serves as the authoritative source of truth for:
1. **Student Academic DNA Engine (`src/intelligence/engine/dna.js`):** Deriving longitudinal topic masteries, conceptual strength/weakness signals, error distributions, and cognitive persistence.
2. **AI Exam Analysis Dashboard (`src/intelligence/engine/exam-attempt-intelligence.js`):** Generating deep multidimensional attempt scorecards, subject breakdown charts, question-by-question review, time vs. accuracy matrices, and behavioral stamina indicators.
3. **Faculty Student 360 Diagnostic Bundle (`src/intelligence/faculty/engine/student-360.js`):** Assembling 360° individual student intelligence, domain-isolated subject masteries, historical attempt timelines, and question-level evidence rows.
4. **Faculty Similar Issues Clustering Engine (`src/intelligence/faculty/engine/similar-issues.js`):** Extracting student issue fingerprints and aggregating cohort-wide conceptual and pace deficits.
5. **Faculty Intervention Lifecycle & Effectiveness Engine (`src/intelligence/faculty/engine/intervention-lifecycle.js`):** Establishing pre-intervention baseline accuracy and evaluating post-remediation recovery against subsequent canonical attempts (`matchInterventionExamAttempts`).
6. **AI Exam Conducting Agent (`src/pages/student/ExamAgent.jsx`):** Delivering real-time examination experiences, capturing interaction telemetry, recording per-question dwell times, and persisting finalized evaluation records.

---

## 2. IDENTITY

- **Primary Identifier (`id`):** Unique attempt identifier string.
  - *Prototype Pattern:* Prefixed timestamp string, e.g. `"ea-attempt-1724425200000"` or seeded test IDs such as `"att_jee_01"`, `"att_neet_01"`, `"att_uni_01"`.
  - *Future Backend Database:* PostgreSQL `UUID` primary key (or canonical string ID mapped to UUID).
- **Immutability:** Once submitted, the attempt identity `id` is globally immutable.

---

## 3. STUDENT RELATIONSHIP

- **Student Identifier (`studentId`):** Foreign key string referencing the student account (`User` / `Student`).
  - *Example:* `"u_stu_001"`.
  - *Cardinality:* Many attempts belong to one student (`Student 1 ──< * ExamAttempt`).
- **Student Roll Number (`roll`):** Institutional academic roll number cached at attempt submission.
  - *Example:* `"2024CS1001"`.
- **Cohort References (`batchId`, `sectionId`):**
  - `batchId`: References student batch cohort (e.g. `"batch_cse_2024"`).
  - `sectionId`: References class section (e.g. `"sec_a"`).

---

## 4. EXAM RELATIONSHIP

- **Exam Paper Identifier (`examId`):** References the test blueprint or practice paper definition.
  - *Example:* `"ea_jee_full_01"` (Exam Agent paper), `"gp_1"` (Faculty generated paper).
- **Denormalized Titles:**
  - `examTitle` / `examName`: Full official title of examination (e.g. `"JEE Main Full Mock 1"`).
  - `shortTitle`: Abbreviated badge title (e.g. `"JEE Main Mock 1"`).
- **Exam Category & Type:**
  - `category`: Broad discipline category (`"Engineering"`, `"Medical"`, `"University"`, `"Computer Science"`).
  - `examType`: Examination classification (`"Full Mock"`, `"Chapter Test"`, `"Mid Semester"`, `"End Semester"`, `"Subject Quiz"`).

---

## 5. EXAM MODE

The `examMode` field establishes the top-level educational track:
- Allowed values:
  - `"University"`: Standard higher education degree curriculum (e.g. B.Tech Computer Science & Engineering).
  - `"Competitive"`: National competitive entrance examinations (e.g. JEE Main, NEET UG).

---

## 6. DOMAIN

- Lowercase canonical domain representation used in intelligence normalization:
  - `"university"` $\iff$ `examMode === "University"`
  - `"competitive"` $\iff$ `examMode === "Competitive"`

---

## 7. EXAM FAMILY

The `examFamily` field identifies the competitive examination board/stream:
- Allowed values:
  - `"JEE"`: Joint Entrance Examination (Engineering: Physics, Chemistry, Mathematics).
  - `"NEET"`: National Eligibility cum Entrance Test (Medical: Physics, Chemistry, Biology).
  - `null`: Explicitly `null` for all `University` domain examinations.

> ⚠️ **CRITICAL INVARIANT:** `examFamily` MUST be authoritative. It is NEVER inferred from subject name alone.

---

## 8. ACADEMIC CONTEXT

Denormalized academic context embedded within each `ExamAttempt` and per-question record:
- `subject`: Overall subject or subject group tested (e.g. `"Physics"`, `"PCM"`, `"PCB"`, `"CS501 Data Structures"`).
- `academicContext` object on each question attempt:
  - `subject`: Specific subject (e.g. `"Physics"`).
  - `chapter`: Specific curriculum chapter (e.g. `"Kinematics"`).
  - `topic`: Specific syllabus topic (e.g. `"Projectile Motion"`).
  - `concept`: Granular concept tested (e.g. `"Trajectory Equation"`).

---

## 9. SOURCE

Identifies the client subsystem or origin pipeline that generated the attempt:
- `"exam-agent"`: Live test conducted via AI Exam Conducting Agent.
- `"intervention-practice"`: Remedial practice test solved for an active intervention.
- `"intervention-retest"`: Formal diagnostic re-test scheduled by faculty.
- `"manual"`: Manually entered external exam score.
- `"historical-import"`: Migrated legacy student assessment history.

---

## 10. DEMO / PROTOTYPE FLAG

- `mode`: Mode string (`"manual"`, `"demo"`, `"practice"`).
- `mock`: Boolean flag (`true` indicates a deterministic sample/seed attempt, `false` indicates real user attempt).

> **Production Invariant:** Intelligence endpoints (`/intelligence/exam-attempts`, `/intelligence/summary`) exclude `mode === "demo"` by default (`includeDemo=false`). Seed history (`mock=true`) is isolated during production database migration.

---

## 11. TIMING

Comprehensive timestamp and elapsed duration tracking:
- `startedAt`: ISO 8601 UTC timestamp when student initiated the exam.
- `submittedAt`: ISO 8601 UTC timestamp when exam was completed and submitted.
- `completedAt`: ISO 8601 UTC completion timestamp (synonymous with `submittedAt`).
- `elapsedSeconds`: Total active test time in seconds (e.g. `5400` for 90 minutes).
- `timing` object:
  - `elapsedSeconds`: Number of seconds spent on examination.
  - `timeRemaining`: Seconds remaining on timer at submission.

---

## 12. SCORING

Evaluation metrics computed at attempt finalization:
- `scoring` object:
  - `score`: Total marks scored by student (e.g. `184`).
  - `maxScore`: Maximum attainable marks for exam (e.g. `300`).
  - `percentage`: Percentage score (`(score / maxScore) * 100`, e.g. `61.33`).
  - `accuracy`: Overall accuracy percentage on attempted questions (`(correct / attempted) * 100`, e.g. `78.5`).
  - `attemptRate`: Proportion of exam attempted (`(attempted / totalQuestions) * 100`, e.g. `80.0`).
- `summary` object:
  - `totalQuestions`: Total questions on paper (e.g. `75`).
  - `attempted`: Number of answered questions (e.g. `60`).
  - `correct`: Number of correctly answered questions (e.g. `48`).
  - `incorrect`: Number of wrong answers (e.g. `12`).
  - `skipped`: Number of skipped/unattempted questions (e.g. `15`).
  - `accuracy`: Accuracy percentage.
  - `avgTimePerQuestion`: Average seconds spent per attempted question (e.g. `90`).

---

## 13. QUESTION ATTEMPTS

Array of granular question-level interaction records (`questionAttempts`):

```json
[
  {
    "questionId": "q_jee_phy_001",
    "academicContext": {
      "subject": "Physics",
      "chapter": "Kinematics",
      "topic": "Projectile Motion",
      "concept": "Range Equation"
    },
    "difficulty": "Medium",
    "questionType": "MCQ",
    "response": {
      "selectedAnswer": "B",
      "selectedOptionIndex": 1,
      "status": "answered"
    },
    "evaluation": {
      "isCorrect": true,
      "isSkipped": false,
      "correctAnswer": "B",
      "marksEarned": 4,
      "negativeMarks": 0
    },
    "timing": {
      "timeSpent": 82,
      "firstVisitTime": 14,
      "revisitCount": 2
    },
    "behavior": {
      "answerChanges": 1,
      "markedForReview": false,
      "guessProbability": "Low"
    }
  }
]
```

---

## 14. BEHAVIOUR

Behavioral cognitive indicators captured during test delivery:
- `interactions` object: UI event telemetry (e.g. `{ "q1": { "visits": 2, "time": 82, "changed": true } }`).
- `behavioralSignals` (derived):
  - `pace`: Time management classification (`"Fast"`, `"Balanced"`, `"Slow"`).
  - `stamina`: Performance degradation in later test quarters (`"High"`, `"Fatigued"`, `"Inconsistent"`).
  - `guessingTendency`: Estimated blind guessing rate based on low dwell times on incorrect questions (`"Low"`, `"Moderate"`, `"High"`).

---

## 15. EVALUATION

- Evaluation occurs deterministically against the paper answer key.
- **Negative Marking Rubrics:**
  - JEE Main: Correct $+4$, Incorrect $-1$, Skipped $0$.
  - NEET UG: Correct $+4$, Incorrect $-1$, Skipped $0$.
  - University: Configurable per question marks, no negative marking by default.

---

## 16. INTERVENTION LINKAGE

- `interventionId` (nullable string): Foreign key referencing an active remediation plan in `Intervention`.
- **Matching Subsequent Attempts:**
  - The `matchInterventionExamAttempts` engine searches canonical attempts submitted *after* intervention assignment/re-test.
  - Matches on identical domain (`University` vs `Competitive`), matching `examFamily`, and overlapping subject/chapter.
  - The first strict subsequent attempt serves as the deterministic post-exam comparison endpoint for effectiveness evaluation.

---

## 17. LIFECYCLE

```
1. Creation / Initialization (Exam Agent launches test blueprint)
   ↓
2. Active Telemetry Capture (Dwell times, option clicks, review flags)
   ↓
3. Submission & Finalization (Timer expiry or student manual submit)
   ↓
4. Scoring & Question Evaluation (Marks, accuracy, summary compiled)
   ↓
5. Canonical Persistence (Stored to database)
   ↓
6. Intelligence Propagation (Feeds Academic DNA, Student 360, Similar Issues, Interventions)
```

---

## 18. CONSUMERS

| Consumer Component | Service Hook | Consumed Endpoint |
|---|---|---|
| `ExamAgent` | `useExamAgentAttempts` | `GET /student/exam-agent/attempts` |
| `ExamAgent` Results View | `useExamAgentAttempt(id)` | `GET /student/exam-agent/attempts/:id` |
| `ExamAnalysis` | `useExamAnalysisById(id)` | `GET /student/exam-analysis/:id` |
| `StudentProfile` (Student 360) | `useFacultyStudent360(id)` | `GET /faculty/students/:id/360` |
| `FacultyAttemptAnalysis` | `useFacultyAttemptAnalysis` | `GET /faculty/students/:id/exams/:attemptId/analysis` |
| `PerformanceAccuracy` | `useIntelligenceExamDnaSignals` | `GET /intelligence/exam-dna-signals` |
| `Student Dashboard` | `useStudentIntelligence` | `GET /intelligence/summary` |
| `SimilarIssuesClusterGrid` | `useSimilarIssues` | `GET /faculty/similar-issues` |
| `InterventionCenter` | `useInterventions` | `GET /faculty/interventions` |

---

## 19. INTELLIGENCE DEPENDENCIES

1. `src/intelligence/engine/exam-attempt-intelligence.js`: `normalizeExamAttempt`, `filterExamAttempts`, `buildAttemptAnalysisVariant`.
2. `src/intelligence/engine/dna.js`: `buildExamEvidence`, `computeSubjectProficiency`.
3. `src/intelligence/faculty/engine/similar-issues.js`: `computeStudentIssueFingerprints`.
4. `src/intelligence/faculty/engine/student-360.js`: `computeStudentQuestionIntelligence`.
5. `src/intelligence/faculty/engine/intervention-lifecycle.js`: `matchInterventionExamAttempts`, `computeEffectiveness`.

---

## 20. API DEPENDENCIES

- `POST /student/exam-agent/attempts`: Primary write pipeline.
- `GET /student/exam-agent/attempts`: Real attempt read pipeline.
- `GET /student/exam-agent/attempts/:id`: Single attempt review.
- `GET /intelligence/exam-attempts`: Filtered canonical query endpoint.
- `GET /student/exam-analysis/:id`: Attempt-aware AI analysis.

---

## 21. REQUIRED FIELDS

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique attempt identifier |
| `studentId` | `string` | Referenced student ID |
| `examId` | `string` | Referenced exam blueprint ID |
| `examTitle` | `string` | Full examination title |
| `examMode` | `string` | `'University'` or `'Competitive'` |
| `startedAt` | `string` | ISO 8601 start timestamp |
| `submittedAt` | `string` | ISO 8601 submission timestamp |
| `scoring` | `object` | Scoring metrics (`score`, `maxScore`, `accuracy`) |
| `questionAttempts` | `array` | Granular question records |

---

## 22. OPTIONAL FIELDS

- `shortTitle`: String badge label.
- `category`: Discipline category string.
- `examName`: Alias for `examTitle`.
- `examType`: Test type (`'Full Mock'`, `'Chapter Test'`).
- `mode`: Mode string (`'manual'`, `'demo'`, `'practice'`).
- `source`: Subsystem tag (`'exam-agent'`, `'intervention-practice'`).
- `timing`: Dwell timing object.
- `summary`: Attempt summary counts object.
- `interactions`: Raw UI telemetry object.

---

## 23. NULLABLE FIELDS

- `examFamily`: String (`'JEE'`, `'NEET'`) or `null` (MUST be `null` for all University exams).
- `interventionId`: String ID of linked remediation plan, or `null` for standard exams.
- `roll`: String student roll number, or `null`.
- `batchId`: String batch cohort ID, or `null`.
- `sectionId`: String class section ID, or `null`.
- `topic` / `concept`: String topic/concept in `academicContext`, or `null`.

---

## 24. VALIDATION RULES

1. **Identity Integrity:** `studentId` must reference a valid student user.
2. **Question Completeness:** `questionAttempts` array must not be empty.
3. **Timestamp Monotonicity:** `submittedAt >= startedAt`.
4. **Score Bounds:** `score <= maxScore` and `score >= (maxScore * -1)` (in negative marking).
5. **Accuracy Bounds:** `0.0 <= accuracy <= 100.0`.
6. **Elapsed Time Bounds:** `elapsedSeconds >= 0`.

---

## 25. DOMAIN ISOLATION

### Critical Invariant
- **University Attempt:** `examMode === "University"` and `examFamily === null`.
- **JEE Attempt:** `examMode === "Competitive"` and `examFamily === "JEE"`.
- **NEET Attempt:** `examMode === "Competitive"` and `examFamily === "NEET"`.

> **MANDATE:** Under NO circumstances may JEE Physics attempts and NEET Physics attempts be merged or averaged together in student profiles, academic DNA, batch analytics, or Similar Issues clustering.

---

## 26. PRACTICE VS OFFICIAL ATTEMPT

- **Practice / Remedial Attempts:**
  - Generated for interventions or mock study rooms (`source === "intervention-practice"`).
  - Evaluated against intervention objectives.
  - **MUST NOT contaminate official university GPA, class rank, or formal examination statistics.**
- **Official / Exam Agent Attempts:**
  - Formal assessment events (`source === "exam-agent"`).
  - Contribute to official institution transcripts, batch performance, and longitudinal DNA.

---

## 27. PERSISTENCE REQUIREMENTS

- **Current Prototype:** Persisted in `localStorage` under key `'EduX_student_exam_attempts'` (unshifts latest attempt to head of array).
- **Future Backend Database:**
  - Header record persisted in `exam_attempts` PostgreSQL table.
  - Child question records persisted in `question_attempts` table referencing `exam_attempt_id`.
  - Telemetry interactions stored in `JSONB` column `interactions`.

---

## 28. MIGRATION RISKS

1. **Seed Data Pollution:** Sample seeds (`mock: true` in `attempt-seeds.js`) must be excluded from production student history tables.
2. **Duplicate LocalStorage IDs:** Client-generated timestamps (`ea-attempt-${Date.now()}`) may clash if clocks drift; backend must assign server-side UUIDs.
3. **Schema Normalization:** Prototype allows denormalized `exam` blueprints inside attempt payloads; backend database must maintain foreign keys to `question_papers` and `questions` while archiving frozen snapshots for historical auditability.
4. **Missing Question Records:** If a question was edited in Question Studio after an attempt was submitted, the attempt's `questionAttempt` must preserve the verbatim question text tested at that point in time.