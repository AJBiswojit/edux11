/**
 * AI Exam Conducting Agent — Home (exam selection + attempt history).
 * Lists the 9 practice papers (3 university · 3 JEE · 3 NEET), offers
 * Start Exam (manual) and Demo Monitoring per paper, and surfaces the
 * recent attempt history persisted via the API layer.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, BrainCircuit, Building2, ClipboardCheck, Clock, FileQuestion, ListChecks, Play, PlayCircle, ShieldCheck, Timer, UserRound,
} from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import { formatDate, formatRelative } from '@/utils/format'
import { EXAM_AGENT_GROUP_LABELS } from '@/datasets/exams/exam-agent.js'
import { ExamTypeBadge, AgentChip } from './exam-agent-shared'

const TYPE_ORDER = ['University', 'JEE', 'NEET']

function ExamCard({ exam, index, onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="h-full"
    >
      <Card className="flex h-full flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold leading-snug text-slate-900 dark:text-white">{exam.title}</p>
            {exam.subjectCode ? (
              <p className="mt-0.5 text-[11.5px] font-medium text-slate-400">{exam.subjectCode} · {exam.subject}</p>
            ) : (
              <p className="mt-0.5 text-[11.5px] font-medium text-slate-400">{exam.subject}</p>
            )}
            {exam.faculty && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <UserRound className="h-3 w-3" />{exam.faculty}
              </p>
            )}
          </div>
          <ExamTypeBadge type={exam.type} />
        </div>

        <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{exam.description}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="secondary" size="sm"><Clock className="h-3 w-3" /> {exam.durationMinutes} min</Badge>
          <Badge variant="secondary" size="sm"><FileQuestion className="h-3 w-3" /> {exam.questions.length} questions</Badge>
          <Badge variant="secondary" size="sm"><ClipboardCheck className="h-3 w-3" /> +{exam.marksPerQuestion}
            {exam.negativeMarksPerQuestion > 0 ? ` / −${exam.negativeMarksPerQuestion}` : ' · no negative'}
          </Badge>
        </div>

        <div className="mt-4 flex flex-col gap-2 pt-1 sm:flex-row">
          <Button size="sm" className="flex-1" disabled={exam.attempted} onClick={() => onStart(exam, 'manual')}>
            {exam.attempted
              ? (<><ClipboardCheck className="h-3.5 w-3.5" /> Completed</>)
              : exam.resumable
              ? (<><PlayCircle className="h-3.5 w-3.5" /> Resume Exam</>)
              : (<><Play className="h-3.5 w-3.5" /> Start exam</>)}
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

const FILTERS = ['All', 'Pending', 'Resumable', 'Submitted']

function ExamAgentHome({ exams, onStart }) {
  const [filter, setFilter] = useState('All')

  const filteredExams = (exams ?? []).filter((e) => {
    if (filter === 'Pending') return !e.attempted && !e.resumable
    if (filter === 'Resumable') return e.resumable
    if (filter === 'Submitted') return e.attempted
    return true
  })

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    ...EXAM_AGENT_GROUP_LABELS[type],
    items: filteredExams.filter((e) => e.type === type),
  })).filter((g) => g.items.length > 0)

  const counts = {
    All: (exams ?? []).length,
    Pending: (exams ?? []).filter((e) => !e.attempted && !e.resumable).length,
    Resumable: (exams ?? []).filter((e) => e.resumable).length,
    Submitted: (exams ?? []).filter((e) => e.attempted).length,
  }

  return (
    <div>
      {/* Intro banner */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 p-6 text-white shadow-xl shadow-indigo-600/20 sm:p-8"
      >
        <div className="bg-grid mask-fade-y pointer-events-none absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <AgentChip pulse={false} label="AI Exam Conducting Agent" />
            <Badge className="bg-white/15 text-white ring-white/25"><ShieldCheck className="h-3 w-3" /> Interaction-only analysis</Badge>
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">Practice exams with real-time question intelligence</h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-white/80">
            Take a university, JEE Main or NEET UG practice paper and let the agent track every interaction —
            timing, answer changes, revisits and skips — then receive a full subject &amp; chapter analysis with
            strengths, weaknesses and recommendations. No camera, microphone or device monitoring — this agent
            analyses only how you answer.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11.5px] font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20"><Timer className="h-3 w-3" /> Live timer &amp; pace</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20"><Activity className="h-3 w-3" /> Real-time tracking</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20"><BrainCircuit className="h-3 w-3" /> Question intelligence</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20"><ListChecks className="h-3 w-3" /> AI performance report</span>
          </div>
        </div>
      </motion.div>

      {/* Filter tabs — All / Pending / Resumable / Submitted */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              filter === f
                ? f === 'Resumable'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                : f === 'Resumable' && counts.Resumable > 0
                ? 'border border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 dark:border-amber-600/50 dark:bg-amber-500/10 dark:text-amber-300'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
            }`}
          >
            {f} {counts[f] > 0 && <span className="opacity-70">({counts[f]})</span>}
          </button>
        ))}
      </div>

      {/* Exam groups */}
      {grouped.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            {filter === 'Pending' ? 'No pending papers' : filter === 'Resumable' ? 'No resumable exams' : filter === 'Submitted' ? 'No submitted papers' : 'No papers available'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {filter === 'Pending' ? 'You have completed all available papers.' : filter === 'Resumable' ? 'No exams have been unlocked for resume by your admin.' : filter === 'Submitted' ? 'You have not submitted any papers yet.' : 'No published papers for your institution yet.'}
          </p>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.type} className="mt-8">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{group.label}</h3>
                <p className="text-xs font-medium text-slate-400">{group.sub}</p>
              </div>
              <Badge variant="secondary" size="sm">{group.items.length} paper{group.items.length === 1 ? '' : 's'}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((exam, i) => (
                <ExamCard key={exam.id} exam={exam} index={i} onStart={onStart} />
              ))}
            </div>
          </div>
        ))
      )}


    </div>
  )
}

export { ExamAgentHome }
export default ExamAgentHome

