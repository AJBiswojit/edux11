import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, History, ListChecks, MessageSquareText, Sparkles, StickyNote } from 'lucide-react'
import { useMentorWorkspace } from '@/services/extra'
import { useStudentIntelligence } from '@/services/intelligence'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { ChatTab, ResourcesTab, PracticeCenterTab, NotesTab, HistoryTab } from '@/components/ai-workspace'

/**
 * MediXO Mentor — the student's complete AI Workspace.
 * Tabs: AI Chat · Study Resources · Practice Center · Notes & Summaries ·
 *       Learning History. Every value derives from the centralized Student
 *       Intelligence Foundation (context-aware AI, personalized resources,
 *       practice generation, note generation, learning history).
 */
function Mentor() {
  const { data: ws, isLoading: wsLoading, isError: wsError, refetch: refetchWs } = useMentorWorkspace()
  const { data: intel, isLoading: intelLoading, isError: intelError, refetch: refetchIntel } = useStudentIntelligence()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') ?? 'chat')

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t) setTab(t)
  }, [searchParams])

  if (wsLoading || intelLoading) return <DashboardSkeleton cards={2} />
  if (wsError || intelError) return <ErrorState onRetry={() => { refetchWs(); refetchIntel() }} />

  const derived = intel.derived
  const datasets = intel.datasets
  const workspace = ws ?? {}

  return (
    <div>
      <PageHeader
        eyebrow="AI Learning · MediXO Mentor"
        title="MediXO Mentor"
        description="Your complete AI workspace — context-aware chat, personalized study resources, practice generation, notes & summaries, and a full learning history."
        breadcrumbs={[{ label: 'Student' }, { label: 'MediXO Mentor' }]}
        actions={<Badge variant="gradient" className="px-3 py-1"><Sparkles className="h-3 w-3" /> v6.0 · context-aware</Badge>}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-1 flex w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="chat"><MessageSquareText className="h-3.5 w-3.5" /> AI Chat</TabsTrigger>
          <TabsTrigger value="resources"><BookOpen className="h-3.5 w-3.5" /> Study Resources</TabsTrigger>
          <TabsTrigger value="practice"><ListChecks className="h-3.5 w-3.5" /> Practice Center</TabsTrigger>
          <TabsTrigger value="notes"><StickyNote className="h-3.5 w-3.5" /> Notes &amp; Summaries</TabsTrigger>
          <TabsTrigger value="history"><History className="h-3.5 w-3.5" /> Learning History</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-2">
          <ChatTab derived={derived} datasets={datasets} workspace={workspace} />
        </TabsContent>

        <TabsContent value="resources">
          <ResourcesTab datasets={datasets} workspace={workspace} derived={derived} />
        </TabsContent>

        <TabsContent value="practice">
          <PracticeCenterTab workspace={workspace} />
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab workspace={workspace} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab workspace={workspace} derived={derived} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export { Mentor }
export default Mentor
