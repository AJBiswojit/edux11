import { cn } from '@/utils/cn'

function Timeline({ items = [], className, dotClass = 'bg-gradient-to-br from-indigo-500 to-blue-500' }) {
  return (
    <ol className={cn('relative ml-2 space-y-6 border-l-2 border-slate-100 pl-6 dark:border-slate-800', className)}>
      {items.map((item, i) => (
        <li key={i} className="relative">
          <span className={cn('absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-900', dotClass, item.dotClass)} />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</span>
            {item.date && <span className="text-xs font-medium text-slate-400">{item.date}</span>}
            {item.badge}
          </div>
          {item.description && (
            <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.description}</p>
          )}
          {item.content}
        </li>
      ))}
    </ol>
  )
}

export { Timeline }
export default Timeline
