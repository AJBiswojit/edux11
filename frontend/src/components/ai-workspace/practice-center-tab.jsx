/**
 * AI Workspace — Practice Center.
 * Generate practice questions, chapter tests, subject tests, quick quizzes
 * and flash revision questions. Shows difficulty, question count, estimated
 * time and topic coverage; opens sets in the shared QuizRunner.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Layers, ListChecks, PlayCircle, Sparkles, Timer, Wand2, Zap } from 'lucide-react'
import { Badge, Button, Card, Select, SelectItem, useToast } from '@/components/ui'
import { QuizRunner } from './quiz-runner'

const GENERATORS = [
  { id: 'practice', label: 'Practice Questions', desc: 'Topic-wise drill set tuned to your weak areas', icon: ListChecks, grad: 'from-indigo-500 to-blue-500' },
  { id: 'chapter', label: 'Chapter Test', desc: 'Full test for one chapter with blueprint coverage', icon: Layers, grad: 'from-teal-500 to-emerald-500' },
  { id: 'subject', label: 'Subject Test', desc: 'Subject-wide test across all chapters', icon: Wand2, grad: 'from-amber-500 to-orange-500' },
  { id: 'quiz', label: 'Quick Quiz', desc: '5–10 rapid questions for a quick check', icon: Timer, grad: 'from-violet-500 to-purple-500' },
  { id: 'flash', label: 'Flash Revision', desc: 'Rapid-fire recall questions for revision', icon: Zap, grad: 'from-rose-500 to-pink-500' },
]

const SUBJECTS = ['Data Structures & Algorithms', 'Operating Systems', 'Machine Learning', 'Computer Networks', 'Database Management Systems', 'Theory of Computation', 'Mathematics', 'Physics', 'Chemistry']
const DIFFS = ['Easy', 'Medium', 'Hard', 'Mixed']

function PracticeCenterTab({ workspace }) {
  const toast = useToast()
  const [gen, setGen] = useState(GENERATORS[0])
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [difficulty, setDifficulty] = useState('Medium')
  const [count, setCount] = useState('5')
  const [session, setSession] = useState(null)
  const [busy, setBusy] = useState(false)

  const quizBank = workspace.quizBank ?? []
  const practiceSets = workspace.practiceSets ?? []

  const generate = () => {
    setBusy(true)
    setTimeout(() => {
      /* deterministic mock set built from the shared quiz bank */
      const pool = quizBank.length ? quizBank : []
      const n = Number(count)
      const questions = pool.slice(0, n).map((q) => ({ ...q }))
      const coverage = subject.split(' ')[0]
      setSession({
        title: `${gen.label} — ${subject}`,
        meta: `${n} questions · ${difficulty} · ~${Math.round(n * 1.2)} min · topics: ${coverage} + weak areas`,
        questions,
        stats: { difficulty, count: n, time: Math.round(n * 1.2), coverage: `${coverage}, weak concepts` },
      })
      setBusy(false)
      toast.success(`${gen.label} generated ✨`, `${n} questions on ${subject}.`)
    }, 700)
  }

  return (
    <div className="space-y-6">
      {/* Generator type cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {GENERATORS.map((g) => (
          <button
            key={g.id}
            onClick={() => setGen(g)}
            className={`rounded-3xl border p-4 text-left transition-all duration-200 ${gen.id === g.id ? 'border-indigo-300 bg-indigo-50/50 ring-2 ring-indigo-500/20 dark:border-indigo-500/40 dark:bg-indigo-500/10' : 'border-slate-200/70 bg-white hover:-translate-y-0.5 hover:shadow-card dark:border-slate-800 dark:bg-slate-900'}`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${g.grad} text-white shadow-md`}>
              <g.icon className="h-4 w-4" />
            </span>
            <p className="mt-2.5 text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{g.label}</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-400">{g.desc}</p>
          </button>
        ))}
      </div>

      {/* Config panel */}
      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-500">Subject</p>
            <Select value={subject} onValueChange={setSubject}>
              {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-500">Difficulty</p>
            <Select value={difficulty} onValueChange={setDifficulty}>
              {DIFFS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-500">Question count</p>
            <Select value={count} onValueChange={setCount}>
              <SelectItem value="5">5 questions</SelectItem>
              <SelectItem value="10">10 questions</SelectItem>
              <SelectItem value="15">15 questions</SelectItem>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={generate} disabled={busy}>
              {busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate {gen.label}</>}
            </Button>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-indigo-50/60 px-3.5 py-2.5 text-[11.5px] font-semibold text-indigo-700 dark:bg-indigo-500/5 dark:text-indigo-300">
          <Sparkles className="h-3.5 w-3.5 shrink-0" /> AI tunes the mix to your weak concepts in {subject.split(' ')[0]} — expected ~{Math.round(Number(count) * 1.2)} min.
        </div>
      </Card>

      {/* Ready sets */}
      <div>
        <p className="mb-3 text-[13px] font-bold text-slate-900 dark:text-white">Ready practice sets</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {practiceSets.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{s.subject}</p>
                    <h3 className="mt-0.5 text-[15px] font-bold text-slate-900 dark:text-white">{s.topic}</h3>
                  </div>
                  <Badge variant={s.status === 'Mastered' ? 'success' : s.status === 'In progress' ? 'info' : 'warning'} size="sm">{s.status}</Badge>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-400">
                  <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {s.count} questions</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> ~{Math.round(s.count * 1.2)} min</span>
                  <Badge variant={s.difficulty === 'Easy' ? 'success' : s.difficulty === 'Medium' ? 'warning' : 'danger'} size="sm">{s.difficulty}</Badge>
                  {s.accuracy != null && <span className="rounded-full bg-slate-50 px-2 py-0.5 dark:bg-slate-800/60">Last {s.accuracy}%</span>}
                </div>
                <div className="mt-auto pt-4">
                  <Button size="sm" className="w-full" onClick={() => setSession({ title: `${s.subject} · ${s.topic}`, meta: `${s.count} questions · ${s.difficulty}`, questions: s.questions ?? [], stats: { difficulty: s.difficulty, count: s.count, time: Math.round(s.count * 1.2), coverage: s.topic } })}>
                    <PlayCircle className="h-3.5 w-3.5" /> Start practice
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <QuizRunner title={session?.title ?? ''} meta={session?.meta ?? ''} questions={session?.questions ?? []} open={!!session} onOpenChange={(v) => !v && setSession(null)} />
    </div>
  )
}

export { PracticeCenterTab }
export default PracticeCenterTab
