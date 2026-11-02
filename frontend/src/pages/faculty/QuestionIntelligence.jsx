import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BrainCircuit, CopyPlus, Database, FilePlus2, FileText, LayoutDashboard, Library, ListChecks,
  Sparkles, Star, Timer, Wand2,
} from 'lucide-react'
import { usePYQAnalysis, usePYQFilters } from '@/services/extra'
import { useFacultyQuestions } from '@/services/faculty-questions'
import { useFacultyIntelligence } from '@/services/faculty-intelligence'
import { isPyqQuestion } from '@/api/adapters/questions'
import { withLiveQuestionStats } from '@/intelligence/faculty'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent, useToast } from '@/components/ui'
import {
  AssessmentOverviewTab, QuestionIntelligenceContent, PyqIntelligenceTab,
  PaperGeneratorTab, PaperLibraryTab, AssessmentAnalyticsTab,
} from '@/components/assessment-workspace'
import { AIQuestionStudio } from '@/pages/faculty/AIQuestionStudio'

const GENERATE_ACTIONS = [
  { id: 'similar', title: 'Generate similar questions', desc: 'Clone the top repeated PYQ patterns into fresh questions', icon: CopyPlus },
  { id: 'practice', title: 'Generate practice set', desc: 'Topic-wise drill set for weak chapters and high-frequency topics', icon: ListChecks },
  { id: 'mock', title: 'Generate mock test', desc: 'Full mock auto-built from the PYQ difficulty & type distribution', icon: Timer },
  { id: 'revision', title: 'Generate revision sheet', desc: 'One-page concept sheet for the highest-yield topics', icon: FileText },
]

/* Legacy deep links keep working: question-bank → question-intelligence,
   ai-suggestions → overview. */
const TAB_ALIASES = { 'question-bank': 'question-intelligence', 'ai-suggestions': 'overview' }
const TAB_META = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'question-intelligence', label: 'Question Intelligence', icon: Database },
  { id: 'pyq', label: 'PYQ Intelligence', icon: Sparkles, star: true },
  { id: 'question-studio', label: 'AI Question Studio', icon: Wand2, star: true },
  { id: 'paper-generator', label: 'Generate Paper', icon: FilePlus2, star: true },
  { id: 'library', label: 'Paper Library', icon: Library },
  { id: 'analytics', label: 'Assessment Analytics', icon: BrainCircuit },
]

/**
 * Assessment Intelligence Workspace — flagship merged workspace.
 * Tabs: Overview · Question Intelligence · PYQ Intelligence ·
 * AI Question Paper Generator · Paper Library · Assessment Analytics.
 * Reuses the existing Question Bank / PYQ Analysis business logic and the
 * centralized Faculty Intelligence Foundation.
 */
function QuestionIntelligence() {
  const { data: pyqData, isLoading: pyqLoading, isError: pyqError, refetch: refetchPyq } = usePYQAnalysis()
  const { data: qbData, isLoading: qbLoading, isError: qbError, refetch: refetchQb } = useFacultyQuestions()
  const { data: intelData, isLoading: intelLoading, isError: intelError, refetch: refetchIntel } = useFacultyIntelligence()
  const { data: filtersData } = usePYQFilters()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState('overview')
  const [editingPaper, setEditingPaper] = useState(null)
  const toast = useToast()

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t) setTab(TAB_ALIASES[t] ?? t)
  }, [searchParams])

  /* Question records + question-derived stats come ONLY from the live
     question-bank API. The intelligence summary payload's questionStats
     block is replaced with stats re-derived from the real bank (an empty
     bank → neutral '—' stats, never seeded values). */
  const qbQuestions = qbData?.questions ?? []
  const intelLive = useMemo(
    () => withLiveQuestionStats(intelData, { summary: qbData?.summary ?? {}, questions: qbQuestions }),
    [intelData, qbData, qbQuestions],
  )

  if (pyqLoading || qbLoading || intelLoading) return <DashboardSkeleton cards={3} />
  if (pyqError || qbError || intelError) return <ErrorState onRetry={() => { refetchPyq(); refetchQb(); refetchIntel() }} />

  const qi = pyqData.questionIntelligence
  const pyqMatched = qbQuestions.filter(isPyqQuestion).length
  /* "AI suggested questions" — PYQ-matched records straight from the live
     question bank (highest repetition first). No seeded prediction stems. */
  const bankSuggestions = [...qbQuestions]
    .filter(isPyqQuestion)
    .sort((a, b) => (Number(b.pyqFrequency) || 0) - (Number(a.pyqFrequency) || 0))
    .slice(0, 4)
  const subjects = (filtersData?.subjects ?? []).map((s) => `${s.code} — ${s.name}`)
  const yearLabel = `${pyqData.overview.yearsCovered[0]}–${pyqData.overview.yearsCovered[pyqData.overview.yearsCovered.length - 1]}`
  const assessmentHealth = intelLive?.derived?.assessment?.assessmentHealth

  return (
    <div>
      <PageHeader
        eyebrow="Assessment Intelligence · Workspace"
        title="Assessment Intelligence"
        description="Your unified assessment brain — question bank, PYQ intelligence, AI paper generator, paper library and assessment analytics in one workspace."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Assessment Intelligence' }]}
        actions={
          <>
            {assessmentHealth && (
              <Badge variant={assessmentHealth.score >= 85 ? 'success' : assessmentHealth.score >= 70 ? 'warning' : 'danger'} className="px-3 py-1">
                <BrainCircuit className="h-3 w-3" /> Health {assessmentHealth.score}/100 · {assessmentHealth.grade}
              </Badge>
            )}
            <Badge variant="gradient" className="px-3 py-1">{qbData.summary.total} bank · {pyqMatched} PYQ-matched</Badge>
            {/* Faculty module temporarily hidden — restore with the nav entry in config/index.js
            <Link to="/faculty/question-intelligence/micro-assessment">
              <Button size="sm"><Sparkles className="h-3.5 w-3.5" /> AI Micro-Assessment Studio</Button>
            </Link>
            */}
          </>
        }
      />

      {/* Question Paper Studio banner (Phase 30) */}
      {(tab === 'paper-generator' || tab === 'library') && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-indigo-200/70 bg-gradient-to-r from-indigo-600/10 via-blue-600/5 to-teal-500/10 p-5 ring-1 ring-indigo-500/15 dark:border-indigo-500/25 dark:from-indigo-500/10 dark:via-blue-500/5 dark:to-teal-500/10">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
              <Wand2 className="h-3.5 w-3.5" /> Question Paper Studio
            </p>
            <h2 className="mt-1 text-[16px] font-bold text-slate-900 dark:text-white">Design, generate, review and share intelligent question papers</h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">Generate Paper and Paper Library are one workflow — papers flow from the studio into the library automatically.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={tab === 'paper-generator' ? 'default' : 'outline'} onClick={() => setTab('paper-generator')}><Wand2 className="h-3.5 w-3.5" /> Generate Paper</Button>
            <Button size="sm" variant={tab === 'library' ? 'default' : 'outline'} onClick={() => setTab('library')}><Library className="h-3.5 w-3.5" /> Paper Library</Button>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-1 flex w-full flex-wrap justify-start sm:w-auto">
          {TAB_META.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              <t.icon className="h-3.5 w-3.5" /> {t.label}
              {t.star && <span className="ml-1 text-amber-400">★</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ---------------- Overview ---------------- */}
        <TabsContent value="overview">
          <AssessmentOverviewTab data={intelData} />

          {/* AI suggestions (preserved from the legacy tab) */}
          <div className="mt-10 space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Papers analysed', value: String(pyqData.overview.totalPapers), icon: FileText, grad: 'from-indigo-500 to-blue-500' },
                { label: 'Years covered', value: yearLabel, icon: Timer, grad: 'from-teal-500 to-emerald-500' },
                { label: 'Repeated questions', value: String(pyqData.overview.repeatedQuestions), icon: Star, grad: 'from-rose-500 to-red-500' },
                { label: 'Bank questions matched to PYQs', value: String(pyqMatched), icon: Database, grad: 'from-amber-500 to-orange-500' },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`rounded-3xl bg-gradient-to-br ${s.grad} p-5 text-white shadow-lg`}>
                  <s.icon className="h-5 w-5 opacity-80" />
                  <p className="mt-2 font-display text-2xl font-bold">{s.value}</p>
                  <p className="text-[11px] font-medium text-white/75">{s.label}</p>
                </motion.div>
              ))}
            </div>

            <div>
              <h2 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
                <Sparkles className="h-4 w-4 text-indigo-500" /> Generate from the intelligence
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {GENERATE_ACTIONS.map((a, i) => (
                  <motion.button
                    key={a.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => toast.success(`${a.title} ✨`, `${a.desc} — generated.`)}
                    className="group rounded-3xl border border-slate-200/70 bg-white p-5 text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-md shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110">
                      <a.icon className="h-5 w-5" />
                    </span>
                    <p className="mt-3 text-[13px] font-bold leading-snug text-slate-800 dark:text-slate-100">{a.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{a.desc}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
                <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
                  <Star className="h-4 w-4 text-amber-500" /> AI suggested questions
                </p>
                <p className="mt-0.5 text-xs text-slate-400">Highest-repetition PYQ matches from your live question bank</p>
                <div className="mt-4 space-y-3">
                  {bankSuggestions.map((q) => (
                    <div key={q.id} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[13.5px] font-semibold leading-snug text-slate-800 dark:text-slate-100">{q.text}</p>
                        <Badge variant="gradient">{(q.pyqFrequency ?? 0) > 0 ? `PYQ ×${q.pyqFrequency}` : `PYQ ${q.pyqYear ?? ''}`}</Badge>
                      </div>
                      <p className="mt-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                        {(q.appearedIn ?? []).length > 0 ? `Appeared in ${q.appearedIn.join(', ')}` : (q.pyqTopics ?? []).join(' · ') || q.topic || q.chapter || '—'}
                      </p>
                    </div>
                  ))}
                  {bankSuggestions.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-indigo-200 p-4 text-center text-xs text-slate-400 dark:border-indigo-500/30">
                      No PYQ-matched questions in the bank yet — suggestions appear once the question bank has content.
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => toast.success('Important questions ✨', 'Ranked list of predicted questions generated for the next exam.')}>
                  Generate important questions
                </Button>
              </div>

              <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
                <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
                  <BrainCircuit className="h-4 w-4 text-violet-500" /> AI predicted topics
                </p>
                <p className="mt-0.5 text-xs text-slate-400">Emerging, gap-risk and never-asked topics across {subjects.length} subjects</p>
                <div className="mt-4 space-y-2">
                  {(qi.emergingTopics ?? []).map((t) => (
                    <div key={t} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                      <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{t}</p>
                      <Badge variant="success" size="sm">Emerging</Badge>
                    </div>
                  ))}
                  {(qi.neverAsked ?? []).slice(0, 3).map((t) => (
                    <div key={t} className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200 p-3.5 dark:border-slate-700">
                      <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{t}</p>
                      <Badge variant="warning" size="sm">Gap risk</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
              <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                <span className="font-bold text-indigo-600 dark:text-indigo-300">MediXO Mentor:</span> {qi.importantConcepts?.[0] && qi.frequentTopics?.[1]
                  ? <>{qi.importantConcepts[0]} and {qi.frequentTopics[1]} dominate the last 3 exam cycles. Fold them into the next {subjects[0] ?? 'course'} paper with a difficulty split of 30/50/20.</>
                  : <>Once PYQ analytics index a corpus, the dominant concepts and topics for the next {subjects[0] ?? 'course'} paper will appear here.</>}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ---------------- Question Intelligence ---------------- */}
        <TabsContent value="question-intelligence">
          <QuestionIntelligenceContent data={qbData} intelData={intelLive} />
        </TabsContent>

        {/* ---------------- PYQ Intelligence ---------------- */}
        <TabsContent value="pyq">
          <PyqIntelligenceTab data={intelLive} questions={qbQuestions} />
        </TabsContent>

        {/* ---------------- AI Question Studio ---------------- */}
        <TabsContent value="question-studio">
          <AIQuestionStudio />
        </TabsContent>

        {/* ---------------- AI Question Paper Generator ---------------- */}
        <TabsContent value="paper-generator">
          <PaperGeneratorTab data={intelLive} editPaper={editingPaper} onClearEdit={() => setEditingPaper(null)} />
        </TabsContent>

        {/* ---------------- Paper Library ---------------- */}
        <TabsContent value="library">
          <PaperLibraryTab onEditPaper={(paper) => { setEditingPaper(paper); setTab('paper-generator') }} onGoToGenerate={() => setTab('paper-generator')} />
        </TabsContent>

        {/* ---------------- Assessment Analytics ---------------- */}
        <TabsContent value="analytics">
          <AssessmentAnalyticsTab data={intelLive} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export { QuestionIntelligence }
export default QuestionIntelligence
