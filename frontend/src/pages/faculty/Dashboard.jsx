/**
 * MediXO EduX — Faculty · Teaching Command Center.
 *
 * The executive faculty dashboard: Faculty Success Center, AI Faculty
 * Brief, Today's Teaching Schedule, AI Intervention Center, Teaching
 * Timeline, Pending Tasks, Course Progress, Students Requiring Attention,
 * Recent Activities and Smart Quick Actions.
 *
 * EVERY value derives from the centralized Faculty Intelligence Foundation
 * (`/faculty-intelligence/summary` → derived.dashboard) — the dashboard
 * contains no isolated mock values.
 */

/* Hidden with the AI Teaching Assistant header button — restore together.
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
*/
import { useFacultyIntelligence } from '@/services/faculty-intelligence'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui'
import {
  SuccessCenter, InterventionCenter,
  CourseProgress, AttentionSection,
  RecentActivities,
} from '@/components/faculty-dashboard'
/* Hidden with the greeting + schedule cards — restore together.
import { AiFacultyBrief, TodaySchedule } from '@/components/faculty-dashboard'
*/
/* Hidden with the Teaching timeline + Pending tasks cards — restore together.
import { DashboardTimeline, PendingTasks } from '@/components/faculty-dashboard'
*/

function greetingForNow(name) {
  const hour = new Date().getHours()
  const period = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
  return name ? `Good ${period}, ${name}` : `Good ${period}`
}

function Dashboard() {
  const { data, isLoading, isError, error, refetch } = useFacultyIntelligence()

  if (isLoading) return <DashboardSkeleton cards={4} />
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />

  const db = data.derived.dashboard ?? {}
  const brief = db.aiBrief ?? {}
  const alerts = db.interventions?.length ?? 0

  return (
    <div>
      <PageHeader
        title={data.profile?.firstName ? greetingForNow(data.profile.firstName) : (brief.greeting || 'Welcome')}
        description={brief.date || "Here's your teaching overview for today."}
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Dashboard' }]}
        actions={
          <>
            {alerts > 0 && (
              <Button asChild size="sm" variant="outline">
                <a href="#interventions">🎯 {alerts} interventions today</a>
              </Button>
            )}
            {/*
            <Button asChild size="sm">
              <Link to="/faculty/ai-assistant"><Sparkles className="h-4 w-4" /> AI Teaching Assistant</Link>
            </Button>
            */}
          </>
        }
      />

      {/* Greeting brief + today's schedule — moved into the page header
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><AiFacultyBrief data={data} /></div>
        <div className="lg:col-span-1"><TodaySchedule data={data} /></div>
      </div>
      */}

      <SuccessCenter data={data} />

      {/* AI Intervention Center heading removed; cards still render when present */}
      <div id="interventions">
        <InterventionCenter data={data} />
      </div>

      {/* Teaching timeline + Pending tasks — hidden for faculty dashboard clean-up
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardTimeline data={data} />
        <PendingTasks data={data} />
      </div>
      */}

      {/* 7. Course Progress + 8. Students Requiring Attention */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CourseProgress data={data} />
        <AttentionSection data={data} />
      </div>

      <div className="mt-10">
        <RecentActivities data={data} />
      </div>
    </div>
  )
}

export { Dashboard }
export default Dashboard
