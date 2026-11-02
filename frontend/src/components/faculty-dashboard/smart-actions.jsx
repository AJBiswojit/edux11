/**
 * MediXO EduX — Faculty Command Center · 10. Smart Quick Actions.
 * Intelligent shortcuts with live derived labels — replaces generic links.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarClock, ClipboardCheck, Presentation, Sparkles, Users, Wand2 } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'

const ICON_MAP = {
  Presentation, Wand2, ClipboardCheck, Users, CalendarClock, Sparkles,
}

function SmartQuickActions({ data }) {
  const actions = data.derived.dashboard?.smartActions ?? []
  return (
    <ChartCard title="Smart quick actions" subtitle="Intelligent shortcuts — with live context" className="h-full">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((a, i) => {
          const Icon = ICON_MAP[a.icon] ?? Sparkles
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link
                to={a.to}
                className="group flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-500/30"
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${a.grad} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{a.label}</p>
                  <p className="truncate text-[10.5px] text-slate-400">{a.desc}</p>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </ChartCard>
  )
}

export { SmartQuickActions }
export default SmartQuickActions
