# 03 — ROUTES AND UI MODULES

**Project:** MediXO EduX · **Phase A** — documentation only (no routes were modified).
**Source:** `src/routes/index.jsx` (all route declarations), `src/routes/ProtectedRoute.jsx`, `src/config/index.js` (`ROLES`, `FEATURE_FLAGS`), page files under `src/pages/**`, service modules under `src/services/**`, endpoint registrations under `src/api/**`.
**Counts (verified against the router file):** **123 `<Route>` registrations** = 113 leaf path routes (incl. 12 legacy redirects, `/403` and `*`) + 4 portal wrapper routes (`/student`, `/faculty`, `/admin`, `/parent`) + 4 portal index routes + 2 pathless layout routes (`LandingLayout`, `AuthLayout`). **145 API endpoints** registered by the prototype adapter (105 GET · 34 POST · 4 PATCH · 2 DELETE). Roles: `student`, `faculty`, `admin`, `parent`.

Legend used below:
- "—" under API = page renders purely from route-level data already listed / local state (no additional endpoint).
- `PATH` params are URL segments; `QUERY` params are deep-link query parameters actually read by the page (see §8 for the full param catalogue).

---

## 1. Route Inventory

### 1.1 Landing / public (11) — layout `LandingLayout`, no auth

| Route | Page component | Purpose | Primary service | Primary API |
|---|---|---|---|---|
| `/` | `landing/Home` | Marketing home | dataset-driven sections | — (datasets direct) |
| `/about` | `landing/About` | Company page | — | — |
| `/pricing` | `landing/PricingPage` | Pricing | — | — |
| `/case-studies` | `landing/CaseStudies` | Case studies | `useCaseStudies` | `GET /platform/case-studies` |
| `/blog` | `landing/Blog` | Blog list | `useBlogPosts` | `GET /platform/blog` |
| `/blog/:id` | `landing/BlogPost` | Article | `useBlogPost(id)` | `GET /platform/blog/:id` |
| `/contact` | `landing/Contact` | Contact form | mutation | `POST /platform/contact`, `GET /platform/contact` |
| `/careers` | `landing/Careers` | Open roles | `useCareers` | `GET /platform/careers` |
| `/media` | `landing/Media` | Press kit | — | — |
| `/privacy` | `landing/Legal.Privacy` | Privacy policy | — | — |
| `/terms` | `landing/Legal.Terms` | Terms | — | — |

(Newsletter signup on landing: `POST /platform/newsletter`.)

### 1.2 Authentication (8) — layout `AuthLayout`, no auth

| Route | Page component | Purpose | Primary service | Primary API |
|---|---|---|---|---|
| `/auth/login` | `auth/Login` | Sign in (role tab state) | `AuthContext.login` (client-side prototype) | **no login endpoint exists** — see note |
| `/auth/login/:role` | `auth/Login` | Sign in pre-scoped to a role (`PATH`: role) | `AuthContext.login` | — |
| `/auth/forgot-password` | `auth/ForgotPassword` | Request OTP reset | `useForgotPassword` | `POST /auth/forgot-password` |
| `/auth/verify-otp` | `auth/OTPVerify` | OTP entry (also `?purpose=register`) | `useVerifyOtp`, `useResendOtp` | `POST /auth/verify-otp`, `POST /auth/resend-otp` |
| `/auth/reset-password` | `auth/ResetPassword` | New password | `useResetPassword` | `POST /auth/reset-password` |
| `/auth/verify-email` | `auth/VerifyEmail` | Email verification | `useVerifyEmail` | `POST /auth/verify-email` |
| `/auth/register` | `auth/Register` | 2-step student registration (university + competitive context) | `useRegistrationOptions`, `useRegister`, `useRegisterVerifyOtp` | `GET /auth/registration/options`, `POST /auth/register`, `POST /auth/register/verify` |
| `/auth/profile-setup` | `auth/ProfileSetup` | Profile completion placeholder (auth flow runs through AuthContext + OTP mutations; `useProfileSetup` retired in Phase 3) | AuthContext | — |

> **Login note (source of truth):** there is **no `POST /auth/login` endpoint** in the prototype adapter. Login validates client-side against `DEMO_USERS` (`src/datasets/platform/users.js`, password `Edux12345`) and the `EduX_registered_students` localStorage registry. The axios layer *does* already implement `POST /auth/refresh` expectations for a real backend (`src/api/axios.js`). A future backend must add real login/logout — currently **NOT CURRENTLY DEFINED**.

### 1.3 Student portal (25 = index + 24) — `/student` + `ProtectedRoute[student]` + `AppLayout`

| Route | Page component | Purpose | Primary service(s) | Primary API |
|---|---|---|---|---|
| `/student` (index) | `student/Dashboard` | Student home (daily brief, KPIs) | `useStudentIntelligence` | `GET /intelligence/summary` |
| `/student/programs` | `student/Programs` | Program/semester view | `useStudentPrograms` | `GET /student/programs` |
| `/student/forum` | `student/Forum` | Discussion forum | `useForum` | `GET /student/forum` |
| `/student/support` | `student/Support` | Support tickets | `useSupportTickets`, `useCreateSupportTicket` | `GET/POST /student/support` |
| `/student/attendance` | `student/Attendance` | Attendance analytics | `useStudentIntelligence` | `GET /intelligence/summary` |
| `/student/assignments` | `student/Assignments` | Assignments (dropzone upload UI) | `useStudentIntelligence` | `GET /intelligence/summary` |
| `/student/courses` | `student/Courses` | Enrolled courses | `useStudentIntelligence` | `GET /intelligence/summary` |
| `/student/courses/:id` | `student/CourseDetail` | One course (`PATH`: id) | `useStudentIntelligence` | `GET /intelligence/summary` |
| `/student/subjects` | `student/Subjects` | Semester subjects | `useStudentIntelligence` | `GET /intelligence/summary` |
| `/student/academics` | `student/Academics` | Academics hub (`?tab=`) | `useStudentIntelligence` | `GET /intelligence/summary` |
| `/student/portfolio` | `student/Portfolio` | Digital portfolio | `useStudentIntelligence` | `GET /intelligence/summary` |
| `/student/progress-report` | `student/ProgressReport` | AI academic progress report (`?period=`) | `useStudentIntelligence` (+ `buildProgressReport` engine) | `GET /intelligence/summary` |
| `/student/ai-tutor` | `student/AITutor` | AI Tutor chat | `useAITutorThreads`, `useAITutorRespond`, `useAIStats` | `GET /ai/tutor/threads`, `POST /ai/tutor/respond`, `GET /ai/stats` |
| `/student/ai-copilot` | `student/AICopilot` | AI Copilot chat + graph search | `useAITutorRespond`, `useGraphSearch` | `POST /ai/tutor/respond`, `GET /ai/graph-search?q=` |
| `/student/mentor` | `student/Mentor` | MediXO Mentor workspace (`?tab=chat|…`) | `useMentorWorkspace`, `useStudentIntelligence` | `GET /student/mentor/workspace`, `GET /intelligence/summary` |
| `/student/learning-path` | `student/LearningPath` | AI learning path | `useLearningPath` | `GET /ai/learning-path` |
| `/student/calendar` | `student/CalendarPage` | Calendar | `useStudentIntelligence` | `GET /intelligence/summary` |
| `/student/mock-tests` | `student/MockTests` | Legacy deep-link page reusing `MockTestsContent` | `useMockTests` (via component) | `GET /student/mock-tests` |
| `/student/exams` | `student/Exams` | Exam list + admit card | `useExams`, `useAdmitCard` | `GET /student/exams`, `GET /student/admit-card` |
| `/student/examinations` | `student/Examinations` | Examination Intelligence hub (`?tab=`, `?family=`) | `useStudentIntelligence`, `useExamAgentExams`, `useStudentInterventions`, `useMasterStudentProfile`, `useAdmitCard` | `GET /intelligence/summary`, `GET /student/exam-agent/exams`, `GET /student/interventions?studentId=`, `GET /intelligence/profile`, `GET /student/admit-card` |
| `/student/exam-agent` | `student/ExamAgent` | **AI Exam Conducting Agent** (`?exam=&attempt=&mode=`) | `useExamAgentExams/Attempts/Attempt`, `useSaveExamAgentAttempt`, `useStudentIntelligence`, `useMasterStudentProfile` | `GET /student/exam-agent/exams`, `GET /student/exam-agent/attempts[/:id]`, `POST /student/exam-agent/attempts`, `GET /intelligence/summary`, `GET /intelligence/profile` |
| `/student/interventions` | `student/Interventions` | **My Interventions** (practice + re-test runner) | `useStudentInterventions`, `useStudentInterventionPractice`, `useStudentInterventionRetest`, `useSubmitInterventionAttempt`, `useMasterStudentProfile` | `GET /student/interventions?studentId=`, `GET /student/interventions/:id/practice`, `GET /student/interventions/:id/retest`, `POST /student/interventions/:id/practice-attempts`, `GET /intelligence/profile` |
| `/student/exam-analysis` | `student/ExamAnalysis` | **AI Exam Analysis** (select attempt → analysis) | `useExamAnalysisOptions`, `useExamAnalysisById` | `GET /student/exam-analysis/options`, `GET /student/exam-analysis/:id` |
| `/student/performance-accuracy` | `student/PerformanceAccuracy` | Performance & accuracy (`?tab=`) | `useStudentIntelligence` | `GET /intelligence/summary` |
| `/student/settings` | `student/Settings` | Preferences | `useStudentSettings`, `useUpdateStudentSettings` | `GET/PATCH /student/settings` |

### 1.4 Faculty portal (25 = index + 24, of which 6 are legacy redirects) — `/faculty` + `ProtectedRoute[faculty]`

| Route | Page component | Purpose | Primary service(s) | Primary API |
|---|---|---|---|---|
| `/faculty` (index) | `faculty/Dashboard` | Faculty home | `useFacultyIntelligence` | `GET /faculty-intelligence/summary` |
| `/faculty/teaching` | `faculty/TeachingWorkspace` | **Teaching Workspace** (`?tab=`) | `useFacultyIntelligence` | `GET /faculty-intelligence/summary` |
| `/faculty/support` | `faculty/Support` | Support tickets | `useSupportTickets`, `useCreateSupportTicket` | `GET/POST /student/support` *(shared student support endpoint — see §10 note)* |
| `/faculty/courses` | `faculty/CourseOverview` | Course overview | `useFacultyCourses` | `GET /faculty/courses` |
| `/faculty/quiz-builder` | `faculty/QuizBuilder` | Quiz builder | `useFacultyQuizBuilder` | `GET /faculty/quiz-builder` |
| `/faculty/timetable` | `faculty/Timetable` | Timetable/calendar | `useFacultyTimetable` | `GET /faculty/timetable` |
| `/faculty/announcements` | `faculty/Announcements` | Announcements | `useFacultyAnnouncements` | `GET /faculty/announcements` |
| `/faculty/ai-studio` | **redirect** | Legacy → `/faculty/ai-assistant?tab=content` (query preserved) | — | — |
| `/faculty/attendance` | `faculty/Attendance` | Attendance management | `useFacultyAttendance` | `GET /faculty/attendance` |
| `/faculty/assignments` | `faculty/Assignments` | Assignments | `useFacultyAssignments` | `GET /faculty/assignments` |
| `/faculty/question-bank` | **redirect** | Legacy → `/faculty/question-intelligence?tab=question-intelligence` | — | — |
| `/faculty/question-intelligence` | `faculty/QuestionIntelligence` | **Assessment Intelligence workspace** (tabs: overview · question-intelligence · pyq · paper-generator · library · analytics; `?tab=&subject=&chapter=&family=&intervention=&mode=&exam=&topic=&difficulty=&count=&duration=&marks=&title=`) | `usePYQAnalysis`, `useQuestionBank`, `useFacultyIntelligence`, `usePYQFilters`, paper hooks, studio hooks (AI Question Studio tab page: `/faculty` child below) | `GET /faculty/pyq-analysis[/filters|/patterns|/analytics]`, `GET /faculty/question-bank`, `GET /faculty-intelligence/summary`, `GET /faculty/paper-generator`, paper CRUD/share endpoints (see matrix) |
| `/faculty/paper-generator` | **redirect** | Legacy → `/faculty/question-intelligence?tab=paper-generator` (query preserved) | — | — |
| `/faculty/pyq-analysis` | **redirect** | Legacy → `/faculty/question-intelligence?tab=pyq` | — | — |
| `/faculty/ai-assistant` | `faculty/AITeachingAssistant` | **AI Workspace** (`?tab=`) | `useFacultyIntelligence`, AI assistant hooks | `GET /faculty-intelligence/summary`, `GET /ai/assistant/threads`, `POST /ai/assistant/respond`, `GET /ai/stats` |
| `/faculty/my-students` | `faculty/MyStudents` | **My Students** (`?view=students|batches|issues|interventions`) | `useFacultyStudents`, `useSimilarIssues`, `useInterventions`, group/individual intervention hooks | `GET /faculty/students`, `GET /faculty/similar-issues?scope=`, `GET /faculty/interventions`, + evidence/preflight/create endpoints |
| `/faculty/my-students/:studentId` | `faculty/StudentProfile` | **Student 360** (`PATH`: studentId; `?context=&tab=&subject=&chapter=`) | `useFacultyStudent360`, `useSimilarIssues` (+ interventions panel in `intervention-center.jsx` uses `useFacultyStudentInterventions`, `useIntervention`, `useInterventionPractice`, `useCreateStudent360Intervention`), `useWeakTopicQuestions` | `GET /faculty/students/:id/360`, `GET /faculty/students/:id/interventions`, `GET /faculty/students/weak-topic-questions?subject=&chapter=` |
| `/faculty/students/:studentId/360` | **redirect** | Legacy alias → `/faculty/my-students/:studentId` (query preserved) | — | — |
| `/faculty/my-students/:studentId/exams/:attemptId` | `faculty/FacultyAttemptAnalysis` | Per-attempt analysis (canonical route) | `useFacultyAttemptAnalysis(studentId, attemptId)` | `GET /faculty/students/:id/exams/:attemptId/analysis` |
| `/faculty/students/:studentId/exams/:attemptId/analysis` | **redirect** | Legacy alias → canonical my-students attempt route | — | — |
| `/faculty/research` | `faculty/Research` | Research profile | `useFacultyResearch` | `GET /faculty/research` |
| `/faculty/lecture-planner` | `faculty/LecturePlanner` | Lecture planning | `useFacultyLecturePlanner` | `GET /faculty/lecture-planner` |
| `/faculty/exam-builder` | `faculty/ExamBuilder` | Exam builder | `useFacultyExamBuilder` | `GET /faculty/exam-builder` |
| `/faculty/reports` | `faculty/Reports` | Reports (`?tab=`, `?template=`) | `useFacultyIntelligence`, `useFacultyReports`, `useCreateReport`, `useDeleteReport`, `useArchiveReport` | `GET /faculty-intelligence/summary`, `GET /faculty/reports`, `POST /faculty/reports`, `DELETE /faculty/reports/:id`, `PATCH /faculty/reports/:id/archive` |
| `/faculty/settings` | `faculty/Settings` | Preferences | `useFacultySettings` | `GET /faculty/settings` |
| `/faculty/question-studio` *(page exists: `faculty/AIQuestionStudio`)* | — | **AI Question Studio page component exists and is fully wired** (`useQuestionStudioSummary`, `useStudioSessions`, `useUploadSource`, …) but has **no route registration** in `src/routes/index.jsx` — the studio is reached as part of the Assessment Intelligence workspace | question-studio hooks | `/faculty/question-studio/*` (12 endpoints) |

### 1.5 Admin portal (32 = index + 31, of which 6 are legacy redirects) — `/admin` + `ProtectedRoute[admin]`

| Route | Page component | Purpose | Primary service | Primary API |
|---|---|---|---|---|
| `/admin` (index) | `admin/Dashboard` | Admin home | `useAdminIntelligence` | `GET /admin-intelligence/summary` |
| `/admin/institution-intelligence` | `admin/InstitutionIntelligence` | **Institution Intelligence workspace** (`?tab=`) | `useAdminIntelligence` (+ reused services per tab) | `GET /admin-intelligence/summary` |
| `/admin/reports` | `admin/Reports` | Executive reports | `useAdminIntelligence` | `GET /admin-intelligence/summary` |
| `/admin/ai-workspace` | `admin/AIWorkspace` | **AI Workspace** | `useAdminIntelligence` (+ admin AI chat local persistence) | `GET /admin-intelligence/summary` |
| `/admin/support` | `admin/Support` | Support console (UI-local demo) | — (no service hook) | — |
| `/admin/revenue` | `admin/Revenue` | Revenue analytics | `useAdminRevenue` | `GET /admin/revenue` |
| `/admin/programs` | `admin/Programs` | Programs | `useAdminPrograms` | `GET /admin/programs` |
| `/admin/subjects` | `admin/Subjects` | Subjects | `useAdminSubjects` | `GET /admin/subjects` |
| `/admin/batches` | `admin/Batches` | Batches | `useAdminBatches` | `GET /admin/batches` |
| `/admin/calendar` | `admin/AcademicCalendar` | Academic calendar | `useAdminCalendar` | `GET /admin/calendar` |
| `/admin/faculty` | `admin/Faculty` | Faculty directory | `useAdminFaculty` | `GET /admin/faculty` |
| `/admin/students` | `admin/Students` | Student directory | `useAdminStudents` | `GET /admin/students` |
| `/admin/attendance-analytics` | **redirect** | → `/admin/institution-intelligence?tab=attendance` | — | — |
| `/admin/assignment-analytics` | **redirect** | → `/admin/institution-intelligence?tab=attendance` | — | — |
| `/admin/exam-analytics` | **redirect** | → `/admin/institution-intelligence?tab=assessment` | — | — |
| `/admin/question-bank` | `admin/QuestionBank` | Institution question bank | `useAdminQuestionBank` | `GET /admin/question-bank` |
| `/admin/scholarships` | `admin/Scholarships` | Scholarships | `useAdminScholarships` | `GET /admin/scholarships` |
| `/admin/cms` | `admin/Cms` | CMS | `useAdminCms` | `GET /admin/cms` |
| `/admin/api-config` | `admin/ApiConfig` | API configuration | `useAdminApiConfig` | `GET /admin/api-config` |
| `/admin/data-tools` | `admin/DataTools` | Export/import tools | `useAdminDataTools` | `GET /admin/data-tools` |
| `/admin/users` | `admin/Users` | All users | `useAdminUsers` | `GET /admin/users` |
| `/admin/departments` | `admin/Departments` | Departments | `useAdminDepartments` | `GET /admin/departments` |
| `/admin/courses` | `admin/Courses` | Courses | `useAdminCourses` | `GET /admin/courses` |
| `/admin/academic-analytics` | **redirect** | → `/admin/institution-intelligence?tab=academic` | — | — |
| `/admin/performance` | **redirect** | → `/admin/institution-intelligence?tab=students` | — | — |
| `/admin/placements` | **redirect** | → `/admin/institution-intelligence?tab=outcomes` | — | — |
| `/admin/research` | `admin/Research` | Research admin | `useAdminResearch` | `GET /admin/research` |
| `/admin/roles` | `admin/Roles` | Roles | `useAdminRoles` | `GET /admin/roles` |
| `/admin/permissions` | `admin/Permissions` | Permissions matrix | `useAdminPermissions` | `GET /admin/permissions` |
| `/admin/audit-logs` | `admin/AuditLogs` | Audit logs | `useAdminAuditLogs` | `GET /admin/audit-logs` |
| `/admin/ai-config` | `admin/AiConfig` | AI configuration | `useAdminAiConfig` | `GET /admin/ai-config` |
| `/admin/settings` | `admin/Settings` | Institution settings | `useAdminSettings` | `GET /admin/settings` |

### 1.6 Parent portal (14 = index + 13) — `/parent` + `ParentGate` + `ProtectedRoute[parent]`; **currently disabled** (`FEATURE_FLAGS.parentPortal === false` ⇒ redirect to `/auth/login?role=parent`)

| Route | Page component | Purpose | Primary service | Primary API |
|---|---|---|---|---|
| `/parent` (index) | `parent/Dashboard` | Parent home | `useParentDashboard` | `GET /parent/dashboard` |
| `/parent/assignments` | `parent/Assignments` | Ward assignments | `useParentAssignments` | `GET /parent/assignments` |
| `/parent/fees` | `parent/Fees` | Fee summary | `useParentFees` | `GET /parent/fees` |
| `/parent/behavior` | `parent/Behavior` | Behaviour reports | `useParentBehavior` | `GET /parent/behavior` |
| `/parent/calendar` | `parent/CalendarPage` | Calendar | `useParentEvents` | `GET /parent/events` |
| `/parent/downloads` | `parent/Downloads` | Downloads | `useParentDownloads` | `GET /parent/downloads` |
| `/parent/settings` | `parent/Settings` | Settings | `useParentSettings`, `useUpdateParentSettings` | `GET/PATCH /parent/settings` |
| `/parent/progress` | `parent/Progress` | Ward progress | `useParentProgress` | `GET /parent/progress` |
| `/parent/attendance` | `parent/Attendance` | Attendance | `useParentAttendance` | `GET /parent/attendance` |
| `/parent/performance` | `parent/Performance` | Performance | `useParentPerformance` | `GET /parent/performance` |
| `/parent/exam-results` | `parent/ExamResults` | Exam results | `useParentExamResults` | `GET /parent/exam-results` |
| `/parent/communication` | `parent/Communication` | Teacher communication | `useParentCommunication` | `GET /parent/communication` |
| `/parent/ai-insights` | `parent/AIInsights` | AI insights | `useParentAIInsights` | `GET /parent/ai-insights` |
| `/parent/reports` | `parent/Reports` | Reports | `useParentReports` | `GET /parent/reports` |

*(Parent notifications page `parent/Notifications.jsx` + `GET /parent/notifications` endpoint exist; the notifications route is linked from NAV_GROUPS but **is not registered in `src/routes/index.jsx`** — navigating there currently falls through to NotFound. Documented as-is; discrepancy recorded, not "fixed".)*

### 1.7 Shared & fallback (2)

| Route | Page component | Purpose |
|---|---|---|
| `/403` | `Forbidden` | Role-mismatch screen from `ProtectedRoute` |
| `*` | `NotFound` | Fallback for unknown URLs |

---

## 2. UI → SERVICE → API MATRIX

Complete matrix of every service hook → endpoint mapping (this is the full API surface a backend must serve — 145 endpoints). Query keys shown where helpful.

### 2.1 Auth + Platform

| Route / consumer | Hook (service file) | API endpoint | Purpose |
|---|---|---|---|
| `/auth/forgot-password` | `useForgotPassword` (auth.js) | `POST /auth/forgot-password` | Request password reset OTP |
| `/auth/verify-otp` | `useVerifyOtp` / `useResendOtp` (auth.js) | `POST /auth/verify-otp` · `POST /auth/resend-otp` | Verify / resend OTP |
| `/auth/reset-password` | `useResetPassword` (auth.js) | `POST /auth/reset-password` | Set new password |
| `/auth/verify-email` | `useVerifyEmail` (auth.js) | `POST /auth/verify-email` | Email verification |
| `/auth/register` | `useRegistrationOptions` (auth.js) | `GET /auth/registration/options` | Institutions/degrees/branches/exam families for step 2 |
| `/auth/register` | `useRegister` (auth.js) | `POST /auth/register` | Create registration draft |
| `/auth/register` → OTP | `useRegisterVerifyOtp` (auth.js) | `POST /auth/register/verify` | Verify registration OTP |
| Landing blog | `useBlogPosts` / `useBlogPost` (auth.js) | `GET /platform/blog` · `GET /platform/blog/:id` | Blog content |
| Landing careers | `useCareers` (auth.js) | `GET /platform/careers` | Open roles |
| Landing case studies | `useCaseStudies` (auth.js) | `GET /platform/case-studies` | Case studies |
| Landing contact | form mutation (auth.js patterns) | `POST /platform/contact` · `GET /platform/contact` | Contact submit/info |
| Landing newsletter | form mutation | `POST /platform/newsletter` | Subscribe |

### 2.2 Student intelligence + academics + exams + interventions

| Route | Page | Service hook | API endpoint | Purpose |
|---|---|---|---|---|
| `/student` + 12 intelligence pages | Dashboard/Academics/Attendance/Assignments/Courses/CourseDetail/Subjects/Calendar/Portfolio/ProgressReport/PerformanceAccuracy/Examinations | `useStudentIntelligence` (intelligence.js) | `GET /intelligence/summary` | Canonical snapshot (profile+datasets+derived) |
| (identity) | ExamAgent/Interventions/Examinations | `useMasterStudentProfile` (intelligence.js) | `GET /intelligence/profile` | Student identity for attempts |
| (intelligence consumers) | — | `useIntelligenceExamAttempts(params)` (intelligence.js) | `GET /intelligence/exam-attempts?studentId&roll&examMode&examFamily&examId&batchId&sectionId&includeDemo&includeSeeds` | Canonical attempts with filters |
| (DNA consumers) | — | `useIntelligenceExamDnaSignals` (intelligence.js) | `GET /intelligence/exam-dna-signals` | DNA evidence pools (University vs Competitive separate) |
| `/student/programs` | Programs | `useStudentPrograms` (extra.js) | `GET /student/programs` | Program data |
| `/student/forum` | Forum | `useForum` (extra.js) | `GET /student/forum` | Topics/categories |
| `/student/support` | Support | `useSupportTickets` / `useCreateSupportTicket` (extra.js) | `GET /student/support` · `POST /student/support` | Tickets |
| `/student/mock-tests` | MockTests | `useMockTests` (index.js) | `GET /student/mock-tests` | Mock test list |
| `/student/exams` | Exams | `useExams` (index.js) · `useAdmitCard` (extra.js) | `GET /student/exams` · `GET /student/admit-card` | Exam list / admit card |
| `/student/settings` | Settings | `useStudentSettings` / `useUpdateStudentSettings` (index.js) | `GET /student/settings` · `PATCH /student/settings` | Preferences |
| `/student/mentor` | Mentor | `useMentorWorkspace` (extra.js) | `GET /student/mentor/workspace` | Mentor workspace bundle |
| `/student/exam-agent` | ExamAgent | `useExamAgentExams` (exam-agent.js) | `GET /student/exam-agent/exams` | 9 practice papers |
| `/student/exam-agent` | ExamAgent | `useExamAgentAttempts` (exam-agent.js) | `GET /student/exam-agent/attempts` | Own attempt history (localStorage only) |
| `/student/exam-agent` | ExamAgent | `useExamAgentAttempt(id)` (exam-agent.js) | `GET /student/exam-agent/attempts/:id` | Deep-linked attempt |
| `/student/exam-agent` | ExamAgent | `useSaveExamAgentAttempt` (exam-agent.js) | `POST /student/exam-agent/attempts` | Persist canonical attempt |
| `/student/exam-analysis` | ExamAnalysis | `useExamAnalysisOptions` (extra.js) | `GET /student/exam-analysis/options` | Analysis option set (incl. attempt options) |
| `/student/exam-analysis` | ExamAnalysis | `useExamAnalysisById(id)` (extra.js) | `GET /student/exam-analysis/:id` | Per-attempt analysis variant |
| `/student/interventions` | Interventions | `useStudentInterventions(studentId)` (faculty-interventions.js) | `GET /student/interventions?studentId=` | Assigned interventions + outcome |
| `/student/interventions` | Interventions | `useStudentInterventionPractice(id)` | `GET /student/interventions/:id/practice` | Selected practice set |
| `/student/interventions` | Interventions | `useStudentInterventionRetest(id)` | `GET /student/interventions/:id/retest` | Re-test entity |
| `/student/interventions` | Interventions | `useSubmitInterventionAttempt` | `POST /student/interventions/:id/practice-attempts` | Record practice/re-test attempt |
| `/student/ai-tutor` · `/student/ai-copilot` | AITutor/AICopilot | `useAITutorThreads` / `useAITutorRespond` / `useAIStats` (index.js) | `GET /ai/tutor/threads` · `POST /ai/tutor/respond` · `GET /ai/stats` | Chat |
| `/student/ai-copilot` | AICopilot | `useCopilotSuggestions(path)` | `GET /ai/copilot/suggestions` | Page-aware suggestions |
| `/student/ai-copilot` | AICopilot | `useGraphSearch(q)` | `GET /ai/graph-search?q=` | Knowledge-graph search |
| `/student/learning-path` | LearningPath | `useLearningPath` (index.js) | `GET /ai/learning-path` | Learning path |

### 2.3 Faculty

| Route | Page | Service hook | API endpoint | Purpose |
|---|---|---|---|---|
| `/faculty` · `/faculty/teaching` | Dashboard / TeachingWorkspace | `useFacultyIntelligence` (faculty-intelligence.js) | `GET /faculty-intelligence/summary` | Faculty snapshot |
| `/faculty/courses` | CourseOverview | `useFacultyCourses` (extra.js) | `GET /faculty/courses` | Faculty courses |
| `/faculty/quiz-builder` | QuizBuilder | `useFacultyQuizBuilder` (extra.js) | `GET /faculty/quiz-builder` | Quiz builder |
| `/faculty/timetable` | Timetable | `useFacultyTimetable` (extra.js) | `GET /faculty/timetable` | Timetable |
| `/faculty/announcements` | Announcements | `useFacultyAnnouncements` (extra.js) | `GET /faculty/announcements` | Announcements |
| `/faculty/attendance` | Attendance | `useFacultyAttendance` (index.js) | `GET /faculty/attendance` | Attendance |
| `/faculty/assignments` | Assignments | `useFacultyAssignments` (index.js) | `GET /faculty/assignments` | Assignments |
| `/faculty/research` | Research | `useFacultyResearch` (index.js) | `GET /faculty/research` | Research |
| `/faculty/lecture-planner` | LecturePlanner | `useFacultyLecturePlanner` (index.js) | `GET /faculty/lecture-planner` | Lecture planner |
| `/faculty/exam-builder` | ExamBuilder | `useFacultyExamBuilder` (index.js) | `GET /faculty/exam-builder` | Exam builder |
| `/faculty/settings` | Settings | `useFacultySettings` (index.js) | `GET /faculty/settings` | Preferences |
| `/faculty/reports` | Reports | `useFacultyReports` (index.js) · `useCreateReport`/`useDeleteReport`/`useArchiveReport` (extra.js) | `GET /faculty/reports` · `POST /faculty/reports` · `DELETE /faculty/reports/:id` · `PATCH /faculty/reports/:id/archive` | Reports library + lifecycle |
| `/faculty/ai-assistant` | AITeachingAssistant | `useAIAssistantThreads` / `useAIAssistantRespond` (index.js) | `GET /ai/assistant/threads` · `POST /ai/assistant/respond` | Teaching assistant chat |
| `/faculty/ai-assistant` (content tab, legacy ai-studio) | AITeachingAssistant | `useSaveStudioItem` (extra.js) | `POST /faculty/ai-studio/save` | Save generated content |
| (roster pickers) | share dialogs | `useFacultyRoster` (index.js) | `GET /faculty/roster` | Student roster for audience selection |
| `/faculty/question-intelligence` (QI tab) | QuestionIntelligence | `useQuestionBank` (index.js) | `GET /faculty/question-bank` | University bank |
| `/faculty/question-intelligence` (PYQ tab) | QuestionIntelligence | `usePYQAnalysis` / `usePYQFilters` / patterns / analytics hooks (index.js, extra.js) | `GET /faculty/pyq-analysis` · `GET /faculty/pyq-analysis/filters` · `GET /faculty/pyq-analysis/patterns` · `GET /faculty/pyq-analysis/analytics?subject=` | PYQ intelligence |
| `/faculty/question-intelligence` (generator/library) | QuestionIntelligence | `usePaperGenerator` (extra.js) | `GET /faculty/paper-generator` | Generator config + library |
| same | same | `usePaperCreate` | `POST /faculty/paper-generator/papers` | Generate/save paper |
| same | same | `usePaperDuplicate` | `POST /faculty/paper-generator/papers/:id/duplicate` | Duplicate |
| same | same | `usePaperRegenerate` | `POST /faculty/paper-generator/papers/:id/regenerate` | Regenerate version |
| same | same | `usePaperArchive` | `PATCH /faculty/paper-generator/papers/:id/archive` | Archive/restore |
| same | same | `usePaperDelete` | `DELETE /faculty/paper-generator/papers/:id` | Delete |
| same | same | `usePaperShare` | `POST /faculty/paper-generator/papers/:id/share` | Share to students (prototype persistence) |
| AI Question Studio (tab) | AIQuestionStudio page comp. | `useQuestionStudioSummary` (question-studio.js) | `GET /faculty/question-studio` | Studio summary |
| same | same | `useQuestionStudioSources(params)` | `GET /faculty/question-studio/sources` | Source library |
| same | same | `useQuestionStudioSource(id)` | `GET /faculty/question-studio/sources/:id` | Source detail |
| same | same | `useAnalyzeSource` | `POST /faculty/question-studio/sources/:id/analyze` | Prototype content analysis |
| same | same | `useUploadSource` | `POST /faculty/question-studio/sources/upload` | Simulated upload |
| same | same | `useGenerateStudioQuestions` | `POST /faculty/question-studio/generate` | Deterministic generation |
| same | same | `useStudioSessions` | `GET /faculty/question-studio/sessions` | Persisted sessions |
| same | same | `useStudioQuestionAction` | `POST /faculty/question-studio/sessions/:id/questions/:qid/{regenerate\|edit\|delete\|approve\|reject}` | Question review workflow |
| `/faculty/my-students` | MyStudents | `useFacultyStudents` (faculty-students.js) | `GET /faculty/students` | Directory + batches + KPIs |
| `/faculty/my-students` (issues view) | MyStudents | `useSimilarIssues(scope)` (faculty-interventions.js) | `GET /faculty/similar-issues?scope=all\|batch` | Similar-issue groups |
| same | same | `useSimilarIssueGroupEvidence(groupId)` | `GET /faculty/similar-issues/:groupId/evidence` | Group evidence |
| same | same | `useGroupInterventionPreflight(groupId, cfg)` | `GET /faculty/similar-issues/:groupId/intervention-preflight` | Practice-pool sufficiency check |
| same | same | `useCreateGroupInterventions` | `POST /faculty/similar-issues/:groupId/interventions` | Create from group |
| `/faculty/my-students` (interventions view) | MyStudents | `useInterventions` (faculty-interventions.js) | `GET /faculty/interventions` | Intervention list |
| same | same | `useIntervention(id)` | `GET /faculty/interventions/:id` | Detail |
| same | same | `useInterventionPractice(id)` | `GET /faculty/interventions/:id/practice` | Practice preview |
| same | same | `useInterventionStatus` | `POST /faculty/interventions/:groupId/status` | Lifecycle transitions |
| same | same | `useInterventionModify` | `POST /faculty/interventions/:groupId/modify` | Modify (evidence locked) |
| same | same | `useInterventionAssign` | `POST /faculty/interventions/:groupId/assign` | Assign students |
| same | same | `useCreateRetest` | `POST /faculty/interventions/:groupId/retest` | Create re-test |
| same | same | `useRelatedResources(params)` | `GET /faculty/interventions/related-resources?subject=&chapter=` | Related PYQ/question resources |
| `/faculty/my-students/:studentId` | StudentProfile | `useFacultyStudent360(id)` (faculty-students.js) | `GET /faculty/students/:id/360` | 360° bundle |
| same | same | `useFacultyStudentInterventions(studentId)` | `GET /faculty/students/:id/interventions` | Student's interventions |
| same | same | `useWeakTopicQuestions(subject, chapter)` | `GET /faculty/students/weak-topic-questions?subject=&chapter=` | Related bank questions |
| same | same | `useStudentInterventions(studentId)` | `GET /student/interventions?studentId=` | Student-surface view (reused) |
| `/faculty/my-students/:studentId/exams/:attemptId` | FacultyAttemptAnalysis | `useFacultyAttemptAnalysis` (faculty-students.js) | `GET /faculty/students/:id/exams/:attemptId/analysis` | Attempt analysis (faculty view) |

### 2.4 Admin + Parent

| Route | Page | Service hook | API endpoint |
|---|---|---|---|
| `/admin` · `/admin/institution-intelligence` · `/admin/reports` · `/admin/ai-workspace` | Dashboard/InstitutionIntelligence/Reports/AIWorkspace | `useAdminIntelligence` (admin-intelligence.js) | `GET /admin-intelligence/summary` |
| `/admin/users` | Users | `useAdminUsers` (index.js) | `GET /admin/users` |
| `/admin/departments` | Departments | `useAdminDepartments` | `GET /admin/departments` |
| `/admin/courses` | Courses | `useAdminCourses` | `GET /admin/courses` |
| `/admin/research` | Research | `useAdminResearch` | `GET /admin/research` |
| `/admin/roles` | Roles | `useAdminRoles` | `GET /admin/roles` |
| `/admin/permissions` | Permissions | `useAdminPermissions` | `GET /admin/permissions` |
| `/admin/audit-logs` | AuditLogs | `useAdminAuditLogs` | `GET /admin/audit-logs` |
| `/admin/ai-config` | AiConfig | `useAdminAiConfig` | `GET /admin/ai-config` |
| `/admin/settings` | Settings | `useAdminSettings` | `GET /admin/settings` |
| `/admin/revenue` | Revenue | `useAdminRevenue` (extra.js) | `GET /admin/revenue` |
| `/admin/programs` | Programs | `useAdminPrograms` | `GET /admin/programs` |
| `/admin/subjects` | Subjects | `useAdminSubjects` | `GET /admin/subjects` |
| `/admin/batches` | Batches | `useAdminBatches` | `GET /admin/batches` |
| `/admin/calendar` | AcademicCalendar | `useAdminCalendar` | `GET /admin/calendar` |
| `/admin/question-bank` | QuestionBank | `useAdminQuestionBank` | `GET /admin/question-bank` |
| `/admin/scholarships` | Scholarships | `useAdminScholarships` | `GET /admin/scholarships` |
| `/admin/cms` | Cms | `useAdminCms` | `GET /admin/cms` |
| `/admin/api-config` | ApiConfig | `useAdminApiConfig` | `GET /admin/api-config` |
| `/admin/data-tools` | DataTools | `useAdminDataTools` | `GET /admin/data-tools` |
| `/admin/faculty` | Faculty | `useAdminFaculty` (extra.js) | `GET /admin/faculty` |
| `/admin/students` | Students | `useAdminStudents` (extra.js) | `GET /admin/students` |
| `/parent/*` (14 pages) | parent pages | `useParentProfile/Dashboard/Progress/Attendance/Performance/ExamResults/Communication/AIInsights/Reports` (index.js) · `useParentAssignments/Fees/Behavior/Events/Downloads/Notifications/Settings` (extra.js) · `useUpdateParentSettings` | `GET /parent/profile\|dashboard\|progress\|attendance\|performance\|exam-results\|communication\|ai-insights\|reports\|assignments\|fees\|behavior\|events\|downloads\|notifications\|settings` · `PATCH /parent/settings` |

*Every row above corresponds to an actually-registered `defineRoute(...)`; no endpoint is invented. Complete raw endpoint list: see Appendix A.*

---

## 3. STUDENT ROUTES (detail)

All require role `student` (via the `/student` portal guard). Key components per major page:

- **Dashboard** (`/student`) — daily brief, KPI strip, recent activities, upcoming deadlines, quick actions; child components from `components/dashboard/` + `components/academic-workspace/`; data = one snapshot call.
- **Academics hub** (`/student/academics?tab=overview|…`) — tabbed hub over the snapshot (courses/subjects/resources).
- **Courses / Course detail / Subjects** — snapshot projections (`datasets.courses`, `subjects`, `courseModules`, `academicResources`).
- **Attendance / Assignments / Calendar / Portfolio** — snapshot projections with upload UI (assignments) and timeline components.
- **Progress Report** (`/student/progress-report?period=semester|academic-year|30d|90d`) — engine `buildProgressReport` + `REPORT_PERIODS`; print-to-PDF A4 stylesheet; missing data shows "N/A".
- **Examinations** (`/student/examinations?tab=upcoming|…&family=`) — Examination Intelligence hub: upcoming/past exams (university + competitive), admit card, mock tests, readiness tab, **intervention entry strip** (deep links into `/student/interventions` and `/student/exam-agent`).
- **Exam Agent** (`/student/exam-agent?exam=EA-…&attempt=…&mode=demo|manual`) — steps home → instructions → live (timer, palette, per-question interactions) → analyzing (4-step animation) → report (`buildExamAgentReport`; classification chips; DNA bridge). Child components: `exam-agent-home/-instructions/-live/-report/-shared`.
- **Exam Analysis** (`/student/exam-analysis`) — pick an option (static exam options + canonical attempts marked Sample/Practice) → per-attempt dashboard (subject/chapter/time/error intelligence + comparison/trajectory vs previous same-domain attempts).
- **Performance & Accuracy** (`/student/performance-accuracy?tab=`) — accuracy vs speed views over the snapshot.
- **Interventions** (`/student/interventions`) — "My Interventions": why-assigned, objectives, practice runner, re-test runner, outcome/effectiveness card.
- **Mentor / AI Tutor / AI Copilot / Learning Path** — AI learning surfaces (see §2.2).
- **Mock tests / Exams** — legacy deep-link lists feeding the Examination hub.
- **Programs / Forum / Support / Settings** — list/settings pages.

## 4. FACULTY ROUTES (detail)

- **Dashboard** (`/faculty`) — teaching KPIs, alerts, insights from the faculty snapshot.
- **Teaching Workspace** (`/faculty/teaching?tab=`) — merged teaching analytics workspace.
- **My Students** (`/faculty/my-students?view=students|batches|issues|interventions`) — directory (search · domain University/Competitive · JEE/NEET chips · batch · status · sort), batches drill-down, **Similar Issues** (scope `all|batch`), **Intervention Center** (status machine, modify, assign, re-test creation, effectiveness) — child components in `components/students-workspace/`.
- **Student 360** (`/faculty/my-students/:studentId?context=university|jee|neet&tab=overview|strengths|weaknesses|subjects|chapters|questions|time|errors|trends|comparison|dna|similar|interventions&subject=&chapter=`) — 14-tab intelligence profile; evidence dialogs; "Open Question Bank" deep link; "Open Intervention Center" link (`?view=interventions`).
- **Attempt analysis** (`/faculty/my-students/:studentId/exams/:attemptId`) — faculty view of one attempt.
- **Question Intelligence workspace** (`/faculty/question-intelligence?tab=overview|question-intelligence|pyq|paper-generator|library|analytics`) — bank browser (University|Competitive), PYQ intelligence, **Paper Studio generator** (5-section flow; insufficiency state; review/edit/replace/remove; quality panel), **Paper Library** (filters/search/edit/print/share), assessment analytics; **AI Question Studio** (source library, analysis, generation, review workflow, sessions) — page component `AIQuestionStudio.jsx` wired through `services/question-studio.js`.
- **AI Workspace** (`/faculty/ai-assistant?tab=`) — teaching assistant chat + content studio (legacy `/faculty/ai-studio` redirects here).
- **Reports** (`/faculty/reports?tab=&template=`) — report intelligence + create/delete/archive.
- Supporting pages: courses, quiz-builder, timetable, announcements, attendance, assignments, research, lecture-planner, exam-builder, settings, support.

## 5. ADMIN ROUTES (detail)

- **Dashboard / Institution Intelligence / Reports / AI Workspace** — all from `GET /admin-intelligence/summary` (health pillars, analytics, executive report builder, admin AI chat with local history persistence).
- **People** — Users, Faculty, Students, Departments.
- **Academics** — Programs, Subjects, Courses, Batches, Academic Calendar.
- **Workspace** — Question Bank (institution), Research, Reports (executive), AI Workspace.
- **Finance & Aid** — Revenue, Scholarships.
- **Governance** — Roles, Permissions, Audit Logs, AI Configuration, CMS, API Configuration, Data Export/Import (DataTools), Settings.
- **Support** — local demo console (no service call).
- **Legacy analytics redirects** — see §7.

## 6. PARENT ROUTES (detail)

Documented separately from Student: Parent is a distinct role with its own guard, its own NAV_GROUPS sidebar, and its own 17 endpoints under `/parent/*`. It shows one ward's data (progress/attendance/performance/exam results/assignments/behaviour) + communication, fees, notifications, downloads, AI insights, reports, settings. **The portal is currently unreachable** (`FEATURE_FLAGS.parentPortal === false`); parent login redirects to `/auth/login?role=parent`. Parent permissions are NOT mixed with student permissions anywhere in the code.

## 7. LEGACY / REDIRECT ROUTES (all of them)

| Old route | → New route | Why (from router comments) |
|---|---|---|
| `/faculty/ai-studio` | `/faculty/ai-assistant?tab=content` (query preserved) | AI Content Studio superseded by the AI Workspace |
| `/faculty/question-bank` | `/faculty/question-intelligence?tab=question-intelligence` | Question Bank absorbed into Assessment Intelligence (Phase 5) |
| `/faculty/paper-generator` | `/faculty/question-intelligence?tab=paper-generator` (query preserved) | Paper Generator became a tab (keeps `?mode=&exam=…` deep links working) |
| `/faculty/pyq-analysis` | `/faculty/question-intelligence?tab=pyq` | PYQ Analysis became a tab |
| `/faculty/students/:studentId/360` | `/faculty/my-students/:studentId` (query preserved) | Canonical Student 360 route (Phase 4); keeps `?context&tab&…` deep links |
| `/faculty/students/:studentId/exams/:attemptId/analysis` | `/faculty/my-students/:studentId/exams/:attemptId` | Canonical attempt-analysis deep link |
| `/admin/attendance-analytics` | `/admin/institution-intelligence?tab=attendance` | Legacy analytics absorbed by Institution Intelligence (Phase 4) |
| `/admin/assignment-analytics` | `/admin/institution-intelligence?tab=attendance` | Same |
| `/admin/exam-analytics` | `/admin/institution-intelligence?tab=assessment` | Same |
| `/admin/academic-analytics` | `/admin/institution-intelligence?tab=academic` | Same |
| `/admin/performance` | `/admin/institution-intelligence?tab=students` | Same |
| `/admin/placements` | `/admin/institution-intelligence?tab=outcomes` | Same |

Redirect mechanisms: `LegacyRedirect` (fixed target), `LegacyFacultyRedirect` (target + preserved query string), `Student360Redirect` / `FacultyAttemptRedirect` (path-param rewriting), `ParentGate` (feature-flag redirect, not legacy). Superseded page files (e.g. `pages/faculty/PYQAnalysis.jsx`, `ExamBuilder` remains live) stay in the codebase but the superseded ones are no longer routed.

## 8. DEEP-LINK STATE (query parameters actually read by pages)

| Param | Read by | Values / meaning |
|---|---|---|
| `tab` | QuestionIntelligence (`overview\|question-intelligence\|pyq\|paper-generator\|library\|analytics`, alias `question-bank`→`question-intelligence`, `ai-suggestions`→`overview`), TeachingWorkspace, AITeachingAssistant, InstitutionIntelligence, faculty Reports, admin Reports, student Academics, PerformanceAccuracy, Mentor (`chat\|…`), Examinations (`upcoming\|…`) | workspace tab selection |
| `context` | Student 360 (`university\|jee\|neet` → domain; helper `src/utils/student-360-url.js`) | domain isolation selector |
| `subject` / `chapter` | Student 360 (focus), Question Intelligence (bank pre-filter; also weak-topic deep link), weak-topic-questions endpoint | subject/chapter focus |
| `family` | Question Intelligence pre-filter; student Examinations family filter | `JEE\|NEET` |
| `view` | MyStudents | `students\|batches\|issues\|interventions` |
| `exam` / `attempt` / `mode` | ExamAgent (`exam=<examId>`, `attempt=<attemptId>`, `mode=demo\|manual`); `exam` also prefills the paper generator | Exam Agent deep links |
| `period` | ProgressReport | `semester\|academic-year\|30d\|90d` |
| `template` | faculty Reports | report template preselection |
| `intervention` | Paper generator tab (re-test prefill; built by `intervention-center.jsx`) | interventionId for "Intervention re-test" paper |
| `topic` `difficulty` `count` `duration` `marks` `title` | Paper generator prefill (same link builder) | re-test configuration |
| `role` | `/auth/login/:role` path + login page | `student\|faculty\|admin\|parent` |
| `studentId` | `GET /student/interventions` query param (service-level) | target student |
| `scope` | `GET /faculty/similar-issues` | `all\|batch` |
| `q` | `GET /ai/graph-search` | search query |
| `subject` | `GET /faculty/pyq-analysis/analytics?subject=` | PYQ analytics variant |

No other query parameters exist in the app (verified by grep over `searchParams.get` usage).

## 9. CRITICAL USER JOURNEYS

### 9.1 Student Exam Journey
Login (`/auth/login` → AuthContext session)
→ **Exam Agent** `/student/exam-agent` (UI: `ExamAgent` page + `components/exam-workspace/exam-agent/*`; service: `services/exam-agent.js`; API: `GET /student/exam-agent/exams`; data: `datasets/exams/exam-agent.js`)
→ **Exam Attempt** (live exam; `buildCanonicalExamAttempt` in page; API: `POST /student/exam-agent/attempts`; data: canonical ExamAttempt → localStorage `EduX_student_exam_attempts`)
→ **Exam Analysis** `/student/exam-analysis` (service: `useExamAnalysisOptions/ById`; API: `GET /student/exam-analysis/:id`; engine: `buildAttemptAnalysisVariant`)
→ **Academic DNA** (API: `GET /intelligence/summary` with attempt evidence; engines: `buildExamEvidence` → `computeAcademicDna`; data: evidence pools with trends).

### 9.2 Faculty Intelligence Journey
Faculty `/faculty` (snapshot `GET /faculty-intelligence/summary`)
→ **My Students** `/faculty/my-students` (service `useFacultyStudents`; API `GET /faculty/students`; data: students-directory 7 batches/126 students + canonical attempts)
→ **Student 360** `/faculty/my-students/:studentId` (service `useFacultyStudent360`; API `GET /faculty/students/:id/360`; engine `computeStudent360`)
→ **Evidence** (evidence dialogs; API `GET /faculty/similar-issues/:groupId/evidence`; data: fingerprints + group evidence)
→ **Similar Issues** `/faculty/my-students?view=issues` (API `GET /faculty/similar-issues`; engine `groupSimilarIssues`)
→ **Intervention** `?view=interventions` (APIs `POST /faculty/similar-issues/:groupId/interventions` or `POST /faculty/students/:studentId/interventions`, then status/modify/assign; engine `intervention-lifecycle`).

### 9.3 Intervention Journey (full loop)
Issue (fingerprint/360 weakness)
→ Evidence (evidence + preflight `GET …/intervention-preflight`)
→ Intervention (create → Approved → Planned → **Assigned**)
→ Practice (student `/student/interventions`; API `GET /student/interventions/:id/practice` → `POST …/practice-attempts` kind=practice; engine `selectPracticeQuestions` over existing datasets)
→ Re-test (faculty `POST /faculty/interventions/:groupId/retest` — optionally via Paper Studio prefill `?intervention=`; student runs it, kind=retest, `mode:'intervention-retest'`)
→ Exam Attempt (stored; `interventionId` link retained on papers badged "Intervention re-test")
→ Effectiveness (`computeEffectiveness` — before/practice/retest deltas → Resolved/Improving/Persistent; shown on both surfaces).

### 9.4 Assessment Journey (Question → Paper → Share)
Question Intelligence (`GET /faculty/question-bank`; datasets: bank + competitive foundation + studio approvals)
→ PYQ (`GET /faculty/pyq-analysis*`; `UPYQ-*` bank links)
→ Generator (`POST /faculty/paper-generator/papers`; deterministic selection; insufficiency → Available vs Required + Broaden)
→ Paper Library (`GET /faculty/paper-generator`; edit-from-library; print/preview)
→ Share (`POST …/papers/:id/share`; localStorage `EduX_faculty_paper_shares`).

## 10. BACKEND IMPORTANCE (route classification)

| Class | Meaning | Routes |
|---|---|---|
| **CRITICAL** (requires backend persistence to survive beyond one browser/session; core product loops) | attempt/intervention/paper/report/share/registration writes + the intelligence reads over them | `/student/exam-agent` (+ its 4 endpoints), `/student/interventions`, `/student/exam-analysis`, `/student` + intelligence pages (`/intelligence/*`), `/faculty/my-students` (+ issues/interventions views + all 14+4 intervention endpoints), `/faculty/my-students/:studentId` (360), `/faculty/my-students/:studentId/exams/:attemptId`, `/faculty/question-intelligence` (paper generator + library + share endpoints, question-studio sessions), `/faculty/reports` (create/delete/archive), `/auth/*` (registration + OTP; future real login), `/student/support` + faculty support (ticket creation) |
| **IMPORTANT** (core reads a backend must serve; currently dataset-backed) | snapshots & directories | `/faculty`, `/faculty/teaching`, `/admin`, `/admin/institution-intelligence`, `/admin/reports`, `/admin/ai-workspace`, all `/admin/*` directories (users/faculty/students/departments/programs/subjects/courses/batches/calendar/question-bank/research/roles/permissions/audit-logs/ai-config/settings/revenue/scholarships/cms/api-config/data-tools), `/student/mentor`, `/student/ai-tutor`, `/student/ai-copilot`, `/faculty/ai-assistant` |
| **STANDARD** (functional but secondary; mostly static list/detail) | `/student/programs\|forum\|support\|settings\|exams\|mock-tests\|learning-path\|calendar\|portfolio`, `/faculty/courses\|quiz-builder\|timetable\|announcements\|attendance\|assignments\|research\|lecture-planner\|exam-builder\|settings\|support`, landing routes (`/`, `/about`, `/pricing`, `/case-studies`, `/blog`, `/blog/:id`, `/contact`, `/careers`, `/media`, `/privacy`, `/terms`), `/admin/support`, `/403`, `*` |
| **LEGACY** (redirects only) | see §7 | 6 faculty + 6 admin redirect routes |
| **DISABLED** | kept for the future | all `/parent/*` (14) behind `FEATURE_FLAGS.parentPortal` |

Discrepancies documented (current code wins):
1. `/parent/notifications` is in `NAV_GROUPS` and has a page + endpoint but **no route registration** (falls to NotFound today).
2. `pages/faculty/AIQuestionStudio.jsx` (AI Question Studio) is fully implemented but has **no dedicated route** — it is reached inside the Assessment Intelligence workspace.
3. Faculty Support page consumes the **student** support endpoints (`/student/support`) — the shared endpoint is the current contract.
4. `docs/PHASE_0_FACULTY_EXAM_INTEGRATION_AUDIT.md` is referenced in engine comments but does not exist in the repository.

---

## Appendix A — Complete API endpoint list (145, as registered)

**auth (8)** POST /auth/forgot-password · POST /auth/verify-otp · POST /auth/reset-password · POST /auth/verify-email · POST /auth/resend-otp · GET /auth/registration/options · POST /auth/register · POST /auth/register/verify
**platform (7)** GET /platform/blog · GET /platform/blog/:id · GET /platform/careers · GET /platform/case-studies · GET /platform/contact · POST /platform/newsletter · POST /platform/contact
**student academics (9)** GET /student/mock-tests · GET /student/exams · GET /student/settings · PATCH /student/settings · GET /student/programs · GET /student/forum · GET /student/support · POST /student/support · GET /student/admit-card
**student exam-analysis (2)** GET /student/exam-analysis/options · GET /student/exam-analysis/:id
**student mentor (1)** GET /student/mentor/workspace
**student intelligence (4)** GET /intelligence/profile · GET /intelligence/summary · GET /intelligence/exam-attempts · GET /intelligence/exam-dna-signals
**exam agent (4)** GET /student/exam-agent/exams · GET /student/exam-agent/attempts · GET /student/exam-agent/attempts/:id · POST /student/exam-agent/attempts
**faculty workspace (13)** GET /faculty/attendance · /faculty/assignments · /faculty/question-bank · /faculty/research · /faculty/lecture-planner · /faculty/exam-builder · /faculty/reports · /faculty/settings · /faculty/roster · /faculty/courses · /faculty/timetable · /faculty/announcements · /faculty/quiz-builder
**faculty intelligence (1)** GET /faculty-intelligence/summary
**faculty reports (3)** POST /faculty/reports · DELETE /faculty/reports/:id · PATCH /faculty/reports/:id/archive
**faculty papers (7)** GET /faculty/paper-generator · DELETE /faculty/paper-generator/papers/:id · POST /faculty/paper-generator/papers · POST …/papers/:id/duplicate · POST …/papers/:id/regenerate · PATCH …/papers/:id/archive · POST …/papers/:id/share
**faculty pyq (4)** GET /faculty/pyq-analysis · /faculty/pyq-analysis/filters · /faculty/pyq-analysis/patterns · /faculty/pyq-analysis/analytics
**faculty students (4)** GET /faculty/students · GET /faculty/students/weak-topic-questions · GET /faculty/students/:id/360 · GET /faculty/students/:id/exams/:attemptId/analysis
**faculty question-studio (12)** GET /faculty/question-studio · GET …/sources · GET …/sources/:id · POST …/sources/:id/analyze · POST …/sources/upload · POST …/generate · GET …/sessions · POST …/sessions/:id/questions/:qid/{regenerate,edit,delete,approve,reject}
**faculty ai-studio (1)** POST /faculty/ai-studio/save
**interventions faculty (14)** GET /faculty/similar-issues · GET /faculty/similar-issues/:groupId/evidence · GET /faculty/similar-issues/:groupId/intervention-preflight · POST /faculty/similar-issues/:groupId/interventions · GET /faculty/interventions · GET /faculty/interventions/:id · POST /faculty/interventions/:groupId/{status,modify,assign,retest} · GET /faculty/interventions/:id/practice · GET /faculty/interventions/related-resources · GET /faculty/students/:id/interventions · POST /faculty/students/:studentId/interventions
**interventions student (4)** GET /student/interventions · GET /student/interventions/:id/practice · GET /student/interventions/:id/retest · POST /student/interventions/:id/practice-attempts
**admin (22)** GET /admin/{users,departments,courses,research,roles,permissions,audit-logs,ai-config,settings,revenue,programs,subjects,batches,calendar,question-bank,scholarships,cms,api-config,data-tools,students,faculty}
**admin intelligence (1)** GET /admin-intelligence/summary
**parent (17)** GET /parent/{profile,dashboard,progress,attendance,performance,exam-results,communication,ai-insights,reports,assignments,fees,behavior,events,downloads,notifications,settings} · PATCH /parent/settings
**ai (8)** GET /ai/tutor/threads · POST /ai/tutor/respond · GET /ai/copilot/suggestions · GET /ai/learning-path · GET /ai/graph-search · GET /ai/assistant/threads · POST /ai/assistant/respond · GET /ai/stats

*(Also expected by client code but not registered in the adapter: `POST /auth/refresh` — the axios refresh contract for a real backend.)*
