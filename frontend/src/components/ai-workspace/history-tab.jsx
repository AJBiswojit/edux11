/**
 * AI Workspace — Learning History tab.
 * Previous AI chats · generated notes · practice sessions · revision
 * history · downloads · completed recommendations · recent activities —
 * presented as a timeline.
 */

import { motion } from 'framer-motion'
import { Award, BookOpen, CheckCircle2, Download, FileText, History, MessageSquareText, Sparkles, Timer } from 'lucide-react'
import { Card, useToast } from '@/components/ui'
import { formatDate } from '@/utils/format'

function HistoryTab({ workspace, derived }) {
  const toast = useToast()

  const conversations = workspace.conversations ?? []
  const practice = workspace.practiceSets ?? workspace.learningHistory ?? []
  const revisionPlans = workspace.revisionPlans ?? []
  const downloads = workspace.downloads ?? []
  const completed = workspace.completedRecommendations ?? []
  const recent = derived.recentActivities ?? []

  /* build a unified timeline */
  const events = []
  recent.forEach((r) => events.push({ id: `act_${r.id}`, date: r.date, type: 'activity', icon: Sparkles, title: r.title, detail: r.detail }))
  conversations.filter((c) => c.status === 'Active').forEach((c) => events.push({ id: `conv_${c.id}`, date: c.updated, type: 'chat', icon: MessageSquareText, title: `AI chat — ${c.title}`, detail: `${c.messages} messages · ${c.pinned ? 'pinned' : 'recent'}` }))
  practice.forEach((p) => events.push({ id: `prac_${p.id ?? p.topic}`, date: p.date ?? p.attemptDate, type: 'practice', icon: Timer, title: `Practice — ${p.topic ?? p.title ?? p.subject}`, detail: p.outcome ? `${p.outcome}${p.score != null ? ` · ${p.score}%` : ''}` : p.status ?? '' }))
  revisionPlans.forEach((rp) => events.push({ id: `rev_${rp.examId}`, date: rp.examDate, type: 'revision', icon: BookOpen, title: `Revision plan — ${rp.examTitle}`, detail: `${rp.sessions.length} sessions · ${rp.overall}% plan health` }))
  completed.forEach((c) => events.push({ id: `done_${c.id}`, date: c.completedOn, type: 'done', icon: CheckCircle2, title: `Completed — ${c.title}`, detail: c.outcome }))
  downloads.forEach((d) => events.push({ id: `dl_${d.id}`, date: d.date, type: 'download', icon: Download, title: `Downloaded — ${d.title}`, detail: `${d.type} · ${d.size}` }))

  const sorted = events
    .filter((e) => e.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 18)

  const counts = {
    chats: conversations.filter((c) => c.status === 'Active').length,
    notes: workspace.generatedNotes?.length ?? 0,
    practice: practice.length,
    downloads: downloads.length,
    completed: completed.length,
  }

  return (
    <div className="space-y-6">
      {/* summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { label: 'AI chats', value: counts.chats, icon: MessageSquareText, grad: 'from-indigo-500 to-blue-500' },
          { label: 'Generated notes', value: counts.notes, icon: FileText, grad: 'from-teal-500 to-emerald-500' },
          { label: 'Practice sessions', value: counts.practice, icon: Timer, grad: 'from-amber-500 to-orange-500' },
          { label: 'Downloads', value: counts.downloads, icon: Download, grad: 'from-violet-500 to-purple-500' },
          { label: 'Completed recommendations', value: counts.completed, icon: Award, grad: 'from-rose-500 to-pink-500' },
        ].map((s) => (
          <div key={s.label} className={`rounded-3xl bg-gradient-to-br ${s.grad} p-4 text-white shadow-lg`}>
            <s.icon className="h-4 w-4 opacity-80" />
            <p className="mt-1.5 font-display text-xl font-bold">{s.value}</p>
            <p className="text-[10px] font-medium text-white/75">{s.label}</p>
          </div>
        ))}
      </div>

      {/* timeline */}
      <Card className="p-6">
        <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
          <History className="h-4 w-4 text-indigo-500" /> Learning timeline
        </p>
        <p className="mt-0.5 text-xs text-slate-400">Every interaction across chats, notes, practice, revision, downloads and completions.</p>

        <ol className="relative ml-2 mt-6 space-y-4 border-l-2 border-slate-100 pl-6 dark:border-slate-800">
          {sorted.map((e, i) => (
            <motion.li key={e.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative">
              <span className={`absolute -left-[31px] top-1 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 ${e.type === 'done' ? 'bg-emerald-500' : e.type === 'chat' ? 'bg-indigo-500' : e.type === 'practice' ? 'bg-amber-500' : e.type === 'download' ? 'bg-violet-500' : e.type === 'revision' ? 'bg-teal-500' : 'bg-slate-400'}`}>
                <e.icon className="h-3 w-3 text-white" />
              </span>
              <div className="rounded-2xl border border-slate-100 p-3.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{e.title}</p>
                  <span className="text-[10.5px] font-medium text-slate-400">{formatDate(e.date, 'MMM d, yyyy')}</span>
                </div>
                {e.detail && <p className="mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">{e.detail}</p>}
              </div>
            </motion.li>
          ))}
        </ol>

        {/* revision history (plans) */}
        {revisionPlans.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Revision history</p>
            <div className="flex flex-wrap gap-2">
              {revisionPlans.map((rp) => (
                <button key={rp.examId} onClick={() => toast.info('Revision plan', `${rp.examTitle} — ${rp.overall}% ready · ${rp.sessions.length} sessions.`)} className="flex items-center gap-2 rounded-2xl border border-slate-100 px-3.5 py-2.5 text-left transition-colors hover:border-indigo-200 dark:border-slate-800 dark:hover:border-indigo-500/30">
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                  <div>
                    <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{rp.examTitle}</p>
                    <p className="text-[10px] text-slate-400">{rp.overall}% plan health · {rp.sessions.length} sessions</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-4 ring-1 ring-indigo-500/15">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            <span className="font-bold text-indigo-600 dark:text-indigo-300">MediXO Mentor:</span> your most consistent learning window is 6–9 PM. Two more practice sessions this week would beat last week's cadence.
          </p>
        </div>
      </Card>
    </div>
  )
}

export { HistoryTab }
export default HistoryTab
