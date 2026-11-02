import { useState } from 'react'
import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import { ArrowRight, BellOff, CheckCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useParentNotifications } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, useToast } from '@/components/ui'
import { formatRelative } from '@/utils/format'

function Notifications() {
  const { data, isLoading, isError, refetch } = useParentNotifications()
  const [tab, setTab] = useState('all')
  const [local, setLocal] = useState(null)
  const toast = useToast()
  const items = (local ?? data?.items ?? []).filter((n) => tab === 'all' || (tab === 'unread' ? n.unread : !n.unread))

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Communication · Notifications"
        title="Notifications"
        description="Academics, exams, fees and wellbeing — only what matters, always in plain language."
        breadcrumbs={[{ label: 'Parent' }, { label: 'Notifications' }]}
        actions={
          <Button variant="outline" size="sm" onClick={() => { setLocal((data?.items ?? []).map((n) => ({ ...n, unread: false }))); toast.success('All caught up ✓') }}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        }
      />

      <div className="mb-5 flex gap-2">
        {[['all', 'All'], ['unread', 'Unread'], ['read', 'Read']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${tab === id ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
            {label}
          </button>
        ))}
      </div>

      <Card className="p-3">
        {items.length === 0 && (
          <div className="flex flex-col items-center py-14 text-center">
            <BellOff className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">Nothing here</p>
            <p className="text-xs text-slate-400">You're all caught up!</p>
          </div>
        )}
        <div className="space-y-1">
          {items.map((n, i) => {
            const Icon = Icons[n.icon] ?? Icons.Bell
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-start gap-4 rounded-2xl p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${n.unread ? 'bg-indigo-50/40 dark:bg-indigo-500/5' : ''}`}
              >
                <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${n.unread ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <p className="text-[14px] font-bold text-slate-800 dark:text-slate-100">{n.title}</p>
                    {n.unread && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                  </div>
                  <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{n.text}</p>
                  <div className="mt-1 flex items-center gap-2.5">
                    <p className="text-[11px] font-medium text-slate-400">{formatRelative(n.time)}</p>
                    <Badge variant="secondary" size="sm">{n.category}</Badge>
                  </div>
                </div>
                <Link to="/parent/dashboard" className="mt-1 shrink-0">
                  <Button variant="ghost" size="sm"><ArrowRight className="h-3.5 w-3.5" /></Button>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

export { Notifications }
export default Notifications
