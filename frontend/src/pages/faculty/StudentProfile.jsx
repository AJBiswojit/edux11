/**
 * Faculty — Student 360 (canonical faculty student-detail experience, Phase 4).
 *
 * ONE canonical orchestration page: Faculty → My Students → Student 360.
 *
 *   canonical attempts → useFacultyStudent360() → server 360 KPIs
 *                                                     ↓
 *                                       this page (state + URL) + 13 tab panels
 *
 * This file holds NO analytical UI and NO second engine. Every tab is a pure
 * consumer of the s360 bundle. Tab, domain, subject, chapter and
 * open-question state are mirrored to the URL so deep links refresh cleanly:
 *
 *   /faculty/my-students/:studentId?context=jee&tab=weaknesses&subject=Physics
 *
 * The domain selector stays University / JEE / NEET (never a generic
 * "Competitive" context) and every panel reads only that context's pools.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, BrainCircuit, ClipboardList, Crosshair, FileText,
  GitCompare, Layers, ListChecks, Target, Timer, TrendingUp, Users,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Card, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import {
  OverviewPanel, StrengthsPanel, WeaknessesPanel, TimeBehaviourPanel, ErrorsPanel,
  TrendsPanel, ComparisonPanel, DnaPanel, SimilarIssuesPanel,
} from '@/components/students-workspace/student-360-panels'
import {
  SubjectIntelligencePanel, SubjectDrilldownPanel,
  ChapterIntelligencePanel, QuestionAnalysisPanel,
} from '@/components/students-workspace/student-intelligence-tabs'
import { StudentInterventionsPanel } from '@/components/students-workspace/intervention-center'
import { STUDENT_STATUS_STYLES } from '@/constants/ui'
import { canonicalExamFamily } from '@/api/adapters/questions'
import { useFacultyStudent360 } from '@/services/faculty-students'
import { useSimilarIssues } from '@/services/faculty-interventions'
import { readContextParam, readTabParam, build360SearchParams } from '@/utils/student-360-url'

const DOMAINS = ['University', 'JEE', 'NEET']

const TABS = [
  { id: 'overview', label: 'Overview', icon: Layers },
  // { id: 'strengths', label: 'Strengths', icon: TrendingUp },
  // { id: 'weaknesses', label: 'Weaknesses', icon: Crosshair },
  // { id: 'subjects', label: 'Subject Intelligence', icon: Layers },
  // { id: 'chapters', label: 'Chapter Intelligence', icon: ListChecks },
  // { id: 'questions', label: 'Question Analysis', icon: FileText },
  // { id: 'time', label: 'Time & Behaviour', icon: Timer },
  // { id: 'errors', label: 'Errors', icon: ClipboardList },
  // { id: 'trends', label: 'Trends', icon: TrendingUp },
  // { id: 'comparison', label: 'Comparison', icon: GitCompare },
  // { id: 'dna', label: 'Academic DNA', icon: BrainCircuit },
  // { id: 'similar', label: 'Similar Issues', icon: Users },
  // { id: 'interventions', label: 'Interventions', icon: Target },
]

function StudentProfile() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, isLoading, isError, refetch } = useFacultyStudent360(studentId)
  const { data: similarIssues, isLoading: similarIssuesLoading, isError: similarIssuesError, refetch: refetchSimilarIssues } = useSimilarIssues('all')

  /* Detect if we are inside the admin portal (URL starts with /admin) */
  const isAdminContext = window.location.pathname.startsWith('/admin')

  /* ---- canonical state, mirrored to URL ---- */
  /* Tab bar is hidden; keep Overview as the landing view even if ?tab=subjects is leftover. */
  const [tab, setTab] = useState(() => {
    const next = readTabParam(searchParams)
    return next === 'subjects' ? 'overview' : next
  })
  const [domain, setDomain] = useState(() => readContextParam(searchParams, null))

  /* drilldown state for subjects/chapters/questions (URL-backed) */
  const [selectedSubject, setSelectedSubject] = useState(() => searchParams.get('subject'))
  const [chapterContext, setChapterContext] = useState(() => {
    const ch = searchParams.get('chapter')
    const sub = searchParams.get('subject')
    return ch ? { subject: sub, chapter: ch } : null
  })
  const [questionContext, setQuestionContext] = useState(() => {
    const ch = searchParams.get('chapter')
    const sub = searchParams.get('subject')
    return ch ? { subject: sub, chapter: ch } : null
  })

  const enrolledFamily = canonicalExamFamily(data?.student?.examFamily ?? data?.batch?.examFamily)
  const activeDomain = useMemo(() => {
    if (enrolledFamily) return enrolledFamily
    if (domain) return domain
    return data?.defaultDomain ?? 'University'
  }, [domain, data, enrolledFamily])

  /* Persist tab/context/subject/chapter to the URL without wiping other params */
  useEffect(() => {
    const next = build360SearchParams(searchParams, {
      tab, domain: activeDomain,
      subject: selectedSubject, chapter: chapterContext?.chapter,
    })
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeDomain, selectedSubject, chapterContext?.chapter])

  const handleSubjectSelect = useCallback((subject) => {
    setSelectedSubject(subject)
  }, [])

  const handleChapterSelect = useCallback((chapter) => {
    setChapterContext({ subject: selectedSubject, chapter })
    // Stay on subjects tab — ChapterIntelligencePanel renders inline below SubjectDrilldownPanel
  }, [selectedSubject])

  const handleTabChange = useCallback((v) => {
    setTab(v)
    if (v !== 'subjects') setSelectedSubject(null)
    if (v !== 'subjects') setChapterContext(null)
  }, [])

  /* After a Student-360-sourced intervention is created, jump to the
     Interventions tab so faculty immediately see "Intervention Created". */
  const handleInterventionCreated = useCallback(() => {
    setTab('interventions')
  }, [])

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const s = data?.student ?? {}
  const domainPack = data?.byDomain?.[activeDomain]
  const attention = domainPack ? domainPack.attention : data?.attention
  const attentionReason = domainPack ? domainPack.attentionReason : data?.attentionReason
  const statusLabel = domainPack?.status ?? data?.status
  const availableDomains = enrolledFamily
    ? [enrolledFamily]
    : DOMAINS.filter((d) => {
        const count = d === 'University' ? (data?.uniCount ?? 0) : d === 'JEE' ? (data?.jeeCount ?? 0) : (data?.neetCount ?? 0)
        return count > 0
      })
  const domainOptions = availableDomains.length ? availableDomains : ['University']

  return (
    <div>
      <button onClick={() => navigate(isAdminContext ? '/admin/students' : '/faculty/my-students')} className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        <ArrowLeft className="h-3.5 w-3.5" /> {isAdminContext ? 'Students' : 'My Students'}
      </button>

      <PageHeader
        title={s.name ?? 'Student'}
        description={`Roll ${s.roll} · ${s.batchName ?? '—'} — a complete view of exam performance, strengths, and areas that need attention.`}
        breadcrumbs={isAdminContext
          ? [{ label: 'Admin' }, { label: 'Students', to: '/admin/students' }, { label: s.name ?? 'Profile' }]
          : [{ label: 'Faculty' }, { label: 'My Students', to: '/faculty/my-students' }, { label: s.name ?? 'Profile' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap rounded-2xl border border-slate-200/80 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              {domainOptions.map((d) => (
                <button key={d} onClick={() => setDomain(d)}
                  className={`rounded-xl px-3.5 py-1.5 text-[11.5px] font-bold transition-all ${activeDomain === d ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                  {d}
                </button>
              ))}
            </div>
            <Badge variant={STUDENT_STATUS_STYLES[statusLabel] ?? 'secondary'} className="px-3 py-1">{statusLabel}</Badge>
          </div>
        }
      />

      {attention && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/70 p-4 dark:border-rose-500/25 dark:bg-rose-500/5">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
          <div>
            <p className="text-[13px] font-bold text-rose-800 dark:text-rose-200">Needs attention</p>
            <p className="mt-0.5 text-[12px] text-rose-700/80 dark:text-rose-300/80">{attentionReason ?? 'Derived from declining performance or low accuracy in recent exams.'}</p>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={handleTabChange} className="mt-6">
        {/* Tab bar hidden — Overview remains the default view.
        <TabsList className="mb-4 flex w-full flex-wrap justify-start sm:w-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}><t.icon className="h-3.5 w-3.5" /> {t.label}</TabsTrigger>
          ))}
        </TabsList>
        */}

        {/* 1. Overview (KPI + AI summary + exam history deep links) */}
        <TabsContent value="overview">
          <OverviewPanel s360={data} studentId={studentId} domain={activeDomain} onDomainChange={setDomain} />
        </TabsContent>

        {/* 2. Strengths (evidence; intervention only on a real negative signal) */}
        <TabsContent value="strengths">
          <StrengthsPanel s360={data} domain={activeDomain} student={data?.student ?? { id: studentId }} onInterventionCreated={handleInterventionCreated} />
        </TabsContent>

        {/* 3. Weaknesses (→ evidence questions → suggested intervention → review & create) */}
        <TabsContent value="weaknesses">
          <WeaknessesPanel s360={data} domain={activeDomain} student={data?.student ?? { id: studentId }} onInterventionCreated={handleInterventionCreated} />
        </TabsContent>

        {/* 4. Subject Intelligence (drill into chapters) */}
        <TabsContent value="subjects">
          {chapterContext ? (
            <ChapterIntelligencePanel s360={data} domain={activeDomain} context={chapterContext}
              student={data?.student ?? { id: studentId }} onInterventionCreated={handleInterventionCreated}
              onBack={() => setChapterContext(null)}
              onNavigate={(ctx) => { if (!ctx) { setChapterContext(null) } else { setChapterContext(ctx) } }} />
          ) : selectedSubject ? (
            <SubjectDrilldownPanel s360={data} domain={activeDomain} subject={selectedSubject}
              onSelectChapter={handleChapterSelect} onBack={() => setSelectedSubject(null)} />
          ) : (
            <SubjectIntelligencePanel s360={data} domain={activeDomain} onSelectSubject={handleSubjectSelect} />
          )}
        </TabsContent>

        {/* 5. Chapter Intelligence (→ topics → evidence questions + intervention) */}
        {/* <TabsContent value="chapters">
          <ChapterIntelligencePanel s360={data} domain={activeDomain} context={chapterContext}
            student={data?.student ?? { id: studentId }} onInterventionCreated={handleInterventionCreated}
            onNavigate={(ctx) => setChapterContext(ctx)} />
        </TabsContent> */}

        {/* 6. Question Analysis (deepest evidence layer + filters) */}
        {/* <TabsContent value="questions">
          <QuestionAnalysisPanel s360={data} domain={activeDomain} context={questionContext} />
        </TabsContent> */}

        {/* 7. Time & Behaviour */}
        <TabsContent value="time">
          <TimeBehaviourPanel s360={data} domain={activeDomain} />
        </TabsContent>

        {/* 8. Errors (conservative taxonomy) */}
        <TabsContent value="errors">
          <ErrorsPanel s360={data} domain={activeDomain} />
        </TabsContent>

        {/* 9. Trends */}
        <TabsContent value="trends">
          <TrendsPanel s360={data} domain={activeDomain} />
        </TabsContent>

        {/* 10. Comparison (first vs latest, context-isolated) */}
        <TabsContent value="comparison">
          <ComparisonPanel s360={data} domain={activeDomain} />
        </TabsContent>

        {/* 11. Academic DNA (reused engine, no duplicate calc) */}
        <TabsContent value="dna">
          <DnaPanel s360={data} domain={activeDomain} />
        </TabsContent>

        {/* 12. Similar Issues (Phase 5, domain-isolated, this student: grouped + individual) */}
        <TabsContent value="similar">
          <SimilarIssuesPanel studentId={studentId} domain={activeDomain} s360={data}
            similarIssues={similarIssues} similarIssuesLoading={similarIssuesLoading}
            similarIssuesError={similarIssuesError} onRetrySimilarIssues={refetchSimilarIssues}
            student={data?.student ?? { id: studentId }} onInterventionCreated={handleInterventionCreated} />
        </TabsContent>

        {/* 13. Interventions (Phase 6 lifecycle, read-only here) */}
        <TabsContent value="interventions">
          <Card className="p-5">
            <StudentInterventionsPanel studentId={studentId} domain={activeDomain} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export { StudentProfile }
export default StudentProfile
