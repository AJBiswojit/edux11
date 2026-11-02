/**
 * Executive AI — conversation history + saved insights panels.
 * localStorage persistence (frontend prototype). Conversation list reads the
 * shared chat history; saved insights have their own store.
 */

import { useState } from 'react'
import { MessageSquare, Save, Trash2 } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import {  } from '@/utils/format'

const INSIGHTS_KEY = 'EduX_admin_ai_insights'

function HistoryPanel({ history, onOpenConversation, onClear }) {
  const [confirmClear, setConfirmClear] = useState(false)

  /* group by day from history timestamps */
  const grouped = (history ?? []).reduce((acc, m) => {
    if (m.role !== 'user') return acc
    const day = new Date(m.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    acc[day] = acc[day] ?? []
    acc[day].push(m)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <MessageSquare className="h-3.5 w-3.5" /> Conversations
          </p>
          {history.length > 0 && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-rose-500" onClick={() => { if (confirmClear) { onClear(); setConfirmClear(false) } else setConfirmClear(true) }}>
              <Trash2 className="h-3 w-3" /> {confirmClear ? 'Confirm?' : 'Clear'}
            </Button>
          )}
        </div>
        <div className="mt-3 space-y-3">
          {Object.entries(grouped).slice(0, 5).map(([day, msgs]) => (
            <div key={day}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{day}</p>
              <div className="space-y-1">
                {msgs.slice(-3).map((m) => (
                  <button key={m.id} onClick={() => onOpenConversation(m)} className="flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold text-slate-700 dark:text-slate-200">{m.text}</span>
                      <span className="text-[10px] text-slate-400">{new Date(m.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {history.length === 0 && <p className="py-4 text-center text-[11.5px] text-slate-400">No conversations yet — ask your first question.</p>}
        </div>
      </Card>
    </div>
  )
}

function SavedInsightsPanel({ insights, onOpen, onDelete, onNavigate }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
        <Save className="h-3.5 w-3.5" /> Saved insights
      </p>
      <div className="mt-3 space-y-2">
        {insights.length === 0 && <p className="py-4 text-center text-[11.5px] text-slate-400">Save an AI insight from a response to pin it here.</p>}
        {insights.map((ins) => (
          <div key={ins.id} className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{ins.title}</p>
              <Badge variant={ins.priority === 'Critical' ? 'danger' : ins.priority === 'High' ? 'warning' : 'secondary'} size="sm">{ins.priority ?? 'Info'}</Badge>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{ins.insight}</p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[9.5px] font-medium text-slate-400">{ins.date} · {ins.source}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => onOpen(ins)}>Open</Button>
                {ins.nav && <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-indigo-600 dark:text-indigo-300" onClick={() => onNavigate(ins.nav)}>Source</Button>}
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-rose-500" onClick={() => onDelete(ins.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function SaveInsightDialog({ insight, onSave, onClose }) {
  const [title, setTitle] = useState(insight?.title ?? 'AI insight')
  const [priority, setPriority] = useState(insight?.priority ?? 'Info')
  if (!insight) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lift dark:border-slate-700 dark:bg-slate-900">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white"><Save className="h-4 w-4 text-indigo-500" /> Save AI insight</h3>
        <p className="mt-1 text-[12px] text-slate-400">{insight.summary}</p>
        <label className="mt-4 block text-xs font-semibold text-slate-500">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100" />
        <label className="mt-3 block text-xs font-semibold text-slate-500">Priority</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
          <option>Critical</option><option>High</option><option>Medium</option><option>Info</option>
        </select>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ title, priority, insight: insight.summary, source: 'Executive AI', date: new Date().toLocaleDateString('en-IN'), nav: insight.nav?.to })}>Save insight</Button>
        </div>
      </div>
    </div>
  )
}

export { HistoryPanel, SavedInsightsPanel, SaveInsightDialog, INSIGHTS_KEY }
export default HistoryPanel
