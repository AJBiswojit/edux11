/**
 * MediXO EduX — Reports Workspace · Tab 1: Overview.
 * Library KPIs, report-type catalogue with live derived numbers, schedules,
 * AI summary and recommendations — all from the Faculty Intelligence
 * Foundation.
 */

import { useNavigate } from 'react-router-dom'
import { CalendarClock, FileBarChart, FileText, Layers, Sparkles, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { ChartCard } from '@/components/shared/chart-card'
import { Badge, Button, Card } from '@/components/ui'
import { AiInsightCard, WorkspaceSection } from '@/components/teaching-workspace/shared'
import { ReportTypeIcon } from './report-parts'

const ICON_MAP = {
  BarChart3: FileBarChart, AlertTriangle: FileBarChart, CalendarCheck2: FileBarChart,
  Database: FileBarChart, FileSpreadsheet: FileBarChart, HeartPulse: FileBarChart,
  HeartHandshake: FileBarChart, Users: FileBarChart, BrainCircuit: FileBarChart,
  Layers: Layers, FlaskConical: FileBarChart,
}

function ReportsOverviewTab({ data }) {
  const r = data.derived.reports ?? {}
  const navigate = useNavigate()
  const library = r.library ?? {}
  const templates = r.templates ?? []
  const schedule = r.schedule ?? []

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard index={0} label="Reports in library" value={String(library.total ?? 0)} sub={`${library.active ?? 0} active · ${library.archived ?? 0} archived`} icon="FileText" gradient="from-indigo-500 to-blue-500" />
        <StatCard index={1} label="Total downloads" value={String(library.totalDownloads ?? 0)} sub={`avg ${library.avgDownloads ?? 0}/report`} icon="Download" gradient="from-emerald-500 to-teal-500" />
        <StatCard index={2} label="Exports completed" value={`${r.exportStats?.completed ?? 0}/${r.exportStats?.total ?? 0}`} sub={`${(r.exportStats?.rowsExported ?? 0).toLocaleString('en-IN')} rows moved`} icon="FileSpreadsheet" gradient="from-amber-500 to-orange-500" />
        <StatCard index={3} label="Active schedules" value={String(schedule.filter((s) => s.enabled).length)} sub="auto-generated reports" icon="CalendarClock" gradient="from-violet-500 to-purple-500" />
      </div>

      {/* AI summary + schedules */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard title="Report library" subtitle="By format & category" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(library.byFormat ?? {})).map(([fmt, count]) => (
              <div key={fmt} className="flex items-center gap-2.5 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <ReportTypeIcon format={fmt} className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-display text-base font-bold text-slate-800 dark:text-white">{count}</p>
                  <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">{fmt}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(Object.entries(library.byCategory ?? {})).map(([cat, count]) => (
              <Badge key={cat} variant="outline" size="sm">{cat} {count}</Badge>
            ))}
          </div>
        </ChartCard>

        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-xl shadow-indigo-500/20">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/70">
              <Sparkles className="h-3.5 w-3.5" /> Quick AI summary
            </p>
            <h3 className="mt-2 font-display text-lg font-bold leading-snug">{r.summary?.headline}</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-white/85">{r.summary?.body}</p>
            <ul className="mt-4 space-y-1.5">
              {(r.summary?.highlights ?? []).map((h) => (
                <li key={h} className="flex items-center gap-2 text-[12px] font-medium text-white/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/70" /> {h}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ChartCard title="Scheduled reports" subtitle="Automatic generation" className="lg:col-span-1" actions={<Badge variant="gradient" size="sm"><CalendarClock className="h-3 w-3" /> {schedule.filter((s) => s.enabled).length} active</Badge>}>
          <div className="space-y-2.5">
            {schedule.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                  <p className="text-[10.5px] text-slate-400">{s.frequency} · next {s.nextRun}</p>
                </div>
                <Badge variant="secondary" size="sm">{s.format}</Badge>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Report catalogue */}
      <WorkspaceSection title="Report catalogue" subtitle="Every report you can generate — live numbers come from your intelligence foundation" icon={FileText}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => {
            const Icon = ICON_MAP[t.icon] ?? FileBarChart
            return (
              <Card key={t.id} className="group p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 text-white shadow-md shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-5 w-5" />
                  </span>
                  <Badge variant={t.category === 'Assessment' ? 'gradient' : t.category === 'Students' ? 'warning' : 'secondary'} size="sm">{t.category}</Badge>
                </div>
                <p className="mt-3 text-[14px] font-bold text-slate-900 dark:text-white">{t.name}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">{t.description}</p>
                {t.latest && (
                  <div className="mt-3 rounded-2xl bg-indigo-50/60 px-3.5 py-2.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-500/15 dark:bg-indigo-500/10 dark:text-indigo-300">
                    {t.latest}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.format} · {(t.includes ?? []).length} sections</span>
                  <Button size="sm" onClick={() => navigate(`/faculty/reports?tab=generate&template=${t.id}`)}>
                    <Sparkles className="h-3.5 w-3.5" /> Generate
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </WorkspaceSection>

      {/* Recommendations */}
      <WorkspaceSection title="AI recommendations" subtitle="Derived from download activity, flags & schedules" icon={TrendingUp}>
        <div className="grid gap-4 md:grid-cols-2">
          {(r.recommendations ?? []).map((rec, i) => (
            <AiInsightCard key={rec.id} index={i} insight={{ id: rec.id, tone: rec.priority === 'Critical' ? 'warning' : rec.priority === 'High' ? 'neutral' : 'positive', icon: 'sparkles', title: rec.title, body: rec.reason }} />
          ))}
          {r.recommendations?.length === 0 && <Card className="p-6 text-center text-xs text-slate-400 md:col-span-2">Everything looks healthy — no report actions needed.</Card>}
        </div>
      </WorkspaceSection>
    </div>
  )
}

export { ReportsOverviewTab }
export default ReportsOverviewTab
