/**
 * AI Workspace — Study Resources tab.
 * AI Resource Intelligence: personalized recommendations driven by weak
 * subjects/chapters, upcoming exams, assignments and practice history.
 * Every recommendation shows reason · priority · estimated time · difficulty.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, CalendarClock, Download, FileText, FolderOpen, Lightbulb, Link2, ListChecks, PenLine, PlayCircle, StickyNote } from 'lucide-react'
import { Badge, Button, Card, useToast } from '@/components/ui'

const TYPE_ICONS = {
  'Recorded Lecture': PlayCircle, Notes: StickyNote, 'Question Bank': ListChecks, PDF: FileText,
  YouTube: Link2, 'Reference Material': BookOpen, Book: BookOpen, 'Previous Year Questions': FolderOpen,
  Assignment: PenLine, 'Practice Questions': ListChecks,
}
const PRIORITY_BADGE = { Critical: 'danger', High: 'warning', Medium: 'info', Low: 'secondary' }
const DIFF_STYLE = { Easy: 'success', Medium: 'warning', Hard: 'danger' }

function ResourcesTab({ datasets, workspace, derived }) {
  const toast = useToast()
  const [type, setType] = useState('All')
  const [subject, setSubject] = useState('All')

  const resources = workspace.resourceRecommendations ?? []
  const types = ['All', ...new Set(resources.map((r) => r.type))]
  const subjects = ['All', ...new Set(resources.map((r) => r.subject).filter(Boolean))]
  const visible = resources.filter((r) => (type === 'All' || r.type === type) && (subject === 'All' || r.subject === subject))

  /* personalization drivers */
  const drivers = [
    { icon: Lightbulb, label: 'Weak concepts', value: derived.academicDna?.weakConcepts?.length ?? 0 },
    { icon: CalendarClock, label: 'Exams soon', value: derived.examIntelligence?.length ?? 0 },
    { icon: PenLine, label: 'Assignments pending', value: (datasets.assignments ?? []).filter((a) => a.status === 'Pending').length },
    { icon: ListChecks, label: 'Practice history', value: datasets.practiceSessions?.length ?? 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Personalization drivers */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {drivers.map((d) => (
          <div key={d.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
              <d.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="font-display text-lg font-bold text-slate-900 dark:text-white">{d.value}</p>
              <p className="text-[10.5px] font-medium text-slate-400">AI considered · {d.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => (
            <button key={t} onClick={() => setType(t)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${type === t ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:text-slate-400'}`}>{t}</button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {subjects.map((s) => (
            <button key={s} onClick={() => setSubject(s)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${subject === s ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/25' : 'border border-slate-200 text-slate-500 hover:border-teal-300 dark:border-slate-700 dark:text-slate-400'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Recommendation cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((r, i) => {
          const Icon = TYPE_ICONS[r.type] ?? BookOpen
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="group flex h-full flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex gap-1.5">
                    <Badge variant={PRIORITY_BADGE[r.priority] ?? 'secondary'} size="sm">{r.priority}</Badge>
                    <Badge variant={DIFF_STYLE[r.difficulty] ?? 'secondary'} size="sm">{r.difficulty}</Badge>
                  </div>
                </div>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-indigo-500">{r.type} · {r.subject}</p>
                <h3 className="mt-0.5 text-[13.5px] font-bold leading-snug text-slate-800 dark:text-slate-100">{r.title}</h3>
                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400">{r.provider}</p>
                <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-amber-50/70 px-3 py-2 dark:bg-amber-500/5">
                  <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                  <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">{r.reason}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400"><PlayCircle className="mr-1 inline h-3 w-3" /> {r.estimatedTime}</span>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 px-2.5 text-[11px]" onClick={() => toast.success('Opened', `${r.title} — continuing where you left off.`)}>Open</Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-[11px]" onClick={() => toast.success('Downloading…', `${r.title} saved.`)}><Download className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export { ResourcesTab }
export default ResourcesTab
