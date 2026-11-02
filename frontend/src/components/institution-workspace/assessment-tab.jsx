/**
 * Institution Intelligence Workspace · Tab 5: Assessment Intelligence.
 * Institution-level assessment analytics (former Exam Analytics + question
 * bank content) — NOT a duplicate of the Faculty Question Intelligence
 * workspace.
 */

import { AlertTriangle, BookOpenCheck, ClipboardList, FileCheck2, ListChecks } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { BarCompare, DonutChart } from '@/components/charts'
import { Badge, Card, Progress } from '@/components/ui'
import { EmptyState } from '@/components/shared/empty-state'
import { KpiStrip, WorkspaceSection } from './shared'

function AssessmentTab({ data }) {
  const d = data.derived
  const assessments = d.assessments ?? {}
  const exams = assessments.exams ?? {}
  const assignments = assessments.assignments ?? {}
  const bank = assessments.questionBank ?? {}
  const readiness = exams.readiness ?? {}
  const health = d.institutionHealth?.pillars?.find((p) => p.label === 'Assessment health')

  return (
    <div>
      <KpiStrip
        cols={4}
        items={[
          { label: 'Assessment health', value: `${health?.value ?? '—'}/100`, sub: health?.grade ?? '—' },
          { label: 'Exams this term', value: String(exams.total ?? '—'), sub: `${exams.malpractice ?? 0} malpractice cases` },
          { label: 'Average score', value: `${exams.averageScore ?? '—'}%`, sub: `pass rate ${exams.passRate ?? '—'}%` },
          { label: 'Assignment submission', value: `${assignments.submissionRate ?? '—'}%`, sub: `on-time ${assignments.onTimeRate ?? '—'}% · AI-graded ${assignments.aiGradedShare ?? '—'}%` },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Score distribution" subtitle="Exam performance bands" className="min-w-0">
          <DonutChart
            data={(exams.scoreDistribution ?? []).map((s, i) => ({ name: s.range, value: s.count, color: ['#6366f1', '#3b82f6', '#14b8a6', '#10b981', '#f59e0b', '#f43f5e'][i] }))}
            height={230}
            centerLabel={`${exams.total ?? '—'}`}
            centerSub="exams"
          />
        </ChartCard>

        <ChartCard title="Subject performance" subtitle="Average score by subject" className="min-w-0">
          <BarCompare
            data={(exams.bySubject ?? []).map((s) => ({ label: s.subject, avg: s.avg }))}
            xKey="label"
            height={230}
            series={[{ key: 'avg', name: 'Avg score', color: '#6366f1' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>

        <ChartCard title="Question bank coverage" subtitle="Institution-level bank">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Total questions', value: (bank.total ?? 0).toLocaleString('en-IN'), icon: ListChecks },
              { label: 'AI-generated', value: (bank.aiGenerated ?? 0).toLocaleString('en-IN'), icon: FileCheck2 },
              { label: 'Approved', value: (bank.approved ?? 0).toLocaleString('en-IN'), icon: BookOpenCheck },
              { label: 'Flagged', value: String(bank.flagged ?? 0), icon: AlertTriangle },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-50 p-3.5 text-center dark:bg-slate-800/50">
                <s.icon className="mx-auto h-4 w-4 text-indigo-400" />
                <p className="mt-1 font-display text-lg font-bold text-slate-800 dark:text-white">{s.value}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {(Object.entries(bank.byType ?? {})).map(([type, count]) => (
              <Badge key={type} variant="outline" size="sm">{type} {(count ?? 0).toLocaleString('en-IN')}</Badge>
            ))}
          </div>
        </ChartCard>
      </div>

      <WorkspaceSection title="Midsem readiness" subtitle="Exams Aug 19–23 · readiness status">
        {(exams.upcoming ?? []).length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(exams.upcoming ?? []).map((u) => (
              <Card key={u.title} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{u.title}</p>
                  <Badge variant={u.status === 'Ready' ? 'success' : u.status === 'In Review' ? 'warning' : 'secondary'} size="sm">{u.status}</Badge>
                </div>
                <p className="mt-1 text-[10.5px] text-slate-400">{u.date} · {u.students} students</p>
                <Progress value={u.status === 'Ready' ? 100 : u.status === 'In Review' ? 75 : 45} className="mt-2 h-1.5" gradient={u.status === 'Ready' ? 'from-emerald-500 to-teal-400' : u.status === 'In Review' ? 'from-amber-500 to-orange-400' : 'from-slate-400 to-slate-300'} />
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState compact title="No upcoming exams" description="The exam calendar is clear." />
        )}
        {(readiness.drafting ?? 0) > 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-amber-50/70 p-3.5 dark:bg-amber-500/5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-800 dark:text-slate-100">Assessment risk:</span> {readiness.drafting} exam draft(s) still drafting ({readiness.ready ?? 0} ready of {readiness.total ?? 0}) — finalize before the midsem window.
            </p>
          </div>
        )}
      </WorkspaceSection>

      <WorkspaceSection title="Assignment engagement" subtitle="Institution-wide submission behaviour">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Submission rate by department" className="min-w-0">
            <BarCompare
              data={(assignments.byDept ?? []).map((x) => ({ label: x.dept, submitted: x.submitted }))}
              xKey="label"
              height={210}
              series={[{ key: 'submitted', name: 'Submission %', color: '#14b8a6' }]}
              formatter={(v) => `${v}%`}
            />
          </ChartCard>
          <ChartCard title="Monthly assignments" className="min-w-0">
            <BarCompare
              data={(assignments.monthly ?? []).map((m) => ({ label: m.month, count: m.assignments }))}
              xKey="label"
              height={210}
              series={[{ key: 'count', name: 'Assignments', color: '#f59e0b' }]}
              formatter={(v) => `${v}`}
            />
          </ChartCard>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="warning" size="sm"><ClipboardList className="mr-1 h-3 w-3" /> Plagiarism flags {assignments.plagiarism?.total ?? '—'}</Badge>
          <Badge variant="success" size="sm">Resolved {assignments.plagiarism?.resolved ?? '—'}</Badge>
          <Badge variant="outline" size="sm">Under review {assignments.plagiarism?.underReview ?? '—'}</Badge>
        </div>
      </WorkspaceSection>
    </div>
  )
}

export { AssessmentTab }
export default AssessmentTab
