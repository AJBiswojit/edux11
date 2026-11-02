import { createContext, forwardRef, useContext, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useFocusTrap } from '@/hooks/use-focus-trap'

const DialogContext = createContext(null)

const Dialog = forwardRef(function Dialog({ open, onOpenChange, children, ...props }, ref) {
  const [internal, setInternal] = useState(open)
  const [titleId, setTitleId] = useState(null)
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
  return (
    <DialogContext.Provider value={{ isOpen, setOpen, titleId, setTitleId }}>
      <div ref={ref} {...props}>
        {children}
      </div>
    </DialogContext.Provider>
  )
})

const DialogTrigger = forwardRef(function DialogTrigger({ className, children, ...props }, ref) {
  const { setOpen } = useContext(DialogContext)
  return (
    <button ref={ref} className={cn(className)} onClick={() => setOpen(true)} {...props}>
      {children}
    </button>
  )
})

function DialogContent({ className, children, hideClose = false, ...props }) {
  const { isOpen, setOpen, titleId } = useContext(DialogContext)
  const panelRef = useFocusTrap(isOpen)
  if (typeof document === 'undefined') return null
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        /* data-portal-scope: dropdowns opened inside this dialog portal into
           this fixed container (no transform here), so they stack above the
           dialog content while staying under toasts/command palette. */
        <div data-portal-scope className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="presentation">
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
            aria-labelledby={titleId ?? undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: 'spring', bounce: 0.22, duration: 0.45 }}
            className={cn(
              'relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-lift focus:outline-none dark:border-slate-800 dark:bg-slate-900',
              'max-h-[88vh] overflow-y-auto scrollbar-thin',
              className
            )}
            {...props}
          >
            {!hideClose && (
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

const DialogHeader = forwardRef(function DialogHeader({ className, ...props }, ref) {
  return <div ref={ref} className={cn('mb-4 flex flex-col gap-1.5 pr-8', className)} {...props} />
})

const DialogTitle = forwardRef(function DialogTitle({ className, ...props }, ref) {
  const { setTitleId } = useContext(DialogContext)
  const generatedId = useId()
  const id = props.id ?? generatedId
  useEffect(() => {
    setTitleId(id)
    return () => setTitleId(null)
  }, [id, setTitleId])
  return <h2 ref={ref} id={id} className={cn('text-xl font-semibold tracking-tight', className)} {...props} />
})

const DialogDescription = forwardRef(function DialogDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn('text-sm text-slate-500 dark:text-slate-400', className)} {...props} />
})

const DialogFooter = forwardRef(function DialogFooter({ className, ...props }, ref) {
  return <div ref={ref} className={cn('mt-6 flex justify-end gap-2', className)} {...props} />
})

const DialogClose = forwardRef(function DialogClose({ className, children, ...props }, ref) {
  const { setOpen } = useContext(DialogContext)
  return (
    <button ref={ref} className={cn(className)} onClick={() => setOpen(false)} {...props}>
      {children}
    </button>
  )
})

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose }
export default Dialog
