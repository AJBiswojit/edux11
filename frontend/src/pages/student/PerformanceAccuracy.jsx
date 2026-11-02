import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BrainCircuit, Building2, GraduationCap, Sparkles } from 'lucide-react'
import { useStudentIntelligence } from '@/services/intelligence'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import {
  OverviewTab, AnalyticsTab, DnaTab, HealthTab, RecommendationsTab, ReportsTab,
} from '@/components/academic-workspace'

/**
 * Performance & AI — Academic Intelligence Workspace (flagship).
 * ONE combined performance layer with an explicit University | Competitive
 * context switch (Part 9): the Overview and Analytics tabs render the
 * context-appropriate view; every value derives from the centralized
 * Student Intelligence Foundation. No hardcoded numbers.
 */
const CONTEXTS = [
  { id: 'University', label: 'University', icon: GraduationCap },
  { id: 'Competitive', label: 'Competitive', icon: Building2 },
]

function PerformanceAccuracy() {
  const { data: intel, isLoading, isError, refetch } = useStudentIntelligence()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') ?? 'overview')
  const [context, setContext] = useState('University')

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t) setTab(t)
  }, [searchParams])

  if (isLoading) return <DashboardSkeleton cards={4} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const derived = intel.derived
  const profile = intel.profile
  const datasets = intel.datasets
  const dna = derived.dnaWorkspace

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence · Academic Workspace"
        title="Performance & AI"
        description="Your flagship academic intelligence workspace — performance analytics, AI Academic DNA, health, recommendations and reports, all derived from one centralized engine."
        breadcrumbs={[{ label: 'Student' }, { label: 'Performance & AI' }]}
        actions={<Badge variant="gradient" className="px-3 py-1"><BrainCircuit className="h-3 w-3" /> Intelligence v2.0</Badge>}
      />

      {/* context switch — University vs Competitive (Part 9) */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Performance context</p>
        <div className="flex rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {CONTEXTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setContext(c.id)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold transition-all ${context === c.id ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </button>
          ))}
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {context === 'University' ? 'CGPA · semesters · courses · attendance' : 'JEE · NEET · accuracy · speed · negative marking'}
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-1 flex w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="overview"><Sparkles className="h-3.5 w-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="analytics">📈 Performance Analytics</TabsTrigger>
          <TabsTrigger value="dna">🧬 AI Academic DNA</TabsTrigger>
          <TabsTrigger value="health">❤️ Academic Health</TabsTrigger>
          <TabsTrigger value="recommendations">💡 AI Recommendations</TabsTrigger>
          <TabsTrigger value="reports">📄 Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab derived={derived} profile={profile} datasets={datasets} context={context} />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab derived={derived} datasets={datasets} context={context} />
        </TabsContent>

        <TabsContent value="dna">
          <DnaTab dna={dna} derived={derived} datasets={datasets} />
        </TabsContent>

        <TabsContent value="health">
          <HealthTab derived={derived} dna={dna} />
        </TabsContent>

        <TabsContent value="recommendations">
          <RecommendationsTab recommendations={derived.recommendations} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab derived={derived} profile={profile} datasets={datasets} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export { PerformanceAccuracy }
export default PerformanceAccuracy
