/**
 * AI Workspace — AI Chat tab.
 * Context-aware assistant: understands the student's Academic DNA, weak
 * subjects/chapters, upcoming exams, assignments, learning behaviour,
 * health and exam readiness. Supports pinned conversations, suggested
 * questions, quick prompts and recent topics — all from the foundation.
 */

import { useState } from 'react'
import { BookOpen, BrainCircuit, CalendarClock, FileText, GitCompare, Lightbulb, ListChecks, PenLine, Pin, Sparkles, StickyNote, Zap } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import { AITutor } from '@/pages/student/AITutor'

const PROMPT_ICONS = { Lightbulb, ListChecks: FileText, FileText, StickyNote, Zap, PenLine: FileText, BookOpen, GitCompare: FileText }

function ChatTab({ derived, datasets, workspace }) {
  const [signal, setSignal] = useState(null)
  const [pinned, setPinned] = useState(() => new Set((workspace.conversations ?? []).filter((c) => c.pinned).map((c) => c.id)))

  const h = derived.academicHealth
  const dna = derived.academicDna
  const weak = derived.weaknesses
  const upcoming = derived.examIntelligence ?? []
  const pending = (datasets.assignments ?? []).filter((a) => a.status === 'Pending' || a.status === 'Upcoming')

  const sendPrompt = (text) => setSignal({ text, ts: Date.now() })
  const togglePin = (id) => setPinned((p) => {
    const n = new Set(p)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  const conversations = workspace.conversations ?? []
  const pinnedConvs = conversations.filter((c) => pinned.has(c.id))
  const others = conversations.filter((c) => !pinned.has(c.id))
  const suggested = workspace.suggestedQuestions ?? []
  const prompts = workspace.quickPrompts ?? []
  const quickTopics = workspace.quickTopics ?? []

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr]">
      {/* ---------- Context & quick prompts sidebar ---------- */}
      <div className="min-w-0 space-y-4">
        {/* Context-aware card */}
        <Card className="overflow-hidden p-0">
          <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 px-4 py-3 text-white">
            <p className="flex items-center gap-1.5 text-[12px] font-bold"><BrainCircuit className="h-4 w-4" /> Context-aware AI</p>
            <p className="text-[10.5px] text-white/80">I already know your academic profile</p>
          </div>
          <div className="space-y-2.5 p-4">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Academic health</span>
              <Badge variant={h.score >= 85 ? 'success' : h.score >= 70 ? 'warning' : 'danger'} size="sm">{h.score} · {h.grade}</Badge>
            </div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Weak subjects</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {weak.slice(0, 3).map((w) => <Badge key={w.subjectCode} variant="danger" size="sm">{w.subject}</Badge>)}
              </div>
            </div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Weak concepts</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {dna.weakConcepts.slice(0, 3).map((c) => <Badge key={c} variant="warning" size="sm">{c.split(' — ')[1] ?? c}</Badge>)}
              </div>
            </div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Upcoming exams</p>
              <div className="mt-1 space-y-1">
                {upcoming.slice(0, 2).map((e) => (
                  <p key={e.examId} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <CalendarClock className="h-3 w-3 text-indigo-500" /> {e.title.slice(0, 30)}… · {e.daysLeft}d
                  </p>
                ))}
              </div>
            </div>
            {pending.length > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <span><FileText className="mr-1 inline h-3 w-3" /> {pending.length} assignment{pending.length > 1 ? 's' : ''} pending</span>
              </div>
            )}
            <Button size="sm" variant="outline" className="w-full text-[11px]" onClick={() => sendPrompt(`Plan my week: ${upcoming[0]?.title ?? 'my exams'} — include revision, assignments and practice.`)}>
              <Sparkles className="h-3 w-3" /> Ask AI to plan my week
            </Button>
          </div>
        </Card>

        {/* Quick prompts */}
        <Card className="p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Quick prompts</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {prompts.map((p) => {
              const Icon = PROMPT_ICONS[p.icon] ?? Lightbulb
              return (
                <button key={p.id} onClick={() => sendPrompt(p.label)} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300">
                  <Icon className="h-3 w-3" /> {p.label}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Pinned conversations */}
        <Card className="p-4">
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest text-slate-400"><Pin className="h-3 w-3 text-indigo-500" /> Pinned conversations</p>
          <div className="mt-2 space-y-1.5">
            {pinnedConvs.map((c) => (
              <button key={c.id} onClick={() => sendPrompt(`Resume our conversation about ${c.title}`)} className="flex w-full items-center gap-2 rounded-xl bg-indigo-50/60 px-2.5 py-2 text-left transition-all hover:bg-indigo-50 dark:bg-indigo-500/5 dark:hover:bg-indigo-500/10">
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{c.title}</span>
                <span className="text-[10px] font-medium text-slate-400">{c.messages} msgs</span>
              </button>
            ))}
            {pinnedConvs.length === 0 && <p className="text-[11px] text-slate-400">Pin conversations from the chat sidebar to keep them here.</p>}
          </div>
          {others.length > 0 && (
            <>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent topics</p>
              <div className="mt-1.5 space-y-1">
                {others.slice(0, 3).map((c) => (
                  <button key={c.id} onClick={() => sendPrompt(`Continue our chat about ${c.title}`)} className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-[11.5px] text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-800/50 dark:hover:text-slate-200">
                    <span className="truncate">{c.title}</span>
                    <Pin onClick={(e) => { e.stopPropagation(); togglePin(c.id) }} className="ml-2 h-3 w-3 shrink-0 cursor-pointer text-slate-300 hover:text-indigo-500" />
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Recently asked topics */}
        <Card className="p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Recently asked</p>
          <div className="mt-2 space-y-1.5">
            {quickTopics.slice(0, 4).map((q) => (
              <button key={q.id} onClick={() => sendPrompt(q.title)} className="block w-full truncate rounded-xl px-2.5 py-2 text-left text-[11.5px] font-semibold text-slate-600 transition-colors hover:bg-indigo-50/60 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300">
                {q.title}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* ---------- Chat ---------- */}
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {suggested.map((s) => (
            <button key={s.id} onClick={() => sendPrompt(s.text)} className="rounded-full border border-indigo-100 bg-indigo-50/50 px-3 py-1.5 text-left text-[11px] font-semibold text-indigo-700 transition-all hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/5 dark:text-indigo-300 dark:hover:bg-indigo-500/10">
              <Lightbulb className="mr-1 inline h-3 w-3" />{s.text}
            </button>
          ))}
        </div>
        <AITutor embedded promptSignal={signal} />
      </div>
    </div>
  )
}

export { ChatTab }
export default ChatTab
