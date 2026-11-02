/**
 * AI Exam Conducting Agent — POST-EXAM AI REPORT.
 *
 * Overall performance · result distribution · question-intelligence
 * classification · pace · subject analysis · chapter analysis ·
 * strengths / weaknesses · question analysis · recommendations ·
 * AI Exam Analysis / AI Academic DNA context bridge.
 *
 * Every number is derived by buildExamAgentReport from the attempt's
 * interaction data — nothing is hardcoded, nothing is fabricated.
 */
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpen, BrainCircuit, CheckCircle2, Clock, Cpu,
  FlaskConical, Gauge, Layers, RefreshCcw, Sparkles, Target, Timer, TrendingUp,
} from 'lucide-react'
import { Badge, Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { AreaTrend, BarCompare, DonutChart } from '@/components/charts'
import { ProgressRing } from '@/components/shared/progress-ring'
import { StatCard } from '@/components/shared/stat-card'
import { formatDate } from '@/utils/format'
import { formatPace } from '@/intelligence/engine/exam-agent.js'
import { AgentChip, ExamTypeBadge, LevelBadge, ResultBadge, SectionHeading } from './exam-agent-shared'
import { MathText } from '@/components/shared/math-text'

const SHORT_SUBJECTS = {
  'Data Structures & Algorithms': 'DSA',
  'Operating Systems': 'OS',
  'Machine Learning': 'ML',
  'Database Management Systems': 'DBMS',
  'Computer Networks': 'CN',
  'Theory of Computation': 'ToC',
  Mathematics: 'Maths',
}

const shortSubject = (s) => SHORT_SUBJECTS[s] ?? s

const CLASSIFICATION_ROWS = [
  { key: 'fast-correct', label: 'Strong · Efficient', dot: 'bg-emerald-500' },
  { key: 'slow-correct', label: 'Concept OK · Speed can improve', dot: 'bg-sky-500' },
  { key: 'fast-incorrect', label: 'Accuracy risk · Careless error', dot: 'bg-amber-500' },
  { key: 'slow-incorrect', label: 'Priority improvement area', dot: 'bg-rose-500' },
  { key: 'skipped', label: 'Skipped', dot: 'bg-orange-400' },
  { key: 'not-visited', label: 'Not visited', dot: 'bg-slate-400' },
]

const PIPELINE = ['Exam Interaction', 'Question Intelligence', 'Subject / Chapter Intelligence', 'Strengths / Weaknesses', 'Recommendations', 'AI Exam Analysis · Academic DNA']

function ExamAgentReport({ report, mode, onRetake, onBack }) {
  const o = report.overall
  const pct = Math.max(0, Math.min(100, o.pct))
  const ringColor = pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e'
  const subjectBars = report.subjects.map((s) => ({ label: shortSubject(s.subject), accuracy: s.accuracy }))
  const trendData = report.accuracyTrend.filter((p) => p.value != null)

  return (
    <div className="space-y-6">
      {/* ================= Header ================= */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 p-6 text-white shadow-xl shadow-indigo-600/20 sm:p-8"
      >
        <div className="bg-grid mask-fade-y pointer-events-none absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ExamTypeBadge type={report.examType} className="bg-white/15 text-white ring-white/25" />
              <AgentChip pulse={false} label="AI Exam Performance Report" />
              {mode === 'demo' && <Badge className="bg-white/15 text-white ring-white/25"><Sparkles className="h-3 w-3" /> Demo attempt</Badge>}
            </div>
            <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{report.examTitle}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-medium text-white/75">
              <span>{formatDate(report.completedAt)}</span>
              <span>·</span>
              <span>{formatPace(o.usedSeconds)} used of {report.durationMinutes} min</span>
              <span>·</span>
              <span>{o.totalAnswerChanges} answer changes · {o.totalRevisits} revisits</span>
            </p>
            {/* pipeline (spec §9 flow) */}
            <div className="mt-4 hidden flex-wrap items-center gap-1.5 md:flex">
              {PIPELINE.map((step, i) => (
                <span key={step} className="flex items-center gap-1.5">
                  {i > 0 && <ArrowRight className="h-3 w-3 text-white/40" />}
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/85 ring-1 ring-white/20">{step}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <ProgressRing value={pct} size={116} stroke={11} color={ringColor} label={`${pct}%`} sublabel="Score" />
            <div className="text-right">
              <p className="text-3xl font-bold">{o.score}<span className="text-base font-semibold text-white/60"> / {o.maxScore}</span></p>
              <p className="mt-0.5 text-[11px] font-semibold text-white/70">{o.correct} correct · {o.incorrect} incorrect · {o.skipped} skipped</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ================= Overall stat cards ================= */}
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <StatCard index={0} label="Score" value={`${o.score} / ${o.maxScore}`} sub={`${o.pct}% of paper`} icon="Target" gradient="from-indigo-500 to-blue-500" />
        <StatCard index={1} label="Accuracy" value={`${o.accuracy}%`} sub={`${o.correct} of ${o.attempted} attempted`} icon="Crosshair" gradient="from-emerald-500 to-teal-500" spark={trendData.map((p) => p.value)} />
        <StatCard index={2} label="Attempt rate" value={`${o.attemptRate}%`} sub={`${o.attempted} of ${o.unanswered + o.attempted} questions`} icon="ClipboardList" gradient="from-sky-500 to-cyan-500" />
        <StatCard index={3} label="Time efficiency" value={`${o.timeEfficiency}%`} sub={`avg ${formatPace(o.avgTimePerQuestion)}/question`} icon="Timer" gradient="from-amber-500 to-orange-500" />
      </div>

      {/* ================= Distribution + classification ================= */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeading step={1} title="Result distribution" sub="Correct, incorrect, skipped and unvisited questions across the paper." />
          {report.distribution.length ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative w-full max-w-[230px] shrink-0">
                <DonutChart data={report.distribution} height={210} centerLabel={`${o.accuracy}%`} centerSub="Accuracy" />
              </div>
              <div className="grid w-full grid-cols-2 gap-2">
                {report.distribution.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">{d.name}</span>
                    <span className="ml-auto text-[13px] font-bold text-slate-800 dark:text-slate-100">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No answered questions in this attempt.</p>
          )}
        </Card>

        <Card className="p-5">
          <SectionHeading step={2} title="Question intelligence" sub="Each question classified by speed × result — the core of the agent." />
          <div className="grid gap-2">
            {CLASSIFICATION_ROWS.map((c) => {
              const n = report.classifications?.[c.key] ?? 0
              return (
                <div key={c.key} className={n === 0 ? 'opacity-45' : ''}>
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                    <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                    <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">{c.label}</span>
                    <span className="ml-auto text-[13px] font-bold text-slate-900 dark:text-white">{n}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* ================= Pace + accuracy trend ================= */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeading step={3} title="Pace & time pressure" sub="Required vs actual pace — derived from your timing across the paper." />
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Required pace</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatPace(report.pace.targetPace)}<span className="text-[11px] font-medium text-slate-400"> /question</span></p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Current pace</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatPace(report.pace.currentPace)}<span className="text-[11px] font-medium text-slate-400"> /question</span></p>
            </div>
          </div>
          <div className={`mt-3 rounded-2xl p-3.5 text-[12.5px] font-semibold ${report.pace.status === 'ahead' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : report.pace.status === 'on-track' ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
            {report.pace.message}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeading step={4} title="Accuracy trend" sub="Rolling accuracy across the paper in question order." />
          {trendData.length > 1 ? (
            <AreaTrend
              data={trendData}
              xKey="label"
              series={[{ key: 'value', name: 'Rolling accuracy (%)' }]}
              height={200}
              colors={['#6366f1']}
              formatter={(v) => `${v}%`}
            />
          ) : (
            <p className="text-xs text-slate-400">Not enough answered questions to plot a trend.</p>
          )}
        </Card>
      </div>

      {/* ================= Subject analysis ================= */}
      <Card className="p-5">
        <SectionHeading step={5} title="Subject analysis" sub="Attempt rate, accuracy, average time and a derived strength score per subject." />
        {report.subjects.length > 1 && (
          <div className="mb-4">
            <BarCompare
              data={subjectBars}
              xKey="label"
              series={[{ key: 'accuracy', name: 'Accuracy (%)', color: '#6366f1' }]}
              height={210}
              formatter={(v) => `${v}%`}
            />
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {report.subjects.map((s) => (
            <div key={s.subject} className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white">{s.subject}</p>
                <LevelBadge level={s.level} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[15px] font-bold text-slate-900 dark:text-white">{s.accuracy}%</p>
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Accuracy</p>
                </div>
                <div>
                  <p className="text-[15px] font-bold text-slate-900 dark:text-white">{s.attemptRate}%</p>
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Attempt</p>
                </div>
                <div>
                  <p className="text-[15px] font-bold text-slate-900 dark:text-white">{formatPace(s.avgTime)}</p>
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Avg time</p>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="success" size="sm">{s.correct} correct</Badge>
                <Badge variant="danger" size="sm">{s.incorrect} incorrect</Badge>
                <Badge variant="warning" size="sm">{s.skipped} skipped</Badge>
                {s.strengthScore != null && <Badge variant="info" size="sm">Strength {s.strengthScore}/100</Badge>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ================= Chapter analysis ================= */}
      <Card className="p-5">
        <SectionHeading step={6} title="Chapter / topic analysis" sub="Strong, developing, weak and high-time areas — level is derived from accuracy and timing." />
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {report.chapters.map((c) => (
            <div key={`${c.subject}-${c.chapter}`} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 px-3.5 py-3 dark:border-slate-800">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{c.chapter}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px] font-medium text-slate-400">
                  <span>{shortSubject(c.subject)}</span>
                  {c.attempted > 0 && (<><span>·</span><span>{formatPace(c.avgTime)} avg</span></>)}
                  {c.highTime && (
                    <span className="inline-flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400"><Clock className="h-3 w-3" /> high-time</span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[13px] font-bold text-slate-900 dark:text-white">{c.accuracy != null ? `${c.accuracy}%` : '—'}</span>
                <LevelBadge level={c.level} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ================= Strengths / Weaknesses ================= */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-emerald-200/60 p-5 dark:border-emerald-500/20">
          <SectionHeading step={7} title="Strengths" sub="Chapters with high accuracy and good solving speed." />
          {report.strengths.length ? (
            <div className="space-y-2.5">
              {report.strengths.map((s) => (
                <div key={`st-${s.topic}`} className="flex items-start gap-3 rounded-2xl bg-emerald-50/70 p-3.5 dark:bg-emerald-500/5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                      {s.topic} <span className="font-semibold text-emerald-700 dark:text-emerald-300">— {s.accuracy}% accuracy, {s.speedNote}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-400">{shortSubject(s.subject)} · {formatPace(s.avgTime)} average solve time</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No strong chapters detected in this attempt — revisit fundamentals and retake.</p>
          )}
        </Card>

        <Card className="border-rose-200/60 p-5 dark:border-rose-500/20">
          <SectionHeading step={8} title="Weaknesses" sub="Low accuracy or high time consumption — priority improvement areas." />
          {report.weaknesses.length ? (
            <div className="space-y-2.5">
              {report.weaknesses.map((w) => (
                <div key={`wk-${w.topic}`} className="flex items-start gap-3 rounded-2xl bg-rose-50/70 p-3.5 dark:bg-rose-500/5">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{w.topic}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {w.accuracy != null ? `${w.accuracy}% accuracy` : 'not answered'} · {w.timeNote ?? `avg ${formatPace(w.avgTime)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No weak chapters detected in this attempt — excellent!</p>
          )}
        </Card>
      </div>

      {/* ================= Question analysis table ================= */}
      <Card className="p-5">
        <SectionHeading step={9} title="Question analysis" sub="Every question with its timing, result and the agent's observation." />
        <div className="overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Q</TableHead>
                <TableHead>Question / topic</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="min-w-[240px]">AI observation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.questions.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-bold text-slate-900 dark:text-white">{r.index}</TableCell>
                  <TableCell>
                    <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{r.topic}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-slate-400"><MathText>{r.question}</MathText></p>
                  </TableCell>
                  <TableCell className="text-[11.5px] font-medium text-slate-500">{shortSubject(r.subject)}</TableCell>
                  <TableCell className="text-[11.5px] font-medium text-slate-500">{r.chapter}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-slate-600 dark:text-slate-300">
                      <Clock className="h-3 w-3 text-slate-400" /> {formatPace(r.timeSpent)}
                    </span>
                  </TableCell>
                  <TableCell><ResultBadge result={r.result} /></TableCell>
                  <TableCell className="text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">{r.observation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ================= Recommendations ================= */}
      <Card className="p-5">
        <SectionHeading step={10} title="Recommendations" sub="Generated from your actual attempt data — accuracy, timing, churn, coverage and pacing signals." />
        {report.recommendations.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {report.recommendations.map((rec) => (
              <div key={rec.id} className="flex items-start gap-3 rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${rec.priority === 'High' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300'}`}>
                  {rec.source === 'speed' ? <Gauge className="h-4 w-4" /> : rec.source === 'strategy' ? <Cpu className="h-4 w-4" /> : rec.source === 'coverage' ? <Layers className="h-4 w-4" /> : rec.source === 'pace' ? <Timer className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-slate-800 dark:text-slate-100">
                    {rec.title}
                    <Badge variant={rec.priority === 'High' ? 'danger' : 'secondary'} size="sm">{rec.priority}</Badge>
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">{rec.body}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No recommendations to show for this attempt.</p>
        )}
      </Card>

      {/* ================= DNA / Exam Analysis integration ================= */}
      {report.integration && (
        <Card className="p-5">
          <SectionHeading step={11} title="AI Exam Analysis & AI Academic DNA" sub="How this attempt connects to your existing intelligence foundation." />
          <div className="flex flex-wrap gap-2">
            {report.integration.learningStyle && (
              <Badge variant="outline" size="sm"><BrainCircuit className="h-3 w-3" /> Learning style: {report.integration.learningStyle}</Badge>
            )}
            {report.integration.familyReadiness && (
              <Badge variant="info" size="sm"><Target className="h-3 w-3" /> {report.integration.familyReadiness.family} readiness: {report.integration.familyReadiness.score}/100 ({report.integration.familyReadiness.level})</Badge>
            )}
            {report.integration.subjectMastery && (
              <Badge variant="info" size="sm"><FlaskConical className="h-3 w-3" /> {shortSubject(report.integration.subjectMastery.subject)} DNA mastery: {report.integration.subjectMastery.mastery}% ({report.integration.subjectMastery.level})</Badge>
            )}
          </div>
          <div className="mt-4 space-y-2.5">
            {report.integration.notes.map((n, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.tone === 'positive' ? 'bg-emerald-500' : 'bg-indigo-400'}`} />
                <div>
                  <p className="text-[12.5px] font-bold text-slate-700 dark:text-slate-200">{n.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">{n.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/student/performance-accuracy?tab=dna">
              <Button size="sm" variant="outline"><BrainCircuit className="h-3.5 w-3.5" /> View AI Academic DNA</Button>
            </Link>
            <Link to="/student/exam-analysis">
              <Button size="sm" variant="outline"><TrendingUp className="h-3.5 w-3.5" /> Open AI Exam Analysis</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Honesty note */}
      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-[11.5px] font-medium leading-relaxed text-slate-400 dark:bg-slate-800/60">
        <span className="font-bold text-slate-500 dark:text-slate-300">How this report is built:</span> numbers come from this
        attempt’s interactions. Scoring and saved results come from your examination records. PDF export is
        not available yet.
      </p>

      {/* Actions */}
      {/* <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4" /> All papers</Button>
          <Link to="/student/exam-agent">
            <Button variant="ghost">Examinations <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
        <Button onClick={onRetake}><RefreshCcw className="h-4 w-4" /> {mode === 'demo' ? 'Replay demo' : 'Retake exam'}</Button>
      </div> */}
    </div>
  )
}

export { ExamAgentReport }
export default ExamAgentReport
