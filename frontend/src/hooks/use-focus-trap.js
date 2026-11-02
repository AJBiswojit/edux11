import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * useFocusTrap — modal focus management for dialogs, sheets and command
 * palettes. While `active` is true: moves focus into the container, traps
 * Tab/Shift+Tab inside it, and restores focus to the previously focused
 * element on close. Returns a ref to attach to the container.
 */
export function useFocusTrap(active) {
  const ref = useRef(null)

  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined
    const container = ref.current
    if (!container) return undefined

    const previouslyFocused = document.activeElement
    const getFocusables = () => [...container.querySelectorAll(FOCUSABLE_SELECTOR)]
    const first = getFocusables()[0]
    ;(first ?? container).focus?.()

    const onKey = (e) => {
      if (e.key !== 'Tab') return
      const items = getFocusables()
      if (!items.length) {
        e.preventDefault()
        return
      }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      const current = document.activeElement
      const inside = container.contains(current)
      if (e.shiftKey) {
        if (!inside || current === firstEl) {
          e.preventDefault()
          lastEl.focus()
        }
      } else if (!inside || current === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [active])

  return ref
}

export default useFocusTrap
