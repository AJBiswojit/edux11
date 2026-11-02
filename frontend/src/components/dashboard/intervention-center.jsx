import { motion } from 'framer-motion'
import { AlertTriangle, ArrowUpRight, ShieldAlert, Sparkles } from 'lucide-react'
import { Badge, Button } from '@/components/ui'

const PRIORITY_STYLES = {
  Critical: {
    card: 'border-rose-200 bg-rose-50/40 dark:border-rose-500/25 dark:bg-rose-500/5',
    badge: 'danger',
    icon: 'from-rose-500 to-red-500 text-white',
    label: 'text-rose-600 dark:text-rose-300',
  },
  Medium: {
    card: 'border-amber-200 bg-amber-50/40 dark:border-amber-500/25 dark:bg-amber-500/5',
    badge: 'warning',
    icon: 'from-amber-500 to-orange-500 text-white',
    label: 'text-amber-600 dark:text-amber-300',
  },
  Normal: {
    card: 'border-slate-200 bg-slate-50/40 dark:border-slate-700 dark:bg-slate-800/30',
    badge: 'secondary',
    icon: 'from-slate-500 to-slate-600 text-white',
    label: 'text-slate-500 dark:text-slate-300',
  },
}

const ICONS = { attendance: ShieldAlert, deadline: AlertTriangle, quiz: AlertTriangle, concept: AlertTriangle, exam: ShieldAlert, practice: Sparkles, cgpa: ShieldAlert }

/**
 * AI Intervention Center — renders only when the intelligence engine flags
 * something. Cards are differentiated by priority (Critical / Medium / Normal)
 * and always show reason, affected subject, suggested action, estimated
 * improvement and status.
 */
function InterventionCenter({ interventions = [] }) {
  // Temporarily commented out — AI Intervention Center / What needs your attention
  return null

  /* if (!interventions?.length) return null

  const critical = interventions.filter((i) => i.priority === 'Critical').length

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-rose-500 dark:text-rose-400">
            <ShieldAlert className="h-3.5 w-3.5" /> AI Intervention Center
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">What needs your attention</h2>
        </div>
        <Badge variant={critical > 0 ? 'danger' : 'warning'} className="px-3 py-1">
          {critical > 0 ? `${critical} critical · ` : ''}{interventions.length} active intervention{interventions.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {interventions.map((i, idx) => {
          const style = PRIORITY_STYLES[i.priority] ?? PRIORITY_STYLES.Normal
          const Icon = ICONS[i.type] ?? AlertTriangle
          return (
            <motion.div key={i.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <div className={`flex h-full flex-col rounded-3xl border p-5 ${style.card}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md ${style.icon}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <Badge variant={style.badge} size="sm">{i.priority}</Badge>
                </div>

                <h3 className="mt-3 text-[13.5px] font-bold leading-snug text-slate-800 dark:text-slate-100">{i.title}</h3>
                <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">{i.reason}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {i.affectedSubjectName && <Badge variant="outline" size="sm">{i.affectedSubjectName}</Badge>}
                  <Badge variant="secondary" size="sm">{i.status}</Badge>
                </div>

                <div className="mt-3 rounded-2xl bg-white/70 p-3 dark:bg-slate-900/40">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Suggested action</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">{i.suggestedAction}</p>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span className={`flex items-center gap-1 text-[11px] font-bold ${style.label}`}>
                    <ArrowUpRight className="h-3.5 w-3.5" /> {i.estimatedImprovement}
                  </span>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">Review</Button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  ) */
}

export { InterventionCenter }
export default InterventionCenter
