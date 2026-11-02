import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUp, BrainCircuit, Clock, History, Lightbulb, MessageSquareText, Plus, Sparkles } from 'lucide-react'
import { useAITutorRespond, useAITutorThreads, useAIStats } from '@/services'
import { useMasterStudentProfile } from '@/services/intelligence'
import { ChatMessage, TypingDots } from '@/components/shared/chat-message'
import { DashboardSkeleton } from '@/components/shared/loading'
import { Button, Card, useToast } from '@/components/ui'
import { useInView } from '@/hooks/use-in-view'
import { useChatAssistant } from '@/hooks/use-chat-assistant'

const SUBJECT_COLORS = {
  DSA: '#6366f1',
  DBMS: '#14b8a6',
  Networks: '#f43f5e',
  ML: '#8b5cf6',
  OS: '#f59e0b',
  ToC: '#0ea5e9',
  General: '#64748b',
}

function AITutor({ embedded = false, promptSignal = null }) {
  const { data: threadsData, isLoading } = useAITutorThreads()
  const { mutateAsync: ask } = useAITutorRespond()
  const { data: statsData } = useAIStats()
  const { data: profile } = useMasterStudentProfile()
  const [threads, setThreads] = useState([])
  const [activeId, setActiveId] = useState(null)
  const scrollRef = useRef(null)
  const toast = useToast()
  const [ref, inView] = useInView()

  const chat = useChatAssistant({
    ask,
    getThreadId: () => activeId ?? 'new',
    onError: () => toast.error('Tutor unavailable', 'Could not reach MediXO Mentor. Try again.'),
  })
  const { messages, setMessages, input, setInput, loading, send } = chat

  useEffect(() => {
    if (!threadsData) return
    setThreads(threadsData.threads)
    if (!activeId && threadsData.threads.length > 0) {
      setActiveId(threadsData.threads[0].id)
      setMessages(threadsData.threads[0].messages)
    }
  }, [threadsData])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  /* External prompt injection — quick prompts / suggested questions from the
     AI Workspace Chat tab send a signal that gets sent as a user message. */
  useEffect(() => {
    if (promptSignal?.text) send(promptSignal.text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptSignal?.ts])

  const selectThread = (id) => {
    setActiveId(id)
    const t = threads.find((x) => x.id === id)
    setMessages(t?.messages ?? [])
  }

  const newChat = () => {
    setActiveId(null)
    chat.newChat()
    chat.setInput('')
  }

  const totalSessions = statsData?.totalSessions ?? 0

  if (isLoading) return <DashboardSkeleton cards={2} />

  return (
    <div className={`flex min-h-[520px] flex-col gap-5 lg:flex-row ${embedded ? 'h-[calc(100vh-16rem)]' : 'h-[calc(100vh-7rem)]'}`}>
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col rounded-3xl border border-slate-200/70 bg-white p-4 shadow-card lg:flex dark:border-slate-800 dark:bg-slate-900">
        <Button size="sm" className="mb-4 w-full" onClick={newChat}>
          <Plus className="h-4 w-4" /> New conversation
        </Button>

        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Conversations</p>
          <History className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
        </div>

        <div className="flex-1 space-y-1.5 overflow-y-auto scrollbar-thin pr-1">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => selectThread(t.id)}
              className={`group flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all duration-200 ${
                activeId === t.id
                  ? 'bg-gradient-to-r from-indigo-600/10 to-blue-600/5 text-indigo-700 ring-1 ring-indigo-500/20 dark:text-indigo-300'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SUBJECT_COLORS[t.subject] ?? SUBJECT_COLORS.General }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{t.title}</span>
                <span className="block text-[10px] text-slate-400">{t.updated}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-2xl bg-gradient-to-br from-indigo-600/10 to-teal-500/10 p-3.5 ring-1 ring-indigo-500/15">
          <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">This week with your tutor</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{threads.length}</p>
              <p className="text-[9px] font-medium text-slate-400">Sessions</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{statsData?.rating ?? '—'}</p>
              <p className="text-[9px] font-medium text-slate-400">Rating</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">{statsData?.hours ?? 0}h</p>
              <p className="text-[9px] font-medium text-slate-400">Time</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Chat area */}
      <Card className="flex min-w-0 flex-1 flex-col overflow-hidden p-0">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-800">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 text-white shadow-lg shadow-indigo-500/25">
            <BrainCircuit className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse-soft rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">MediXO Mentor</p>
            <p className="text-[11px] text-slate-400">Adaptive · remembers your weak areas · cites sources</p>
          </div>
          {embedded ? (
            <Link to="/student/mentor?tab=explain">
              <Button variant="outline" size="sm"><Lightbulb className="h-3.5 w-3.5" /> Explain concepts</Button>
            </Link>
          ) : (
            <Link to="/student/mentor?tab=chat">
              <Button variant="outline" size="sm"><Sparkles className="h-3.5 w-3.5" /> Mentor workspace</Button>
            </Link>
          )}
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto scrollbar-thin px-4 py-6 sm:px-6">
          {messages.length === 0 && !loading && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }} className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 text-white shadow-glow">
                <MessageSquareText className="h-7 w-7" />
              </motion.div>
              <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">What would you like to learn?</h2>
              <p className="mt-1 max-w-sm text-sm text-slate-400">Hi, I'm MediXO Mentor. How can I help you today? I explain like a tutor, quiz like a teacher, and adapt to your pace.</p>
              <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
                {['Explain this week\'s lecture', 'Quiz me on my weakest chapter', 'Compare two algorithms I am studying', 'Plan my revision from my upcoming exams'].map((q) => (
                  <button key={q} onClick={() => send(q)} className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-left text-[13px] font-semibold text-indigo-700 transition-all hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-500/20 dark:bg-indigo-500/5 dark:text-indigo-300 dark:hover:bg-indigo-500/10">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} senderName={profile?.firstName || 'You'} />
          ))}
          {loading && <TypingDots />}
        </div>

        {/* input */}
        <div className="border-t border-slate-200/70 p-4 dark:border-slate-800">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 pl-4 shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
              rows={1}
              placeholder="Ask your AI tutor anything…"
              className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/30 transition-all hover:brightness-110 disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {totalSessions} sessions so far — keep going!</span>
            <span>Tutor can make mistakes. Verify important answers.</span>
          </p>
        </div>
      </Card>
    </div>
  )
}

export { AITutor }
export default AITutor
