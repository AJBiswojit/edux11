/**
 * MediXO EduX — AI Teaching Studio · Tab 5: Teaching Resources.
 * Centralized repository — personal & department resources, question banks,
 * PYQs, slides, books, templates, previous papers — with search, category &
 * tag filters, favorites, preview and mock download.
 */

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Eye, Heart, Search } from 'lucide-react'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, useToast } from '@/components/ui'
import { ReportTypeIcon } from '@/components/reports-workspace/report-parts'

function ResourcesTab({ data }) {
  const resources = data.derived.aiStudio?.resources ?? []
  const recent = data.derived.aiStudio?.recentUploads ?? []
  const [filter, setFilter] = useState('All')
  const [tag, setTag] = useState('All')
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState(resources.filter((r) => r.favorite).map((r) => r.id))
  const [previewing, setPreviewing] = useState(null)
  const toast = useToast()

  const categories = ['All', ...new Set(resources.map((r) => r.category))]
  const tags = ['All', ...new Set(resources.flatMap((r) => r.tags ?? []))]

  const filtered = useMemo(() => {
    let rows = resources
    if (filter === 'Favorites') rows = rows.filter((r) => favorites.includes(r.id))
    else if (filter !== 'All') rows = rows.filter((r) => r.category === filter)
    if (tag !== 'All') rows = rows.filter((r) => (r.tags ?? []).includes(tag))
    if (query) {
      const q = query.toLowerCase()
      rows = rows.filter((r) => r.title.toLowerCase().includes(q) || (r.course ?? '').toLowerCase().includes(q))
    }
    return rows
  }, [resources, filter, tag, query, favorites])

  const toggleFavorite = (id) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
    toast.success(favorites.includes(id) ? 'Removed from favorites' : 'Added to favorites ❤️', 'Your resource library was updated.')
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {['All', ...categories.slice(1), 'Favorites'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${filter === f ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}
          >
            {f}
            <span className="ml-1 opacity-60">{f === 'All' ? resources.length : f === 'Favorites' ? favorites.length : resources.filter((r) => r.category === f).length}</span>
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources…"
            className="h-9 w-52 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tags</span>
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold transition-all ${tag === t ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="group h-full p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                    <ReportTypeIcon format={r.type === 'Video' ? 'PDF' : r.type === 'PPTX' ? 'PDF' : r.type === 'Notes' ? 'PDF' : r.type} />
                  </span>
                  <div className="min-w-0">
                    <Badge variant="secondary" size="sm">{r.category}</Badge>
                    <p className="mt-1 truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{r.title}</p>
                  </div>
                </div>
                <button onClick={() => toggleFavorite(r.id)} className="shrink-0 text-slate-300 transition-colors hover:text-rose-500 dark:text-slate-600" aria-label="Favorite">
                  <Heart className={`h-4 w-4 ${favorites.includes(r.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {(r.tags ?? []).map((t) => <Badge key={t} variant="outline" size="sm">{t}</Badge>)}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-medium text-slate-400">
                <span>{r.type} · {r.size}</span>
                <span>· {r.course}</span>
                <span>· {r.source}</span>
              </div>
              <div className="mt-3.5 flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => setPreviewing(r)}><Eye className="h-3.5 w-3.5" /> Preview</Button>
                <Button size="sm" variant="outline" onClick={() => toast.success('Downloading…', `${r.title} (${r.size}) is being prepared.`)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="mt-4 p-12 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No resources match</p>
          <p className="mt-1 text-xs text-slate-400">Try a different category, tag or search term.</p>
        </Card>
      )}

      {/* Recent uploads */}
      <div className="mt-8">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Recent uploads</p>
        <div className="flex flex-wrap gap-2">
          {recent.map((u) => (
            <Badge key={u.id} variant="outline" size="sm" className="gap-1.5 py-1.5">
              <ReportTypeIcon format={u.type === 'Video' ? 'PDF' : u.type} className="h-3 w-3" /> {u.title} <span className="text-slate-400">· {u.uploaded}</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewing?.title}</DialogTitle>
            <DialogDescription>{previewing?.category} · {previewing?.type} · {previewing?.course} · uploaded {previewing?.uploaded} · {previewing?.size}</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-slate-100 p-6 text-center dark:border-slate-800">
            <ReportTypeIcon format={previewing?.type === 'Video' ? 'PDF' : previewing?.type} className="mx-auto h-10 w-10 text-indigo-400" />
            <p className="mt-3 text-[12.5px] font-semibold text-slate-500 dark:text-slate-400">
              {previewing?.type === 'Video' ? 'Video preview available in the MediXO player.' : `Document preview — ${previewing?.type} · ${previewing?.size}`}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {(previewing?.tags ?? []).map((t) => <Badge key={t} variant="outline" size="sm">{t}</Badge>)}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => toast.success('Downloading…', `${previewing?.title} is being prepared.`)}><Download className="h-4 w-4" /> Download</Button>
            <Button onClick={() => setPreviewing(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { ResourcesTab }
export default ResourcesTab
