/**
 * MediXO EduX — Reports Workspace · Tab 3: Generate Reports.
 * Report builder — pick a template, configure scope/period/format, see
 * what's included with live derived numbers, then generate (adds to the
 * library). Supports ?template=<id> deep links from the catalogue.
 */

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, FileBarChart, FileText, ListChecks, Sparkles, Wand2 } from 'lucide-react'
import { useCreateReport, useDownloadReport } from '@/services/extra'
import { Badge, Button, Card, Field, Select, SelectItem, Textarea, useToast } from '@/components/ui'
import { buildReportPreview } from '@/intelligence/faculty'

function ReportsGenerateTab({ data }) {
  const { mutateAsync: createReport } = useCreateReport()
  const { mutateAsync: downloadReport } = useDownloadReport()
  const templates = data.derived.reports?.templates ?? []
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [format, setFormat] = useState('PDF')
  const [scope, setScope] = useState('All courses')
  const [period, setPeriod] = useState('Current')
  const [note, setNote] = useState('')
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState(null)
  const toast = useToast()

  /* ?template=<id> deep link from the catalogue cards. */
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('template')
    if (t && templates.some((x) => x.id === t)) setTemplateId(t)
  }, [templates])

  const template = templates.find((t) => t.id === templateId) ?? templates[0]
  const title = useMemo(() => {
    if (!template) return ''
    const scopeShort = scope === 'All courses' ? 'All Courses' : scope
    return `${template.name} — ${scopeShort} (${period})`
  }, [template, scope, period])

  const preview = useMemo(
    () => (template ? buildReportPreview({ template, derived: data.derived }) : null),
    [template, data.derived]
  )

  const handleGenerate = async () => {
    setCreating(true)
    try {
      const res = await createReport({
        title, format, category: template?.category ?? 'Academic', scope, period,
        template: template?.name, summary: template?.latest ?? 'Generated from the Faculty Intelligence Foundation.',
      })
      if (res?.ok) {
        setCreated(res.report)
        toast.success('Report generated ✨', `"${title}" is ready in your library (${format}).`)
      } else {
        toast.error(res?.error ?? 'Could not generate', 'Please try again.')
      }
    } catch {
      toast.error('Could not generate', 'Please try again in a moment.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Builder */}
      <Card className="p-6">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          <Wand2 className="h-3.5 w-3.5" /> Report builder
        </p>
        <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">Configure & generate</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          Pick a template — the AI assembles the narrative and evidence from your live intelligence foundation.
        </p>

        <div className="mt-6 space-y-4">
          <Field label="Report template">
            <Select value={templateId} onValueChange={setTemplateId}>
              {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Format">
              <Select value={format} onValueChange={setFormat}>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="XLSX">XLSX</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
              </Select>
            </Field>
            <Field label="Scope">
              <Select value={scope} onValueChange={setScope}>
                {['All courses', 'CS501 — DSA', 'CS503 — OS', 'CS505 — ML', 'CS506 — ToC', 'CS501 — Sec A', 'CS503 — Sec B'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </Select>
            </Field>
            <Field label="Period">
              <Select value={period} onValueChange={setPeriod}>
                {['Current', 'Last 4 weeks', 'Last 8 weeks', 'Term 5', 'Academic year'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </Select>
            </Field>
            <Field label="Category">
              <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
                {template?.category ?? '—'}
              </div>
            </Field>
          </div>
          <Field label="Note (optional)">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. For the HOD review on Aug 12 — highlight the CS503 dip…" />
          </Field>

          <div className="rounded-2xl bg-indigo-50/60 p-4 text-[12px] text-indigo-700 dark:bg-indigo-500/5 dark:text-indigo-300">
            <p className="font-bold">Will be generated as</p>
            <p className="mt-1 font-semibold">{title || '—'}</p>
          </div>

          <Button className="w-full" size="lg" onClick={handleGenerate} disabled={creating}>
            {creating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Generating…
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" /> Generate report
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Live preview */}
      <div className="space-y-6">
        <Card className="p-6">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            <ListChecks className="h-3.5 w-3.5" /> What's included
          </p>
          <h3 className="mt-2 text-[15px] font-bold text-slate-900 dark:text-white">{template?.name}</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{template?.description}</p>
          {template?.latest && (
            <div className="mt-3 rounded-2xl bg-indigo-50/60 px-3.5 py-2.5 text-[11.5px] font-semibold text-indigo-700 ring-1 ring-indigo-500/15 dark:bg-indigo-500/10 dark:text-indigo-300">
              {template.latest}
            </div>
          )}
          <div className="mt-4 space-y-2">
            {(template?.includes ?? []).map((inc) => (
              <div key={inc} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3.5 py-2 text-[12px] font-medium text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> {inc}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge variant="secondary" size="sm">{template?.format}</Badge>
            <Badge variant={template?.category === 'Assessment' ? 'gradient' : 'secondary'} size="sm">{template?.category}</Badge>
            <Badge variant="outline" size="sm">Watermarked</Badge>
          </div>
        </Card>

        {/* Generated success */}
        {created && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white shadow-xl shadow-emerald-500/20">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/70">
              <Sparkles className="h-3.5 w-3.5" /> Just generated
            </p>
            <h3 className="mt-2 font-display text-lg font-bold">{created.title}</h3>
            <p className="mt-1 text-[12px] text-white/85">{created.type} · {created.scope} · {created.summary}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="bg-white text-emerald-700 hover:bg-emerald-50" onClick={async () => {
                if (created.generationStatus && created.generationStatus !== 'READY') {
                  toast.error('Not ready', 'Download is available only when the report status is READY.')
                  return
                }
                try {
                  await downloadReport(created)
                } catch {
                  toast.error('Could not download', 'The report file is not ready.')
                }
              }}>
                <FileText className="h-3.5 w-3.5" /> Download
              </Button>
              <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => toast.success('Added to library', `${created.title} is in your report library.`)}>
                <FileBarChart className="h-3.5 w-3.5" /> View in library
              </Button>
            </div>
          </motion.div>
        )}

        {/* Static note */}
        <div className="flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            <span className="font-bold text-indigo-600 dark:text-indigo-300">AI drafting:</span> the narrative section is assembled from your live foundation — teaching health {data.derived.teachingHealth?.score}/100, assessment health {data.derived.assessment?.assessmentHealth?.score}/100, {data.derived.attentionStudents?.total ?? 0} at-risk students. No manual number entry needed.
          </p>
        </div>
      </div>
    </div>
  )
}

export { ReportsGenerateTab }
export default ReportsGenerateTab
