import { motion } from 'framer-motion'
import { BookOpen, GraduationCap, Sparkles } from 'lucide-react'
import { useStudentIntelligence } from '@/services/intelligence'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Card, Progress, Badge } from '@/components/ui'

/**
 * Subject card grid — reused by the standalone Subjects page and the
 * Academics hub (Subjects tab). Never duplicate this markup.
 */
function metric(value, suffix = '') {
  if (value == null || value === '') return '—'
  return `${value}${suffix}`
}

export function SubjectGrid({ subjects }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {subjects.map((s, i) => {
        const internal = Number(s.internal)
        const hasInternal = Number.isFinite(internal)
        return (
        <motion.div key={s.code} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="group h-full overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
            <div className="flex items-start justify-between p-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}aa)` }}>
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: s.color }}>{s.code}</p>
                  <h3 className="text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{s.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                    <GraduationCap className="h-3 w-3" /> {s.teacher}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <p className="font-display text-lg font-bold" style={{ color: s.color }}>{metric(s.internal)}</p>
                  <p className="text-[10px] font-medium text-slate-400">Internal</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <p className="font-display text-lg font-bold text-slate-800 dark:text-white">{metric(s.attendance, '%')}</p>
                  <p className="text-[10px] font-medium text-slate-400">Attendance</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <p className="font-display text-lg font-bold text-slate-800 dark:text-white">{metric(s.progress, '%')}</p>
                  <p className="text-[10px] font-medium text-slate-400">Syllabus</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <span>Syllabus coverage</span>
                  <span>{metric(s.progress, '%')}</span>
                </div>
                <Progress value={s.progress ?? 0} className="mt-1.5" gradient={s.color} />
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-indigo-50/60 p-3 dark:bg-indigo-500/5">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-indigo-600 dark:text-indigo-300">AI:</span> {hasInternal ? (internal >= 80 ? `${s.name} is a strength — maintain with weekly reviews.` : `Focused practice recommended — ${internal} internal vs 70 target.`) : 'Internal marks appear after they are recorded.'}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
        )
      })}
    </div>
  )
}

function Subjects() {
  /* Phase 27.3: subjects come from the Student Intelligence Foundation (was /student/subjects). */
  const { data: intel, isLoading, isError, refetch } = useStudentIntelligence()
  const subjects = intel?.derived?.university?.subjects ?? []

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Academics · Subjects"
        title="Subjects — Semester 5"
        description="This semester's subjects with live internal marks, attendance and syllabus progress."
        breadcrumbs={[{ label: 'Student' }, { label: 'Subjects' }]}
        actions={<Badge variant="gradient" className="px-3 py-1">{subjects.length} subjects · {subjects.reduce((a, s) => a + s.credits, 0)} credits</Badge>}
      />

      <SubjectGrid subjects={subjects} />
    </div>
  )
}

export { Subjects }
export default Subjects
