import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Briefcase, Globe, HeartHandshake, MapPin, Sparkles, Wallet } from 'lucide-react'
import { useCareers } from '@/services/auth'
import { Reveal, GradientText } from '@/components/shared/section-heading'
import { Badge, Button } from '@/components/ui'
import { PageLoader, ErrorState } from '@/components/shared/loading'

const PERKS = [
  { icon: Wallet, title: 'Top-of-market compensation', desc: 'Salary + equity + generous ESOPs, benchmarked yearly.' },
  { icon: HeartHandshake, title: 'Health for the whole family', desc: 'Comprehensive insurance including parents and pets.' },
  { icon: Globe, title: 'Remote-first, India-wide', desc: 'Work from Bengaluru HQ, Mumbai, Delhi — or anywhere with great Wi-Fi.' },
  { icon: Sparkles, title: 'Learning budget', desc: '₹1L/year for courses, conferences and books. Yes, really.' },
]

function Careers() {
  const { data, isLoading, isError, refetch } = useCareers()
  const roles = data?.roles ?? []

  return (
    <div className="bg-white pb-24 dark:bg-slate-950">
      <section className="relative overflow-hidden pt-32">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-hero-gradient" />
          <div className="bg-grid absolute inset-0 mask-fade-b opacity-50" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 pb-16 text-center sm:px-6">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Careers</p>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
              Build the future of <GradientText>learning</GradientText>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg dark:text-slate-400">
              We’re a team of educators, engineers and designers who believe good software can change how a generation learns. 120+ people, 40 countries, zero meetings-before-11am.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg"><Link to="#open-roles">See open roles <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/contact">Ask us anything</Link></Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Perks */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PERKS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.06}>
                <div className="group h-full rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Open roles */}
      <section id="open-roles" className="scroll-mt-24 border-t border-slate-100 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Open roles</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? 'Loading…' : `${roles.length} roles`} · <span className="text-gradient">find yours</span>
            </h2>
          </Reveal>

          {isLoading ? (
            <div className="mt-10"><PageLoader label="Fetching roles…" /></div>
          ) : isError ? (
            <div className="mt-10"><ErrorState onRetry={() => refetch()} title="Roles unavailable" /></div>
          ) : (
            <div className="mt-10 space-y-4">
              {roles.map((role, i) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -3 }}
                  className="group flex flex-wrap items-center gap-4 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card transition-all duration-300 hover:border-indigo-200 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/20 dark:text-indigo-300">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[17px] font-bold text-slate-900 transition-colors group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
                      {role.title}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {role.location}</span>
                      <span>· {role.type}</span>
                      <span>· {role.exp}</span>
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {role.team}</span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {role.tags.map((t) => <Badge key={t} variant="secondary" size="sm">{t}</Badge>)}
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/contact">Apply <ArrowUpRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                </motion.div>
              ))}
            </div>
          )}

          <Reveal className="mt-12">
            <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-teal-500 p-8 text-center text-white shadow-lift">
              <h3 className="text-xl font-bold">Don’t see your role?</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/85">
                Great people rarely fit templates. Send us a note — we keep talent on file for when the right seat opens.
              </p>
              <Button asChild variant="secondary" size="lg" className="mt-5 bg-white text-indigo-700 hover:bg-indigo-50">
                <Link to="/contact">Introduce yourself</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}

export { Careers }
export default Careers
