import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Target, Eye, Users, Heart, Globe2 } from 'lucide-react'
import { SectionHeading, Reveal, GradientText } from '@/components/shared/section-heading'
import { Button } from '@/components/ui/button'
import { PLATFORM_STATS } from '@/datasets/platform/content.js'
import { useCountUp } from '@/hooks/use-count-up'
import { useInView } from '@/hooks/use-in-view'

const VALUES = [
  { icon: Target, title: 'Outcomes over features', desc: 'Every product decision is measured by one question: did learning improve?' },
  { icon: Eye, title: 'Radical transparency', desc: 'Every AI answer cites its sources. Every metric traces to its pipeline.' },
  { icon: Users, title: 'Teachers first', desc: 'AI should make faculty 10× more effective, never replace their judgment.' },
  { icon: Heart, title: 'Learners as people', desc: 'No dark patterns, no engagement hacks. We design for mastery, not minutes.' },
]

const TIMELINE = [
  { year: '2021', title: 'Founded in Bengaluru', desc: 'Three educators and two engineers set out to fix what LMSs broke.' },
  { year: '2022', title: 'First 10 institutions', desc: 'Pilot with 4 colleges and 6 schools across Karnataka and Maharashtra.' },
  { year: '2023', title: 'AI Tutor ships', desc: 'The conversational tutor goes live; 2.4M questions answered in year one.' },
  { year: '2024', title: 'GraphRAG + Analytics Cloud', desc: 'Knowledge-graph search and institution-wide analytics arrive.' },
  { year: '2025', title: '100+ university partners', desc: 'IITs, NITs and autonomous institutes adopt MediXO EduX at scale.' },
  { year: '2026', title: '850+ institutions', desc: '2.4M learners across 40 countries. The journey continues.' },
]

function About() {
  return (
    <div className="bg-white pb-24 dark:bg-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden pt-32">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-hero-gradient" />
          <div className="bg-grid absolute inset-0 mask-fade-b opacity-50" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 pb-20 text-center sm:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">About MediXO EduX</p>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
              We believe every learner
              <br />
              deserves <GradientText>an unfair advantage</GradientText>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg dark:text-slate-400">
              MediXO EduX exists because one-size-fits-all education leaves too many people behind. We build the infrastructure
              that lets institutions personalise learning for every student — at the scale of thousands, with the care of a tutor.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-slate-100 bg-slate-50/60 py-12 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6">
          {PLATFORM_STATS.map((s, i) => <Stat key={s.label} {...s} delay={i * 0.08} />)}
        </div>
      </section>

      {/* Mission */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <SectionHeading
              align="left"
              eyebrow="Our mission"
              title={
                <>
                  Make world-class teaching
                  <br />
                  <GradientText>individually personal</GradientText>
                </>
              }
              description="The best teacher who ever taught you knew your name, your confusions, and exactly when to push. That experience should not be a privilege of small classes — it should be the default for every student, everywhere."
            />
            <Reveal delay={0.1}>
              <div className="grid gap-4 sm:grid-cols-2">
                {VALUES.map((v) => (
                  <div key={v.title} className="group rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110">
                      <v.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{v.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{v.desc}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Journey timeline */}
      <section className="bg-slate-50 py-24 dark:bg-slate-900/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Our journey"
            title={<>Five years, <GradientText>one obsession</GradientText></>}
          />
          <div className="relative ml-3 border-l-2 border-slate-200 pl-8 dark:border-slate-800">
            {TIMELINE.map((t, i) => (
              <motion.div
                key={t.year}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6 }}
                className="relative mb-10 last:mb-0"
              >
                <span className="absolute -left-[41px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-teal-500 text-white ring-4 ring-slate-50 dark:ring-slate-900">
                  <Check className="h-3 w-3" />
                </span>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">{t.year}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{t.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team teaser */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <SectionHeading
            eyebrow="The team"
            title={<>Educators, engineers and <GradientText>dreamers</GradientText></>}
            description="120+ people across Bengaluru, Mumbai and Delhi — two-thirds of us have taught in classrooms ourselves."
          />
          <Reveal>
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-6 rounded-3xl border border-slate-200/70 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <div className="flex -space-x-3">
                {['Dr. Kavita Rao', 'Arjun Mehta', 'Sana Khan', 'Rahul Pillai', 'Meera Krishnan'].map((n, i) => (
                  <div key={n} className="rounded-full ring-4 ring-white dark:ring-slate-900" style={{ zIndex: 5 - i }}>
                    <AvatarGradient name={n} />
                  </div>
                ))}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Founded by educators who code</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                  Dr. Kavita Rao (ex-IIT Bombay faculty) and Arjun Mehta (ex-Google, ex-Byju’s) started MediXO EduX in a Bengaluru classroom.
                </p>
              </div>
            </div>
          </Reveal>
          <div className="mt-10 flex flex-wrap justify-center gap-3.5">
            <Button asChild size="lg"><Link to="/careers">Join the team <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/contact"><Globe2 className="h-4 w-4" /> Talk to us</Link></Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function AvatarGradient({ name }) {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-blue-500 to-teal-400 text-sm font-bold text-white">
      {name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
    </span>
  )
}

function Stat({ value, suffix, label, delay }) {
  const [ref, inView] = useInView()
  const count = useCountUp(value, { start: inView })
  return (
    <div ref={ref} className="text-center">
      <p className="font-display text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
        {count}<span className="text-gradient">{suffix}</span>
      </p>
      <p className="mt-1.5 text-xs font-medium text-slate-400">{label}</p>
    </div>
  )
}

export { About }
export default About
