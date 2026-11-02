/**
 * MediXO EduX — Institution Command Center · Section 10: Quick Actions.
 * Minimal management shortcuts to existing routes.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart3, ClipboardList, FileBarChart, GraduationCap, Users } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'

const ACTIONS = [
  { label: 'View Student Risk', desc: 'Risk register & interventions', to: '/admin/performance', icon: Users, grad: 'from-rose-500 to-red-500' },
  { label: 'View Departments', desc: 'Department health & HODs', to: '/admin/departments', icon: GraduationCap, grad: 'from-indigo-500 to-blue-500' },
  { label: 'View Faculty Performance', desc: 'Faculty health & research', to: '/admin/faculty', icon: BarChart3, grad: 'from-amber-500 to-orange-500' },
  { label: 'View Assessments', desc: 'Exam analytics & readiness', to: '/admin/exam-analytics', icon: ClipboardList, grad: 'from-emerald-500 to-teal-500' },
  { label: 'View Reports', desc: 'Academic analytics & trends', to: '/admin/academic-analytics', icon: FileBarChart, grad: 'from-violet-500 to-purple-500' },
]

function QuickActions({ data }) {
  void data
  return (
    <ChartCard title="Quick actions" subtitle="Management shortcuts" className="h-full">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
        {ACTIONS.map((a, i) => (
          <motion.div key={a.to} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Link
              to={a.to}
              className="group flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:hover:border-indigo-500/30"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${a.grad} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}>
                <a.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{a.label}</p>
                <p className="truncate text-[10.5px] text-slate-400">{a.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </ChartCard>
  )
}

export { QuickActions }
export default QuickActions
