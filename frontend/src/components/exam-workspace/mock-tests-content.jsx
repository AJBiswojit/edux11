/**
 * EduX Phase 9 — Mock Tests Content · Backend-Ready
 * GET /student/mock-tests from backend, no seeded fallback.
 * Backend unavailable → empty state "No mock tests available" / "Connect the EduX backend"
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, BarChart3, CalendarClock, CheckCircle2, Clock, Database, PlayCircle, Target, Timer } from 'lucide-react'
import { useMockTestsBackend } from '@/services/student-examinations'
import { DashboardSkeleton } from '@/components/shared/loading'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Progress } from '@/components/ui'

const CATS = [
  { id: 'All', label: 'All' },
  { id: 'University', label: 'University' },
  { id: 'Competitive', label: 'Competitive' },
]

function MockTestsContent() {
  const { data, isLoading, isError, error, refetch } = useMockTestsBackend()
  const [preview, setPreview] = useState(null)
  const [cat, setCat] = useState('All')

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) {
    const isBackendDown = !error?.response || error?.response?.status >= 500
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
        <Database className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">{isBackendDown ? 'No mock tests available' : 'Could not load mock tests'}</p>
        <p className="mt-1 text-xs text-slate-400">{isBackendDown ? 'Mock tests are temporarily unavailable. Please try again later.' : String(error?.message ?? 'Error')}</p>
        <Button size="sm" variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button>
      </div>
    )
  }

  const items = data?.items ?? data?.mockTests ?? (Array.isArray(data) ? data : [])
  const completed = items.filter((t) => t.status === 'Completed')
  const avgScore = completed.length ? Math.round(completed.reduce((a, t) => a + (t.score ?? 0), 0) / completed.length) : 0
  const visible = cat === 'All' ? items : items.filter((t) => (t.domain ?? t.category) === cat)

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Tests taken', value: String(completed.length), icon: BarChart3, grad: 'from-indigo-500 to-blue-500' },
          { label: 'Average score', value: `${avgScore}%`, icon: Target, grad: 'from-teal-500 to-emerald-500' },
          { label: 'Best percentile', value: '—', icon: CheckCircle2, grad: 'from-emerald-500 to-green-500' },
          { label: 'Hours simulated', value: '—', icon: Timer, grad: 'from-amber-500 to-orange-500' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`rounded-3xl bg-gradient-to-br ${s.grad} p-5 text-white shadow-lg`}>
            <s.icon className="h-5 w-5 opacity-80" />
            <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
            <p className="text-[11px] font-medium text-white/75">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/70 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {CATS.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={`rounded-xl px-4 py-2 text-[12.5px] font-bold transition-all ${cat === c.id ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300'}`}>
            {c.label}
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${cat === c.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>{c.id === 'All' ? items.length : items.filter((t) => (t.domain ?? t.category) === c.id).length}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
          <Database className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No {cat === 'University' ? 'university' : cat === 'Competitive' ? 'competitive' : ''} mock tests available</p>
          <p className="mt-1 text-xs text-slate-400">New mock tests will appear here as soon as they are published.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {visible.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="group h-full p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">{t.subjectName ?? t.subject} · {t.type} · {t.domain ?? t.category ?? '—'}</p>
                    <h3 className="mt-1 text-[16px] font-bold text-slate-900 dark:text-white">{t.title}</h3>
                  </div>
                  <Badge variant={t.status === 'Completed' ? 'success' : 'info'}>{t.status}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant={t.difficulty === 'Easy' ? 'success' : t.difficulty === 'Medium' ? 'warning' : 'danger'} size="sm">{t.difficulty ?? '—'}</Badge>
                  <Badge variant="outline" size="sm">{t.questionCount ?? t.questions ?? '—'} Qs</Badge>
                  <Badge variant="outline" size="sm">{t.marks ?? t.totalMarks ?? '—'} marks</Badge>
                  {t.negativeMarking && <Badge variant="outline" size="sm">{t.negativeMarking}</Badge>}
                  <Badge variant="outline" size="sm">{t.duration ?? '—'}</Badge>
                  {t.pattern && <Badge variant="secondary" size="sm">{t.pattern}</Badge>}
                </div>

                {t.status === 'Completed' ? (
                  <>
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="font-display text-lg font-bold text-indigo-600 dark:text-indigo-300">{t.score ?? '—'}%</p><p className="text-[9px] font-medium text-slate-400">Score</p></div>
                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="font-display text-lg font-bold text-slate-800 dark:text-white">{t.percentile ?? '—'}</p><p className="text-[9px] font-medium text-slate-400">Percentile</p></div>
                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="font-display text-lg font-bold text-slate-800 dark:text-white">{t.accuracy ?? '—'}%</p><p className="text-[9px] font-medium text-slate-400">Accuracy</p></div>
                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="font-display text-lg font-bold text-slate-800 dark:text-white">{t.timeUsed ?? '—'}</p><p className="text-[9px] font-medium text-slate-400">Time</p></div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setPreview(t)}><BarChart3 className="h-4 w-4" /> View detailed analysis</Button>
                  </>
                ) : (
                  <div className="mt-5">
                    <div className="flex items-center gap-4 text-[12px] font-medium text-slate-400"><span className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> {t.date ?? 'TBD'}</span><span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {t.duration ?? '—'}</span></div>
                    <Button className="mt-5 w-full" size="sm" onClick={() => setPreview(t)}><PlayCircle className="h-4 w-4" /> Start mock test</Button>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{preview?.title}</DialogTitle><DialogDescription>{preview?.status === 'Scheduled' ? 'Ready when you are — questions are provided without answers.' : 'Detailed analysis for this attempt.'}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setPreview(null)}>Close</Button><Button onClick={() => setPreview(null)}>{preview?.status === 'Scheduled' ? 'Begin test' : 'Open planner'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { MockTestsContent }
export default MockTestsContent
