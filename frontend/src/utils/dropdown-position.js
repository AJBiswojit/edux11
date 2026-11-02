/**
 * EduX Dropdown Positioning — pure viewport math (no DOM, no React).
 *
 * One positioning architecture shared by every anchored dropdown surface
 * (Select, DropdownMenu). Given the trigger rect, the measured menu height
 * and the viewport, it decides:
 *
 *   - placement:  'down' when the menu fits below the trigger,
 *                 'up'   when it does not fit below but fits above,
 *                 otherwise the side with MORE available space (and the
 *                 menu height is constrained to that space).
 *   - maxHeight:  never larger than the available vertical space on the
 *                 chosen side, so long option lists scroll internally and
 *                 the page itself never scrolls.
 *   - left/width: horizontal collision — the menu is clamped inside the
 *                 viewport with a safe margin; `align: 'end'` anchors the
 *                 menu's right edge to the trigger's right edge.
 *
 * The result is applied as `position: fixed` styles on a portaled menu, so
 * no parent `overflow-*`, `transform`, `filter` or stacking context can clip
 * it.
 */

export const DROPDOWN_SAFE_MARGIN = 8
export const DROPDOWN_GAP = 8
export const DROPDOWN_MIN_WIDTH = 192
export const DROPDOWN_MIN_MENU_HEIGHT = 48

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/**
 * @param {Object} args
 * @param {{ top:number, right:number, bottom:number, left:number, width:number, height:number }} args.trigger
 * @param {number} args.menuHeight  natural (full content) height of the menu
 * @param {{ width:number, height:number }} args.viewport
 * @param {'start'|'end'} [args.align]
 * @param {number} [args.safeMargin]
 * @param {number} [args.gap]
 * @param {number} [args.minWidth]
 * @returns {{
 *   placement: 'down'|'up',
 *   left: number,
 *   width: number,
 *   maxHeight: number,
 *   top: number|null,
 *   bottom: number|null,
 * }}
 */
export function computeDropdownPosition({
  trigger,
  menuHeight,
  viewport,
  align = 'start',
  safeMargin = DROPDOWN_SAFE_MARGIN,
  gap = DROPDOWN_GAP,
  minWidth = DROPDOWN_MIN_WIDTH,
} = {}) {
  const triggerRect = trigger ?? { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 }
  const vw = Math.max(0, viewport?.width ?? 0)
  const vh = Math.max(0, viewport?.height ?? 0)

  /* ---- width: never below minWidth, never wider than the viewport ---- */
  const maxAvailableWidth = Math.max(safeMargin, vw - safeMargin * 2)
  const width = clamp(Math.max(triggerRect.width, minWidth), safeMargin, maxAvailableWidth)

  /* ---- vertical: down if it fits, else up if it fits, else the roomier side ---- */
  const spaceBelow = Math.max(0, vh - triggerRect.bottom - safeMargin)
  const spaceAbove = Math.max(0, triggerRect.top - safeMargin)
  let placement
  if (menuHeight <= spaceBelow) {
    placement = 'down'
  } else if (menuHeight <= spaceAbove) {
    placement = 'up'
  } else {
    placement = spaceAbove >= spaceBelow ? 'up' : 'down'
  }
  const availableSpace = placement === 'up' ? spaceAbove : spaceBelow
  /* Viewport containment wins over the comfort floor in degenerate cases. */
  const maxHeight = Math.max(1, availableSpace)

  /* ---- horizontal collision: clamp inside the viewport ---- */
  let left = align === 'end' ? triggerRect.right - width : triggerRect.left
  left = clamp(left, safeMargin, Math.max(safeMargin, vw - width - safeMargin))

  return {
    placement,
    left,
    width,
    maxHeight,
    top: placement === 'down' ? triggerRect.bottom + gap : null,
    bottom: placement === 'up' ? vh - triggerRect.top + gap : null,
  }
}

/**
 * True while at least part of the trigger is visible in the viewport.
 * Anchored dropdowns close (instead of drifting) once their trigger has
 * scrolled fully out of view.
 */
export function triggerVisibleInViewport(trigger, viewport) {
  if (!trigger || !viewport) return true
  return (
    trigger.bottom > 0 &&
    trigger.top < viewport.height &&
    trigger.right > 0 &&
    trigger.left < viewport.width
  )
}

export default computeDropdownPosition
