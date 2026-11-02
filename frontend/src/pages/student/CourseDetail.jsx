import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Clock, Download, FileText, PlayCircle, Sparkles, Trophy } from 'lucide-react'
import { useStudentIntelligence } from '@/services/intelligence'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card } from '@/components/ui'
import { formatDuration } from '@/utils/format'

function CourseDetail() {
  const { id } = useParams()
  /* Phase 27.3: course detail comes from the Student Intelligence Foundation (was /student/courses/:id). */
  const { data: intel, isLoading, isError, refetch } = useStudentIntelligence()
  const course = (intel?.derived?.university?.courses ?? []).find((c) => c.id === id || c.code === id) ?? null

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError || !course) return <ErrorState onRetry={() => refetch()} />

  const stats = course.stats ?? {}
  const modules = course.modules ?? []
  const resources = course.resources ?? []
  const progress = course.progress ?? 0

  return (
    <div>
      <Link to="/student/courses" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">
        <ArrowLeft className="h-4 w-4" /> All courses
      </Link>

      {/* Course hero */}
      <div className="relative overflow-hidden rounded-3xl p-8 text-white shadow-lift sm:p-10" style={{ background: `linear-gradient(120deg, ${course.color}, ${course.color}99 60%, #0f172a 130%)` }}>
        <div className="bg-dots absolute inset-0 opacity-15" />
        <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/15 text-white ring-white/30">{course.code}</Badge>
              <Badge className="bg-white/15 text-white ring-white/30">{course.credits} credits</Badge>
              {course.grade && <Badge className="bg-emerald-400/90 text-emerald-950 ring-transparent">Grade {course.grade}</Badge>}
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{course.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">{course.description}</p>
            <p className="mt-3 text-xs font-semibold text-white/70">Instructor: {course.instructor}</p>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white/10 p-6 ring-1 ring-white/20 backdrop-blur-sm">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <svg className="h-20 w-20 -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="7" />
                <circle
                  cx="40" cy="40" r="34" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - progress / 100)}
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <span className="absolute font-display text-xl font-bold">{progress}%</span>
            </div>
            <p className="text-xs font-semibold text-white/80">Course progress</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Lessons completed', value: stats.lessonsCompleted ?? 0, icon: BookOpen },
          { label: 'Average score', value: stats.avgScore != null ? `${stats.avgScore}%` : '—', icon: Trophy },
          { label: 'Hours invested', value: `${stats.hoursSpent ?? 0}h`, icon: Clock },
          { label: 'AI mastery score', value: stats.mastery != null ? `${stats.mastery}%` : '—', icon: Sparkles },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <s.icon className="h-5 w-5" style={{ color: course.color }} />
            <p className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-[11px] font-medium text-slate-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Modules */}
        <Card className="min-w-0 p-6">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Course content</h2>
          <p className="mt-0.5 text-xs text-slate-400">All modules · {course.lessons ?? 0} lessons</p>
          <div className="mt-5 space-y-3">
            {modules.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 dark:border-slate-700">
                No lesson modules yet — progress stays at {progress}% until content is published.
              </p>
            )}
            {modules.map((m, mi) => (
              <div key={m.id} className="overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <button className="flex w-full items-center justify-between gap-3 bg-slate-50/70 px-4 py-3.5 text-left dark:bg-slate-800/40">
                  <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{m.title}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[11px] font-bold" style={{ color: course.color }}>{m.progress}%</span>
                    <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${m.progress === 100 ? 'rotate-90' : ''}`} />
                  </span>
                </button>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {m.lessons.map((l) => (
                    <div key={l.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5">
                      {l.done ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <PlayCircle className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-500 dark:text-slate-600" />
                      )}
                      <span className={`flex-1 truncate text-[13px] ${l.done ? 'text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                        {l.title}
                      </span>
                      <Badge variant="secondary" size="sm">{l.type}</Badge>
                      <span className="hidden text-[11px] font-medium text-slate-400 sm:block">{formatDuration(parseInt(l.duration))}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sidebar */}
        <div className="min-w-0 space-y-6">
          <Card className="min-w-0 p-6">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Resources</h3>
            <div className="mt-4 space-y-2.5">
              {course.resources.map((r) => (
                <button key={r.id} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left transition-all hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-800 dark:hover:border-indigo-500/30">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-slate-700 dark:text-slate-200">{r.title}</span>
                    <span className="text-[11px] text-slate-400">{r.type}{r.size !== '—' ? ` · ${r.size}` : ''}</span>
                  </span>
                  <Download className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                </button>
              ))}
            </div>
          </Card>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-lift">
            <div className="bg-dots absolute inset-0 opacity-15" />
            <div className="relative">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/75">
                <Sparkles className="h-3.5 w-3.5" /> AI Tutor
              </p>
              <p className="mt-2 text-[13px] leading-relaxed">
                Stuck on a concept in this course? Get a personalised explanation with worked examples — 24×7.
              </p>
              <Button asChild size="sm" className="mt-4 bg-white text-indigo-700 hover:bg-indigo-50">
                <Link to="/student/mentor">Ask MediXO Mentor about this course</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { CourseDetail }
export default CourseDetail
