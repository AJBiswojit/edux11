/**
 * MediXO EduX — Assessment Workspace · Tab 3: PYQ Intelligence ⭐.
 * University mode embeds the existing PYQ Analysis workflow (5-step
 * filters + full analytics). Competitive mode adds a dedicated JEE/NEET
 * pattern panel with difficulty trends, topic frequency, question types,
 * weightage, gap analysis and AI recommendations — all derived from the
 * foundation's PYQ trend datasets.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BrainCircuit, Building2, GraduationCap, Sparkles, Target } from 'lucide-react'
import { usePYQAnalysis } from '@/services/extra'
import { bankPyqBrowserRecords } from '@/api/adapters/questions'
import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend, BarCompare, DonutChart } from '@/components/charts'
import { Badge, Button, Card, Select, SelectItem } from '@/components/ui'
import { AiInsightCard, WorkspaceSection } from '@/components/teaching-workspace/shared'
import { PYQAnalysisContent } from '@/pages/faculty/PYQAnalysis'
import { CompetitiveQuestionBrowser } from './competitive-question-browser'


/* ---------- Competitive PYQ panel (JEE Main · JEE Advanced · NEET UG) ---------- */
function CompetitivePyqPanel({ data }) {
  const examKeys = Object.keys(data.datasets?.pyqTrends?.competitive ?? {})
  const [exam, setExam] = useState(examKeys[0] ?? 'JEE Main')
  const [values, setValues] = useState({ program: '', subject: '', chapter: '' })
  const [analyzed, setAnalyzed] = useState(false)

  const comp = data.derived.pyqIntelligence?.competitive?.[exam] ?? {}
  const subjects = comp.subjects ?? []
  const selectedSubject = subjects.find((s) => s.code === values.subject)

  const step = (n, title, hint) => (
    <p className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-[10px] font-bold text-white">{n}</span>
      {title}
      {hint && <span className="font-medium text-slate-400">({hint})</span>}
    </p>
  )

  const switchExam = (key) => {
    setExam(key)
    setValues({ program: '', subject: '', chapter: '' })
    setAnalyzed(false)
  }

  return (
    <div>
      {/* Exam cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {examKeys.map((key) => {
          const d = data.derived.pyqIntelligence?.competitive?.[key] ?? {}
          return (
            <button
              key={key}
              onClick={() => switchExam(key)}
              className={`rounded-3xl border p-5 text-left transition-all ${exam === key ? 'border-indigo-400 bg-indigo-50/70 shadow-md dark:border-indigo-500/40 dark:bg-indigo-500/10' : 'border-slate-200/70 bg-white shadow-card hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30'}`}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md">
                  {key === 'NEET UG' ? <Building2 className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
                </span>
                <Badge variant="outline" size="sm">{d.negativeMarking ?? '—'} neg.</Badge>
              </div>
              <p className="mt-3 text-[14px] font-bold text-slate-900 dark:text-white">{d.label ?? key}</p>
              <p className="mt-1 text-[11.5px] text-slate-400">
                {d.totalQuestions ?? 0} questions · {d.totalMarks ?? 0} marks · {d.duration ?? '—'} min
              </p>
              <p className="mt-0.5 text-[10.5px] text-slate-400">
                {(d.difficultyTrend ?? []).length} years · {d.topicFrequency?.length ?? 0} topics · {d.subjects?.length ?? 0} subjects
              </p>
            </button>
          )
        })}
      </div>

      {/* Selectors — programs/subjects/chapters come from the selected exam */}
      <Card className="p-6">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          <BrainCircuit className="h-3.5 w-3.5" /> {comp.label ?? exam} · PYQ Intelligence Workflow
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            {step(1, 'Program')}
            <Select value={values.program} onValueChange={(v) => setValues((p) => ({ ...p, program: v, subject: '' }))} placeholder="Select program…">
              {(comp.programs ?? []).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </Select>
          </div>
          <div>
            {step(2, 'Subject')}
            <Select value={values.subject} onValueChange={(v) => setValues((p) => ({ ...p, subject: v, chapter: '' }))} placeholder={values.program ? 'Select subject…' : 'Pick a program first'} disabled={!values.program} helper={!values.program ? 'Select a program first' : undefined}>
              {subjects.map((s) => <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>)}
            </Select>
          </div>
          <div>
            {step(3, 'Chapter', 'optional')}
            <Select value={values.chapter} onValueChange={(v) => setValues((p) => ({ ...p, chapter: v }))} placeholder={values.subject ? 'All chapters…' : 'Pick a subject first'} disabled={!values.subject} helper={!values.subject ? 'Select a subject first' : undefined}>
              {(selectedSubject?.chapters ?? []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={!values.program || !values.subject || analyzed}
              onClick={() => setAnalyzed(true)}
            >
              <BrainCircuit className="h-4 w-4" /> {analyzed ? 'Analyzed ✓' : 'Analyze'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Analytics */}
      {analyzed && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Difficulty trend" subtitle={`${comp.label ?? exam} · last ${(comp.difficultyTrend ?? []).length} years`}>
              <AreaTrend
                data={comp.difficultyTrend ?? []}
                xKey="year"
                height={250}
                series={[
                  { key: 'easy', name: 'Easy %', color: '#10b981' },
                  { key: 'medium', name: 'Medium %', color: '#6366f1' },
                  { key: 'hard', name: 'Hard %', color: '#f43f5e' },
                ]}
                formatter={(v) => `${v}%`}
              />
            </ChartCard>
            <ChartCard title="Topic frequency" subtitle="Times asked · importance · difficulty">
              <BarCompare
                data={(comp.topicFrequency ?? []).map((t) => ({ label: t.topic, frequency: t.frequency }))}
                xKey="label"
                height={250}
                series={[{ key: 'frequency', name: 'Times asked', color: '#8b5cf6' }]}
                formatter={(v) => `${v}×`}
              />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(comp.topicFrequency ?? []).slice(0, 6).map((t) => (
                  <Badge key={t.topic} variant={t.importance === 'High' ? 'gradient' : 'outline'} size="sm" className="max-w-[220px]">
                    <span className="truncate">{t.topic}</span> · {t.importance} · {t.difficulty}
                  </Badge>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <ChartCard title="Question types" subtitle={`Distribution in ${comp.label ?? exam} (${comp.totalQuestions ?? 0} questions)`}>
              <DonutChart
                data={(comp.questionTypeMix ?? []).map((t, i) => ({ name: t.type, value: t.count, color: ['#6366f1', '#14b8a6', '#f59e0b', '#8b5cf6', '#f43f5e'][i] }))}
                height={220}
                centerLabel={`${comp.totalQuestions ?? 0}`}
                centerSub="questions"
              />
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {(comp.questionTypeMix ?? []).map((t) => (
                  <Badge key={t.type} variant="outline" size="sm">{t.type} {t.count} ({t.pct}%)</Badge>
                ))}
              </div>
            </ChartCard>
            <ChartCard title="Year-wise distribution" subtitle="Question count by year">
              <BarCompare
                data={(comp.yearwiseDistribution ?? []).map((y) => ({ label: y.year, questions: y.questions, mcq: y.mcq ?? 0, numeric: y.numeric ?? 0, other: y.other ?? 0 }))}
                xKey="label"
                height={220}
                series={[
                  { key: 'mcq', name: 'MCQ', color: '#6366f1' },
                  { key: 'numeric', name: 'Numerical', color: '#14b8a6' },
                  { key: 'other', name: 'Other', color: '#f59e0b' },
                ]}
              />
            </ChartCard>
            <ChartCard title="Gap analysis" subtitle={`Thin PYQ areas in ${comp.label ?? exam}`}>
              <div className="space-y-3">
                {(comp.gapAnalysis ?? []).map((g) => (
                  <div key={g.topic} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{g.topic}</p>
                      <p className="truncate text-[10.5px] text-slate-400">{g.note}</p>
                    </div>
                    <Badge variant={g.level === 'Healthy' ? 'success' : g.level === 'Watch' ? 'warning' : 'danger'} size="sm" className="ml-2 shrink-0">{g.level} · {g.coverage}%</Badge>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Priority topics" subtitle="What to drill before the next test">
              <div className="space-y-2.5">
                {(comp.priorityTopics ?? []).map((p) => (
                  <div key={p.topic} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                    <Badge variant={p.priority === 'Critical' ? 'danger' : 'warning'} size="sm" className="shrink-0">{p.priority}</Badge>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{p.topic}</p>
                      <p className="truncate text-[10.5px] text-slate-400">{p.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
            <ChartCard title="Repeated concepts" subtitle="Frequently asked across years">
              <div className="flex flex-wrap gap-2 pt-1">
                {(comp.repeatedConcepts ?? []).map((c) => <Badge key={c} variant="success" className="px-3 py-1.5 text-[11.5px]">{c}</Badge>)}
              </div>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Exam blueprint</p>
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                {[['Questions', comp.totalQuestions], ['Marks', comp.totalMarks], ['Duration', `${comp.duration} min`], ['Negative', comp.negativeMarking]].map(([label, v]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                    <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-white" title={String(v)}>{v}</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>

          <WorkspaceSection title="AI recommendations" subtitle={`${comp.label ?? exam} · derived from priority topics & gaps`} icon={Sparkles}>
            <div className="grid gap-4 md:grid-cols-2">
              {(comp.recommendations ?? []).map((r, i) => (
                <AiInsightCard key={r.id} insight={r} index={i} />
              ))}
            </div>
          </WorkspaceSection>
        </motion.div>
      )}

      {!analyzed && (
        <Card className="mt-6 p-10 text-center">
          <Target className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">Select a program & subject to analyze</p>
          <p className="mt-1 text-xs text-slate-400">The engine will surface frequency, weightage, year-wise trends and gaps for the {comp.label ?? exam} corpus.</p>
        </Card>
      )}
    </div>
  )
}

/* ---------- PYQ Intelligence tab (University + Competitive) ----------
 * PYQ question RECORDS rendered by the two browsers come ONLY from the live
 * question-bank API (`questions` prop — GET /faculty/question-bank rows).
 * Seeded record lists embedded in the intelligence summary payload
 * (derived.competitiveQuestionIntelligence) are never rendered; an empty
 * bank therefore shows the browsers' existing empty state. Trend analytics
 * (difficulty / topic frequency / weightage) remain the intelligence
 * layer's job and are unaffected. */
function PyqIntelligenceTab({ data, questions = [] }) {
  const universityPyqRecords = bankPyqBrowserRecords(questions, { domain: 'University' })
  const competitivePyqRecords = bankPyqBrowserRecords(questions, { domain: 'Competitive' })
  const [mode, setMode] = useState('University')
  /* Phase 27.2: corpus badge derives from the datasets (was a static string). */
  const { data: pyqData } = usePYQAnalysis()
  const ov = pyqData?.overview ?? {}
  const compExams = Object.keys(data.datasets?.pyqTrends?.competitive ?? {})
  const univBadge = ov.totalPapers
    ? `${ov.totalPapers} papers · ${ov.totalQuestions} questions · ${ov.yearsCovered?.[0]}–${ov.yearsCovered?.at(-1)}`
    : 'University PYQ corpus'
  const compBadge = compExams.length
    ? `${compExams.length} exam${compExams.length > 1 ? 's' : ''} · ${compExams.join(' / ')}`
    : 'Competitive corpus'

  return (
    <div>
      {/* Mode toggle */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {['University', 'Competitive'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-[13px] font-bold transition-all ${
                mode === m ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {m === 'University' ? <GraduationCap className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              {m}
            </button>
          ))}
        </div>
        <Badge variant="gradient" className="px-3 py-1">
          <BrainCircuit className="h-3 w-3" /> {mode === 'University' ? univBadge : compBadge}
        </Badge>
      </div>

      {mode === 'University' ? (
        <>
          <PYQAnalysisContent toolbar />
          {/* Actual university PYQ questions (Phase 29) — linked to the Question Bank */}
          <div className="mt-8">
            <CompetitiveQuestionBrowser
              questions={universityPyqRecords}
              exams={['University']}
              title="University PYQ question browser"
              subtitle="PYQ questions matched from the live question bank — every record has a stable Question Bank identity"
              showExamFilter={false}
              badge={<Badge variant="gradient" className="px-3 py-1"><BrainCircuit className="h-3 w-3" /> {universityPyqRecords.length} PYQs</Badge>}
            />
          </div>
        </>
      ) : (
        <>
          <CompetitivePyqPanel data={data} />
          {/* Actual competitive PYQ records (Phase 29) */}
          <div className="mt-8">
            <CompetitiveQuestionBrowser
              questions={competitivePyqRecords}
              title="Competitive PYQ question browser"
              subtitle="JEE Main & NEET UG PYQ records matched from the live question bank — exam · year · session · chapter · topic"
              exams={['JEE Main', 'NEET UG']}
              badge={<Badge variant="gradient" className="px-3 py-1"><BrainCircuit className="h-3 w-3" /> {competitivePyqRecords.length} PYQs</Badge>}
            />
          </div>
        </>
      )}
    </div>
  )
}

export { PyqIntelligenceTab }
export default PyqIntelligenceTab
