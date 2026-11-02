/**
 * AI Question Studio — Source Library (Phase 7).
 * 12 demo sources with search/filters, featured markers, Source Preview
 * (page selector + search + passage) and Source Analysis (topics,
 * concepts, patterns, recommended distribution — "Prototype Content
 * Intelligence").
 */
import { useMemo, useState } from 'react'
import { BookOpen, FileText, Search, Sparkles, Wand2 } from 'lucide-react'
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Select, SelectItem, useToast } from '@/components/ui'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { useQuestionStudioSources, useQuestionStudioSource, useAnalyzeSource } from '@/services/question-studio'

const DOMAIN_STYLE = { University: 'info', Competitive: 'gradient' }

function SourceCard({ source, onOpen, onAnalyze }) {
  return (
    <button onClick={onOpen} className="group min-w-0 overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25">
          <BookOpen className="h-5 w-5" />
        </span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={DOMAIN_STYLE[source.domain]} size="sm">{source.domain}{source.exam ? ` · ${source.exam}` : ''}</Badge>
          {source.featured && <Badge variant="gradient" size="sm">⭐ Featured</Badge>}
        </div>
      </div>
      <h3 className="mt-2.5 text-[14px] font-bold leading-snug text-slate-900 dark:text-white">{source.title}</h3>
      <p className="mt-0.5 text-[11px] font-medium text-slate-400">{source.subject} · {source.chapter} · {source.sourceType}</p>
      <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">{source.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="secondary" size="sm">{source.pageCount} pages</Badge>
        <Badge variant="secondary" size="sm">{source.topics?.length ?? 0} topics</Badge>
        <Badge variant="secondary" size="sm">{source.concepts?.length ?? 0} concepts</Badge>
        <Badge variant="outline" size="sm">{source.questionCountGenerated ?? 0} generated</Badge>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Badge variant="warning" size="sm">{source.sourceLabel}</Badge>
        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300">Preview →</span>
      </div>
    </button>
  )
}

export function SourceAnalysisPanel({ analysis }) {
  if (!analysis) return null
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 dark:border-emerald-500/25 dark:bg-emerald-500/5">
        <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <p className="text-[12.5px] font-bold text-emerald-800 dark:text-emerald-200">SOURCE ANALYSIS COMPLETE</p>
        <span className="text-[11.5px] font-medium text-emerald-700/80 dark:text-emerald-300/70">
          {analysis.pagesAnalyzed} pages · {analysis.topicsDetected} topics · {analysis.conceptsDetected} concepts · {analysis.patternsDetected} patterns
        </span>
        <span className="ml-auto rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Prototype Content Intelligence</span>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Detected topics</p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {(analysis.topics ?? []).map((t) => (
            <div key={t.topic} className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{t.topic}</p>
                <Badge variant="info" size="sm">{t.recommendedQuestions} recommended</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(t.concepts ?? []).map((c) => <Badge key={c} variant="outline" size="sm">{c}</Badge>)}
              </div>
              <p className="mt-1.5 text-[10.5px] font-medium text-slate-400">{t.conceptCount} concepts</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Question patterns detected</p>
          <div className="flex flex-wrap gap-1.5">
            {(analysis.patterns ?? []).map((p) => <Badge key={p} variant="secondary" size="sm">{p}</Badge>)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Recommended question distribution</p>
          <div className="space-y-1.5">
            {(analysis.distribution ?? []).map((d) => (
              <div key={d.pattern} className="flex items-center gap-2 text-[11.5px]">
                <span className="w-40 truncate font-semibold text-slate-600 dark:text-slate-300">{d.pattern}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{ width: `${Math.min(100, d.count * 6)}%` }} />
                </div>
                <span className="w-6 text-right font-bold text-slate-700 dark:text-slate-200">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SourcePreviewDialog({ sourceId, open, onOpenChange, onUse }) {
  const toast = useToast()
  const { data, isLoading } = useQuestionStudioSource(sourceId)
  const analyze = useAnalyzeSource()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const source = data?.source

  const pages = source?.content ?? []
  const filtered = pages.map((p, i) => ({ p, i: i + 1 })).filter(({ p }) =>
    !search || `${p.title} ${p.paragraphs?.join(' ')} ${p.bullets?.join(' ')}`.toLowerCase().includes(search.toLowerCase()))
  const active = filtered.find((f) => f.i === page) ?? filtered[0]
  const activePage = active?.p

  if (!open) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" /> {source?.title}
            <Badge variant={DOMAIN_STYLE[source?.domain]} size="sm">{source?.domain}{source?.exam ? ` · ${source.exam}` : ''}</Badge>
            <Badge variant="warning" size="sm">{source?.sourceLabel}</Badge>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? <p className="py-8 text-center text-xs text-slate-400">Loading source…</p> : source && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Type', value: source.sourceType },
                { label: 'Subject', value: source.subject },
                { label: 'Chapter', value: source.chapter },
                { label: 'Pages', value: String(source.pageCount) },
              ].map((m) => (
                <div key={m.label} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white">{m.value}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
                </div>
              ))}
            </div>

            {/* toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search content…" className="h-9 w-52 pl-8 text-xs" />
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="flex flex-wrap gap-1">
                {filtered.slice(0, 12).map(({ i }) => (
                  <button key={i} onClick={() => setPage(i)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold transition-all ${page === i ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {i}
                  </button>
                ))}
                {filtered.length > 12 && <span className="self-center text-[10px] text-slate-400">+{filtered.length - 12}</span>}
              </div>
              <span className="ml-auto text-[11px] font-semibold text-slate-400">Page {activePage ? filtered.find((f) => f.p === activePage)?.i ?? page : page} of {pages.length}</span>
            </div>

            {/* page content */}
            {activePage ? (
              <div className="rounded-3xl border border-slate-200/70 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Page {filtered.find((f) => f.p === activePage)?.i ?? page}</p>
                <h4 className="mt-1 text-[16px] font-bold text-slate-900 dark:text-white">{activePage.title}</h4>
                <div className="mt-3 space-y-3">
                  {activePage.paragraphs?.map((p, i) => <p key={i} className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{p}</p>)}
                </div>
                {activePage.bullets?.length > 0 && (
                  <ul className="mt-3 space-y-1.5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
                    {activePage.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-300">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />{b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : <p className="py-8 text-center text-xs text-slate-400">No content matches your search.</p>}

            {/* analysis */}
            {!analysis ? (
              <Button variant="outline" onClick={async () => {
                const res = await analyze.mutateAsync(source.sourceId)
                setAnalysis(res.analysis)
                toast.success('Analysis complete', 'Prototype Content Intelligence — deterministic analysis of the demo source.')
              }}>
                <Wand2 className="h-4 w-4" /> Analyze Source
              </Button>
            ) : <SourceAnalysisPanel analysis={analysis} />}

            {onUse && (
              <Button className="w-full" onClick={() => { onUse(source); onOpenChange(false) }}>
                <Sparkles className="h-4 w-4" /> Use this source in the Studio
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function SourceLibraryTab({ onUseSource }) {
  const [params, setParams] = useState({})
  const { data, isLoading, isError, refetch } = useQuestionStudioSources(params)
  const [previewId, setPreviewId] = useState(null)

  const filters = useMemo(() => [
    { key: 'search', placeholder: 'Search sources…' },
  ], [])

  if (isLoading) return <DashboardSkeleton cards={6} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const set = (k, v) => setParams((p) => ({ ...p, [k]: v === 'All' ? undefined : v }))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Input value={params.search ?? ''} onChange={(e) => set('search', e.target.value)} placeholder="Search sources…" className="h-9 w-56 pl-8 text-xs" />
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
        <Select value={params.domain ?? 'All'} onValueChange={(v) => set('domain', v)}>
          <SelectItem value="All">All domains</SelectItem><SelectItem value="University">University</SelectItem><SelectItem value="Competitive">Competitive</SelectItem>
        </Select>
        <Select 
          value={params.exam ?? 'All'} 
          onValueChange={(v) => set('exam', v)} 
          disabled={!params.domain || params.domain === 'All' || params.domain === 'University'}
          helper={!params.domain || params.domain === 'All' || params.domain === 'University' ? 'Select Competitive domain first' : undefined}
        >
          <SelectItem value="All">All exams</SelectItem><SelectItem value="JEE Main">JEE Main</SelectItem><SelectItem value="NEET UG">NEET UG</SelectItem><SelectItem value="JEE Main + NEET UG">JEE + NEET</SelectItem>
        </Select>
        <Select 
          value={params.subject ?? 'All'} 
          onValueChange={(v) => set('subject', v)} 
          disabled={!params.domain || params.domain === 'All'}
          helper={!params.domain || params.domain === 'All' ? 'Select a domain first' : undefined}
        >
          <SelectItem value="All">All subjects</SelectItem>
          {['Biology', 'Physics', 'Chemistry', 'Mathematics', 'Data Structures & Algorithms', 'Database Management Systems', 'Operating Systems'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </Select>
        <button onClick={() => set('featured', params.featured === 'true' ? undefined : 'true')}
          className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${params.featured === 'true' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
          ⭐ Featured only
        </button>
        <span className="ml-auto text-[11px] font-semibold text-slate-400">{data?.count ?? 0} of {data?.total ?? 12} sources</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data?.items ?? []).map((s) => (
          <SourceCard key={s.sourceId} source={s} onOpen={() => setPreviewId(s.sourceId)} onAnalyze={() => setPreviewId(s.sourceId)} />
        ))}
      </div>
      {!(data?.items?.length) && (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No sources match these filters</p>
        </div>
      )}

      <SourcePreviewDialog sourceId={previewId} open={!!previewId} onOpenChange={(v) => !v && setPreviewId(null)} onUse={onUseSource} />
    </div>
  )
}

export default SourceLibraryTab
