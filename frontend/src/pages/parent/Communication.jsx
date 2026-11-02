import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarClock, MessageSquare, Phone, Send, Video } from 'lucide-react'
import { useParentCommunication } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Avatar, Badge, Button, Card, useToast } from '@/components/ui'

function Communication() {
  const { data, isLoading, isError, refetch } = useParentCommunication()
  const [activeId, setActiveId] = useState(null)
  const [input, setInput] = useState('')
  const toast = useToast()

  const teachers = data?.teachers ?? []
  const active = teachers.find((t) => t.id === activeId) ?? teachers[0]

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const send = () => {
    if (!input.trim()) return
    toast.success('Message sent ✓', `${active?.name} will reply within ${active?.responseTime}.`)
    setInput('')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Communication"
        title="Teacher communication"
        description="Message teachers, book meetings and read past conversations — one thread per teacher."
        breadcrumbs={[{ label: 'Parent' }, { label: 'Teacher Communication' }]}
        actions={<Badge variant="success" className="px-3 py-1"><span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-500" /> Teachers reply within a day</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Teacher list */}
        <div className="space-y-2.5">
          {teachers.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`flex w-full items-center gap-3.5 rounded-3xl border p-4 text-left transition-all duration-200 ${
                active?.id === t.id
                  ? 'border-indigo-300 bg-gradient-to-r from-indigo-50 to-blue-50 shadow-card dark:border-indigo-500/40 dark:from-indigo-500/10 dark:to-blue-500/5'
                  : 'border-slate-200/70 bg-white hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <Avatar name={t.name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-slate-800 dark:text-slate-100">{t.name}</p>
                <p className="truncate text-[11.5px] text-slate-400">{t.role}</p>
                <p className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Responds in {t.responseTime}</p>
              </div>
              {t.thread?.length > 0 && <Badge variant="secondary" size="sm">{t.thread.length}</Badge>}
            </button>
          ))}
        </div>

        {/* Thread */}
        <Card className="flex min-h-[420px] flex-col overflow-hidden p-0">
          <div className="flex items-center gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-slate-800">
            <Avatar name={active?.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{active?.name}</p>
              <p className="text-[11px] text-slate-400">{active?.role} · replies in {active?.responseTime}</p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => toast.info('Call request', `Requesting a call with ${active?.name}.`)} className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800" aria-label="Call">
                <Phone className="h-4 w-4" />
              </button>
              <button onClick={() => toast.info('Meeting request', 'Pick a slot from the available times below.')} className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800" aria-label="Video meeting">
                <Video className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto scrollbar-thin px-5 py-5">
            {active?.thread?.length > 0 ? (
              active.thread.map((m, i) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className={`flex gap-2.5 ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  {m.from !== 'me' && <Avatar name={active.name} size="sm" className="mt-1" />}
                  <div className={`max-w-[75%] rounded-3xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${m.from === 'me' ? 'rounded-br-lg bg-gradient-to-br from-emerald-600 to-teal-600 text-white' : 'rounded-bl-lg border border-slate-200/70 bg-slate-50 text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200'}`}>
                    {m.text}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <MessageSquare className="h-10 w-10 text-slate-200 dark:text-slate-700" />
                <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">No messages yet</p>
                <p className="mt-1 max-w-xs text-xs text-slate-400">Introduce yourself — teachers love hearing from engaged parents.</p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200/70 p-4 dark:border-slate-800">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 pl-4 shadow-sm transition-all focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950/60">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                rows={1}
                placeholder={`Message ${active?.name ?? 'teacher'}…`}
                className="max-h-28 flex-1 resize-none bg-transparent py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
              />
              <button onClick={send} disabled={!input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30 transition-all hover:brightness-110 disabled:opacity-40" aria-label="Send">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Meeting slots */}
      <h2 className="mb-4 mt-8 text-[15px] font-bold text-slate-900 dark:text-white">Available meeting slots</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {data.meetingSlots.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="flex h-full items-center justify-between gap-3 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                  <CalendarClock className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.teacher}</p>
                  <p className="text-[11px] text-slate-400">{s.slot}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => toast.success('Slot booked ✓', `${s.slot} — confirmation sent by email.`)}>Book</Button>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export { Communication }
export default Communication
