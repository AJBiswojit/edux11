/**
 * MediXO EduX — Faculty · Teaching Intelligence Workspace.
 *
 * The primary working environment for faculty: one centralized command
 * center for Teaching, Classes, Attendance, Assignments, Student Engagement,
 * Weak Students, Teaching Insights and AI Suggestions.
 *
 *  · Overview · Attendance Intelligence · Assignments · Student Engagement ·
 *    Teaching Insights ⭐ · Students Requiring Attention · Teaching Timeline
 *
 * Every value shown derives from the Faculty Intelligence Foundation
 * (`/faculty-intelligence/summary` → profile + datasets + derived) — no
 * hardcoded numbers in the UI. Deep-linkable via ?tab=… and consumed by
 * the Faculty Dashboard quick actions.
 */

import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, CalendarCheck2, Clock, FileText, LayoutDashboard,
  Lightbulb, Sparkles, Users,
} from 'lucide-react'
import { useFacultyIntelligence } from '@/services/faculty-intelligence'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import {
  OverviewTab, AttendanceTab, AssignmentsTab, EngagementTab,
  InsightsTab, AttentionTab, TimelineTab,
} from '@/components/teaching-workspace'

const TAB_META = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance Intelligence', icon: CalendarCheck2 },
  { id: 'assignments', label: 'Assignments', icon: FileText },
  { id: 'engagement', label: 'Student Engagement', icon: Users },
  { id: 'insights', label: 'Teaching Insights', icon: Lightbulb, star: true },
  { id: 'attention', label: 'Students Requiring Attention', icon: AlertTriangle },
  { id: 'timeline', label: 'Teaching Timeline', icon: Clock },
]

function TeachingWorkspace() {
  const { data, isLoading, isError, refetch } = useFacultyIntelligence()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TAB_META.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'overview'

  const setTab = (value) => {
    setSearchParams(value === 'overview' ? {} : { tab: value }, { replace: true })
  }

  if (isLoading) return <DashboardSkeleton cards={4} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const derived = data.derived
  const pendingGrading = derived.evaluationProgress?.pending ?? 0
  const criticalStudents = derived.attentionStudents?.critical ?? 0

  return (
    <div>
      <PageHeader
        eyebrow="Faculty · Teaching Intelligence"
        title="Teaching Intelligence Workspace"
        description="One command center for your teaching: classes, attendance, assignments, engagement, weak students and AI suggestions — all connected to your intelligence foundation."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Teaching' }]}
        actions={
          <>
            {criticalStudents > 0 && (
              <Badge variant="danger" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> {criticalStudents} critical interventions
              </Badge>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/faculty/my-students"><Users className="h-4 w-4" /> Intervention console</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/faculty/ai-assistant"><Sparkles className="h-4 w-4" /> AI Teaching Assistant</Link>
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-1 flex w-full flex-wrap justify-start sm:w-auto">
          {TAB_META.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
              {t.star && <span className="ml-1 text-amber-400">★</span>}
              {t.id === 'assignments' && pendingGrading > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">{pendingGrading}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview"><OverviewTab data={data} /></TabsContent>
        <TabsContent value="attendance"><AttendanceTab data={data} /></TabsContent>
        <TabsContent value="assignments"><AssignmentsTab data={data} /></TabsContent>
        <TabsContent value="engagement"><EngagementTab data={data} /></TabsContent>
        <TabsContent value="insights"><InsightsTab data={data} /></TabsContent>
        <TabsContent value="attention"><AttentionTab data={data} /></TabsContent>
        <TabsContent value="timeline"><TimelineTab data={data} /></TabsContent>
      </Tabs>
    </div>
  )
}

export { TeachingWorkspace }
export default TeachingWorkspace
