/**
 * EduX Dropdown Portal — container resolution.
 *
 * Dropdown menus are rendered through a portal. By default the target is
 * `document.body`, which escapes every parent `overflow-hidden/scroll`,
 * `transform`, `filter` and stacking context.
 *
 * Dialogs and sheets set `data-portal-scope` on their fixed overlay
 * container. A trigger inside such a container portals its menu INTO that
 * container instead, so the menu:
 *   - stays above the modal overlay / content (modal-local stacking),
 *   - stays below toasts and the command palette (global hierarchy),
 *   - still uses viewport-relative `position: fixed` coordinates, because
 *     the scope container itself carries no transform/filter.
 */

export const PORTAL_SCOPE_ATTR = 'data-portal-scope'

/**
 * @param {Element|null} anchorEl  the trigger element (or any element inside
 *                                 the scope)
 * @returns {Element|null} the portal container (body, or the nearest scope)
 */
export function resolveDropdownContainer(anchorEl) {
  if (typeof document === 'undefined') return null
  let node = anchorEl instanceof Element ? anchorEl : null
  while (node && node !== document.documentElement) {
    if (node.nodeType === 1 && typeof node.hasAttribute === 'function' && node.hasAttribute(PORTAL_SCOPE_ATTR)) {
      return node
    }
    node = node.parentElement
  }
  return document.body
}

export default resolveDropdownContainer
