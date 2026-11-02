/**
 * Admin — Exam Oversight
 * Institution-wide view of all terminated/stopped exam attempts.
 * Admin can grant resume (keep answers) or restart from scratch.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, Clock, Loader2,
  PlayCircle, RefreshCw, RotateCcw, Shield, Timer, XCircle,
} from 'lucide-react'
import { Badge, Button, Card, useToast } from '@/components/ui'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import {
  useAdminTerminatedAttempts,
  useAdminGrantResume,
  useAdminRestartExam,
} from '@/services/extra'

/* ── helpers ── */
function fmt(seconds) {
  if (!seconds || seconds <= 0) return '0m'
  const m = Math.floor(seconds / 60)
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
}

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function Avatar({ name }) {
  const initials = (name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-[10px] font-bold text-white shadow">
      {initials}
    </span>
  )
}

/* ── attempt card ── */
function AttemptCard({ a }) {
  const toast = useToast()
  const grantMutation = useAdminGrantResume()
  const restartMutation = useAdminRestartExam()

  const busy = grantMutation.isPending || restartMutation.isPending

  async function handleResume() {
    try {
      const res = await grantMutation.mutateAsync(a.attemptId)
      toast.success('Resume granted', `${res.studentName || a.studentName} can continue. ${fmt(res.remainingSeconds)} remaining.`)
    } catch (err) {
      toast.error('Resume failed', err?.response?.data?.detail || err?.message || 'Unexpected error')
    }
  }

  async function handleRestart() {
    try {
      const res = await restartMutation.mutateAsync(a.attemptId)
      toast.success('Restart authorised', res.message || `${a.studentName} can now start the exam from scratch.`)
    } catch (err) {
      toast.error('Restart failed', err?.response?.data?.detail || err?.message || 'Unexpected error')
    }
  }

  /* already actioned */
  if (a.resumeGranted) {
    return (
      <Card className="border-emerald-200/50 bg-gradient-to-r from-emerald-50/30 to-white p-3.5 dark:border-emerald-500/20 dark:from-emerald-500/5 dark:to-slate-900/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={a.studentName} />
            <div>
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{a.studentName}</p>
              <p className="text-[10px] text-slate-400">
                Roll: {a.rollNo} · {a.examName} · resumed {fmtDate(a.resumeGrantedAt)}
              </p>
            </div>
          </div>
          <Badge variant="success" size="sm">
            <CheckCircle2 className="mr-0.5 h-3 w-3" /> Resume granted
          </Badge>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-amber-200/60 bg-gradient-to-r from-amber-50/40 to-white p-4 dark:border-amber-500/20 dark:from-amber-500/5 dark:to-slate-900/50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Avatar name={a.studentName} />
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
              <Clock className="mr-0.5 h-3 w-3" /> {fmtDate(a.terminatedAt)}
            </Badge>
            <Badge variant="secondary" size="sm">
              <Timer className="mr-0.5 h-3 w-3" /> {fmt(a.elapsedSeconds)} used · {fmt(a.remainingSeconds)} left
            </Badge>
            <Badge variant="secondary" size="sm">
              {a.answeredQuestions}/{a.totalQuestions} answered
            </Badge>
            {a.proctorViolations > 0 && (
              <Badge variant="warning" size="sm">
                <Shield className="mr-0.5 h-3 w-3" /> {a.proctorViolations} violation{a.proctorViolations !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {/* Resume — keep all previous answers */}
          <Button
            size="sm"
            disabled={busy || (a.remainingSeconds ?? 0) <= 0}
            onClick={handleResume}
            title="Student continues from where they stopped"
          >
            {grantMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" />
            )}
            Resume
          </Button>

          {/* Restart — wipe old attempt, fresh start */}
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={handleRestart}
            title="Student starts the exam completely from scratch"
          >
            {restartMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Restart
          </Button>
        </div>
      </div>
    </Card>
  )
}

/* ── page ── */
function AdminExams() {
  const { data, isLoading, isError, refetch } = useAdminTerminatedAttempts()
  const [search, setSearch] = useState('')

  const all = data?.items ?? []
  const filtered = search.trim()
    ? all.filter((a) =>
        (a.studentName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (a.examName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (a.rollNo ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : all

  const pending = filtered.filter((a) => !a.resumeGranted)
  const actioned = filtered.filter((a) => a.resumeGranted)

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        title="Exam Oversight"
        description="Terminated or interrupted exam attempts. Grant resume to keep previous answers, or authorise a full restart."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Exam Oversight' }]}
        actions={
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      {/* Stats */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-slate-900 dark:text-white">{all.filter((a) => !a.resumeGranted).length}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Awaiting Action</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
            <PlayCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-slate-900 dark:text-white">{all.filter((a) => a.resumeGranted).length}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resume Granted</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[22px] font-bold text-slate-900 dark:text-white">{all.length}</p>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Terminated</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="mt-5">
        <input
          type="text"
          placeholder="Search by student name, roll, or exam…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:max-w-sm"
        />
      </div>

      {all.length === 0 ? (
        <Card className="mt-5 flex flex-col items-center gap-3 p-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p className="text-[15px] font-bold text-slate-900 dark:text-white">No terminated exams</p>
          <p className="text-[12px] text-slate-400">All students have completed their exams normally.</p>
        </Card>
      ) : (
        <div className="mt-5 space-y-6">
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-slate-900 dark:text-white">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Awaiting Decision ({pending.length})
              </h3>
              <div className="space-y-3">
                <AnimatePresence>
                  {pending.map((a) => (
                    <motion.div
                      key={a.attemptId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <AttemptCard a={a} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Actioned */}
          {actioned.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-slate-900 dark:text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Already Actioned ({actioned.length})
              </h3>
              <div className="space-y-2">
                {actioned.map((a) => <AttemptCard key={a.attemptId} a={a} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { AdminExams }
export default AdminExams
