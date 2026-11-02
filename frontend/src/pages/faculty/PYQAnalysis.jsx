import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import {
  BookOpen, BrainCircuit, CheckCircle2, CopyPlus, Download, FileUp,
  Filter, ListChecks, ScanText, Sparkles, Star, Timer, TrendingUp, UploadCloud,
} from 'lucide-react'
import { useQuestionBank } from '@/services'
import { usePYQAnalysis, usePYQFilters, usePYQPatterns, usePYQAnalytics } from '@/services/extra'
import { isPyqQuestion } from '@/api/adapters/questions'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { BarCompare, DonutChart } from '@/components/charts'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Select, SelectItem, useToast } from '@/components/ui'
import { useFilterCascade } from '@/hooks/use-filter-cascade'
import { buildPyqFilterCascade } from './pyq-filter-cascade'
import { formatRelative } from '@/utils/format'

const UPLOAD_STATUS = { Processed: 'success', Processing: 'info', Failed: 'danger' }
const DIFF_STYLES = { Easy: 'success', Medium: 'warning', Hard: 'danger' }
const QB_STATUS_STYLES = { Approved: 'success', Review: 'warning', Flagged: 'danger' }
const IMPACT_STYLES = { High: 'danger', Medium: 'warning', Low: 'info' }
const COLORS = ['#6366f1', '#3b82f6', '#14b8a6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#0ea5e9']
const DatabaseIcon = BookOpen

/* ------------------------------------------------------------------ */
/* 5-step intelligent filter workflow — nothing loads until Analyze.   */
/* ------------------------------------------------------------------ */
function PYQFilterCard({ filters, values, onChange, onAnalyze, analyzing, hasAnalyzed, overview }) {
  const step = (n, title, hint) => (
    <p className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-[10px] font-bold text-white">{n}</span>
      {title}
      {hint && <span className="font-medium text-slate-400">({hint})</span>}
    </p>
  )

  const subjects = filters?.subjects ?? []
  const selectedSubject = subjects.find((s) => s.code === values.subject)
  const chapterTopics = values.chapter ? (filters?.chapters ?? {})[values.chapter] ?? [] : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-3xl border border-slate-200/70 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Decorative layers clipped to the card — must NOT clip the Select dropdowns */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="bg-grid mask-fade-y absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-500/10 to-teal-500/10 blur-3xl" />
      </div>
      <div className="relative p-6 sm:p-8">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          <BrainCircuit className="h-3.5 w-3.5" /> PYQ Intelligence · Workflow
        </p>
        <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">Analyse 15 years of question papers</h2>
        <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          Narrow the corpus with the filters below — the AI engine then surfaces repetitions, weightage, patterns and predicted questions for exactly that slice.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div>
            {step(1, 'Class / Program')}
            <Select value={values.program ?? ''} onValueChange={(v) => onChange({ program: v })} group="pyq-filters" placeholder="Select program…">
              {(filters?.programs ?? []).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </Select>
          </div>
          <div>
            {step(2, 'Subject')}
            <Select 
              value={values.subject ?? ''} 
              onValueChange={(v) => onChange({ subject: v })} 
              group="pyq-filters" 
              disabled={!values.program}
              placeholder={values.program ? 'Select subject…' : 'Pick a program first'}
              helper={!values.program ? 'Select a program first' : undefined}
            >
              {subjects.map((s) => <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>)}
            </Select>
          </div>
          <div>
            {step(3, 'Chapter', 'optional')}
            <Select 
              value={values.chapter ?? ''} 
              onValueChange={(v) => onChange({ chapter: v })} 
              group="pyq-filters" 
              disabled={!values.subject}
              placeholder={values.subject ? 'All chapters…' : 'Pick a subject first'}
              helper={!values.subject ? 'Select a subject first' : undefined}
            >
              {(selectedSubject?.chapters ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </Select>
          </div>
          <div>
            {step(4, 'Topic', 'optional')}
            <Select 
              value={values.topic ?? ''} 
              onValueChange={(v) => onChange({ topic: v })} 
              group="pyq-filters" 
              disabled={!values.chapter}
              placeholder={values.chapter ? 'All topics…' : 'Pick a chapter first'}
              helper={!values.chapter ? 'Select a chapter first' : undefined}
            >
              {chapterTopics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </Select>
          </div>
          <div>
            {step(5, 'Year range')}
            <Select value={values.yearRange ?? ''} onValueChange={(v) => onChange({ yearRange: v })} group="pyq-filters" placeholder="All years…">
              {(filters?.yearRanges ?? []).map((y) => <SelectItem key={y.id} value={y.id}>{y.label}</SelectItem>)}
            </Select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            disabled={!values.program || !values.subject || !values.yearRange || analyzing}
            onClick={onAnalyze}
          >
            {analyzing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Analysing…
              </>
            ) : (
              <>
                <BrainCircuit className="h-4 w-4" /> {hasAnalyzed ? 'Re-analyse' : 'Analyze'}
              </>
            )}
          </Button>
          {hasAnalyzed && (
            <Button variant="ghost" size="sm" onClick={() => onChange({ reset: true })}>
              Clear filters
            </Button>
          )}
          <p className="text-[11px] font-medium text-slate-400">
            {overview?.totalPapers
              ? `${overview.totalPapers} papers · ${overview.totalQuestions ?? 0} questions · ${overview.yearsCovered?.[0]}–${overview.yearsCovered?.at(-1)} in the corpus`
              : 'Counts appear once the PYQ corpus is indexed'}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Question Bank integration panel — related, selectable questions.    */
/* ------------------------------------------------------------------ */
function RelatedQuestionBankPanel({ questions, selectedIds, onToggle, onAddAll }) {
  const toast = useToast()
  const available = questions.filter((q) => q.status === 'Approved').length

  return (
    <ChartCard
      title="Related question bank questions"
      subtitle="Matched from your question bank · select directly into exams or the paper generator"
      actions={<Badge variant="gradient"><DatabaseIcon className="h-3 w-3" /> {questions.length} matched · {available} available</Badge>}
    >
      {questions.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No question-bank matches for this filter slice yet — try widening the chapter/topic filters.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={onAddAll}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Select all ({questions.length})
            </Button>
            {selectedIds.length > 0 && (
              <>
                <Button size="sm" onClick={() => toast.success('Added to exam draft', `${selectedIds.length} question(s) queued for the active exam.`)}>
                  Add {selectedIds.length} to exam draft
                </Button>
                <Button size="sm" variant="outline" onClick={() => toast.success('Sent to generator', `${selectedIds.length} question(s) loaded into the AI Paper Generator.`)}>
                  <Sparkles className="h-3.5 w-3.5" /> Send to paper generator
                </Button>
              </>
            )}
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
                  <th className="w-10 px-3 py-3" />
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Question</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Similar to (PYQ topic)</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Difficulty</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Source</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Availability</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">PYQ freq</th>
                  <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Used before</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => {
                  const checked = selectedIds.includes(q.id)
                  const availability = q.status === 'Approved' ? 'Available' : q.status === 'Review' ? 'Pending review' : 'Flagged'
                  return (
                    <tr key={q.id} className={`border-b border-slate-100 transition-colors last:border-0 dark:border-slate-800/60 ${checked ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : 'hover:bg-indigo-50/30 dark:hover:bg-slate-800/30'}`}>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggle(q.id)}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
                          aria-label={`Select ${q.text.slice(0, 40)}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <p className="max-w-[340px] text-[12.5px] font-semibold leading-snug text-slate-700 dark:text-slate-200">{q.text}</p>
                        <p className="mt-0.5 text-[10.5px] font-medium text-slate-400">{q.subject} · {q.topic} · {q.type}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex max-w-[180px] flex-wrap gap-1">
                          {(q.pyqTopics ?? []).slice(0, 2).map((t) => <Badge key={t} variant="outline" size="sm">{t}</Badge>)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center"><Badge variant={DIFF_STYLES[q.difficulty]} size="sm">{q.difficulty}</Badge></td>
                      <td className="px-3 py-3 text-center"><Badge variant="secondary" size="sm">{q.source === 'AI' ? '🤖 AI' : '✍️ Manual'}</Badge></td>
                      <td className="px-3 py-3 text-center"><Badge variant={QB_STATUS_STYLES[q.status] ?? 'secondary'} size="sm">{q.status}</Badge></td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={availability === 'Available' ? 'success' : availability === 'Pending review' ? 'warning' : 'danger'} size="sm">{availability}</Badge>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-bold text-rose-600 dark:text-rose-400">×{q.pyqFrequency ?? 0}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-[11px] font-medium text-slate-400">
                        {q.appearedIn?.length ? `${q.appearedIn.length} papers` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ChartCard>
  )
}

/* ------------------------------------------------------------------ */
/* Full PYQ analysis dashboard — appears only after Analyze.           */
/* ------------------------------------------------------------------ */
function PYQDashboard({ analytics, patterns, related, repeated, selectedIds, onToggle, onAddAll, filters, labels, onGenerate }) {
  const toast = useToast()
  const ov = analytics.overview
  const qi = analytics.questionIntelligence
  /* Question-record panels are fed ONLY by the live question bank —
     seeded stems from the PYQ analytics payload are never rendered. */
  const repeatedRecords = repeated ?? []
  const da = analytics.difficultyAnalytics
  const yearWise = analytics.trendAnalytics.yearWise.filter((y) => y.year >= filters.year.from && y.year <= filters.year.to)
  const totalQuestions = yearWise.reduce((a, y) => a + y.questions, 0)
  const totalRepeated = yearWise.reduce((a, y) => a + y.repeated, 0)
  const chapterWeightage = filters.chapter ? analytics.trendAnalytics.chapterWeightage.filter((c) => c.chapter === filters.chapter) : analytics.trendAnalytics.chapterWeightage
  const topicWeightage = filters.topic
    ? analytics.trendAnalytics.topicWeightage.filter((t) => t.topic === filters.topic)
    : filters.chapter
      ? analytics.trendAnalytics.topicWeightage.filter((t) => (analytics.trendAnalytics.questionFrequency ?? []).some((f) => f.topic.includes(t.topic)))
      : analytics.trendAnalytics.topicWeightage
  const questionFrequency = filters.topic
    ? analytics.trendAnalytics.questionFrequency.filter((f) => f.topic.includes(filters.topic) || filters.topic.includes(f.topic))
    : analytics.trendAnalytics.questionFrequency

  return (
    <div className="space-y-8">
      {/* Analysis context bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-teal-500 text-[10px] font-bold text-white">✓</span>
          Analysing <span className="font-bold text-indigo-600 dark:text-indigo-300">{labels.subject}</span>
          {filters.chapter && <span className="font-bold text-indigo-600 dark:text-indigo-300">· {filters.chapter}</span>}
          {filters.topic && <span className="font-bold text-indigo-600 dark:text-indigo-300">· {filters.topic}</span>}
          <span className="font-bold text-indigo-600 dark:text-indigo-300">· {labels.years}</span>
          <span className="ml-1 flex gap-1.5">
            <Badge variant="secondary" size="sm">{yearWise.length} yrs</Badge>
            <Badge variant="secondary" size="sm">{totalQuestions} Qs</Badge>
            <Badge variant="secondary" size="sm">{totalRepeated} repeated</Badge>
          </span>
        </p>
        <Button variant="ghost" size="sm" onClick={onGenerate}>
          <Filter className="h-3.5 w-3.5" /> Change filters
        </Button>
      </div>

      {/* Most repeated questions — live bank records ranked by PYQ repetition */}
      <ChartCard
        title="Most repeated questions"
        subtitle={`Asked across multiple years${filters.chapter ? ` — ${filters.chapter}` : ''} · high-priority revision targets`}
        actions={<Badge variant="gradient"><Star className="h-3 w-3" /> {repeatedRecords.length} hot questions</Badge>}
      >
        <div className="space-y-3">
          {repeatedRecords.slice(0, 6).map((q) => (
            <motion.div key={q.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-500 text-xs font-bold text-white shadow-md">
                {(q.pyqFrequency ?? 0) > 0 ? `${q.pyqFrequency}×` : 'PYQ'}
              </span>
              <p className="min-w-0 flex-1 text-[13.5px] font-semibold text-slate-700 dark:text-slate-200">{q.text}</p>
              <div className="flex flex-wrap gap-1">
                {(q.appearedIn ?? (q.pyqYear ? [q.pyqYear] : [])).slice(-5).map((y) => <Badge key={y} variant="outline" size="sm">{y}</Badge>)}
              </div>
            </motion.div>
          ))}
          {repeatedRecords.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">No repeated questions in the bank for this slice yet — PYQ-matched bank questions appear here.</p>
          )}
        </div>
      </ChartCard>

      {/* Frequency + weightage */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Question frequency" subtitle="Top repeated topics in this slice">
          <BarCompare
            data={questionFrequency.slice(0, 7)}
            xKey="topic"
            height={230}
            series={[{ key: 'frequency', name: 'Frequency', color: '#f43f5e' }]}
          />
        </ChartCard>
        <ChartCard title="Chapter weightage" subtitle="% of total marks across PYQs">
          <DonutChart
            data={chapterWeightage.map((c, i) => ({ name: c.chapter, value: c.weight, color: COLORS[i % COLORS.length] }))}
            height={230}
            centerLabel={`${chapterWeightage.length}`}
            centerSub="chapters"
          />
        </ChartCard>
        <ChartCard title="Topic weightage" subtitle="Share of PYQ marks by topic">
          <BarCompare
            data={topicWeightage.slice(0, 7)}
            xKey="topic"
            height={230}
            series={[{ key: 'weight', name: 'Weight %', color: '#6366f1' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>
      </div>

      {/* Difficulty + types + concepts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Difficulty distribution" subtitle="Easy / Medium / Hard in this slice">
          <DonutChart
            data={da.distribution.map((d) => ({ name: d.difficulty, value: d.pct, color: d.difficulty === 'Easy' ? '#10b981' : d.difficulty === 'Medium' ? '#6366f1' : '#f43f5e' }))}
            height={230}
            centerLabel={`${da.distribution.find((d) => d.difficulty === 'Medium')?.pct ?? 0}%`}
            centerSub="medium"
          />
        </ChartCard>
        <ChartCard title="Question types" subtitle="Distribution across the corpus">
          <DonutChart
            data={da.typeDistribution.map((t, i) => ({ name: t.type, value: t.count, color: COLORS[i % COLORS.length] }))}
            height={230}
            centerLabel={`${da.typeDistribution.reduce((a, t) => a + t.count, 0)}`}
            centerSub="questions"
          />
        </ChartCard>
        <ChartCard title="Frequently asked concepts" subtitle="Core concepts that recur">
          <div className="flex flex-wrap gap-2 pt-1">
            {qi.importantConcepts.map((c) => <Badge key={c} variant="info" className="px-3 py-1.5 text-[11.5px]">{c}</Badge>)}
          </div>
          <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Frequent chapters</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {qi.frequentChapters.map((c) => <Badge key={c} variant="gradient">{c}</Badge>)}
          </div>
        </ChartCard>
      </div>

      {/* Patterns + important topics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Repeated patterns" subtitle="How questions get asked, across 15 years" actions={<Badge variant="gradient"><TrendingUp className="h-3 w-3" /> {patterns.length} patterns</Badge>}>
          <div className="space-y-3">
            {patterns.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                  <ScanText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{p.pattern}</p>
                  <p className="text-[11px] text-slate-400">{p.example ? `e.g. “${p.example}” · ` : ''}seen {p.years}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400">×{p.frequency}</p>
                  <Badge variant={IMPACT_STYLES[p.impact]} size="sm">{p.impact}</Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </ChartCard>
        <div className="space-y-6">
          <ChartCard title="Important topics" subtitle="Highest-yield topics for the next exam">
            <div className="flex flex-wrap gap-2 pt-1">
              {qi.frequentTopics.map((t) => <Badge key={t} variant="success" className="px-3 py-1.5 text-[11.5px]">{t}</Badge>)}
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Emerging topics</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {qi.emergingTopics.map((t) => <Badge key={t} variant="success">{t}</Badge>)}
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Never asked</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {qi.neverAsked.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
            </div>
          </ChartCard>
          <div className="flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
            <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
              <span className="font-bold text-indigo-600 dark:text-indigo-300">AI take:</span> {repeatedRecords[0]
                ? <>{repeatedRecords[0].text} is your highest-repetition record — treat it as the most likely question pattern for {labels.subject}.</>
                : <>Predictions for {labels.subject} appear once the question bank has PYQ-matched content.</>}
            </p>
          </div>
        </div>
      </div>

      {/* AI suggested + predicted */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="AI suggested questions" subtitle="Highest-repetition PYQ matches from your live question bank" actions={<Badge variant="gradient"><Sparkles className="h-3 w-3" /> PYQ ranked</Badge>}>
          <div className="space-y-3">
            {repeatedRecords.slice(0, 4).map((q) => (
              <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13.5px] font-semibold leading-snug text-slate-800 dark:text-slate-100">{q.text}</p>
                  <Badge variant="gradient">{(q.pyqFrequency ?? 0) > 0 ? `PYQ ×${q.pyqFrequency}` : 'PYQ'}</Badge>
                </div>
                <p className="mt-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                  {(q.appearedIn ?? []).length > 0 ? `Appeared in ${q.appearedIn.join(', ')}` : (q.pyqTopics ?? []).join(' · ') || q.topic || q.chapter || '—'}
                </p>
              </motion.div>
            ))}
            {repeatedRecords.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">No PYQ-matched bank questions yet — suggestions appear once the question bank has content.</p>
            )}
          </div>
        </ChartCard>
        <ChartCard title="AI predicted topics" subtitle="What to expect next exam" actions={<Badge variant="gradient"><Star className="h-3 w-3" /> Predicted</Badge>}>
          <div className="space-y-3">
            {(qi.emergingTopics ?? []).map((t, i) => (
              <div key={t} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{t}</p>
                <Badge variant="success" size="sm">Emerging</Badge>
              </div>
            ))}
            {(qi.neverAsked ?? []).slice(0, 2).map((t) => (
              <div key={t} className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 p-3.5 dark:border-slate-700">
                <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{t}</p>
                <Badge variant="warning" size="sm">Gap risk</Badge>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Generate actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { id: 'similar', title: 'Generate similar questions', desc: '10 questions cloned from the top repeated patterns', icon: CopyPlus },
          { id: 'practice', title: 'Generate practice set', desc: 'Topic-wise drill set for the weak chapters in this slice', icon: ListChecks },
          { id: 'mock', title: 'Generate mock test', desc: 'Full mock auto-built from this slice’s distribution', icon: Timer },
        ].map((a, i) => (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => toast.success(`${a.title} ✨`, `${a.desc} — generated from the current PYQ analysis.`)}
            className="group rounded-3xl border border-slate-200/70 bg-white p-5 text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-md shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110">
              <a.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[13px] font-bold leading-snug text-slate-800 dark:text-slate-100">{a.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{a.desc}</p>
          </motion.button>
        ))}
      </div>

      {/* Question Bank integration */}
      <RelatedQuestionBankPanel questions={related} selectedIds={selectedIds} onToggle={onToggle} onAddAll={onAddAll} />

      {/* Uploads */}
      <ChartCard title="Uploaded papers & OCR status" subtitle="PDF/image processing pipeline" actions={<Badge variant="secondary" size="sm">{ov.totalPapers} papers</Badge>}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Paper</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Year</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">OCR</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Questions</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Category</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {analytics.uploads.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{u.paper}</td>
                  <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">{u.year}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${u.ocr >= 95 ? 'text-emerald-600 dark:text-emerald-400' : u.ocr >= 85 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'}`}>{u.ocr}%</span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">{u.questions ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.category}</td>
                  <td className="px-4 py-3 text-center"><Badge variant={UPLOAD_STATUS[u.status]}>{u.status}</Badge></td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400">{formatRelative(u.uploaded)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* PYQ workspace — filter workflow + dashboard.                        */
/* Reused by the standalone PYQ Analysis page and the Question         */
/* Intelligence hub tab.                                               */
/* ------------------------------------------------------------------ */
export function PYQAnalysisContent({ toolbar = false }) {
  const { data, isLoading, isError, refetch } = usePYQAnalysis()
  const { data: filtersData } = usePYQFilters()
  const { data: patternsData } = usePYQPatterns()
  const { data: qbData } = useQuestionBank()

  /* Filter state: Program + Year range are INDEPENDENT (no declared data
     dependency); Subject → Chapter → Topic cascade through the shared
     engine so a changed subject can never leave a stale chapter/topic. */
  const [independent, setIndependent] = useState({ program: '', yearRange: '' })
  const cascadeConfig = useMemo(() => buildPyqFilterCascade(filtersData), [filtersData])
  const { values: cascading, apply: applyCascading, reset: resetCascading } = useFilterCascade(cascadeConfig)
  const values = { ...independent, ...cascading }
  const [analyzed, setAnalyzed] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedQbIds, setSelectedQbIds] = useState([])
  const toast = useToast()
  const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
    maxFiles: 5,
  })

  const { data: analytics } = usePYQAnalytics(analyzed ? values.subject : null)

  /* ---- PYQ-matched bank questions (record source for the dashboard) ---- */
  const bankRepeated = useMemo(() => (qbData?.questions ?? [])
    .filter(isPyqQuestion)
    .sort((a, b) => (Number(b.pyqFrequency) || 0) - (Number(a.pyqFrequency) || 0)), [qbData])

  /* ---- related question bank questions for the selected slice ---- */
  const related = useMemo(() => {
    const bank = qbData?.questions ?? []
    const subjectTopics = values.chapter
      ? (filtersData?.chapters ?? {})[values.chapter] ?? []
      : Object.values(filtersData?.chapters ?? {}).flat()
    return bank
      .filter((q) => {
        if (values.subject && q.subject !== values.subject) return false
        const topics = q.pyqTopics ?? []
        if (values.topic) return topics.includes(values.topic)
        if (values.chapter) return topics.some((t) => subjectTopics.includes(t))
        return topics.length > 0
      })
      .sort((a, b) => (b.pyqFrequency ?? 0) - (a.pyqFrequency ?? 0))
  }, [qbData, filtersData, values.subject, values.chapter, values.topic])

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const CASCADING_KEYS = ['subject', 'chapter', 'topic']
  const handleChange = (patch) => {
    if (patch.reset) {
      setIndependent({ program: '', yearRange: '' })
      resetCascading()
      setAnalyzed(false)
      setSelectedQbIds([])
      return
    }
    const independentPatch = {}
    const cascadingPatch = {}
    for (const [key, value] of Object.entries(patch)) {
      if (CASCADING_KEYS.includes(key)) cascadingPatch[key] = value
      else independentPatch[key] = value
    }
    if (Object.keys(independentPatch).length) setIndependent((prev) => ({ ...prev, ...independentPatch }))
    if (Object.keys(cascadingPatch).length) applyCascading(cascadingPatch)
    setAnalyzed(false)
    setSelectedQbIds([])
  }

  const handleAnalyze = () => {
    if (!values.program || !values.subject || !values.yearRange) return
    setAnalyzing(true)
    setTimeout(() => {
      setAnalyzing(false)
      setAnalyzed(true)
      toast.success('Analysis ready', `${labels.subject} · ${labels.years} — PYQ intelligence generated.`)
    }, 650)
  }

  const handleUpload = () => {
    if (!acceptedFiles.length) {
      toast.error('No file selected', 'Drop PDF or image files first.')
      return
    }
    setUploadOpen(false)
    toast.success('Upload started 🔄', `${acceptedFiles.length} paper(s) queued for OCR & AI categorization.`)
  }

  const yearRangeObj = (filtersData?.yearRanges ?? []).find((y) => y.id === values.yearRange)
  const subjectName = (filtersData?.subjects ?? []).find((s) => s.code === values.subject)?.name ?? values.subject
  const labels = {
    subject: values.subject ? `${values.subject} — ${subjectName}` : '—',
    years: yearRangeObj ? yearRangeObj.label.replace(/\(.*\)/, '').trim() : 'All years',
  }

  const toggleQb = (id) => setSelectedQbIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const selectAllQb = () => setSelectedQbIds((ids) => (ids.length === related.length ? [] : related.map((q) => q.id)))

  return (
    <div className="space-y-6">
      {toolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
            {data.overview.totalPapers} papers · {data.overview.totalQuestions} questions · {data.overview.yearsCovered[0]}–{data.overview.yearsCovered[data.overview.yearsCovered.length - 1]}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success('Downloading…', 'PYQ analysis report saved.')}>
              <Download className="h-4 w-4" /> Analysis
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <UploadCloud className="h-4 w-4" /> Upload papers
            </Button>
          </div>
        </div>
      )}

      {/* 5-step filter workflow */}
      <PYQFilterCard
        filters={filtersData}
        values={values}
        onChange={handleChange}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
        hasAnalyzed={analyzed}
        overview={data?.overview}
      />

      {/* Dashboard only after Analyze */}
      {analyzed && (
        analytics ? (
          <PYQDashboard
            analytics={analytics}
            patterns={patternsData?.items ?? []}
            related={related}
            repeated={bankRepeated}
            selectedIds={selectedQbIds}
            onToggle={toggleQb}
            onAddAll={selectAllQb}
            filters={{ year: yearRangeObj ?? { from: 2011, to: 2025 }, chapter: values.chapter, topic: values.topic }}
            labels={labels}
            onGenerate={() => { setAnalyzed(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          />
        ) : (
          <DashboardSkeleton cards={4} />
        )
      )}
      {!analyzed && (
        <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-800">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 ring-1 ring-indigo-500/20">
            <BrainCircuit className="h-6 w-6 text-indigo-500" />
          </div>
          <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">Your analysis will appear here</h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-400">
            Complete the 5 filter steps and hit <span className="font-bold text-indigo-600 dark:text-indigo-300">Analyze</span> — the dashboard (repeated questions, weightage, patterns, AI predictions and related question-bank questions) loads instantly.
          </p>
        </div>
      )}

      {/* Upload dialog */}
      {uploadOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setUploadOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-lift dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Upload previous year papers</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">PDF or images — OCR + AI categorization runs automatically.</p>
            <div {...getRootProps()} className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-10 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50/70 dark:border-indigo-500/30 dark:bg-indigo-500/5">
              <input {...getInputProps()} />
              <UploadCloud className="h-10 w-10 text-indigo-500" />
              <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">
                {acceptedFiles.length ? `${acceptedFiles.length} file(s) selected` : 'Drag & drop papers here'}
              </p>
              <p className="mt-1 text-xs text-slate-400">PDF, PNG or JPEG · up to 5 files · max 25 MB each</p>
            </div>
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-slate-50 p-3.5 text-[11px] leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <ScanText className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
              Pipeline: OCR extraction → question segmentation → topic/chapter categorization → difficulty tagging.
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
              <Button onClick={handleUpload}><FileUp className="h-4 w-4" /> Upload & analyse</Button>
            </div>
          </div>
        </div>
      )}

      {/* Mentor CTA */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-lift sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[15px] font-bold">Ask MediXO Mentor about the PYQ bank</p>
            <p className="text-xs text-white/80">Recommend important topics. Generate a practice set. Analyse a new paper.</p>
          </div>
        </div>
        <Button variant="secondary" className="bg-white text-indigo-700 hover:bg-indigo-50" onClick={() => toast.info('MediXO Mentor', 'Opening the AI Teaching Assistant with PYQ context…')}>
          <Sparkles className="h-4 w-4" /> Ask MediXO Mentor
        </Button>
      </div>
    </div>
  )
}

function PYQAnalysis() {
  return (
    <div>
      <PageHeader
        eyebrow="Question Intelligence · PYQ Analysis"
        title="Previous year question analysis"
        description="AI-powered analysis of your previous year question papers — filter by program, subject, chapter, topic and year, then analyse."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Question Intelligence', to: '/faculty/question-intelligence' }, { label: 'PYQ Analysis' }]}
      />
      <PYQAnalysisContent toolbar />
    </div>
  )
}

export { PYQAnalysis }
export default PYQAnalysis
