/**
 * AI Workspace — Notes & Summaries tab.
 * Generate notes, short notes, revision notes, mind maps, formula sheets,
 * key points, chapter summaries and concept explanations — shown in
 * premium cards.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, FileText, GitBranch, Lightbulb, ListChecks, PlayCircle, StickyNote, Wand2, Zap } from 'lucide-react'
import { Badge, Button, Card, Select, SelectItem, useToast } from '@/components/ui'

const NOTE_TYPES = [
  { id: 'notes', label: 'Generate Notes', desc: 'Comprehensive study notes', icon: StickyNote, grad: 'from-indigo-500 to-blue-500' },
  { id: 'short', label: 'Generate Short Notes', desc: 'Condensed one-pagers', icon: Zap, grad: 'from-teal-500 to-emerald-500' },
  { id: 'revision', label: 'Revision Notes', desc: 'Exam-focused revision cards', icon: BookOpen, grad: 'from-amber-500 to-orange-500' },
  { id: 'mindmap', label: 'Mind Map (Prototype)', desc: 'Visual concept map', icon: GitBranch, grad: 'from-violet-500 to-purple-500' },
  { id: 'formula', label: 'Formula Sheet', desc: 'Key formulas & results', icon: FileText, grad: 'from-rose-500 to-pink-500' },
  { id: 'keypoints', label: 'Key Points', desc: 'Bullet-point takeaways', icon: ListChecks, grad: 'from-sky-500 to-blue-500' },
  { id: 'summary', label: 'Summarize Chapter', desc: 'Chapter condensed to a page', icon: FileText, grad: 'from-emerald-500 to-green-500' },
  { id: 'explain', label: 'Explain Concept', desc: 'Simple explanation with examples', icon: Lightbulb, grad: 'from-fuchsia-500 to-purple-500' },
]

const SUBJECTS = ['Data Structures & Algorithms', 'Operating Systems', 'Machine Learning', 'Computer Networks', 'Database Management Systems', 'Theory of Computation', 'Mathematics', 'Physics', 'Chemistry']

const MIND_MAP_EXAMPLE = { center: 'Coordination Compounds', branches: ['Werner Theory', 'VBT', 'CFT', 'Spectrochemical Series', 'Isomerism', 'Applications'] }

function NotesTab({ workspace }) {
  const toast = useToast()
  const [noteType, setNoteType] = useState(NOTE_TYPES[0])
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [topic, setTopic] = useState('')
  const [generated, setGenerated] = useState([])
  const [busy, setBusy] = useState(false)

  const existing = workspace.notes ?? []
  const concepts = workspace.concepts ?? []

  const generate = () => {
    setBusy(true)
    setTimeout(() => {
      const t = topic.trim() || 'Key concepts'
      const card = {
        id: `gen_${Date.now()}`,
        subject,
        type: noteType.label,
        title: `${t} — ${noteType.label.toLowerCase()}`,
        excerpt: `AI-generated ${noteType.label.toLowerCase()} for ${subject}. Focused on ${t} with worked examples and quick-revision cues.`,
        length: noteType.id === 'short' || noteType.id === 'keypoints' ? '1 page' : noteType.id === 'mindmap' ? 'visual map' : '2–3 pages',
        updated: new Date().toISOString().slice(0, 10),
        color: '#6366f1',
      }
      setGenerated((g) => [card, ...g])
      setBusy(false)
      toast.success(`${noteType.label} generated ✨`, `${t} — added to your notes.`)
    }, 800)
  }

  return (
    <div className="space-y-6">
      {/* Note type cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {NOTE_TYPES.map((n) => (
          <button key={n.id} onClick={() => setNoteType(n)} className={`rounded-3xl border p-4 text-left transition-all duration-200 ${noteType.id === n.id ? 'border-indigo-300 bg-indigo-50/50 ring-2 ring-indigo-500/20 dark:border-indigo-500/40 dark:bg-indigo-500/10' : 'border-slate-200/70 bg-white hover:-translate-y-0.5 hover:shadow-card dark:border-slate-800 dark:bg-slate-900'}`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${n.grad} text-white shadow-md`}>
              <n.icon className="h-4 w-4" />
            </span>
            <p className="mt-2 text-[12px] font-bold text-slate-800 dark:text-slate-100">{n.label}</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{n.desc}</p>
          </button>
        ))}
      </div>

      {/* Config */}
      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-500">Subject</p>
            <Select value={subject} onValueChange={setSubject}>
              {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-500">Topic / chapter</p>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. TCP congestion control" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100" />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={generate} disabled={busy}>
              {busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Drafting…</> : <><Wand2 className="h-4 w-4" /> {noteType.label}</>}
            </Button>
          </div>
        </div>
      </Card>

      {/* Mind map preview when selected */}
      {noteType.id === 'mindmap' && (
        <Card className="p-6">
          <p className="mb-4 text-[13px] font-bold text-slate-900 dark:text-white">Mind map preview (prototype)</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg">{MIND_MAP_EXAMPLE.center}</span>
            <span className="text-slate-300">— connects to —</span>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {MIND_MAP_EXAMPLE.branches.map((b) => (
                <span key={b} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[11.5px] font-semibold text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">{b}</span>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Generated + existing notes */}
      <div>
        <p className="mb-3 text-[13px] font-bold text-slate-900 dark:text-white">Your notes ({generated.length + existing.length})</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...generated, ...existing].map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
              <Card className="flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: `linear-gradient(135deg, ${n.color ?? '#6366f1'}, ${n.color ?? '#6366f1'}aa)` }}>
                    {n.type?.includes('Mind') ? <GitBranch className="h-5 w-5" /> : <StickyNote className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{n.subject} · {n.type}</p>
                    <h3 className="mt-0.5 text-[13.5px] font-bold leading-snug text-slate-800 dark:text-slate-100">{n.title}</h3>
                  </div>
                </div>
                <p className="mt-2.5 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">{n.excerpt}</p>
                <div className="mt-auto flex items-center justify-between pt-3.5">
                  <span className="text-[10.5px] font-medium text-slate-400">{n.length} · {n.updated}</span>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 px-2.5 text-[11px]" onClick={() => toast.success('Opened', `${n.title} — continuing where you left off.`)}><BookOpen className="h-3 w-3" /> Open</Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-[11px]" onClick={() => toast.success('Exporting…', `${n.title} saved as PDF.`)}><FileText className="h-3 w-3" /></Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Explain difficult concepts */}
      <div>
        <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-slate-900 dark:text-white"><Lightbulb className="h-4 w-4 text-indigo-500" /> Explain difficult concepts</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {concepts.slice(0, 6).map((c) => (
            <button key={c.id} onClick={() => toast.info(c.title, c.summary)} className="group rounded-3xl border border-slate-100 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-card dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{c.subject}</p>
                <Badge variant={c.difficulty === 'Easy' ? 'success' : c.difficulty === 'Medium' ? 'warning' : 'danger'} size="sm">{c.difficulty}</Badge>
              </div>
              <h3 className="mt-1.5 text-[13.5px] font-bold leading-snug text-slate-800 dark:text-slate-100">{c.title}</h3>
              <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">{c.summary}</p>
              <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400"><PlayCircle className="h-3 w-3" /> Explain with examples</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export { NotesTab }
export default NotesTab
