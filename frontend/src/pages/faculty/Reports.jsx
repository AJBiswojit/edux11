/**
 * MediXO EduX — Faculty · Reports Intelligence Workspace.
 *
 * The faculty reporting center: Overview · Report Library · Generate
 * Reports · Export Center. Every number derives from the Faculty
 * Intelligence Foundation (`/faculty-intelligence/summary`) — no hardcoded
 * values. Deep-linkable via ?tab=overview|library|generate|export and
 * ?template=<id> for the report builder.
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { FileBarChart, FileText, LayoutDashboard, Sparkles, Wand2 } from 'lucide-react'
import { useFacultyIntelligence } from '@/services/faculty-intelligence'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import {
  ReportsOverviewTab, ReportsLibraryTab, ReportsGenerateTab, ReportsExportTab,
} from '@/components/reports-workspace'

const TAB_META = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'library', label: 'Report Library', icon: FileText },
  { id: 'generate', label: 'Generate Reports', icon: Wand2, star: true },
  { id: 'export', label: 'Export Center', icon: FileBarChart },
]

function Reports() {
  const { data, isLoading, isError, refetch } = useFacultyIntelligence()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t) setTab(t)
  }, [searchParams])

  const onTabChange = (value) => {
    setTab(value)
    const tpl = searchParams.get('template')
    const params = value === 'overview' ? {} : { tab: value, ...(value === 'generate' && tpl ? { template: tpl } : {}) }
    navigate(`/faculty/reports${Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : ''}`, { replace: true })
  }

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const library = data.derived.reports?.library ?? {}

  return (
    <div>
      <PageHeader
        eyebrow="Faculty · Reports Intelligence"
        title="Reports & Export Center"
        description="Accreditation-ready reports, one-click data exports and AI-drafted narratives — all derived from your live intelligence foundation."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Reports' }]}
        actions={
          <>
            <Badge variant="gradient" className="px-3 py-1">
              <FileBarChart className="h-3 w-3" /> {library.total ?? 0} reports · {(library.totalDownloads ?? 0).toLocaleString('en-IN')} downloads
            </Badge>
            <Badge variant="success" className="px-3 py-1">
              <Sparkles className="h-3 w-3" /> NAAC / NBA ready
            </Badge>
          </>
        }
      />

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="mb-1 flex w-full flex-wrap justify-start sm:w-auto">
          {TAB_META.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
              {t.star && <span className="ml-1 text-amber-400">★</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview"><ReportsOverviewTab data={data} /></TabsContent>
        <TabsContent value="library"><ReportsLibraryTab data={data} /></TabsContent>
        <TabsContent value="generate"><ReportsGenerateTab data={data} /></TabsContent>
        <TabsContent value="export"><ReportsExportTab data={data} /></TabsContent>
      </Tabs>
    </div>
  )
}

export { Reports }
export default Reports
