/**
 * Faculty — AI Question Studio (Phase 7).
 * "Turn learning content into structured, exam-ready questions."
 * Tabs: Studio (workflow) · Source Library · Upload · Sessions.
 * Metrics are derived from the studio datasets + sessions.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, History, Sparkles, Upload, Wand2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { StatCard } from '@/components/shared/stat-card'
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, Field, Input, Select, SelectItem, Tabs, TabsList, TabsTrigger, TabsContent, useToast } from '@/components/ui'
import { useQuestionStudioSummary, useStudioSessions, useUploadSource } from '@/services/question-studio'
import { SourceLibraryTab } from '@/components/question-studio/source-library'
import { StudioWorkflow } from '@/components/question-studio/studio-workflow'
import { formatDate } from '@/utils/format'

function UploadDialog({ open, onOpenChange }) {
  const toast = useToast()
  const upload = useUploadSource()
  const [name, setName] = useState('')
  const [type, setType] = useState('PDF')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Upload a source (simulated)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="File name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. kinetics_notes.pdf" /></Field>
          <Field label="Format">
            <Select value={type} onValueChange={setType}>
              {['PDF', 'DOCX', 'TXT', 'Image'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </Select>
          </Field>
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
            <Upload className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-[12px] font-semibold text-slate-500">Drop a file or click to browse</p>
            <p className="mt-1 text-[10.5px] text-slate-400">Prototype — files are NOT parsed. The name maps to a curated demo source profile.</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={async () => {
            const res = await upload.mutateAsync({ name: name || 'imported_source', type })
            toast.success('Prototype source imported', `${res.message} Mapped to ${res.source.shortTitle}.`)
            onOpenChange(false)
          }}><Upload className="h-4 w-4" /> Import (demo)</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SessionsTab({ onOpenSession }) {
  const { data, isLoading, isError, refetch } = useStudioSessions()
  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  return (
    <div className="space-y-3">
      {(data?.items ?? []).map((s) => (
        <button key={s.studioSessionId} onClick={() => onOpenSession(s.studioSessionId)}
          className="flex w-full flex-wrap items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25"><History className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-slate-900 dark:text-white">{s.sourceTitle} — {s.generated} Questions</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">Created {formatDate(s.createdAt, 'MMM d, h:mm a')} · {s.approved} approved · {s.rejected} rejected · {s.draft} draft</p>
          </div>
          <Badge variant={s.approved === s.generated && s.generated > 0 ? 'success' : 'warning'} size="sm">{s.status}</Badge>
        </button>
      ))}
      {!(data?.items ?? []).length && (
        <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <History className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No studio sessions yet</p>
          <p className="mt-1 text-xs text-slate-400">Generate questions in the Studio tab and your sessions will appear here.</p>
        </div>
      )}
    </div>
  )
}

function AIQuestionStudio() {
  const { data, isLoading, isError, refetch } = useQuestionStudioSummary()
  const [tab, setTab] = useState('studio')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [openSessionId, setOpenSessionId] = useState(null)
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={4} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const m = data?.metrics ?? {}

  return (
    <div>
      <PageHeader
        eyebrow="Assessment Intelligence · AI Question Studio"
        title="AI Question Studio"
        description="Turn learning content into structured, exam-ready questions — demo sources, prototype content intelligence, review and approval, then straight into the existing Question Bank and Paper Generator."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Assessment Intelligence', to: '/faculty/question-intelligence' }, { label: 'AI Question Studio' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}><Upload className="h-3.5 w-3.5" /> Upload source</Button>
            <Link to="/faculty/question-intelligence?tab=question-intelligence">
              <Button size="sm" variant="outline"><Sparkles className="h-3.5 w-3.5" /> Question Intelligence</Button>
            </Link>
          </div>
        }
      />

      {/* derived metrics */}
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <StatCard index={0} label="Sources" value={String(m.sources ?? 0)} sub="demo library" icon="BookOpen" gradient="from-indigo-500 to-blue-500" />
        <StatCard index={1} label="Questions generated" value={String(m.questionsGenerated ?? 0)} sub="across the library" icon="Wand2" gradient="from-violet-500 to-purple-500" />
        <StatCard index={2} label="Approved" value={String(m.approved ?? 0)} sub={`${m.pendingReview ?? 0} pending review`} icon="CheckCircle2" gradient="from-emerald-500 to-teal-500" />
        <StatCard index={3} label="Rejected" value={String(m.rejected ?? 0)} sub={`${m.questionTypes ?? 0} types · ${m.subjects ?? 0} subjects`} icon="XCircle" gradient="from-rose-500 to-red-500" />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="studio"><Wand2 className="h-3.5 w-3.5" /> Studio</TabsTrigger>
          <TabsTrigger value="library"><BookOpen className="h-3.5 w-3.5" /> Source Library ({m.sources})</TabsTrigger>
          <TabsTrigger value="sessions"><History className="h-3.5 w-3.5" /> Sessions ({m.sessions ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="studio"><StudioWorkflow onOpenSession={setOpenSessionId} /></TabsContent>
        <TabsContent value="library"><SourceLibraryTab onUseSource={() => { setTab('studio'); toast.info('Source selected', 'Open the Studio tab and continue with generation.') }} /></TabsContent>
        <TabsContent value="sessions"><SessionsTab onOpenSession={(id) => { setTab('studio'); toast.info('Session restored', 'Open a previous session to continue reviewing.') }} /></TabsContent>
      </Tabs>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-[11px] font-medium leading-relaxed text-slate-400 dark:bg-slate-800/60">
        <span className="font-bold text-slate-500 dark:text-slate-300">Prototype boundaries:</span> source upload processing, content analysis, question generation and quality scores are all simulated/deterministic ("Prototype Content Intelligence") — no real AI model and no file parsing. Demo sources are original educational content, never extracts from copyrighted textbooks; generated questions are never labelled as PYQs.
      </p>
    </div>
  )
}

export { AIQuestionStudio }
export default AIQuestionStudio
