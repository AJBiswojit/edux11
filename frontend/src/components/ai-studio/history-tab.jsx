/**
 * MediXO EduX — AI Teaching Studio · Tab 6: Teaching History.
 * Premium timeline — lesson plans, papers, assignments, notes,
 * conversations, evaluations, downloads & published resources.
 */

import { useState } from 'react'
import { BookOpenCheck, ClipboardCheck, Download, FileCheck2, FileText, MessageSquare, RefreshCw, UploadCloud } from 'lucide-react'
import { Timeline } from '@/components/shared/timeline'
import { Badge, Card } from '@/components/ui'
import { formatDate } from '@/utils/format'
import { WorkspaceSection } from '@/components/teaching-workspace/shared'

const TYPE_META = {
  'lesson-plan': { Icon: BookOpenCheck, label: 'Lesson plan', cls: 'from-indigo-500 to-blue-500' },
  paper: { Icon: FileCheck2, label: 'Question paper', cls: 'from-sky-500 to-cyan-500' },
  assignment: { Icon: FileText, label: 'Assignment', cls: 'from-violet-500 to-purple-500' },
  notes: { Icon: FileText, label: 'Notes', cls: 'from-teal-500 to-emerald-500' },
  conversation: { Icon: MessageSquare, label: 'AI conversation', cls: 'from-fuchsia-500 to-pink-500' },
  evaluation: { Icon: ClipboardCheck, label: 'Evaluation', cls: 'from-amber-500 to-orange-500' },
  download: { Icon: Download, label: 'Download', cls: 'from-slate-500 to-slate-600' },
  resource: { Icon: UploadCloud, label: 'Published resource', cls: 'from-rose-500 to-red-500' },
  revision: { Icon: RefreshCw, label: 'Revision', cls: 'from-emerald-500 to-teal-500' },
  assessment: { Icon: FileCheck2, label: 'Assessment', cls: 'from-sky-500 to-cyan-500' },
}

function HistoryTab({ data }) {
  const history = data.derived.aiStudio?.history ?? []
  const [filter, setFilter] = useState('All')
  const types = ['All', ...new Set(history.map((h) => h.type))]
  const filtered = filter === 'All' ? history : history.filter((h) => h.type === filter)
  const counts = {}
  history.forEach((h) => { counts[h.type] = (counts[h.type] ?? 0) + 1 })

  return (
    <div>
      {/* Summary chips */}
      <WorkspaceSection title="Teaching history" subtitle="Everything you've generated, evaluated and published" icon={BookOpenCheck}>
        <div className="mb-5 flex flex-wrap gap-2">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${filter === t ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}
            >
              {t === 'All' ? 'All activity' : (TYPE_META[t]?.label ?? t)}
              <span className="ml-1 opacity-60">{t === 'All' ? history.length : counts[t] ?? 0}</span>
            </button>
          ))}
        </div>
      </WorkspaceSection>

      <Card className="p-6">
        {filtered.length > 0 ? (
          <Timeline
            items={filtered.map((h) => {
              const meta = TYPE_META[h.type] ?? { Icon: FileText, label: h.type, cls: 'from-slate-500 to-slate-600' }
              return {
                title: h.title,
                date: formatDate(h.date, 'EEE, MMM d · yyyy'),
                badge: (
                  <Badge variant="secondary" size="sm" className="gap-1">
                    <meta.Icon className="h-3 w-3" /> {meta.label}
                  </Badge>
                ),
                description: h.detail,
                dotClass: `bg-gradient-to-br ${meta.cls}`,
              }
            })}
          />
        ) : (
          <p className="py-10 text-center text-xs text-slate-400">No history of this type yet.</p>
        )}
      </Card>
    </div>
  )
}

export { HistoryTab }
export default HistoryTab
