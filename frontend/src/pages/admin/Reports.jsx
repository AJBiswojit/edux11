/**
 * MediXO EduX — Administrator · Institutional Analytics & Executive Reporting Center.
 *
 * Converts the institution intelligence data into management-grade reports:
 * Report Center (catalog + templates) · Generate (per-type filters) ·
 * Preview (professional document) · Department Comparison · Report Library.
 *
 * Everything derives from the Phase 1 foundation (`useAdminIntelligence` +
 * `buildExecutiveSummary` / `buildReportPreviewDoc` from the reports engine).
 * Export actions are clearly SIMULATED (frontend prototype — no backend).
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileBarChart, LayoutDashboard, Library, ListPlus, Users } from 'lucide-react'
import { useAdminIntelligence } from '@/services/admin-intelligence'
import { useAdminReports, useCreateAdminReport, useDownloadAdminReport } from '@/services/extra'
import { REPORT_TYPES, buildReportPreviewDoc } from '@/intelligence/admin'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Tabs, TabsList, TabsTrigger, TabsContent, useToast } from '@/components/ui'
import {
  ReportCenterTab, ReportGenerateTab, ReportPreviewTab,
  DepartmentCompareTab, ReportLibraryTab,
} from '@/components/admin-reports'
const TAB_META = [
  { id: 'center', label: 'Report Center', icon: LayoutDashboard },
  { id: 'generate', label: 'Generate', icon: ListPlus },
  { id: 'preview', label: 'Preview', icon: FileBarChart },
  { id: 'departments', label: 'Department Comparison', icon: Users },
  { id: 'library', label: 'Library', icon: Library },
]

function Reports() {
  const { data, isLoading, isError, refetch } = useAdminIntelligence()
  const { data: libraryData } = useAdminReports()
  const createReport = useCreateAdminReport()
  const downloadReport = useDownloadAdminReport()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState('center')
  const [doc, setDoc] = useState(null)
  const [docFilters, setDocFilters] = useState({})
  const toast = useToast()

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && TAB_META.some((m) => m.id === t)) setTab(t)
  }, [searchParams])

  if (isLoading) return <DashboardSkeleton cards={4} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const lastUpdated = data.derived.generatedAt ? new Date(data.derived.generatedAt).toLocaleDateString('en-IN') : 'today'

  const buildDoc = (type, filters) => {
    const docOut = buildReportPreviewDoc({ type: type.id, derived: data.derived, datasets: data.datasets, filters })
    setDoc(docOut)
    setDocFilters({ ...filters, type: type.id })
    setTab('preview')
    return docOut
  }

  const handleExport = async (fmt, item) => {
    const report = item?.id ? item : null
    if (report?.downloadable || report?.generationStatus === 'READY') {
      try {
        await downloadReport.mutateAsync(report)
        toast.success('Download started', report.title || report.name)
        return
      } catch (err) {
        toast.error('Download failed', err?.message || 'Report is not ready.')
        return
      }
    }
    toast.info('Export unavailable', 'Save the report first — only READY PDF files can be downloaded.')
  }

  const handlePrint = () => {
    window.print()
  }

  const handleSave = async (docToSave = doc) => {
    if (!docToSave) return
    try {
      const res = await createReport.mutateAsync({
        title: docToSave.title,
        format: 'PDF',
        category: 'Executive',
        period: docToSave.meta?.period,
        summary: data.derived?.reports?.institution?.body,
      })
      if (res.ok) toast.success('Report saved', `"${docToSave.title}" is ready to download.`)
      else toast.error('Report failed', res.error || 'Could not generate PDF.')
    } catch (err) {
      toast.error('Report failed', err?.response?.data?.detail || 'Could not persist report.')
    }
  }

  const handleView = (item) => {
    const docOut = buildReportPreviewDoc({ type: item.type, derived: data.derived, datasets: data.datasets, filters: { period: item.period } })
    setDoc(docOut)
    setDocFilters({ type: item.type, period: item.period })
    setTab('preview')
  }

  const handleUseTemplate = (template) => {
    const mapping = {
      'Executive Institution Review': 'institution', 'Monthly Academic Review': 'academic',
      'Department Performance Review': 'departments', 'Student Success Review': 'students',
      'Faculty Performance Review': 'faculty', 'Assessment Review': 'assessment',
      'Risk & Intervention Review': 'risk', 'Institutional Outcomes Review': 'outcomes',
    }
    const type = REPORT_TYPES.find((t) => t.id === mapping[template.name]) ?? REPORT_TYPES[0]
    setTab('generate')
    setDocFilters((f) => ({ ...f, presetType: type.id }))
    toast.info(template.name, 'Template selected — configure filters and generate.')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administrator · Executive Reporting"
        title="Institutional Analytics & Executive Reporting"
        description="Management-grade reports — executive summaries, department comparison and decision artifacts generated from the intelligence foundation."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Reports' }]}
        actions={
          <Badge variant="gradient" className="px-3 py-1">
            <FileBarChart className="h-3 w-3" /> {REPORT_TYPES.length} report types · deterministic frontend
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

        <TabsContent value="center">
          <ReportCenterTab types={REPORT_TYPES} lastUpdated={lastUpdated} onGenerate={(t) => { setTab('generate'); setDocFilters((f) => ({ ...f, presetType: t.id })) }} onView={(t) => buildDoc(t, {})} onUseTemplate={handleUseTemplate} />
        </TabsContent>

        <TabsContent value="generate">
          <ReportGenerateTab types={REPORT_TYPES} presetType={docFilters.presetType} onGenerate={buildDoc} />
        </TabsContent>

        <TabsContent value="preview">
          <ReportPreviewTab doc={doc} onExport={handleExport} onPrint={handlePrint} onSave={handleSave} />
        </TabsContent>

        <TabsContent value="departments">
          <DepartmentCompareTab data={data} onExport={handleExport} onPrint={handlePrint} onSave={handleSave} />
        </TabsContent>

        <TabsContent value="library">
          <ReportLibraryTab items={libraryData?.items ?? []} onView={handleView} onExport={handleExport} onPrint={handlePrint} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export { Reports }
export default Reports
