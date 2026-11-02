import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Database, Plus, Wand2 } from 'lucide-react'
import { useAdminQuestionBank } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Select, SelectItem, useToast } from '@/components/ui'

const DIFF_STYLES = { Easy: 'success', Medium: 'warning', Hard: 'danger' }

function QuestionBank() {
  const { data, isLoading, isError, refetch } = useAdminQuestionBank()
  const [difficulty, setDifficulty] = useState('All')
  const [status, setStatus] = useState('All')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const toast = useToast()

  const questions = useMemo(() => (data?.questions ?? []).filter((q) => {
    const matchesD = difficulty === 'All' || q.difficulty === difficulty
    const matchesS = status === 'All' || q.status === status
    const matchesQ = !query || q.code.toLowerCase().includes(query.toLowerCase()) || q.topic.toLowerCase().includes(query.toLowerCase()) || q.subject.toLowerCase().includes(query.toLowerCase())
    return matchesD && matchesS && matchesQ
  }), [data, difficulty, status, query])

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const s = data?.summary ?? { total: 0, aiGenerated: 0, approved: 0, flagged: 0, byType: {} }

  return (
    <div>
      <PageHeader
        eyebrow="Management · Question Bank"
        title="Institution question bank"
        description={`${s.total.toLocaleString()} questions across all subjects — ${s.aiGenerated.toLocaleString()} AI-generated, ${s.flagged} flagged.`}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Question Bank' }]}
        actions={
          <Button size="sm" onClick={() => toast.info('Unavailable', 'Add questions from the faculty question bank — this catalogue is read-only.')}>
            <Plus className="h-4 w-4" /> Add question
          </Button>
        }
      />

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: 'Total questions', value: s.total.toLocaleString(), color: '#6366f1' },
          { label: 'AI-generated', value: s.aiGenerated.toLocaleString(), color: '#14b8a6' },
          { label: 'Approved', value: s.approved.toLocaleString(), color: '#10b981' },
          { label: 'Flagged', value: String(s.flagged), color: '#ef4444' },
          { label: 'MCQ share', value: s.total > 0 && s.byType?.MCQ ? `${Math.round((s.byType.MCQ / s.total) * 100)}%` : '—', color: '#f59e0b' },
        ].map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <p className="font-display text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[11px] font-medium text-slate-400">{k.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        {['All', 'Easy', 'Medium', 'Hard'].map((d) => (
          <button key={d} onClick={() => setDifficulty(d)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${difficulty === d ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
            {d}
          </button>
        ))}
        <Select value={status} onValueChange={setStatus} className="w-36">
          <SelectItem value="All">All statuses</SelectItem>
          <SelectItem value="Approved">Approved</SelectItem>
          <SelectItem value="Flagged">Flagged</SelectItem>
          <SelectItem value="Review">In review</SelectItem>
        </Select>
        <div className="relative ml-auto">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by code / topic…" className="h-9 w-56 pl-3 text-xs" />
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                <Database className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" size="sm">{q.subject}</Badge>
                  <Badge variant="outline" size="sm">{q.topic}</Badge>
                  <Badge variant={DIFF_STYLES[q.difficulty]} size="sm">{q.difficulty}</Badge>
                  <Badge variant="secondary" size="sm">{q.type}</Badge>
                </div>
                <p className="mt-1.5 font-mono text-[12px] font-semibold text-slate-600 dark:text-slate-300">{q.code}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Used {q.usage}× · last used {q.lastUsed}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {q.status === 'Flagged' ? (
                  <Badge variant="danger"><AlertCircle className="h-3 w-3" /> Flagged</Badge>
                ) : q.status === 'Review' ? (
                  <Badge variant="warning">In review</Badge>
                ) : (
                  <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>
                )}
                <Button size="sm" variant="outline" onClick={() => toast.success('Question opened', `${q.code} — edit and re-validate.`)}>View</Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-indigo-500" /> Add question</DialogTitle>
            <DialogDescription>Manually entered or AI-drafted — always validated before approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Subject">
                <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                  <option>CS501</option><option>CS502</option><option>CS503</option><option>CS505</option>
                </select>
              </Field>
              <Field label="Type">
                <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                  <option>MCQ</option><option>Subjective</option><option>Numerical</option><option>Case</option>
                </select>
              </Field>
            </div>
            <Field label="Topic" required><Input placeholder="e.g. Graph algorithms" /></Field>
            <Field label="Question text" required>
              <textarea rows={3} placeholder="Type the question…" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { setOpen(false); toast.info('Unavailable', 'Admin question create is not implemented — use the faculty question bank.') }}>
              <Plus className="h-4 w-4" /> Submit question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


export { QuestionBank }
export default QuestionBank
