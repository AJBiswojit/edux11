/**
 * Institutional Reports — shared bits: report cards, filter bar and the
 * formal preview-document renderer (blocks: kpi-row, bars, line, donut,
 * table, list, alert).
 */

import { motion } from 'framer-motion'
import { ArrowRight, FileText, Info } from 'lucide-react'
import {  } from 'react-router-dom'
import { BarCompare, DonutChart, LineTrend } from '@/components/charts'
import { Badge, Button, Card } from '@/components/ui'

const REPORT_ICONS = {
  Landmark: '🏛️', BookOpen: '📚', Users: '🎓', GraduationCap: '👨‍🏫',
  ClipboardList: '📝', Building2: '🏢', AlertTriangle: '🚨', TrendingUp: '📈',
}

/* ---------- report catalog card ---------- */
export function ReportCard({ type, lastUpdated, onGenerate, onView }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="group h-full p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
        <div className="flex items-start justify-between gap-2">
          <span className="text-2xl">{REPORT_ICONS[type.icon] ?? '📄'}</span>
          <Badge variant={type.category === 'Executive' ? 'gradient' : type.category === 'Management' ? 'warning' : 'secondary'} size="sm">{type.category}</Badge>
        </div>
        <h3 className="mt-3 text-[15px] font-bold text-slate-900 dark:text-white">{type.name} Report</h3>
        <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">{type.description}</p>
        <p className="mt-2 text-[10.5px] font-medium text-slate-400">Last updated · {lastUpdated}</p>
        <div className="mt-3.5 flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => onGenerate(type)}>Generate</Button>
          <Button size="sm" variant="outline" onClick={() => onView(type)}>View</Button>
        </div>
      </Card>
    </motion.div>
  )
}

/* ---------- template card ---------- */
export function TemplateCard({ template, onUse }) {
  return (
    <Card className="flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
        <FileText className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{template.name}</p>
        <p className="truncate text-[10.5px] text-slate-400">{template.category} · {template.includes.length} sections</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => onUse(template)}>Use template</Button>
    </Card>
  )
}

/* ---------- filter bar (per-type, only relevant filters) ---------- */
export function ReportFilters({ type, filters, onChange }) {
  const meta = type
  const shown = (meta?.filters ?? [])

  const set = (key, value) => onChange({ ...filters, [key]: value })
  const chip = (label, active, onClick) => (
    <button
      key={label}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${active ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-2.5 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Filters · {meta.name} Report</p>
      <div className="flex flex-wrap items-center gap-2">
        {shown.includes('yearRange') && ['Term 5 · 2026-27', 'Academic Year 2026-27'].map((y) => chip(y, (filters.yearRange ?? 'Term 5 · 2026-27') === y, () => set('yearRange', y)))}
        {shown.includes('department') && ['All', 'CSE', 'ECE', 'ME', 'EE', 'CE', 'MBA', 'DES', 'MATH'].map((d) => chip(d === 'All' ? 'All departments' : d, (filters.department ?? 'All') === d, () => set('department', d)))}
        {shown.includes('departmentMulti') && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-slate-400">Departments:</span>
            {['CSE', 'ECE', 'ME', 'EE', 'CE', 'MBA', 'DES', 'MATH'].map((d) => {
              const active = (filters.departments ?? ['CSE']).includes(d)
              return chip(d, active, () => {
                const cur = filters.departments ?? ['CSE']
                set('departments', active ? cur.filter((x) => x !== d) : [...cur, d])
              })
            })}
          </div>
        )}
        {shown.includes('program') && ['All programs', 'B.Tech CSE', 'B.Tech ECE', 'B.Tech ME', 'MBA'].map((p) => chip(p, (filters.program ?? 'All programs') === p, () => set('program', p)))}
        {!shown.length && <span className="text-[12px] text-slate-400">Institution-level report — no filters required.</span>}
      </div>
    </div>
  )
}

/* ---------- formal document renderer ---------- */
export function PreviewDoc({ doc, footerNote }) {
  const renderBlock = (block) => {
    switch (block.kind) {
      case 'kpi-row':
        return (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {block.items.map((k) => (
              <div key={k.label} className="rounded-2xl bg-slate-50 p-3.5 text-center dark:bg-slate-800/50">
                <p className="font-display text-lg font-bold text-slate-900 dark:text-white">{k.value}</p>
                <p className="text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
              </div>
            ))}
          </div>
        )
      case 'bars':
        return (
          <BarCompare
            data={block.data}
            xKey="label"
            height={210}
            series={[{ key: block.xKey, name: block.seriesName, color: block.color }]}
            formatter={(v) => (block.seriesName.includes('%') ? `${v}%` : `${v}`)}
          />
        )
      case 'line':
        return (
          <LineTrend
            data={block.data}
            xKey="label"
            height={200}
            series={[
              { key: block.xKey, name: block.seriesName, color: block.color },
              ...(block.secondKey ? [{ key: block.secondKey, name: block.seriesName.replace('%', '') + ' (overall)', color: '#14b8a6' }] : []),
            ]}
            formatter={(v) => `${v}%`}
          />
        )
      case 'donut':
        return (
          <div className="mx-auto max-w-sm">
            <DonutChart data={block.data} height={210} />
          </div>
        )
      case 'table':
        return (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  {block.headers.map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    {row.map((cell, j) => <td key={j} className="px-3 py-2 text-[12.5px] text-slate-600 dark:text-slate-300">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      case 'list':
        return (
          <ul className="space-y-1.5">
            {block.items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[12.5px] text-slate-600 dark:text-slate-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" /> {item}
              </li>
            ))}
          </ul>
        )
      case 'alert':
        return (
          <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/70 p-3.5 dark:bg-amber-500/5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{block.body}</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900 sm:p-10">
      {/* header */}
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">MediXO EduX · Institutional Reporting</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">{doc.title}</h2>
          </div>
          <div className="text-right text-[10.5px] font-medium text-slate-400">
            <p>{doc.meta?.institution}</p>
            <p>Period · {doc.meta?.period}</p>
            <p>Generated · {new Date(doc.meta?.generatedAt).toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="space-y-7 pt-6">
        {(doc.sections ?? []).map((block, i) => (
          <section key={i}>
            <h3 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-slate-900 dark:text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">{i + 1}</span>
              {block.heading}
              {block.subtitle && <span className="text-[11px] font-medium text-slate-400">· {block.subtitle}</span>}
            </h3>
            {renderBlock(block)}
          </section>
        ))}
      </div>

      {/* footer */}
      <div className="mt-8 border-t border-slate-200 pt-4 text-[10.5px] leading-relaxed text-slate-400 dark:border-slate-800">
        <p>Generated from the MediXO EduX Institution Intelligence Foundation.</p>
        <p className="mt-1">{footerNote}</p>
      </div>
    </div>
  )
}

export function PreviewActions({ onExport, onPrint, onSave }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => onExport('pdf')}>Export PDF (simulated)</Button>
      <Button size="sm" variant="outline" onClick={() => onExport('excel')}>Export Excel (simulated)</Button>
      <Button size="sm" variant="outline" onClick={() => onExport('csv')}>Export CSV (simulated)</Button>
      <Button size="sm" variant="outline" onClick={onPrint}><ArrowRight className="mr-1 h-3.5 w-3.5 rotate-90" /> Print</Button>
      <Button size="sm" variant="ghost" onClick={onSave}>Save to library</Button>
    </div>
  )
}
