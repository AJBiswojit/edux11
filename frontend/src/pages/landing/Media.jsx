import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, CalendarDays, Camera, FileText, Globe2, Image as ImageIcon, Megaphone, Newspaper } from 'lucide-react'
import { Reveal, GradientText } from '@/components/shared/section-heading'
import { Badge, Button } from '@/components/ui'

const PRESS = [
  { outlet: 'TechCircle India', headline: 'MediXO EduX raises $60M Series C to bring adaptive AI to Indian campuses', date: '2026-07-14', tag: 'Funding' },
  { outlet: 'The Hindu — Education', headline: 'How GraphRAG is changing how university students search knowledge', date: '2026-06-28', tag: 'Product' },
  { outlet: 'YourStory', headline: 'This Bengaluru startup is helping 850 institutions reclaim 11 hours per faculty week', date: '2026-06-02', tag: 'Feature' },
  { outlet: 'Economic Times — Tech', headline: 'MediXO EduX signs multi-campus agreements with two state university systems', date: '2026-05-11', tag: 'Business' },
  { outlet: 'Inc42', headline: 'The AI tutors of India: a landscape report', date: '2026-04-20', tag: 'Report' },
  { outlet: 'NDTV Education', headline: 'How parents are becoming partners in learning, not police', date: '2026-03-30', tag: 'Op-ed' },
]

const ASSETS = [
  { icon: Megaphone, title: 'Press kit', desc: 'Logos, product shots and founder bios in print-ready formats.', size: 'ZIP · 42 MB' },
  { icon: FileText, title: 'Company fact sheet', desc: 'One page: metrics, milestones, leadership and contact.', size: 'PDF · 1.2 MB' },
  { icon: Camera, title: 'Brand guidelines', desc: 'Logo usage, colour system, typography and do/don’ts.', size: 'PDF · 8.4 MB' },
  { icon: ImageIcon, title: 'Product screenshots', desc: 'High-resolution UI captures across all four portals.', size: 'ZIP · 96 MB' },
]

function Media() {
  return (
    <div className="bg-white pb-24 pt-32 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Media & Press</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
            MediXO EduX in the <GradientText>news</GradientText>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-slate-400">
            For press enquiries, interviews and quotes, reach us at <span className="font-semibold text-indigo-600 dark:text-indigo-300">press@medixoedux.edu</span> — we typically respond within 4 hours.
          </p>
        </Reveal>

        {/* Coverage */}
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {PRESS.map((p, i) => (
            <motion.div
              key={p.headline}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <Newspaper className="h-4 w-4 text-indigo-500" /> {p.outlet}
                </span>
                <Badge variant="secondary" size="sm">{p.tag}</Badge>
              </div>
              <h3 className="mt-3 text-[16px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
                {p.headline}
              </h3>
              <p className="mt-2.5 flex items-center gap-2 text-xs font-medium text-slate-400">
                <CalendarDays className="h-3.5 w-3.5" /> {p.date}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Assets */}
        <div className="mt-16">
          <Reveal>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Media <GradientText>assets</GradientText>
            </h2>
            <p className="mt-2 text-sm text-slate-400">Everything a journalist or partner needs — free to use with attribution.</p>
          </Reveal>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ASSETS.map((a, i) => (
              <Reveal key={a.title} delay={i * 0.06}>
                <div className="group h-full rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110">
                    <a.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{a.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{a.desc}</p>
                  <p className="mt-3 text-[11px] font-semibold text-slate-300 dark:text-slate-600">{a.size}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Reveal className="mt-16">
          <div className="flex flex-col items-center justify-between gap-5 rounded-3xl bg-gradient-to-r from-indigo-600 to-teal-500 p-8 text-white shadow-lift sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
                <Globe2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Interested in a demo before writing?</h3>
                <p className="text-sm text-white/85">Journalists get full platform access for evaluation.</p>
              </div>
            </div>
            <Button asChild variant="secondary" className="bg-white text-indigo-700 hover:bg-indigo-50">
              <Link to="/contact"><BookOpen className="h-4 w-4" /> Request press access</Link>
            </Button>
          </div>
        </Reveal>

        <Link to="/blog" className="mt-10 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          <ArrowLeft className="h-4 w-4" /> Back to the Journal
        </Link>
      </div>
    </div>
  )
}

export { Media }
export default Media
