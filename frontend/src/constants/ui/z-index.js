/**
 * MediXO EduX — global z-index hierarchy.
 *
 * Single source of truth for overlay stacking. Primitives (Select,
 * DropdownMenu, Tooltip, Dialog, Sheet, Command, Toast) must reference these
 * tokens instead of inventing local numbers.
 *
 * Hierarchy (low → high):
 *   base        0–10   ordinary content, local card elevation
 *   sticky      30     sticky topbar / sidebars (glass-nav)
 *   menu        70     dropdown menus, select popovers, anchored popovers
 *   aiCopilot   80–85  floating AI copilot panels (side surfaces)
 *   tooltip     90     tooltips
 *   dialog      100    modals, sheets (portal scopes for nested menus)
 *   command     110    global command palette
 *   toast       200    toasts — always on top
 *
 * Menus opened INSIDE a dialog/sheet are portaled into that dialog's
 * `data-portal-scope` container, so the same `menu` level stacks correctly
 * against the dialog content without bumping global z-index values.
 */
export const Z_INDEX = {
  base: 0,
  raised: 10,
  sticky: 30,
  menu: 70,
  aiCopilot: 80,
  tooltip: 90,
  dialog: 100,
  command: 110,
  toast: 200,
}

export default Z_INDEX
