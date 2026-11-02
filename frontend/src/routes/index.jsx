import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { LandingLayout } from '@/components/layout/LandingLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageLoader } from '@/components/shared/loading'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { FEATURE_FLAGS, ROLES } from '@/config'

/* ---------- Landing ---------- */
const Home = lazy(() => import('@/pages/landing/Home'))
const About = lazy(() => import('@/pages/landing/About'))
const PricingPage = lazy(() => import('@/pages/landing/PricingPage'))
const CaseStudies = lazy(() => import('@/pages/landing/CaseStudies'))
const Blog = lazy(() => import('@/pages/landing/Blog'))
const BlogPost = lazy(() => import('@/pages/landing/BlogPost'))
const Contact = lazy(() => import('@/pages/landing/Contact'))
const Careers = lazy(() => import('@/pages/landing/Careers'))
const Media = lazy(() => import('@/pages/landing/Media'))
// lazy() yields a component object, not the module — resolve the named
// exports explicitly so Legal.Privacy / Legal.Terms are real components.
const LegalPrivacy = lazy(() => import('@/pages/landing/Legal').then((m) => ({ default: m.Privacy })))
const LegalTerms = lazy(() => import('@/pages/landing/Legal').then((m) => ({ default: m.Terms })))

/* ---------- Auth ---------- */
const Login = lazy(() => import('@/pages/auth/Login'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const OTPVerify = lazy(() => import('@/pages/auth/OTPVerify'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'))
const ProfileSetup = lazy(() => import('@/pages/auth/ProfileSetup'))
const Register = lazy(() => import('@/pages/auth/Register'))

/* ---------- Shared ---------- */
const Forbidden = lazy(() => import('@/pages/Forbidden'))

/* ---------- Student (extra) ---------- */
const StudentPrograms = lazy(() => import('@/pages/student/Programs'))
const LearningPath = lazy(() => import('@/pages/student/LearningPath'))
const ExamAnalysis = lazy(() => import('@/pages/student/ExamAnalysis'))
const PerformanceAccuracy = lazy(() => import('@/pages/student/PerformanceAccuracy'))
const Forum = lazy(() => import('@/pages/student/Forum'))
const Support = lazy(() => import('@/pages/student/Support'))

/* ---------- Faculty (extra) ---------- */
const FacultyCourseOverview = lazy(() => import('@/pages/faculty/CourseOverview'))
const FacultyQuizBuilder = lazy(() => import('@/pages/faculty/QuizBuilder'))
const FacultyTimetable = lazy(() => import('@/pages/faculty/Timetable'))
const FacultyAnnouncements = lazy(() => import('@/pages/faculty/Announcements'))
const QuestionIntelligence = lazy(() => import('@/pages/faculty/QuestionIntelligence'))
const MicroAssessmentStudio = lazy(() => import('@/pages/faculty/MicroAssessmentStudio'))
const MyStudents = lazy(() => import('@/pages/faculty/MyStudents'))
const StudentProfile = lazy(() => import('@/pages/faculty/StudentProfile'))
const FacultyAttemptAnalysis = lazy(() => import('@/pages/faculty/FacultyAttemptAnalysis'))

/* ---------- Parent (extra) ---------- */
const ParentAssignments = lazy(() => import('@/pages/parent/Assignments'))
const ParentFees = lazy(() => import('@/pages/parent/Fees'))
const ParentBehavior = lazy(() => import('@/pages/parent/Behavior'))
const ParentCalendar = lazy(() => import('@/pages/parent/CalendarPage'))
const ParentDownloads = lazy(() => import('@/pages/parent/Downloads'))
const ParentNotifications = lazy(() => import('@/pages/parent/Notifications'))
const ParentSettings = lazy(() => import('@/pages/parent/Settings'))

/* ---------- Admin (extra) ---------- */
const AdminRevenue = lazy(() => import('@/pages/admin/Revenue'))
const AdminPrograms = lazy(() => import('@/pages/admin/Programs'))
const AdminProgramResults = lazy(() => import('@/pages/admin/ProgramResults'))
const AdminSubjects = lazy(() => import('@/pages/admin/Subjects'))
const AdminBatches = lazy(() => import('@/pages/admin/Batches'))
const AdminAcademicCalendar = lazy(() => import('@/pages/admin/AcademicCalendar'))
const AdminFaculty = lazy(() => import('@/pages/admin/Faculty'))
const AdminFacultyAnalytics = lazy(() => import('@/pages/admin/FacultyAnalytics'))
const AdminStudents = lazy(() => import('@/pages/admin/Students'))
const AdminSimilarIssues = lazy(() => import('@/pages/admin/SimilarIssues'))
const AdminQuestionBank = lazy(() => import('@/pages/admin/QuestionBank'))
const AdminScholarships = lazy(() => import('@/pages/admin/Scholarships'))
const AdminCms = lazy(() => import('@/pages/admin/Cms'))
const AdminApiConfig = lazy(() => import('@/pages/admin/ApiConfig'))
const AdminDataTools = lazy(() => import('@/pages/admin/DataTools'))
const AdminExams = lazy(() => import('@/pages/admin/Exams'))
/* ---------- Student ---------- */
const StudentDashboard = lazy(() => import('@/pages/student/Dashboard'))
const StudentAttendance = lazy(() => import('@/pages/student/Attendance'))
const StudentAssignments = lazy(() => import('@/pages/student/Assignments'))
const StudentCourses = lazy(() => import('@/pages/student/Courses'))
const CourseDetail = lazy(() => import('@/pages/student/CourseDetail'))
const StudentSubjects = lazy(() => import('@/pages/student/Subjects'))
const AITutor = lazy(() => import('@/pages/student/AITutor'))
const AICopilot = lazy(() => import('@/pages/student/AICopilot'))
const CalendarPage = lazy(() => import('@/pages/student/CalendarPage'))
const MockTests = lazy(() => import('@/pages/student/MockTests'))
const Exams = lazy(() => import('@/pages/student/Exams'))
const StudentSettings = lazy(() => import('@/pages/student/Settings'))
const StudentAcademics = lazy(() => import('@/pages/student/Academics'))
const StudentPortfolio = lazy(() => import('@/pages/student/Portfolio'))
const ProgressReport = lazy(() => import('@/pages/student/ProgressReport'))
const ExamAgent = lazy(() => import('@/pages/student/ExamAgent'))
const StudentInterventions = lazy(() => import('@/pages/student/Interventions'))
const StudentMicroAssessments = lazy(() => import('@/pages/student/MicroAssessments'))
const Mentor = lazy(() => import('@/pages/student/Mentor'))

/* ---------- Faculty ---------- */
const FacultyDashboard = lazy(() => import('@/pages/faculty/Dashboard'))
const FacultyAttendance = lazy(() => import('@/pages/faculty/Attendance'))
const FacultyAssignments = lazy(() => import('@/pages/faculty/Assignments'))
const AITeachingAssistant = lazy(() => import('@/pages/faculty/AITeachingAssistant'))
const FacultyResearch = lazy(() => import('@/pages/faculty/Research'))
const LecturePlanner = lazy(() => import('@/pages/faculty/LecturePlanner'))
const ExamBuilder = lazy(() => import('@/pages/faculty/ExamBuilder'))
const FacultyReports = lazy(() => import('@/pages/faculty/Reports'))
const FacultySettings = lazy(() => import('@/pages/faculty/Settings'))
/* Hidden with the /faculty/teaching route — restore together.
const TeachingWorkspace = lazy(() => import('@/pages/faculty/TeachingWorkspace'))
*/
const FacultySupport = lazy(() => import('@/pages/faculty/Support'))

/* ---------- Admin ---------- */
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminUsers = lazy(() => import('@/pages/admin/Users'))
const AdminDepartments = lazy(() => import('@/pages/admin/Departments'))
const AdminCourses = lazy(() => import('@/pages/admin/Courses'))
const AdminResearch = lazy(() => import('@/pages/admin/Research'))
const AdminRoles = lazy(() => import('@/pages/admin/Roles'))
const AdminPermissions = lazy(() => import('@/pages/admin/Permissions'))
const AdminAuditLogs = lazy(() => import('@/pages/admin/AuditLogs'))
const AdminAiConfig = lazy(() => import('@/pages/admin/AiConfig'))
const AdminSettings = lazy(() => import('@/pages/admin/Settings'))
const InstitutionIntelligence = lazy(() => import('@/pages/admin/InstitutionIntelligence'))
const AdminReports = lazy(() => import('@/pages/admin/Reports'))
const AdminAIWorkspace = lazy(() => import('@/pages/admin/AIWorkspace'))
const AdminSupport = lazy(() => import('@/pages/admin/Support'))

/* ---------- Parent ---------- */
const ParentDashboard = lazy(() => import('@/pages/parent/Dashboard'))
const ParentProgress = lazy(() => import('@/pages/parent/Progress'))
const ParentAttendance = lazy(() => import('@/pages/parent/Attendance'))
const ParentPerformance = lazy(() => import('@/pages/parent/Performance'))
const ParentExamResults = lazy(() => import('@/pages/parent/ExamResults'))
const ParentCommunication = lazy(() => import('@/pages/parent/Communication'))
const ParentAIInsights = lazy(() => import('@/pages/parent/AIInsights'))
const ParentReports = lazy(() => import('@/pages/parent/Reports'))

const NotFound = lazy(() => import('@/pages/NotFound'))

function withSuspense(Component) {
  return (
    // Per-route error boundary: a failed lazy chunk shows a recoverable card
    // instead of ever risking a blank screen (or cascading to the global boundary).
    <ErrorBoundary showDetails>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  )
}

/* Phase 4: legacy analytics routes are fully absorbed by the Institution
   Intelligence Workspace — safe redirects keep bookmarks & old links
   working while pointing at the workspace tabs. Page files stay intact. */
function LegacyRedirect({ to }) {
  return <Navigate to={to} replace />
}

/* Phase 5: superseded Faculty pages (Question Bank, Paper Generator,
   PYQ Analysis, AI Content Studio) redirect to their canonical Assessment /
   AI Intelligence destination. The original query string is preserved so
   old deep links (e.g. paper-generator `?mode=&exam=…`) keep working. */
function LegacyFacultyRedirect({ to }) {
  const { search } = useLocation()
  return <Navigate to={to + search} replace />
}

/* Phase 4: the canonical student-detail experience is
   /faculty/my-students/:studentId. The older /faculty/students/:studentId/360
   alias redirects there, preserving any query state (context/tab/…). The
   dedicated attempt-analysis deep link stays on its own canonical route. */
function Student360Redirect() {
  const { pathname, search } = useLocation()
  const id = pathname.split('/')[3]
  return <Navigate to={`/faculty/my-students/${id}${search}`} replace />
}

/* Legacy /faculty/students/:studentId/exams/:attemptId/analysis → canonical
   /faculty/my-students/:studentId/exams/:attemptId route. */
function FacultyAttemptRedirect() {
  const { pathname, search } = useLocation()
  const parts = pathname.split('/')
  const studentId = parts[3]
  const attemptId = parts[5]
  return <Navigate to={`/faculty/my-students/${studentId}/exams/${attemptId}${search}`} replace />
}

/* Parent/Guardian is NOT part of the current product version. Pages, routes
   and data stay in the codebase for the future, but the portal is disabled
   while FEATURE_FLAGS.parentPortal is false — a parent login is redirected
   back to the auth screen instead of exposing an unfinished portal. */
function ParentGate({ children }) {
  if (FEATURE_FLAGS.parentPortal) return children
  return <Navigate to="/auth/login?role=parent" replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Landing */}
      <Route element={<LandingLayout />}>
        <Route path="/" element={withSuspense(Home)} />
        <Route path="/about" element={withSuspense(About)} />
        <Route path="/pricing" element={withSuspense(PricingPage)} />
        <Route path="/case-studies" element={withSuspense(CaseStudies)} />
        <Route path="/blog" element={withSuspense(Blog)} />
        <Route path="/blog/:id" element={withSuspense(BlogPost)} />
        <Route path="/contact" element={withSuspense(Contact)} />
        <Route path="/careers" element={withSuspense(Careers)} />
        <Route path="/media" element={withSuspense(Media)} />
        <Route path="/privacy" element={withSuspense(LegalPrivacy)} />
        <Route path="/terms" element={withSuspense(LegalTerms)} />
      </Route>

      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/auth/login" element={withSuspense(Login)} />
        <Route path="/auth/login/:role" element={withSuspense(Login)} />
        <Route path="/auth/forgot-password" element={withSuspense(ForgotPassword)} />
        <Route path="/auth/verify-otp" element={withSuspense(OTPVerify)} />
        <Route path="/auth/reset-password" element={withSuspense(ResetPassword)} />
        <Route path="/auth/verify-email" element={withSuspense(VerifyEmail)} />
        <Route path="/auth/register" element={withSuspense(Register)} />
        <Route path="/auth/profile-setup" element={withSuspense(ProfileSetup)} />
      </Route>

      {/* Student portal */}
      <Route
        path="/student"
        element={
          <ProtectedRoute roles={[ROLES.STUDENT]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={withSuspense(StudentDashboard)} />
        <Route path="programs" element={withSuspense(StudentPrograms)} />
        <Route path="forum" element={withSuspense(Forum)} />
        <Route path="support" element={withSuspense(Support)} />
        <Route path="attendance" element={withSuspense(StudentAttendance)} />
        <Route path="assignments" element={withSuspense(StudentAssignments)} />
        <Route path="courses" element={withSuspense(StudentCourses)} />
        <Route path="courses/:id" element={withSuspense(CourseDetail)} />
        <Route path="subjects" element={withSuspense(StudentSubjects)} />
        <Route path="academics" element={withSuspense(StudentAcademics)} />
        <Route path="portfolio" element={withSuspense(StudentPortfolio)} />
        <Route path="progress-report" element={withSuspense(ProgressReport)} />
        <Route path="ai-tutor" element={withSuspense(AITutor)} />
        <Route path="ai-copilot" element={withSuspense(AICopilot)} />
        <Route path="mentor" element={withSuspense(Mentor)} />
        <Route path="learning-path" element={withSuspense(LearningPath)} />
        <Route path="calendar" element={withSuspense(CalendarPage)} />
        <Route path="mock-tests" element={withSuspense(MockTests)} />
        <Route path="exams" element={withSuspense(Exams)} />
        <Route path="examinations" element={<Navigate to="/student/exam-agent" replace />} />
        <Route path="micro-assessments" element={withSuspense(StudentMicroAssessments)} />
        <Route path="micro-assessments/:assessmentId" element={withSuspense(StudentMicroAssessments)} />
        <Route path="exam-agent" element={withSuspense(ExamAgent)} />
        <Route path="interventions" element={withSuspense(StudentInterventions)} />
        <Route path="exam-analysis" element={withSuspense(ExamAnalysis)} />
        <Route path="performance-accuracy" element={withSuspense(PerformanceAccuracy)} />
        <Route path="settings" element={withSuspense(StudentSettings)} />
      </Route>

      {/* Faculty portal */}
      <Route
        path="/faculty"
        element={
          <ProtectedRoute roles={[ROLES.FACULTY]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={withSuspense(FacultyDashboard)} />
        {/* Teaching Intelligence Workspace — commented out for faculty clean-up
        <Route path="teaching" element={withSuspense(TeachingWorkspace)} />
        */}
        <Route path="support" element={withSuspense(FacultySupport)} />
        <Route path="courses" element={withSuspense(FacultyCourseOverview)} />
        <Route path="quiz-builder" element={withSuspense(FacultyQuizBuilder)} />
        <Route path="timetable" element={withSuspense(FacultyTimetable)} />
        <Route path="announcements" element={withSuspense(FacultyAnnouncements)} />
        {/* Legacy superseded pages → canonical Assessment / AI Intelligence destinations */}
        <Route path="ai-studio" element={<LegacyFacultyRedirect to="/faculty/ai-assistant?tab=content" />} />
        <Route path="attendance" element={withSuspense(FacultyAttendance)} />
        <Route path="assignments" element={withSuspense(FacultyAssignments)} />
        <Route path="question-bank" element={<LegacyFacultyRedirect to="/faculty/question-intelligence?tab=question-intelligence" />} />
        <Route path="question-intelligence" element={withSuspense(QuestionIntelligence)} />
        <Route path="question-intelligence/micro-assessment" element={withSuspense(MicroAssessmentStudio)} />
        <Route path="paper-generator" element={<LegacyFacultyRedirect to="/faculty/question-intelligence?tab=paper-generator" />} />
        <Route path="pyq-analysis" element={<LegacyFacultyRedirect to="/faculty/question-intelligence?tab=pyq" />} />
        <Route path="ai-assistant" element={withSuspense(AITeachingAssistant)} />
        <Route path="my-students" element={withSuspense(MyStudents)} />
        <Route path="my-students/:studentId" element={withSuspense(StudentProfile)} />
        {/* Backward-compatible alias for the old Student 360 deep link */}
        <Route path="students/:studentId/360" element={<Student360Redirect />} />
        <Route path="my-students/:studentId/exams/:attemptId" element={withSuspense(FacultyAttemptAnalysis)} />
        {/* Legacy attempt-analysis alias → canonical my-students route */}
        <Route path="students/:studentId/exams/:attemptId/analysis" element={<FacultyAttemptRedirect />} />
        <Route path="research" element={withSuspense(FacultyResearch)} />
        <Route path="lecture-planner" element={withSuspense(LecturePlanner)} />
        <Route path="exam-builder" element={withSuspense(ExamBuilder)} />
        <Route path="reports" element={withSuspense(FacultyReports)} />
        <Route path="settings" element={withSuspense(FacultySettings)} />
      </Route>

      {/* Admin portal */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={[ROLES.ADMIN]}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={withSuspense(AdminDashboard)} />
        <Route path="institution-intelligence" element={withSuspense(InstitutionIntelligence)} />
        <Route path="reports" element={withSuspense(AdminReports)} />
        <Route path="ai-workspace" element={withSuspense(AdminAIWorkspace)} />
        <Route path="support" element={withSuspense(AdminSupport)} />
        <Route path="revenue" element={withSuspense(AdminRevenue)} />
        <Route path="programs" element={withSuspense(AdminPrograms)} />
        <Route path="programs/:programId/results" element={withSuspense(AdminProgramResults)} />
        <Route path="subjects" element={withSuspense(AdminSubjects)} />
        <Route path="batches" element={withSuspense(AdminBatches)} />
        <Route path="calendar" element={withSuspense(AdminAcademicCalendar)} />
        <Route path="faculty" element={withSuspense(AdminFaculty)} />
        <Route path="faculty/:facultyId" element={withSuspense(AdminFacultyAnalytics)} />
        <Route path="students" element={withSuspense(AdminStudents)} />
        <Route path="students/similar-issues" element={withSuspense(AdminSimilarIssues)} />
        <Route path="students/:studentId" element={withSuspense(StudentProfile)} />
        <Route path="students/:studentId/exams/:attemptId" element={withSuspense(FacultyAttemptAnalysis)} />
        <Route path="attendance-analytics" element={<LegacyRedirect to="/admin/institution-intelligence?tab=attendance" />} />
        <Route path="assignment-analytics" element={<LegacyRedirect to="/admin/institution-intelligence?tab=attendance" />} />
        <Route path="exam-analytics" element={<LegacyRedirect to="/admin/institution-intelligence?tab=assessment" />} />
        <Route path="question-bank" element={withSuspense(AdminQuestionBank)} />
        <Route path="exams" element={withSuspense(AdminExams)} />
        <Route path="scholarships" element={withSuspense(AdminScholarships)} />
        <Route path="cms" element={withSuspense(AdminCms)} />
        <Route path="api-config" element={withSuspense(AdminApiConfig)} />
        <Route path="data-tools" element={withSuspense(AdminDataTools)} />
        <Route path="users" element={withSuspense(AdminUsers)} />
        <Route path="departments" element={withSuspense(AdminDepartments)} />
        <Route path="courses" element={withSuspense(AdminCourses)} />
        <Route path="academic-analytics" element={<LegacyRedirect to="/admin/institution-intelligence?tab=academic" />} />
        <Route path="performance" element={<LegacyRedirect to="/admin/institution-intelligence?tab=students" />} />
        <Route path="placements" element={<LegacyRedirect to="/admin/institution-intelligence?tab=outcomes" />} />
        <Route path="research" element={withSuspense(AdminResearch)} />
        <Route path="roles" element={withSuspense(AdminRoles)} />
        <Route path="permissions" element={withSuspense(AdminPermissions)} />
        <Route path="audit-logs" element={withSuspense(AdminAuditLogs)} />
        <Route path="ai-config" element={withSuspense(AdminAiConfig)} />
        <Route path="settings" element={withSuspense(AdminSettings)} />
      </Route>

      {/* Parent portal */}
      <Route
        path="/parent"
        element={
          <ParentGate>
            <ProtectedRoute roles={[ROLES.PARENT]}>
              <AppLayout />
            </ProtectedRoute>
          </ParentGate>
        }
      >
        <Route index element={withSuspense(ParentDashboard)} />
        <Route path="assignments" element={withSuspense(ParentAssignments)} />
        <Route path="fees" element={withSuspense(ParentFees)} />
        <Route path="behavior" element={withSuspense(ParentBehavior)} />
        <Route path="calendar" element={withSuspense(ParentCalendar)} />
        <Route path="downloads" element={withSuspense(ParentDownloads)} />
        <Route path="settings" element={withSuspense(ParentSettings)} />
        <Route path="progress" element={withSuspense(ParentProgress)} />
        <Route path="attendance" element={withSuspense(ParentAttendance)} />
        <Route path="performance" element={withSuspense(ParentPerformance)} />
        <Route path="exam-results" element={withSuspense(ParentExamResults)} />
        <Route path="communication" element={withSuspense(ParentCommunication)} />
        <Route path="ai-insights" element={withSuspense(ParentAIInsights)} />
        <Route path="reports" element={withSuspense(ParentReports)} />
      </Route>

      {/* Shared */}
      <Route path="/403" element={withSuspense(Forbidden)} />

      {/* Fallback */}
      <Route path="*" element={withSuspense(NotFound)} />
    </Routes>
  )
}

export { AppRoutes }
export default AppRoutes
