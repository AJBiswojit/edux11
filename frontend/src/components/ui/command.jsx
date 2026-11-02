import { createContext, forwardRef, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Search } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useFocusTrap } from '@/hooks/use-focus-trap'

const CommandContext = createContext(null)

function Command({ open, onOpenChange, children, className, ...props }) {
  const [internal, setInternal] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const isOpen = open ?? internal
  const setOpen = (v) => {
    setInternal(v)
    onOpenChange?.(v)
  }

  useEffect(() => {
    if (!isOpen) return undefined
    setTimeout(() => inputRef.current?.focus(), 60)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  return (
    <CommandContext.Provider value={{ query, setQuery, setOpen, isOpen }}>
      <div className={className} {...props}>
        {children}
      </div>
    </CommandContext.Provider>
  )
}

const CommandInput = forwardRef(function CommandInput({ className, placeholder = 'Search…', ...props }, ref) {
  const { query, setQuery } = useContext(CommandContext)
  return (
    <div className={cn('flex items-center gap-2.5 border-b border-slate-200/70 px-4 dark:border-slate-800', className)}>
      <Search className="h-4 w-4 shrink-0 text-slate-400" />
      <input
        ref={ref}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
        {...props}
      />
    </div>
  )
})

const CommandList = forwardRef(function CommandList({ className, ...props }, ref) {
  return <div ref={ref} className={cn('max-h-[340px] overflow-y-auto scrollbar-thin p-2', className)} {...props} />
})

const CommandEmpty = forwardRef(function CommandEmpty({ className, ...props }, ref) {
  return (
    <div ref={ref} className={cn('px-6 py-8 text-center text-sm text-slate-400', className)} {...props}>
      No results found.
    </div>
  )
})

const CommandGroup = forwardRef(function CommandGroup({ title, className, children, ...props }, ref) {
  return (
    <div ref={ref} className={cn('mb-1.5', className)} {...props}>
      {title && <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{title}</div>}
      <div>{children}</div>
    </div>
  )
})

const CommandItem = forwardRef(function CommandItem({ className, onSelect, children, shortcut, ...props }, ref) {
  const { setOpen } = useContext(CommandContext)
  return (
    <button
      ref={ref}
      onClick={(e) => {
        onSelect?.(e)
        setOpen(false)
      }}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300',
        className
      )}
      {...props}
    >
      {children}
      {shortcut && (
        <kbd className="ml-auto flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
          <CornerDownLeft className="h-2.5 w-2.5" />
          {shortcut}
        </kbd>
      )}
    </button>
  )
})

function CommandDialog({ open, onOpenChange, children, className }) {
  const panelRef = useFocusTrap(open)
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <div data-portal-scope className="fixed inset-0 z-[110] flex items-start justify-center px-4 pt-[16vh]" role="presentation">
          <motion.div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange?.(false)}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            tabIndex={-1}
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            className={cn(
              'relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-lift focus:outline-none backdrop-blur-2xl dark:border-slate-700 dark:bg-slate-900/95',
              className
            )}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem }
export default Command
