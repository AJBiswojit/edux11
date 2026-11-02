/**
 * Teaching Intelligence Workspace — Tab 1: Overview.
 * Today's classes & schedule, teaching hours, pending work, teaching health,
 * course progress, faculty productivity and the quick AI summary.
 * Everything derives from the Faculty Intelligence Foundation.
 */

import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarCheck2, ClipboardCheck, Clock, Gauge, Presentation, Sparkles, Users } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { ChartCard } from '@/components/shared/chart-card'
import { ProgressRing } from '@/components/shared/progress-ring'
import { MiniBars, AnimatedValue } from '@/components/charts'
import { Badge, Button } from '@/components/ui'
import { formatDate } from '@/utils/format'
import { AiSummaryCard } from './shared'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function OverviewTab({ data }) {
  const derived = data.derived
  const ds = data.datasets
  const todayName = WEEKDAYS[new Date().getDay()]
  const todaySchedule = (ds.teachingSchedule ?? []).find((d) => d.day === todayName)?.slots ?? []
  const pendingToday = derived.attendanceIntelligence?.pendingToday ?? { count: 0, slots: [] }
  const upcomingLectures = (ds.lecturePlanner ?? []).filter((l) => l.status === 'Upcoming').slice(0, 4)
  const health = derived.teachingHealth ?? {}
  const productivity = derived.teachingProductivity ?? {}
  const weeklyByDay = (ds.teachingSchedule ?? []).map((d) => ({
    day: d.day.slice(0, 3),
    hours: d.slots.reduce((s, x) => s + (x.hours || 1), 0),
  }))

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <StatCard index={0} label="Teaching health" value={`${health.score ?? '—'}`} sub={health.grade} icon="HeartPulse" gradient="from-indigo-500 to-blue-500" spark={(health.factors ?? []).map((f) => f.value)} />
        <StatCard index={1} label="Teaching effectiveness" value={`${derived.teachingEffectiveness?.score ?? '—'}`} sub={derived.teachingEffectiveness?.grade} icon="Target" gradient="from-emerald-500 to-teal-500" />
        <StatCard index={2} label="Student engagement" value={`${derived.studentEngagement?.score ?? '—'}%`} sub="composite" icon="Users" gradient="from-violet-500 to-purple-500" />
        <StatCard index={3} label="Faculty productivity" value={`${productivity.score ?? '—'}`} sub={`${productivity.hoursSaved ?? 0}h saved`} icon="Gauge" gradient="from-amber-500 to-orange-500" />
        <StatCard index={4} label="Pending attendance" value={String(pendingToday.count ?? 0)} sub="classes today" icon="CalendarCheck2" gradient="from-sky-500 to-cyan-500" />
        <StatCard index={5} label="Pending grading" value={String(derived.evaluationProgress?.pending ?? 0)} sub="submissions" icon="ClipboardCheck" gradient="from-rose-500 to-red-500" />
      </div>

      {/* Today + AI summary */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="Today's classes"
          subtitle={`${todayName} · ${todaySchedule.length} sessions`}
          className="lg:col-span-1"
          actions={<Badge variant={pendingToday.count ? 'warning' : 'success'} size="sm">{pendingToday.count ? `${pendingToday.count} not marked` : 'All marked'}</Badge>}
        >
          <div className="space-y-2.5">
            {todaySchedule.map((s) => {
              const pending = pendingToday.slots?.some((p) => p.time === s.time && p.section === s.section)
              return (
                <div key={`${s.time}-${s.section}`} className="flex items-center gap-3.5 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                  <span className="rounded-xl bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">{s.time}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{s.course}</p>
                    <p className="truncate text-[11px] text-slate-400">{s.section} · {s.room}</p>
                  </div>
                  <Badge variant={pending ? 'warning' : 'success'} size="sm">{pending ? 'Due' : 'Marked'}</Badge>
                </div>
              )
            })}
            {todaySchedule.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No classes scheduled today.</p>}
          </div>
        </ChartCard>

        <ChartCard title="Today's schedule" subtitle="Full day view" className="lg:col-span-1">
          <div className="space-y-2.5">
            {todaySchedule.map((s) => (
              <div key={s.time} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <Clock className="h-4 w-4 shrink-0 text-slate-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{s.course} · {s.section}</p>
                  <p className="text-[11px] text-slate-400">{s.type} · {s.room}</p>
                </div>
                <Badge variant="secondary" size="sm">{s.hours}h</Badge>
              </div>
            ))}
            {todaySchedule.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No classes scheduled today.</p>}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Weekly teaching hours</span>
            <span className="flex items-center gap-1.5 font-display text-lg font-bold text-indigo-600 dark:text-indigo-400">
              <AnimatedValue value={ds.weeklyTeachingHours ?? 0} /> h
            </span>
          </div>
        </ChartCard>

        <AiSummaryCard summary={derived.summary} className="lg:col-span-1" />
      </div>

      {/* Health + course progress */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard title="Teaching health" subtitle="Weighted across attendance, progress, assignments, engagement & evaluation" className="lg:col-span-1">
          <div className="flex items-center gap-5">
            <ProgressRing value={health.score ?? 0} size={118} stroke={11} color="#6366f1" label={`${health.score ?? 0}`} sublabel="health" />
            <div className="flex-1 space-y-2.5">
              {(health.factors ?? []).map((f) => (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">{f.label}</span>
                    <span className="text-slate-800 dark:text-slate-100">{f.value}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" style={{ width: `${f.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Course progress"
          subtitle="Lectures delivered vs planned"
          className="lg:col-span-2"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/faculty/courses">Course overview <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          }
        >
          <div className="space-y-4">
            {(derived.courseProgress ?? []).map((c) => (
              <div key={c.courseCode}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-500" />
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{c.courseCode} · {c.title}</p>
                    <Badge variant="secondary" size="sm">{c.section}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>{c.lecturesDone}/{c.lecturesTotal} lectures</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{c.progress}%</span>
                  </div>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400"
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Productivity + upcoming lectures */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard title="Faculty productivity" subtitle="AI leverage this term">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Hours saved', value: `${productivity.hoursSaved ?? 0}h`, color: '#10b981' },
              { label: 'Questions generated', value: String(productivity.questionsGenerated ?? 0), color: '#6366f1' },
              { label: 'Lessons drafted', value: String(productivity.lessonsDrafted ?? 0), color: '#14b8a6' },
              { label: 'Auto-graded', value: String(productivity.gradedAutomated ?? 0), color: '#f59e0b' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-100 p-4 text-center dark:border-slate-800">
                <p className="font-display text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="mt-1 text-[10px] font-semibold leading-tight text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <Gauge className="h-3.5 w-3.5 text-indigo-500" /> Weekly load by day
            </p>
            <MiniBars data={weeklyByDay} dataKey="hours" color="#6366f1" height={46} />
          </div>
        </ChartCard>

        <ChartCard
          title="Upcoming lectures"
          subtitle="From the lecture planner"
          className="lg:col-span-1"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/faculty/lecture-planner">Planner <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          }
        >
          <div className="space-y-2.5">
            {upcomingLectures.map((l) => (
              <div key={l.id} className="flex items-center gap-3.5 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <Presentation className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{l.course} · {l.topic}</p>
                  <p className="text-[11px] text-slate-400">{formatDate(l.date, 'EEE, MMM d')} · prep {l.prep ?? '—'} min</p>
                </div>
                <Badge variant="outline" size="sm">{l.week}</Badge>
              </div>
            ))}
            {upcomingLectures.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No upcoming lectures planned.</p>}
          </div>
        </ChartCard>

        <ChartCard title="Quick actions" subtitle="One click to your daily workflows" className="lg:col-span-1">
          <div className="space-y-2.5">
            {[
              { label: 'Mark attendance', desc: `${pendingToday.count ?? 0} classes due today`, to: '/faculty/attendance', icon: CalendarCheck2, grad: 'from-indigo-500 to-blue-500' },
              { label: 'Clear grading queue', desc: `${derived.evaluationProgress?.pending ?? 0} submissions pending`, to: '/faculty/assignments', icon: ClipboardCheck, grad: 'from-amber-500 to-orange-500' },
              { label: 'Review at-risk students', desc: `${derived.attentionStudents?.critical ?? 0} critical · ${derived.attentionStudents?.high ?? 0} high`, to: '/faculty/teaching?tab=attention', icon: Users, grad: 'from-rose-500 to-red-500' },
              { label: 'Teaching insights', desc: `${derived.teachingInsights?.weakChaptersCount ?? 0} weak chapters flagged`, to: '/faculty/teaching?tab=insights', icon: Sparkles, grad: 'from-emerald-500 to-teal-500' },
            ].map((a) => (
              <Link key={a.label} to={a.to} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-500/30">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${a.grad} text-white shadow-md`}>
                  <a.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{a.label}</p>
                  <p className="truncate text-[11px] text-slate-400">{a.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </Link>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

export { OverviewTab }
export default OverviewTab
