import { cn } from '@/utils/cn'
import { formatRelative } from '@/utils/format'
import { Avatar } from '@/components/ui/avatar'

const typeStyles = {
  grade: 'from-indigo-500 to-blue-500',
  deadline: 'from-amber-500 to-orange-500',
  achievement: 'from-emerald-500 to-teal-500',
  message: 'from-sky-500 to-indigo-500',
  event: 'from-fuchsia-500 to-pink-500',
  system: 'from-slate-400 to-slate-500',
  ai: 'from-teal-500 to-emerald-500',
  career: 'from-violet-500 to-purple-500',
}

function ActivityFeed({ items = [], className, empty }) {
  if (!items?.length) {
    return <p className="py-8 text-center text-sm text-slate-400">{empty ?? 'No activity yet.'}</p>
  }
  return (
    <div className={cn('space-y-1', className)}>
      {items.map((item, i) => {
        const dot = item.type ? typeStyles[item.type] ?? 'from-indigo-500 to-blue-500' : 'from-indigo-500 to-blue-500'
        return (
          <div key={item.id ?? i} className="group relative flex gap-3.5 rounded-2xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
            {item.avatar ? (
              <Avatar name={item.avatar.name} src={item.avatar.src} size="sm" className="mt-0.5" />
            ) : (
              <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br ring-4 ring-white dark:ring-slate-900', dot)} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-slate-700 dark:text-slate-200">
                <span className="font-semibold">{item.title ?? item.user}</span>{' '}
                {item.action && <span className="text-slate-500 dark:text-slate-400">{item.action} </span>}
                {item.target && <span className="font-medium text-indigo-600 dark:text-indigo-400">{item.target}</span>}
              </p>
              {item.text && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.text}</p>}
              {item.time && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{formatRelative(item.time)}</p>}
            </div>
            {item.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
          </div>
        )
      })}
    </div>
  )
}

export { ActivityFeed }
export default ActivityFeed
