import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BookOpen, ChevronDown, ChevronRight, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { useAdminSimilarIssues, useAdminExams } from '@/services/admin-similar-issues'

const PRIORITY_STYLE = { Critical: 'danger', High: 'danger', Medium: 'warning', Low: 'secondary' }

/* ---- Group card (admin-scoped: student links → /admin/students/:id) ---- */
function AdminGroupCard({ group, onOpen }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40">
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-500">
              {group.examFamily ? `${group.examFamily} · ${group.domain}` : group.domain}
            </p>
            <h3 className="mt-1 truncate text-[14.5px] font-bold text-slate-900 dark:text-white">
              {group.subject} — {group.chapter}
            </h3>
            <p className="mt-0.5 text-[11.5px] font-medium text-slate-400">{group.issueType}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant={PRIORITY_STYLE[group.priority] ?? 'secondary'}>{group.priority}</Badge>
            <Badge variant="secondary" size="sm">{group.studentCount} students</Badge>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            [group.avgAccuracy != null ? `${group.avgAccuracy}%` : '—', 'Avg acc.'],
            [group.avgTime != null ? `${group.avgTime}s` : '—', 'Avg time'],
            [group.totalIncorrect ?? '—', 'Incorrect'],
          ].map(([val, label]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
              <p className="text-[15px] font-bold text-slate-900 dark:text-white">{val}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold text-slate-400">
          <span>{group.affectedExams} affected exam days</span>
          {group.trend === 'Persistent' && <Badge variant="danger" size="sm">Persistent</Badge>}
        </div>
      </button>
      {/* student links scoped to admin */}
      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
        {(group.students ?? []).slice(0, 6).map((s) => (
          <Link key={s.studentId} to={`/admin/students/${s.studentId}`}>
            <Badge variant="secondary" size="sm" className="cursor-pointer hover:border-indigo-300">
              {s.name}
            </Badge>
          </Link>
        ))}
        {group.studentCount > 6 && (
          <Badge variant="secondary" size="sm">+{group.studentCount - 6} more</Badge>
        )}
      </div>
    </div>
  )
}

/* ---- Group detail dialog ---- */
function GroupDetailDialog({ group, open, onOpenChange }) {
  if (!group || !open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => onOpenChange(false)}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-500">
              {group.examFamily ? `${group.examFamily} · ${group.domain}` : group.domain}
            </p>
            <h2 className="mt-1 text-[17px] font-bold text-slate-900 dark:text-white">{group.subject} — {group.chapter}</h2>
            <p className="mt-0.5 text-xs text-slate-400">{group.issueType}</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>

        <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 text-xs text-slate-600 dark:border-indigo-500/20 dark:bg-indigo-500/5 dark:text-slate-300">
          {group.whyDetected}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Students', group.studentCount],
            ['Avg accuracy', group.avgAccuracy != null ? `${group.avgAccuracy}%` : '—'],
            ['Avg time', group.avgTime != null ? `${group.avgTime}s` : '—'],
            ['Total incorrect', group.totalIncorrect ?? '—'],
          ].map(([label, val]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-0.5 text-[15px] font-bold text-slate-800 dark:text-slate-100">{val}</p>
            </div>
          ))}
        </div>

        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Students in group</p>
        <div className="space-y-1.5">
          {(group.students ?? []).map((s) => (
            <Link key={s.studentId} to={`/admin/students/${s.studentId}`} onClick={() => onOpenChange(false)}
              className="flex items-center justify-between rounded-2xl border border-slate-100 p-3 hover:border-indigo-300 dark:border-slate-800">
              <div>
                <p className="text-[13px] font-bold text-slate-900 dark:text-white">{s.name}</p>
                <p className="text-[10.5px] text-slate-400">{s.roll} · {s.batchId}</p>
              </div>
              <div className="flex items-center gap-2 text-[11.5px] font-semibold text-slate-400">
                {s.accuracy != null && <span className={s.accuracy < 55 ? 'text-rose-500' : 'text-amber-500'}>{s.accuracy}%</span>}
                <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---- Issue Groups tab ---- */
function IssueGroupsTab({ data, isLoading, isError, refetch }) {
  const [selected, setSelected] = useState(null)

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={refetch} />

  return (
    <div className="space-y-5">
      {data?.groups?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.groups.map((g) => (
            <AdminGroupCard key={g.id} group={g} onOpen={() => setSelected(g)} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No similar-issue groups found</p>
          <p className="mt-1 text-xs text-slate-400">Groups appear when ≥2 students share the same weak subject/chapter evidence.</p>
        </div>
      )}

      {data?.individualCount > 0 && (
        <Card className="p-4">
          <p className="flex items-center gap-2 text-[12px] font-bold text-slate-500 dark:text-slate-300">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            Individual issues — {data.individualCount} student(s) with no matching group
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(data.individuals ?? []).slice(0, 12).map((f) => (
              <Link key={f.studentId} to={`/admin/students/${f.studentId}`}>
                <Badge variant="secondary" size="sm" className="cursor-pointer hover:border-indigo-300">
                  {f.name} · {f.subject} — {f.chapter}
                </Badge>
              </Link>
            ))}
            {data.individualCount > 12 && (
              <Badge variant="secondary" size="sm">+{data.individualCount - 12} more</Badge>
            )}
          </div>
        </Card>
      )}

      <p className="text-[10.5px] font-medium text-slate-400">{data?.note}</p>

      <GroupDetailDialog group={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />
    </div>
  )
}

/* ---- All Exams tab ---- */
function AllExamsTab({ issueGroups }) {
  const { data, isLoading, isError, refetch } = useAdminExams()
  const [expanded, setExpanded] = useState(null)

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={refetch} />

  const exams = data?.exams ?? []

  // For each exam, find issue groups whose subject/examFamily overlaps
  function groupsForExam(exam) {
    return (issueGroups ?? []).filter((g) => {
      const modeMatch = exam.examMode === 'competitive'
        ? g.examFamily === exam.examFamily
        : g.domain === 'University'
      const subjectMatch = !exam.subject || !g.subject || g.subject.toLowerCase().includes((exam.subject || '').toLowerCase())
      return modeMatch || subjectMatch
    })
  }

  return (
    <div className="space-y-2">
      {!exams.length && (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-300">No exams found for this institution.</p>
        </div>
      )}
      {exams.map((exam) => {
        const linked = groupsForExam(exam)
        const isOpen = expanded === exam.id
        return (
          <div key={exam.id} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setExpanded(isOpen ? null : exam.id)}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-slate-900 dark:text-white">{exam.title}</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                  {exam.examMode === 'competitive' && exam.examFamily ? `${exam.examFamily} · ` : ''}
                  {exam.createdAt ?? '—'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {linked.length > 0 && (
                  <Badge variant="warning" size="sm">
                    <AlertTriangle className="mr-1 h-3 w-3" />{linked.length} issue group{linked.length > 1 ? 's' : ''}
                  </Badge>
                )}
                <span className="text-[11px] font-semibold text-slate-400">{exam.attemptCount} attempts</span>
                {exam.avgScore != null && (
                  <span className={`text-[11px] font-bold ${exam.avgScore >= 75 ? 'text-emerald-600' : exam.avgScore >= 55 ? 'text-amber-600' : 'text-rose-500'}`}>
                    {exam.avgScore}% avg
                  </span>
                )}
                <Badge variant={exam.status === 'published' ? 'success' : 'secondary'} size="sm">{exam.status}</Badge>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
                {linked.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Similar-issue groups linked to this exam</p>
                    {linked.map((g) => (
                      <div key={g.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-bold text-slate-900 dark:text-white">{g.subject} — {g.chapter}</p>
                          <p className="text-[11px] text-slate-400">{g.issueType} · {g.studentCount} students · {g.avgAccuracy}% avg accuracy</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(g.students ?? []).slice(0, 4).map((s) => (
                            <Link key={s.studentId} to={`/admin/students/${s.studentId}`}>
                              <Badge variant="secondary" size="sm" className="cursor-pointer hover:border-indigo-300">{s.name}</Badge>
                            </Link>
                          ))}
                          {g.studentCount > 4 && <Badge variant="secondary" size="sm">+{g.studentCount - 4} more</Badge>}
                        </div>
                        <Badge variant={PRIORITY_STYLE[g.priority] ?? 'secondary'} size="sm">{g.priority}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11.5px] text-slate-400">No similar-issue groups linked to this exam.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ---- Page ---- */
function AdminSimilarIssues() {
  const { data, isLoading, isError, refetch } = useAdminSimilarIssues()

  return (
    <div>
      <PageHeader
        eyebrow="Institution-wide · Similar Issue Groups"
        title="Similar Issues"
        description="Students sharing the same academic weakness — grouped by domain, subject and chapter."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Students', href: '/admin/students' }, { label: 'Similar Issues' }]}
      />

      <Tabs defaultValue="groups">
        <TabsList className="mb-5">
          <TabsTrigger value="groups">Issue Groups</TabsTrigger>
          <TabsTrigger value="exams">All Exams</TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          <IssueGroupsTab data={data} isLoading={isLoading} isError={isError} refetch={refetch} />
        </TabsContent>

        <TabsContent value="exams">
          <AllExamsTab issueGroups={data?.groups ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export { AdminSimilarIssues }
export default AdminSimilarIssues
