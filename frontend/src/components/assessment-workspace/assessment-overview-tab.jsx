/**
 * MediXO EduX — Assessment Workspace · Tab 1: Overview.
 * Total question bank, question papers, generated papers, upcoming
 * assessments, coverage, difficulty & quality, assessment health and the
 * AI summary — all derived from the Faculty Intelligence Foundation.
 */

import { Link } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, BrainCircuit, CalendarClock, FileText, Layers, Target, Wand2 } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { ChartCard } from '@/components/shared/chart-card'
import { ProgressRing } from '@/components/shared/progress-ring'
import { BarCompare, DonutChart } from '@/components/charts'
import { Badge, Button } from '@/components/ui'
import { AiSummaryCard, WorkspaceSection } from '@/components/teaching-workspace/shared'
import {  } from '@/utils/format'

const BLOOM_COLORS = { Remember: '#6366f1', Understand: '#3b82f6', Apply: '#14b8a6', Analyze: '#10b981', Evaluate: '#f59e0b', Create: '#8b5cf6' }

function AssessmentOverviewTab({ data }) {
  const a = data.derived.assessment ?? {}
  const qs = a.questionStats ?? {}
  const health = a.assessmentHealth ?? {}
  const library = a.paperLibrary ?? {}
  const upcoming = a.upcomingAssessments ?? []
  /* Corpus copy is dynamic — no hardcoded paper/year counts. */
  const pyqCorpus = data.derived.pyqIntelligence?.university?.pyqCorpus ?? {}
  const pyqActionDesc = pyqCorpus.totalPapers
    ? `${pyqCorpus.totalPapers} papers · university + competitive`
    : 'University + competitive PYQ corpus'

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <StatCard index={0} label="Question bank" value={String(qs.total ?? 0)} sub={`${qs.aiGenerated ?? 0} AI-generated`} icon="Database" gradient="from-indigo-500 to-blue-500" />
        <StatCard index={1} label="Question papers" value={String(library.total ?? 0)} sub={`${library.readyCount ?? 0} ready`} icon="FileText" gradient="from-emerald-500 to-teal-500" />
        <StatCard index={2} label="Generated papers" value={String(library.total ?? 0)} sub={`${library.totalQuestions ?? 0} questions`} icon="Wand2" gradient="from-violet-500 to-purple-500" />
        <StatCard index={3} label="Upcoming assessments" value={String(upcoming.length)} sub="drafts & scheduled" icon="CalendarClock" gradient="from-amber-500 to-orange-500" />
        <StatCard index={4} label="Assessment health" value={String(health.score ?? '—')} sub={health.grade} icon="HeartPulse" gradient="from-rose-500 to-red-500" spark={(health.factors ?? []).map((f) => f.value)} />
        <StatCard index={5} label="Question quality" value={String(qs.qualityAvg ?? '—')} sub={`${qs.avgAccuracy ?? '—'}% accuracy`} icon="Target" gradient="from-sky-500 to-cyan-500" />
      </div>

      {/* Health + AI summary */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard title="Assessment health" subtitle="Coverage · readiness · quality · PYQ depth · quiz health" className="lg:col-span-1">
          <div className="flex items-center gap-5">
            <ProgressRing value={health.score ?? 0} size={118} stroke={11} color="#f43f5e" label={`${health.score ?? 0}`} sublabel="health" />
            <div className="flex-1 space-y-2.5">
              {(health.factors ?? []).map((f) => (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">{f.label}</span>
                    <span className="text-slate-800 dark:text-slate-100">{f.value}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400" style={{ width: `${f.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <AiSummaryCard summary={a.summary} className="lg:col-span-1" />

        <ChartCard
          title="AI recommendations"
          subtitle="Derived from coverage, quality & readiness signals"
          className="lg:col-span-1"
          actions={<Badge variant="danger" size="sm">{a.recommendations?.critical ?? 0} critical</Badge>}
        >
          <div className="space-y-2.5">
            {(a.recommendations?.items ?? []).slice(0, 4).map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{r.title}</p>
                  <Badge variant={r.priority === 'Critical' ? 'danger' : r.priority === 'High' ? 'warning' : 'secondary'} size="sm">{r.priority}</Badge>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{r.reason}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Coverage + distribution */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard title="Chapter coverage" subtitle="Question share per unit · weakest unit highlighted" className="lg:col-span-1">
          <div className="space-y-3">
            {(a.coverage?.units ?? []).slice(0, 6).map((u) => (
              <div key={`${u.course}-${u.unit}`}>
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="truncate text-slate-500 dark:text-slate-400">{u.course} · {u.name}</span>
                  <span className={u.coveragePct <= 15 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-100'}>{u.coveragePct}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${u.coveragePct <= 15 ? 'bg-gradient-to-r from-rose-500 to-red-400' : 'bg-gradient-to-r from-indigo-500 to-teal-400'}`}
                    style={{ width: `${Math.min(u.coveragePct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {a.coverage?.gapInsight && (
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/60 p-3.5 text-[11.5px] font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
              {a.coverage.gapInsight}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Difficulty distribution" subtitle="Question bank mix">
          <BarCompare
            data={(qs.difficultyDistribution ?? []).map((d) => ({ label: d.level, count: d.count, pct: d.pct }))}
            xKey="label"
            height={230}
            series={[{ key: 'count', name: 'Questions', color: '#6366f1' }]}
            formatter={(v) => `${v} questions`}
          />
        </ChartCard>

        <ChartCard title="Bloom's taxonomy" subtitle="Cognitive-level balance in the bank">
          <DonutChart
            data={(qs.bloomDistribution ?? []).map((b) => ({ name: b.level, value: b.count, color: BLOOM_COLORS[b.level] ?? '#94a3b8' }))}
            height={230}
            centerLabel={String(qs.total ?? 0)}
            centerSub="questions"
          />
        </ChartCard>
      </div>

      {/* Upcoming + quality buckets */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="Upcoming assessments"
          subtitle="Drafts, scheduled quizzes & papers in review"
          className="lg:col-span-2"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/faculty/question-intelligence?tab=paper-generator">Generator <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          }
        >
          <div className="space-y-2.5">
            {upcoming.slice(0, 6).map((u) => (
              <div key={u.id} className="flex items-center gap-3.5 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{u.title}</p>
                  <p className="truncate text-[11px] text-slate-400">{u.course} · {u.meta}</p>
                </div>
                <Badge variant={u.status === 'In Review' ? 'warning' : u.status === 'Published' ? 'success' : 'secondary'} size="sm">{u.status}</Badge>
              </div>
            ))}
            {upcoming.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No upcoming assessments.</p>}
          </div>
        </ChartCard>

        <ChartCard title="Question quality" subtitle="Derived from accuracy, usage & status" actions={<Badge variant="secondary" size="sm">{qs.qualityAvg ?? '—'}/100 avg</Badge>}>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(qs.qualityBuckets ?? {})).map(([level, count]) => (
              <div key={level} className="rounded-2xl border border-slate-100 p-4 text-center dark:border-slate-800">
                <p className={`font-display text-xl font-bold ${level === 'Excellent' ? 'text-emerald-500' : level === 'Good' ? 'text-indigo-500' : level === 'Average' ? 'text-amber-500' : 'text-rose-500'}`}>{count}</p>
                <p className="mt-1 text-[10px] font-semibold leading-tight text-slate-400">{level}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-3.5 ring-1 ring-indigo-500/15">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
              <Target className="h-3.5 w-3.5" /> {qs.totalUsage ?? 0} total usages this term · {qs.avgUsage ?? 0} per question
            </p>
          </div>
        </ChartCard>
      </div>

      {/* Quick actions */}
      <WorkspaceSection title="Assessment workflows" subtitle="Jump straight into the workspace tools" icon={BookOpenCheck}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Generate a paper', desc: `${library.total ?? 0} papers in the library · no duplicate names allowed`, to: '/faculty/question-intelligence?tab=paper-generator', icon: Wand2, grad: 'from-indigo-500 to-blue-500' },
            { label: 'Analyze PYQs', desc: pyqActionDesc, to: '/faculty/question-intelligence?tab=pyq', icon: BrainCircuit, grad: 'from-emerald-500 to-teal-500' },
            { label: 'Browse the library', desc: `${library.readyCount ?? 0} papers ready to publish`, to: '/faculty/question-intelligence?tab=library', icon: Layers, grad: 'from-amber-500 to-orange-500' },
            { label: 'Assessment analytics', desc: 'Coverage, gaps, trends & AI insights', to: '/faculty/question-intelligence?tab=analytics', icon: Target, grad: 'from-rose-500 to-red-500' },
          ].map((act, i) => (
            <Link key={act.label} to={act.to} className="group rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${act.grad} text-white shadow-md shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110`}>
                <act.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-[13px] font-bold leading-snug text-slate-800 dark:text-slate-100">{act.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{act.desc}</p>
            </Link>
          ))}
        </div>
      </WorkspaceSection>
    </div>
  )
}

export { AssessmentOverviewTab }
export default AssessmentOverviewTab
