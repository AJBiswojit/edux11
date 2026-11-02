import { motion } from 'framer-motion'
import { TRUSTED_BY } from '@/datasets/platform/content.js'

function LogoCloud({ heading = 'Trusted by 850+ institutions across 40 countries' }) {
  return (
    <section className="relative border-y border-slate-100 bg-white py-14 dark:border-slate-800/60 dark:bg-slate-950" id="logos">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs font-bold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500"
        >
          {heading}
        </motion.p>
        <div className="mask-fade-x relative mt-8 overflow-hidden">
          <div className="flex w-max animate-marquee gap-14">
            {[...TRUSTED_BY, ...TRUSTED_BY].map((name, i) => (
              <span
                key={i}
                className="whitespace-nowrap font-display text-lg font-semibold tracking-tight text-slate-300 transition-colors hover:text-indigo-400 dark:text-slate-600 dark:hover:text-indigo-400"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export { LogoCloud }
export default LogoCloud
