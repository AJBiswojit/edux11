import { motion } from 'framer-motion'
import { Activity, BellRing, Gauge, ShieldCheck, Users } from 'lucide-react'
import { SectionHeading, Reveal } from '@/components/shared/section-heading'

const ANALYTIC_CARDS = [
  { icon: Activity, title: 'Live outcome tracking', desc: 'CGPA, mastery, attendance and engagement for every student — streamed in real time.', gradient: 'from-indigo-500 to-blue-500' },
  { icon: Gauge, title: 'Early-warning radar', desc: 'At-risk flags appear 8 weeks before failure, not after results.', gradient: 'from-rose-500 to-orange-500' },
  { icon: Users, title: 'Cohort intelligence', desc: 'Compare sections, departments and programmes against baselines.', gradient: 'from-teal-500 to-emerald-500' },
  { icon: BellRing, title: 'Actionable alerts', desc: 'Faculty and deans receive suggested interventions, not just numbers.', gradient: 'from-amber-500 to-yellow-500' },
]

function AnalyticsSection() {
  return (
    <section className="relative overflow-hidden bg-slate-50 py-24 dark:bg-slate-950">
      <div className="bg-dots mask-fade-y absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Learning Analytics"
          title={
            <>
              Dashboards your board
              <br />
              <span className="text-gradient">will actually read</span>
            </>
          }
          description="Beautiful is not enough — every MediXO EduX dashboard ends in a decision: intervene, invest, celebrate or adjust. One click from insight to action."
        />

        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          {/* left: copy + cards */}
          <div className="space-y-4">
            {ANALYTIC_CARDS.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.07}>
                <div className="group flex items-start gap-4 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${c.gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                    <c.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{c.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{c.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* right: analytics visual */}
          <Reveal delay={0.15}>
            <div className="relative">
              <div className="absolute -inset-5 rounded-[36px] bg-gradient-to-br from-indigo-500/15 to-teal-400/15 blur-2xl" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lift dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">At-risk detection — by week</p>
                    <p className="text-xs text-slate-400">CSE cohort · 220 students</p>
                  </div>
                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">
                    6.2% at risk ↓
                  </span>
                </div>

                {/* area chart bars */}
                <div className="flex h-40 items-end gap-2">
                  {[38, 34, 42, 30, 36, 26, 31, 22, 27, 18, 23, 14, 17, 10].map((v, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${v * 2.2}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.2 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                      className="flex-1 rounded-t-lg bg-gradient-to-t from-rose-500/80 to-rose-300/80"
                    />
                  ))}
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    { name: 'Nikhil Joshi', detail: 'Risk 93% · attendance 74%', color: 'bg-rose-500' },
                    { name: 'Karan Mehta', detail: 'Risk 88% · missed 2 assignments', color: 'bg-rose-400' },
                    { name: 'Sanjay Patel', detail: 'Risk 81% · lab score declining', color: 'bg-amber-400' },
                  ].map((s, i) => (
                    <motion.div
                      key={s.name}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                        <p className="text-[11px] text-slate-400">{s.detail}</p>
                      </div>
                      <button className="rounded-xl bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-600 shadow-sm ring-1 ring-slate-200 transition-all hover:ring-indigo-300 dark:bg-slate-900 dark:text-indigo-300 dark:ring-slate-700">
                        Intervene
                      </button>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3.5 text-white">
                  <ShieldCheck className="h-5 w-5 text-white/80" />
                  <p className="text-xs font-medium">
                    <span className="font-bold">AI suggested:</span> 20-min outreach template for the top 4 students — drafted and ready to send.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export { AnalyticsSection }
export default AnalyticsSection
