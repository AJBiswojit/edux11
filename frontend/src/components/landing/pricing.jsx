import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { PRICING_PLANS } from '@/datasets/platform/content.js'
import { SectionHeading, Reveal } from '@/components/shared/section-heading'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

function Pricing() {
  const [annual, setAnnual] = useState(true)

  return (
    <section className="relative overflow-hidden bg-white py-24 dark:bg-slate-950" id="pricing">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute right-[15%] top-20 h-80 w-80 rounded-full bg-indigo-500/8 blur-3xl" />
        <div className="absolute bottom-10 left-[10%] h-80 w-80 rounded-full bg-teal-500/8 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Pricing"
          title={
            <>
              Simple plans.
              <br />
              <span className="text-gradient">Serious scale.</span>
            </>
          }
          description="Per-institution pricing with no per-student surprises. Every plan includes the full AI suite — the AI is the point, not the upsell."
        />

        {/* billing toggle */}
        <div className="mb-12 flex items-center justify-center gap-4">
          <span className={cn('text-sm font-semibold transition-colors', !annual ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={cn('relative h-8 w-14 rounded-full transition-colors duration-300', annual ? 'bg-gradient-to-r from-indigo-600 to-blue-600' : 'bg-slate-200 dark:bg-slate-700')}
            role="switch"
            aria-checked={annual}
            aria-label="Toggle annual billing"
          >
            <span className={cn('absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300', annual ? 'left-7' : 'left-1')} />
          </button>
          <span className={cn('text-sm font-semibold transition-colors', annual ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>
            Annual
            <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
              Save 20%
            </span>
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {PRICING_PLANS.map((plan, i) => {
            const price = annual ? plan.annual : plan.monthly
            return (
              <Reveal key={plan.id} delay={i * 0.08}>
                <div
                  className={cn(
                    'relative flex h-full flex-col rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1.5',
                    plan.highlight
                      ? 'gradient-border bg-gradient-to-b from-indigo-600/[0.04] to-teal-500/[0.04] shadow-lift dark:from-indigo-500/[0.08] dark:to-teal-500/[0.05]'
                      : 'border border-slate-200/80 bg-white shadow-card hover:shadow-lift dark:border-slate-800 dark:bg-slate-900'
                  )}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-indigo-600 to-teal-500 px-4 py-1.5 text-[11px] font-bold text-white shadow-lg shadow-indigo-500/30">
                      <Sparkles className="h-3 w-3" /> Most popular
                    </span>
                  )}
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">{plan.audience}</p>
                  <div className="mt-6 flex items-end gap-1.5">
                    {price ? (
                      <>
                        <span className="font-display text-5xl font-bold tracking-tight text-slate-900 dark:text-white">${price}</span>
                        <span className="pb-1.5 text-sm font-medium text-slate-400">/ month{annual && ' · billed annually'}</span>
                      </>
                    ) : (
                      <span className="font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Custom</span>
                    )}
                  </div>
                  <Button
                    asChild
                    variant={plan.highlight ? 'default' : 'outline'}
                    className={cn('mt-6 w-full', plan.highlight && 'h-12')}
                  >
                    <Link to="/contact">
                      {plan.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <ul className="mt-7 space-y-3.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                        <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', plan.highlight ? 'bg-gradient-to-br from-indigo-600 to-teal-500 text-white' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300')}>
                          <Check className="h-3 w-3" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal className="mt-12">
          <p className="text-center text-sm text-slate-400">
            All plans include SSO-ready security, data residency in India, and migration assistance.{' '}
            <Link to="/contact" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              Talk to sales for 5,000+ students →
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  )
}

export { Pricing }
export default Pricing
