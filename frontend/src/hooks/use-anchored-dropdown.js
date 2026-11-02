/**
 * useAnchoredDropdown — shared positioning/lifecycle for portal dropdowns.
 *
 * ONE architecture used by every anchored dropdown surface (Select,
 * DropdownMenu). Owns:
 *
 *   - portal container resolution (body, or the nearest `data-portal-scope`
 *     dialog/sheet container) so menus are never clipped by overflow,
 *     transform, filter or stacking contexts;
 *   - viewport-aware placement (down / up) and horizontal collision via the
 *     pure `computeDropdownPosition` math, using the menu's real measured
 *     content height;
 *   - scroll (capture phase, catches inner scroll containers) and resize
 *     repositioning — the menu is re-anchored on every viewport change and
 *     closes itself once its trigger has scrolled fully out of view;
 *   - outside-click dismissal (document pointerdown, capture phase — no
 *     per-page listeners, no click/mousedown races);
 *   - Escape dismissal (document keydown, capture phase, so a dropdown
 *     inside a dialog closes the dropdown — not the dialog — first);
 *   - filter-group mutual exclusion: within one `group`, opening a dropdown
 *     closes the previously open one (only one menu per filter group).
 *
 * Listeners exist only while a dropdown is OPEN and are cleaned up on close
 * and on unmount — no permanent global listeners per instance.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Z_INDEX } from '@/constants/ui/z-index'
import {
  computeDropdownPosition,
  DROPDOWN_MIN_WIDTH,
  triggerVisibleInViewport,
} from '@/utils/dropdown-position'
import { resolveDropdownContainer } from '@/utils/dropdown-portal'

/* group → open instance { id, close } */
const groupRegistry = new Map()
let groupInstanceSeq = 0

function viewportSize() {
  return { width: window.innerWidth, height: window.innerHeight }
}

/**
 * @param {Object} args
 * @param {boolean} args.open
 * @param {(info?: {reason?: string}) => void} args.onClose   called with a reason:
 *                                                          'outside' | 'escape' | 'scroll-out' | 'group'
 * @param {'start'|'end'} [args.align]
 * @param {string} [args.group]  mutual-exclusion filter group id
 * @param {number} [args.minWidth]
 * @returns {{ triggerRef, menuRef, styles, container, zIndex, closeMenu }}
 *   styles — fixed-position styles { top, bottom, left, width, maxHeight }
 *            (null before the first measurement; menu should stay hidden);
 *   container — portal target element (body or dialog scope);
 *   closeMenu({ focusTrigger }) — close programmatically.
 */
export function useAnchoredDropdown({ open, onClose, align = 'start', group = null, minWidth = DROPDOWN_MIN_WIDTH }) {
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const [styles, setStyles] = useState(null)
  const [container, setContainer] = useState(null)

  const openRef = useRef(open)
  openRef.current = open
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const instanceIdRef = useRef(null)
  if (instanceIdRef.current == null) instanceIdRef.current = `dropdown-${++groupInstanceSeq}`

  const closeMenu = useCallback(({ focusTrigger = false, reason = 'outside' } = {}) => {
    if (!openRef.current) return
    openRef.current = false
    onCloseRef.current?.({ reason })
    if (focusTrigger) triggerRef.current?.focus()
  }, [])

  /* ---- placement + viewport listeners (only while open) ---- */
  useLayoutEffect(() => {
    if (!open) {
      setStyles(null)
      return undefined
    }
    let disposed = false
    let settleTimer = 0
    let raf = 0

    const measure = () => {
      if (disposed) return
      const trigger = triggerRef.current
      const menu = menuRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      if (!triggerVisibleInViewport(rect, viewportSize())) {
        closeMenu({ reason: 'scroll-out' })
        return
      }
      const menuHeight = menu ? Math.max(menu.scrollHeight, 0) : 0
      setStyles(computeDropdownPosition({ trigger: rect, menuHeight, viewport: viewportSize(), align, minWidth }))
    }

    setContainer(resolveDropdownContainer(triggerRef.current))
    measure()
    /* content (fonts, option list) can settle after first paint */
    settleTimer = window.setTimeout(measure, 60)

    const reposition = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        measure()
      })
    }
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)

    return () => {
      disposed = true
      clearTimeout(settleTimer)
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      setStyles(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, container])

  /* ---- outside click (capture; trigger + menu + their contents are safe) ---- */
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      const target = event.target
      if (target instanceof Node) {
        if (menuRef.current?.contains(target)) return
        if (triggerRef.current?.contains(target)) return
      }
      closeMenu({ reason: 'outside' })
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open, closeMenu])

  /* ---- Escape (capture so nested dropdowns dismiss before parent overlays) ---- */
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      closeMenu({ focusTrigger: true, reason: 'escape' })
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, closeMenu])

  /* ---- filter-group mutual exclusion ---- */
  useEffect(() => {
    if (!open || !group) return undefined
    const id = instanceIdRef.current
    const previous = groupRegistry.get(group)
    if (previous && previous.id !== id) previous.dismiss()
    groupRegistry.set(group, {
      id,
      /* direct dismiss — bypasses this instance's openRef guard */
      dismiss: () => {
        openRef.current = false
        onCloseRef.current?.({ reason: 'group' })
      },
    })
    return () => {
      const current = groupRegistry.get(group)
      if (current && current.id === id) groupRegistry.delete(group)
    }
  }, [open, group, closeMenu])

  return { triggerRef, menuRef, styles, container, zIndex: Z_INDEX.menu, closeMenu }
}

export default useAnchoredDropdown
