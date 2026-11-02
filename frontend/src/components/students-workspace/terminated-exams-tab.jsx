/**
 * Faculty — Terminated Exams tab.
 * Shows all auto-submitted/terminated exam attempts in the institution.
 * Faculty can grant resume permission so the student can continue.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Clock, Loader2, PlayCircle, RefreshCw, Shield, Timer, XCircle } from 'lucide-react'
import { Badge, Button, Card, useToast } from '@/components/ui'
import { useTerminatedAttempts, grantExamResume } from '@/services/faculty-students'
import { useQueryClient } from '@tanstack/react-query'

function formatTime(seconds) {
  if (!seconds || seconds <= 0) return '0m'
  const m = Math.floor(seconds / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m`
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function TerminatedExamsTab() {
  const { data, isLoading, isError, refetch } = useTerminatedAttempts()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [granting, setGranting] = useState(null)

  const items = data?.items ?? []
  const pending = items.filter((a) => !a.resumeGranted)
  const granted = items.filter((a) => a.resumeGranted)

  const handleGrantResume = async (attemptId, studentName) => {
    setGranting(attemptId)
    try {
      const result = await grantExamResume(attemptId)
      toast.success(
        'Resume granted',
        `${result.studentName || studentName} can now resume their exam. ${formatTime(result.remainingSeconds)} remaining.`
      )
      queryClient.invalidateQueries({ queryKey: ['faculty', 'terminated-attempts'] })
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to grant resume'
      toast.error('Resume failed', msg)
    } finally {
      setGranting(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <XCircle className="h-8 w-8 text-rose-400" />
        <p className="text-sm text-slate-500">Failed to load terminated attempts.</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </Card>
    )
  }

  if (!items.length) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        <p className="text-[15px] font-bold text-slate-900 dark:text-white">No terminated exams</p>
        <p className="text-[12px] text-slate-400">All your students have completed their exams normally. No auto-submitted or disconnected attempts found.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* ---------- Header stats ---------- */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-slate-900 dark:text-white">{pending.length}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Awaiting Resume</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
            <PlayCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-slate-900 dark:text-white">{granted.length}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resume Granted</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-slate-900 dark:text-white">{items.length}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Terminated</p>
          </div>
        </Card>
      </div>

      {/* ---------- Pending resumes ---------- */}
      {pending.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-slate-900 dark:text-white">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Awaiting Resume Decision ({pending.length})
          </h3>
          <div className="space-y-3">
            <AnimatePresence>
              {pending.map((a) => (
                <motion.div key={a.attemptId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <Card className="border-amber-200/60 bg-gradient-to-r from-amber-50/40 to-white p-4 dark:border-amber-500/20 dark:from-amber-500/5 dark:to-slate-900/50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-[10px] font-bold text-white shadow">
                            {a.studentName?.split(' ').map((w) => w[0]).slice(0, 2).join('') || '?'}
                          </span>
                          <div>
                            <p className="text-[13px] font-bold text-slate-900 dark:text-white">{a.studentName}</p>
                            <p className="text-[10px] font-medium text-slate-400">Roll: {a.rollNo} · {a.examMode?.toUpperCase()}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-[12px] font-semibold text-slate-700 dark:text-slate-200">{a.examName}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Badge variant="danger" size="sm">
                            <XCircle className="mr-0.5 h-3 w-3" /> {a.terminationReason || 'Auto-submitted'}
                          </Badge>
                          <Badge variant="secondary" size="sm">
                            <Clock className="mr-0.5 h-3 w-3" /> {formatDate(a.terminatedAt)}
                          </Badge>
                          <Badge variant="secondary" size="sm">
                            <Timer className="mr-0.5 h-3 w-3" /> {formatTime(a.elapsedSeconds)} used · {formatTime(a.remainingSeconds)} left
                          </Badge>
                          <Badge variant="secondary" size="sm">
                            {a.answeredQuestions}/{a.totalQuestions} answered
                          </Badge>
                          {a.proctorViolations > 0 && (
                            <Badge variant="warning" size="sm">
                              <Shield className="mr-0.5 h-3 w-3" /> {a.proctorViolations} violations
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={granting === a.attemptId}
                        onClick={() => handleGrantResume(a.attemptId, a.studentName)}
                        className="shrink-0"
                      >
                        {granting === a.attemptId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <PlayCircle className="h-3.5 w-3.5" />
                        )}
                        Grant Resume
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ---------- Already granted ---------- */}
      {granted.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-slate-900 dark:text-white">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Resume Granted ({granted.length})
          </h3>
          <div className="space-y-2">
            {granted.map((a) => (
              <Card key={a.attemptId} className="border-emerald-200/50 bg-gradient-to-r from-emerald-50/30 to-white p-3.5 dark:border-emerald-500/20 dark:from-emerald-500/5 dark:to-slate-900/50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                      {a.studentName?.split(' ').map((w) => w[0]).slice(0, 2).join('') || '?'}
                    </span>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{a.studentName}</p>
                      <p className="text-[10px] text-slate-400">{a.examName} · resumed {formatDate(a.resumeGrantedAt)}</p>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="mr-0.5 h-3 w-3" /> Granted
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export { TerminatedExamsTab }
export default TerminatedExamsTab
