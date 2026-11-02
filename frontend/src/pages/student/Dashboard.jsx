import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, ClipboardList, Target, Trophy,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useStudentIntelligence } from '@/services/intelligence'
import { ChartCard } from '@/components/shared/chart-card'
import { ProgressRing } from '@/components/shared/progress-ring'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { PageHeader } from '@/components/shared/page-header'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { formatDate } from '@/utils/format'
import {
  SuccessCenter, UpcomingDeadlines, RecentActivities,
  CompetitiveProfileCard, TodayStudyPlan,
} from '@/components/dashboard'
import { AcademicJourney } from '@/components/dashboard/academic-journey'
import {
  buildOverallReadinessKpi,
  buildChapterMasteryRows,
  buildSyllabusCoverageRows,
} from './dashboard-view'

/**
 * Student Dashboard — Competitive Exam Command Center.
 * Every section is driven by the Student Intelligence Foundation snapshot.
 * University-specific sections have been replaced with competitive equivalents:
 *   AcademicInfoCard      → CompetitiveProfileCard
 *   KPI strip             → Overall Readiness KPI
 *   SuccessCenter         → AI Exam DNA · Mock Readiness · Time Budget · Milestones
 *   Competitive prep      → Exam Family Readiness (promoted, always visible)
 *   Today's Schedule      → Today's Study Plan
 *   UpcomingDeadlines     → Mocks & Deadlines (mock/registration/admit card types)
 *   RecentActivities      → Recent Performance Feed (scores · accuracy · delta)
 *   Subject Mastery       → Chapter Mastery
 *   AcademicJourney       → Preparation Journey
 *   Course Progress       → Syllabus Coverage
 */

const CHAPTER_PALETTE = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9']

function formatPct(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`
}

/** Full-width readiness banner — shown when there is exactly one visible KPI. */
function ReadinessBanner({ kpi }) {
  return (
    <div className="group relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-slate-200/70 bg-white px-6 py-6 shadow-card ring-1 ring-slate-900/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900/80 dark:ring-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-7">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-400/5 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25">
          <Target className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">Overall Readiness</p>
          <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{kpi.sub}</p>
        </div>
      </div>
      <div className="relative flex items-baseline gap-2 sm:text-right">
        <p className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{kpi.value}</p>
        <span className={`text-sm font-bold ${kpi.up ? 'text-emerald-500' : 'text-rose-500'}`}>{kpi.delta}</span>
      </div>
    </div>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const { data: intel, isLoading: intelLoading, isError: intelError, refetch: refetchIntel } = useStudentIntelligence()
  const profileMismatch = Boolean(user?.id && intel && intel.profile?.id !== user.id)

  useEffect(() => {
    if (profileMismatch) refetchIntel()
  }, [profileMismatch, refetchIntel])

  const [dialogs, setDialogs] = useState({ dna: false, readiness: false, career: false, portfolio: false })
  const setDialog = (patch) => setDialogs((d) => ({ ...d, ...patch }))

  if (intelLoading || (profileMismatch && !intelError)) return <DashboardSkeleton cards={4} />
  if (intelError || !intel?.profile) return <ErrorState onRetry={() => refetchIntel()} />

  const derived = intel.derived
  const profile = intel.profile
  const datasets = intel.datasets

  // ── KPI ──────────────────────────────────────────────────────────────────
  const readinessKpi = buildOverallReadinessKpi({ derived })

  // ── Competitive profile view ──────────────────────────────────────────────
  const competitiveProfileView = {
    name: profile.fullName,
    fullName: profile.fullName,
    initials: `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase() || undefined,
    studentId: profile.studentId ?? profile.rollNo,
    targetExams: profile.targetExams ?? [],
    examYear: profile.examYear ?? profile.batch,
    prepMode: profile.prepMode ?? 'School',
    percentileGoal: profile.percentileGoal ?? null,
    institution: profile.institution,
    city: profile.city ?? profile.location,
    coachingCenter: profile.coachingCenter ?? '',
  }

  // ── Chapter mastery ────────────────────────────────────────────────────────
  const chapterMastery = buildChapterMasteryRows({ derived, datasets })

  // ── Syllabus coverage ──────────────────────────────────────────────────────
  const syllabusCoverage = buildSyllabusCoverageRows({ derived, datasets })

  // ── Preparation journey — reuse academicJourney events ────────────────────
  // Filter to exam-relevant types; fall back to full journey if nothing matches
  const journeyEvents = derived.academicJourney ?? []
  const competitiveTypes = new Set(['exam', 'milestone', 'achievement', 'certification', 'ai', 'alert'])
  const prepJourney = journeyEvents.filter((e) => competitiveTypes.has(e.type))
  const visibleJourney = prepJourney.length > 0 ? prepJourney : journeyEvents

  // ── Exam family readiness ──────────────────────────────────────────────────
  const examFamilies = Object.entries(derived.readiness?.byExamFamily ?? {})

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Student · Competitive Command Center"
        title={`Welcome back, ${profile?.firstName ?? 'Student'} 🎯`}
        description="Your competitive exam command center — readiness, mock performance, time budget and prep milestones."
        breadcrumbs={[{ label: 'Student' }, { label: 'Dashboard' }]}
      />

      {/* 1. Competitive profile card */}
      <CompetitiveProfileCard
        profile={competitiveProfileView}
        readiness={derived.readiness}
      />

      {/* 2. Overall Readiness KPI banner */}
      <ReadinessBanner kpi={readinessKpi} />

      {/* 3. Competitive Intelligence Center (Success Center) */}
      <SuccessCenter
        derived={derived}
        profile={profile}
        datasets={datasets}
        dnaOpen={dialogs.dna}
        readinessOpen={dialogs.readiness}
        careerOpen={dialogs.career}
        portfolioOpen={dialogs.portfolio}
        onOpenChange={setDialog}
      />

      {/* 4. Exam Family Readiness — promoted, always rendered */}
      {examFamilies.length > 0 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                <Target className="h-3.5 w-3.5" /> Exam family readiness
              </p>
              <h2 className="mt-0.5 text-[15px] font-bold text-slate-900 dark:text-white">
                Per-exam readiness scores
              </h2>
            </div>
            <Link
              to="/student/exam-agent"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Open readiness workspace <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {examFamilies.map(([family, fam]) => {
              const next = (derived.readiness?.competitive ?? []).find((e) => e.examFamily === family)
              const mockAvg = fam.factors?.find((f) => f.label === 'Mock average')?.value
              return (
                <div
                  key={family}
                  className="flex items-center justify-between gap-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <ProgressRing
                      value={fam.score ?? 0}
                      size={76}
                      stroke={8}
                      label={`${fam.score ?? '—'}`}
                      sublabel={family}
                      color={fam.score >= 70 ? '#10b981' : fam.score >= 55 ? '#f59e0b' : '#f43f5e'}
                    />
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-slate-900 dark:text-white">
                        {family === 'JEE' ? 'JEE Main & Advanced' : family === 'NEET' ? 'NEET (UG)' : family}{' '}
                        <Badge
                          variant={fam.score >= 70 ? 'success' : fam.score >= 55 ? 'warning' : 'danger'}
                          size="sm"
                        >
                          {fam.level}
                        </Badge>
                      </p>
                      <p className="mt-1 text-[11.5px] text-slate-400">
                        {next
                          ? `Next: ${next.title?.slice(0, 34)} · ${formatDate(next.date, 'MMM d')}`
                          : 'No scheduled mocks'}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {mockAvg != null && (
                          <Badge variant="outline" size="sm">Mock avg {Math.round(mockAvg)}%</Badge>
                        )}
                        {fam.recommendations?.slice(0, 1).map((rec) => (
                          <Badge key={rec.text} variant="secondary" size="sm">
                            <span className="block max-w-[190px] truncate">{rec.text}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 5. Study stats · Upcoming mocks & deadlines · Recent performance */}
      <div className="grid items-stretch gap-6 lg:grid-cols-3">
        <TodayStudyPlan datasets={datasets} />
        <UpcomingDeadlines
          deadlines={derived.upcomingDeadlines}
          competitiveExams={datasets.competitiveExams ?? []}
        />
        <RecentActivities activities={derived.recentActivities} datasets={datasets} />
      </div>

      {/* 6. Chapter mastery + Syllabus coverage */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Chapter mastery */}
        <ChartCard
          title="Chapter mastery"
          subtitle="Accuracy per chapter / topic"
          className="xl:col-span-2"
          contentClassName="pt-3"
        >
          {chapterMastery.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center text-sm text-slate-400 dark:border-slate-800">
              Chapter scores appear once you start attempting topic-wise tests.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {chapterMastery.slice(0, 6).map((c, index) => {
                const color = c.color || CHAPTER_PALETTE[index % CHAPTER_PALETTE.length]
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/30"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
                          {c.subject}
                        </p>
                        {(c.examFamily || c.subjectLabel) && (
                          <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                            {c.subjectLabel ?? c.examFamily}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 text-lg font-bold tabular-nums" style={{ color }}>
                        {formatPct(c.mastery)}
                      </p>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(Math.max(c.mastery ?? 0, 0), 100)}%` }}
                        transition={{ duration: 0.9, delay: 0.12 + index * 0.06 }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>

        {/* Syllabus coverage */}
        <Card className="h-full">
          <CardHeader className="flex-row items-center justify-between px-6 pt-6">
            <CardTitle className="text-[15px]">Syllabus coverage</CardTitle>
            <Link
              to="/student/exam-agent"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {syllabusCoverage.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-xs text-slate-400 dark:border-slate-800">
                Syllabus data appears once chapters are tracked.
              </div>
            ) : (
              <div className="space-y-4">
                {syllabusCoverage.map((s, index) => {
                  const color = s.color || CHAPTER_PALETTE[index % CHAPTER_PALETTE.length]
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                            {s.subject}
                          </p>
                          {(s.chaptersDone != null) && (
                            <p className="text-[10px] text-slate-400">
                              {s.chaptersDone}/{s.chaptersTotal ?? '?'} chapters
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-sm font-bold tabular-nums" style={{ color }}>
                          {formatPct(s.progress)}
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(Math.max(s.progress ?? 0, 0), 100)}%` }}
                          transition={{ duration: 0.9, delay: 0.1 + index * 0.07 }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 7. Preparation Journey + Mock history summary */}
      <div className="grid items-stretch gap-6 lg:grid-cols-3">
        {/* Preparation journey — reuses AcademicJourney with competitive events */}
        <div className="lg:col-span-2">
          <AcademicJourney
            events={visibleJourney}
            title="Preparation journey"
            subtitle="Mock tests · milestones · achievements"
          />
        </div>

        {/* Mock history summary card */}
        <Card className="h-full">
          <CardHeader className="flex-row items-center justify-between px-6 pt-6">
            <CardTitle className="text-[15px]">Mock history</CardTitle>
            <Link
              to="/student/exam-agent"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {(() => {
              const completed = (datasets.competitiveExams ?? [])
                .filter((e) => e.status === 'Completed')
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
              if (completed.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-800">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10">
                      <ClipboardList className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No mocks attempted yet</p>
                    <p className="mt-1 text-xs text-slate-400">Scores appear after your first mock test.</p>
                    <Button asChild size="sm" variant="outline" className="mt-4">
                      <Link to="/student/exam-agent">Start a mock</Link>
                    </Button>
                  </div>
                )
              }
              return (
                <div className="space-y-3">
                  {completed.map((m, i) => {
                    // competitiveExams score is raw marks; convert to % using maxMarks
                    const pct = m.maxMarks ? Math.round(((m.score ?? 0) / m.maxMarks) * 100) : (m.percentile ?? 0)
                    const color = pct >= 75 ? '#10b981' : pct >= 55 ? '#f59e0b' : '#f43f5e'
                    const examFamily = m.examType?.includes('NEET') ? 'NEET' : m.examType?.includes('JEE') ? 'JEE' : null
                    return (
                      <div
                        key={m.id ?? i}
                        className="flex items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3 dark:border-slate-800"
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
                          style={{ background: color }}
                        >
                          {pct}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">
                            {m.shortName ?? m.title}
                          </p>
                          <p className="text-[10.5px] text-slate-400">
                            {examFamily ?? ''}
                            {m.date ? ` · ${formatDate(m.date, 'MMM d')}` : ''}
                          </p>
                        </div>
                        {m.rank && (
                          <div className="flex items-center gap-1 text-[10.5px] font-semibold text-slate-400">
                            <Trophy className="h-3 w-3" /> {m.rank}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export { Dashboard }
export default Dashboard
