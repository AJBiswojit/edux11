import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {  } from 'framer-motion'
import { Download, FileBarChart, Printer, X } from 'lucide-react'
import { useStudentIntelligence } from '@/services/intelligence'
import { buildProgressReport, REPORT_PERIODS } from '@/intelligence/engine/progress-report.js'
import { PageHeader } from '@/components/shared/page-header'
import {  } from '@/components/shared/chart-card'
import {  } from '@/components/shared/progress-ring'
import {  } from '@/components/charts'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, Select, SelectItem, useToast } from '@/components/ui'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

const STATUS_STYLE = { Excellent: 'success', Good: 'info', Steady: 'warning', 'Needs Attention': 'danger' }

function SectionTitle({ children, sub }) {
  return (
    <div className="mb-3">
      <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{children}</h3>
      {sub && <p className="text-[11.5px] text-slate-400">{sub}</p>}
    </div>
  )
}

function MetricChip({ label, value, source, tone = 'default' }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3.5 py-2.5 dark:bg-slate-800/60">
      <p className={cn('text-[10px] font-bold uppercase tracking-wider', tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400')}>{label}</p>
      <p className="mt-0.5 text-[15px] font-bold text-slate-800 dark:text-slate-100">{value}</p>
      {source && <p className="mt-0.5 text-[9px] text-slate-400">{source}</p>}
    </div>
  )
}

/* ---------------- Printable report document ---------------- */
function ReportDocument({ report, onDownload, onPrint, onClose, embedded = false }) {
  const r = report
  const m = r.meta
  return (
    <div id="progress-report-doc" className={cn('report-doc rounded-2xl bg-white p-8 text-slate-900 shadow-card', !embedded && 'dark:bg-white')} style={{ fontFamily: 'inherit' }}>
      {/* Header */}
      <div className="border-b-4 border-indigo-700 pb-5 text-center">
        <p className="text-[13px] font-bold tracking-widest text-indigo-700">MediXO EduX</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">AI ACADEMIC PROGRESS REPORT</h1>
        <p className="mt-1 text-[11px] text-slate-500">Report period: {m.periodLabel} · Generated {formatDate(m.generatedAt, 'MMMM d, yyyy')}</p>
      </div>

      {/* Identity */}
      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-[12px] sm:grid-cols-4">
        {[
          ['Student', m.student], ['Roll number', m.rollNo], ['Program', m.program], ['Semester', m.semester],
          ['Branch', m.branch], ['Academic session', m.academicYear], ['Institution', m.institution], ['Report type', 'Overall'],
        ].map(([l, v]) => (
          <div key={l} className="border-b border-slate-200 pb-1">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{l}</p>
            <p className="font-semibold">{v || '—'}</p>
          </div>
        ))}
      </div>

      {/* Overall score */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Overall academic health</p>
          <p className="mt-1 font-display text-5xl font-bold text-indigo-700">{r.overall.score}</p>
          <Badge variant={STATUS_STYLE[r.overall.grade] ?? 'secondary'}>{r.overall.grade.toUpperCase()}</Badge>
          <p className="mt-1 text-[9px] text-slate-400">weights: {Object.entries(r.overall.weights).filter(([, w]) => w).map(([k, w]) => `${k} ${w}%`).join(' · ')}</p>
        </div>
        <div className="space-y-1.5">
          {r.overall.factors.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-44 truncate text-[11px] font-semibold text-slate-600">{f.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${f.value}%` }} />
              </div>
              <span className="w-10 text-right text-[11px] font-bold">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Executive summary + status */}
      <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-700">Overall status · {r.status}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-slate-700">{r.statusNarrative}</p>
      </div>

      {/* University performance */}
      <div className="mt-6">
        <SectionTitle>University performance</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricChip label="CGPA" value={String(derivedCgpa(r))} />
          <MetricChip label="Attendance" value={r.attendance.overall != null ? `${r.attendance.overall}%` : 'N/A'} />
          <MetricChip label="Assignments" value={r.consistency.assignments != null ? `${Math.round(r.consistency.assignments)}%` : 'N/A'} />
          <MetricChip label="Course completion" value={`${Math.round(r.courses.reduce((a, c) => a + (c.progress ?? 0), 0) / Math.max(r.courses.length, 1))}%`} />
        </div>
      </div>

      {/* Course table */}
      <div className="mt-5">
        <SectionTitle>Course performance</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left">
                <th className="py-1.5 pr-2 font-bold">Course</th><th className="py-1.5 pr-2 text-right font-bold">Score</th>
                <th className="py-1.5 pr-2 text-right font-bold">Attendance</th><th className="py-1.5 pr-2 text-right font-bold">Progress</th>
                <th className="py-1.5 text-right font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {r.courses.map((c) => (
                <tr key={c.code} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2 font-semibold">{c.title}</td>
                  <td className="py-1.5 pr-2 text-right">{c.score}%</td>
                  <td className="py-1.5 pr-2 text-right">{c.attendance != null ? `${c.attendance}%` : '—'}</td>
                  <td className="py-1.5 pr-2 text-right">{c.progress}%</td>
                  <td className="py-1.5 text-right font-semibold">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strengths / weaknesses */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <SectionTitle>Subject strengths</SectionTitle>
          <ol className="space-y-1.5 text-[12px]">
            {r.strengths.slice(0, 3).map((s, i) => (
              <li key={s.subjectCode} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-[10px] font-bold text-emerald-700">{i + 1}</span>
                <span><span className="font-bold">{s.subject}</span> — {Math.round(s.mastery)}%<br /><span className="text-[10px] text-slate-500">{s.note}</span></span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <SectionTitle>Areas requiring improvement</SectionTitle>
          <ol className="space-y-1.5 text-[12px]">
            {r.weaknesses.slice(0, 3).map((w, i) => (
              <li key={w.subjectCode} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-rose-100 text-[10px] font-bold text-rose-700">{i + 1}</span>
                <span><span className="font-bold">{w.subject}</span> — {Math.round(w.mastery)}%{w.trend ? ` · trend ${w.trend}` : ''}<br />
                  <span className="text-[10px] text-slate-500">{w.recommendedAction}</span></span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Attendance */}
      <div className="mt-5">
        <SectionTitle>Attendance report</SectionTitle>
        <div className="grid gap-2 text-[12px] sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase text-slate-400">Overall</p><p className="font-bold">{r.attendance.overall != null ? `${r.attendance.overall}%` : 'N/A'}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase text-slate-400">Strongest</p><p className="font-bold">{r.attendance.strongest ? `${r.attendance.strongest.subject} — ${r.attendance.strongest.pct}%` : '—'}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase text-slate-400">Needs attention</p><p className="font-bold">{r.attendance.weakest ? `${r.attendance.weakest.subject} — ${r.attendance.weakest.pct}%` : 'None'}</p></div>
        </div>
        {r.attendance.requiresAttention && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11.5px] font-semibold text-amber-800">Attendance requires attention.</p>
        )}
      </div>

      {/* Assessments */}
      <div className="mt-5">
        <SectionTitle>Assessment performance {r.trend.delta != null ? `· ${r.trend.direction} (${r.trend.delta >= 0 ? '+' : ''}${r.trend.delta} pts)` : ''}</SectionTitle>
        <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
          {[
            ['Attempted', String(r.attempts.attempted)], ['Accuracy', r.attempts.accuracy != null ? `${r.attempts.accuracy}%` : 'N/A'],
            ['University exams', String(r.attempts.universityExams)], ['Competitive mocks', String(r.attempts.competitiveMocks)],
            ['Latest', r.attempts.latest ? `${r.attempts.latest.pct}%` : '—'], ['Previous', r.attempts.previous ? `${r.attempts.previous.pct}%` : '—'],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] font-bold uppercase text-slate-400">{l}</p><p className="font-bold">{v}</p></div>
          ))}
        </div>
      </div>

      {/* Competitive */}
      <div className="mt-5">
        <SectionTitle>Competitive preparation</SectionTitle>
        {r.compFamilies.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-3 text-[12px] text-slate-500">No competitive activity recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {r.compFamilies.map((f) => (
              <div key={f.family} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold">{f.family} readiness</p>
                  <Badge variant={f.score >= 75 ? 'success' : f.score >= 60 ? 'warning' : 'danger'} size="sm">{f.score} · {f.level}</Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {f.subjects.map((s) => <Badge key={s.subject} variant="outline" size="sm">{s.subject} {Math.round(s.accuracy)}%</Badge>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learning consistency */}
      <div className="mt-5">
        <SectionTitle>Learning consistency</SectionTitle>
        <div className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-5">
          {[
            ['Consistency', r.consistency.score != null ? `${r.consistency.score}%` : 'N/A'],
            ['Streak', r.consistency.streak != null ? `${r.consistency.streak} days` : 'N/A'],
            ['Assignments', r.consistency.assignments != null ? `${Math.round(r.consistency.assignments)}%` : 'N/A'],
            ['Practice/week', r.consistency.practicePerWeek != null ? String(r.consistency.practicePerWeek) : 'N/A'],
            ['Study days/week', r.consistency.studyDays != null ? String(r.consistency.studyDays) : 'N/A'],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 p-2.5"><p className="text-[9px] font-bold uppercase text-slate-400">{l}</p><p className="font-bold">{v}</p></div>
          ))}
        </div>
        {r.consistency.improved && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11.5px] font-semibold text-emerald-800">Learning consistency has improved compared with the previous reporting period.</p>}
      </div>

      {/* AI Academic DNA */}
      <div className="mt-5">
        <SectionTitle>AI Academic DNA summary</SectionTitle>
        <p className="text-[12px] leading-relaxed text-slate-600">{r.dna.summary ?? 'More learning activity is required to generate a reliable academic profile.'}</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Strong concepts</p>
            <div className="mt-1 flex flex-wrap gap-1">{r.dna.strongConcepts.slice(0, 4).map((c) => <Badge key={c} variant="success" size="sm">{c}</Badge>)}</div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Weak concepts</p>
            <div className="mt-1 flex flex-wrap gap-1">{r.dna.weakConcepts.slice(0, 4).map((c) => <Badge key={c} variant="danger" size="sm">{c}</Badge>)}</div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-5">
        <SectionTitle>Recommended next steps</SectionTitle>
        <ol className="space-y-1.5 text-[12px]">
          {r.recommendations.map((rec) => (
            <li key={rec.title} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-[10px] font-bold text-indigo-700">{rec.order}</span>
              <span><span className="font-semibold">{rec.title}</span> <span className="text-[10px] text-slate-500">— {rec.detail}</span></span>
            </li>
          ))}
        </ol>
      </div>

      {/* Goals */}
      <div className="mt-5">
        <SectionTitle>Current goals</SectionTitle>
        {r.goals ? (
          <div className="flex flex-wrap items-center gap-3 text-[12px]">
            <p className="font-semibold">Completed {r.goals.completed} / {r.goals.total} · pending {r.goals.pending}</p>
            <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(r.goals.progress)}%` }} /></div>
            <Badge variant="success" size="sm">{Math.round(r.goals.progress)}%</Badge>
          </div>
        ) : (
          <p className="text-[12px] text-slate-500">No active goals recorded.</p>
        )}
      </div>

      {/* Timeline */}
      <div className="mt-5">
        <SectionTitle>Academic timeline</SectionTitle>
        <ul className="space-y-1.5 text-[11.5px]">
          {r.timeline.slice(0, 8).map((ev) => (
            <li key={ev.id} className="flex items-start gap-2">
              <span className="mt-0.5 w-16 shrink-0 font-bold text-indigo-600">{formatDate(ev.date, 'MMM d')}</span>
              <span className="text-slate-600">{ev.title}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-slate-300 pt-3 text-center text-[10px] text-slate-400">
        MediXO EduX · AI Academic Progress Report · {m.student} · {m.periodLabel} · Generated {formatDate(m.generatedAt, 'MMMM d, yyyy')}
      </div>

      {!embedded && (
        <div className="mt-5 flex flex-wrap justify-center gap-2 print:hidden">
          <Button onClick={onDownload}><Download className="h-4 w-4" /> Download PDF</Button>
          <Button variant="outline" onClick={onPrint}><Printer className="h-4 w-4" /> Print</Button>
          <Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /> Close Preview</Button>
        </div>
      )}
    </div>
  )
}

/* CGPA from the report source (university performance) */
function derivedCgpa(r) {
  return r.cgpa ?? null
}

/* ---------------- Page ---------------- */
function ProgressReport() {
  const toast = useToast()
  const { data: intel, isLoading, isError, refetch } = useStudentIntelligence()
  const [searchParams] = useSearchParams()
  const [period, setPeriod] = useState(searchParams.get('period') ?? 'semester')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [report, setReport] = useState(null)

  useEffect(() => {
    const p = searchParams.get('period')
    if (p && REPORT_PERIODS.some((x) => x.id === p)) setPeriod(p)
  }, [searchParams])

  if (isLoading) return <DashboardSkeleton cards={4} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const derived = intel.derived
  const profile = intel.profile
  const datasets = intel.datasets
  const r = report ?? buildProgressReport({ derived, profile, datasets, period })
  const m = r.meta

  const openPreview = () => setPreviewOpen(true)
  const refresh = (p) => { setPeriod(p); setReport(buildProgressReport({ derived, profile, datasets, period: p })) }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI Academic Intelligence · Progress Report"
        title="AI Academic Progress Report"
        description="A formal, document-ready progress report combining your university, competitive, attendance, assessment, DNA and learning data into one understandable summary."
        breadcrumbs={[{ label: 'Student' }, { label: 'AI Academic Progress Report' }]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print Report</Button>
            <Button size="sm" onClick={openPreview}><Download className="h-4 w-4" /> Download Report</Button>
          </>
        }
      />

      {/* Report period selector */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Report period</p>
        <Select value={period} onValueChange={refresh}>
          {REPORT_PERIODS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
        </Select>
        <Badge variant="secondary" className="px-3 py-1">{m.periodLabel} · generated {formatDate(m.generatedAt, 'MMM d, yyyy')}</Badge>
      </div>

      {/* Embedded document-style report */}
      <ReportDocument report={r} embedded onDownload={openPreview} onPrint={() => window.print()} onClose={() => {}} />

      {/* Download / print preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileBarChart className="h-5 w-5 text-indigo-500" /> Report preview</DialogTitle>
          </DialogHeader>
          <ReportDocument report={r} onDownload={() => { setPreviewOpen(false); toast.info('Download via Print', 'Choose "Save as PDF" in the print dialog — the report is generated in your browser.'); window.print() }} onPrint={() => window.print()} onClose={() => setPreviewOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { ProgressReport, ReportDocument }
export default ProgressReport
