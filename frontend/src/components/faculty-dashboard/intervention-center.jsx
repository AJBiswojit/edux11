/**
 * MediXO EduX — Faculty Command Center · 4. AI Intervention Center ⭐.
 * Intelligent intervention cards — Low Attendance, Poor Assignment
 * Completion, Weak Chapter, Students Failing Quiz, Assessment Gap,
 * Revision Required — each with priority, reason, affected batch &
 * students, recommended action and expected outcome.
 */

import { motion } from 'framer-motion'
import { AlertTriangle, BookOpenCheck, ClipboardList, FileBarChart, GraduationCap, RefreshCw } from 'lucide-react'
import { Badge, Card } from '@/components/ui'

const TYPE_META = {
  'Low Attendance': { icon: AlertTriangle, grad: 'from-amber-500 to-orange-500' },
  'Poor Assignment Completion': { icon: ClipboardList, grad: 'from-rose-500 to-red-500' },
  'Weak Chapter': { icon: BookOpenCheck, grad: 'from-indigo-500 to-blue-500' },
  'Students Failing Quiz': { icon: FileBarChart, grad: 'from-fuchsia-500 to-pink-500' },
  'Assessment Gap': { icon: GraduationCap, grad: 'from-violet-500 to-purple-500' },
  'Revision Required': { icon: RefreshCw, grad: 'from-emerald-500 to-teal-500' },
}
const PRIORITY_VARIANT = { Critical: 'danger', High: 'warning', Medium: 'secondary' }

function InterventionCenter({ data }) {
  const items = data.derived.dashboard?.interventions ?? []
  if (!items.length) return null
  return (
    <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, i) => {
          const meta = TYPE_META[item.type] ?? { icon: AlertTriangle, grad: 'from-slate-500 to-slate-600' }
          return (
            <motion.div key={item.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="group h-full p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.grad} text-white shadow-md`}>
                      <meta.icon className="h-4 w-4" />
                    </span>
                    <p className="text-[13.5px] font-bold text-slate-900 dark:text-white">{item.type}</p>
                  </div>
                  <Badge variant={PRIORITY_VARIANT[item.priority] ?? 'secondary'} size="sm">{item.priority}</Badge>
                </div>

                <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">{item.reason}</p>

                <div className="mt-3.5 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                    <p className="truncate text-[11.5px] font-bold text-slate-800 dark:text-white" title={item.affectedBatch}>{item.affectedBatch}</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Affected batch</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800/50">
                    <p className="text-[11.5px] font-bold text-slate-800 dark:text-white">{item.affectedStudents}</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Students</p>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-500/20 dark:bg-indigo-500/[0.07]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Recommended action</p>
                  <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-slate-800 dark:text-slate-100">{item.recommendedAction}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <AlertTriangle className="h-3 w-3" /> Expected: {item.expectedOutcome}
                  </p>
                </div>
              </Card>
            </motion.div>
          )
        })}
    </div>
  )
}

export { InterventionCenter }
export default InterventionCenter
