import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUp, Bot, FileText, Lightbulb, Link2, PenLine, Sparkles, Wand2 } from 'lucide-react'
import { useAITutorRespond, useGraphSearch } from '@/services'
import { useMasterStudentProfile } from '@/services/intelligence'
import { ChatMessage, TypingDots } from '@/components/shared/chat-message'
import { Card, Badge, useToast } from '@/components/ui'
import { useDebounce } from '@/hooks/use-debounce'

const TOOLS = [
  { id: 'write', label: 'Write', icon: PenLine, desc: 'Essays, reports, emails — drafted with your voice' },
  { id: 'research', label: 'Research', icon: Link2, desc: 'GraphRAG search across every course resource' },
  { id: 'explain', label: 'Explain', icon: Lightbulb, desc: 'Any concept, at any level, with examples' },
  { id: 'summarize', label: 'Summarize', icon: FileText, desc: 'Long material → clear, structured notes' },
]

/**
 * GraphRAG research panel — semantic search across lectures, books, papers
 * and exams. Reused by the AI Copilot workspace and the MediXO Mentor
 * Research tab. Never duplicate this markup.
 */
export function GraphSearchPanel({ initialQuery = '', fullWidth = false }) {
  const [searchQ, setSearchQ] = useState(initialQuery)
  const debouncedQ = useDebounce(searchQ, 500)
  const { data: searchData, isFetching: searching } = useGraphSearch(debouncedQ)

  return (
    <Card className={`flex min-w-0 flex-col overflow-hidden p-0 ${fullWidth ? 'h-[620px]' : ''}`}>
      <div className="border-b border-slate-200/70 px-5 py-4 dark:border-slate-800">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Wand2 className="h-4 w-4 text-indigo-500" /> GraphRAG Research
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">Semantic search across lectures, books, papers & exams</p>
        <input
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Search your knowledge graph…"
          className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100"
        />
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto scrollbar-thin p-4">
        {searching && <p className="py-6 text-center text-xs text-slate-400">Searching knowledge graph…</p>}
        {!searching && searchQ.length > 2 && (searchData?.results ?? []).map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-slate-100 p-3.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-800 dark:hover:border-indigo-500/25"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-bold leading-snug text-slate-800 dark:text-slate-100">{r.title}</p>
              <Badge variant="success" size="sm">{r.relevance}%</Badge>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">{r.snippet}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="secondary" size="sm">{r.source}</Badge>
              {r.citations.map((c) => <Badge key={c} variant="outline" size="sm">{c}</Badge>)}
            </div>
          </motion.div>
        ))}
        {!searching && searchQ.length <= 2 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 ring-1 ring-indigo-500/20">
              <Link2 className="h-6 w-6 text-indigo-500" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">Search your knowledge graph</p>
            <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-slate-400">
              Search a topic from your courses — every result comes with citations when sources exist.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200/70 p-4 dark:border-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Research tip</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Ask MediXO Mentor to “write a summary with citations” and it will ground every claim in your graph results.
        </p>
      </div>
    </Card>
  )
}

function AICopilot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [tool, setTool] = useState('explain')
  const { mutateAsync: ask } = useAITutorRespond()
  const { data: profile } = useMasterStudentProfile()
  const scrollRef = useRef(null)
  const toast = useToast()

  useEffect(() => {
    setMessages([
      {
        id: 'intro',
        role: 'assistant',
        text: 'Copilot workspace ready — writing, research, summarising and planning from your live records.'
      },
    ])
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const trimmed = text?.trim()
    if (!trimmed || loading) return
    setMessages((m) => [...m, { id: `u_${Date.now()}`, role: 'user', text: trimmed, time: new Date().toISOString() }])
    setInput('')
    setLoading(true)
    try {
      const { reply } = await ask({ text: `[Copilot · ${tool}] ${trimmed}`, threadId: 'copilot-workspace' })
      setMessages((m) => [...m, { id: `a_${Date.now()}`, role: 'assistant', text: reply, time: new Date().toISOString() }])
    } catch {
      toast.error('Copilot unavailable', 'Could not reach MediXO Mentor. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid h-[calc(100vh-7rem)] min-h-[560px] gap-5 lg:grid-cols-[1fr_340px]">
      {/* Main chat */}
      <Card className="flex min-w-0 flex-col overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-800">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 text-white shadow-lg shadow-indigo-500/25">
            <Bot className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse-soft rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">MediXO Mentor — {TOOLS.find((t) => t.id === tool)?.label}</p>
            <p className="text-[11px] text-slate-400">Full workspace · context: your courses, portfolio & career data</p>
          </div>
          <Badge variant="gradient"><Sparkles className="h-3 w-3" /> v4.0</Badge>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto scrollbar-thin px-4 py-6 sm:px-6">
          {messages.map((m) => <ChatMessage key={m.id} message={m} senderName={profile?.firstName || 'You'} />)}
          {loading && <TypingDots />}
        </div>

        <div className="border-t border-slate-200/70 p-4 dark:border-slate-800">
          {/* tool chips */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all duration-200 ${
                  tool === t.id
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                }`}
              >
                <t.icon className="h-3 w-3" /> {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 pl-4 shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
              rows={1}
              placeholder={`Use ${TOOLS.find((t) => t.id === tool)?.label} mode…`}
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
        </div>
      </Card>

      {/* Side panel — GraphRAG research (shared component) */}
      <GraphSearchPanel />
    </div>
  )
}

export { AICopilot }
export default AICopilot
