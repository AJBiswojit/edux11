import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarClock, GraduationCap, HeartHandshake, MessageSquare, Sparkles } from 'lucide-react'
import { useParentDashboard } from '@/services'
import { StatCard } from '@/components/shared/stat-card'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { PageHeader } from '@/components/shared/page-header'
import { Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle, useToast } from '@/components/ui'
import { formatDate } from '@/utils/format'

const SEVERITY_STYLES = { Info: 'info', Warning: 'warning', High: 'danger' }

function Dashboard() {
  const { data, isLoading, isError, refetch } = useParentDashboard()
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={4} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Parent · Overview"
        title="Namaste, Mr. Sharma 🙏"
        description={`A gentle view of ${data.ward.name}'s journey — progress, effort and what matters next.`}
        breadcrumbs={[{ label: 'Parent' }, { label: 'Dashboard' }]}
        actions={
          <Button size="sm" onClick={() => toast.info('Meeting request', 'Teacher meeting slots are open — pick a time in Communication.')}>
            <MessageSquare className="h-4 w-4" /> Talk to a teacher
          </Button>
        }
      />

      {/* Ward banner */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-lift sm:p-8">
        <div className="bg-dots absolute inset-0 opacity-15" />
        <div className="relative flex flex-wrap items-center gap-5">
          <Avatar name={data.ward.name} size="xl" className="ring-4 ring-white/30" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Your ward</p>
            <h2 className="font-display text-2xl font-bold">{data.ward.name}</h2>
            <p className="mt-0.5 text-sm text-white/85">{data.ward.program} · {data.ward.semester} · Roll {data.ward.rollNo}</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl bg-white/10 px-5 py-3 text-center ring-1 ring-white/20 backdrop-blur-sm">
              <p className="font-display text-xl font-bold">CGPA {data.kpis[0].value}</p>
              <p className="text-[10px] font-semibold text-white/75">Current</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-3 text-center ring-1 ring-white/20 backdrop-blur-sm">
              <p className="font-display text-xl font-bold">{data.kpis[1].value}</p>
              <p className="text-[10px] font-semibold text-white/75">Attendance</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi, i) => <StatCard key={kpi.id} {...kpi} index={i} />)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* AI monthly insight */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-500 p-6 text-white shadow-lift lg:col-span-2">
          <div className="bg-dots absolute inset-0 opacity-15" />
          <div className="relative">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/75">
              <Sparkles className="h-4 w-4" /> {data.aiMonthlyInsight.title}
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">Strengths</p>
                <ul className="mt-2 space-y-1.5 text-[12px] leading-snug text-white/90">
                  {data.aiMonthlyInsight.strengths.map((s) => <li key={s} className="flex gap-1.5"><span>✨</span>{s}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200">Watch</p>
                <ul className="mt-2 space-y-1.5 text-[12px] leading-snug text-white/90">
                  {data.aiMonthlyInsight.watch.map((s) => <li key={s} className="flex gap-1.5"><span>👀</span>{s}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-200">Suggestions</p>
                <ul className="mt-2 space-y-1.5 text-[12px] leading-snug text-white/90">
                  {data.aiMonthlyInsight.suggestions.map((s) => <li key={s} className="flex gap-1.5"><span>💡</span>{s}</li>)}
                </ul>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold ring-1 ring-white/25">Tone: {data.aiMonthlyInsight.tone}</span>
              <Link to="/parent/ai-insights" className="text-xs font-bold text-white underline-offset-4 hover:underline">All AI insights →</Link>
            </div>
          </div>
        </div>

        {/* Upcoming */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-[15px]">Coming up</CardTitle>
            <CalendarClock className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.upcoming.map((u) => (
              <div key={u.id} className="flex items-center gap-3.5 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <span className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-white ${u.type === 'exam' ? 'bg-gradient-to-br from-rose-500 to-red-500' : 'bg-gradient-to-br from-indigo-600 to-blue-600'}`}>
                  <span className="text-[9px] font-bold leading-none">{formatDate(u.date, 'MMM')}</span>
                  <span className="text-sm font-bold leading-tight">{formatDate(u.date, 'd')}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{u.title}</p>
                  <Badge variant={u.type === 'exam' ? 'danger' : 'warning'} size="sm" className="mt-1">{u.type}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {data.recentAlerts.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3.5 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${a.severity === 'Warning' ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/10' : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10'}`}>
              <HeartHandshake className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{a.title}</p>
              <p className="mt-0.5 text-[12px] text-slate-400">{a.text}</p>
              <p className="mt-1 text-[10px] font-medium text-slate-300 dark:text-slate-600">{a.time}</p>
            </div>
            <Badge variant={SEVERITY_STYLES[a.severity]} size="sm">{a.severity}</Badge>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-6 ring-1 ring-indigo-500/15">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-lg">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[14.5px] font-bold text-slate-900 dark:text-white">Midsem exams begin Aug 19</p>
            <p className="text-xs text-slate-400">5 papers in 5 days. The AI planner has scheduled revision around them.</p>
          </div>
        </div>
        <Button asChild size="sm"><Link to="/parent/progress">See the plan <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
      </div>
    </div>
  )
}

export { Dashboard }
export default Dashboard
