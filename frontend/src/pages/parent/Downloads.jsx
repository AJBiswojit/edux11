import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, FileArchive, FileText, FolderDown, Search } from 'lucide-react'
import { useParentDownloads } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Input, useToast } from '@/components/ui'

const CATEGORY_COLORS = { Reports: '#6366f1', Certificates: '#10b981', Finance: '#f59e0b', Exams: '#ef4444', Records: '#14b8a6' }

function Downloads() {
  const { data, isLoading, isError, refetch } = useParentDownloads()
  const [query, setQuery] = useState('')
  const toast = useToast()
  const items = (data?.items ?? []).filter((d) => d.name.toLowerCase().includes(query.toLowerCase()) || d.category.toLowerCase().includes(query.toLowerCase()))

  const totalSize = useMemo(() => items.reduce((a, d) => a + parseFloat(d.size.replace(' MB', '').replace(' KB', '') / 1000), 0), [items])

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Ward Progress · Downloads"
        title="Downloads & documents"
        description="Reports, certificates, receipts and admit cards — every official document in one archive."
        breadcrumbs={[{ label: 'Parent' }, { label: 'Downloads' }]}
        actions={
          <Button variant="outline" size="sm" onClick={() => toast.success('Archiving…', 'All documents will be bundled into one ZIP.')}>
            <FileArchive className="h-4 w-4" /> Download all
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents…" className="h-10 w-64 pl-10 text-sm" />
        </div>
        <Badge variant="secondary" className="px-3 py-1"><FolderDown className="h-3 w-3" /> {items.length} documents · ~{totalSize.toFixed(1)} MB</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="group flex items-center gap-4 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${CATEGORY_COLORS[d.category] ?? '#6366f1'}, ${CATEGORY_COLORS[d.category] ?? '#6366f1'}aa)` }}>
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{d.name}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-slate-400">
                  <Badge variant="secondary" size="sm">{d.category}</Badge>
                  <span>{d.type} · {d.size}</span>
                  <span>· {d.date}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.success('Downloading…', `${d.name}.${d.type.toLowerCase()} saved.`)}>
                <Download className="h-3.5 w-3.5" /> PDF
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export { Downloads }
export default Downloads
