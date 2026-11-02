/**
 * Institution Intelligence Workspace · Tab 3: Faculty Intelligence.
 * Class success, error grouping, and subject/chapter student risk from the
 * admin assembler (`derived.faculty.teaching`), plus institution faculty roll-up.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ArrowRight, Award, BookOpen, Clock, HeartPulse, Users } from 'lucide-react'
import { useFacultyIntelligence } from '@/services/faculty-intelligence'
import { useAdminTeachingIntelligence } from '@/services/admin-intelligence'
import { useFilterCascade } from '@/hooks/use-filter-cascade'
import { ChartCard } from '@/components/shared/chart-card'
import { DataTable } from '@/components/shared/data-table'
import { ProgressRing } from '@/components/shared/progress-ring'
import { EmptyState } from '@/components/shared/empty-state'
import { BarCompare, DonutChart } from '@/components/charts'
import { Badge, Button, Select, SelectItem } from '@/components/ui'
import { KpiStrip, WorkspaceSection } from './shared'

const ERROR_COLORS = ['#f43f5e', '#f59e0b', '#8b5cf6', '#3b82f6', '#14b8a6', '#94a3b8']
const SEVERITY_VARIANT = { Critical: 'danger', High: 'warning', 'Needs improvement': 'secondary' }
const SEVERITY_RANK = { Critical: 3, High: 2, 'Needs improvement': 1 }
const ALL = 'All'
const EMPTY_ROWS = []

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
}

function studentList(row) {
  if (Array.isArray(row?.students) && row.students.length) {
    return row.students.map((item) => (typeof item === 'string' ? { name: item } : item))
  }
  if (Array.isArray(row?.studentNames) && row.studentNames.length) {
    return row.studentNames.map((name) => ({ name }))
  }
  return []
}

function StudentRiskHover({ count, students = [] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const hideTimer = useRef(null)

  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 280
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)
    const top = rect.bottom + 8
    setPos({ top, left })
  }

  const show = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    place()
    setOpen(true)
  }

  const hide = () => {
    hideTimer.current = setTimeout(() => setOpen(false), 140)
  }

  if (!count) return <span className="font-bold text-slate-900 dark:text-white">{count ?? 0}</span>

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        data-testid="risk-student-count"
        className="cursor-help font-bold text-indigo-700 underline decoration-indigo-300 decoration-dotted underline-offset-4 dark:text-indigo-300 dark:decoration-indigo-500"
        aria-expanded={open}
        aria-label={`${count} students at risk. Hover or click to see names.`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(event) => {
          event.preventDefault()
          if (open) hide()
          else show()
        }}
      >
        {count}
      </button>
      {open && createPortal(
        <div
          role="tooltip"
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[220] w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800">
            {students.length ? `${students.length} student${students.length === 1 ? '' : 's'} at risk` : 'Students at risk'}
          </p>
          {students.length ? (
            <ul className="max-h-64 overflow-y-auto py-1">
              {students.map((student, index) => (
                <li key={student.id || `${student.name}-${index}`} className="flex items-baseline justify-between gap-2 px-3 py-1.5 text-[12px]">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{student.name || 'Unknown'}</span>
                  {student.roll ? <span className="shrink-0 text-[10px] text-slate-400">{student.roll}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-[12px] text-slate-500">Names are not available for this group yet.</p>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

function FacultyTab({ data }) {
  const admin = data?.derived ?? {}
  const faculty = admin.faculty ?? {}
  const health = faculty.health ?? {}
  const totals = admin.totals ?? {}
  const teaching = faculty.teaching ?? {}
  const { data: teachingDetail } = useAdminTeachingIntelligence()
  const classSuccess = teachingDetail?.classSuccess?.length ? teachingDetail.classSuccess : (teaching.classSuccess ?? EMPTY_ROWS)
  const errorGroups = teachingDetail?.errorGroups ?? teaching.errorGroups ?? EMPTY_ROWS
  const chapterRisk = teachingDetail?.chapterRisk?.length ? teachingDetail.chapterRisk : (teaching.chapterRisk ?? EMPTY_ROWS)
  const summary = teachingDetail?.summary ?? teaching.summary ?? {}
  const [severityFilter, setSeverityFilter] = useState(ALL)

  const { data: facultyData } = useFacultyIntelligence()
  const f = useMemo(() => facultyData?.derived ?? {}, [facultyData])

  const byDept = faculty.byDept ?? []
  const deptCodes = byDept.map((x) => x.code)
  const facultyCount = totals.faculty ?? faculty.totals ?? faculty.rosterCount ?? 0
  const deptCount = totals.departments ?? byDept.length
  const rosterCount = byDept.reduce((n, row) => n + (row.count || 0), 0)
  const facultyLabel = Number(facultyCount).toLocaleString('en-IN')
  const rosterSubtitle = facultyCount
    ? `${rosterCount.toLocaleString('en-IN')} of ${facultyLabel} faculty`
    : 'No faculty records'

  const deriveChapterOptions = useCallback(
    (key, values) => {
      let rows = chapterRisk
      if (values?.class && values.class !== ALL) rows = rows.filter((row) => row.class === values.class)
      if (key === 'class') {
        return uniqueSorted([
          ...classSuccess.map((row) => row.class),
          ...chapterRisk.map((row) => row.class),
        ])
      }
      if (key === 'subject') return uniqueSorted(rows.map((row) => row.subject))
      if (key === 'chapter') {
        if (values?.subject && values.subject !== ALL) rows = rows.filter((row) => row.subject === values.subject)
        return uniqueSorted(rows.map((row) => row.chapter))
      }
      return []
    },
    [chapterRisk, classSuccess],
  )

  const cascadeConfig = useMemo(
    () => ({
      dependencies: { class: [], subject: ['class'], chapter: ['class', 'subject'] },
      emptyValues: { class: ALL, subject: ALL, chapter: ALL },
      initialValues: { class: ALL, subject: ALL, chapter: ALL },
      deriveOptions: deriveChapterOptions,
    }),
    [deriveChapterOptions],
  )
  const { values: riskFilters, options: riskOptions, set: setRiskFilter, reset: resetRiskFilters } = useFilterCascade(cascadeConfig)

  const severityOptions = useMemo(
    () => uniqueSorted(chapterRisk.map((row) => row.severity)),
    [chapterRisk],
  )

  const filteredRisk = useMemo(() => {
    return chapterRisk
      .filter((row) => {
        if (riskFilters.class !== ALL && row.class !== riskFilters.class) return false
        if (riskFilters.subject !== ALL && row.subject !== riskFilters.subject) return false
        if (riskFilters.chapter !== ALL && row.chapter !== riskFilters.chapter) return false
        if (severityFilter !== ALL && row.severity !== severityFilter) return false
        return true
      })
      .map((row, index) => {
        const students = studentList(row)
        return {
          ...row,
          id: `${row.class}-${row.subject}-${row.chapter}-${index}`,
          severityRank: SEVERITY_RANK[row.severity] ?? 0,
          students,
          studentSearch: students.map((item) => `${item.name ?? ''} ${item.roll ?? ''}`).join(' '),
        }
      })
  }, [chapterRisk, riskFilters, severityFilter])

  const filtersActive = riskFilters.class !== ALL || riskFilters.subject !== ALL || riskFilters.chapter !== ALL || severityFilter !== ALL

  const chapterColumns = useMemo(
    () => [
      { key: 'class', label: 'Class', sortable: true, className: 'font-semibold text-slate-800 dark:text-slate-100' },
      { key: 'subject', label: 'Subject', sortable: true },
      { key: 'chapter', label: 'Chapter', sortable: true },
      { key: 'studentsAtRisk', label: 'Students at risk', sortable: true, render: (row) => <StudentRiskHover count={row.studentsAtRisk} students={row.students} /> },
      {
        key: 'avgAccuracy',
        label: 'Avg accuracy',
        sortable: true,
        render: (row) => (row.avgAccuracy == null ? '—' : `${row.avgAccuracy}%`),
      },
      {
        key: 'severityRank',
        label: 'Severity',
        sortable: true,
        render: (row) => <Badge variant={SEVERITY_VARIANT[row.severity] ?? 'secondary'} size="sm">{row.severity}</Badge>,
      },
    ],
    [],
  )

  const filterSelect = (label, value, onChange, options, allLabel) => (
    <div className="min-w-[9.5rem] flex-1">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <Select value={value} onValueChange={onChange} className="w-full" group="chapter-risk" ariaLabel={`${label} filter`} searchable={options.length > 8}>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((name) => (
          <SelectItem key={name} value={name}>{name}</SelectItem>
        ))}
      </Select>
    </div>
  )

  const successChart = classSuccess.map((row) => ({
    label: row.class,
    avg: row.avg ?? 0,
    passRate: row.passRate ?? 0,
    atRisk: row.atRisk ?? 0,
  }))
  const errorTotal = summary.errorCount ?? errorGroups.reduce((n, row) => n + (row.count || 0), 0)

  return (
    <div>
      <KpiStrip
        cols={4}
        items={[
          { label: 'Classes', value: String(summary.classes ?? classSuccess.length), sub: 'with roster or exam evidence' },
          { label: 'Students at risk', value: String(summary.studentsAtRisk ?? 0), sub: 'latest exam below 55%' },
          { label: 'Error groups', value: String(errorTotal), sub: `${errorGroups.length} categories` },
          { label: 'Chapters to improve', value: String(summary.chaptersNeedingImprovement ?? chapterRisk.length), sub: `accuracy below ${summary.weakAccuracy ?? 70}%` },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Class success" subtitle="Average score and pass rate by class" className="min-w-0">
          {successChart.length ? (
            <BarCompare
              data={successChart}
              xKey="label"
              height={240}
              series={[
                { key: 'avg', name: 'Class avg %', color: '#6366f1' },
                { key: 'passRate', name: 'Pass rate %', color: '#10b981' },
              ]}
              formatter={(v) => `${v}%`}
            />
          ) : (
            <EmptyState compact title="No class exam results yet" description="Class success appears after students submit exams." />
          )}
        </ChartCard>

        <ChartCard title="Error grouping" subtitle="Incorrect answers grouped by error type" className="min-w-0">
          {errorGroups.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <DonutChart
                  data={errorGroups.map((row, i) => ({ name: row.category, value: row.count, color: ERROR_COLORS[i % ERROR_COLORS.length] }))}
                  height={220}
                  centerLabel={String(errorTotal)}
                  centerSub="errors"
                />
              </div>
              <div className="space-y-2">
                {errorGroups.map((row, i) => (
                  <div key={row.category} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-[12px] dark:border-slate-800">
                    <span className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
                      <span className="h-2 w-2 rounded-full" style={{ background: ERROR_COLORS[i % ERROR_COLORS.length] }} />
                      {row.category}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">{row.count} · {row.studentCount} students</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState compact title="No error groups yet" description="Error types appear from scored incorrect answers." />
          )}
        </ChartCard>
      </div>

      <WorkspaceSection
        title="Students who need to improve"
        subtitle="By class, subject and chapter — students below the weak-chapter threshold. Click a column header to sort."
        actions={
          filtersActive ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetRiskFilters()
                setSeverityFilter(ALL)
              }}
            >
              Clear filters
            </Button>
          ) : null
        }
      >
        <div className="mb-4 flex flex-wrap gap-2.5 rounded-2xl border border-slate-200/70 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
          {filterSelect('Class', riskFilters.class, (value) => setRiskFilter('class', value), riskOptions.class ?? [], 'All classes')}
          {filterSelect('Subject', riskFilters.subject, (value) => setRiskFilter('subject', value), riskOptions.subject ?? [], 'All subjects')}
          {filterSelect('Chapter', riskFilters.chapter, (value) => setRiskFilter('chapter', value), riskOptions.chapter ?? [], 'All chapters')}
          {filterSelect('Severity', severityFilter, setSeverityFilter, severityOptions, 'All severities')}
        </div>
        <DataTable
          columns={chapterColumns}
          data={filteredRisk}
          searchKeys={['class', 'subject', 'chapter', 'severity', 'studentSearch']}
          searchPlaceholder="Search class, subject, chapter or student…"
          pageSize={12}
          initialSort={{ key: 'studentsAtRisk', dir: 'desc' }}
          emptyTitle={filtersActive ? 'No rows match these filters' : 'No chapter risk yet'}
          emptyDescription={
            filtersActive
              ? 'Try another class, subject, chapter or severity — or clear filters.'
              : 'When students miss the same chapter repeatedly, they show up here with a count to target revision.'
          }
        />
      </WorkspaceSection>

      <WorkspaceSection title="Faculty health & roster" subtitle="Institution roll-up">
        <KpiStrip
          cols={4}
          items={[
            { label: 'Faculty', value: facultyLabel, sub: 'institution-wide' },
            { label: 'Faculty health', value: `${health.score ?? '—'}/100`, sub: health.grade ?? '—' },
            { label: 'Teaching satisfaction', value: `${health.teachingSatisfaction ?? '—'}/100`, sub: 'student surveys' },
            { label: 'Publications / faculty', value: (health.publicationsPerFaculty ?? '—').toFixed ? health.publicationsPerFaculty?.toFixed(1) ?? '—' : '—', sub: 'research output' },
          ]}
        />
      </WorkspaceSection>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Faculty health factors" subtitle="Institution roll-up">
          <div className="flex items-center gap-4">
            <ProgressRing value={health.score ?? 0} size={104} stroke={10} color="#f59e0b" label={`${health.score ?? '—'}`} sublabel="health" />
            <div className="flex-1 space-y-2">
              {(health.factors ?? []).map((factor) => (
                <div key={factor.label}>
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">{factor.label}</span>
                    <span className="text-slate-800 dark:text-slate-100">{factor.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400" style={{ width: `${factor.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Teaching effectiveness" subtitle="Faculty Intelligence Foundation (reused)">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Teaching health', value: f.teachingHealth?.score ?? '—', icon: HeartPulse, tone: 'text-indigo-500' },
              { label: 'Effectiveness', value: f.teachingEffectiveness?.score ?? '—', icon: Award, tone: 'text-emerald-500' },
              { label: 'Engagement', value: `${f.studentEngagement?.score ?? '—'}%`, icon: Users, tone: 'text-teal-500' },
              { label: 'AI hours saved', value: `${f.teachingProductivity?.hoursSaved ?? '—'}h`, icon: Clock, tone: 'text-violet-500' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
                <s.icon className={`h-4 w-4 ${s.tone}`} />
                <p className="mt-1 font-display text-lg font-bold text-slate-800 dark:text-white">{s.value}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Faculty workload"
          subtitle="From the faculty foundation"
          className="min-w-0"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/faculty">Faculty portal <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          }
        >
          <div className="space-y-2.5">
            {[
              { label: 'Students taught', value: f.cohorts?.totalStudents ?? '—' },
              { label: 'Sections', value: f.cohorts?.sections?.length ?? '—' },
              { label: 'Weekly teaching hours', value: facultyData?.datasets?.weeklyTeachingHours ?? '—' },
              { label: 'At-risk students (faculty scope)', value: f.attentionStudents?.total ?? '—' },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-2.5 text-[12px] dark:border-slate-800">
                <span className="font-semibold text-slate-600 dark:text-slate-300">{r.label}</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{r.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <WorkspaceSection title="Department-level faculty distribution" subtitle={`${deptCount} department${deptCount === 1 ? '' : 's'}`}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Faculty by department" subtitle={rosterSubtitle} className="min-w-0">
            <BarCompare
              data={byDept.map((x) => ({ label: x.code, count: x.count }))}
              xKey="label"
              height={220}
              series={[{ key: 'count', name: 'Faculty', color: '#6366f1' }]}
              formatter={(v) => `${v}`}
            />
          </ChartCard>
          <ChartCard title="Department coverage" subtitle="Which departments have roster representation">
            <div className="flex flex-wrap gap-2 pt-1">
              {deptCodes.map((code) => (
                <Badge key={code} variant="outline" size="sm" className="px-3 py-1.5">{code}</Badge>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-indigo-50/60 p-3.5 dark:bg-indigo-500/5">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
              <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                Faculty health (institution) is driven by teaching satisfaction ({health.teachingSatisfaction ?? '—'}/100) and research output ({health.publicationsPerFaculty ?? '—'} pubs/faculty). Roster covers {deptCount} department{deptCount === 1 ? '' : 's'}.
              </p>
            </div>
          </ChartCard>
        </div>
      </WorkspaceSection>
    </div>
  )
}

export { FacultyTab }
export default FacultyTab
