/**
 * MediXO EduX — Institution Command Center · Section 6: Academic Performance
 * Trend. Metric switcher (at-risk · attendance · semester CGPA) rendered
 * with the existing chart components — fully responsive.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AreaTrend, BarCompare } from '@/components/charts'
import { ChartCard } from '@/components/shared/chart-card'
import { cn } from '@/utils/cn'

function PerformanceTrend({ data }) {
  const students = data.derived.students ?? {}
  const attendance = data.derived.attendance ?? {}
  const analytics = data.datasets?.analytics?.adminAnalytics ?? {}

  const [metric, setMetric] = useState('at-risk')

  const METRICS = [
    { id: 'at-risk', label: 'At-risk trend', desc: '% students flagged · institution roll-up' },
    { id: 'attendance', label: 'Attendance', desc: 'Institution-wide monthly %' },
    { id: 'cgpa', label: 'Semester CGPA', desc: 'Institution average by semester' },
  ]

  return (
    <ChartCard
      title="Academic performance trend"
      subtitle={METRICS.find((m) => m.id === metric)?.desc}
      className="h-full"
      actions={
        <div className="flex rounded-xl border border-slate-200/80 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/50">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-[10.5px] font-bold transition-all',
                metric === m.id ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              )}
            >
              {m.label.split(' ')[0]}
            </button>
          ))}
        </div>
      }
    >
      <div className="min-w-0">
        {metric === 'at-risk' && (
          <motion.div key="at-risk" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AreaTrend
              data={(students.riskTrend ?? []).map((r) => ({ label: r.month, value: r.atRisk }))}
              xKey="label"
              height={240}
              series={[{ key: 'value', name: 'At-risk %', color: '#f43f5e' }]}
              formatter={(v) => `${v}%`}
            />
          </motion.div>
        )}
        {metric === 'attendance' && (
          <motion.div key="attendance" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AreaTrend
              data={(attendance.trend ?? []).map((t) => ({ label: t.month, value: t.pct }))}
              xKey="label"
              height={240}
              series={[{ key: 'value', name: 'Attendance %', color: '#6366f1' }]}
              formatter={(v) => `${v}%`}
            />
          </motion.div>
        )}
        {metric === 'cgpa' && (
          <motion.div key="cgpa" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BarCompare
              data={(analytics.semesterWise ?? []).map((s) => ({ label: s.sem.replace('Sem ', 'S'), value: s.cgpa }))}
              xKey="label"
              height={240}
              series={[{ key: 'value', name: 'Avg CGPA', color: '#14b8a6' }]}
              formatter={(v) => v.toFixed(1)}
            />
          </motion.div>
        )}
      </div>
    </ChartCard>
  )
}

export { PerformanceTrend }
export default PerformanceTrend
