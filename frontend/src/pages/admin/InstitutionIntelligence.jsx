/**
 * MediXO EduX — Administrator · Institution Intelligence Workspace.
 *
 * ONE unified analytical workspace consolidating the former standalone
 * analytics pages (Academic Analytics, Performance, Attendance Analytics,
 * Assignment Analytics, Exam Analytics, Placements) into nine internal
 * tabs — reducing sidebar complexity while increasing institution-level
 * intelligence.
 *
 * EVERY metric derives from the Phase 1 Institution Intelligence Foundation
 * (`useAdminIntelligence` → derived/datasets) or reused existing services
 * (`useFacultyIntelligence` for faculty-level roll-ups). No hardcoded
 * values, no duplicate datasets, no page-local calculations.
 *
 * Deep-linkable via ?tab=overview|students|faculty|academic|assessment|
 * attendance|departments|risk|outcomes. Legacy analytics routes remain
 * fully functional (removed from the primary sidebar only).
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, BarChart3, BookOpenCheck, BrainCircuit, CalendarCheck2,
  GraduationCap, LayoutDashboard, Target, TrendingUp, Users,
} from 'lucide-react'
import { useAdminIntelligence } from '@/services/admin-intelligence'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import {
  WorkspaceOverviewTab, StudentTab, FacultyTab, AcademicTab,
  AssessmentTab, AttendanceTab, DepartmentTab, RiskTab, OutcomesTab,
} from '@/components/institution-workspace'

const TAB_META = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'students', label: 'Student Intelligence', icon: Users },
  { id: 'faculty', label: 'Faculty Intelligence', icon: GraduationCap },
  { id: 'academic', label: 'Academic Intelligence', icon: BarChart3 },
  { id: 'assessment', label: 'Assessment Intelligence', icon: BookOpenCheck },
  { id: 'attendance', label: 'Attendance & Engagement', icon: CalendarCheck2 },
  { id: 'departments', label: 'Department Intelligence', icon: BrainCircuit },
  { id: 'risk', label: 'Risk & Intervention', icon: AlertTriangle },
  { id: 'outcomes', label: 'Institutional Outcomes', icon: TrendingUp },
]

function InstitutionIntelligence() {
  const { data, isLoading, isError, refetch } = useAdminIntelligence()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && TAB_META.some((m) => m.id === t)) setTab(t)
  }, [searchParams])

  if (isLoading) return <DashboardSkeleton cards={4} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const health = data.derived.institutionHealth ?? {}

  return (
    <div>
      <PageHeader
        eyebrow="Administrator · Institution Intelligence"
        title="Institution Intelligence"
        description="Deep analytics across students, faculty, academics, assessments, departments, risk and outcomes — one workspace, one foundation."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Institution Intelligence' }]}
        actions={
          <Badge variant={health.grade === 'Excellent' ? 'success' : health.grade === 'Good' ? 'warning' : 'danger'} className="px-3 py-1">
            <Target className="h-3 w-3" /> Institution health {health.score}/100 · {health.grade}
          </Badge>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-1 flex w-full flex-wrap justify-start sm:w-auto">
          {TAB_META.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview"><WorkspaceOverviewTab data={data} /></TabsContent>
        <TabsContent value="students"><StudentTab data={data} /></TabsContent>
        <TabsContent value="faculty"><FacultyTab data={data} /></TabsContent>
        <TabsContent value="academic"><AcademicTab data={data} /></TabsContent>
        <TabsContent value="assessment"><AssessmentTab data={data} /></TabsContent>
        <TabsContent value="attendance"><AttendanceTab data={data} /></TabsContent>
        <TabsContent value="departments"><DepartmentTab data={data} /></TabsContent>
        <TabsContent value="risk"><RiskTab data={data} /></TabsContent>
        <TabsContent value="outcomes"><OutcomesTab data={data} /></TabsContent>
      </Tabs>
    </div>
  )
}

export { InstitutionIntelligence }
export default InstitutionIntelligence
