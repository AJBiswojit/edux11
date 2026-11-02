import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, CheckCircle2, ClipboardList, FileText, GraduationCap, TrendingUp, Users, Zap } from 'lucide-react'
import { useFacultyCourses } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Progress, useToast } from '@/components/ui'

function CourseOverview() {
  const { data, isLoading, isError, refetch } = useFacultyCourses()
  const [active, setActive] = useState(null)
  const toast = useToast()
  const courses = data?.items ?? []
  const selected = active ?? courses[0]

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Teaching · Courses"
        title="Course overview"
        description="Everything about your courses — progress, outcomes, cohorts and health — in one command centre."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Course Overview' }]}
        actions={<Badge variant="gradient" className="px-3 py-1"><BookOpen className="h-3 w-3" /> {courses.length} courses</Badge>}
      />

      {/* Course picker */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {courses.map((c, i) => (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setActive(c)}
            className={`group relative overflow-hidden rounded-3xl border-2 p-5 text-left transition-all duration-300 ${selected?.id === c.id ? 'border-indigo-400/70 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-card dark:border-indigo-400/50 dark:from-indigo-500/10 dark:to-blue-500/5' : 'border-slate-200/70 bg-white hover:border-indigo-200 hover:shadow-card dark:border-slate-800 dark:bg-slate-900'}`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}aa)` }}>
                <BookOpen className="h-5 w-5" />
              </span>
              <Badge variant="secondary" size="sm">{c.section}</Badge>
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: c.color }}>{c.code}</p>
            <h3 className="text-[14.5px] font-bold leading-snug text-slate-900 dark:text-white">{c.title}</h3>
            <p className="mt-1 text-[11px] text-slate-400"><Users className="mr-1 inline h-3 w-3" />{c.students} students · {c.credits} credits</p>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-bold text-slate-400"><span>Progress</span><span>{c.progress}%</span></div>
              <Progress value={c.progress} className="mt-1 h-1.5" gradient={c.color} />
            </div>
          </motion.button>
        ))}
      </div>

      {selected && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Lectures completed', value: `${selected.lecturesDone}/${selected.lecturesTotal}`, icon: BookOpen, color: 'text-indigo-500' },
              { label: 'Class average', value: `${selected.avgScore}%`, icon: TrendingUp, color: 'text-emerald-500' },
              { label: 'Pass rate', value: `${selected.passRate}%`, icon: CheckCircle2, color: 'text-teal-500' },
              { label: 'At-risk students', value: String(selected.atRisk), icon: Users, color: 'text-rose-500' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
                <p className="text-[11px] font-medium text-slate-400">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Outcomes */}
          <Card className="mt-6 p-6">
            <p className="text-[15px] font-bold text-slate-900 dark:text-white">Course outcome attainment</p>
            <p className="mt-0.5 text-xs text-slate-400">AI-estimated attainment per CO from graded work this term</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {selected.outcomes.map((o, i) => (
                <motion.div key={o.co} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" size="sm">{o.co}</Badge>
                    <span className={`text-sm font-bold ${o.attainment >= 80 ? 'text-emerald-600 dark:text-emerald-400' : o.attainment >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'}`}>{o.attainment}%</span>
                  </div>
                  <p className="mt-2.5 text-[12.5px] font-semibold leading-snug text-slate-700 dark:text-slate-200">{o.desc}</p>
                  <Progress value={o.attainment} className="mt-3 h-2" gradient={o.attainment >= 80 ? 'from-emerald-500 to-teal-400' : o.attainment >= 70 ? 'from-amber-500 to-orange-400' : 'from-rose-500 to-red-400'} />
                </motion.div>
              ))}
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-4 ring-1 ring-indigo-500/15">
              <Zap className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
              <p className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-800 dark:text-slate-100">AI note:</span> CO4 attainment trails the rest — a focused tutorial on NP-completeness (with worked reductions) typically lifts it 6–8 points before midsem.
              </p>
            </div>
          </Card>

          {/* Materials quick row */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { icon: FileText, label: 'Assignments', value: `${selected.assignments} live`, action: 'View all' },
              { icon: ClipboardList, label: 'Quizzes', value: `${selected.quizzes} published`, action: 'Open quiz builder' },
              { icon: GraduationCap, label: 'Coordinator', value: selected.coordinator, action: 'View profile' },
            ].map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="flex items-center justify-between gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                      <c.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{c.value}</p>
                      <p className="text-[11px] text-slate-400">{c.label}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => toast.info(c.label, c.action)}>{c.action}</Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export { CourseOverview }
export default CourseOverview
