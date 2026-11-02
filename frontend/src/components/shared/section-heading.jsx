import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

function SectionHeading({ eyebrow, title, description, align = 'center', className, titleClassName }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={cn('mb-12 max-w-3xl md:mb-16', align === 'center' ? 'mx-auto text-center' : 'text-left', className)}
    >
      {eyebrow && (
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" />
          {eyebrow}
        </span>
      )}
      <h2 className={cn('text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[42px] lg:leading-[1.15] dark:text-white', titleClassName)}>
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-slate-500 dark:text-slate-400 sm:text-lg">{description}</p>
      )}
    </motion.div>
  )
}

function GradientText({ children, className }) {
  return <span className={cn('text-gradient', className)}>{children}</span>
}

function GlassCard({ children, className, glow = false }) {
  return (
    <div
      className={cn(
        'glass relative overflow-hidden rounded-3xl shadow-card',
        glow && 'shadow-glow',
        className
      )}
    >
      {children}
    </div>
  )
}

function Reveal({ children, delay = 0, y = 28, className, once = true }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export { SectionHeading, GradientText, GlassCard, Reveal }
export default SectionHeading
