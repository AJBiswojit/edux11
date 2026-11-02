import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

const Table = forwardRef(function Table({ className, ...props }, ref) {
  return (
    <div className="w-full overflow-auto scrollbar-thin">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
})

const TableHeader = forwardRef(function TableHeader({ className, ...props }, ref) {
  return <thead ref={ref} className={cn('[&_tr]:border-b [&_tr]:border-slate-200/70 dark:[&_tr]:border-slate-800', className)} {...props} />
})

const TableBody = forwardRef(function TableBody({ className, ...props }, ref) {
  return <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
})

const TableRow = forwardRef(function TableRow({ className, hover = true, ...props }, ref) {
  return (
    <tr
      ref={ref}
      className={cn(
        'border-b border-slate-100 transition-colors dark:border-slate-800/80',
        hover && 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40',
        className
      )}
      {...props}
    />
  )
})

const TableHead = forwardRef(function TableHead({ className, ...props }, ref) {
  return (
    <th
      ref={ref}
      className={cn(
        'h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500',
        className
      )}
      {...props}
    />
  )
})

const TableCell = forwardRef(function TableCell({ className, ...props }, ref) {
  return <td ref={ref} className={cn('px-4 py-3.5 align-middle text-slate-700 dark:text-slate-200', className)} {...props} />
})

const TableCaption = forwardRef(function TableCaption({ className, ...props }, ref) {
  return <caption ref={ref} className={cn('mt-4 text-sm text-slate-500 dark:text-slate-400', className)} {...props} />
})

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption }
export default Table
