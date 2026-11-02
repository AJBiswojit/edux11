import { Award, Sparkles } from 'lucide-react'
import { useParentProgress } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { LineTrend, RadarCompare } from '@/components/charts'
import { Timeline } from '@/components/shared/timeline'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge } from '@/components/ui'
import { formatDate } from '@/utils/format'

function Progress() {
  const { data, isLoading, isError, refetch } = useParentProgress()

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Ward Progress · Overview"
        title={`${'Aarav'}'s progress`}
        description="The big picture: CGPA trajectory, milestones and subject mastery — updated daily."
        breadcrumbs={[{ label: 'Parent' }, { label: 'Progress' }]}
        actions={<Badge variant="success" className="px-3 py-1"><span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-500" /> Live data</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="CGPA trajectory" subtitle="Semester by semester">
          <LineTrend
            data={data.cgpaTrend ?? []}
            xKey="sem"
            height={250}
            series={[{ key: 'cgpa', name: 'CGPA', color: '#6366f1' }]}
          />
          <div className="mt-4 rounded-2xl bg-emerald-50 p-3.5 text-[12px] leading-relaxed text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Sparkles className="mb-1 h-3.5 w-3.5" />
            Steady improvement for 5 consecutive semesters — the AI projects 8.9 by final year.
          </div>
        </ChartCard>

        <ChartCard title="Subject mastery" subtitle="AI-modelled understanding">
          <RadarCompare
            data={data.subjectMastery ?? []}
            angleKey="subject"
            height={250}
            series={[{ key: 'mastery', name: 'Mastery', color: '#14b8a6' }]}
          />
        </ChartCard>
      </div>

      <div className="mt-6">
        <h2 className="mb-6 text-[15px] font-bold text-slate-900 dark:text-white">Key milestones</h2>
        <Timeline
          items={data.milestones.map((m) => ({
            title: m.title,
            date: formatDate(m.date),
            badge: <Badge variant={m.type === 'Certificate' ? 'success' : m.type === 'Award' ? 'warning' : 'info'} size="sm">{m.type}</Badge>,
          }))}
        />
      </div>
    </div>
  )
}

export { Progress }
export default Progress
