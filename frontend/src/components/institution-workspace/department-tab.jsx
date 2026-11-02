/**
 * Institution Intelligence Workspace · Tab 7: Department Intelligence.
 * Expandable department drill-down — health, students, faculty, courses,
 * attendance, academic performance, placement, HOD. No invented data.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, ChevronDown, Users } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { BarCompare } from '@/components/charts'
import { Badge } from '@/components/ui'
import { cn } from '@/utils/cn'
import { KpiStrip, WorkspaceSection } from './shared'

const GRADE_VARIANT = { Excellent: 'success', Good: 'info', 'At Risk': 'warning', Critical: 'danger' }

function DepartmentTab({ data }) {
  const d = data.derived
  const departments = d.departments ?? {}
  const [open, setOpen] = useState('CSE')

  return (
    <div>
      <KpiStrip
        cols={3}
        items={[
          { label: 'Departments', value: String(departments.list?.length ?? '—'), sub: 'across the institution' },
          { label: 'Average health', value: `${departments.avgScore ?? '—'}/100`, sub: 'across all departments' },
          { label: 'Best · Worst', value: `${departments.best?.code ?? '—'} · ${departments.worst?.code ?? '—'}`, sub: `${departments.best?.score ?? '—'} · ${departments.worst?.score ?? '—'}` },
        ]}
      />

      {/* Comparison charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Pass rate by department" className="min-w-0">
          <BarCompare
            data={(departments.list ?? []).map((x) => ({ label: x.code, pass: x.passRate }))}
            xKey="label"
            height={200}
            series={[{ key: 'pass', name: 'Pass %', color: '#10b981' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>
        <ChartCard title="Attendance by department" className="min-w-0">
          <BarCompare
            data={(departments.list ?? []).map((x) => ({ label: x.code, att: x.attendance }))}
            xKey="label"
            height={200}
            series={[{ key: 'att', name: 'Attendance %', color: '#6366f1' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>
        <ChartCard title="Placement by department" className="min-w-0">
          <BarCompare
            data={(departments.list ?? []).map((x) => ({ label: x.code, place: x.placement }))}
            xKey="label"
            height={200}
            series={[{ key: 'place', name: 'Placement %', color: '#8b5cf6' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>
      </div>

      {/* Drill-down list */}
      <WorkspaceSection title="Department drill-down" subtitle="Select a department to inspect full intelligence">
        <div className="space-y-2">
          {(departments.list ?? []).map((dp) => (
            <motion.div key={dp.code} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className={cn('rounded-2xl border transition-all', open === dp.code ? 'border-indigo-300 bg-indigo-50/40 dark:border-indigo-500/40 dark:bg-indigo-500/10' : 'border-slate-100 hover:border-indigo-200 dark:border-slate-800 dark:hover:border-indigo-500/30')}>
                <button
                  onClick={() => setOpen(open === dp.code ? null : dp.code)}
                  aria-expanded={open === dp.code}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{dp.code} · {dp.name}</p>
                      <Badge variant={GRADE_VARIANT[dp.grade] ?? 'secondary'} size="sm">{dp.grade}</Badge>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-1.5 max-w-[260px] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" style={{ width: `${dp.score}%` }} />
                      </div>
                      <span className="shrink-0 text-[12px] font-bold text-indigo-600 dark:text-indigo-400">{dp.score}/100</span>
                    </div>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open === dp.code && 'rotate-180')} />
                </button>

                {open === dp.code && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
                        {[
                          { label: 'Students', value: String(dp.students), icon: Users },
                          { label: 'Faculty', value: String(dp.faculty) },
                          { label: 'Programs', value: String(dp.programs) },
                          { label: 'Pass rate', value: `${dp.passRate}%` },
                          { label: 'Attendance', value: `${dp.attendance}%` },
                          { label: 'Placement', value: `${dp.placement}%` },
                        ].map((s) => (
                          <div key={s.label} className="rounded-xl bg-white/70 px-3 py-2.5 text-center dark:bg-slate-900/60">
                            {s.icon && <s.icon className="mx-auto h-3.5 w-3.5 text-indigo-400" />}
                            <p className="mt-0.5 text-[13px] font-bold text-slate-800 dark:text-white">{s.value}</p>
                            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">HOD · {dp.hod}</p>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-slate-400">
                        {dp.code === departments.worst?.code
                          ? 'Flagged: lowest department health — schedule an HOD review on pass rate and placement strategy.'
                          : dp.code === departments.best?.code
                            ? 'Leading department — its playbook is worth sharing at the next HOD meeting.'
                            : 'Health is above the institutional average — continue the current trajectory.'}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </WorkspaceSection>
    </div>
  )
}

export { DepartmentTab }
export default DepartmentTab
