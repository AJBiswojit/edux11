/**
 * Faculty/Admin — Attempt Analysis (Phase 3).
 * Thin wrapper that renders the EXISTING AI Exam Analysis dashboard
 * (AnalysisDashboard — same component the student page uses, including the
 * percentage question-intelligence chips) for a student's attempt.
 * Faculty: /faculty/my-students/:studentId/exams/:attemptId
 * Admin:   /admin/students/:studentId/exams/:attemptId
 * Both routes mount this page. No duplicate analysis engine or cards.
 *
 * Both roles get the same two Premium PDF actions (Report / Full Analysis).
 * Student identity comes from the existing student-profile payload, never
 * from the signed-in Faculty/Admin account.
 */
import { useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, useToast } from '@/components/ui'
import { AnalysisDashboard } from '@/pages/student/ExamAnalysis'
import { analysisPdfUser, exportAnalysisPDF, exportFullAnalysisPDF } from '@/pages/student/exam-analysis-pdf'
import { useFacultyAttemptAnalysis, useFacultyStudent360 } from '@/services/faculty-students'

const SUBJECT = 'All Subjects'

/** Development-only diagnostics; the user-facing toast stays friendly. */
function logPdfExportError(label, error) {
  if (import.meta.env?.DEV) {
    console.error(`[EduX PDF Export] ${label} failed`, error)
    if (error?.stack) console.error(`[EduX PDF Export] ${label} stack`, error.stack)
  }
}

function FacultyAttemptAnalysis() {
  const { studentId, attemptId } = useParams()
  const { pathname } = useLocation()
  const toast = useToast()
  const isAdminContext = pathname.startsWith('/admin')

  const { data, isLoading, isError, refetch } = useFacultyAttemptAnalysis(studentId, attemptId)
  const { data: studentProfile } = useFacultyStudent360(studentId)

  const [reportBusy, setReportBusy] = useState(false)
  const [fullBusy, setFullBusy] = useState(false)
  const reportRunning = useRef(false)
  const fullRunning = useRef(false)

  const studentBase = isAdminContext ? `/admin/students/${studentId}` : `/faculty/my-students/${studentId}`
  const listBase = isAdminContext ? '/admin/students' : '/faculty/my-students'
  const portalLabel = isAdminContext ? 'Admin' : 'Faculty'
  const listLabel = isAdminContext ? 'Students' : 'My Students'

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />

  // The analysis payload carries the roll number but not the student's name.
  // The existing student-profile endpoint supplies the real name for both
  // Faculty and Admin; the payload is used only as a fallback. Never use the
  // signed-in staff identity here.
  const payloadUser = analysisPdfUser(data)
  const profileStudent = studentProfile?.student ?? null
  const rollNo = profileStudent?.roll || profileStudent?.rollNo || payloadUser.rollNo || null
  const fullName = profileStudent?.name || profileStudent?.fullName || payloadUser.fullName || null
  const pdfUser = {
    fullName: fullName || (rollNo ? `Roll ${rollNo}` : null),
    rollNo,
  }

  const runExport = (label, exportFn, setBusy, runningRef, successTitle, successMessage) => {
    if (runningRef.current || !data) return
    runningRef.current = true
    setBusy(true)
    exportFn(data, SUBJECT, pdfUser)
      .then(() => toast.success(successTitle, successMessage))
      .catch((error) => {
        logPdfExportError(label, error)
        toast.error('PDF failed', `Could not create the ${label.toLowerCase()}. Please try again.`)
      })
      .finally(() => {
        runningRef.current = false
        setBusy(false)
      })
  }

  const handleReport = () => runExport(
    'Report', exportAnalysisPDF, setReportBusy, reportRunning,
    'Report downloaded', 'The marks report was saved to your downloads.',
  )

  const handleFull = () => runExport(
    'Full Analysis', exportFullAnalysisPDF, setFullBusy, fullRunning,
    'Full analysis downloaded', 'Your complete analysis PDF was saved to downloads.',
  )

  return (
    <div>
      <PageHeader
        title={data?.meta?.examName ?? 'Attempt analysis'}
        breadcrumbs={[
          { label: portalLabel },
          { label: listLabel, to: listBase },
          { label: 'Student', to: studentBase },
          { label: 'Attempt analysis' },
        ]}
        actions={
          <>
            {data?.meta?.examId ? <Badge variant="gradient" className="px-3 py-1">{data.meta.examId}</Badge> : null}
            <Button variant="outline" size="sm" disabled={reportBusy} onClick={handleReport}>
              {reportBusy
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
                : <Download className="h-4 w-4" />}
              Report
            </Button>
            <Button variant="outline" size="sm" disabled={fullBusy} onClick={handleFull}>
              {fullBusy
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-500" />
                : <Download className="h-4 w-4" />}
              Full Analysis
            </Button>
          </>
        }
      />
      <Link to={studentBase} className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to student profile
      </Link>
      <AnalysisDashboard data={data} subject={SUBJECT} />
    </div>
  )
}

export { FacultyAttemptAnalysis }
export default FacultyAttemptAnalysis
