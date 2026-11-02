import { motion } from 'framer-motion'
import { AI_CAPABILITIES } from '@/datasets/platform/content.js'
import { SectionHeading, Reveal } from '@/components/shared/section-heading'
import { useCountUp } from '@/hooks/use-count-up'
import { useInView } from '@/hooks/use-in-view'
import { cn } from '@/utils/cn'

function StatBlock({ value, suffix, label, delay }) {
  const [ref, inView] = useInView()
  const count = useCountUp(value, { start: inView, duration: 1600, decimals: 0 })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.6 }}
      className="text-center"
    >
      <p className="font-display text-4xl font-bold text-slate-900 sm:text-5xl dark:text-white">
        {count}
        <span className="text-gradient">{suffix}</span>
      </p>
      <p className="mt-2 text-sm font-medium text-slate-400 dark:text-slate-500">{label}</p>
    </motion.div>
  )
}

const STATS = [
  { value: 2400000, suffix: '+', label: 'Learners on the platform' },
  { value: 850, suffix: '+', label: 'Institutions in 40 countries' },
  { value: 12000000, suffix: '+', label: 'Questions answered by AI' },
  { value: 38, suffix: '%', label: 'Average grade improvement' },
]

function Metrics() {
  const [ref, inView] = useInView()
  return (
    <section ref={ref} className="relative overflow-hidden bg-white py-24 dark:bg-slate-950">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-indigo-500/10 via-blue-500/8 to-teal-400/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Proven at scale"
          title={
            <>
              Numbers that moved
              <br />
              <span className="text-gradient">entire institutions</span>
            </>
          }
        />
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <StatBlock key={s.label} {...s} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- AI feature grid ---------- */
function AIFeatures() {
  return (
    <section className="relative bg-slate-50 py-24 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The AI Suite"
          title={
            <>
              15 AI capabilities.
              <br />
              <span className="text-gradient">Zero gimmicks.</span>
            </>
          }
          description="Every AI feature ships with citations, guardrails, human approval loops and measurable impact — the way serious institutions need it."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {AI_CAPABILITIES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <div className="group relative h-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30">
                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500/10 to-teal-400/10 blur-2xl transition-all duration-500 group-hover:scale-150" />
                <div className="relative mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 dark:text-indigo-300">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="relative text-[16px] font-bold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{f.desc}</p>
                <p className={cn('relative mt-4 inline-flex rounded-full bg-gradient-to-r from-indigo-500/10 to-teal-500/10 px-3 py-1 text-[11px] font-bold text-indigo-600 ring-1 ring-indigo-500/20 dark:text-indigo-300')}>
                  {f.stat}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export { Metrics, AIFeatures }
export default AIFeatures
