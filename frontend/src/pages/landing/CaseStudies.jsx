import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, LineChart, Quote, Sparkles } from 'lucide-react'
import { useCaseStudies } from '@/services/auth'
import { Reveal, GradientText } from '@/components/shared/section-heading'
import { Button } from '@/components/ui/button'
import { PageLoader, ErrorState } from '@/components/shared/loading'

function CaseStudies() {
  const { data, isLoading, isError, refetch } = useCaseStudies()
  const studies = data?.studies ?? []

  return (
    <div className="bg-white pb-24 pt-32 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Case Studies</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            Transformation, <GradientText>measured</GradientText>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400">
            Every case study below is a real deployment with outcomes verified against institutional records. Names kept public with permission.
          </p>
        </Reveal>

        {isLoading ? (
          <div className="mt-12"><PageLoader label="Loading case studies…" /></div>
        ) : isError ? (
          <div className="mt-12"><ErrorState onRetry={() => refetch()} title="Case studies unavailable" /></div>
        ) : (
          <div className="mt-14 space-y-10">
            {studies.map((cs, i) => (
              <motion.div
                key={cs.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className={`overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''} flex flex-col lg:flex-row`}
              >
                {/* Visual side */}
                <div className={`relative flex flex-col justify-between bg-gradient-to-br ${cs.gradient} p-8 text-white sm:p-10 lg:w-[42%]`}>
                  <div className="bg-dots absolute inset-0 opacity-20" />
                  <div className="relative">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-bold">{cs.name}</h2>
                        <p className="text-xs text-white/75">{cs.type}</p>
                      </div>
                    </div>
                    <p className="mt-6 text-lg font-semibold leading-snug">{cs.headline}</p>
                  </div>
                  <div className="relative mt-8 grid grid-cols-3 gap-3">
                    {cs.metrics.map((m) => (
                      <div key={m.label} className="rounded-2xl bg-white/12 p-3 text-center backdrop-blur-sm ring-1 ring-white/20">
                        <p className="font-display text-xl font-bold">{m.value}</p>
                        <p className="mt-1 text-[10px] font-medium leading-tight text-white/75">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Story side */}
                <div className="flex flex-1 flex-col justify-center p-8 sm:p-10">
                  <Quote className="h-7 w-7 text-indigo-500/20" />
                  <p className="mt-4 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{cs.story}</p>
                  <div className="mt-7 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <LineChart className="h-5 w-5 shrink-0 text-indigo-500" />
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-200">Methodology:</span> outcomes compared
                      against the two terms before deployment, controlling for cohort size and intake scores.
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <Reveal className="mt-16">
          <div className="flex flex-col items-center justify-between gap-5 rounded-3xl bg-gradient-to-r from-indigo-600 to-teal-500 p-8 text-white shadow-lift sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Your institution could be next.</h3>
                <p className="text-sm text-white/85">Get a modelled business case for your campus in one call.</p>
              </div>
            </div>
            <Button asChild variant="secondary" className="bg-white text-indigo-700 hover:bg-indigo-50">
              <Link to="/contact">Start the conversation <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </div>
  )
}

export { CaseStudies }
export default CaseStudies
