/**
 * MediXO EduX — Administrator · Institution Command Center.
 *
 * Executive dashboard answering "what is happening across my institution
 * and what requires management attention right now?".
 *
 * EVERY metric derives from the Phase 1 Institution Intelligence Foundation
 * (`/admin-intelligence/summary` → derived). No hardcoded values.
 *
 * Hierarchy: 1 Institution Health → 2 Student/Academic Risk →
 * 3 Executive AI Brief → 4 Exam Performance (JEE / NEET) → 5 Academic Trends →
 * 6 Faculty Health → 7 Assessment Health → 8 Activity (quick actions).
 */

import { useAdminIntelligence } from '@/services/admin-intelligence'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button } from '@/components/ui'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import {
  SuccessCenter, ExecutiveBrief, HealthVisual, DepartmentPerformance,
  InterventionCenter, PerformanceTrend, FacultyHealth, AssessmentIntelligence,
  TodayPriorities, QuickActions,
} from '@/components/admin-dashboard'

function Dashboard() {
  const { data, isLoading, isError, refetch } = useAdminIntelligence()

  if (isLoading) return <DashboardSkeleton cards={4} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const health = data.derived.institutionHealth ?? {}
  const brief = data.derived?.reports?.institution?.headline ?? 'Institution health overview'
  const instName = data.derived?.profile?.name || data.profile?.name || 'your institution'

  return (
    <div>
      <PageHeader
        eyebrow="Administrator · Command Center"
        title="Institution Command Center"
        description={`${instName} — executive health, student risk and management priorities at a glance.`}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Dashboard' }]}
        actions={
          <>
            <Badge variant={health.grade === 'Excellent' ? 'success' : health.grade === 'Good' ? 'warning' : 'danger'} className="px-3 py-1">
              <ShieldCheck className="h-3 w-3" /> Health {health.score}/100 · {health.grade}
            </Badge>
            <Button asChild size="sm">
              <Link to="/admin/institution-intelligence">Institution Intelligence <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </>
        }
      />

      {/* 1 · Institution Health — Success Center */}
      <SuccessCenter data={data} />

      {/* 2+3 · Risk + Executive Brief */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExecutiveBrief data={data} />
        </div>
        <div className="lg:col-span-1">
          <HealthVisual data={data} />
        </div>
      </div>

      {/* 4 · Exam Performance (JEE / NEET) */}
      <div className="mt-10">
        <DepartmentPerformance data={data} />
      </div>

      {/* 5 · Student Intervention Center */}
      <div className="mt-10">
        <InterventionCenter data={data} />
      </div>

      {/* 6 · Trends + 7 · Faculty + 8 · Assessment */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1"><PerformanceTrend data={data} /></div>
        <div className="lg:col-span-1"><FacultyHealth data={data} /></div>
        <div className="lg:col-span-1"><AssessmentIntelligence data={data} /></div>
      </div>

      {/* 9+10 · Priorities + Quick actions */}
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TodayPriorities data={data} />
        <QuickActions data={data} />
      </div>

      <p className="mt-8 text-center text-[11px] font-medium text-slate-400">
        {brief} · Generated from the Institution Intelligence Foundation.
      </p>
    </div>
  )
}

export { Dashboard }
export default Dashboard
