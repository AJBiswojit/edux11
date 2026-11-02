/**
 * MediXO EduX — Faculty · AI Teaching Studio.
 *
 * The faculty member's daily productivity workspace — AI Teaching
 * Assistant · Lesson Planner · Content Studio · Evaluation Assistant ·
 * Teaching Resources · Teaching History · Faculty Profile.
 *
 * Every value derives from the centralized Faculty Intelligence Foundation
 * (`/faculty-intelligence/summary` → derived.aiStudio). Deep-linkable via
 * ?tab=assistant|lesson-planner|content|evaluation|resources|history|profile.
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BookOpenCheck, BrainCircuit, ClipboardCheck, FolderOpen, History, LayoutDashboard, UserRound, Wand2,
} from 'lucide-react'
import { useFacultyIntelligence } from '@/services/faculty-intelligence'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import {
  AssistantTab, LessonPlannerTab, ContentStudioTab, EvaluationTab,
  ResourcesTab, HistoryTab, ProfileTab,
} from '@/components/ai-studio'

const TAB_META = [
  { id: 'assistant', label: 'AI Teaching Assistant', icon: BrainCircuit },
  { id: 'lesson-planner', label: 'Lesson Planner', icon: BookOpenCheck, star: true },
  { id: 'content', label: 'Content Studio', icon: Wand2 },
  { id: 'evaluation', label: 'Evaluation Assistant', icon: ClipboardCheck },
  { id: 'resources', label: 'Teaching Resources', icon: FolderOpen },
  { id: 'history', label: 'Teaching History', icon: History },
  { id: 'profile', label: 'Faculty Profile', icon: UserRound },
]

function AITeachingAssistant() {
  const { data, isLoading, isError, refetch } = useFacultyIntelligence()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState('assistant')

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t) setTab(t)
  }, [searchParams])

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const studio = data.derived.aiStudio ?? {}
  const health = studio.assistantContext?.health ?? {}

  return (
    <div>
      <PageHeader
        eyebrow="Faculty · AI Teaching Studio"
        title="AI Teaching Studio"
        description="Your daily productivity workspace — plan lectures, generate content, evaluate work and grow your teaching portfolio with AI."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'AI Workspace' }]}
        actions={
          <>
            {health.teaching != null && (
              <Badge variant="gradient" className="px-3 py-1">
                <BrainCircuit className="h-3 w-3" /> Teaching {health.teaching} · Engagement {health.engagement} · Assessment {health.assessment}
              </Badge>
            )}
            <Badge variant="secondary" className="px-3 py-1">
              <LayoutDashboard className="h-3 w-3" /> {studio.recommendations?.length ?? 0} AI recommendations
            </Badge>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-1 flex w-full flex-wrap justify-start sm:w-auto">
          {TAB_META.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
              {t.star && <span className="ml-1 text-amber-400">★</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="assistant"><AssistantTab data={data} /></TabsContent>
        <TabsContent value="lesson-planner"><LessonPlannerTab data={data} /></TabsContent>
        <TabsContent value="content"><ContentStudioTab data={data} /></TabsContent>
        <TabsContent value="evaluation"><EvaluationTab data={data} /></TabsContent>
        <TabsContent value="resources"><ResourcesTab data={data} /></TabsContent>
        <TabsContent value="history"><HistoryTab data={data} /></TabsContent>
        <TabsContent value="profile"><ProfileTab data={data} /></TabsContent>
      </Tabs>
    </div>
  )
}

export { AITeachingAssistant }
export default AITeachingAssistant
