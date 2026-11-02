/**
 * Executive AI — institution context + AI insight cards panel.
 * All values derive from the intelligence snapshot (no hardcoded metrics).
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, BrainCircuit, Building2, CheckCircle2, Info, Users } from 'lucide-react'
import { Badge, Card } from '@/components/ui'

const INSIGHT_CATEGORY = {
  Academic: { dot: '#6366f1', Icon: Info },
  Students: { dot: '#10b981', Icon: Users },
  Faculty: { dot: '#f59e0b', Icon: BrainCircuit },
  Assessment: { dot: '#f43f5e', Icon: Info },
  Attendance: { dot: '#e11d48', Icon: AlertTriangle },
  Department: { dot: '#8b5cf6', Icon: Building2 },
  Outcomes: { dot: '#0ea5e9', Icon: CheckCircle2 },
}

function ContextPanel({ data, insights, onSaveInsight }) {
  const d = data.derived
  const health = d.institutionHealth ?? {}
  const pillars = health.pillars ?? []
  const students = d.students ?? {}
  const departments = d.departments ?? {}
  const interventions = d.interventions?.list ?? []
  const weakest = [...pillars].sort((a, b) => a.value - b.value)[0]

  const pillarOf = (label) => pillars.find((p) => p.label === label)?.value ?? '—'

  return (
    <div className="space-y-4">
      {/* Institution context */}
      <Card className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Institution context</p>
        <div className="mt-3 space-y-2.5">
          {[
            { label: 'Institution health', value: `${health.score ?? '—'}/100`, tone: 'text-indigo-600 dark:text-indigo-400' },
            { label: 'Student success', value: String(pillarOf('Student success')), tone: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Faculty health', value: String(pillarOf('Faculty health')), tone: 'text-amber-600 dark:text-amber-400' },
            { label: 'Assessment health', value: String(pillarOf('Assessment health')), tone: 'text-rose-600 dark:text-rose-400' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">{row.label}</span>
              <span className={`font-display text-sm font-bold ${row.tone}`}>{row.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800">
            <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Students at risk</span>
            <span className="font-display text-sm font-bold text-rose-500">{students.totals?.activeRisk ?? '—'} · {students.riskSummary?.latestRate ?? '—'}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">Dept needing attention</span>
            <span className="font-display text-sm font-bold text-amber-500">{departments.worst?.code ?? '—'} · {departments.worst?.score ?? '—'}</span>
          </div>
          {weakest && (
            <div className="mt-1 flex items-start gap-2 rounded-2xl bg-amber-50/70 p-3 dark:bg-amber-500/5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-800 dark:text-slate-100">Current priority:</span> {weakest.label} ({weakest.value}/100) requires attention.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* AI insight cards */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">AI insights</p>
          <Badge variant="outline" size="sm">from intelligence data</Badge>
        </div>
        <div className="mt-3 space-y-2.5">
          {insights.slice(0, 4).map((ins, i) => {
            const meta = INSIGHT_CATEGORY[ins.category] ?? { dot: '#94a3b8', Icon: Info }
            return (
              <motion.div key={ins.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: `${meta.dot}1a`, color: meta.dot }}>
                        <meta.Icon className="h-3 w-3" />
                      </span>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{ins.category}</p>
                    </div>
                    <Badge variant={ins.priority === 'Critical' ? 'danger' : ins.priority === 'High' ? 'warning' : 'success'} size="sm">{ins.priority ?? 'Info'}</Badge>
                  </div>
                  <p className="mt-1.5 text-[12px] font-semibold leading-snug text-slate-700 dark:text-slate-200">{ins.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{ins.body ?? ins.reason}</p>
                  {ins.action && <p className="mt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">→ {ins.action}</p>}
                </div>
              </motion.div>
            )
          })}
        </div>
        <Link to="/admin/reports" className="mt-3 flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
          Explore reports <ArrowRight className="h-3 w-3" />
        </Link>
      </Card>

      {/* Interventions snapshot */}
      <Card className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Active interventions</p>
        <div className="mt-3 space-y-2">
          {interventions.slice(0, 4).map((i) => (
            <div key={i.id} className="flex items-center gap-2.5">
              <Badge variant={i.priority === 'Critical' ? 'danger' : i.priority === 'High' ? 'warning' : 'secondary'} size="sm" className="shrink-0">{i.priority}</Badge>
              <p className="truncate text-[11.5px] font-semibold text-slate-600 dark:text-slate-300" title={i.reason}>{i.category}</p>
            </div>
          ))}
        </div>
        <Link to="/admin/institution-intelligence?tab=risk" className="mt-3 flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
          Open intervention center <ArrowRight className="h-3 w-3" />
        </Link>
      </Card>
    </div>
  )
}

export { ContextPanel }
export default ContextPanel
