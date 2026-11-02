import { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import { Slot } from './slot'

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none'

export const buttonVariants = {
  variants: {
    variant: {
      default:
        'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 bg-[length:200%_100%] bg-left hover:bg-right text-white shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35',
      primary:
        'bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 bg-[length:200%_100%] bg-left hover:bg-right text-white shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35',
      secondary:
        'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700',
      outline:
        'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300',
      ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
      destructive: 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/25 hover:from-rose-500 hover:to-red-500',
      success: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500',
      glass: 'glass text-slate-800 hover:bg-white/90 dark:text-slate-100 dark:hover:bg-slate-800/80 shadow-soft',
      link: 'text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400',
      gradientBorder:
        'relative bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100 shadow-soft hover:shadow-lift',
    },
    size: {
      default: 'h-10 px-5',
      sm: 'h-8 rounded-lg px-3 text-xs',
      lg: 'h-12 rounded-2xl px-8 text-base',
      xl: 'h-14 rounded-2xl px-10 text-base',
      icon: 'h-10 w-10',
      'icon-sm': 'h-8 w-8 rounded-lg',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
}

function variantClass({ variant = 'default', size = 'default' }) {
  return cn(base, buttonVariants.variants.variant[variant], buttonVariants.variants.size[size])
}

const Button = forwardRef(function Button({ className, variant, size, asChild = false, ...props }, ref) {
  const cls = cn(variantClass({ variant, size }), className)
  if (asChild) {
    return (
      <Slot ref={ref} className={cls} {...props}>
        {props.children}
      </Slot>
    )
  }
  return <button ref={ref} className={cls} {...props} />
})

export { Button }
export default Button
