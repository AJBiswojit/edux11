/**
 * Teaching Intelligence Workspace — Tab 5: Teaching Insights ⭐ (flagship).
 * Weak chapters, weak topics with affected students + recommended actions +
 * suggested resources, class performance, average understanding, learning
 * gaps, revision priority, topic difficulty and ranked recommendations —
 * all derived from the Faculty Intelligence Foundation.
 */

import { BookOpen, Database, Lightbulb, ListChecks, Target, Users } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { ChartCard } from '@/components/shared/chart-card'
import { ProgressRing } from '@/components/shared/progress-ring'
import { BarCompare } from '@/components/charts'
import { Badge, Card } from '@/components/ui'
import { WorkspaceSection } from './shared'

const SEVERITY_VARIANT = { Critical: 'danger', High: 'warning', Medium: 'secondary' }
const PRIORITY_VARIANT = { Critical: 'danger', High: 'warning', Medium: 'secondary' }

function GapBar({ value, max = 40 }) {
  const color = value >= 30 ? '#ef4444' : value >= 20 ? '#f59e0b' : '#10b981'
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }} />
    </div>
  )
}

function WeakTopicCard({ topic }) {
  return (
    <Card className="p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md">
            <Target className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13.5px] font-bold text-slate-900 dark:text-white">{topic.topic}</p>
            <p className="text-[10.5px] text-slate-400">{topic.chapter} · {topic.course}</p>
          </div>
        </div>
        <Badge variant={topic.difficulty === 'Hard' ? 'danger' : topic.difficulty === 'Medium' ? 'warning' : 'secondary'} size="sm">{topic.difficulty}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-rose-50 p-3 text-center dark:bg-rose-500/10">
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{topic.studentsAffected}</p>
          <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">Students affected</p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-3 text-center dark:bg-amber-500/10">
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{topic.gap}%</p>
          <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">Gap</p>
        </div>
      </div>

      <div className="mt-3.5">
        <GapBar value={topic.gap ?? 0} />
      </div>

      <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-500/20 dark:bg-indigo-500/[0.07]">
        <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
          <Lightbulb className="h-3.5 w-3.5" /> Recommended action
        </p>
        <p className="mt-1 text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{topic.action?.label ?? 'Revision class'}</p>
        <p className="text-[10.5px] text-slate-400">Estimated effort · {topic.action?.effort ?? '—'}</p>
      </div>

      {(topic.resources ?? []).length > 0 && (
        <div className="mt-3.5">
          <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Suggested resources</p>
          <div className="flex flex-wrap gap-1.5">
            {(topic.resources ?? []).map((r) => (
              <Badge key={r.title} variant="outline" size="sm" className="text-indigo-700 dark:text-indigo-300">
                {r.type === 'Question Bank' ? <Database className="mr-1 h-3 w-3" /> : r.type === 'Assignment' ? <ListChecks className="mr-1 h-3 w-3" /> : <BookOpen className="mr-1 h-3 w-3" />}
                {r.type}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function InsightsTab({ data }) {
  const ti = data.derived.teachingInsights ?? {}
  const recs = data.derived.recommendations?.items ?? []

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard index={0} label="Weak chapters" value={String(ti.weakChaptersCount ?? 0)} sub="flagged for revision" icon="BookOpen" gradient="from-rose-500 to-red-500" />
        <StatCard index={1} label="Weak topics" value={String(ti.weakTopicsCount ?? 0)} sub="high-impact PYQ patterns" icon="Target" gradient="from-amber-500 to-orange-500" />
        <StatCard index={2} label="Average understanding" value={ti.averageUnderstanding != null ? `${ti.averageUnderstanding}%` : '—'} sub="outcome attainment" icon="BrainCircuit" gradient="from-indigo-500 to-blue-500" />
        <StatCard index={3} label="Learning gaps" value={String(ti.learningGaps?.length ?? 0)} sub="skill gaps to close" icon="ListChecks" gradient="from-violet-500 to-purple-500" />
        <StatCard index={4} label="Critical revision" value={String(data.derived.revisionPriority?.critical ?? 0)} sub="priority items" icon="Sparkles" gradient="from-emerald-500 to-teal-500" />
      </div>

      {/* Weak topics — flagship */}
      <WorkspaceSection title="Weak topics" subtitle="What to revise, how many students are affected and exactly what to do" icon={Target}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(ti.weakTopics ?? []).map((t, i) => <WeakTopicCard key={t.topic} topic={t} index={i} />)}
          {ti.weakTopics?.length === 0 && <Card className="p-6 text-center text-xs text-slate-400 md:col-span-3">No weak topics detected — the class is on track.</Card>}
        </div>
      </WorkspaceSection>

      {/* Weak chapters + class performance */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Weak chapters" subtitle="From class skill gaps + PYQ frequency" actions={<Badge variant="danger" size="sm">{ti.weakChapters?.length ?? 0}</Badge>}>
          <div className="space-y-3.5">
            {(ti.weakChapters ?? []).map((w) => (
              <div key={w.chapter} className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{w.chapter}</p>
                  <div className="flex items-center gap-1.5">
                    {w.affectedStudents != null && <Badge variant="secondary" size="sm"><Users className="mr-1 h-3 w-3" />{w.affectedStudents} students</Badge>}
                    <Badge variant={SEVERITY_VARIANT[w.severity] ?? 'secondary'} size="sm">{w.severity}</Badge>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="flex-1"><GapBar value={w.gap ?? 0} /></div>
                  <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{w.gap}% gap</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10.5px] text-slate-400">{w.source} · {w.action?.label}</span>
                  <span className="text-[10.5px] font-semibold text-indigo-500">effort {w.action?.effort}</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Class performance" subtitle="Average score & pass rate per course">
          <BarCompare
            data={(ti.classPerformance ?? []).map((c) => ({ label: c.course, avg: c.avg, passRate: c.passRate, atRisk: c.atRisk }))}
            xKey="label"
            height={240}
            series={[
              { key: 'avg', name: 'Class avg %', color: '#6366f1' },
              { key: 'passRate', name: 'Pass rate %', color: '#10b981' },
            ]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>
      </div>

      {/* Understanding + gaps */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard title="Average understanding" subtitle="Outcome attainment across courses">
          <div className="flex items-center gap-5">
            <ProgressRing value={ti.averageUnderstanding ?? 0} size={116} stroke={11} color="#8b5cf6" label={`${ti.averageUnderstanding ?? 0}%`} sublabel="understanding" />
            <div className="flex-1 space-y-2.5">
              {(ti.byCourseUnderstanding ?? []).map((c) => (
                <div key={c.course}>
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">{c.course}</span>
                    <span className="text-slate-800 dark:text-slate-100">{c.understanding ?? '—'}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${c.understanding ?? 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Learning gaps" subtitle="Where understanding breaks down" className="lg:col-span-1">
          <div className="space-y-3">
            {(ti.learningGaps ?? []).map((g) => (
              <div key={g.chapter} className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{g.chapter}</p>
                  <Badge variant={SEVERITY_VARIANT[g.severity] ?? 'secondary'} size="sm">{g.gap}%</Badge>
                </div>
                <div className="mt-2"><GapBar value={g.gap ?? 0} /></div>
                <p className="mt-1.5 text-[10.5px] text-slate-400"><Users className="mr-1 inline h-3 w-3" />{g.students} students affected · {g.resources?.map((r) => r.type).join(' · ')}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Topic difficulty" subtitle="Question-bank distribution (easy → hard)">
          <div className="space-y-2.5">
            {(ti.topicDifficulty ?? []).map((t) => (
              <div key={t.topic} className="flex items-center gap-3">
                <span className="w-28 truncate text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">{t.topic}</span>
                <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <span className="bg-emerald-400" style={{ width: `${(t.easy / Math.max(t.total, 1)) * 100}%` }} />
                  <span className="bg-indigo-400" style={{ width: `${(t.medium / Math.max(t.total, 1)) * 100}%` }} />
                  <span className="bg-rose-400" style={{ width: `${(t.hard / Math.max(t.total, 1)) * 100}%` }} />
                </div>
                <Badge variant={t.difficultyScore >= 2.4 ? 'danger' : t.difficultyScore >= 2 ? 'warning' : 'secondary'} size="sm">{t.difficultyScore.toFixed(1)}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 text-[10px] font-semibold text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Easy</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-400" /> Medium</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> Hard</span>
          </div>
        </ChartCard>
      </div>

      {/* Revision priority + recommendations */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Revision priority" subtitle="Ranked by PYQ frequency & impact" actions={<Badge variant="danger" size="sm">{data.derived.revisionPriority?.critical ?? 0} critical</Badge>}>
          <div className="space-y-2.5">
            {(ti.revisionPriority ?? []).map((r, i) => (
              <div key={`${r.topic}-${i}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{r.topic}</p>
                  <p className="text-[10.5px] text-slate-400">{r.frequency != null ? `PYQ frequency ${r.frequency}` : 'Class signal'} · impact {r.impact}</p>
                </div>
                <Badge variant={PRIORITY_VARIANT[r.priority] ?? 'secondary'} size="sm">{r.priority}</Badge>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Teaching recommendations" subtitle="Ranked actions — from alerts + insight pools" actions={<Badge variant="warning" size="sm">{data.derived.recommendations?.critical ?? 0} critical</Badge>}>
          <div className="space-y-2.5">
            {recs.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{r.title}</p>
                  <Badge variant={PRIORITY_VARIANT[r.priority] ?? 'secondary'} size="sm">{r.priority}</Badge>
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">{r.reason}</p>
                <div className="mt-2 flex items-center gap-3 text-[10.5px] font-semibold text-slate-400">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">effort · {r.effort}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">impact · {r.impact}</span>
                  {r.fromAlert && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">from live alert</span>}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

export { InsightsTab }
export default InsightsTab
