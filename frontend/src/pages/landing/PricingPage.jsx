import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, FileSpreadsheet, GraduationCap, School, Building2 } from 'lucide-react'
import { Pricing } from '@/components/landing/pricing'
import { FAQ } from '@/components/landing/faq-blog'
import { SectionHeading, Reveal, GradientText } from '@/components/shared/section-heading'
import { Button } from '@/components/ui/button'

const COMPARISONS = [
  {
    name: 'School',
    icon: School,
    items: [
      ['Adaptive learning paths', true, true, true],
      ['AI Tutor & Copilot', true, true, true],
      ['Parent app with AI insights', true, true, true],
      ['Coding Lab', false, true, true],
      ['Institution analytics cloud', false, true, true],
      ['Placement & research consoles', false, true, true],
      ['Exam builder + question bank', false, true, true],
      ['SSO / SAML & ERP integrations', false, true, true],
      ['Custom AI fine-tuning & on-prem', false, false, true],
    ],
  },
]

function PricingPage() {
  return (
    <div className="bg-white pb-24 dark:bg-slate-950">
      <section className="relative overflow-hidden pt-32">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-hero-gradient" />
          <div className="bg-grid absolute inset-0 mask-fade-b opacity-50" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 pb-10 text-center sm:px-6">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Pricing</p>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              One platform. <GradientText>Fair pricing.</GradientText>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-500 dark:text-slate-400">
              No per-student surprises, no AI upsells. Pick a plan below — or let us design one around your institution.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg"><Link to="/contact">Get a tailored quote <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/contact"><FileSpreadsheet className="h-4 w-4" /> Download comparison sheet</Link></Button>
            </div>
          </Reveal>
        </div>
      </section>

      <Pricing />

      {/* Comparison table */}
      <section className="border-t border-slate-100 bg-slate-50 py-24 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Compare plans"
            title={<>What’s included, <GradientText>side by side</GradientText></>}
            description="Every plan includes security, privacy and unlimited technical support. The table below shows capability differences."
          />
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Capability</th>
                    <th className="px-4 py-4 text-center"><span className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200"><School className="h-4 w-4 text-teal-500" /> School</span></th>
                    <th className="px-4 py-4 text-center"><span className="flex items-center justify-center gap-1.5 text-sm font-bold text-indigo-600 dark:text-indigo-300"><GraduationCap className="h-4 w-4" /> University</span></th>
                    <th className="px-4 py-4 text-center"><span className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200"><Building2 className="h-4 w-4 text-violet-500" /> Enterprise</span></th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISONS[0].items.map(([label, s, u, e], i) => (
                    <tr key={label} className="border-b border-slate-100 last:border-0 dark:border-slate-800/70">
                      <td className="px-6 py-3.5 font-medium text-slate-700 dark:text-slate-200">{label}</td>
                      {[s, u, e].map((v, j) => (
                        <td key={j} className="px-4 py-3.5 text-center">
                          {v ? (
                            <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" />
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <FAQ />
    </div>
  )
}

export { PricingPage }
export default PricingPage
