import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, CheckCircle2, Eye, Heart, MessageCircle, MessageSquarePlus, Pin, Search } from 'lucide-react'
import { useForum } from '@/services/extra'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Avatar, Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Textarea, useToast } from '@/components/ui'
import { formatRelative } from '@/utils/format'

function Forum() {
  const { data, isLoading, isError, refetch } = useForum()
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [openTopic, setOpenTopic] = useState(null)
  const [newOpen, setNewOpen] = useState(false)
  const [localTopics, setLocalTopics] = useState(null)
  const toast = useToast()

  const topics = localTopics ?? data?.topics ?? []
  const categories = data?.categories ?? []

  const filtered = useMemo(() => topics.filter((t) => {
    const q = query.toLowerCase()
    const matchesQ = !q || t.title.toLowerCase().includes(q) || t.snippet.toLowerCase().includes(q)
    const matchesC = category === 'All' || t.forum === category
    return matchesQ && matchesC
  }).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)), [topics, query, category])

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const like = () => {
    toast.error('Forum unavailable', 'Likes cannot be saved yet.')
  }

  const postTopic = () => {
    toast.error('Forum unavailable', 'Discussion posts cannot be saved yet.')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Communication · Discussion Forum"
        title="Discussion forum"
        description="Ask doubts, share notes and coordinate with classmates — faculty moderators watch every board."
        breadcrumbs={[{ label: 'Student' }, { label: 'Forum' }]}
        actions={
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <MessageSquarePlus className="h-4 w-4" /> New discussion
          </Button>
        }
      />

      {/* Category chips */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <button onClick={() => setCategory('All')} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${category === 'All' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
          All boards
        </button>
        {categories.slice(0, 6).map((c) => (
          <button key={c.id} onClick={() => setCategory(c.name)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${category === c.name ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
            {c.name} <span className="opacity-60">({c.topics})</span>
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search discussions…" className="h-10 w-60 pl-10 text-sm" />
        </div>
      </div>

      {filtered.length === 0 && (
        <EmptyState title="No discussions yet" description="The campus forum is empty. Posting is not available yet." />
      )}
      <div className="space-y-3">
        {filtered.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="group cursor-pointer p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift" onClick={() => setOpenTopic(t)}>
              <div className="flex items-start gap-4">
                <Avatar name={t.author} size="sm" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.solved && <Badge variant="success" size="sm"><CheckCircle2 className="h-3 w-3" /> Solved</Badge>}
                    {t.title.toLowerCase().includes('papers') || t.title.toLowerCase().includes('notes') ? <Badge variant="info" size="sm"><Pin className="h-3 w-3" /> Pinned</Badge> : null}
                    <Badge variant="secondary" size="sm">{t.forum}</Badge>
                  </div>
                  <h3 className="mt-1.5 text-[15px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300">
                    {t.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-[12.5px] text-slate-500 dark:text-slate-400">{t.snippet}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[11px] font-medium text-slate-400">
                    <span>{t.author}</span>
                    <span>· {formatRelative(t.lastActivity)}</span>
                    {t.tags.map((tag) => <Badge key={tag} variant="outline" size="sm">#{tag}</Badge>)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-[11px] font-bold text-slate-400">
                  <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {t.replies}</span>
                  <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {t.views}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); like(t.id) }}
                    className="flex items-center gap-1 transition-colors hover:text-rose-500"
                    aria-label="Like topic"
                  >
                    <Heart className={`h-3.5 w-3.5 ${t.likes > 0 ? 'fill-rose-400 text-rose-400' : ''}`} /> {t.likes}
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Topic detail */}
      <Dialog open={!!openTopic} onOpenChange={(v) => !v && setOpenTopic(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" size="sm">{openTopic?.forum}</Badge>
              {openTopic?.solved && <Badge variant="success" size="sm">Solved</Badge>}
            </div>
            <DialogTitle>{openTopic?.title}</DialogTitle>
            <DialogDescription>
              By {openTopic?.author} · {openTopic?.replies} replies · {openTopic?.views} views
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 text-[13.5px] leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              {openTopic?.snippet}
              <p className="mt-3 text-[11px] font-semibold text-slate-400">This is a preview of the discussion thread. Replies and the full conversation appear in the complete thread view.</p>
            </div>
            {(openTopic?.repliesList ?? []).map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <Avatar name={r.name} size="sm" />
                <div className="flex-1 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                  <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{r.name} <span className="font-medium text-slate-400">· {r.when}</span></p>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{r.text}</p>
                </div>
              </div>
            ))}
            <Field label="Add a reply">
              <Textarea rows={2} placeholder="Share your thoughts…" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTopic(null)}>Close</Button>
            <Button onClick={() => { toast.error('Forum unavailable', 'Replies cannot be saved yet.') }}>
              <ArrowUpRight className="h-4 w-4" /> Post reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New topic */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a discussion</DialogTitle>
            <DialogDescription>Be specific, add tags, and mention the course board so peers can find it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Title" required>
              <Input placeholder="e.g. Doubt: time complexity of union-find with path compression" />
            </Field>
            <Field label="Course board">
              <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                {categories.map((c) => <option key={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Details" required>
              <Textarea rows={4} placeholder="Describe your question or share your resource…" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
            <Button onClick={postTopic}><MessageSquarePlus className="h-4 w-4" /> Post discussion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Forum }
export default Forum
