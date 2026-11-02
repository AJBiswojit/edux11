import { createContext, forwardRef, useContext, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/utils/cn'

const AccordionContext = createContext(null)

function Accordion({ type = 'single', defaultValue, value, onValueChange, className, children }) {
  const [internal, setInternal] = useState(type === 'single' ? (defaultValue ?? null) : (defaultValue ?? []))
  const current = value ?? internal
  const set = (v) => {
    setInternal(v)
    onValueChange?.(v)
  }
  const toggle = (item) => {
    if (type === 'single') set(current === item ? null : item)
    else set(current.includes(item) ? current.filter((i) => i !== item) : [...current, item])
  }
  return (
    <AccordionContext.Provider value={{ type, current, toggle }}>
      <div className={cn('space-y-3', className)}>{children}</div>
    </AccordionContext.Provider>
  )
}

const AccordionItem = forwardRef(function AccordionItem({ value, className, children }, ref) {
  const { current, type } = useContext(AccordionContext)
  const open = type === 'single' ? current === value : current.includes(value)
  return (
    <div
      ref={ref}
      className={cn(
        'overflow-hidden rounded-2xl border transition-all duration-300',
        open
          ? 'border-indigo-200/70 bg-white shadow-card dark:border-indigo-500/30 dark:bg-slate-900'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700',
        className
      )}
    >
      {children}
    </div>
  )
})

const AccordionTrigger = forwardRef(function AccordionTrigger({ className, children, ...props }, ref) {
  const { current, type, toggle } = useContext(AccordionContext)
  const value = props.value
  const open = type === 'single' ? current === value : current.includes(value)
  return (
    <button
      ref={ref}
      onClick={() => toggle(value)}
      aria-expanded={open}
      className={cn(
        'flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-800 transition-colors hover:text-indigo-700 dark:text-slate-100 dark:hover:text-indigo-300',
        className
      )}
    >
      {children}
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-300 dark:bg-slate-800 dark:text-slate-400',
          open && 'rotate-180 bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'
        )}
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </span>
    </button>
  )
})

const AccordionContent = forwardRef(function AccordionContent({ className, children, ...props }, ref) {
  const { current, type } = useContext(AccordionContext)
  const value = props.value
  const open = type === 'single' ? current === value : current.includes(value)
  if (!open) return null
  return (
    <motion.div
      ref={ref}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={cn('px-5 pb-5 pt-0 text-sm leading-relaxed text-slate-600 dark:text-slate-300', className)}>
        {children}
      </div>
    </motion.div>
  )
})

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
export default Accordion
