import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

const Switch = forwardRef(function Switch({ className, checked, onCheckedChange, disabled, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-gradient-to-r from-indigo-600 to-blue-600' : 'bg-slate-200 dark:bg-slate-700',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-spring',
          checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
        )}
      />
    </button>
  )
})

const Checkbox = forwardRef(function Checkbox({ className, checked, onCheckedChange, disabled, label, ...props }, ref) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2.5', disabled && 'cursor-not-allowed opacity-60', className)}>
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50',
          checked
            ? 'border-transparent bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-500/30'
            : 'border-slate-300 bg-white hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-900'
        )}
        {...props}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
            <path d="M2 6.5 5 9.5 10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
    </label>
  )
})

export { Switch, Checkbox }
export default Switch
