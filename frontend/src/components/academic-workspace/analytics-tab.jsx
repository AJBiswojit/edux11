/**
 * Academic Intelligence Workspace — Performance Analytics tab.
 * Two context views:
 *   University   → performance/attendance/assignment/practice/exam timelines
 *   Competitive  → mock trend · PYQ chapters · speed · negative marking
 * University and competitive series are never mixed in the same chart.
 */

import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend, BarCompare, LineTrend, RadarCompare } from '@/components/charts'
import { Badge } from '@/components/ui'
import { CompetitiveAnalytics } from './competitive-analytics'

function AnalyticsTab({ derived, datasets, context = 'University' }) {
  if (context === 'Competitive') {
    return <CompetitiveAnalytics derived={derived} />
  }
  const ds = datasets
  const d = derived

  /* ---- chart data builders (from foundation, never hardcoded) ----
     Phase 27.1: the exam trend is now UNIVERSITY-ONLY (competitive mocks
     live in the Competitive analytics view) and every series derives from
     datasets instead of literal arrays. */
  const performanceTimeline = ds.academicPerformance.semesterHistory.map((s) => ({
    axis: s.semester, gpa: s.gpa ?? null, accuracy: Math.round((s.gpa / 10) * 100),
  }))
  const attendanceTrend = ds.attendanceAnalytics.monthlyTrend

  const monthOf = (iso) => new Date(iso).toLocaleString('en-IN', { month: 'short' })
  const gradedByMonth = {}
  ;(ds.assignments ?? []).filter((a) => a.status === 'Graded' && a.due).forEach((a) => {
    const m = monthOf(a.due)
    gradedByMonth[m] = (gradedByMonth[m] ?? 0) + 1
  })
  const assignmentTrend = Object.entries(gradedByMonth).map(([month, completed]) => ({ month, completed })).sort((a, b) => new Date(`1 ${a.month} 2026`) - new Date(`1 ${b.month} 2026`))

  const practiceByMonth = {}
  ;(ds.practiceSessions ?? []).forEach((p) => {
    const m = monthOf(p.date)
    practiceByMonth[m] = (practiceByMonth[m] ?? 0) + 1
  })
  const practiceTrend = Object.entries(practiceByMonth).map(([month, sessions]) => ({ month, sessions })).sort((a, b) => new Date(`1 ${a.month} 2026`) - new Date(`1 ${b.month} 2026`))

  const examTrend = (ds.examPerformance ?? [])
    .filter((e) => e.type === 'University' && e.status === 'Completed')
    .map((e) => ({ exam: e.title.split(' — ')[0].slice(0, 16), pct: e.pct }))
  const quizTrend = ds.quizResults.map((q) => ({ axis: q.title.split(' — ')[0], accuracy: q.accuracy }))

  const subjectRadar = d.subjectMasteryRanking.map((s) => ({ axis: s.subjectCode, mastery: s.mastery }))
  const RANGES = [
    { range: '90–100', min: 90 }, { range: '80–89', min: 80 }, { range: '70–79', min: 70 },
    { range: '60–69', min: 60 }, { range: 'Below 60', min: 0 },
  ]
  const distribution = RANGES.map((r, i) => ({
    range: r.range,
    count: (ds.academicPerformance.subjectGrades ?? []).filter((s) => s.internal >= r.min && (i === 0 || s.internal < RANGES[i - 1].min)).length,
  }))
  const learningProgress = ds.courses.map((c) => ({ axis: c.code, progress: c.progress }))

  return (
    <div className="space-y-6">
      {/* Timeline row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Performance timeline" subtitle="CGPA & accuracy across semesters">
          <LineTrend data={performanceTimeline} xKey="axis" height={250} series={[
            { key: 'gpa', name: 'CGPA', color: '#6366f1' },
            { key: 'accuracy', name: 'Accuracy %', color: '#14b8a6' },
          ]} />
        </ChartCard>
        <ChartCard title="Attendance trend" subtitle="% attendance over the last 6 months">
          <AreaTrend data={attendanceTrend} xKey="month" height={250} series={[{ key: 'pct', name: 'Attendance', color: '#6366f1' }]} formatter={(v) => `${v}%`} />
        </ChartCard>
      </div>

      {/* Timeline row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Assignment trend" subtitle="Completed per month">
          <BarCompare data={assignmentTrend} xKey="month" height={210} series={[{ key: 'completed', name: 'Completed', color: '#6366f1' }]} />
        </ChartCard>
        <ChartCard title="Practice trend" subtitle="AI practice sessions per month">
          <BarCompare data={practiceTrend} xKey="month" height={210} series={[{ key: 'sessions', name: 'Sessions', color: '#14b8a6' }]} />
        </ChartCard>
        <ChartCard title="Exam trend" subtitle="% score across recent exams & mocks">
          <LineTrend data={examTrend} xKey="exam" height={210} series={[{ key: 'pct', name: 'Score %', color: '#8b5cf6' }]} formatter={(v) => `${v}%`} />
        </ChartCard>
      </div>

      {/* Quiz + subject comparison */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Quiz trend" subtitle="Accuracy by quiz">
          <BarCompare data={quizTrend} xKey="axis" height={230} series={[{ key: 'accuracy', name: 'Accuracy %', color: '#f59e0b' }]} formatter={(v) => `${v}%`} />
        </ChartCard>
        <ChartCard title="Subject comparison" subtitle="Mastery radar across all subjects" actions={<Badge variant="gradient" size="sm">AI modelled</Badge>}>
          <RadarCompare data={subjectRadar} angleKey="axis" height={230} series={[{ key: 'mastery', name: 'Mastery', color: '#6366f1' }]} />
        </ChartCard>
      </div>

      {/* Distribution + learning progress */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Performance distribution" subtitle="Subject score bands">
          <BarCompare data={distribution} xKey="range" height={230} series={[{ key: 'count', name: 'Subjects', color: '#10b981' }]} />
        </ChartCard>
        <ChartCard title="Learning progress" subtitle="Course completion %">
          <BarCompare data={learningProgress} xKey="axis" height={230} series={[{ key: 'progress', name: 'Progress %', color: '#6366f1' }]} formatter={(v) => `${v}%`} />
        </ChartCard>
      </div>
    </div>
  )
}

export { AnalyticsTab }
export default AnalyticsTab
