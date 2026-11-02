/**
 * Institutional Reports · Tab 2: Report Generator.
 * Type selector + per-type filters (only relevant ones) → Generate.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileBarChart, Wand2 } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { ReportFilters } from './shared'
import { cn } from '@/utils/cn'

function ReportGenerateTab({ types, onGenerate, presetType }) {
  const [type, setType] = useState(presetType ?? types[0]?.id ?? 'institution')
  const [filters, setFilters] = useState({ period: 'Term 5 · 2026-27' })

  const meta = types.find((t) => t.id === type) ?? types[0]

  const generate = () => onGenerate(meta, filters)

  return (
    <div className="space-y-6">
      {/* Type selector */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {types.map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={cn(
              'rounded-2xl border p-3 text-left transition-all',
              type === t.id
                ? 'border-indigo-400 bg-indigo-50/70 shadow-md dark:border-indigo-500/40 dark:bg-indigo-500/10'
                : 'border-slate-200/70 bg-white shadow-card hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900'
            )}
          >
            <p className={cn('text-[11.5px] font-bold leading-tight', type === t.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200')}>{t.name}</p>
            <p className="mt-0.5 text-[9.5px] text-slate-400">{t.category}</p>
          </button>
        ))}
      </div>

      <motion.div key={type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <ReportFilters type={meta} filters={filters} onChange={setFilters} />
      </motion.div>

      <Card className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-md shadow-indigo-500/25">
            <FileBarChart className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[14px] font-bold text-slate-900 dark:text-white">{meta.name} Report</p>
            <p className="text-[11.5px] text-slate-400">{meta.description}</p>
          </div>
        </div>
        <Button size="lg" onClick={generate}>
          <Wand2 className="h-4 w-4" /> Generate report
        </Button>
      </Card>
    </div>
  )
}

export { ReportGenerateTab }
export default ReportGenerateTab
