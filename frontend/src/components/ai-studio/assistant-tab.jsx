/**
 * MediXO EduX — AI Teaching Studio · Tab 1: AI Teaching Assistant.
 * Enhanced chat — the assistant knows courses, weak chapters, weak
 * students, upcoming classes & assessments and live health scores.
 * 12 contextual prompts · save & pin conversations (prototype).
 */

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, BookOpenCheck, BrainCircuit, ClipboardCheck, FileText, Pin, PinOff, Save, Sparkles } from 'lucide-react'
import { useAIAssistantRespond, useAIAssistantThreads } from '@/services'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { ChatMessage, TypingDots } from '@/components/shared/chat-message'
import { Badge, Button, Card, useToast } from '@/components/ui'
import { useChatAssistant } from '@/hooks/use-chat-assistant'

/* Frontend-only persistence: new exchanges survive full reloads via
   localStorage (the deterministic dataset itself resets with the page). */
const HISTORY_KEY = 'EduX_faculty_assistant_history'
const loadHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function AssistantTab({ data }) {
  const { data: threadsData, isLoading, isError, refetch } = useAIAssistantThreads()
  const { mutateAsync: ask } = useAIAssistantRespond()
  const ctx = data.derived.aiStudio?.assistantContext ?? {}
  const prompts = data.derived.aiStudio?.prompts ?? []
  const [threads, setThreads] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [pinned, setPinned] = useState(['ta2'])
  const scrollRef = useRef(null)
  const toast = useToast()

  /* New exchanges from previous sessions (persisted across reloads). */
  const [extraHistory, setExtraHistory] = useState([])
  useEffect(() => {
    setExtraHistory(loadHistory())
  }, [])

  const persistExchange = (userMsg, aiMsg) => {
    const next = [...extraHistory, userMsg, aiMsg].slice(-40)
    setExtraHistory(next)
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    } catch { /* storage unavailable — keep in-memory only */ }
  }

  const chat = useChatAssistant({
    ask,
    fallbackReply: () => 'Here’s my take: based on your teaching health and current backlog, start with the highest-priority item — clear the grading queue, then prep tomorrow’s lecture. Want me to draft either?',
    onAssistantMessage: persistExchange,
  })
  const { messages, setMessages, input, setInput, loading, send } = chat

  useEffect(() => {
    if (!threadsData) return
    setThreads(threadsData.threads)
    if (!activeId && threadsData.threads.length > 0) {
      setActiveId(threadsData.threads[0].id)
      setMessages([...(threadsData.threads[0].messages ?? []), ...extraHistory])
    }
  }, [threadsData])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const selectThread = (id) => {
    setActiveId(id)
    const base = threads.find((t) => t.id === id)?.messages ?? []
    setMessages(id === threads[0]?.id ? [...base, ...extraHistory] : base)
  }

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const sorted = [...threads].sort((a, b) => Number(pinned.includes(b.id)) - Number(pinned.includes(a.id)))
  const threadIcon = (id) => (id === 'ta1' ? <BookOpenCheck className="h-4 w-4" /> : id === 'ta2' ? <ClipboardCheck className="h-4 w-4" /> : <FileText className="h-4 w-4" />)

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Context sidebar */}
      <aside className="space-y-4 lg:col-span-1">
        <Card className="p-5">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            <BrainCircuit className="h-3.5 w-3.5" /> What the assistant knows
          </p>
          <div className="mt-3 space-y-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Current courses</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(ctx.courses ?? []).map((c) => (
                  <Badge key={c.code} variant="secondary" size="sm">{c.code} · {c.progress}%</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Weak chapters</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(ctx.weakChapters ?? []).map((w) => <Badge key={w} variant="warning" size="sm">{w}</Badge>)}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Weak students</p>
              <p className="mt-1 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">{(ctx.weakStudents ?? []).join(', ') || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Health</p>
              <div className="mt-1 grid grid-cols-3 gap-1.5 text-center">
                {[['Teaching', ctx.health?.teaching], ['Engagement', ctx.health?.engagement], ['Assessment', ctx.health?.assessment]].map(([label, v]) => (
                  <div key={label} className="rounded-xl bg-slate-50 py-1.5 dark:bg-slate-800/50">
                    <p className="text-[12px] font-bold text-slate-800 dark:text-white">{v}</p>
                    <p className="text-[8.5px] font-semibold uppercase text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Assistant sessions</p>
          <div className="mt-3 space-y-1.5">
            {sorted.map((t) => (
              <button
                key={t.id}
                onClick={() => selectThread(t.id)}
                className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all ${activeId === t.id ? 'bg-gradient-to-r from-indigo-600/10 to-blue-600/5 text-indigo-700 ring-1 ring-indigo-500/20 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${activeId === t.id ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  {threadIcon(t.id)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold">{t.title}</span>
                  <span className="block text-[10px] text-slate-400">{t.updated}</span>
                </span>
                {pinned.includes(t.id) && <Pin className="h-3 w-3 shrink-0 text-amber-500" />}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPinned((p) => (p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id]))
                    toast.success(pinned.includes(t.id) ? 'Unpinned' : 'Conversation pinned 📌', `${t.title} ${pinned.includes(t.id) ? 'removed from' : 'added to'} pinned sessions.`)
                  }}
                  className="shrink-0 text-slate-300 hover:text-amber-500 dark:text-slate-600"
                >
                  {pinned.includes(t.id) ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Contextual prompts</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {prompts.map((p) => (
              <button
                key={p.id}
                onClick={() => send(`${p.prompt}${p.hint ? ` (${p.hint})` : ''}`)}
                title={p.hint ? `e.g. ${p.hint}` : p.label}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-bold text-slate-500 transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
              >
                {p.label}
              </button>
            ))}
          </div>
        </Card>
      </aside>

      {/* Chat */}
      <Card className="flex min-w-0 flex-col overflow-hidden p-0 lg:col-span-2">
        <div className="flex items-center gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-800">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/25">
            <Sparkles className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse-soft rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Teaching Assistant</p>
            <p className="text-[11px] text-slate-400">Knows your {ctx.courses?.length ?? 0} courses, weak chapters & live health scores</p>
          </div>
          <Badge variant="gradient">Pro tools</Badge>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto scrollbar-thin px-5 py-5" style={{ maxHeight: '52vh', minHeight: 380 }}>
          {messages.map((m) => <ChatMessage key={m.id} message={m} senderName="Dr. Krishnan" />)}
          {loading && <TypingDots />}
        </div>

        <div className="border-t border-slate-200/70 p-4 dark:border-slate-800">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {['Explain this concept (max-flow min-cut)', 'Prepare tomorrow\'s lecture', 'Generate 20 MCQs', 'Create revision plan'].map((q) => (
              <button key={q} onClick={() => send(q)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 pl-4 shadow-sm transition-all focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950/60">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
              rows={1}
              placeholder="Ask your assistant…"
              className="max-h-28 flex-1 resize-none bg-transparent py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/30 transition-all hover:brightness-110 disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">The assistant has saved you 11.4 hours this term.</p>
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => toast.success('Conversation saved 💾', 'This session was added to your teaching history.')}>
              <Save className="h-3 w-3" /> Save conversation
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

export { AssistantTab }
export default AssistantTab
