import { Award, BookOpen, CalendarRange, CheckCircle2, Circle, GraduationCap, Layers, Target } from 'lucide-react'
import { useStudentPrograms } from '@/services/extra'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Card, Progress } from '@/components/ui'

function Programs() {
  const { data, isLoading, isError, refetch } = useStudentPrograms()

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const prog = data.current

  if (!prog) {
    return (
      <div>
        <PageHeader
          eyebrow="Academic · Programs"
          title="My program"
          description="Degree structure, credit requirements and specialization tracks — your roadmap to graduation."
          breadcrumbs={[{ label: 'Student' }, { label: 'Programs' }]}
        />
        <EmptyState title="No program enrolled" description="Your program appears here once your institution assigns one to your profile." />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Academic · Programs"
        title="My program"
        description="Degree structure, credit requirements and specialization tracks — your roadmap to graduation."
        breadcrumbs={[{ label: 'Student' }, { label: 'Programs' }]}
        actions={<Badge variant="gradient" className="px-3 py-1"><GraduationCap className="h-3 w-3" /> {prog.code}</Badge>}
      />

      {/* Program hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-7 text-white shadow-lift sm:p-9">
        <div className="bg-dots absolute inset-0 opacity-15" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/15 text-white ring-white/30">{prog.accredited}</Badge>
              <Badge className="bg-white/15 text-white ring-white/30">{prog.duration}</Badge>
              <Badge className="bg-emerald-400/90 text-emerald-950 ring-transparent">{prog.status}</Badge>
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">{prog.name}</h1>
            <p className="mt-2 text-sm text-white/85">
              {prog.institution} · Started {prog.started} · Expected completion {prog.expectedEnd}
            </p>
            <div className="mt-5 flex flex-wrap gap-6">
              <div>
                <p className="font-display text-2xl font-bold">{prog.earnedCredits}<span className="text-sm text-white/70">/{prog.totalCredits}</span></p>
                <p className="text-[11px] font-semibold text-white/75">Credits earned</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold">{prog.cgpa}</p>
                <p className="text-[11px] font-semibold text-white/75">Current CGPA</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold">{prog.totalCredits ? Math.round((prog.earnedCredits / prog.totalCredits) * 100) : 0}%</p>
                <p className="text-[11px] font-semibold text-white/75">Degree progress</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-36 w-36">
              <svg className="h-36 w-36 -rotate-90">
                <circle cx="72" cy="72" r="60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
                <circle cx="72" cy="72" r="60" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 60} strokeDashoffset={2 * Math.PI * 60 * (1 - (prog.totalCredits ? prog.earnedCredits / prog.totalCredits : 0))} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-bold">{prog.totalCredits ? Math.round((prog.earnedCredits / prog.totalCredits) * 100) : 0}%</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/75">Complete</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Semester timeline */}
        <Card className="p-6">
          <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <CalendarRange className="h-4 w-4 text-indigo-500" /> Semester roadmap
          </p>
          <div className="mt-5 space-y-2">
            {prog.semesters.map((s, i) => (
              <div key={s.sem} className="flex items-center gap-3.5 rounded-2xl border border-slate-100 p-3.5 transition-colors hover:border-indigo-200 dark:border-slate-800 dark:hover:border-indigo-500/30">
                {s.status === 'Completed' ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 ring-1 ring-emerald-500/20"><CheckCircle2 className="h-4 w-4" /></span>
                ) : s.status === 'In Progress' ? (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 text-indigo-600 ring-1 ring-indigo-500/20"><Target className="h-4 w-4" /></span>
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Circle className="h-4 w-4" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{s.sem}</p>
                  <p className="text-[11px] text-slate-400">{s.credits} credits · {s.courses} courses</p>
                </div>
                <Badge variant={s.status === 'Completed' ? 'success' : s.status === 'In Progress' ? 'warning' : 'secondary'}>{s.status}</Badge>
                {s.cgpa && <span className="font-display text-sm font-bold text-slate-700 dark:text-slate-200">{s.cgpa}</span>}
              </div>
            ))}
          </div>
        </Card>

        {/* Requirements + specializations */}
        <div className="space-y-6">
          <Card className="p-6">
            <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
              <Award className="h-4 w-4 text-amber-500" /> Degree requirements
            </p>
            <div className="mt-4 space-y-4">
              {(prog.requirements ?? []).map((r) => (
                <div key={r.item}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                      {r.met ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />}
                      {r.item}
                    </span>
                    <span className={`font-bold ${r.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {r.earned}/{r.required}
                    </span>
                  </div>
                  <Progress value={Math.min((r.earned / r.required) * 100, 100)} className="mt-1.5 h-1.5" gradient={r.met ? 'from-emerald-500 to-teal-400' : 'from-amber-500 to-orange-400'} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
              <Layers className="h-4 w-4 text-violet-500" /> Specializations
            </p>
            <div className="mt-4 space-y-3">
              {prog.specializations.map((sp) => (
                <div key={sp.name} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{sp.name}</p>
                    <Badge variant={sp.status === 'Active' ? 'success' : 'secondary'}>{sp.status}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{sp.courses} courses · {sp.progress}% complete</p>
                  <Progress value={sp.progress} className="mt-2 h-1.5" gradient="from-violet-500 to-indigo-400" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Other programs */}
      <h2 className="mb-4 mt-8 text-[15px] font-bold text-slate-900 dark:text-white">Additional programs</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {(data.others ?? []).map((o) => (
          <Card key={o.name} className="flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-300">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-slate-900 dark:text-white">{o.name}</p>
              <p className="text-[11.5px] text-slate-400">{o.institution} · {o.credits} credits</p>
            </div>
            <Badge variant={o.status === 'Declared' ? 'info' : 'gradient'}>{o.status}</Badge>
          </Card>
        ))}
      </div>
    </div>
  )
}

export { Programs }
export default Programs
