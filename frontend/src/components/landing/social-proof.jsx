import { Link } from 'react-router-dom'
import { ArrowUpRight, Quote, Star } from 'lucide-react'
import { TESTIMONIALS, CASE_STUDIES } from '@/datasets/platform/content.js'
import { SectionHeading, Reveal } from '@/components/shared/section-heading'
import { Avatar } from '@/components/ui/avatar'
function Testimonials() {
  return (
    <section className="relative overflow-hidden bg-white py-24 dark:bg-slate-950" id="testimonials">
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute left-[10%] top-24 h-72 w-72 rounded-full bg-indigo-500/8 blur-3xl" />
        <div className="absolute bottom-24 right-[8%] h-72 w-72 rounded-full bg-teal-500/8 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Loved by institutions"
          title={
            <>
              Don’t take our word.
              <br />
              <span className="text-gradient">Take theirs.</span>
            </>
          }
          description="Vice-chancellors, principals, HODs, parents and students — here’s what they say after a year with MediXO EduX."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.06}>
              <figure className="group relative flex h-full flex-col rounded-3xl border border-slate-200/70 bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900">
                <Quote className="absolute right-6 top-6 h-8 w-8 text-indigo-500/10 transition-colors duration-300 group-hover:text-indigo-500/25" />
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: t.rating }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="flex-1 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5 dark:border-slate-800">
                  <Avatar name={t.name} size="md" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function CaseStudies() {
  return (
    <section className="relative bg-slate-50 py-24 dark:bg-slate-950" id="case-studies">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Case Studies"
          title={
            <>
              Real institutions.
              <br />
              <span className="text-gradient">Measurable outcomes.</span>
            </>
          }
          description="Four stories of transformation — with the numbers to back them up."
        />

        <div className="grid gap-6 md:grid-cols-2">
          {CASE_STUDIES.map((cs, i) => (
            <Reveal key={cs.id} delay={i * 0.07}>
              <Link
                to="/case-studies"
                className="group block h-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900"
              >
                <div className={`relative overflow-hidden bg-gradient-to-br ${cs.gradient} px-7 pb-14 pt-8 text-white`}>
                  <div className="bg-dots absolute inset-0 opacity-20" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl font-bold">{cs.name}</h3>
                      <p className="mt-1 text-xs text-white/75">{cs.type}</p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-white/70 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                  <p className="relative mt-5 text-[15px] font-semibold leading-snug">{cs.headline}</p>
                  {/* folded corner effect */}
                  <div className="absolute bottom-0 left-0 h-12 w-full translate-y-1 bg-white dark:bg-slate-900 [clip-path:polygon(0_100%,0_0,100%_100%)]" />
                </div>
                <div className="px-7 pb-7 pt-6">
                  <p className="line-clamp-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{cs.story}</p>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {cs.metrics.map((m) => (
                      <div key={m.label} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                        <p className="font-display text-lg font-bold text-indigo-600 dark:text-indigo-300">{m.value}</p>
                        <p className="mt-0.5 text-[10px] font-medium leading-tight text-slate-400">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export { Testimonials, CaseStudies }
export default Testimonials
