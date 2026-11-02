import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, BookOpenCheck, BrainCircuit, FileText, Sparkles } from 'lucide-react'
import { SectionHeading } from '@/components/shared/section-heading'
import { useInView } from '@/hooks/use-in-view'

const STEPS = [
  {
    id: 'syllabus',
    label: '01 · Import syllabus',
    icon: BookOpenCheck,
    title: 'Your curriculum, understood by AI',
    desc: 'Upload any syllabus — CBSE, UGC, autonomous, IB — and MediXO EduX maps every unit to concepts, outcomes and assessments automatically.',
    stat: '14 days average syllabus mapping for a full university',
  },
  {
    id: 'teach',
    label: '02 · Teach & learn',
    icon: BrainCircuit,
    title: 'Classes run with an AI partner',
    desc: 'Faculty teach as usual — MediXO EduX drafts lessons, generates questions, and gives every student a 24×7 tutor that matches their pace.',
    stat: '11 hours reclaimed per faculty member weekly',
  },
  {
    id: 'assess',
    label: '03 · Assess continuously',
    icon: FileText,
    title: 'Assessments that never stop working',
    desc: 'Quizzes, assignments and full exams generate from your question bank with blueprint coverage, difficulty calibration and plagiarism checks.',
    stat: '92% exam coverage against course outcomes',
  },
  {
    id: 'decide',
    label: '04 · Decide with data',
    icon: BarChart3,
    title: 'Leadership sees everything live',
    desc: 'Retention, at-risk flags, placements, research and revenue — in dashboards your board will actually enjoy reading.',
    stat: 'At-risk students flagged up to 8 weeks early',
  },
]

function ProductDemo() {
  const [active, setActive] = useInView()
  const [, inView] = useInView()
  const step = STEPS[Math.min(Math.floor((active ? 1 : 0)), 0)] // keep simple

  return (
    <section className="relative overflow-hidden bg-white py-24 dark:bg-slate-950" id="demo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              From syllabus to insight,
              <br />
              <span className="text-gradient">in four connected moves</span>
            </>
          }
          description="MediXO EduX replaces the hand-offs and spreadsheets between teaching, assessment and administration with one continuous data flow."
        />

        <div className="grid gap-10 lg:grid-cols-[380px_1fr]">
          {/* Step selector */}
          <div className="space-y-3">
            {STEPS.map((s, i) => {
              const selected = false
              return (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setActive(i)}
                  className={`group flex w-full items-start gap-4 rounded-3xl border p-5 text-left transition-all duration-300 ${
                    active === i
                      ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-teal-50/50 shadow-card dark:border-indigo-500/30 dark:from-indigo-500/10 dark:to-teal-500/5'
                      : 'border-slate-200/70 bg-white hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30'
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                      active === i
                        ? 'bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                    }`}
                  >
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className={`block text-xs font-bold uppercase tracking-widest ${active === i ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400'}`}>
                      {s.label}
                    </span>
                    <span className={`mt-1 block text-[15px] font-bold ${active === i ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                      {s.title}
                    </span>
                  </span>
                </motion.button>
              )
            })}
          </div>

          {/* Visual panel */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-teal-400/15 blur-2xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-lift dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 border-b border-slate-200/70 px-5 py-3 dark:border-slate-800">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-[11px] font-medium text-slate-400">medixoedux.app — Academic Analytics</span>
              </div>

              <div className="p-6 sm:p-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Institution Health — Term 5</p>
                    <p className="text-xs text-slate-400">Live · updated 2 min ago</p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
                    <Sparkles className="h-3 w-3" /> AI summary available
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: 'Retention', value: '94.8%', delta: '+2.4%', color: 'text-emerald-500' },
                    { label: 'At-risk students', value: '214', delta: '−38 this term', color: 'text-rose-500' },
                    { label: 'Placement rate', value: '92.4%', delta: '+3.8 pts', color: 'text-emerald-500' },
                  ].map((k) => (
                    <div key={k.label} className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k.label}</p>
                      <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
                      <p className={`text-xs font-semibold ${k.color}`}>{k.delta}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Enrollment by department</p>
                    <div className="flex gap-1">
                      {['Term', 'Year'].map((t) => (
                        <span key={t} className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${t === 'Term' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { name: 'Computer Science', pct: 88, color: 'from-indigo-500 to-blue-500' },
                      { name: 'Electronics & Comm.', pct: 72, color: 'from-blue-500 to-sky-400' },
                      { name: 'Mechanical', pct: 58, color: 'from-teal-400 to-emerald-500' },
                      { name: 'School of Business', pct: 44, color: 'from-emerald-400 to-lime-500' },
                      { name: 'Design & Media', pct: 26, color: 'from-amber-400 to-orange-500' },
                    ].map((row, i) => (
                      <div key={row.name} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 truncate text-xs font-medium text-slate-500 dark:text-slate-400">{row.name}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${row.pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                            className={`h-full rounded-full bg-gradient-to-r ${row.color}`}
                          />
                        </div>
                        <span className="w-9 text-right text-xs font-bold text-slate-600 dark:text-slate-300">{row.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-600 to-teal-500 px-5 py-4 text-white">
                  <div>
                    <p className="text-sm font-bold">Ask Copilot about this dashboard</p>
                    <p className="text-xs text-white/80">“Which department needs the most support this term?”</p>
                  </div>
                  <button className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold ring-1 ring-white/30 transition-all hover:bg-white/25">
                    Ask <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export { ProductDemo }
export default ProductDemo
