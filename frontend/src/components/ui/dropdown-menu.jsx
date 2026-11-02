import { createContext, forwardRef, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAnchoredDropdown } from '@/hooks/use-anchored-dropdown'

/**
 * EduX canonical action menu / popover (primitive).
 *
 * Shares the SAME anchored-dropdown architecture as Select (one positioning
 * implementation, `useAnchoredDropdown`):
 *
 *   - portaled to `document.body` (or the nearest `data-portal-scope`
 *     dialog/sheet) — never clipped by overflow/transform/filter parents,
 *     never trapped behind cards, sidebars or modal overlays;
 *   - viewport-aware down/up placement + horizontal collision + bounded
 *     height, with scroll/resize repositioning and scroll-out-of-view close;
 *   - outside click closes (trigger + menu contents are safe targets);
 *     Escape closes and returns focus to the trigger;
 *   - ArrowUp/ArrowDown + Home/End navigate items, visible focus;
 *   - `group` (optional): only one menu per group stays open.
 *
 * This primitive is for MENUS (profile, actions, row actions). Selection
 * dropdowns use `<Select>`; cascading filter STATE stays feature-specific
 * (src/utils/filter-cascade.js).
 */

const DropdownContext = createContext(null)

const DropdownMenu = forwardRef(function DropdownMenu({ open, onOpenChange, children, group = null }, ref) {
  const [internal, setInternal] = useState(false)
  const isOpen = open ?? internal
  const setOpen = (v) => {
    setInternal(v)
    onOpenChange?.(v)
  }
  const { triggerRef, menuRef, styles, container, zIndex, closeMenu } = useAnchoredDropdown({
    open: isOpen,
    onClose: () => {
      if (isOpen) setOpen(false)
    },
    align: 'start',
    group,
  })

  return (
    <DropdownContext.Provider value={{ isOpen, setOpen, triggerRef, menuRef, styles, container, zIndex, closeMenu }}>
      <div ref={ref} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownContext.Provider>
  )
})

const DropdownMenuTrigger = forwardRef(function DropdownMenuTrigger({ className, children, ...props }, ref) {
  const { setOpen, isOpen, triggerRef } = useContext(DropdownContext)
  return (
    <button
      ref={(node) => {
        triggerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      className={cn(className)}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      onClick={() => setOpen(!isOpen)}
      {...props}
    >
      {children}
    </button>
  )
})

function DropdownMenuContent({ className, align = 'start', children, ...props }) {
  const { isOpen, setOpen, menuRef, styles, container, zIndex } = useContext(DropdownContext)
  const listRef = useRef(null)
  /* the portal stays mounted through the exit animation; AnimatePresence
     lives INSIDE the portal (a createPortal as a direct child of
     AnimatePresence breaks presence tracking) */
  const [contentMounted, setContentMounted] = useState(false)

  useEffect(() => {
    if (isOpen) setContentMounted(true)
  }, [isOpen])

  const onMenuKeyDown = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const list = listRef.current
    if (!list) return
    const items = [...list.querySelectorAll('button:not(:disabled)')]
    if (!items.length) return
    event.preventDefault()
    const idx = items.indexOf(document.activeElement)
    const focusAt = (i) => items[Math.max(0, Math.min(i, items.length - 1))]?.focus()
    if (event.key === 'Home') focusAt(0)
    else if (event.key === 'End') focusAt(items.length - 1)
    else if (event.key === 'ArrowDown') focusAt(idx === -1 ? 0 : idx + 1)
    else focusAt(idx === -1 ? items.length - 1 : idx - 1)
  }

  if (!contentMounted || !container) return null
  return createPortal(
    <AnimatePresence onExitComplete={() => setContentMounted(false)}>
      {isOpen && (
        <motion.div
          ref={(node) => {
            menuRef.current = node
            listRef.current = node
          }}
          role="menu"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => setOpen(false)}
          onKeyDown={onMenuKeyDown}
          className={cn(
            'fixed min-w-[12rem] overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-lift backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95',
            className
          )}
          style={{
            zIndex,
            top: styles?.top ?? 'auto',
            bottom: styles?.bottom ?? 'auto',
            left: styles ? styles.left : 'auto',
            width: styles ? styles.width : 'auto',
            maxHeight: styles ? styles.maxHeight : 'none',
            visibility: styles ? 'visible' : 'hidden',
          }}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    container,
  )
}

const DropdownMenuItem = forwardRef(function DropdownMenuItem({ className, icon: Icon, checked, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300',
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
      <span className="flex-1 text-left">{children}</span>
      {checked && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
    </button>
  )
})

const DropdownMenuLabel = forwardRef(function DropdownMenuLabel({ className, ...props }, ref) {
  return <div ref={ref} className={cn('px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500', className)} {...props} />
})

const DropdownMenuSeparator = forwardRef(function DropdownMenuSeparator({ className, ...props }, ref) {
  return <div ref={ref} className={cn('my-1.5 h-px bg-slate-200/80 dark:bg-slate-800', className)} {...props} />
})

const DropdownMenuGroup = forwardRef(function DropdownMenuGroup({ className, ...props }, ref) {
  return <div ref={ref} className={cn('flex flex-col gap-0.5', className)} {...props} />
})

export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup,
}
export default DropdownMenu
