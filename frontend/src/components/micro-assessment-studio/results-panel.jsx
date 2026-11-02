import { useState } from 'react'
import { AlertTriangle, BarChart3, CheckCircle2, ChevronDown, ChevronUp, Eye, Lightbulb, Target, Users } from 'lucide-react'
import { Badge, Button, Card, Progress } from '@/components/ui'
import { EmptyState } from '@/components/shared/empty-state'

function ResultMetric({ label, value, sub, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  }
  return <div className={`rounded-2xl p-3.5 ${tones[tone] ?? tones.indigo}`}><p className="text-[10px] font-bold uppercase tracking-wider opacity-75">{label}</p><p className="mt-1 font-display text-xl font-bold">{value}</p>{sub && <p className="mt-0.5 text-[10.5px] font-medium opacity-75">{sub}</p>}</div>
}

function QuestionInsight({ row }) {
  const [open, setOpen] = useState(false)
  const [responsesOpen, setResponsesOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900">
      <button type="button" className="flex w-full items-start gap-3 p-3.5 text-left" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <Badge variant="secondary" size="sm">{row.label ?? row.id.split('-').slice(-1)[0] ?? 'Q'}</Badge>
        <div className="min-w-0 flex-1"><p className="line-clamp-2 text-[12px] font-semibold leading-relaxed text-slate-800 dark:text-slate-100">{row.question}</p><p className="mt-1 text-[10.5px] font-medium text-slate-400">{row.correctPercent == null ? 'No responses' : `${row.correctPercent}% correct`} · {row.concept} · {row.difficulty} · {row.questionType}</p></div>
        {open ? <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
      </button>
      {open && <div className="border-t border-slate-100 px-3.5 pb-3.5 pt-3 dark:border-slate-800"><div className="grid gap-2 text-[11px] sm:grid-cols-4"><div><span className="font-bold text-slate-400">Accuracy</span><p className="mt-0.5 font-bold text-slate-700 dark:text-slate-200">{row.correctPercent == null ? '—' : `${row.correctPercent}%`}</p></div><div><span className="font-bold text-slate-400">Concept</span><p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{row.concept}</p></div><div><span className="font-bold text-slate-400">Difficulty</span><p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{row.difficulty}</p></div><div><span className="font-bold text-slate-400">Question Type</span><p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{row.questionType}</p></div></div><Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setResponsesOpen((value) => !value)}><Eye className="h-3 w-3" /> {responsesOpen ? 'Hide Responses' : `View Responses (${row.responses})`}</Button>{responsesOpen && <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">{row.correct} correct · {row.incorrect} incorrect · aggregate prototype response counts only.</div>}</div>}
    </div>
  )
}

export function ResultsPanel({ result, assessment, onCreateIntervention, interventionCreated, creatingIntervention, onViewStudents }) {
  const [dismissed, setDismissed] = useState(false)
  if (!result) return null
  const recommendation = result.interventionRecommendation
  return (
    <div className="space-y-5">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Step 7 · Results / Insights</p><h2 className="mt-1 text-[17px] font-bold text-slate-900 dark:text-white">{assessment?.title ?? 'Micro-assessment results'}</h2><p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">A lightweight formative readout connected to {assessment?.chapter} · {assessment?.topic}.</p></div><Badge variant="success" size="sm"><CheckCircle2 className="h-3 w-3" /> Assessment Sent</Badge>
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
          <ResultMetric label="Students completed" value={result.studentsCompleted} sub={`of ${result.studentsTargeted} targeted`} tone="indigo" />
          <ResultMetric label="Average accuracy" value={result.averageAccuracy == null ? '—' : `${result.averageAccuracy}%`} sub="completed responses" tone="teal" />
          <ResultMetric label="Most difficult concept" value={result.mostDifficultConcept?.concept ?? '—'} sub={result.mostDifficultConcept?.accuracy == null ? 'awaiting responses' : `${result.mostDifficultConcept.accuracy}% accuracy`} tone="amber" />
        </div>
        {!result.studentsCompleted ? (
          <div className="mt-4"><EmptyState compact icon={Users} title="No completed assessments yet" description="Student responses will appear here after learners submit the formative assessment." /></div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3.5 py-3 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300"><BarChart3 className="h-4 w-4 text-indigo-500" /> Most missed: <span className="text-slate-800 dark:text-white">{result.mostMissedQuestion?.label ?? '—'}</span><span className="text-slate-400">·</span>{result.mostMissedQuestion?.correctPercent == null ? '—' : `${result.mostMissedQuestion.correctPercent}% correct`}<span className="ml-auto text-[10px] font-medium text-slate-400">Responses stay aggregate in this prototype.</span></div>
        )}
      </Card>

      {result.studentsCompleted > 0 && <Card className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300"><Target className="h-3.5 w-3.5 text-indigo-500" /> Concept Performance</p><p className="mt-1 text-[12px] text-slate-400">Accuracy by the concepts used to build this assessment.</p></div><Badge variant="outline" size="sm">{result.conceptPerformance.length} concepts</Badge></div><div className="mt-4 space-y-3">{result.conceptPerformance.map((row) => <div key={row.concept} className="flex items-center gap-3"><span className="w-36 shrink-0 truncate text-[12px] font-semibold text-slate-700 dark:text-slate-200" title={row.concept}>{row.concept}</span><Progress value={row.accuracy ?? 0} className="flex-1" /><span className={`w-11 text-right text-[11px] font-bold ${row.accuracy != null && row.accuracy < 70 ? 'text-rose-600 dark:text-rose-300' : 'text-slate-500 dark:text-slate-300'}`}>{row.accuracy == null ? '—' : `${row.accuracy}%`}</span></div>)}</div></Card>}

      {result.studentsCompleted > 0 && <Card className="p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><div><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300"><BarChart3 className="h-3.5 w-3.5 text-indigo-500" /> Question-level insight</p><p className="mt-1 text-[12px] text-slate-400">Expand a question for accuracy, concept, difficulty and type.</p></div><Badge variant="secondary" size="sm">{result.questions.length} questions</Badge></div><div className="mt-4 space-y-2">{result.questions.map((row) => <QuestionInsight key={row.id} row={row} />)}</div></Card>}

      {recommendation && !dismissed && <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-rose-50/70 p-4 ring-1 ring-amber-500/10 sm:p-5 dark:border-amber-500/25 dark:from-amber-500/10 dark:to-rose-500/5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/25"><Lightbulb className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Suggested Intervention</p><h3 className="mt-1 text-[15px] font-bold text-slate-900 dark:text-white">{recommendation.message}</h3><p className="mt-1 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">Recommended action: <strong>{recommendation.recommendedAction}</strong> · {recommendation.questions} questions · {recommendation.difficulty} · concept: {recommendation.concept}</p><p className="mt-2 text-[10.5px] font-medium text-amber-700/80 dark:text-amber-300/80">This suggestion uses formative results only. It is not automatically created or assigned.</p><div className="mt-3 flex flex-wrap gap-2">{interventionCreated ? <Badge variant="success" size="sm"><CheckCircle2 className="h-3 w-3" /> Created in existing Intervention lifecycle · Recommended</Badge> : <Button size="sm" onClick={() => onCreateIntervention?.(recommendation)} disabled={creatingIntervention}><Lightbulb className="h-3.5 w-3.5" /> {creatingIntervention ? 'Creating…' : 'Create Intervention'}</Button>}<Button size="sm" variant="outline" onClick={onViewStudents}><Users className="h-3.5 w-3.5" /> View Students</Button><Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>Dismiss</Button></div></div></div></Card>}
      {!recommendation && result.studentsCompleted > 0 && <Card className="p-4"><p className="flex items-center gap-2 text-[12px] font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> No weak concepts detected</p><p className="mt-1 text-[11px] text-slate-400">All concepts are at or above the prototype intervention threshold.</p></Card>}
      {result.note && <p className="text-[10.5px] font-medium leading-relaxed text-slate-400"><AlertTriangle className="mr-1 inline h-3 w-3" />{result.note}</p>}
    </div>
  )
}

export default ResultsPanel
