import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export const badgeVariants = {
  variants: {
    variant: {
      default: 'bg-indigo-50 text-indigo-700 ring-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30',
      secondary: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
      success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
      warning: 'bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
      danger: 'bg-rose-50 text-rose-700 ring-rose-200/60 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30',
      info: 'bg-sky-50 text-sky-700 ring-sky-200/60 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30',
      outline: 'text-slate-600 ring-slate-300 dark:text-slate-300 dark:ring-slate-600',
      gradient: 'bg-gradient-to-r from-indigo-600 to-teal-500 text-white ring-transparent shadow-sm shadow-indigo-500/30',
    },
    size: { default: 'px-2.5 py-0.5 text-xs', sm: 'px-2 py-0 text-[10px]', lg: 'px-3.5 py-1 text-sm' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
}

function variantClass({ variant = 'default', size = 'default' }) {
  return cn(
    'inline-flex items-center gap-1 rounded-full font-medium ring-1 ring-inset whitespace-nowrap',
    badgeVariants.variants.variant[variant],
    badgeVariants.variants.size[size]
  )
}

const Badge = forwardRef(function Badge({ className, variant, size, ...props }, ref) {
  return <span ref={ref} className={cn(variantClass({ variant, size }), className)} {...props} />
})

export { Badge }
export default Badge
