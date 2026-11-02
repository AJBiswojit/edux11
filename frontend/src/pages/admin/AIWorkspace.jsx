/**
 * MediXO EduX — Administrator · Executive AI Workspace.
 *
 * The institutional management AI assistant. It is a CONSUMER of the
 * Phase 1–4 intelligence: questions are matched to intents, responses are
 * generated deterministically from the derived snapshot, executive
 * summaries reuse the Phase 4 engine, and actions navigate to existing
 * routes. Frontend-only — clearly labelled "Prototype Intelligence".
 */

import { useMemo, useState } from 'react'
import { BrainCircuit, FileBarChart, MessageSquare, Sparkles, Target } from 'lucide-react'
import { useAdminIntelligence } from '@/services/admin-intelligence'
import { buildExecutiveSummary } from '@/intelligence/admin'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Tabs, TabsList, TabsTrigger, TabsContent, useToast } from '@/components/ui'
import { ChatPanel, ContextPanel, HistoryPanel, SavedInsightsPanel, SaveInsightDialog, HISTORY_KEY, INSIGHTS_KEY } from '@/components/admin-ai'
import { Copy, RefreshCw, Save } from 'lucide-react'

function AIWorkspace() {
  const { data, isLoading, isError, refetch } = useAdminIntelligence()
  const toast = useToast()
  const [tab, setTab] = useState('assistant')
  const [insights, setInsights] = useState(() => {
    try { return JSON.parse(localStorage.getItem(INSIGHTS_KEY) || '[]') } catch { return [] }
  })
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
  })
  const [saveDraft, setSaveDraft] = useState(null)

  const summary = useMemo(() => (data ? buildExecutiveSummary(data.derived) : null), [data])

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const d = data.derived
  const health = d.institutionHealth ?? {}
  const weakest = [...(health.pillars ?? [])].sort((a, b) => a.value - b.value)[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const persistInsights = (next) => {
    setInsights(next)
    try { localStorage.setItem(INSIGHTS_KEY, JSON.stringify(next)) } catch { /* noop */ }
  }

  const handleSaveInsight = (response) => {
    setSaveDraft({
      title: response.title,
      summary: response.summary,
      priority: response.risks?.length ? 'Critical' : 'Info',
      nav: response.nav?.to,
    })
  }

  const confirmSaveInsight = ({ title, priority, insight, source, date, nav }) => {
    const entry = { id: `ins_${Date.now()}`, title, priority, insight, source, date, nav }
    persistInsights([entry, ...insights])
    setSaveDraft(null)
    toast.success('Insight saved 💾', 'Added to saved insights.')
  }

  const handleOpenConversation = (msg) => { setTab('assistant'); toast.info('Conversation restored', `Opening "${msg.text.slice(0, 40)}…"`) }

  const handleClear = () => {
    setHistory([])
    try { localStorage.removeItem(HISTORY_KEY) } catch { /* noop */ }
    toast.success('Conversation cleared', 'History removed from this browser.')
  }

  const execActions = [
    { label: 'Copy', icon: Copy, onClick: () => { const text = `${summary.overall.status}\n\nPositives:\n${summary.positives.join('\n')}\n\nAttention:\n${summary.attention.join('\n')}\n\nRisks:\n${summary.risks.join('\n')}\n\nRecommendations:\n${summary.recommendations.join('\n')}`; navigator.clipboard?.writeText(text).catch(() => {}) } },
    { label: 'Regenerate', icon: RefreshCw, onClick: () => toast.info('Summary refreshed', 'Recomputed from the latest institution data.') },
    { label: 'Save insight', icon: Save, onClick: () => handleSaveInsight({ title: 'Executive Summary', summary: summary.overall.status, risks: summary.risks, nav: null }) },
    { label: 'View report', icon: FileBarChart, onClick: () => { window.history.pushState({}, '', '/admin/reports'); window.dispatchEvent(new PopStateEvent('popstate')) } },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Administrator · Executive AI"
        title="Executive AI Workspace"
        description="Your intelligent institutional decision assistant — ask, analyze, identify, recommend, report and act."
        breadcrumbs={[{ label: 'Admin' }, { label: 'AI Workspace' }]}
        actions={
          <>
            <Badge variant="gradient" className="px-3 py-1"><Sparkles className="h-3 w-3" /> Prototype Intelligence</Badge>
            <Badge variant={health.grade === 'Excellent' ? 'success' : 'warning'} className="px-3 py-1"><Target className="h-3 w-3" /> Health {health.score}/100</Badge>
          </>
        }
      />

      {/* Welcome strip */}
      <Card className="mb-6 flex flex-col items-start justify-between gap-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-xl shadow-indigo-500/20 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70"><BrainCircuit className="mr-1 inline h-3.5 w-3.5" /> Contextual welcome</p>
          <h2 className="mt-1 font-display text-xl font-bold">{greeting}, {d.profile?.firstName || data.profile?.firstName || 'Admin'}.</h2>
          <p className="mt-1 text-[12.5px] text-white/85">
            Institution Health <span className="font-bold">{health.score}/100</span> · Student Success <span className="font-bold">{health.pillars?.find((p) => p.label === 'Student success')?.value ?? '—'}</span>
            {weakest && <span className="ml-2">· Current Priority: <span className="font-bold">{weakest.label}</span> requires attention.</span>}
          </p>
        </div>
        <Badge className="bg-white/15 text-white ring-white/30">Answers from live institution data</Badge>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-1 flex w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="assistant"><MessageSquare className="h-3.5 w-3.5" /> AI Assistant</TabsTrigger>
          <TabsTrigger value="summary"><FileBarChart className="h-3.5 w-3.5" /> Executive Summary</TabsTrigger>
          <TabsTrigger value="insights"><Save className="h-3.5 w-3.5" /> Saved Insights</TabsTrigger>
        </TabsList>

        {/* Assistant — 3-pane layout (stacks on mobile) */}
        <TabsContent value="assistant">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
            <div className="space-y-4">
              <HistoryPanel history={history} onOpenConversation={handleOpenConversation} onClear={handleClear} />
              <div className="hidden xl:block">
                <SavedInsightsPanel
                  insights={insights}
                  onOpen={(ins) => toast.info(ins.title, ins.insight)}
                  onDelete={(id) => persistInsights(insights.filter((x) => x.id !== id))}
                  onNavigate={(to) => { window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')) }}
                />
              </div>
            </div>
            <ChatPanel
              derived={d}
              onSaveInsight={handleSaveInsight}
              onNavigate={(to) => { window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')) }}
            />
            <ContextPanel data={data} insights={d.ai?.insights ?? []} onSaveInsight={handleSaveInsight} />
          </div>
        </TabsContent>

        {/* Executive summary (Phase 4 engine reused) */}
        <TabsContent value="summary">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="h-3.5 w-3.5" /> Executive Summary
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{summary.overall.status}</h3>
                  <p className="mt-0.5 text-[12px] text-slate-400">Health {summary.overall.score}/100 · {summary.overall.grade} · generated from current intelligence</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {execActions.map((a) => (
                    <Button key={a.label} size="sm" variant="outline" className="h-7 text-[11px]" onClick={a.onClick}><a.icon className="h-3 w-3" /> {a.label}</Button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                  <p className="text-[10.5px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Positive developments</p>
                  <ul className="mt-2 space-y-1">
                    {summary.positives.map((p) => <li key={p} className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">· {p}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
                  <p className="text-[10.5px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Areas requiring attention</p>
                  <ul className="mt-2 space-y-1">
                    {summary.attention.map((p) => <li key={p} className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">· {p}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
                  <p className="text-[10.5px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">Critical risks</p>
                  <ul className="mt-2 space-y-1">
                    {(summary.risks.length ? summary.risks : ['No critical risks flagged']).map((p) => <li key={p} className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">· {p}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
                  <p className="text-[10.5px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Recommended actions</p>
                  <ul className="mt-2 space-y-1">
                    {summary.recommendations.map((p) => <li key={p} className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">→ {p}</li>)}
                  </ul>
                </div>
              </div>
            </Card>

            <ContextPanel data={data} insights={d.ai?.insights ?? []} onSaveInsight={handleSaveInsight} />
          </div>
        </TabsContent>

        {/* Saved insights */}
        <TabsContent value="insights">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SavedInsightsPanel
              insights={insights}
              onOpen={(ins) => toast.info(ins.title, ins.insight)}
              onDelete={(id) => persistInsights(insights.filter((x) => x.id !== id))}
              onNavigate={(to) => { window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')) }}
            />
          </div>
        </TabsContent>
      </Tabs>

      {saveDraft && (
        <SaveInsightDialog
          insight={saveDraft}
          onSave={confirmSaveInsight}
          onClose={() => setSaveDraft(null)}
        />
      )}
    </div>
  )
}

export { AIWorkspace }
export default AIWorkspace
