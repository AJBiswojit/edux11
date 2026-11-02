import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { FEATURES } from '@/datasets/platform/content.js'
import { SectionHeading, Reveal } from '@/components/shared/section-heading'
import { cn } from '@/utils/cn'

function Features() {
  return (
    <section id="platform" className="relative scroll-mt-24 bg-slate-50 py-24 dark:bg-slate-950">
      <div className="bg-dots mask-fade-y absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The Platform"
          title={
            <>
              Everything an institution needs.
              <br />
              <span className="text-gradient">Nothing it doesn’t.</span>
            </>
          }
          description="Six integrated systems — learning, teaching, assessment, analytics, governance and family engagement — designed to work as one product, not a patchwork of tools."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = Icons[f.icon] ?? Icons.Sparkles
            return (
              <Reveal key={f.title} delay={i * 0.06}>
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', bounce: 0.35 }}
                  className="group relative h-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-7 shadow-card transition-shadow duration-300 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className={cn('pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br opacity-[0.08] blur-2xl transition-all duration-500 group-hover:scale-[1.8] group-hover:opacity-[0.16]', f.gradient)} />
                  <div className={cn('relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3', f.gradient)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="relative text-lg font-bold text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="relative mt-2.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{f.desc}</p>
                  <Link
                    to="/about"
                    className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 opacity-0 transition-all duration-300 group-hover:opacity-100 dark:text-indigo-400"
                  >
                    Learn more <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export { Features }
export default Features
