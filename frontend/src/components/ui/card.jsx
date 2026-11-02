import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

const Card = forwardRef(function Card({ className, hover = false, glass = false, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-3xl bg-white shadow-card ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10',
        glass && 'glass',
        hover && 'card-hover',
        className
      )}
      {...props}
    />
  )
})

const CardHeader = forwardRef(function CardHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn('flex flex-col gap-1.5 p-6 pb-2', className)} {...props} />
})

const CardTitle = forwardRef(function CardTitle({ className, ...props }, ref) {
  return <h3 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
})

const CardDescription = forwardRef(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn('text-sm text-slate-500 dark:text-slate-400', className)} {...props} />
})

const CardContent = forwardRef(function CardContent({ className, ...props }, ref) {
  return <div ref={ref} className={cn('p-6 pt-2', className)} {...props} />
})

const CardFooter = forwardRef(function CardFooter({ className, ...props }, ref) {
  return <div ref={ref} className={cn('flex items-center p-6 pt-2', className)} {...props} />
})

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
export default Card
