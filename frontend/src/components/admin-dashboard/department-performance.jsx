/**
 * MediXO EduX — Institution Command Center · Section 4: Exam performance.
 * Overall JEE / NEET health across all students. Expand a family for the
 * course subjects (JEE: Physics · Chemistry · Mathematics, NEET: Physics ·
 * Chemistry · Biology).
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, ChevronDown, Users } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { Badge, Button } from '@/components/ui'
import { cn } from '@/utils/cn'

const GRADE_VARIANT = { Excellent: 'success', Good: 'info', 'At Risk': 'warning', Critical: 'danger', Building: 'secondary' }

function pct(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value)}%`
}

function ExamFamilyRow({ family, open, onToggle }) {
  const score = family.score ?? 0
  const expanded = open === family.code

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className={cn('rounded-2xl border transition-all', expanded ? 'border-indigo-300 bg-indigo-50/40 dark:border-indigo-500/40 dark:bg-indigo-500/10' : 'border-slate-100 hover:border-indigo-200 dark:border-slate-800 dark:hover:border-indigo-500/30')}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
            <BookOpen className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{family.code}</p>
              <Badge variant={GRADE_VARIANT[family.grade] ?? 'secondary'} size="sm">{family.grade}</Badge>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400"
                  style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                />
              </div>
              <span className="shrink-0 text-[12px] font-bold text-indigo-600 dark:text-indigo-400">{family.accuracy != null ? family.accuracy : '—'}</span>
            </div>
          </div>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', expanded && 'rotate-180')} />
        </button>

        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
            <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="truncate text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">{family.name}</p>
              <p className="mt-0.5 text-[10.5px] text-slate-400">
                {(family.subjectsExpected ?? family.subjects?.map((s) => s.name) ?? []).join(' · ') || 'Course subjects'}
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: 'Accuracy', value: pct(family.accuracy) },
                  { label: 'Pass rate', value: pct(family.passRate) },
                  { label: 'Attempts', value: String(family.attempts ?? 0) },
                  { label: 'Students', value: String(family.students ?? 0) },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-slate-50 px-2.5 py-2 text-center dark:bg-slate-800/50">
                    <p className="text-[12.5px] font-bold text-slate-800 dark:text-white">{s.value}</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Subject deep dive</p>
              <div className="mt-2 space-y-2">
                {(family.subjects ?? []).map((subject) => (
                  <div key={subject.name} className="rounded-xl bg-white/70 px-3 py-2 ring-1 ring-slate-100 dark:bg-slate-900/40 dark:ring-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{subject.name}</p>
                      <Badge variant={GRADE_VARIANT[subject.grade] ?? 'secondary'} size="sm">{subject.grade}</Badge>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400"
                          style={{ width: `${Math.max(0, Math.min(100, subject.score ?? 0))}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-slate-600 dark:text-slate-300">{subject.accuracy != null ? subject.accuracy : '—'}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Pass {pct(subject.passRate)} · {subject.attempts ?? 0} attempts · {subject.students ?? 0} students
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

function DepartmentPerformance({ data }) {
  const pack = data.derived.examFamilies ?? {}
  const families = pack.list ?? []
  const overall = pack.overall ?? {}
  const [open, setOpen] = useState(null)

  return (
    <ChartCard
      title="Exam performance"
      subtitle="Overall student performance · JEE and NEET · subject deep dive"
      className="h-full"
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/students">All students <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Button>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'Overall accuracy', value: pct(overall.accuracy) },
          { label: 'Overall pass rate', value: pct(overall.passRate) },
          { label: 'Attempts', value: String(overall.attempts ?? 0) },
          { label: 'Students with exams', value: String(overall.students ?? 0) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-slate-50 px-2.5 py-2 text-center dark:bg-slate-800/50">
            <p className="text-[13px] font-bold text-slate-800 dark:text-white">{s.value}</p>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {families.map((family) => (
          <ExamFamilyRow
            key={family.code}
            family={family}
            open={open}
            onToggle={() => setOpen(open === family.code ? null : family.code)}
          />
        ))}
        {!families.length ? (
          <p className="flex items-center gap-2 px-1 py-6 text-[12px] text-slate-400">
            <Users className="h-4 w-4" /> JEE and NEET performance will appear after students complete exams.
          </p>
        ) : null}
      </div>
    </ChartCard>
  )
}

export { DepartmentPerformance }
export default DepartmentPerformance
