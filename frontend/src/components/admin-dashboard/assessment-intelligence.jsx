/**
 * MediXO EduX — Institution Command Center · Section 8: Assessment
 * Intelligence (compact overview — NOT the full Exam Analytics page).
 */

import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, FileCheck2, FileText, FlaskConical, ListChecks } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { ProgressRing } from '@/components/shared/progress-ring'
import { Badge, Button } from '@/components/ui'

function AssessmentIntelligence({ data }) {
  const assessments = data.derived.assessments ?? {}
  const exams = assessments.exams ?? {}
  const assignments = assessments.assignments ?? {}
  const bank = assessments.questionBank ?? {}
  const readiness = exams.readiness ?? {}
  const health = data.derived.institutionHealth?.pillars?.find((p) => p.label === 'Assessment health')

  return (
    <ChartCard
      title="Assessment intelligence"
      subtitle="Compact institution overview"
      className="h-full"
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/exam-analytics">Exam analytics <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Button>
      }
    >
      <div className="flex items-center gap-5">
        <ProgressRing value={health?.value ?? 0} size={104} stroke={10} color="#f43f5e" label={`${health?.value ?? '—'}`} sublabel="health" />
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          {[
            { icon: ClipboardList, label: 'Exams this term', value: String(exams.total ?? '—') },
            { icon: FileText, label: 'Avg performance', value: `${exams.averageScore ?? '—'}%` },
            { icon: FileCheck2, label: 'Pass rate', value: `${exams.passRate ?? '—'}%` },
            { icon: ListChecks, label: 'Assignment submission', value: `${assignments.submissionRate ?? '—'}%` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 px-2.5 py-2 text-center dark:bg-slate-800/50">
              <s.icon className="mx-auto h-3.5 w-3.5 text-indigo-400" />
              <p className="mt-0.5 text-[12.5px] font-bold text-slate-800 dark:text-white">{s.value}</p>
              <p className="text-[8.5px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming readiness */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
          <span>Midsem readiness · {readiness.total ?? 0} exams</span>
          <span>{readiness.ready ?? 0} ready</span>
        </div>
        <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <span className="bg-emerald-500" style={{ width: `${((readiness.ready ?? 0) / Math.max(readiness.total ?? 1, 1)) * 100}%` }} />
          <span className="bg-amber-500" style={{ width: `${((readiness.inReview ?? 0) / Math.max(readiness.total ?? 1, 1)) * 100}%` }} />
          <span className="bg-rose-500" style={{ width: `${((readiness.drafting ?? 0) / Math.max(readiness.total ?? 1, 1)) * 100}%` }} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[9.5px] font-semibold text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Ready {readiness.ready ?? 0}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> In review {readiness.inReview ?? 0}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Drafting {readiness.drafting ?? 0}</span>
        </div>
      </div>

      {(readiness.drafting ?? 0) > 0 && (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-amber-50/70 p-3 dark:bg-amber-500/5">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-800 dark:text-slate-100">Assessment risk:</span> {readiness.drafting} exam draft(s) still drafting — midsem begins Aug 19. Finalize this week.
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" size="sm"><FileText className="mr-1 h-3 w-3" /> Question bank {bank.total?.toLocaleString?.('en-IN') ?? bank.total ?? '—'}</Badge>
        <Badge variant="outline" size="sm">AI-generated {bank.aiGenerated ?? '—'}</Badge>
        <Badge variant="outline" size="sm">Flagged {bank.flagged ?? '—'}</Badge>
      </div>
    </ChartCard>
  )
}

export { AssessmentIntelligence }
export default AssessmentIntelligence
