/**
 * Academic Intelligence Workspace — AI Recommendations tab.
 * Ranked recommendations with mark-complete / dismiss / view-details actions.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Eye, Lightbulb, Sparkles, X } from 'lucide-react'
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, Progress } from '@/components/ui'
import { useToast } from '@/components/ui'

const PRIORITY_STYLES = { Critical: 'danger', High: 'warning', Medium: 'info', Low: 'secondary' }
const DIFFICULTY_STYLES = { Easy: 'success', Medium: 'warning', Hard: 'danger' }

function RecommendationsTab({ recommendations }) {
  const [statuses, setStatuses] = useState({}) // id -> 'completed' | 'dismissed'
  const [details, setDetails] = useState(null)
  const toast = useToast()

  const visible = recommendations.filter((r) => statuses[r.id] !== 'completed' && statuses[r.id] !== 'dismissed')

  const markComplete = (r) => {
    setStatuses((s) => ({ ...s, [r.id]: 'completed' }))
    toast.success('Recommendation completed 🎉', `"${r.topic}" marked done — keep the momentum.`)
  }
  const dismiss = (r) => {
    setStatuses((s) => ({ ...s, [r.id]: 'dismissed' }))
    toast.info('Dismissed', `"${r.topic}" removed from your active list.`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
          {visible.length} active recommendation{visible.length === 1 ? '' : 's'} · AI-ranked by impact
        </p>
        <Badge variant="gradient" className="px-3 py-1"><Sparkles className="h-3 w-3" /> From the intelligence engine</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="flex h-full flex-col rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-md">
                  <Lightbulb className="h-4 w-4" />
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={PRIORITY_STYLES[r.priority] ?? 'secondary'} size="sm">{r.priority}</Badge>
                  <Badge variant="outline" size="sm">{r.type}</Badge>
                  {/* Phase 27.1: context tag — university vs competitive */}
                  <Badge variant={r.context === 'competitive' ? 'gradient' : 'secondary'} size="sm">{r.context === 'competitive' ? 'Competitive' : 'University'}</Badge>
                </div>
              </div>

              <h3 className="mt-3 text-[14px] font-bold leading-snug text-slate-900 dark:text-white">{r.topic}</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">{r.reason}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.estimatedBenefit && <Badge variant="gradient" size="sm">{r.estimatedBenefit}</Badge>}
                {r.estimatedTime && <Badge variant="outline" size="sm"><Clock className="h-3 w-3" /> {r.estimatedTime}</Badge>}
                {r.difficulty && <Badge variant={DIFFICULTY_STYLES[r.difficulty] ?? 'secondary'} size="sm">{r.difficulty}</Badge>}
                {r.subjectCode && <Badge variant="secondary" size="sm">{r.subjectCode}</Badge>}
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setDetails(r)}>
                  <Eye className="h-3.5 w-3.5" /> View details
                </Button>
                <Button size="sm" variant="ghost" onClick={() => markComplete(r)}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Complete
                </Button>
                <Button size="sm" variant="ghost" onClick={() => dismiss(r)}>
                  <X className="h-3.5 w-3.5 text-slate-400" /> Dismiss
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-100">All caught up! 🎉</h3>
          <p className="mt-1 text-xs text-slate-400">Every recommendation has been handled. New ones appear as the engine re-analyzes your data.</p>
        </div>
      )}

      {/* View details dialog */}
      <Dialog open={!!details} onOpenChange={(v) => !v && setDetails(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-indigo-500" /> {details?.topic}</DialogTitle>
          </DialogHeader>
          {details && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={PRIORITY_STYLES[details.priority] ?? 'secondary'}>{details.priority} priority</Badge>
                <Badge variant="outline">{details.type}</Badge>
                {details.estimatedBenefit && <Badge variant="gradient">{details.estimatedBenefit}</Badge>}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-[12.5px] leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <span className="font-bold text-slate-800 dark:text-slate-100">Why now:</span> {details.reason}
              </div>
              {details.impact && (
                <div>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Expected impact</p>
                  <div className="flex items-center gap-3">
                    <Progress value={details.impact === 'High' ? 85 : details.impact === 'Medium' ? 60 : 35} className="h-2 flex-1" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{details.impact}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetails(null)}>Close</Button>
                <Button onClick={() => { markComplete(details); setDetails(null) }}>
                  <CheckCircle2 className="h-4 w-4" /> Mark complete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { RecommendationsTab }
export default RecommendationsTab
