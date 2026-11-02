/**
 * Faculty — My Students.
 * Directory of students in the faculty's institution.
 * Card metrics (exam count, latest accuracy, last exam, Strong / Improving /
 * Stable / Needs Attention) come from submitted exam attempts with real
 * scoring evidence — never seed labels, blank sittings, or invented values.
 */
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpDown, BookOpen, Search, Shield, Sparkles, Users, UsersRound } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { StatCard } from '@/components/shared/stat-card'
import { Badge, Card, Input, Select, SelectItem, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { useFacultyStudents } from '@/services/faculty-students'
import { SimilarIssuesTab } from '@/components/students-workspace/student-issues-tabs'
import { InterventionCenterTab } from '@/components/students-workspace/intervention-center'
import { TerminatedExamsTab } from '@/components/students-workspace/terminated-exams-tab'
import { DOMAIN_BADGE, FAMILY_BADGE, STUDENT_STATUS_STYLES } from '@/constants/ui'
import { formatDate } from '@/utils/format'

function StatusBadge({ status }) {
  return <Badge variant={STUDENT_STATUS_STYLES[status] ?? 'secondary'} size="sm">{status}</Badge>
}

function StudentRow({ student, onOpen }) {
  const accuracy = student.latestAccuracy
  const accuracyClass =
    accuracy == null
      ? 'text-slate-400'
      : accuracy >= 75
        ? 'text-emerald-600 dark:text-emerald-400'
        : accuracy >= 55
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-rose-500'
  const identity = [student.roll, student.batchName].filter(Boolean).join(' · ')
  return (
    <button
      onClick={onOpen}
      className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-[12px] font-bold text-white shadow-md shadow-indigo-500/25">
            {(student.name || '').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('')}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-bold text-slate-900 dark:text-white">{student.name}</p>
            {identity && (
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">{identity}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={student.status} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-slate-400">
        {student.domain && <Badge variant={DOMAIN_BADGE[student.domain]} size="sm">{student.domain}</Badge>}
        {student.examFamily && <Badge variant={FAMILY_BADGE[student.examFamily]} size="sm">{student.examFamily}</Badge>}
        <span>{student.examsCompleted} exam{student.examsCompleted === 1 ? '' : 's'}</span>
        <span className={accuracyClass}>
          {accuracy != null ? `${accuracy}%` : '—'} latest accuracy
        </span>
        {student.lastExam && <span>Last: {student.lastExam.shortTitle ?? student.lastExam.title} · {formatDate(student.lastExam.date, 'MMM d')}</span>}
      </div>
      {student.attentionReason && (
        <p className="rounded-xl bg-rose-50/70 px-3 py-1.5 text-[10.5px] font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {student.attentionReason}
        </p>
      )}
    </button>
  )
}

function StudentList({ students, onOpen }) {
  if (!students.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
        <Users className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No students match these filters</p>
        <p className="mt-1 text-xs text-slate-400">Try clearing the search or changing the filters.</p>
      </div>
    )
  }
  return (
    <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
      {students.map((s) => (
        <StudentRow key={s.id} student={s} onOpen={() => onOpen(s)} />
      ))}
    </div>
  )
}

function MyStudents() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data, isLoading, isError, refetch } = useFacultyStudents()

  /* Deep-link support: ?view=interventions|issues opens that tab directly
     (used by Student 360's "Open Intervention Center" action). */
  const initialView = ['students', 'batches', 'issues', 'interventions'].includes(searchParams.get('view'))
    ? searchParams.get('view')
    : 'students'
  const [view, setView] = useState(initialView) // students | batches | issues | interventions
  const [domain, setDomain] = useState('All')
  const [family, setFamily] = useState('All')
  const [batchId, setBatchId] = useState('All')
  const [status, setStatus] = useState('All')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [issueScope, setIssueScope] = useState('all')

  /* ALL hooks above any early return (hooks-order rule) */
  const allStudents = data?.students ?? []
  /* The /faculty/students response already carries batches — no second request. */
  const allBatches = data?.batches ?? []

  const batchOptions = useMemo(
    () => allBatches
      .filter((b) => domain === 'All' || b.domain === domain)
      .filter((b) => family === 'All' || b.examFamily === family),
    [allBatches, domain, family]
  )

  const filtered = useMemo(() => {
    let list = allStudents
    if (domain !== 'All') list = list.filter((s) => s.domain === domain)
    if (family !== 'All') list = list.filter((s) => s.examFamily === family)
    if (batchId !== 'All') list = list.filter((s) => s.batchId === batchId)
    if (status !== 'All') list = list.filter((s) => s.status === status)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) => `${s.name} ${s.roll} ${s.batchName}`.toLowerCase().includes(q))
    }
    const sorted = [...list]
    switch (sortKey) {
      case 'accuracy': sorted.sort((a, b) => (b.latestAccuracy ?? -1) - (a.latestAccuracy ?? -1)); break
      case 'score': sorted.sort((a, b) => (b.latestScore ?? -1) - (a.latestScore ?? -1)); break
      case 'exams': sorted.sort((a, b) => b.examsCompleted - a.examsCompleted); break
      case 'attention': sorted.sort((a, b) => Number(b.attention) - Number(a.attention)); break
      case 'recent': sorted.sort((a, b) => String(b.lastExam?.date ?? '').localeCompare(String(a.lastExam?.date ?? ''))); break
      default: sorted.sort((a, b) => a.name.localeCompare(b.name))
    }
    return sorted
  }, [allStudents, domain, family, batchId, status, search, sortKey])

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const overview = data?.overview ?? {}

  /* batch drill-down */
  if (selectedBatch) {
    const batch = allBatches.find((b) => b.id === selectedBatch)
    const members = (batch?.students ?? []).filter((s) => {
      if (status !== 'All' && s.status !== status) return false
      if (search.trim() && !`${s.name} ${s.roll}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }).sort((a, b) => a.name.localeCompare(b.name))
    return (
      <div>
        <button onClick={() => setSelectedBatch(null)} className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <ArrowLeft className="h-3.5 w-3.5" /> All batches
        </button>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 p-6 text-white shadow-xl shadow-indigo-600/20">
          <div className="bg-grid mask-fade-y pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              {batch?.domain && <Badge variant={DOMAIN_BADGE[batch.domain]} size="sm">{batch.domain}</Badge>}
              {batch?.examFamily && <Badge variant={FAMILY_BADGE[batch.examFamily]} size="sm">{batch.examFamily} · {batch.examLabel}</Badge>}
              <Badge className="bg-white/15 text-white ring-white/25" size="sm">{batch?.status}</Badge>
            </div>
            <h2 className="mt-2 text-xl font-bold">{batch?.name}</h2>
            <p className="mt-1 text-[12.5px] text-white/80">
              {batch?.domain === 'University'
                ? `${batch?.program} · ${batch?.course} · Semester ${batch?.semester} · Section ${batch?.section} · ${batch?.academicSession}`
                : `${batch?.examLabel ?? batch?.examFamily} · ${batch?.academicSession} · ${batch?.program}`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11.5px] font-bold">
              <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">{batch?.studentCount} students</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">{batch?.avgAccuracy != null ? `${batch.avgAccuracy}% avg accuracy` : 'No scored exams'}</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">{batch?.attentionCount} need attention</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">{batch?.improvingCount} improving</span>
              {batch?.latestExam && <span className="rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/20">Latest exam {formatDate(batch.latestExam, 'MMM d')}</span>}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students…" className="h-9 w-56 pl-8 text-xs" />
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
          {['All', 'Strong', 'Improving', 'Stable', 'Needs Attention'].map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${status === s ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {members.map((s) => (
            <StudentRow key={s.id} student={s} onOpen={() => navigate(`/faculty/my-students/${s.id}`)} />
          ))}
          {!members.length && <p className="col-span-full py-8 text-center text-xs text-slate-400">No students match these filters.</p>}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Faculty · Students"
        title="My Students"
        description="View, organize and understand the students assigned to you."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'My Students' }]}
        actions={<Badge variant="gradient" className="px-3 py-1"><UsersRound className="h-3 w-3" /> {overview.students} students · {overview.batches} batches</Badge>}
      />

      {/* Derived KPIs */}
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <StatCard index={0} label="Total students" value={String(overview.students ?? 0)} sub="assigned to you" icon="Users" gradient="from-indigo-500 to-blue-500" />
        <StatCard index={1} label="Total batches" value={String(overview.batches ?? 0)} sub="competitive" icon="BookOpen" gradient="from-violet-500 to-purple-500" />
        <StatCard index={2} label="Needs attention" value={String(overview.needsAttention ?? 0)} sub="declining / below threshold" icon="AlertTriangle" gradient="from-rose-500 to-red-500" />
        <StatCard index={3} label="Improving" value={String(overview.improving ?? 0)} sub={`${overview.strong ?? 0} strong performers`} icon="TrendingUp" gradient="from-emerald-500 to-teal-500" />
      </div>

      <Tabs value={view} onValueChange={setView} className="mt-6">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="students"><Users className="h-3.5 w-3.5" /> Students ({overview.students})</TabsTrigger>
          <TabsTrigger value="batches"><BookOpen className="h-3.5 w-3.5" /> Batches ({overview.batches})</TabsTrigger>
          <TabsTrigger value="issues"><AlertTriangle className="h-3.5 w-3.5" /> Similar Issues</TabsTrigger>
          <TabsTrigger value="interventions"><Sparkles className="h-3.5 w-3.5" /> Interventions</TabsTrigger>
          <TabsTrigger value="terminated"><Shield className="h-3.5 w-3.5" /> Terminated Exams</TabsTrigger>
        </TabsList>

        {/* ================= Students tab ================= */}
        <TabsContent value="students">
          {/* Domain + filters */}
          <Card className="mb-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Domain</span>
              <div className="flex rounded-2xl border border-slate-200/80 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                {['All', /* 'University', */ 'Competitive'].map((d) => (
                  <button key={d} onClick={() => { setDomain(d); setFamily('All'); setBatchId('All') }}
                    className={`rounded-xl px-4 py-1.5 text-[12px] font-bold transition-all ${domain === d ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                    {d === 'All' ? 'All domains' : /* d === 'University' ? '🏛️ University' : */ '🎯 Competitive'}
                  </button>
                ))}
              </div>
              {domain === 'Competitive' && (
                <>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Exam</span>
                  {['All', 'JEE', 'NEET'].map((f) => (
                    <button key={f} onClick={() => { setFamily(f); setBatchId('All') }}
                      className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${family === f ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
                      {f === 'All' ? 'All' : f}
                    </button>
                  ))}
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectItem value="All">All batches</SelectItem>
                {batchOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}{b.domain === 'University' ? ` · ${b.courseCode} · ${b.section}` : ` · ${b.examLabel ?? b.examFamily}`}</SelectItem>
                ))}
              </Select>
              <div className="relative">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, roll, batch…" className="h-9 w-56 pl-8 text-xs sm:w-72" />
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {['All', 'Strong', 'Improving', 'Stable', 'Needs Attention'].map((s) => (
                  <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${status === s ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
                    {s}
                  </button>
                ))}
                <Select value={sortKey} onValueChange={setSortKey}>
                  <SelectItem value="name"><span className="flex items-center gap-1"><ArrowUpDown className="h-3 w-3" /> Name</span></SelectItem>
                  <SelectItem value="accuracy">Accuracy</SelectItem>
                  <SelectItem value="score">Latest score</SelectItem>
                  <SelectItem value="exams">Exams completed</SelectItem>
                  <SelectItem value="attention">Attention level</SelectItem>
                  <SelectItem value="recent">Recent activity</SelectItem>
                </Select>
              </div>
            </div>
            <p className="mt-2.5 text-[11px] font-medium text-slate-400">{filtered.length} of {allStudents.length} students · statuses derived from exam history</p>
          </Card>

          <StudentList students={filtered} onOpen={(s) => navigate(`/faculty/my-students/${s.id}`)} />
        </TabsContent>

        {/* ================= Similar Issues tab ================= */}
        <TabsContent value="issues">
          <SimilarIssuesTab scope={issueScope} onScopeChange={setIssueScope} />
        </TabsContent>

        {/* ================= Interventions tab ================= */}
        <TabsContent value="interventions">
          <InterventionCenterTab />
        </TabsContent>

        {/* ================= Terminated Exams tab ================= */}
        <TabsContent value="terminated">
          <TerminatedExamsTab />
        </TabsContent>

        {/* ================= Batches tab ================= */}
        <TabsContent value="batches">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {allBatches.map((b) => (
              <button key={b.id} onClick={() => setSelectedBatch(b.id)}
                className="group rounded-3xl border border-slate-200/70 bg-white p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">{b.name}</p>
                    <h3 className="mt-1 truncate text-[15px] font-bold text-slate-900 dark:text-white">
                      {b.domain === 'University' ? `${b.courseCode} · ${b.course}` : `${b.examLabel ?? b.examFamily} · ${b.name}`}
                    </h3>
                  </div>
                  {b.domain && <Badge variant={DOMAIN_BADGE[b.domain]} size="sm">{b.domain}</Badge>}
                </div>
                <p className="mt-1.5 text-[11.5px] font-medium text-slate-400">
                  {b.domain === 'University' ? `${b.program} · Semester ${b.semester} · Section ${b.section} · ${b.academicSession}` : `${b.program} · ${b.academicSession}`}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800/60">
                    <p className="text-[16px] font-bold text-slate-900 dark:text-white">{b.studentCount}</p>
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Students</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800/60">
                    <p className="text-[16px] font-bold text-slate-900 dark:text-white">{b.avgAccuracy != null ? `${b.avgAccuracy}%` : '—'}</p>
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Avg accuracy</p>
                  </div>
                  <div className="rounded-xl bg-rose-50/70 p-2.5 text-center dark:bg-rose-500/10">
                    <p className="text-[16px] font-bold text-rose-600 dark:text-rose-300">{b.attentionCount}</p>
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-rose-500/70 dark:text-rose-300/70">Need attention</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/70 p-2.5 text-center dark:bg-emerald-500/10">
                    <p className="text-[16px] font-bold text-emerald-600 dark:text-emerald-400">{b.improvingCount}</p>
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-300/70">Improving</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <span>{b.strongCount} strong performers</span>
                  <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300">View students <ArrowRight className="h-3 w-3" /></span>
                </div>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export { MyStudents }
export default MyStudents
