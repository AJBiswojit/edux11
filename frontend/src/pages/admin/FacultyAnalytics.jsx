/**
 * Admin — Faculty Analytics (Full Analysis)
 * Route: /admin/faculty/:facultyId
 *
 * Data shape from GET /admin/faculty/:id/analytics:
 *   { profile, intelligence: { profile, datasets, derived } }
 *
 * Tabs: Overview · Teaching · Student Performance · Assessment · Research
 */
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart2,
  BookOpen,
  ClipboardList,
  FileText,
  FlaskConical,
  Layers,
  Users,
} from 'lucide-react'
import { useAdminFacultyAnalytics } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton } from '@/components/shared/loading'
import { Avatar, Badge, Button, Card, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'

/* ─── helpers ─────────────────────────────────────────────────── */
const dash = (v) => (v == null || v === '' ? '—' : v)
const pct  = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`)
const num  = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN'))

function KpiCard({ label, value, sub, accent }) {
  return (
    <Card className="flex flex-col gap-1 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? 'text-slate-800 dark:text-slate-100'}`}>{dash(value)}</p>
      {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </Card>
  )
}

/* ─── Overview tab ───────────────────────────────────────────── */
function OverviewPanel({ profile, derived }) {
  const health   = derived?.teachingHealth ?? {}
  const engage   = derived?.studentEngagement ?? {}
  const assess   = derived?.assessmentHealth ?? {}
  const summary  = derived?.assessmentSummary ?? {}
  const attn     = derived?.attentionStudents ?? {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Teaching score"   value={health.score != null ? `${health.score}/100` : '—'} sub={health.grade} />
        <KpiCard label="Engagement score" value={engage.score != null ? `${engage.score}/100` : '—'} />
        <KpiCard label="Assessment score" value={assess.score != null ? `${assess.score}/100` : '—'} />
        <KpiCard label="Students flagged" value={num(attn.total)} sub={`${num(attn.high ?? 0)} high priority`} accent={(attn.total ?? 0) > 0 ? 'text-rose-500' : undefined} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Question bank"    value={num(summary.questionBank)}   sub={`${num(summary.aiGenerated)} AI-generated`} />
        <KpiCard label="Papers generated" value={num(summary.papersGenerated)} />
        <KpiCard label="Pending grading"  value={num(derived?.assignmentCompletion?.pendingGrading)} />
        <KpiCard label="Courses"          value={num((profile?.courses ?? []).length)} />
      </div>

      {/* Teaching health factors */}
      {(health.factors ?? []).length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Teaching Health Breakdown</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {health.factors.map((f) => (
              <div key={f.label} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-300">{f.label}</span>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(f.value ?? 0, 100)}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">{pct(f.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Teaching tab ───────────────────────────────────────────── */
function TeachingPanel({ datasets }) {
  const courses   = datasets?.courses   ?? []
  const timetable = datasets?.timetable ?? []

  return (
    <div className="space-y-6">
      {courses.length === 0 ? (
        <EmptyState message="No courses assigned this term." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
              <tr>
                {['Code', 'Title', 'Students', 'Lectures', 'Avg Score', 'Pass Rate'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {courses.map((c, i) => (
                <tr key={c.id ?? i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">{dash(c.code)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{dash(c.title)}</td>
                  <td className="px-4 py-3 text-slate-500">{num(c.students ?? c.enrolledStudents)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.lecturesDone != null ? `${c.lecturesDone}/${c.lecturesTotal ?? '?'}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${(c.avgScore ?? 0) >= 70 ? 'text-emerald-600 dark:text-emerald-400' : (c.avgScore ?? 0) >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'}`}>
                      {c.avgScore != null ? pct(c.avgScore) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${(c.passRate ?? 0) >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {c.passRate != null ? pct(c.passRate) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {timetable.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Weekly Schedule</h3>
          <div className="flex flex-wrap gap-2">
            {timetable.map((slot, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/50">
                <p className="font-semibold text-slate-700 dark:text-slate-200">{dash(slot.day)} · {dash(slot.startTime ?? slot.time)}</p>
                <p className="text-slate-400">{dash(slot.courseCode ?? slot.course ?? slot.subject)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Student Performance tab ────────────────────────────────── */
function StudentPerformancePanel({ derived }) {
  const engage  = derived?.studentEngagement ?? {}
  const attn    = derived?.attentionStudents ?? {}
  const atItems = attn.items ?? []
  const attIntel = derived?.attendanceIntelligence ?? {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Engagement score"   value={engage.score != null ? `${engage.score}/100` : '—'} />
        <KpiCard label="Avg attendance"     value={pct(attIntel.overall)} />
        <KpiCard label="Assignment completion" value={pct(engage.assignmentCompletion)} />
        <KpiCard label="Students flagged"   value={num(attn.total)} accent={(attn.total ?? 0) > 0 ? 'text-rose-500' : undefined} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Students Needing Attention {atItems.length > 0 && <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">{atItems.length}</span>}
        </h3>
        {atItems.length === 0 ? (
          <EmptyState message="No students flagged for attention." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <tr>
                  {['Student', 'Roll', 'Category', 'Priority', 'Risk', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {atItems.map((s, i) => (
                  <tr key={s.id ?? i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{dash(s.name)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{dash(s.roll)}</td>
                    <td className="px-4 py-3 text-slate-500">{dash(s.category)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.priority === 'High' ? 'danger' : 'warning'} size="sm">{s.priority ?? '—'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(s.risk ?? 0, 100)}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{s.risk ?? 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{s.suggestedAction ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Low attendance */}
      {(attIntel.lowAttendance ?? []).length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Low Attendance Students</h3>
          <div className="flex flex-wrap gap-2">
            {attIntel.lowAttendance.map((s, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/50">
                <p className="font-semibold text-slate-700 dark:text-slate-200">{dash(s.name)}</p>
                <p className="text-rose-500">{pct(s.attendance)} · {s.level}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Assessment tab (assignments only) ──────────────────────── */
function AssessmentPanel({ derived }) {
  const summary     = derived?.assessmentSummary ?? {}
  const evalProg    = derived?.evaluationProgress ?? {}
  const assignComp  = derived?.assignmentCompletion ?? {}
  const assignments = assignComp.items ?? []

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Total assignments"     value={num(assignments.length)} />
        <KpiCard label="Graded"                value={num(evalProg.graded)}   sub={`of ${num(evalProg.submitted)} submitted`} />
        <KpiCard label="Pending grading"       value={num(evalProg.pending)}  accent={(evalProg.pending ?? 0) > 0 ? 'text-amber-500' : undefined} />
        <KpiCard label="Assignment completion" value={pct(assignComp.overallSubmission)} />
        <KpiCard label="Graded rate"           value={pct(assignComp.overallGraded)} />
        <KpiCard label="Quizzes"               value={num(summary.quizzes)} />
      </div>

      {/* Assignments table */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Assignments
          {assignments.length > 0 && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {assignments.length}
            </span>
          )}
        </h3>
        {assignments.length === 0 ? (
          <EmptyState message="No assignments created yet." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <tr>
                  {['Title', 'Status', 'Submissions', 'Graded', 'Pending', 'Completion'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignments.map((a, i) => {
                  const statusVariant = a.status === 'Graded' ? 'success' : a.status === 'Open' ? 'info' : 'secondary'
                  return (
                    <tr key={a.id ?? i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="max-w-[220px] truncate px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{dash(a.title)}</td>
                      <td className="px-4 py-3">
                        {a.status
                          ? <Badge variant={statusVariant} size="sm">{a.status}</Badge>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{num(a.submissions)}</td>
                      <td className="px-4 py-3 text-slate-500">{num(a.graded)}</td>
                      <td className="px-4 py-3">
                        {(a.pendingGrading ?? 0) > 0
                          ? <Badge variant="warning" size="sm">{a.pendingGrading} pending</Badge>
                          : <span className="text-xs font-medium text-emerald-500">All graded</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(a.submissionRate ?? 0, 100)}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{pct(a.submissionRate)}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Papers tab (exam papers only) ─────────────────────────── */
function PapersPanel({ derived }) {
  const papers  = derived?.assessment?.paperLibrary ?? []
  const summary = derived?.assessmentSummary ?? {}

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total papers"   value={num(summary.papersGenerated ?? papers.length)} />
        <KpiCard label="Published"      value={num(papers.filter(p => (p.status ?? '').toLowerCase() === 'published').length)} />
        <KpiCard label="Drafts"         value={num(summary.examDrafts ?? papers.filter(p => (p.status ?? '').toLowerCase() === 'draft').length)} />
        <KpiCard label="Question bank"  value={num(summary.questionBank)} sub={`${num(summary.aiGenerated)} AI-generated`} />
      </div>

      {/* Papers table */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Exam Papers
          {papers.length > 0 && (
            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              {papers.length}
            </span>
          )}
        </h3>
        {papers.length === 0 ? (
          <EmptyState message="No exam papers created yet." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <tr>
                  {['Title', 'Type', 'Marks', 'Duration', 'Status', 'Created'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {papers.map((p, i) => {
                  const status = (p.status ?? '').toLowerCase()
                  const badgeVariant = status === 'published' ? 'success' : status === 'draft' ? 'warning' : 'secondary'
                  const createdRaw = p.generated ?? p.createdAt ?? p.created_at
                  return (
                    <tr key={p.id ?? i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="max-w-[220px] truncate px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{dash(p.title)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{dash(p.paperType ?? p.paper_type ?? p.examMode ?? p.exam_mode)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{dash(p.totalMarks ?? p.total_marks)}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {(p.durationMinutes ?? p.duration_minutes) ? `${p.durationMinutes ?? p.duration_minutes} min` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={badgeVariant} size="sm">{p.status ?? '—'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {createdRaw
                          ? new Date(createdRaw).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Research tab ───────────────────────────────────────────── */
function ResearchPanel({ datasets }) {
  const research = datasets?.research ?? {}
  const summary  = research?.summary ?? {}
  const pubs     = research?.publications ?? []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Publications" value={num(summary.publications)} />
        <KpiCard label="Citations"    value={num(summary.citations)} />
        <KpiCard label="h-index"      value={dash(summary.hIndex)} />
        <KpiCard label="Active grants" value={num(summary.grants)} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Publications</h3>
        {pubs.length === 0 ? (
          <EmptyState message="No publications on record." />
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
            {pubs.slice(0, 10).map((p, i) => (
              <div key={p.id ?? i} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800 dark:text-slate-100">{dash(p.title)}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{dash(p.venue ?? p.journal)} · {dash(p.year)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.status && (
                    <Badge variant={p.status === 'Published' ? 'success' : 'info'} size="sm">{p.status}</Badge>
                  )}
                  {p.citations != null && (
                    <span className="text-xs text-slate-400">{p.citations} cit.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Empty state ────────────────────────────────────────────── */
function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-slate-700">
      {message}
    </div>
  )
}

/* ─── Tabs config ────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',    label: 'Overview',           icon: Layers },
  { id: 'teaching',    label: 'Teaching',            icon: BookOpen },
  { id: 'students',    label: 'Student Performance', icon: Users },
  { id: 'assessment',  label: 'Assessment',          icon: ClipboardList },
  { id: 'papers',      label: 'Papers',              icon: FileText },
  { id: 'research',    label: 'Research',            icon: FlaskConical },
]

/* ─── Main page ──────────────────────────────────────────────── */
function FacultyAnalytics() {
  const { facultyId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(() => searchParams.get('tab') ?? 'overview')

  const { data, isLoading, isError, error, refetch } = useAdminFacultyAnalytics(facultyId)

  function handleTabChange(value) {
    setTab(value)
    setSearchParams({ tab: value }, { replace: true })
  }

  if (isLoading) return <DashboardSkeleton cards={4} />

  if (isError) {
    const is404 = error?.response?.status === 404
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <BarChart2 className="h-10 w-10 text-slate-300 dark:text-slate-600" />
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
          {is404 ? 'Faculty member not found' : 'Failed to load analytics'}
        </p>
        <p className="max-w-sm text-sm text-slate-400">
          {is404
            ? 'This faculty member does not exist or does not belong to your institution.'
            : 'Something went wrong while loading the data. Please try again.'}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/faculty')}>
            <ArrowLeft className="h-4 w-4" /> Back to Faculty
          </Button>
          {!is404 && <Button size="sm" onClick={() => refetch()}>Try again</Button>}
        </div>
      </div>
    )
  }

  /* The endpoint returns { profile, intelligence }
     intelligence itself is { profile, datasets, derived } */
  const profile      = data?.profile ?? data?.intelligence?.profile ?? {}
  const intelligence = data?.intelligence ?? {}
  const datasets     = intelligence?.datasets ?? {}
  const derived      = intelligence?.derived ?? {}

  const name        = profile?.fullName ?? profile?.full_name ?? 'Faculty Member'
  const designation = profile?.designation
  const department  = profile?.department
  const email       = profile?.email
  const facultyCode = profile?.facultyId ?? profile?.id

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Link to="/admin/faculty" className="hover:text-indigo-600 dark:hover:text-indigo-400">Faculty</Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{name}</span>
          </span>
        }
        title={name}
        description={[designation, department].filter(Boolean).join(' · ') || 'Faculty Member'}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Faculty', href: '/admin/faculty' }, { label: name }]}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/faculty')}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />

      {/* Sub-header: email + ID + status */}
      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        {email && <span>{email}</span>}
        {facultyCode && (
          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {profile?.facultyId ? `EMP: ${profile.facultyId}` : `ID: ${facultyCode.slice(0, 8)}…`}
          </span>
        )}
        {profile?.status && (
          <Badge variant={profile.status?.toLowerCase() === 'active' ? 'success' : 'warning'} size="sm">
            {profile.status}
          </Badge>
        )}
        {(profile?.specialization ?? []).slice(0, 2).map((s) => (
          <Badge key={s} variant="secondary" size="sm">{s}</Badge>
        ))}
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="mb-6 flex flex-wrap gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewPanel profile={profile} derived={derived} />
        </TabsContent>

        <TabsContent value="teaching">
          <TeachingPanel datasets={datasets} />
        </TabsContent>

        <TabsContent value="students">
          <StudentPerformancePanel derived={derived} />
        </TabsContent>

        <TabsContent value="assessment">
          <AssessmentPanel derived={derived} />
        </TabsContent>

        <TabsContent value="papers">
          <PapersPanel derived={derived} />
        </TabsContent>

        <TabsContent value="research">
          <ResearchPanel datasets={datasets} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export { FacultyAnalytics }
export default FacultyAnalytics
