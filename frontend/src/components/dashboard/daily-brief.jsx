import { motion } from 'framer-motion'
import { CalendarCheck2, ClipboardList, HeartPulse, Lightbulb, Sparkles, Target } from 'lucide-react'
import { Badge } from '@/components/ui'

const ITEM_ICONS = {
  attendance: CalendarCheck2,
  class: Target,
  deadline: ClipboardList,
  revision: Lightbulb,
  health: HeartPulse,
}

const TONE_STYLES = {
  good: 'bg-emerald-50 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25',
  warn: 'bg-amber-50 text-amber-700 ring-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25',
  info: 'bg-indigo-50 text-indigo-700 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/25',
}

/**
 * AI Daily Brief — personalized greeting + today's key facts, generated
 * from the Student Intelligence Foundation (never hardcoded).
 */
function DailyBrief({ brief }) {
  // Temporarily commented out — AI Daily Brief / Good Morning card
  return null

  /* if (!brief) return null
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-lift sm:p-8"
    >
      <div className="bg-dots absolute inset-0 opacity-15" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">AI Daily Brief · {brief.dateLabel}</p>
            <h2 className="mt-1 font-display text-xl font-bold sm:text-2xl">{brief.greeting}</h2>
          </div>
          <Badge className="bg-white/15 text-white ring-white/30"><Sparkles className="h-3 w-3" /> Personalized for you</Badge>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {brief.items.map((it) => {
            const Icon = ITEM_ICONS[it.key] ?? Lightbulb
            return (
              <div key={it.key} className="rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-white/15">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
                  <Icon className="h-3 w-3" /> {it.label}
                </p>
                <p className="mt-1.5 truncate text-[13.5px] font-bold leading-snug">{it.value}</p>
                <p className="mt-0.5 truncate text-[10.5px] font-medium text-white/70">{it.detail}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-[12.5px] leading-relaxed text-white/95">
            <span className="font-bold">AI Suggestion:</span> {brief.suggestion}
          </p>
        </div>
      </div>
    </motion.section>
  ) */
}

export { DailyBrief }
export default DailyBrief
