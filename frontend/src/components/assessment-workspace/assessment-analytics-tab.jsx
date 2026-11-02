/**
 * MediXO EduX — Assessment Workspace · Tab 6: Assessment Analytics.
 * Coverage, question distribution, difficulty & Bloom analysis, chapter &
 * course coverage, average performance, weak chapters, frequently asked
 * concepts, assessment timeline and AI insights — all derived from the
 * Faculty Intelligence Foundation.
 */

import { Sparkles, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { ChartCard } from '@/components/shared/chart-card'
import { BarCompare, DonutChart, LineTrend } from '@/components/charts'
import { Badge } from '@/components/ui'
import { AiInsightCard, WorkspaceSection } from '@/components/teaching-workspace/shared'
import { formatDate } from '@/utils/format'

const BLOOM_COLORS = { Remember: '#6366f1', Understand: '#3b82f6', Apply: '#14b8a6', Analyze: '#10b981', Evaluate: '#f59e0b', Create: '#8b5cf6' }
const TYPE_ICON = { paper: '📄', quiz: '⚡', exam: '📋' }

function AssessmentAnalyticsTab({ data }) {
  const a = data.derived.assessment ?? {}
  const qs = a.questionStats ?? {}
  const cov = a.coverage ?? {}
  const pyq = data.derived.pyqIntelligence ?? {}
  const health = a.assessmentHealth ?? {}

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Coverage vs target" value={`${round(cov.units?.length ? cov.units.reduce((s, u) => s + (u.targetPct ?? 0), 0) / cov.units.length : 0)}%`} sub="avg unit target attainment" icon="Target" gradient="from-indigo-500 to-blue-500" />
        <StatCard index={1} label="Units below target" value={String(cov.belowTarget?.length ?? 0)} sub="need more questions" icon="AlertTriangle" gradient="from-rose-500 to-red-500" />
        <StatCard index={2} label="Avg question accuracy" value={qs.avgAccuracy != null ? `${qs.avgAccuracy}%` : '—'} sub="cohort performance" icon="Gauge" gradient="from-emerald-500 to-teal-500" />
        <StatCard index={3} label="PYQ corpus" value={`${pyq.university?.pyqCorpus?.totalPapers ?? '—'} papers`} sub={`${pyq.university?.pyqCorpus?.totalQuestions ?? '—'} questions`} icon="BookOpenCheck" gradient="from-amber-500 to-orange-500" />
      </div>

      {/* Coverage + distribution */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard title="Assessment coverage" subtitle="Question share per unit across courses" className="lg:col-span-2">
          <div className="space-y-3.5">
            {(cov.courses ?? []).map((c) => (
              <div key={c.course}>
                <p className="mb-1.5 flex items-center justify-between text-[12px] font-bold">
                  <span className="text-slate-700 dark:text-slate-200">{c.course} · {c.title}</span>
                  <span className="text-slate-400">{c.total} questions</span>
                </p>
                <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  {c.units.map((u) => (
                    <span
                      key={u.unit}
                      className={u.healthy ? 'bg-gradient-to-r from-indigo-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-red-400'}
                      style={{ width: `${u.coveragePct}%` }}
                      title={`${u.unit} ${u.name} — ${u.coveragePct}%`}
                    />
                  ))}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {c.units.map((u) => (
                    <span key={u.unit} className="text-[10px] font-medium text-slate-400">
                      <span className={u.healthy ? 'text-indigo-500' : 'text-rose-500'}>{u.unit}</span> {u.coveragePct}%
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Question distribution" subtitle="Share of the bank per course">
          <DonutChart
            data={(Object.entries(qs.bySubject ?? {})).map(([course, count], i) => ({ name: course, value: count, color: ['#6366f1', '#14b8a6', '#f59e0b', '#8b5cf6', '#f43f5e', '#0ea5e9'][i] }))}
            height={230}
            centerLabel={String(qs.total ?? 0)}
            centerSub="questions"
          />
        </ChartCard>
      </div>

      {/* Difficulty + Bloom + types */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard title="Difficulty analysis" subtitle="Bank mix vs 30/50/20 target">
          <BarCompare
            data={(qs.difficultyDistribution ?? []).map((d) => ({ label: d.level, bank: d.pct, target: d.level === 'Easy' ? 30 : d.level === 'Medium' ? 50 : 20 }))}
            xKey="label"
            height={230}
            series={[
              { key: 'bank', name: 'Bank %', color: '#6366f1' },
              { key: 'target', name: 'Target %', color: '#94a3b8' },
            ]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>

        <ChartCard title="Bloom distribution" subtitle="Cognitive levels in the bank">
          <BarCompare
            data={(qs.bloomDistribution ?? []).map((b) => ({ label: b.level, count: b.count }))}
            xKey="label"
            height={230}
            series={[{ key: 'count', name: 'Questions', color: '#8b5cf6' }]}
            formatter={(v) => `${v} questions`}
          />
        </ChartCard>

        <ChartCard title="Question types" subtitle="Type mix across the bank">
          <BarCompare
            data={(qs.typeDistribution ?? []).map((t) => ({ label: t.type, count: t.count }))}
            xKey="label"
            height={230}
            series={[{ key: 'count', name: 'Questions', color: '#14b8a6' }]}
            formatter={(v) => `${v} questions`}
          />
        </ChartCard>
      </div>

      {/* Weak chapters + PYQ concepts + timeline */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard title="Weak chapters" subtitle="Units below healthy question targets" actions={<Badge variant="danger" size="sm">{cov.belowTarget?.length ?? 0}</Badge>}>
          <div className="space-y-3">
            {(cov.belowTarget ?? []).slice(0, 6).map((u) => (
              <div key={`${u.course}-${u.unit}`} className="rounded-2xl border border-rose-100 p-3.5 dark:border-rose-500/20">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{u.course} · {u.name}</p>
                  <Badge variant={u.targetPct <= 60 ? 'danger' : 'warning'} size="sm">{u.targetPct ?? 0}% of target</Badge>
                </div>
                <p className="mt-1 text-[10.5px] text-slate-400">{u.questions} questions · target {u.target} · {u.pyqPapers} PYQ papers</p>
              </div>
            ))}
            {cov.belowTarget?.length === 0 && <p className="py-6 text-center text-xs text-slate-400">All units are at or above target 🎉</p>}
          </div>
        </ChartCard>

        <ChartCard title="Frequently asked concepts" subtitle="From the PYQ corpus" actions={<Badge variant="gradient" size="sm"><TrendingUp className="h-3 w-3" /> PYQ</Badge>}>
          <div className="flex flex-wrap gap-2 pt-1">
            {(pyq.university?.repeatedConcepts ?? []).map((c) => <Badge key={c} variant="success" className="px-3 py-1.5 text-[11.5px]">{c}</Badge>)}
          </div>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">PYQ difficulty trend</p>
          <div className="mt-2">
            <LineTrend
              data={(pyq.university?.difficultyTrend ?? []).map((d) => ({ label: d.year.slice(2), hard: d.hard, medium: d.medium }))}
              xKey="label"
              height={160}
              series={[
                { key: 'hard', name: 'Hard %', color: '#f43f5e' },
                { key: 'medium', name: 'Medium %', color: '#6366f1' },
              ]}
              formatter={(v) => `${v}%`}
            />
          </div>
        </ChartCard>

        <ChartCard title="Assessment timeline" subtitle="Papers, quizzes & exam drafts" actions={<Badge variant="secondary" size="sm">{a.timeline?.length ?? 0} events</Badge>}>
          <div className="space-y-2.5">
            {(a.timeline ?? []).slice(0, 8).map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <span className="text-base">{TYPE_ICON[e.type] ?? '•'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{e.title}</p>
                  <p className="truncate text-[10.5px] text-slate-400">{e.description}</p>
                </div>
                <span className="shrink-0 text-[10px] font-semibold text-slate-400">{formatDate(e.date, 'MMM d')}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* AI insights */}
      <WorkspaceSection title="AI insights" subtitle="Derived from coverage, quality, PYQ depth & readiness" icon={Sparkles}>
        <div className="grid gap-4 md:grid-cols-2">
          {cov.gapInsight && (
            <AiInsightCard index={0} insight={{ id: 'an_ins_gap', tone: 'warning', icon: 'alert', title: 'Coverage gap detected', body: cov.gapInsight }} />
          )}
          {health.score > 0 && (
            <AiInsightCard index={1} insight={{ id: 'an_ins_health', tone: health.grade === 'Excellent' ? 'positive' : 'neutral', icon: 'target', title: `Assessment health is ${health.grade}`, body: `${health.score}/100 — ${health.factors?.map((f) => `${f.label.toLowerCase()} ${f.value}%`).join(' · ')}.` }} />
          )}
          {(a.recommendations?.items ?? []).slice(0, 4).map((r, i) => (
            <AiInsightCard key={r.id} index={i + 2} insight={{ id: r.id, tone: r.priority === 'Critical' ? 'warning' : 'neutral', icon: 'sparkles', title: r.title, body: r.reason }} />
          ))}
        </div>
      </WorkspaceSection>
    </div>
  )
}

const round = (v) => Math.round((Number.isFinite(v) ? v : 0) * 10) / 10

export { AssessmentAnalyticsTab }
export default AssessmentAnalyticsTab
