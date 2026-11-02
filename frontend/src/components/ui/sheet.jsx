import { createContext, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useFocusTrap } from '@/hooks/use-focus-trap'

const SheetContext = createContext(null)

function Sheet({ open, onOpenChange, children }) {
  const [internal, setInternal] = useState(open)
  const isOpen = open ?? internal
  const setOpen = (v) => {
    setInternal(v)
    onOpenChange?.(v)
  }
  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen])
  return <SheetContext.Provider value={{ isOpen, setOpen }}>{children}</SheetContext.Provider>
}

const SheetTrigger = ({ className, children, ...props }) => {
  const { setOpen } = useContext(SheetContext)
  return (
    <button className={className} onClick={() => setOpen(true)} {...props}>
      {children}
    </button>
  )
}

function SheetContent({ className, children, side = 'left', ...props }) {
  const { isOpen, setOpen } = useContext(SheetContext)
  const panelRef = useFocusTrap(isOpen)
  if (typeof document === 'undefined') return null
  const sideClasses = {
    left: 'inset-y-0 left-0',
    right: 'inset-y-0 right-0',
    top: 'inset-x-0 top-0',
    bottom: 'inset-x-0 bottom-0',
  }
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        /* data-portal-scope: see DialogContent — nested dropdowns portal here. */
        <div data-portal-scope className="fixed inset-0 z-[100]" role="presentation">
          <motion.div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation panel"
            tabIndex={-1}
            initial={{ x: side === 'left' ? '-100%' : side === 'right' ? '100%' : 0, y: side === 'top' ? '-100%' : side === 'bottom' ? '100%' : 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: side === 'left' ? '-100%' : side === 'right' ? '100%' : 0, y: side === 'top' ? '-100%' : side === 'bottom' ? '100%' : 0 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
            className={cn(
              'absolute flex w-[88vw] max-w-sm flex-col bg-white shadow-lift focus:outline-none dark:bg-slate-950',
              sideClasses[side],
              className
            )}
            {...props}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

const SheetHeader = ({ className, ...props }) => (
  <div className={cn('flex items-center justify-between border-b border-slate-200/70 px-5 py-4 dark:border-slate-800', className)} {...props} />
)
const SheetTitle = ({ className, ...props }) => <h2 className={cn('text-base font-semibold', className)} {...props} />
const SheetClose = ({ className, ...props }) => {
  const { setOpen } = useContext(SheetContext)
  return (
    <button onClick={() => setOpen(false)} className={cn('rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800', className)} {...props}>
      <X className="h-4 w-4" />
    </button>
  )
}
const SheetBody = ({ className, ...props }) => <div className={cn('flex-1 overflow-y-auto scrollbar-thin p-5', className)} {...props} />

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody }
export default Sheet
