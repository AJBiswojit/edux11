/**
 * Shared style-variant maps for paper-related Badge components.
 * Kept in a non-JSX module so Vite Fast Refresh can handle paper-parts.jsx
 * without complaining about mixed component + non-component exports.
 */

export const STATUS_STYLES = { Ready: 'success', Draft: 'secondary', 'In Review': 'warning', Published: 'success' }
export const DIFF_STYLES = { Easy: 'success', Medium: 'warning', Hard: 'danger' }
export const MODE_STYLES = { University: 'info', Competitive: 'gradient' }
