/**
 * Teaching Intelligence Workspace — Tab 7: Teaching Timeline.
 * Chronological activity log — completed lectures, assignments published,
 * attendance submitted, evaluations completed, revision sessions, question
 * papers generated, quizzes published, exam drafts and announcements.
 */

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Timeline } from '@/components/shared/timeline'
import { Badge, Card } from '@/components/ui'
import { ACTIVITY_TYPE_ICON } from '@/constants/ui'
import { formatDate } from '@/utils/format'
import { WorkspaceSection } from './shared'

const TYPE_ICON = ACTIVITY_TYPE_ICON

function TimelineTab({ data }) {
  const tl = data.derived.teachingTimeline ?? {}
  const [filter, setFilter] = useState('All')
  const events = filter === 'All' ? (tl.events ?? []) : (tl.events ?? []).filter((e) => e.type === filter)
  const types = ['All', ...(tl.counts ?? []).map((c) => c.type)]

  return (
    <div>
      {/* Counts */}
      <WorkspaceSection title="Activity log" subtitle={`${tl.total ?? 0} teaching events · chronological`} icon={Sparkles}>
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {(tl.counts ?? []).map((c) => {
            const meta = TYPE_ICON[c.type] ?? { Icon: Sparkles, cls: 'from-slate-500 to-slate-600' }
            return (
              <button
                key={c.type}
                onClick={() => setFilter(c.type)}
                className={`rounded-2xl border p-4 text-left transition-all ${filter === c.type ? 'border-indigo-400 bg-indigo-50/70 shadow-md dark:border-indigo-500/40 dark:bg-indigo-500/10' : 'border-slate-100 bg-white hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30'}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${meta.cls} text-white shadow-md`}>
                    <meta.Icon className="h-4 w-4" />
                  </span>
                  <span className="font-display text-xl font-bold text-slate-800 dark:text-white">{c.count}</span>
                </div>
                <p className="mt-2.5 text-[11.5px] font-bold leading-tight text-slate-700 dark:text-slate-200">{c.label}</p>
              </button>
            )
          })}
        </div>
      </WorkspaceSection>

      {/* Filter chips */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${filter === t ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}
          >
            {t === 'All' ? 'All activity' : TYPE_ICON[t] ? tl.counts?.find((c) => c.type === t)?.label ?? t : t}
            {t !== 'All' && <span className="ml-1.5 opacity-70">({tl.events?.filter((e) => e.type === t).length ?? 0})</span>}
          </button>
        ))}
        <span className="ml-auto text-xs font-semibold text-slate-400">{events.length} events</span>
      </div>

      <Card className="p-6">
        {events.length > 0 ? (
          <Timeline
            items={events.map((e) => {
              const meta = TYPE_ICON[e.type] ?? { Icon: Sparkles, cls: 'from-slate-500 to-slate-600' }
              return {
                title: e.title,
                date: formatDate(e.date, 'EEE, MMM d · yyyy'),
                badge: <Badge variant="secondary" size="sm">{e.typeLabel}</Badge>,
                description: e.description,
                dotClass: `bg-gradient-to-br ${meta.cls}`,
              }
            })}
          />
        ) : (
          <p className="py-10 text-center text-xs text-slate-400">No events of this type yet.</p>
        )}
      </Card>
    </div>
  )
}

export { TimelineTab }
export default TimelineTab
