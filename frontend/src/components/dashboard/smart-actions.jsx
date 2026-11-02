import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen, BrainCircuit, CalendarDays, ClipboardList, GraduationCap, Sparkles, Target, Timer,
} from 'lucide-react'

const ACTIONS = [
  { label: 'Continue Learning', to: '/student/academics', icon: BookOpen, grad: 'from-indigo-500 to-blue-500', hint: 'Resume your courses' },
  { label: 'View Academics', to: '/student/academics', icon: GraduationCap, grad: 'from-blue-500 to-indigo-500', hint: 'Courses · subjects · progress' },
  { label: 'Open MediXO Mentor', to: '/student/mentor', icon: Sparkles, grad: 'from-teal-500 to-emerald-500', hint: 'Chat · notes · revision' },
  { label: 'Attempt Mock Test', to: '/student/mock-tests', icon: Timer, grad: 'from-amber-500 to-orange-500', hint: 'Sharpen your accuracy' },
  { label: 'View AI Academic DNA', action: 'dna', icon: BrainCircuit, grad: 'from-violet-500 to-purple-500', hint: 'Health · strengths · weak areas' },
  { label: 'View Exam Readiness', action: 'readiness', icon: Target, grad: 'from-emerald-500 to-teal-500', hint: 'Prep level per exam' },
  { label: 'Open Calendar', to: '/student/calendar', icon: CalendarDays, grad: 'from-rose-500 to-pink-500', hint: 'Classes · events · deadlines' },
]

/**
 * Smart Quick Actions — intelligent shortcuts wired to the Success Center
 * dialogs (DNA / Readiness) and the core student routes.
 */
function SmartActions({ onOpenDna, onOpenReadiness }) {
  // const handle = (a) => {
  //   if (a.action === 'dna') onOpenDna?.()
  //   if (a.action === 'readiness') onOpenReadiness?.()
  // }

  // Temporarily commented out — Jump straight in section
  return null

  /* return (
    <section>
      <div className="mb-4">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          <ClipboardList className="h-3.5 w-3.5" /> Smart Quick Actions
        </p>
        <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Jump straight in</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {ACTIONS.map((a, i) => {
          const inner = (
            <div className="group flex h-full flex-col items-start gap-2.5 rounded-2xl border border-slate-100 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-card dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${a.grad} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}>
                <a.icon className="h-4 w-4" />
              </span>
              <span className="text-[12px] font-bold leading-tight text-slate-700 dark:text-slate-200">{a.label}</span>
              <span className="hidden text-[10px] font-medium text-slate-400 sm:block">{a.hint}</span>
            </div>
          )
          return (
            <motion.div key={a.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="h-full">
              {a.to ? (
                <Link to={a.to} className="block h-full">{inner}</Link>
              ) : (
                <button onClick={() => handle(a)} className="block h-full w-full text-left">{inner}</button>
              )}
            </motion.div>
          )
        })}
      </div>
    </section>
  ) */
}

export { SmartActions }
export default SmartActions
