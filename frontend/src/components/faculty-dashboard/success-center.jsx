/**
 * MediXO EduX — Faculty Command Center · 1. Faculty Success Center ⭐.
 * Four focused intelligence cards — Teaching Health, Student Engagement,
 * Assessment Health and AI Teaching Insights — all derived from the shared
 * faculty intelligence foundation.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity, ArrowRight, BookOpenCheck, CheckCircle2, CircleAlert,
  HeartPulse, Minus, Sparkles, TrendingDown, TrendingUp, Users,
} from 'lucide-react'
import { ProgressRing } from '@/components/shared/progress-ring'
import { Card } from '@/components/ui'

const CARDS = [
  {
    key: 'assessmentHealth',
    title: 'Assessment health',
    eyebrow: 'Readiness & coverage',
    icon: BookOpenCheck,
    gradient: 'from-rose-500 to-orange-500',
    surface: 'from-rose-50/90 via-white to-orange-50/60 dark:from-rose-500/10 dark:via-slate-900 dark:to-orange-500/5',
    ringClass: 'ring-rose-200/80 dark:ring-rose-400/20',
    iconShadow: 'shadow-rose-500/25',
    text: 'text-rose-700 dark:text-rose-300',
    pill: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
    ring: '#f43f5e',
    action: 'Open assessment workspace',
    link: '/faculty/question-intelligence',
  },
  {
    key: 'studentEngagement',
    title: 'Student engagement',
    eyebrow: 'Class pulse',
    icon: Users,
    gradient: 'from-emerald-500 to-teal-500',
    surface: 'from-emerald-50/90 via-white to-teal-50/70 dark:from-emerald-500/10 dark:via-slate-900 dark:to-teal-500/5',
    ringClass: 'ring-emerald-200/80 dark:ring-emerald-400/20',
    iconShadow: 'shadow-emerald-500/25',
    text: 'text-emerald-700 dark:text-emerald-300',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
    ring: '#10b981',
    action: 'Review engagement',
    /* Teaching workspace page is commented out
    link: '/faculty/teaching?tab=engagement',
    */
  },
  {
    key: 'teachingHealth',
    title: 'Teaching health',
    eyebrow: 'Your performance',
    icon: HeartPulse,
    gradient: 'from-indigo-500 to-blue-500',
    surface: 'from-indigo-50/90 via-white to-blue-50/70 dark:from-indigo-500/10 dark:via-slate-900 dark:to-blue-500/5',
    ringClass: 'ring-indigo-200/80 dark:ring-indigo-400/20',
    iconShadow: 'shadow-indigo-500/25',
    text: 'text-indigo-700 dark:text-indigo-300',
    pill: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20',
    ring: '#6366f1',
    action: 'Open teaching overview',
    link: '/faculty/teaching?tab=overview',
    comingSoon: true,
  },
  {
    key: 'aiTeachingInsights',
    title: 'AI teaching insights',
    eyebrow: 'Today’s priorities',
    icon: Sparkles,
    gradient: 'from-violet-500 to-fuchsia-500',
    surface: 'from-violet-50/90 via-white to-fuchsia-50/60 dark:from-violet-500/10 dark:via-slate-900 dark:to-fuchsia-500/5',
    ringClass: 'ring-violet-200/80 dark:ring-violet-400/20',
    iconShadow: 'shadow-violet-500/25',
    text: 'text-violet-700 dark:text-violet-300',
    pill: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20',
    action: 'View AI recommendations',
    link: '/faculty/teaching?tab=insights',
    comingSoon: true,
  },
]

const formatNumber = (value, suffix = '') => {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 1 })}${suffix}`
}

const scoreLabel = (score, fallback) => {
  if (fallback && fallback !== '—') return fallback
  if (score >= 85) return 'Excellent'
  if (score >= 75) return 'Strong'
  if (score >= 65) return 'Stable'
  return 'Needs attention'
}

const trendFromSeries = (series = []) => {
  if (series.length < 2) return null
  const first = Number(series[0]?.avg ?? series[0]?.value)
  const last = Number(series[series.length - 1]?.avg ?? series[series.length - 1]?.value)
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null
  return Number((last - first).toFixed(1))
}

function Trend({ value, label = 'over 5 weeks' }) {
  if (value == null) {
    return <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><Minus className="h-3.5 w-3.5" /> Trend unavailable</span>
  }

  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus
  const tone = value > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : value < 0
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-slate-500 dark:text-slate-400'

  return (
    <span className={`flex items-center gap-1 ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {value > 0 ? '+' : ''}{formatNumber(value, '%')} {label}
    </span>
  )
}

function cardContent(def, data) {
  if (def.key === 'teachingHealth') {
    return {
      status: scoreLabel(data.score, data.grade),
      trend: trendFromSeries(data.weeklyTrend),
      metrics: [
        { label: 'Classes completed', value: formatNumber(data.classesCompleted) },
        { label: 'Course completion', value: formatNumber(data.courseCompletion, '%') },
        { label: 'Latest weekly score', value: formatNumber(data.weeklyTrend?.at(-1)?.avg ?? data.weeklyTrend?.at(-1)?.value, '%') },
      ],
      note: `${formatNumber(data.courseCompletion, '%')} of planned course content is complete.`,
    }
  }

  if (def.key === 'studentEngagement') {
    const attention = Number(data.studentsRequiringAttention ?? 0)
    return {
      status: scoreLabel(data.score),
      trend: data.attendanceTrend?.delta,
      trendLabel: 'attendance change',
      metrics: [
        /* Attendance and assignments hidden on the faculty dashboard — restore together.
        { label: 'Attendance', value: formatNumber(data.attendanceTrend?.latest, '%') },
        { label: 'Assignments', value: formatNumber(data.assignmentCompletion, '%') },
        */
        { label: 'Participation', value: formatNumber(data.participation, '%') },
      ],
      note: attention > 0
        ? `${attention} student${attention === 1 ? '' : 's'} need follow-up right now.`
        : 'No students currently need an engagement follow-up.',
      noteAlert: attention > 0,
    }
  }

  if (def.key === 'assessmentHealth') {
    return {
      status: scoreLabel(data.score, data.grade),
      heroDetail: `${formatNumber(data.readiness, '%')} assessment readiness`,
      metrics: [
        { label: 'Question coverage', value: formatNumber(data.coverage, '%') },
        /* Evaluations due hidden on the faculty dashboard — restore with the metric row.
        { label: 'Evaluations due', value: formatNumber(data.pendingEvaluations) },
        */
        { label: 'Papers ready', value: data.paperGeneration ?? '—' },
      ],
      note: `${data.questionBankStatus ?? 'Question bank status unavailable'} · ${formatNumber(data.readiness, '%')} ready.`,
      noteAlert: Number(data.pendingEvaluations ?? 0) > 0,
    }
  }

  const alerts = Number(data.alertsCount ?? 0)
  const critical = Number(data.revisionCritical ?? 0)
  return {
    status: alerts > 0 ? `${alerts} active signal${alerts === 1 ? '' : 's'}` : 'All clear',
    metrics: [
      { label: 'Weak chapters', value: formatNumber(data.weakChaptersCount) },
      { label: 'Critical revisions', value: formatNumber(data.revisionCritical) },
      { label: 'Students flagged', value: formatNumber(data.weakStudentCount) },
    ],
    note: data.todaysRecommendation ?? 'No priority action recommended today.',
    focus: data.topWeakChapter && data.topWeakChapter !== '—' ? data.topWeakChapter : 'No weak chapter detected',
    alerts,
    noteAlert: critical > 0,
  }
}

function MetricGrid({ metrics }) {
  const columns = metrics.length >= 3
    ? 'sm:grid-cols-3 2xl:grid-cols-1'
    : metrics.length === 2
      ? 'sm:grid-cols-2 2xl:grid-cols-1'
      : ''
  return (
    <dl className={`grid grid-cols-1 gap-2 ${columns}`}>
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-xl border border-white/80 bg-white/70 px-3.5 py-3 shadow-sm shadow-slate-900/[0.025] dark:border-white/[0.06] dark:bg-slate-950/25">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{metric.label}</dt>
          <dd className="mt-0.5 font-display text-[15px] font-bold text-slate-900 dark:text-white">{metric.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function InsightHero({ def, content }) {
  return (
    <div className="flex min-h-[94px] items-stretch gap-3">
      <div className="min-w-0 flex-1 rounded-2xl border border-white/80 bg-white/65 p-3.5 shadow-sm shadow-slate-900/[0.025] dark:border-white/[0.06] dark:bg-slate-950/20">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          <Activity className="h-3.5 w-3.5" /> Today’s focus
        </p>
        <p className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-slate-900 dark:text-white" title={content.note}>{content.note}</p>
        <p className={`mt-1.5 truncate text-[11px] font-semibold ${def.text}`} title={content.focus}>Priority topic · {content.focus}</p>
      </div>
      <div className={`flex w-[82px] shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${def.gradient} px-2 text-center text-white shadow-lg ${def.iconShadow}`}>
        <Sparkles className="h-4 w-4 text-white/80" aria-hidden="true" />
        <span className="mt-1 font-display text-2xl font-bold leading-none">{content.alerts}</span>
        <span className="mt-1 text-[9px] font-bold uppercase leading-tight tracking-wider text-white/75">Active signals</span>
      </div>
    </div>
  )
}

function ScoreHero({ def, data, content }) {
  const roundedScore = Math.round(Number(data.score ?? 0))
  return (
    <div className="flex min-h-[94px] items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/65 px-4 py-3 shadow-sm shadow-slate-900/[0.025] dark:border-white/[0.06] dark:bg-slate-950/20">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Overall score</p>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-display text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{formatNumber(data.score)}</span>
          <span className="text-xs font-semibold text-slate-400">/ 100</span>
        </div>
        <p className="mt-1.5 text-[10.5px] font-semibold">
          {content.heroDetail
            ? <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><Activity className="h-3.5 w-3.5" /> {content.heroDetail}</span>
            : <Trend value={content.trend} label={content.trendLabel} />}
        </p>
      </div>
      <ProgressRing
        value={data.score ?? 0}
        size={82}
        stroke={8}
        color={def.ring}
        label={`${roundedScore}`}
        sublabel="score"
        className="shrink-0"
      />
    </div>
  )
}

function CardChrome({ def, children, interactive = false }) {
  return (
    <Card className={`relative h-full min-h-[268px] overflow-hidden bg-gradient-to-br p-5 ${def.surface} ${def.ringClass}${interactive ? ' transition-all duration-300 ease-spring group-hover:-translate-y-1 group-hover:shadow-lift' : ''}`}>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${def.gradient}`} aria-hidden="true" />
      <div className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${def.gradient} opacity-[0.08] blur-2xl${interactive ? ' transition-transform duration-500 group-hover:scale-125' : ''} dark:opacity-[0.12]`} aria-hidden="true" />
      {children}
    </Card>
  )
}

function SuccessCard({ def, data, index }) {
  const d = data[def.key] ?? {}
  const content = def.comingSoon ? null : cardContent(def, d)
  const isInsight = def.key === 'aiTeachingInsights'
  const NoteIcon = content?.noteAlert ? CircleAlert : CheckCircle2

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="h-full"
    >
      {def.comingSoon ? (
        <CardChrome def={def}>
          <article className="relative flex h-full flex-col">
            <header className="flex items-start gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${def.gradient} text-white shadow-lg ${def.iconShadow}`}>
                <def.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{def.eyebrow}</p>
                <h3 className="mt-0.5 text-[15px] font-bold leading-tight text-slate-950 dark:text-white">{def.title}</h3>
              </div>
            </header>
            <p className="flex flex-1 items-center justify-center">
              <span className={`rounded-full px-3.5 py-1.5 text-sm font-bold tracking-wide ring-1 ring-inset ${def.pill}`}>Coming Soon</span>
            </p>
          </article>
        </CardChrome>
      ) : (
      def.link ? (
      <Link
        to={def.link}
        aria-label={`${def.title}: ${content.status}. ${def.action}`}
        className="group block h-full rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950"
      >
        <CardChrome def={def} interactive>
          <article className="relative flex h-full flex-col">
            <header className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${def.gradient} text-white shadow-lg ${def.iconShadow}`}>
                  <def.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{def.eyebrow}</p>
                  <h3 className="mt-0.5 text-[15px] font-bold leading-tight text-slate-950 dark:text-white">{def.title}</h3>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${def.pill}`}>{content.status}</span>
            </header>

            <div className="mt-4">
              {isInsight
                ? <InsightHero def={def} content={content} />
                : <ScoreHero def={def} data={d} content={content} />}
            </div>

            <div className="mt-3">
              <MetricGrid metrics={content.metrics} />
            </div>

            {!isInsight && (
              <p className={`mt-3 flex items-start gap-2 text-[11px] font-medium leading-relaxed ${content.noteAlert ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'}`}>
                <NoteIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{content.note}</span>
              </p>
            )}

            <footer className={`mt-auto flex items-center justify-between border-t border-slate-200/70 pt-3.5 text-xs font-bold ${def.text} dark:border-white/10`}>
              <span>{def.action}</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 ring-1 ring-slate-200/80 transition-transform duration-300 group-hover:translate-x-1 dark:bg-white/5 dark:ring-white/10" aria-hidden="true">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </footer>
          </article>
        </CardChrome>
      </Link>
      ) : (
        <CardChrome def={def}>
          <article className="relative flex h-full flex-col">
            <header className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${def.gradient} text-white shadow-lg ${def.iconShadow}`}>
                  <def.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{def.eyebrow}</p>
                  <h3 className="mt-0.5 text-[15px] font-bold leading-tight text-slate-950 dark:text-white">{def.title}</h3>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${def.pill}`}>{content.status}</span>
            </header>
            <div className="mt-4">
              <ScoreHero def={def} data={d} content={content} />
            </div>
            <div className="mt-3">
              <MetricGrid metrics={content.metrics} />
            </div>
            <p className={`mt-3 flex items-start gap-2 text-[11px] font-medium leading-relaxed ${content.noteAlert ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'}`}>
              <NoteIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{content.note}</span>
            </p>
          </article>
        </CardChrome>
      )
      )}
    </motion.div>
  )
}

function SuccessCenter({ data }) {
  const sc = data.derived.dashboard?.successCenter ?? {}
  return (
    <section aria-labelledby="faculty-success-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">Live intelligence</p>
          <h2 id="faculty-success-heading" className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Your teaching overview</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">The four signals that need your attention, with a clear path to act.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-slate-300 dark:ring-white/10">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Updated from connected teaching data
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {CARDS.map((def, i) => (
          <SuccessCard key={def.key} def={def} data={sc} index={i} />
        ))}
      </div>
    </section>
  )
}

export { SuccessCenter }
export default SuccessCenter
