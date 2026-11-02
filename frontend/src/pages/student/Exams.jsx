/**
 * EduX Phase 9 — Exams (legacy deep-link) · Backend-Ready
 * GET /student/exams from backend, no seeded fallback.
 */

import { useState } from 'react'
import { CalendarDays, ClipboardList, Database, FileText } from 'lucide-react'
import { useStudentExams } from '@/services/student-examinations'
import { useAdmitCard } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton } from '@/components/shared/loading'
import { Badge, Button, useToast } from '@/components/ui'
import { UpcomingExamCard, ExamDetailsDialog } from '@/components/exam-workspace'
import { formatDate, formatRelative } from '@/utils/format'

export function PastResultsTable({ items }) {
  if (!items?.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
        <p className="py-2 text-sm text-slate-400">No completed exams yet.</p>
      </div>
    )
  }
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200/70 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Exam</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Date</th>
              <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Score</th>
              <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Grade</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-indigo-50/40 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
                <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">{e.title}</td>
                <td className="px-5 py-4 text-slate-400">{formatDate(e.date)}</td>
                <td className="px-5 py-4 text-center font-bold text-slate-800 dark:text-slate-100">{e.score}<span className="text-slate-300 dark:text-slate-600">/{e.maxMarks}</span></td>
                <td className="px-5 py-4 text-center"><Badge variant="success">{e.grade}</Badge></td>
                <td className="px-5 py-4 text-right text-[11px] font-medium text-slate-400">{formatRelative(e.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Exams() {
  const { data, isLoading, isError, error, refetch } = useStudentExams()
  const { data: admitData } = useAdmitCard()
  const [selected, setSelected] = useState(null)
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) {
    const isBackendDown = !error?.response || error?.response?.status >= 500
    return (
      <div>
        <PageHeader eyebrow="Academics · Exams" title="Examinations" description="Your upcoming and past examinations." breadcrumbs={[{ label: 'Student' }, { label: 'Exams' }]} />
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <Database className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{isBackendDown ? 'No examinations available' : 'Could not load examinations'}</p>
          <p className="mt-1 text-xs text-slate-400">Examinations are temporarily unavailable. Please try again later.</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    )
  }

  const items = data?.items ?? data?.exams ?? (Array.isArray(data) ? data : [])
  const upcoming = items.filter((e) => (e.status ?? 'Upcoming') === 'Upcoming')
  const past = items.filter((e) => e.status === 'Completed')

  const handleAddToPlanner = () => {
    toast.info('Not available yet', 'Adding this exam to your planner is not available yet.')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Academics · Exams"
        title="Examinations"
        description="Your upcoming and past examinations — answer keys stay hidden until the exam is over."
        breadcrumbs={[{ label: 'Student' }, { label: 'Exams' }]}
        actions={<Badge variant="gradient" className="px-3 py-1"><CalendarDays className="h-3 w-3" /> {upcoming.length} upcoming</Badge>}
      />

      <div className="mb-4 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-indigo-500" />
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Upcoming ({upcoming.length})</h2>
      </div>

      {upcoming.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
          <Database className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">No upcoming examinations</p>
          <p className="mt-1 text-xs text-slate-400">No published examinations yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {upcoming.map((e, i) => (
            <div key={e.id} style={{ animationDelay: `${i * 60}ms` }} className="animate-fade-up">
              <UpcomingExamCard exam={e} onViewDetails={() => setSelected(e)} onAddToPlanner={() => handleAddToPlanner(e)} />
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 mt-10 flex items-center gap-2">
        <FileText className="h-4 w-4 text-emerald-500" />
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Past results</h2>
      </div>
      <PastResultsTable items={past} />

      <ExamDetailsDialog exam={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} admit={admitData} onDownload={() => toast.info('Not available yet', 'Admit-card PDF download is not available yet.')} />
    </div>
  )
}

export { Exams, UpcomingExamCard, ExamDetailsDialog }
export default Exams
