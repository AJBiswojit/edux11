import { motion } from 'framer-motion'
import { BrainCircuit, FileSearch, LineChart, Sparkles } from 'lucide-react'
import { SectionHeading, Reveal } from '@/components/shared/section-heading'
import { useInView } from '@/hooks/use-in-view'

const PIPELINE = [
  { icon: Sparkles, title: 'Understand', desc: 'Every lecture, note and paper is embedded into MediXO EduX’s knowledge graph.', color: 'from-indigo-500 to-blue-500' },
  { icon: BrainCircuit, title: 'Reason', desc: 'Mastery models track 40+ skills per subject, updated after every interaction.', color: 'from-blue-500 to-sky-500' },
  { icon: LineChart, title: 'Predict', desc: 'Early-warning models forecast outcomes with 92% accuracy, 8 weeks ahead.', color: 'from-sky-500 to-teal-400' },
  { icon: FileSearch, title: 'Act', desc: 'Tutor, planner and faculty alerts act on the signal — automatically.', color: 'from-teal-400 to-emerald-500' },
]

function AIOverview() {
  const [ref, inView] = useInView()
  return (
    <section className="relative overflow-hidden bg-slate-950 py-24 dark:bg-black" id="ai">
      {/* dark ambient */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
        <div className="bg-grid absolute inset-0 opacity-20" />
        <div className="absolute left-1/4 top-0 h-96 w-96 animate-blob rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 animate-blob rounded-full bg-teal-500/15 blur-3xl" style={{ animationDelay: '5s' }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="MediXO Intelligence Engine"
          title={
            <span className="text-white">
              One AI engine.
              <br />
              <span className="text-gradient">Four superpowers.</span>
            </span>
          }
          description={
            <span className="text-slate-400">
              MediXO EduX runs on a purpose-built learning intelligence engine — not a chatbot bolted onto an LMS. It understands your curriculum, reasons about every learner, predicts outcomes and acts on them.
            </span>
          }
        />

        {/* pipeline */}
        <div ref={ref} className="relative">
          <div className="absolute left-0 right-0 top-1/2 hidden h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent lg:block" aria-hidden="true" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6 }}
                className="group relative rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-colors duration-300 hover:border-indigo-400/40 hover:bg-white/[0.08]"
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300/70">Step {i + 1}</span>
                <h3 className="mt-1 text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* knowledge graph strip */}
        <Reveal className="mt-16">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/20 via-blue-600/10 to-teal-500/20 p-8 sm:p-12">
            <div className="bg-dots absolute inset-0 opacity-30" aria-hidden="true" />
            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-200">
                  <FileSearch className="h-3.5 w-3.5" /> GraphRAG Knowledge Search
                </span>
                <h3 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
                  Search that answers,
                  <br />
                  <span className="text-gradient">not just returns links</span>
                </h3>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-300">
                  Ask “connect graph traversal to how Google Maps works” — MediXO Mentor synthesises an answer across three courses, every claim cited to the exact lecture, page or paper. No hallucinations, no dead ends.
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
                  {['Cited answers with clickable evidence', 'Spans lectures, textbooks, papers & past exams', 'Works in English, Hindi and 12 more languages'].map((li) => (
                    <li key={li} className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none"><path d="M2 6.5 5 9.5 10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                      </span>
                      {li}
                    </li>
                  ))}
                </ul>
              </div>

              {/* mini knowledge graph visual */}
              <div className="relative mx-auto hidden h-72 w-full max-w-md sm:block" aria-hidden="true">
                <svg viewBox="0 0 400 280" className="h-full w-full">
                  {[
                    ['n1', 'n2'], ['n1', 'n3'], ['n1', 'n6'], ['n2', 'n4'], ['n3', 'n4'], ['n3', 'n5'], ['n5', 'n6'], ['n1', 'n7'],
                  ].map(([a, b], i) => {
                    const p1 = NODES[a]
                    const p2 = NODES[b]
                    return (
                      <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="url(#kgEdge)" strokeWidth="1.2" opacity="0.5" />
                    )
                  })}
                  <defs>
                    <linearGradient id="kgEdge" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#2dd4bf" />
                    </linearGradient>
                  </defs>
                  {Object.entries(NODES).map(([id, n]) => (
                    <motion.g
                      key={id}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: 'spring', bounce: 0.4, delay: 0.2 + n.d * 0.06 }}
                    >
                      <circle cx={n.x} cy={n.y} r={n.r} fill={n.fill} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
                      <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize="10" fontWeight="600" fill={n.text}>
                        {n.label}
                      </text>
                    </motion.g>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const NODES = {
  n1: { x: 200, y: 60, r: 34, label: 'TCP', fill: '#6366f1', text: '#fff', d: 0 },
  n2: { x: 80, y: 130, r: 26, label: 'L12', fill: '#3b82f6', text: '#fff', d: 1 },
  n3: { x: 320, y: 130, r: 26, label: 'K&R §3.7', fill: '#0ea5e9', text: '#fff', d: 1 },
  n4: { x: 130, y: 225, r: 26, label: 'AIMD', fill: '#14b8a6', text: '#fff', d: 2 },
  n5: { x: 280, y: 225, r: 28, label: 'Bufferbloat', fill: '#10b981', text: '#fff', d: 2 },
  n6: { x: 200, y: 140, r: 22, label: 'Q6', fill: '#8b5cf6', text: '#fff', d: 0.5 },
  n7: { x: 60, y: 40, r: 22, label: 'BBR', fill: '#f59e0b', text: '#0f172a', d: 1.2 },
}

export { AIOverview }
export default AIOverview
