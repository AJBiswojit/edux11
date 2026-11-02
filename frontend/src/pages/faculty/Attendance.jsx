import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck2, CheckCircle2, ClipboardList, Sparkles, Users } from 'lucide-react'
import {
  useFacultyAttendance,
  useFacultyRoster,
  useCreateAttendanceSession,
  useMarkAttendance,
} from '@/services'
import { useFacultyCourses } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend } from '@/components/charts'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import {
  Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, useToast,
} from '@/components/ui'

function Attendance() {
  const { data, isLoading, isError, refetch } = useFacultyAttendance()
  const { data: rosterData } = useFacultyRoster()
  const { data: coursesData } = useFacultyCourses()
  const { mutateAsync: createSession, isPending: creating } = useCreateAttendanceSession()
  const { mutateAsync: markAttendance, isPending: saving } = useMarkAttendance()
  const [marking, setMarking] = useState(null)
  const [marked, setMarked] = useState({})
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const roster = rosterData?.students ?? []
  const courses = coursesData?.items ?? []
  const below = data?.studentsBelowThreshold ?? []
  const classes = data?.classes ?? []
  const summary = data?.summary ?? {}

  const openMark = (row) => {
    const initial = {}
    roster.forEach((s) => { initial[s.id] = true })
    setMarked(initial)
    setMarking(row)
  }

  const startNewSheet = async () => {
    const course = courses[0]
    if (!course?.id) {
      toast.error('No course available', 'Attendance sessions need a course in the catalog.')
      return
    }
    try {
      const res = await createSession({ courseId: course.id, topic: 'Class session' })
      if (res?.ok && res.session?.id) {
        openMark({
          id: res.session.id,
          course: course.code || course.title,
          section: '—',
          date: res.session.date,
          topic: res.session.topic,
        })
      }
    } catch (e) {
      toast.error('Could not open class sheet', e?.response?.data?.detail ?? e?.message ?? 'Please try again.')
    }
  }

  const saveMarks = async () => {
    if (!marking?.id) {
      toast.error('No session', 'Create or select a class session first.')
      return
    }
    const records = roster.map((s) => ({ studentId: s.id, mark: marked[s.id] === false ? 'absent' : 'present' }))
    try {
      const res = await markAttendance({ sessionId: marking.id, records })
      if (res?.ok) {
        toast.success('Attendance saved', `${marking.course} · ${res.saved ?? records.length} records stored.`)
        setMarking(null)
      }
    } catch (e) {
      toast.error('Could not save attendance', e?.response?.data?.detail ?? e?.message ?? 'Please try again.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Teaching · Attendance"
        title="Attendance"
        description="Mark classes in minutes, spot trends, and keep every cohort above the 75% threshold."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Attendance' }]}
        actions={
          <Button size="sm" onClick={startNewSheet} disabled={creating}>
            <ClipboardList className="h-4 w-4" /> {creating ? 'Opening…' : 'New class sheet'}
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Average attendance', value: `${summary.avgAttendance ?? 0}%`, grad: 'from-emerald-500 to-teal-500', sub: classes.length ? `${classes.length} sessions` : 'No sessions yet' },
          { label: 'Best class', value: summary.highestClass && summary.highestClass !== '-' ? summary.highestClass : '—', grad: 'from-indigo-500 to-blue-500', sub: classes.length ? 'Highest recorded session' : 'No sessions yet' },
          { label: 'Needs attention', value: summary.lowestClass && summary.lowestClass !== '-' ? summary.lowestClass : '—', grad: 'from-amber-500 to-orange-500', sub: classes.length ? 'Lowest recorded session' : 'No sessions yet' },
          { label: 'Students below 75%', value: String(summary.studentsBelow75 ?? 0), grad: 'from-rose-500 to-red-500', sub: below.length ? `${below.length} from live records` : 'None flagged' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`rounded-3xl bg-gradient-to-br ${s.grad} p-5 text-white shadow-lg`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">{s.label}</p>
            <p className="mt-1 truncate font-display text-xl font-bold">{s.value}</p>
            <p className="text-[11px] text-white/70">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Weekly attendance" subtitle="All courses · recorded sessions" className="lg:col-span-2">
          <AreaTrend
            data={data.weeklyTrend ?? []}
            xKey="week"
            height={230}
            series={[{ key: 'pct', name: 'Attendance', color: '#14b8a6' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>

        <Card className="p-6">
          <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <Users className="h-4 w-4 text-rose-500" /> Below 75% threshold
          </p>
          <div className="mt-4 space-y-2.5">
            {below.map((s) => (
              <div key={s.roll} className="flex items-center gap-3 rounded-2xl border border-rose-100 p-3 dark:border-rose-500/20">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                  <p className="text-[10.5px] text-slate-400">{s.roll} · {s.classes} classes missed</p>
                </div>
                <span className={`text-sm font-bold ${s.attendance < 75 ? 'text-rose-500' : 'text-amber-500'}`}>{s.attendance}%</span>
              </div>
            ))}
            {!below.length && <p className="text-xs text-slate-400">No students below threshold.</p>}
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => toast.info('Notices', below.length ? `${below.length} student(s) currently below 75%.` : 'No students are below the threshold.')}>
            <Sparkles className="h-4 w-4" /> Review flagged students
          </Button>
        </Card>
      </div>

      <h2 className="mb-4 mt-8 text-[15px] font-bold text-slate-900 dark:text-white">Recent class records</h2>
      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Course</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Topic</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Date</th>
                <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Present</th>
                <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">%</th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-indigo-50/40 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-100">{c.course} <span className="text-slate-400">· {c.section}</span></td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-300">{c.topic}</td>
                  <td className="px-5 py-3.5 text-slate-400">{c.date}</td>
                  <td className="px-5 py-3.5 text-center font-semibold text-slate-700 dark:text-slate-200">{c.present}/{c.total}</td>
                  <td className="px-5 py-3.5 text-center">
                    {c.total
                      ? <span className={`font-bold ${c.pct >= 90 ? 'text-emerald-500' : c.pct >= 75 ? 'text-amber-500' : 'text-rose-500'}`}>{c.pct}%</span>
                      : <span className="font-semibold text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button size="sm" variant="outline" onClick={() => openMark(c)}>
                      {c.status === 'Marked' ? 'Edit' : 'Mark'}
                    </Button>
                  </td>
                </tr>
              ))}
              {!classes.length && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">No attendance sessions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!marking} onOpenChange={(v) => !v && setMarking(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mark attendance — {marking?.course} ({marking?.section})</DialogTitle>
            <DialogDescription>{marking?.date} · {marking?.topic}. Tap students to toggle present/absent.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto scrollbar-thin pr-1 sm:grid-cols-3">
            {roster.map((s) => {
              const isPresent = marked[s.id] ?? true
              return (
                <button
                  key={s.id}
                  onClick={() => setMarked((m) => ({ ...m, [s.id]: !isPresent }))}
                  className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all duration-200 ${
                    isPresent ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/25 dark:bg-emerald-500/5' : 'border-rose-200 bg-rose-50/60 dark:border-rose-500/25 dark:bg-rose-500/5'
                  }`}
                >
                  <CheckCircle2 className={`h-4 w-4 shrink-0 ${isPresent ? 'text-emerald-500' : 'text-rose-400'}`} />
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold text-slate-700 dark:text-slate-200">{s.name}</span>
                    <span className="text-[10px] text-slate-400">{s.roll}</span>
                  </span>
                </button>
              )
            })}
            {!roster.length && <p className="col-span-full py-6 text-center text-xs text-slate-400">No students in this institution roster.</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarking(null)}>Cancel</Button>
            <Button onClick={saveMarks} disabled={saving || !roster.length}>
              <CalendarCheck2 className="h-4 w-4" /> {saving ? 'Saving…' : 'Save attendance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Attendance }
export default Attendance
