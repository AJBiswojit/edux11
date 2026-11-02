import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, MapPin, Target, Trophy, Users, Zap } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { cn } from '@/utils/cn'

/**
 * Competitive Profile Card.
 *
 * Replaces AcademicInfoCard on the competitive dashboard.
 * Shows the student's competitive exam identity: target exams, percentile
 * goal, drop/school year, and key prep stats. Presentation-only — caller
 * passes a shaped `profile` and `readiness` object.
 */

const DEFAULT_PROFILE = {
  name: 'Student',
  initials: 'AS',
  studentId: '—',
  targetExams: [],
  examYear: '—',
  prepMode: 'School',
  percentileGoal: null,
  institution: '',
  city: '',
  coachingCenter: '',
}

function normalizeProfile(raw, readiness) {
  const p = { ...DEFAULT_PROFILE, ...(raw ?? {}) }
  const name = p.name || p.fullName || DEFAULT_PROFILE.name
  const initials = (p.initials
    ?? name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join(''))
    || 'AS'

  // Derive target exams from readiness families if not on profile directly
  const targetExams = (p.targetExams?.length ? p.targetExams : Object.keys(readiness?.byExamFamily ?? {}))

  return { ...p, name, initials, targetExams }
}

const EXAM_COLORS = {
  JEE: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30',
  NEET: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
  BITSAT: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30',
  UPSC: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
  CAT: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
}
const EXAM_COLOR_DEFAULT = 'bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'

function ExamBadge({ exam }) {
  return (
    <span className={cn('inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-bold ring-1', EXAM_COLORS[exam] ?? EXAM_COLOR_DEFAULT)}>
      {exam}
    </span>
  )
}

function StatChip({ icon: Icon, label, value, accent }) {
  return (
    <div className={cn(
      'flex min-w-[140px] flex-1 flex-col gap-1.5 rounded-2xl px-4 py-3.5 ring-1 transition-all duration-200',
      'bg-slate-50/80 ring-slate-100 hover:-translate-y-0.5 hover:bg-white hover:ring-indigo-200/80 hover:shadow-sm',
      'dark:bg-slate-800/40 dark:ring-slate-800 dark:hover:bg-slate-800/70 dark:hover:ring-indigo-500/40',
      accent === 'indigo' && 'bg-indigo-50/70 ring-indigo-100 dark:bg-indigo-500/10 dark:ring-indigo-500/25',
      accent === 'emerald' && 'bg-emerald-50/70 ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-500/25',
    )}>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </p>
      <p className={cn(
        'text-sm font-bold leading-snug text-slate-900 dark:text-slate-100',
        accent === 'indigo' && 'text-indigo-700 dark:text-indigo-300',
        accent === 'emerald' && 'text-emerald-700 dark:text-emerald-300',
      )}>
        {value}
      </p>
    </div>
  )
}

function CompetitiveProfileCard({ profile: rawProfile, readiness, className }) {
  const profile = normalizeProfile(rawProfile, readiness)

  const overallScore = readiness?.competitive?.length
    ? Math.round(readiness.competitive.reduce((s, e) => s + (e.readiness ?? 0), 0) / readiness.competitive.length)
    : null

  const chips = [
    profile.studentId && profile.studentId !== '—'
      ? { icon: BookOpen, label: 'Student ID', value: profile.studentId }
      : null,
    profile.examYear && profile.examYear !== '—'
      ? { icon: Target, label: 'Exam year', value: profile.examYear }
      : null,
    profile.percentileGoal != null
      ? { icon: Trophy, label: 'Percentile goal', value: `${profile.percentileGoal}th`, accent: 'indigo' }
      : null,
    overallScore != null
      ? { icon: Zap, label: 'Readiness', value: `${overallScore}%`, accent: 'emerald' }
      : null,
    profile.coachingCenter
      ? { icon: Users, label: 'Coaching', value: profile.coachingCenter }
      : null,
  ].filter(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      role="region"
      aria-label="Competitive exam profile"
    >
      <div className={cn(
        'relative overflow-hidden rounded-3xl border bg-white shadow-card',
        'border-slate-200/70 dark:border-slate-800 dark:bg-slate-900/80',
        'backdrop-blur-sm',
      )}>
        {/* Decorative glows */}
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-rose-500/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-gradient-to-tr from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

        <div className="relative flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:gap-8 lg:p-8">
          {/* Identity block */}
          <div className="flex items-start gap-5 sm:gap-6 lg:min-w-[280px] lg:max-w-md lg:shrink-0">
            <div className="relative shrink-0">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-rose-500 font-display text-xl font-bold text-white shadow-lift sm:h-20 sm:w-20 sm:text-2xl sm:rounded-3xl"
                aria-hidden="true"
              >
                {profile.initials}
              </div>
              <span
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-xl bg-indigo-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900 shadow-sm shadow-indigo-500/40"
                title="Competitive aspirant"
                aria-label="Competitive aspirant"
              >
                🎯
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                Competitive preparation
              </p>

              <h2 className="mt-1.5 text-lg font-bold leading-tight text-slate-900 dark:text-white sm:text-xl">
                {profile.name}
              </h2>

              {profile.institution && (
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-500 dark:text-slate-400">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="leading-snug">{profile.institution}</span>
                </p>
              )}

              {profile.city && (
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="leading-snug">{profile.city}</span>
                </p>
              )}

              {/* Target exams */}
              {profile.targetExams.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {profile.targetExams.map((ex) => <ExamBadge key={ex} exam={ex} />)}
                </div>
              )}

              <Link
                to="/student/exam-agent"
                className="group/link mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <span className="underline-offset-4 group-hover/link:underline">Open exam workspace</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* Dividers */}
          <div aria-hidden="true" className="hidden w-px self-stretch bg-gradient-to-b from-transparent via-slate-200 to-transparent lg:block dark:via-slate-700/70" />
          <div aria-hidden="true" className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent lg:hidden dark:via-slate-700/70" />

          {/* Stat chips */}
          <div className="flex flex-1 flex-wrap content-center gap-3">
            {chips.map((c) => (
              <StatChip key={c.label} icon={c.icon} label={c.label} value={c.value} accent={c.accent} />
            ))}
          </div>

          {/* CTA */}
          <div className="flex shrink-0 flex-col gap-2 lg:self-center">
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/student/exam-agent">
                <Target className="h-3.5 w-3.5" /> Readiness workspace
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export { CompetitiveProfileCard }
export default CompetitiveProfileCard
