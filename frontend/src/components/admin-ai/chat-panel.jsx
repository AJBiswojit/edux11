/**
 * Executive AI — conversation panel.
 * Deterministic response engine with typing state, structured responses,
 * copy / save insight / regenerate, quick prompts and an honest
 * "Prototype Intelligence" label. localStorage conversation persistence.
 */

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUp, BrainCircuit, Check, ClipboardCopy, Copy, Save, Sparkles,
} from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { EXEC_QUICK_PROMPTS } from '@/intelligence/admin/ai'
import { useExecutiveAsk, useExecutiveThreads } from '@/services/extra'
import { cn } from '@/utils/cn'

const HISTORY_KEY = 'EduX_admin_ai_history'

function MetricChip({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800/50">
      <p className="truncate text-[13px] font-bold text-slate-800 dark:text-white" title={String(value)}>{value}</p>
      <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  )
}

function StructuredResponse({ msg, onSaveInsight }) {
  const r = msg.response
  return (
    <div className="mt-2 space-y-3">
      {r.keyMetrics?.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {r.keyMetrics.map((m) => <MetricChip key={m.label} label={m.label} value={m.value} />)}
        </div>
      )}
      {r.insights?.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-indigo-500">Key insights</p>
          <ul className="space-y-1">
            {r.insights.map((i) => <li key={i} className="flex items-start gap-1.5 text-[12px] text-slate-600 dark:text-slate-300"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />{i}</li>)}
          </ul>
        </div>
      )}
      {r.risks?.length > 0 && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3 dark:border-rose-500/20 dark:bg-rose-500/5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-rose-500">Risks</p>
          <ul className="space-y-0.5">
            {r.risks.map((x) => <li key={x} className="text-[12px] text-rose-700 dark:text-rose-300">· {x}</li>)}
          </ul>
        </div>
      )}
      {r.recommendations?.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Recommendations</p>
          <ul className="space-y-0.5">
            {r.recommendations.map((x) => <li key={x} className="text-[12px] text-emerald-700 dark:text-emerald-300">→ {x}</li>)}
          </ul>
        </div>
      )}
      {(r.actions ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {r.actions.map((a) => (
            <Button key={a.to + a.label} asChild size="sm" variant="outline" className="h-7 text-[11px]">
              <a href={a.to} onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.history.pushState({}, '', a.to); window.dispatchEvent(new PopStateEvent('popstate')) }}>{a.label}</a>
            </Button>
          ))}
          {r.nav && (
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
              <a href={r.nav.to} onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', r.nav.to); window.dispatchEvent(new PopStateEvent('popstate')) }}>{r.nav.label}</a>
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => onSaveInsight(r)}><Save className="h-3 w-3" /> Save insight</Button>
        <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => { navigator.clipboard?.writeText(r.summary).catch(() => {}); }}><Copy className="h-3 w-3" /> Copy</Button>
      </div>
    </div>
  )
}

function ChatPanel({ derived, onSaveInsight, onNavigate }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [threadId, setThreadId] = useState(null)
  const scrollRef = useRef(null)
  const ask = useExecutiveAsk()
  const { data: threadsData } = useExecutiveThreads()

  useEffect(() => {
    const threads = threadsData?.threads || threadsData?.history || []
    const latest = threads[0]
    if (!latest) return
    setThreadId(latest.id)
    setMessages((latest.messages || []).map((m) => ({
      id: m.id,
      role: m.role === 'assistant' ? 'ai' : m.role,
      text: m.text,
      time: m.createdAt || new Date().toISOString(),
    })))
  }, [threadsData])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const persist = (next) => {
    setMessages(next)
  }

  const respond = async (question) => {
    const q = question.trim()
    if (!q || typing) return
    const userMsg = { id: `u_${Date.now()}`, role: 'user', text: q, time: new Date().toISOString() }
    persist([...messages, userMsg])
    setInput('')
    setTyping(true)
    try {
      const res = await ask.mutateAsync({ message: q, conversationId: threadId })
      if (res.conversationId || res.threadId) setThreadId(res.conversationId || res.threadId)
      const aiMsg = {
        id: `a_${Date.now()}`,
        role: 'ai',
        text: res.reply || 'No reply.',
        time: new Date().toISOString(),
      }
      persist([...messages, userMsg, aiMsg])
    } catch {
      persist([...messages, userMsg, { id: `a_${Date.now()}`, role: 'ai', text: 'Executive AI could not answer. Try again.', time: new Date().toISOString() }])
    } finally {
      setTyping(false)
    }
  }

  const copyMessage = (msg) => {
    const text = msg.response ? `${msg.response.title}\n${msg.response.summary}` : msg.text
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopiedId(msg.id)
    setTimeout(() => setCopiedId(null), 1200)
  }

  return (
    <div className="flex h-full min-w-0 flex-col rounded-3xl border border-slate-200/70 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-800">
        <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-lg shadow-indigo-500/25">
          <BrainCircuit className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse-soft rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Executive AI</p>
          <p className="text-[11px] text-slate-400">Your intelligent institutional decision assistant</p>
        </div>
        <Badge variant="outline" size="sm" className="shrink-0"><Sparkles className="mr-1 h-3 w-3" /> Prototype Intelligence</Badge>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto scrollbar-thin px-5 py-5" style={{ maxHeight: '56vh', minHeight: 360 }}>
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 ring-1 ring-indigo-500/20">
              <BrainCircuit className="h-7 w-7 text-indigo-500" />
            </span>
            <p className="mt-3 text-[15px] font-bold text-slate-800 dark:text-slate-100">Ask about your institution</p>
            <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-slate-400">
              Institutional health, student risk, departments, faculty, assessments, outcomes and executive reporting — answered from live institution data.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[88%] rounded-2xl px-4 py-3', m.role === 'user' ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white' : 'border border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/40')}>
              <div className="flex items-center justify-between gap-3">
                <p className={cn('text-[13px] font-medium leading-relaxed', m.role === 'user' ? 'text-white' : 'text-slate-700 dark:text-slate-200')}>{m.text}</p>
                <button onClick={() => copyMessage(m)} aria-label="Copy message" className={cn('shrink-0', m.role === 'user' ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200')}>
                  {copiedId === m.id ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                </button>
              </div>
              {m.response && <StructuredResponse msg={m} onSaveInsight={onSaveInsight} />}
              <p className={cn('mt-1.5 text-[9.5px] font-medium', m.role === 'user' ? 'text-white/50' : 'text-slate-400')}>
                {new Date(m.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </motion.div>
        ))}

        {typing && (
          <div className="flex items-center gap-2 text-[12px] font-semibold text-indigo-600 dark:text-indigo-300">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10"><Sparkles className="h-3.5 w-3.5" /></span>
            Analyzing institutional data…
          </div>
        )}
      </div>

      {/* quick prompts */}
      <div className="border-t border-slate-200/70 p-3.5 dark:border-slate-800">
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {EXEC_QUICK_PROMPTS.map((p) => (
            <button key={p.id} onClick={() => respond(p.prompt)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 pl-4 shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); respond(input) } }}
            rows={1}
            placeholder="Ask about institutional performance, departments, risk…"
            className="max-h-28 flex-1 resize-none bg-transparent py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <button
            onClick={() => respond(input)}
            disabled={!input.trim() || typing}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-md shadow-indigo-500/30 transition-all hover:brightness-110 disabled:opacity-40"
            aria-label="Send question"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export { ChatPanel, HISTORY_KEY }
export default ChatPanel
