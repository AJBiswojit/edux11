import {
  Children,
  Fragment,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAnchoredDropdown } from '@/hooks/use-anchored-dropdown'
import { flattenSelectLabel, resolveSelectTriggerLabel, sameSelectValue } from '@/utils/select-option'

/**
 * EduX canonical selection dropdown (primitive).
 *
 * ONE interaction architecture for every selection dropdown in EduX:
 *
 *   - controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`)
 *   - options via `<SelectItem value>label</SelectItem>` children
 *   - placeholder · disabled · loading · clearable · searchable · helper text
 *   - correct selected-value display (never a stale placeholder after a
 *     selection; a value missing from the current options shows itself)
 *   - portal rendering into `document.body` — or the nearest
 *     `data-portal-scope` (dialog/sheet) — so overflow-hidden cards,
 *     transforms, filters and stacking contexts can never clip the menu
 *   - viewport-aware placement (down / up) + horizontal collision via
 *     `computeDropdownPosition`, with a max-height bounded by the available
 *     vertical space (long lists scroll internally; the page never scrolls)
 *   - repositions on scroll/resize and closes when the trigger scrolls fully
 *     out of view (no floating stale menus)
 *   - keyboard: Enter/Space/ArrowUp/ArrowDown open, ArrowUp/Down + Home/End
 *     navigate, Enter selects, Escape closes and returns focus to the
 *     trigger; outside click closes; visible focus throughout
 *   - aria-expanded / aria-haspopup="listbox" / aria-controls, role=listbox
 *     + role=option with aria-selected, disabled options
 *   - `group`: within one filter group only one dropdown stays open —
 *     opening a sibling closes the other (state/dependency logic itself
 *     stays feature-specific — see src/utils/filter-cascade.js)
 *
 * Feature-specific cascading (Domain → Exam Family → Subject → Chapter →
 * Topic, …) is NOT built into this primitive; features declare their
 * dependency graph with useFilterCascade / createFilterCascade.
 */

const SelectContext = createContext(null)

/* ------------------------- option collection ------------------------- */

function isSelectableElement(node) {
  return node != null && typeof node === 'object' && node.type === SelectItem
}

function collectSelectItems(children) {
  const out = []
  const walk = (child) => {
    if (child == null || typeof child === 'boolean') return
    if (Array.isArray(child)) {
      child.forEach(walk)
      return
    }
    if (typeof child !== 'object') return
    if (child.type === SelectItem) {
      out.push(child)
      return
    }
    if (child.type === Fragment && child.props?.children != null) {
      walk(child.props.children)
    }
  }
  Children.toArray(children).forEach(walk)
  return out
}

function itemSearchText(item) {
  const raw = item.props.searchText ?? flattenSelectLabel(item.props.children)
  return String(raw).toLowerCase()
}

/* ------------------------------ Select ------------------------------- */

const Select = forwardRef(function Select(
  {
    value,
    defaultValue,
    onValueChange,
    children,
    className,
    disabled,
    loading,
    placeholder,
    id,
    ariaLabel,
    active = false,
    clearable = false,
    clearValue = '',
    searchable = true,
    emptyText,
    helper,
    group = null,
    // multi-select: `value` is an array, clicking toggles membership and the
    // menu stays open. Single-select behaviour is unchanged when false.
    multiple = false,
    // optional trigger label for the multi-select case when 2+ are selected
    // (e.g. "All subjects"). Falls back to "N selected" when omitted.
    multipleSummary = null,
    // deprecated no-op — portal + collision positioning is now always on
    collision = undefined,
  },
  ref,
) {
  const [internal, setInternal] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  /* the portal stays mounted through the exit animation; AnimatePresence
     lives INSIDE the portal (a createPortal as a direct child of
     AnimatePresence breaks presence tracking) */
  const [menuMounted, setMenuMounted] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)
  const listRef = useRef(null)
  const menuId = useId()
  const current = value ?? internal
  const isDisabled = !!disabled || !!loading

  const { triggerRef, menuRef, styles, container, zIndex, closeMenu } = useAnchoredDropdown({
    open,
    onClose: () => {
      setOpen(false)
      setSearch('')
    },
    align: 'start',
    group,
  })

  const setTriggerRef = useCallback(
    (node) => {
      triggerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  const items = useMemo(() => collectSelectItems(children), [children])
  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!searchable || !query) return items
    return items.filter((item) => itemSearchText(item).includes(query))
  }, [items, search, searchable])

  const selectedValues = multiple ? (Array.isArray(current) ? current : []) : null
  const hasValue = multiple ? selectedValues.length > 0 : current != null && current !== ''
  const currentRef = useRef(current)
  currentRef.current = current
  /* Selected-value contract: flatten option children (including
     `{count} questions` arrays) into the trigger label. Never show
     "Selected option" after a real match. A value missing from the
     current option set still displays itself. Empty → placeholder.
     Multi-select shows the single chosen label, or "N selected". */
  const displayLabel = multiple
    ? selectedValues.length === 0
      ? placeholder ?? 'Select…'
      : selectedValues.length === 1
        ? resolveSelectTriggerLabel({ value: selectedValues[0], options: items, placeholder: placeholder ?? 'Select…' })
        : multipleSummary ?? `${selectedValues.length} selected`
    : resolveSelectTriggerLabel({
        value: current,
        options: items,
        placeholder: placeholder ?? 'Select…',
      })

  const setCurrent = useCallback(
    (next) => {
      if (multiple) {
        // Toggle membership; keep the menu open for further ticks.
        const arr = Array.isArray(currentRef.current) ? currentRef.current : []
        const exists = arr.some((v) => sameSelectValue(v, next))
        const updated = exists ? arr.filter((v) => !sameSelectValue(v, next)) : [...arr, next]
        setInternal(updated)
        onValueChange?.(updated)
        return
      }
      setInternal(next)
      onValueChange?.(next)
      setOpen(false)
      setSearch('')
      triggerRef.current?.focus()
    },
    [multiple, onValueChange, triggerRef],
  )

  const clear = useCallback(() => {
    const next = clearValue
    setInternal(next)
    onValueChange?.(next)
    setOpen(false)
    setSearch('')
    triggerRef.current?.focus()
  }, [clearValue, onValueChange, triggerRef])

  useEffect(() => {
    if (open) setMenuMounted(true)
  }, [open])

  /* focus the search field (or first option) shortly after open */
  const focusFirst = useCallback(() => {
    const list = listRef.current
    if (!list) return false
    const buttons = [...list.querySelectorAll('button[role="option"]:not(:disabled)')]
    buttons[0]?.focus()
    return buttons.length > 0
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const timer = window.setTimeout(() => {
      if (searchable) searchRef.current?.focus()
      else focusFirst()
    }, 50)
    return () => clearTimeout(timer)
  }, [open, searchable, focusFirst])

  const optionButtons = useCallback(() => {
    const list = listRef.current
    if (!list) return []
    return [...list.querySelectorAll('button[role="option"]:not(:disabled)')]
  }, [])

  const focusOptionAt = useCallback(
    (index) => {
      const buttons = optionButtons()
      if (!buttons.length) return
      buttons[Math.max(0, Math.min(index, buttons.length - 1))]?.focus()
    },
    [optionButtons],
  )

  const onTriggerKeyDown = (event) => {
    if (isDisabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        setOpen(true)
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusOptionAt(0)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      const buttons = optionButtons()
      focusOptionAt(buttons.length - 1)
    }
  }

  const onMenuKeyDown = (event) => {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      const buttons = optionButtons()
      if (!buttons.length) return
      event.preventDefault()
      const idx = buttons.indexOf(document.activeElement)
      if (event.key === 'Home') focusOptionAt(0)
      else if (event.key === 'End') focusOptionAt(buttons.length - 1)
      else if (event.key === 'ArrowDown') focusOptionAt(idx === -1 ? 0 : idx + 1)
      else focusOptionAt(idx === -1 ? buttons.length - 1 : idx - 1)
    }
  }

  const onSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      focusOptionAt(0)
    }
  }

  return (
    <SelectContext.Provider value={{ current, setCurrent, multiple, selectedValues }}>
      <div className={cn('relative', className)}>
        <button
          ref={setTriggerRef}
          type="button"
          id={id}
          disabled={isDisabled}
          onClick={() => (open ? closeMenu({ reason: 'trigger' }) : setOpen(true))}
          onKeyDown={onTriggerKeyDown}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={menuId}
          aria-label={ariaLabel ? `${ariaLabel}: ${displayLabel}` : undefined}
          aria-busy={loading || undefined}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 text-sm font-medium transition-all dark:bg-slate-950/60',
            active && !open && 'border-indigo-300 bg-indigo-50/40 text-indigo-700 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-300',
            open
              ? 'border-indigo-400 ring-4 ring-indigo-500/15'
              : !active && 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <span className={cn('min-w-0 flex-1 truncate text-left', active ? 'text-indigo-700 dark:text-indigo-200' : 'text-slate-900 dark:text-slate-100')}>
            {displayLabel}
          </span>
          {clearable && hasValue && !isDisabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={(event) => {
                event.stopPropagation()
                clear()
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  clear()
                }
              }}
              className="-mr-1.5 shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300', open && 'rotate-180')} />
        </button>

        {helper && <p className="mt-1 px-1 text-[10px] font-medium text-slate-400">{helper}</p>}

        {menuMounted &&
          container &&
          createPortal(
            <AnimatePresence onExitComplete={() => setMenuMounted(false)}>
              {open && (
                <motion.div
                  ref={menuRef}
                  id={menuId}
                  role="listbox"
                  aria-label={ariaLabel ?? placeholder ?? 'Options'}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  onKeyDown={onMenuKeyDown}
                  className={cn(
                    'fixed flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-lift backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95'
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
                >
                  {searchable && (
                    <div className="relative mb-1.5">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={searchRef}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        onKeyDown={onSearchKeyDown}
                        placeholder="Search…"
                        aria-label="Search options"
                        className="h-9 w-full rounded-lg border-0 bg-slate-100 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 dark:bg-slate-800"
                      />
                    </div>
                  )}
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs font-medium text-slate-400">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500 dark:border-slate-600 dark:border-t-indigo-400" />
                      Loading options…
                    </div>
                  ) : visibleItems.length ? (
                    <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
                      {visibleItems}
                    </div>
                  ) : (
                    <div className="px-3 py-6 text-center text-xs font-medium text-slate-400">
                      {searchable && search.trim() ? 'No matching options' : emptyText ?? 'No options'}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>,
            container,
          )}
      </div>
    </SelectContext.Provider>
  )
})

/* ----------------------------- SelectItem ---------------------------- */

const SelectItem = forwardRef(function SelectItem({ value, className, children, disabled: optionDisabled, searchText, ...props }, ref) {
  const { current, setCurrent, multiple, selectedValues } = useContext(SelectContext)
  const selected = multiple
    ? (selectedValues ?? []).some((v) => sameSelectValue(v, value))
    : sameSelectValue(current, value)
  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={selected}
      disabled={optionDisabled}
      onClick={() => {
        if (!optionDisabled) setCurrent(value)
      }}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
        selected
          ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800',
        optionDisabled && 'cursor-not-allowed opacity-40',
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
          selected
            ? 'border-indigo-500 bg-indigo-500 text-white dark:border-indigo-400 dark:bg-indigo-500'
            : 'border-slate-300 bg-transparent dark:border-slate-600'
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  )
})

/* Passthroughs kept for API compatibility with existing call sites. */
const SelectTrigger = ({ children }) => children
const SelectContent = ({ children }) => children
const SelectValue = ({ children }) => children

export { Select, SelectItem, SelectTrigger, SelectContent, SelectValue, flattenSelectLabel, resolveSelectTriggerLabel, sameSelectValue }
export default Select
