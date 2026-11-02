/**
 * MediXO EduX — Assessment Workspace · Tab 5: Paper Library (Phase 9 Backend-Ready).
 * No samplePapers fallback. Fetches from backend via centralized API client.
 * Backend unavailable → empty state "Paper Library unavailable" / "Connect the EduX backend"
 */

import { useState } from 'react'
import { BookOpen, Database, GitMerge } from 'lucide-react'
import { useAiPaperLibrary, usePaperDeleteBackend } from '@/services/faculty-papers'
import { StatCard } from '@/components/shared/stat-card'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Button, Input, useToast } from '@/components/ui'
import { PaperCard, PaperPreviewDialog, PaperDeleteDialog, SharePaperDialog, MergePapersDialog } from './paper-parts'

function PaperLibraryTab({ onEditPaper = null, onGoToGenerate = null }) {
  const { data, isLoading, isError, error, refetch } = useAiPaperLibrary()
  const { mutateAsync: deletePaper } = usePaperDeleteBackend()
  const [filter, setFilter] = useState('All')
  const [modeFilter, setModeFilter] = useState('All')
  const [examFilter, setExamFilter] = useState('All')
  const [shareTarget, setShareTarget] = useState(null)
  const [search, setSearch] = useState('')

  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedPaper, setSelectedPaper] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) {
    const isBackendDown = !error?.response || error?.response?.status >= 500
    if (isBackendDown) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <Database className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">Paper Library unavailable</p>
          <p className="mt-1 text-xs text-slate-400">The paper library is temporarily unavailable. Please try again later.</p>
          <p className="mt-2 text-[11px] text-slate-400">{String(error?.message ?? 'Network error')}</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => refetch()}>Retry</Button>
        </div>
      )
    }
    return <ErrorState onRetry={() => refetch()} />
  }

  const papers = data?.generatedPapers ?? []
  const paperDomain = (p) => p.domain ?? p.mode ?? 'University'
  const paperFamily = (p) => p.examFamily ?? p.exam ?? null
  const paperStatus = (p) => String(p.status ?? 'Draft')
  const isMergedPaper = (p) => p.generationId === 'merged' || p.source === 'merged'
  const statusFiltered = filter === 'All'
    ? papers
    : filter === 'Archived'
      ? papers.filter((p) => p.archived)
      : papers.filter((p) => paperStatus(p).toLowerCase() === filter.toLowerCase())
  const filtered = statusFiltered.filter((p) => {
    const mode = paperDomain(p)
    // Merged papers only appear under Competitive → Merged, nowhere else
    if (isMergedPaper(p) && examFilter !== 'Merged') return false
    if (modeFilter === 'University' && mode !== 'University') return false
    if (modeFilter === 'Competitive' && mode !== 'Competitive' && examFilter !== 'Merged') return false
    if (examFilter === 'JEE' && paperFamily(p) !== 'JEE') return false
    if (examFilter === 'NEET' && paperFamily(p) !== 'NEET') return false
    if (examFilter === 'Merged' && !isMergedPaper(p)) return false
    if (search) {
      const hay = `${p.title} ${p.subject ?? ''} ${p.course ?? ''} ${paperFamily(p) ?? ''} ${p.examType ?? ''}`.toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  })
  const uniCount = papers.filter((p) => paperDomain(p) === 'University').length
  const compCount = papers.filter((p) => paperDomain(p) === 'Competitive').length
  const jeeCount = papers.filter((p) => paperDomain(p) === 'Competitive' && paperFamily(p) === 'JEE').length
  const neetCount = papers.filter((p) => paperDomain(p) === 'Competitive' && paperFamily(p) === 'NEET').length
  const compMergedCount = papers.filter((p) => isMergedPaper(p)).length
  const totalQuestions = papers.reduce((a, p) => a + (p.questions ?? p.selectedQuestionIds?.length ?? 0), 0)
  const readyCount = papers.filter((p) => ['ready', 'published'].includes(paperStatus(p).toLowerCase()) && !p.archived).length

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePaper(deleteTarget.id)
      toast.success('Paper deleted', `${deleteTarget.title} was permanently removed.`)
      setDeleteTarget(null)
      refetch()
    } catch {
      toast.error('Could not delete', 'Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Papers in library" value={String(papers.length)} sub="saved papers" icon="BookOpen" gradient="from-indigo-500 to-blue-500" />
        <StatCard index={1} label="Ready to publish" value={String(readyCount)} sub="status · Ready" icon="CheckCircle2" gradient="from-emerald-500 to-teal-500" />
        <StatCard index={2} label="Total questions" value={String(totalQuestions)} sub="across all papers" icon="ListChecks" gradient="from-amber-500 to-orange-500" />
        <StatCard index={3} label="Total marks" value={String(papers.reduce((a, p) => a + (p.totalMarks ?? 0), 0))} sub="library capacity" icon="Target" gradient="from-violet-500 to-purple-500" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {['All', 'Ready', 'Draft', 'In Review', 'Archived'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${filter === f ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}
          >
            {f}
            <span className="ml-1.5 opacity-60">
              {f === 'All' ? papers.length : f === 'Archived' ? papers.filter((p) => p.archived).length : papers.filter((p) => paperStatus(p).toLowerCase() === f.toLowerCase()).length}
            </span>
          </button>
        ))}
        <span className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/40 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
            onClick={() => setMergeOpen(true)}
          >
            <GitMerge className="h-3.5 w-3.5" /> Merge Papers
          </Button>
          <span className="text-xs font-semibold text-slate-400">{filtered.length} papers</span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Domain</span>
        {['All', 'University', 'Competitive'].map((m) => (
          <button
            key={m}
            onClick={() => { setModeFilter(m); setExamFilter('All') }}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${modeFilter === m ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}
          >
            {m}
            <span className="ml-1.5 opacity-60">{m === 'All' ? papers.length : m === 'University' ? uniCount : compCount}</span>
          </button>
        ))}
        <div className="relative ml-auto">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search papers…" className="h-9 w-48 pl-8 text-xs sm:w-64" />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {modeFilter === 'Competitive' && (
          <>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Exam Family</span>
            {['All', 'JEE', 'NEET', 'Merged'].map((e) => (
              <button
                key={e}
                onClick={() => setExamFilter(e)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${examFilter === e ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}
              >
                {e}
                <span className="ml-1.5 opacity-60">
                  {e === 'All' ? compCount : e === 'JEE' ? jeeCount : e === 'NEET' ? neetCount : compMergedCount}
                </span>
              </button>
            ))}
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((p, i) => (
          <PaperCard
            key={p.id}
            paper={p}
            index={i}
            onView={(paper) => { setSelectedPaper(paper); setPreviewOpen(true) }}
            onDelete={setDeleteTarget}
            onShare={setShareTarget}
            onEdit={(paper) => { if (onEditPaper) onEditPaper({ ...paper }); }}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="mt-4 rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No question papers yet.</p>
          <p className="mt-1 text-xs text-slate-400">Create or generate questions to build your paper library.</p>
          {onGoToGenerate && (
            <Button size="sm" className="mt-4" onClick={onGoToGenerate}>
              Create your first paper
            </Button>
          )}
        </div>
      )}

      <PaperPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} paper={selectedPaper} />
      <PaperDeleteDialog open={!!deleteTarget} onOpenChange={(v) => !v && !deleting && setDeleteTarget(null)} paper={deleteTarget} onConfirm={handleDelete} deleting={deleting} />
      <SharePaperDialog paper={shareTarget} open={!!shareTarget} onOpenChange={(v) => !v && setShareTarget(null)} />
      <MergePapersDialog open={mergeOpen} onOpenChange={setMergeOpen} onMerged={() => refetch()} />
    </div>
  )
}

export { PaperLibraryTab }
export default PaperLibraryTab
