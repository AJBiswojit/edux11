/**
 * Teaching Intelligence Workspace — Tab 6: Students Requiring Attention.
 * AI-flagged students grouped into intervention categories with reason,
 * priority, suggested action, expected improvement and actions:
 * view student · send message (prototype) · assign remedial work (prototype).
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpenCheck, HeartHandshake, Mail, Send, Sparkles, Users } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Select, SelectItem, Textarea, useToast } from '@/components/ui'
import { PRIORITY_VARIANT } from '@/constants/ui'
import { WorkspaceSection } from './shared'

const CATEGORY_COLORS = {
  'Low Attendance': { badge: 'warning', dot: '#f59e0b' },
  'Weak Performance': { badge: 'danger', dot: '#ef4444' },
  'Pending Assignments': { badge: 'info', dot: '#3b82f6' },
  'Low Engagement': { badge: 'secondary', dot: '#94a3b8' },
  'Poor Quiz Results': { badge: 'danger', dot: '#e11d48' },
  'Academic Decline': { badge: 'warning', dot: '#f97316' },
}

function AttentionTab({ data }) {
  const at = data.derived.attentionStudents ?? {}
  const [filter, setFilter] = useState('All')
  const [messaging, setMessaging] = useState(null)
  const [remedial, setRemedial] = useState(null)
  const [workType, setWorkType] = useState('practice-set')
  const toast = useToast()

  const items = filter === 'All' ? (at.items ?? []) : (at.byCategory?.[filter] ?? [])
  const categories = ['All', ...(at.summary ?? []).map((s) => s.category)]

  const sendMessage = (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    toast.success('Message sent ✉️', `Personalised message to ${messaging.name} (${messaging.roll}) queued — delivery via SMS + email (prototype).`)
    setMessaging(null)
  }

  const assignWork = (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    toast.success('Remedial work assigned', `${workType} assigned to ${remedial.name} with a ${remedial.estimatedImprovement} target (prototype).`)
    setRemedial(null)
  }

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Requiring attention" value={String(at.total ?? 0)} sub="active + monitoring" icon="Users" gradient="from-rose-500 to-red-500" />
        <StatCard index={1} label="Critical priority" value={String(at.critical ?? 0)} sub="intervene today" icon="AlertTriangle" gradient="from-amber-500 to-orange-500" />
        <StatCard index={2} label="High priority" value={String(at.high ?? 0)} sub="intervene this week" icon="AlertTriangle" gradient="from-orange-500 to-amber-400" />
        <StatCard index={3} label="Average risk" value={`${at.avgRisk ?? '—'}%`} sub="AI model confidence ≥ 72%" icon="Gauge" gradient="from-indigo-500 to-blue-500" />
      </div>

      {/* Category summary */}
      <WorkspaceSection title="Intervention categories" subtitle="Students are auto-categorised by their dominant risk signal" icon={HeartHandshake}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {(at.summary ?? []).map((c) => (
            <button
              key={c.category}
              onClick={() => setFilter(c.category)}
              className={`rounded-2xl border p-4 text-left transition-all ${filter === c.category ? 'border-indigo-400 bg-indigo-50/70 shadow-md dark:border-indigo-500/40 dark:bg-indigo-500/10' : 'border-slate-100 bg-white hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30'}`}
            >
              <div className="flex items-center justify-between">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[c.category]?.dot ?? '#94a3b8' }} />
                <Badge variant={CATEGORY_COLORS[c.category]?.badge ?? 'secondary'} size="sm">{c.count}</Badge>
              </div>
              <p className="mt-2.5 text-[12px] font-bold leading-tight text-slate-800 dark:text-slate-100">{c.category}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">top risk {c.topRisk}%</p>
            </button>
          ))}
        </div>
      </WorkspaceSection>

      {/* Filter chips */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${filter === c ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}
          >
            {c}
            {c !== 'All' && <span className="ml-1.5 opacity-70">({at.byCategory?.[c]?.length ?? 0})</span>}
          </button>
        ))}
        <span className="ml-auto text-xs font-semibold text-slate-400">{items.length} students</span>
      </div>

      {/* Student cards */}
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((s, i) => {
          const colors = CATEGORY_COLORS[s.category] ?? { badge: 'secondary' }
          return (
            <Card key={s.id} className="flex flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 font-display text-sm font-bold text-white shadow-md">
                    {s.name.split(' ').map((x) => x[0]).join('')}
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-slate-900 dark:text-white">{s.name}</p>
                    <p className="text-[11px] text-slate-400">{s.roll} · {s.course}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-rose-500">{s.risk}%</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">risk</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant={colors.badge} size="sm">{s.category}</Badge>
                <Badge variant={PRIORITY_VARIANT[s.priority] ?? 'secondary'} size="sm">{s.priority} priority</Badge>
                <Badge variant="outline" size="sm">{s.confidence}% conf</Badge>
              </div>

              <div className="mt-3.5 rounded-2xl bg-slate-50 p-3 text-[11.5px] leading-relaxed text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <p className="font-bold text-slate-700 dark:text-slate-200">Reason</p>
                <p className="mt-1">{s.reason}</p>
              </div>

              <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-500/20 dark:bg-indigo-500/[0.07]">
                <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                  <Sparkles className="h-3 w-3" /> Suggested action
                </p>
                <p className="mt-1 text-[12px] font-semibold text-slate-800 dark:text-slate-100">{s.suggestedAction}</p>
                <p className="mt-1 text-[10.5px] text-emerald-600 dark:text-emerald-400">
                  Expected improvement · <span className="font-bold">{s.estimatedImprovement}</span> ({s.improvementDetail})
                </p>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Button asChild size="sm" variant="outline">
                  <Link to="/faculty/my-students"><Users className="h-3.5 w-3.5" /> View student</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMessaging(s)}><Mail className="h-3.5 w-3.5" /> Message</Button>
                <Button size="sm" onClick={() => setRemedial(s)}><BookOpenCheck className="h-3.5 w-3.5" /> Remedial work</Button>
              </div>
            </Card>
          )
        })}
      </div>

      {items.length === 0 && (
        <Card className="mt-4 p-10 text-center">
          <HeartHandshake className="mx-auto h-8 w-8 text-emerald-400" />
          <p className="mt-3 text-sm font-bold text-slate-800 dark:text-white">No students in this category 🎉</p>
          <p className="mt-1 text-xs text-slate-400">Interventions are working — keep it up.</p>
        </Card>
      )}

      {/* Message dialog */}
      <Dialog open={!!messaging} onOpenChange={(o) => !o && setMessaging(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message — {messaging?.name}</DialogTitle>
            <DialogDescription>{messaging?.roll} · {messaging?.course} · risk {messaging?.risk}% · {messaging?.category}</DialogDescription>
          </DialogHeader>
          <form onSubmit={sendMessage} className="space-y-4">
            <Field label="Message">
              <Textarea
                name="message"
                rows={4}
                defaultValue={`Hi ${messaging?.name?.split(' ')[0]}, I noticed ${messaging?.reason?.toLowerCase()}. Let's catch up briefly — I'd like to help you get back on track. — Dr. Krishnan`}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setMessaging(null)}>Cancel</Button>
              <Button type="submit"><Send className="h-4 w-4" /> Send message</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remedial work dialog */}
      <Dialog open={!!remedial} onOpenChange={(o) => !o && setRemedial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign remedial work — {remedial?.name}</DialogTitle>
            <DialogDescription>Choose a targeted intervention. Estimated improvement: {remedial?.estimatedImprovement}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={assignWork} className="space-y-4">
            <Field label="Remedial work type">
              <Select value={workType} onValueChange={setWorkType}>
                <SelectItem value="practice-set">Targeted practice set (auto-graded)</SelectItem>
                <SelectItem value="revision-class">Join revision class + quiz retake</SelectItem>
                <SelectItem value="peer-mentoring">Peer mentoring pair (top performer)</SelectItem>
                <SelectItem value="concept-clinic">Concept clinic session (1:1)</SelectItem>
              </Select>
            </Field>
            <Field label="Note">
              <Textarea name="note" rows={3} placeholder="Optional instructions…" defaultValue={`Focus areas: ${remedial?.reason ?? ''}`} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRemedial(null)}>Cancel</Button>
              <Button type="submit"><ArrowRight className="h-4 w-4" /> Assign work</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { AttentionTab }
export default AttentionTab
