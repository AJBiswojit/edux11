/**
 * Institutional Reports · Tab 4: Department Comparison Report.
 * Multi-select departments → live comparison document (table, bars,
 * strengths, weaknesses, ranking, recommended focus).
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2 } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { buildReportPreviewDoc } from '@/intelligence/admin'
import { PreviewDoc } from './shared'
import { cn } from '@/utils/cn'

function DepartmentCompareTab({ data, onExport, onPrint, onSave }) {
  const departments = data.derived.departments?.list ?? []
  const [selected, setSelected] = useState(['CSE', 'ECE', 'MBA', 'DES'])

  const toggle = (code) => setSelected((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]))

  const doc = buildReportPreviewDoc({
    type: 'departments',
    derived: data.derived,
    datasets: data.datasets,
    filters: { departments: selected, period: 'Term 5 · 2026-27' },
  })

  return (
    <div className="space-y-6">
      {/* Selector */}
      <Card className="p-5">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          <Building2 className="h-3.5 w-3.5" /> Select departments to compare
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {departments.map((d) => {
            const active = selected.includes(d.code)
            return (
              <button
                key={d.code}
                onClick={() => toggle(d.code)}
                aria-pressed={active}
                className={cn(
                  'rounded-full px-4 py-2 text-xs font-bold transition-all',
                  active
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                    : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                )}
              >
                {d.code} · {d.score}/100
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-[10.5px] text-slate-400">{selected.length} selected · the document updates live</p>
      </Card>

      {/* Ranking strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Highest health', value: departments.filter((d) => selected.includes(d.code)).sort((a, b) => b.score - a.score)[0]?.code ?? '—' },
          { label: 'Lowest health', value: departments.filter((d) => selected.includes(d.code)).sort((a, b) => a.score - b.score)[0]?.code ?? '—' },
          { label: 'Range', value: (() => {
            const s = departments.filter((d) => selected.includes(d.code)).map((d) => d.score)
            return s.length ? `${Math.min(...s)}–${Math.max(...s)}` : '—'
          })() },
        ].map((r, i) => (
          <motion.div key={r.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-slate-200/70 bg-white p-4 text-center shadow-card dark:border-slate-800 dark:bg-slate-900">
            <p className="font-display text-lg font-bold text-indigo-600 dark:text-indigo-400">{r.value}</p>
            <p className="text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">{r.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => onExport('pdf')}>Export PDF (simulated)</Button>
        <Button size="sm" variant="outline" onClick={onPrint}>Print</Button>
        <Button size="sm" variant="ghost" onClick={() => onSave(doc)}>Save to library</Button>
      </div>

      <PreviewDoc doc={doc} footerNote="Department comparison · generated live from the institution intelligence foundation." />
    </div>
  )
}

export { DepartmentCompareTab }
export default DepartmentCompareTab
