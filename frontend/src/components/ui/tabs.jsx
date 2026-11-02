import { createContext, forwardRef, useContext, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/utils/cn'

const TabsContext = createContext(null)

const Tabs = forwardRef(function Tabs({ defaultValue, value, onValueChange, className, children, ...props }, ref) {
  const [internal, setInternal] = useState(defaultValue)
  const active = value ?? internal
  const setActive = (v) => {
    setInternal(v)
    onValueChange?.(v)
  }
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
})

const TabsList = forwardRef(function TabsList({ className, children, ...props }, ref) {
  return (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

const TabsTrigger = forwardRef(function TabsTrigger({ className, value, children, ...props }, ref) {
  const { active, setActive } = useContext(TabsContext)
  const selected = active === value
  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={selected}
      onClick={() => setActive(value)}
      className={cn(
        'relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors',
        selected
          ? 'text-indigo-700 dark:text-indigo-300'
          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
        className
      )}
      {...props}
    >
      {selected && (
        <motion.span
          layoutId={`tab-pill-${value?.split('/')[0]}`}
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-600/10 to-blue-600/10 ring-1 ring-indigo-500/25 dark:from-indigo-400/15 dark:to-blue-400/15 dark:ring-indigo-400/30"
          transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </button>
  )
})

const TabsContent = forwardRef(function TabsContent({ className, value, children, ...props }, ref) {
  const { active } = useContext(TabsContext)
  if (active !== value) return null
  return (
    <AnimatePresence mode="wait">
      <motion.div
        ref={ref}
        role="tabpanel"
        key={value}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={cn('mt-4', className)}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
})

export { Tabs, TabsList, TabsTrigger, TabsContent }
export default Tabs
