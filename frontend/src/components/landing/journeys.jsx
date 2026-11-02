import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { JOURNEYS } from '@/datasets/platform/content.js'
import { SectionHeading } from '@/components/shared/section-heading'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

function Journeys() {
  const [active, setActive] = useState('student')
  const journey = JOURNEYS.find((j) => j.id === active) ?? JOURNEYS[0]

  return (
    <section className="relative bg-white py-24 dark:bg-slate-950" id="journeys">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Made for every seat"
          title={
            <>
              Four journeys.
              <br />
              <span className="text-gradient">One beautiful experience.</span>
            </>
          }
          description="MediXO EduX is not a student app with admin screens bolted on. Each role gets a product designed around their work — and one shared data layer underneath."
        />

        {/* role tabs */}
        <div className="mb-10 flex flex-wrap justify-center gap-2.5">
          {JOURNEYS.map((j) => (
            <button
              key={j.id}
              onClick={() => setActive(j.id)}
              className={cn(
                'relative rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all duration-300',
                active === j.id
                  ? 'text-white shadow-lg'
                  : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              )}
              style={active === j.id ? { background: `linear-gradient(135deg, ${j.color}, ${j.color}cc)` } : undefined}
            >
              {j.role}
            </button>
          ))}
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[1fr_420px]">
          {/* content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="order-2 lg:order-1"
            >
              <p className="text-sm font-bold uppercase tracking-widest" style={{ color: journey.color }}>
                {journey.tagline}
              </p>
              <div className="mt-6 space-y-5">
                {journey.points.map((p, i) => (
                  <motion.div
                    key={p.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.1 }}
                    className="flex gap-4"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: journey.color }} />
                    <div>
                      <h3 className="text-[17px] font-bold text-slate-900 dark:text-white">{p.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{p.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <Button asChild className="mt-8">
                <Link to={active === 'parent' ? '/auth/login?role=parent' : `/auth/login?role=${active}`}>
                  Try the {journey.role.toLowerCase()} experience
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          </AnimatePresence>

          {/* visual card */}
          <div className="order-1 lg:order-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, rotateY: 12, scale: 0.97 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                exit={{ opacity: 0, rotateY: -8, scale: 0.98 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <div className="absolute -inset-5 rounded-[36px] blur-2xl" style={{ background: `${journey.color}22` }} aria-hidden="true" />
                <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lift dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${journey.color}, ${journey.color}bb)` }}>
                        <JourneyIcon id={active} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{journey.role} Portal</p>
                        <p className="text-[11px] text-slate-400">medixoedux.app/{active}</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
                      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-500" /> Demo
                    </span>
                  </div>

                  <div className="mt-5 space-y-2.5">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.08 }}
                        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                      >
                        <div className="h-9 w-9 rounded-xl" style={{ background: `linear-gradient(135deg, ${journey.color}33, ${journey.color}18)` }} />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2 w-3/4 rounded-full bg-slate-200 dark:bg-slate-700" />
                          <div className="h-1.5 w-1/2 rounded-full bg-slate-100 dark:bg-slate-800" />
                        </div>
                        <div className="flex items-center gap-1 rounded-full bg-white px-2 py-1 shadow-sm dark:bg-slate-900">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: journey.color }} />
                          <span className="text-[9px] font-bold text-slate-400">98%</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${journey.color}, ${journey.color}b0)` }}>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">AI Insight</p>
                    <p className="mt-1 text-[13px] font-medium leading-snug">
                      {active === 'student' && 'Your Networks mastery is up 12 pts. Two focused sessions left before midsem — want me to schedule them?'}
                      {active === 'faculty' && '4 students flagged at-risk in CS503 Sec B. Draft outreach messages for your review?'}
                      {active === 'admin' && 'Retention is up 2.4 pts. MBA fee collection is the only metric needing attention this week.'}
                      {active === 'parent' && 'Aarav’s consistency is at its best this year. A gentle check-in after Aug 14 would be well-timed.'}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

import { Briefcase, GraduationCap, HeartHandshake, ShieldCheck } from 'lucide-react'
function JourneyIcon({ id }) {
  if (id === 'student') return <GraduationCap className="h-5 w-5" />
  if (id === 'faculty') return <Briefcase className="h-5 w-5" />
  if (id === 'admin') return <ShieldCheck className="h-5 w-5" />
  return <HeartHandshake className="h-5 w-5" />
}

export { Journeys }
export default Journeys
