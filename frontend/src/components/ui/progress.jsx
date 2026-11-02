import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

const Progress = forwardRef(function Progress({ className, value = 0, gradient = 'from-indigo-500 to-blue-500', showLabel = false, ...props }, ref) {
  const clamped = Math.min(Math.max(value, 0), 100)
  return (
    <div ref={ref} className={cn('relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800', className)} {...props}>
      <div
        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-spring', gradient)}
        style={{ width: `${clamped}%` }}
      />
      {showLabel && (
        <span className="absolute -top-5 right-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          {clamped}%
        </span>
      )}
    </div>
  )
})

export { Progress }
export default Progress
