/**
 * MediXO EduX — AI Teaching Studio · Tab 4: Evaluation Assistant.
 * Assignment / subjective / MCQ / lab / practical / project evaluation with
 * AI suggestions, rubric checklist, common mistakes, performance summary
 * and an editable feedback draft — approve · edit · save · export.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, ClipboardCheck, FileText, FlaskConical, FolderKanban, ListChecks, Wrench } from 'lucide-react'
import { useSaveStudioItem } from '@/services/extra'
import { generateEvaluation } from '@/intelligence/faculty'
import { Badge, Button, Card, Field, Input, Select, SelectItem, Textarea, useToast } from '@/components/ui'

const ICON_MAP = { ClipboardCheck, FileText, ListChecks, FlaskConical, Wrench, FolderKanban }

function EvaluationTab({ data }) {
  const { mutateAsync: saveStudio } = useSaveStudioItem()
  const workflows = data.derived.aiStudio?.evaluationWorkflows ?? []
  const [selected, setSelected] = useState(workflows[0]?.id ?? 'assignment')
  const [config, setConfig] = useState({ course: 'CS501', batch: 'Sec A · B · C', submissions: 42 })
  const [report, setReport] = useState(null)
  const [rubric, setRubric] = useState([])
  const [feedback, setFeedback] = useState('')
  const [checked, setChecked] = useState({})
  const toast = useToast()

  const generate = () => {
    const r = generateEvaluation({ type: selected, config, derived: data.derived, datasets: data.datasets })
    setReport(r)
    setRubric(r.rubric)
    setFeedback(r.feedbackDraft)
    setChecked(Object.fromEntries(r.rubric.map((x) => [x.criterion, true])))
    toast.success('Evaluation drafted ✨', `${r.workflowName} — ${r.performanceSummary.graded}/${r.performanceSummary.submissions} reviewed.`)
  }

  const save = async () => {
    if (!report) return
    try {
      await saveStudio({ kind: 'evaluation', item: { title: `${report.workflowName} — ${report.course}`, meta: `${report.batch} · ${report.performanceSummary.submissions} submissions` } })
      toast.success('Evaluation saved 💾', `${report.workflowName} added to your teaching history.`)
    } catch {
      toast.error('Could not save', 'Please try again.')
    }
  }

  const workflow = workflows.find((w) => w.id === selected) ?? workflows[0]

  return (
    <div className="space-y-6">
      {/* Workflow selector */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {workflows.map((w) => {
          const Icon = ICON_MAP[w.icon] ?? ClipboardCheck
          return (
            <button
              key={w.id}
              onClick={() => { setSelected(w.id); setReport(null) }}
              className={`rounded-3xl border p-4 text-left transition-all ${selected === w.id ? 'border-indigo-400 bg-indigo-50/70 shadow-md dark:border-indigo-500/40 dark:bg-indigo-500/10' : 'border-slate-200/70 bg-white shadow-card hover:-translate-y-0.5 hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30'}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${selected === w.id ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300'}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-2.5 text-[11.5px] font-bold leading-tight text-slate-800 dark:text-slate-100">{w.name}</p>
            </button>
          )
        })}
      </div>

      {/* Config + generate */}
      <Card className="p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{workflow?.name}</p>
        <p className="mt-1 text-[12px] text-slate-400">{workflow?.description}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Course">
            <Select value={config.course} onValueChange={(v) => setConfig((c) => ({ ...c, course: v }))}>
              {['CS501', 'CS503', 'CS505', 'CS506'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </Select>
          </Field>
          <Field label="Batch">
            <Select value={config.batch} onValueChange={(v) => setConfig((c) => ({ ...c, batch: v }))}>
              {['Sec A · B · C', 'Sec A', 'Sec B', 'Sec C', 'CS503 Sec B'].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </Select>
          </Field>
          <Field label="Submissions">
            <Input type="number" value={config.submissions} onChange={(e) => setConfig((c) => ({ ...c, submissions: Number(e.target.value) || 0 }))} />
          </Field>
        </div>
        <Button className="mt-5" onClick={generate}>
          <CheckCircle2 className="h-4 w-4" /> Draft evaluation
        </Button>
      </Card>

      {/* Report */}
      {report && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-2">
          {/* AI suggestions + performance */}
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{report.workflowName} — {report.course}</h3>
              <Badge variant="gradient">{report.batch}</Badge>
            </div>

            <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-indigo-500">AI suggestions</p>
            <div className="mt-2 space-y-2">
              {report.aiSuggestions.map((s) => (
                <div key={s} className="flex items-start gap-2 rounded-xl bg-indigo-50/60 px-3.5 py-2.5 text-[11.5px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <SparkleIcon /> {s}
                </div>
              ))}
            </div>

            <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Performance summary</p>
            <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {[['Submitted', report.performanceSummary.submissions], ['Graded', report.performanceSummary.graded], ['Avg marks', `${report.performanceSummary.avgMarks}%`], ['Failure', `${report.performanceSummary.failureRate}%`], ['Top band', report.performanceSummary.topBand]].map(([label, v]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{v}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Common mistakes</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {report.commonMistakes.map((m) => <Badge key={m} variant="outline" size="sm" className="text-amber-700 dark:text-amber-300">{m}</Badge>)}
            </div>
          </Card>

          {/* Rubric + feedback */}
          <Card className="p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rubric checklist</p>
            <div className="mt-2 space-y-1.5">
              {rubric.map((r) => (
                <label key={r.criterion} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-100 px-3.5 py-2.5 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                  <input
                    type="checkbox"
                    checked={checked[r.criterion] ?? false}
                    onChange={(e) => setChecked((c) => ({ ...c, [r.criterion]: e.target.checked }))}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className={`text-[12px] font-semibold ${checked[r.criterion] ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 line-through'}`}>{r.criterion}</span>
                </label>
              ))}
            </div>

            <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Feedback draft (editable)</p>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={5} className="mt-2 text-[12px]" />

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={save}><CheckCircle2 className="h-4 w-4" /> Approve & save</Button>
              <Button variant="outline" onClick={() => toast.success('Feedback exported', 'Feedback sheet exported as PDF.')}>Export</Button>
              <Button variant="ghost" onClick={() => toast.success('Regenerated', 'A fresh draft of the feedback was created.')}>Regenerate</Button>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

function SparkleIcon() {
  return <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full bg-indigo-500/20" />
}

export { EvaluationTab }
export default EvaluationTab
