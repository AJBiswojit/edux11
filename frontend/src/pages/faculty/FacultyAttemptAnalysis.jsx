/**
 * Faculty/Admin — Attempt Analysis (Phase 3).
 * Thin wrapper that renders the EXISTING AI Exam Analysis dashboard
 * (AnalysisDashboard — same component the student page uses, including the
 * percentage question-intelligence chips) for a student's attempt.
 * Faculty: /faculty/my-students/:studentId/exams/:attemptId
 * Admin:   /admin/students/:studentId/exams/:attemptId
 * Both routes mount this page. No duplicate analysis engine or cards.
 * PDF uses the same exportAnalysisPDF helper as the student analysis page.
 */
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, useToast } from '@/components/ui'
import { AnalysisDashboard } from '@/pages/student/ExamAnalysis'
import { analysisPdfUser, exportAnalysisPDF } from '@/pages/student/exam-analysis-pdf'
import { useFacultyAttemptAnalysis } from '@/services/faculty-students'

function FacultyAttemptAnalysis() {
  const { studentId, attemptId } = useParams()
  const { pathname } = useLocation()
  const toast = useToast()
  const isAdminContext = pathname.startsWith('/admin')

  const { data, isLoading, isError, refetch } = useFacultyAttemptAnalysis(studentId, attemptId)

  const studentBase = isAdminContext ? `/admin/students/${studentId}` : `/faculty/my-students/${studentId}`
  const listBase = isAdminContext ? '/admin/students' : '/faculty/my-students'
  const portalLabel = isAdminContext ? 'Admin' : 'Faculty'
  const listLabel = isAdminContext ? 'Students' : 'My Students'

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />

  const handlePdf = () => {
    exportAnalysisPDF(data, 'All Subjects', analysisPdfUser(data))
      .then(() => toast.success('PDF downloaded', 'The analysis report was saved to your downloads.'))
      .catch(() => toast.error('PDF failed', 'Could not create the analysis report. Please try again.'))
  }

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
            <Button variant="outline" size="sm" onClick={handlePdf}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </>
        }
      />
      <Link to={studentBase} className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to student profile
      </Link>
      <AnalysisDashboard data={data} subject="All Subjects" />
    </div>
  )
}

export { FacultyAttemptAnalysis }
export default FacultyAttemptAnalysis
