/**
 * Faculty — Similar-Issue Intelligence + Intervention tabs (Phase 5).
 * Rendered INSIDE My Students (no new sidebar items):
 *   · SimilarIssuesTab  — issue groups (≥2 students) + individual issues;
 *     group detail: members · evidence · why-detected · recommendation ·
 *     question bank / PYQ connection · Accept/Modify/Dismiss (prototype).
 *   · InterventionsTab  — priority-sorted intervention center with status
 *     (Detected · Recommended · Planned · Dismissed) + filters.
 * Everything derives from the similar-issues engine — no automatic
 * delivery, no psychological claims, no re-tests.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, BookOpen, CheckCircle2, FileText, Layers, ListChecks, Sparkles, Target, Users, X,
} from 'lucide-react'
import { Badge, Button, Card, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, useToast } from '@/components/ui'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import {
  useSimilarIssues, useInterventions, useInterventionStatus, useRelatedResources,
  useSimilarIssueGroupEvidence, useGroupInterventionPreflight,
} from '@/services/faculty-interventions'
import { EvidenceQuestionsDialog } from './student-evidence'
import { ReviewCreateInterventionDialog } from './intervention-center'

const PRIORITY_STYLE = { Critical: 'danger', High: 'danger', Medium: 'warning', Low: 'secondary' }
const STATUS_STYLE = { Detected: 'secondary', Recommended: 'warning', Planned: 'info', Dismissed: 'outline' }
const SEVERITY_STYLE = { Critical: 'danger', High: 'danger', Medium: 'warning', Low: 'secondary' }

/* ================= Related resources (Question Bank + PYQ) ================= */
function RelatedResourcesDialog({ open, onOpenChange, subject, chapter, examFamily }) {
  const { data, isLoading } = useRelatedResources({ subject, chapter, examFamily })
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Related resources — {chapter} ({subject}{examFamily ? ` · ${examFamily}` : ''})</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[55vh] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
              <BookOpen className="h-3.5 w-3.5" /> Question bank ({data?.questions?.length ?? 0})
            </p>
            {isLoading ? <p className="text-xs text-slate-400">Loading…</p> : (data?.questions ?? []).map((q) => (
              <div key={q.id} className="mb-2 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" size="sm">{q.id}</Badge>
                  <Badge variant="outline" size="sm">{q.type} · {q.difficulty}</Badge>
                  {q.pyqFrequency > 0 && <Badge variant="warning" size="sm">PYQ ×{q.pyqFrequency}</Badge>}
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-slate-700 dark:text-slate-200">{q.text}</p>
              </div>
            ))}
            {!isLoading && !(data?.questions ?? []).length && <p className="text-[11px] text-slate-400">No bank questions for this chapter.</p>}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
              <FileText className="h-3.5 w-3.5" /> PYQs ({data?.pyqs?.length ?? 0})
            </p>
            {isLoading ? <p className="text-xs text-slate-400">Loading…</p> : (data?.pyqs ?? []).map((q) => (
              <div key={q.id} className="mb-2 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" size="sm">{q.id}</Badge>
                  <Badge variant="warning" size="sm">{q.exam} · {q.year}</Badge>
                  <Badge variant="outline" size="sm">{q.difficulty}</Badge>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-slate-700 dark:text-slate-200">{q.text}</p>
              </div>
            ))}
            {!isLoading && !(data?.pyqs ?? []).length && <p className="text-[11px] text-slate-400">No PYQs for this chapter.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ================= Group detail ================= */
function GroupDetailDialog({ group, open, onOpenChange, onApply }) {
  const toast = useToast()
  const { mutateAsync: setStatus } = useInterventionStatus()
  const [resourcesOpen, setResourcesOpen] = useState(false)
  if (!group) return null
  const ev = group.evidence ?? {}

  const act = async (status, action = null) => {
    await setStatus({ groupId: group.id, status, action })
    toast.success(status === 'Planned' ? 'Planned' : status === 'Dismissed' ? 'Dismissed' : 'Reviewed',
      status === 'Planned' ? 'Intervention marked as planned — no delivery is automated.' : status === 'Dismissed' ? 'Intervention dismissed — no action taken.' : 'Intervention reviewed and recommended.')
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" /> {group.name}
              <Badge variant={PRIORITY_STYLE[group.priority] ?? 'secondary'}>{group.priority}</Badge>
              <Badge variant={SEVERITY_STYLE[group.severity] ?? 'secondary'}>{group.severity} severity</Badge>
            </DialogTitle>
          </DialogHeader>

          {/* why detected */}
          <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/60 p-4 dark:border-indigo-500/25 dark:bg-indigo-500/5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
              <Sparkles className="h-3 w-3" /> Why this group?
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200">{group.whyDetected}</p>
          </div>

          {/* evidence */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: 'Students', value: String(ev.students ?? group.studentCount) },
              { label: 'Avg accuracy', value: `${ev.avgAccuracy ?? 0}%` },
              { label: 'Avg time', value: `${ev.avgTime ?? 0}s` },
              { label: 'Questions', value: String(ev.questions ?? 0) },
              { label: 'Incorrect', value: String(ev.incorrect ?? 0) },
              { label: 'Skipped', value: String(ev.skipped ?? 0) },
              { label: 'Affected exams', value: String(ev.affectedExams ?? 0) },
              { label: 'Persistence', value: `${ev.persistence ?? 1} attempt${(ev.persistence ?? 1) === 1 ? '' : 's'}` },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                <p className="text-[15px] font-bold text-slate-900 dark:text-white">{m.value}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
              </div>
            ))}
          </div>

          {group.interventionOutcome?.received > 0 && <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-500/25 dark:bg-teal-500/5"><div className="flex flex-wrap items-center gap-2"><p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">Intervention Outcome</p><Badge variant="info" size="sm">Prototype group outcome</Badge></div><p className="mt-1 text-[10.5px] text-teal-800 dark:text-teal-200">Observed outcome after intervention — not a causal claim.</p><div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{[
            ['Received', group.interventionOutcome.received], ['Completed', group.interventionOutcome.completed], ['Re-tested', group.interventionOutcome.retested], ['Improved', group.interventionOutcome.improved], ['Resolved', group.interventionOutcome.resolved], ['Improving', group.interventionOutcome.improving], ['Persistent', group.interventionOutcome.persistent], ['No change', group.interventionOutcome.noSignificantChange], ['Avg accuracy Δ', group.interventionOutcome.averageAccuracyChange == null ? 'N/A' : `${group.interventionOutcome.averageAccuracyChange >= 0 ? '+' : ''}${group.interventionOutcome.averageAccuracyChange} pp`], ['Avg time Δ', group.interventionOutcome.averageTimeChange == null ? 'N/A' : `${group.interventionOutcome.averageTimeChange >= 0 ? '−' : '+'}${Math.abs(group.interventionOutcome.averageTimeChange)}s`],
          ].map(([label, value]) => <div key={label} className="rounded-xl bg-white/70 p-2 text-center dark:bg-slate-900/50"><p className="text-sm font-bold text-slate-800 dark:text-white">{value}</p><p className="text-[8.5px] font-bold uppercase text-slate-400">{label}</p></div>)}</div></div>}

          {/* recommendation */}
          <div className="rounded-2xl border border-emerald-100 p-4 dark:border-emerald-500/20">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Recommended intervention
            </p>
            <p className="mt-1 text-[13px] font-bold text-slate-800 dark:text-slate-100">{group.recommendation?.title}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(group.recommendation?.actions ?? []).map((a) => (
                <Badge key={a.label} variant="outline" size="sm">{a.label}</Badge>
              ))}
            </div>
          </div>

          {/* members */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Users className="h-3.5 w-3.5" /> Students ({group.students?.length ?? 0})
            </p>
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-center">Accuracy</TableHead>
                    <TableHead className="text-center">Avg time</TableHead>
                    <TableHead>Trend</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(group.students ?? []).map((s) => (
                    <TableRow key={s.studentId}>
                      <TableCell>
                        <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                        <p className="text-[10.5px] font-medium text-slate-400">{s.roll}</p>
                      </TableCell>
                      <TableCell className="text-[11.5px] text-slate-500">{s.batchId ? s.batchId.replace('batch_', '').toUpperCase() : '—'}</TableCell>
                      <TableCell className={`text-center font-bold ${s.accuracy >= 55 ? 'text-amber-600' : 'text-rose-500'}`}>{s.accuracy}%</TableCell>
                      <TableCell className="text-center text-[12px] font-semibold text-slate-600 dark:text-slate-300">{s.avgTime}s</TableCell>
                      <TableCell><Badge variant={s.trend === 'improving' ? 'success' : s.trend === 'declining' ? 'danger' : 'secondary'} size="sm">{s.trend}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Link to={`/faculty/my-students/${s.studentId}`}>
                          <Button size="sm" variant="outline">View Student</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* actions */}
          <div className="mt-2 flex flex-wrap gap-2">
            <Link to={`/faculty/question-intelligence?tab=question-intelligence&subject=${encodeURIComponent(group.subject)}&chapter=${encodeURIComponent(group.chapter)}${group.examFamily ? `&family=${group.examFamily}` : ''}`}>
              <Button size="sm" variant="outline"><BookOpen className="h-3.5 w-3.5" /> Open Question Bank</Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => setResourcesOpen(true)}><FileText className="h-3.5 w-3.5" /> View PYQs</Button>
            <span className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { onOpenChange(false); onApply?.() }}><Target className="h-3.5 w-3.5" /> Apply Intervention</Button>
              <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => act('Dismissed')}><X className="h-3.5 w-3.5" /> Dismiss recommendation</Button>
            </span>
          </div>
          <p className="text-[10.5px] font-medium text-slate-400">Prototype state only — nothing is delivered to students automatically.</p>
        </DialogContent>
      </Dialog>
      <RelatedResourcesDialog
        open={resourcesOpen}
        onOpenChange={setResourcesOpen}
        subject={group.subject}
        chapter={group.chapter}
        examFamily={group.examFamily}
      />
    </>
  )
}

/* ================= Multi-student intervention workflow ================= */
function GroupInterventionWorkflow({ group, open, onOpenChange }) {
  const [selectedIds, setSelectedIds] = useState(() => (group?.students ?? []).filter((s) => !s.existingIntervention).map((s) => s.studentId))
  const [questionCount, setQuestionCount] = useState(8)
  const [selectionLevel, setSelectionLevel] = useState('exact')
  const [stage, setStage] = useState('select')
  const [evidenceRows, setEvidenceRows] = useState(null)
  const [result, setResult] = useState(null)
  const config = { count: questionCount, difficulty: 'Mixed', questionType: 'Any', pyqPreference: 'Preferred', selectionLevel }
  const evidenceQuery = useSimilarIssueGroupEvidence(open ? group?.id : null)
  const preflight = useGroupInterventionPreflight(open ? group?.id : null, config)

  if (!group) return null
  const students = preflight.data?.students ?? group.students ?? []
  const selectedStudents = students.filter((s) => selectedIds.includes(s.studentId))
  const availability = preflight.data?.practiceAvailability
  const domainLabel = group.domain === 'University' ? 'University' : group.examFamily
  const close = () => {
    setStage('select')
    setResult(null)
    setEvidenceRows(null)
    onOpenChange?.(false)
  }
  const broaden = () => setSelectionLevel((current) => current === 'exact' ? 'difficulty' : 'subject')

  if (stage === 'review') {
    return (
      <ReviewCreateInterventionDialog
        open onOpenChange={(value) => { if (!value) setStage('select') }}
        group={group} students={selectedStudents}
        domain={domainLabel} subject={group.subject} chapter={group.chapter}
        issueLabel={group.issueType} whyDetected={group.whyDetected}
        evidenceSummary={[
          `${group.evidence?.questions ?? 0} questions across ${group.evidence?.affectedExams ?? 0} assessments`,
          `${group.studentCount} students · ${group.avgAccuracy}% average accuracy · ${group.avgTime}s average time`,
          `Trend: ${group.trend ?? 'N/A'}`,
        ]}
        defaults={{
          title: `${group.chapter} Accuracy Recovery`, priority: group.priority,
          objective: `Improve ${group.chapter} accuracy.`, count: questionCount, difficulty: 'Mixed', duration: 20,
          pyqPreference: 'Preferred', questionType: 'Any', selectionLevel,
        }}
        onCreated={(summary) => { setResult(summary); setStage('result') }}
      />
    )
  }

  if (stage === 'result') {
    const first = result?.created?.[0]
    return (
      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{result?.createdCount ?? 0} interventions created</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/5">
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">One Recommended intervention record per student</p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{result?.commonTarget} · Priority {result?.priority}. Nothing was assigned automatically.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Created students ({result?.createdCount ?? 0})</p>
                {(result?.created ?? []).map((item) => <p key={item.studentId} className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">✓ {item.name} · {item.status}</p>)}
              </div>
              <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Skipped students ({result?.skippedCount ?? 0})</p>
                {(result?.skipped ?? []).map((item) => <p key={item.studentId} className="mt-1 text-xs font-semibold text-rose-600">• {item.name}: {item.reason}</p>)}
                {!result?.skippedCount && <p className="mt-1 text-xs text-slate-400">None</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/faculty/my-students?view=interventions"><Button>Open Intervention Center</Button></Link>
              {first && <Link to={`/faculty/my-students/${first.studentId}?tab=interventions`}><Button variant="outline">View Student 360</Button></Link>}
              <Button variant="ghost" onClick={close}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader><DialogTitle>Create Intervention for Students</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {[
                ['Issue', group.issueType], ['Domain', group.domain], ['Exam family', group.examFamily ?? 'University'],
                ['Subject', group.subject], ['Chapter', group.chapter], ['Issue type', group.issueType],
                ['Group size', group.studentCount], ['Average accuracy', `${group.avgAccuracy}%`], ['Average time', `${group.avgTime}s`],
                ['Trend', group.trend ?? 'N/A'], ['Evidence', group.evidence?.questions ?? 0], ['Assessments', group.evidence?.affectedExams ?? 0],
              ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-0.5 text-[11.5px] font-bold text-slate-800 dark:text-slate-100">{value}</p></div>)}
            </div>

            <div className="rounded-2xl border border-indigo-100 p-4 dark:border-indigo-500/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">Group Evidence</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{group.studentCount} students · {group.evidence?.affectedExams ?? 0} assessments · {group.evidence?.questions ?? 0} evidence questions · Average accuracy {group.avgAccuracy}% · Average time {group.avgTime}s · Trend {group.trend}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEvidenceRows(evidenceQuery.data?.rows ?? [])}>View Group Evidence</Button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Students ({selectedIds.length} selected)</p>
                <div className="flex gap-1.5"><Button size="sm" variant="ghost" onClick={() => setSelectedIds(students.filter((s) => !s.existingIntervention).map((s) => s.studentId))}>Select All</Button><Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Clear All</Button></div>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                <Table className="min-w-[900px]">
                  <TableHeader><TableRow><TableHead>Select</TableHead><TableHead>Student</TableHead><TableHead>Batch</TableHead><TableHead>Accuracy</TableHead><TableHead>Avg time</TableHead><TableHead>Trend</TableHead><TableHead>Priority</TableHead><TableHead>Evidence</TableHead><TableHead>Status</TableHead><TableHead>Evidence</TableHead></TableRow></TableHeader>
                  <TableBody>{students.map((s) => {
                    const blocked = !!s.existingIntervention
                    return <TableRow key={s.studentId}>
                      <TableCell><input type="checkbox" checked={selectedIds.includes(s.studentId)} disabled={blocked} onChange={(e) => setSelectedIds((ids) => e.target.checked ? [...ids, s.studentId] : ids.filter((id) => id !== s.studentId))} aria-label={`Select ${s.name}`} /></TableCell>
                      <TableCell><p className="text-xs font-bold">{s.name}</p><p className="text-[10px] text-slate-400">{s.roll ?? s.studentId}</p></TableCell>
                      <TableCell className="text-xs">{s.batchId}</TableCell><TableCell className="text-xs font-bold">{s.accuracy ?? 'N/A'}{s.accuracy != null ? '%' : ''}</TableCell><TableCell className="text-xs">{s.avgTime ?? 'N/A'}{s.avgTime != null ? 's' : ''}</TableCell>
                      <TableCell><Badge size="sm" variant="secondary">{s.trend ?? 'N/A'}</Badge></TableCell><TableCell><Badge size="sm" variant={PRIORITY_STYLE[s.priority] ?? 'secondary'}>{s.priority ?? group.priority}</Badge></TableCell><TableCell className="text-xs">{s.evidenceCount ?? s.evidence?.questions ?? 0}</TableCell>
                      <TableCell>{blocked ? <div><Badge variant="warning" size="sm">Existing intervention</Badge><p className="mt-1 text-[9.5px] text-slate-400">Cannot select: {s.exclusionReason ?? `${s.existingIntervention.status} intervention is active`}</p></div> : <Badge variant="success" size="sm">Eligible</Badge>}</TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => setEvidenceRows(evidenceQuery.data?.students?.find((row) => row.studentId === s.studentId)?.rows ?? s.evidenceRows ?? [])}>View Student Evidence</Button></TableCell>
                    </TableRow>
                  })}</TableBody>
                </Table>
              </div>
            </div>

            <div className={`rounded-2xl border p-4 ${availability?.insufficient ? 'border-rose-200 bg-rose-50/60 dark:border-rose-500/25' : 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/25'}`}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Practice availability pre-flight</p>
              <div className="mt-2 flex flex-wrap items-center gap-2"><label className="text-[10.5px] font-bold text-slate-500">Required questions <Input className="ml-1 inline-block h-8 w-20" type="number" min={1} max={30} value={questionCount} onChange={(e) => setQuestionCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} /></label>{preflight.isLoading ? <span className="text-xs text-slate-400">Checking existing question datasets…</span> : <><Badge variant={availability?.insufficient ? 'danger' : 'success'}>Available: {availability?.availableQuestions ?? '—'}</Badge><Badge variant="outline">Required: {availability?.requiredQuestions ?? questionCount}</Badge>{availability?.insufficient && <Badge variant="danger">Shortfall: {availability.shortfall}</Badge>}{availability?.insufficient && <Button size="sm" variant="outline" onClick={broaden} disabled={selectionLevel === 'subject'}>Broaden Filters</Button>}</>}</div>
              {availability?.insufficient && <p className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300">Not enough questions match this configuration. The requested count will not be reduced.</p>}
            </div>

            <div className="flex flex-wrap gap-2"><Button disabled={!selectedIds.length || preflight.isLoading || availability?.insufficient} onClick={() => setStage('review')}>Review &amp; Create</Button><Button variant="outline" onClick={close}>Cancel</Button></div>
          </div>
        </DialogContent>
      </Dialog>
      <EvidenceQuestionsDialog open={evidenceRows !== null} onOpenChange={(v) => !v && setEvidenceRows(null)} title={`${evidenceRows?.[0]?.studentName ? `${evidenceRows[0].studentName} evidence` : 'Group Evidence'} — ${group.chapter}`} rows={evidenceRows ?? []} subject={group.subject} chapter={group.chapter} domain={domainLabel} />
    </>
  )
}

/* ================= Group card ================= */
function GroupCard({ group, onOpen, onApply }) {
  return (
    <div className="group min-w-0 overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40">
      <button onClick={onOpen} className="w-full text-left">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-500">{group.examFamily ? `${group.examFamily} · ${group.domain}` : group.domain}</p>
          <h3 className="mt-1 truncate text-[14.5px] font-bold text-slate-900 dark:text-white">{group.subject} — {group.chapter}</h3>
          <p className="mt-0.5 text-[11.5px] font-medium text-slate-400">{group.issueType}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={PRIORITY_STYLE[group.priority] ?? 'secondary'}>{group.priority}</Badge>
          <Badge variant="gradient" size="sm">{group.studentCount} students</Badge>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
          <p className="text-[15px] font-bold text-slate-900 dark:text-white">{group.avgAccuracy}%</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Avg acc.</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
          <p className="text-[15px] font-bold text-slate-900 dark:text-white">{group.avgTime}s</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Avg time</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
          <p className="text-[15px] font-bold text-slate-900 dark:text-white">{group.totalIncorrect}</p>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Incorrect</p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold text-slate-400">
        <span>{group.affectedExams} affected exam days</span>
        {group.persistent && <Badge variant="danger" size="sm">Persistent</Badge>}
        {group.declining && <Badge variant="warning" size="sm">Declining</Badge>}
        {group.highTime && <Badge variant="warning" size="sm">High time</Badge>}
      </div>
      {group.interventionOutcome?.received > 0 && <div className="mt-3 rounded-xl bg-teal-50 p-2 text-[10.5px] font-semibold text-teal-800 dark:bg-teal-500/10 dark:text-teal-200">Prototype group outcome · {group.interventionOutcome.received} received · {group.interventionOutcome.improved} improved · Average accuracy change {group.interventionOutcome.averageAccuracyChange == null ? 'N/A' : `${group.interventionOutcome.averageAccuracyChange >= 0 ? '+' : ''}${group.interventionOutcome.averageAccuracyChange} pp`}</div>}
      </button>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Button size="sm" onClick={onApply}><Target className="h-3.5 w-3.5" /> Apply Intervention</Button>
        <Button size="sm" variant="ghost" onClick={onOpen}>View group evidence</Button>
      </div>
    </div>
  )
}

/* ================= Similar Issues tab ================= */
function SimilarIssuesTab({ scope = 'all', onScopeChange }) {
  const { data, isLoading, isError, refetch } = useSimilarIssues(scope)
  const [selected, setSelected] = useState(null)
  const [applyGroup, setApplyGroup] = useState(null)
  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Similar-issue student groups</h3>
          <p className="mt-0.5 text-xs text-slate-400">Students sharing the same academic issue — grouped by domain → exam → subject → chapter (prototype "AI Similarity Score", not validated).</p>
        </div>
        <div className="flex rounded-2xl border border-slate-200/80 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {['all', 'batch'].map((s) => (
            <button key={s} onClick={() => onScopeChange?.(s)}
              className={`rounded-xl px-4 py-1.5 text-[12px] font-bold transition-all ${scope === s ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
              {s === 'all' ? 'All my students' : 'My batch'}
            </button>
          ))}
        </div>
      </div>

      {data?.groups?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.groups.map((g) => <GroupCard key={g.id} group={g} onOpen={() => setSelected(g)} onApply={() => setApplyGroup(g)} />)}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No similar-issue groups found</p>
          <p className="mt-1 text-xs text-slate-400">Groups require at least 2 students sharing the same domain, subject and chapter issue.</p>
        </div>
      )}

      {data?.individualCount > 0 && (
        <Card className="p-4">
          <p className="flex items-center gap-2 text-[12px] font-bold text-slate-500 dark:text-slate-300">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Individual issues — {data.individualCount} student(s) with no similar group
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.individuals.slice(0, 12).map((f) => (
              <Link key={f.studentId} to={`/faculty/my-students/${f.studentId}`}>
                <Badge variant="secondary" size="sm" className="max-w-[300px] cursor-pointer truncate hover:border-indigo-300">
                  {f.name} · {f.subject} — {f.chapter} ({f.issueType})
                </Badge>
              </Link>
            ))}
            {data.individualCount > 12 && <Badge variant="secondary" size="sm">+{data.individualCount - 12} more</Badge>}
          </div>
        </Card>
      )}

      <p className="text-[10.5px] font-medium text-slate-400">
        {data?.note} Demo attempts are excluded from all grouping.
      </p>

      <GroupDetailDialog group={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} onApply={() => { setApplyGroup(selected); setSelected(null) }} />
      <GroupInterventionWorkflow key={applyGroup?.id ?? 'none'} group={applyGroup} open={!!applyGroup} onOpenChange={(v) => !v && setApplyGroup(null)} />
    </div>
  )
}

/* ================= Interventions tab ================= */
function InterventionsTab() {
  const { data, isLoading, isError, refetch } = useInterventions()
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const items = (data?.items ?? []).filter((i) =>
    (statusFilter === 'All' || i.status === statusFilter) &&
    (priorityFilter === 'All' || i.priority === priorityFilter))
    .sort((a, b) => ({ Critical: 0, High: 1, Medium: 2, Low: 3 }[a.priority] - { Critical: 0, High: 1, Medium: 2, Low: 3 }[b.priority]))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">AI Intervention Center</h3>
          <p className="mt-0.5 text-xs text-slate-400">Evidence-based recommendations — faculty reviews before anything is planned. No automatic delivery.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {['All', 'Detected', 'Recommended', 'Planned', 'Dismissed'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${statusFilter === s ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
              {s}
            </button>
          ))}
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <option value="All">All priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {items.length ? (
        <div className="space-y-3">
          {items.map((i) => (
            <button key={i.id} onClick={() => setSelected({ ...i, group: data?.items?.find((x) => x.id === i.id) })}
              className="flex w-full flex-wrap items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${i.priority === 'Critical' || i.priority === 'High' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-slate-900 dark:text-white">
                  {i.issue}
                  <Badge variant={PRIORITY_STYLE[i.priority]} size="sm">{i.priority}</Badge>
                  <Badge variant={STATUS_STYLE[i.status]} size="sm">{i.status}</Badge>
                </p>
                <p className="mt-0.5 text-[11.5px] font-medium text-slate-400">
                  {i.students} students · {i.issueType} · {i.recommendation?.title}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-bold text-indigo-600 dark:text-indigo-300">Review →</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
          <ListChecks className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No interventions in this view</p>
        </div>
      )}

      <GroupDetailDialog group={selected?.group ?? null} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  )
}

export { SimilarIssuesTab, InterventionsTab }
export default { SimilarIssuesTab, InterventionsTab }
