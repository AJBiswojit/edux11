/**
 * MediXO EduX design tokens — the single source of truth for the design system.
 * Mirrors the Tailwind theme so components can reference tokens programmatically.
 */
export const THEME = {
  colors: {
    primary: {
      DEFAULT: '#6366f1',
      hover: '#4f46e5',
      soft: 'rgba(99,102,241,0.12)',
      softDark: 'rgba(99,102,241,0.20)',
    },
    accent: { DEFAULT: '#14b8a6', soft: 'rgba(20,184,166,0.12)' },
    success: { DEFAULT: '#10b981', soft: 'rgba(16,185,129,0.12)' },
    warning: { DEFAULT: '#f59e0b', soft: 'rgba(245,158,11,0.12)' },
    danger: { DEFAULT: '#ef4444', soft: 'rgba(239,68,68,0.12)' },
    info: { DEFAULT: '#3b82f6', soft: 'rgba(59,130,246,0.12)' },
  },
  radius: { sm: 10, md: 14, lg: 20, xl: 24 },
  font: {
    sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
    display: 'Sora, Inter, ui-sans-serif, system-ui, sans-serif',
  },
  gradient: {
    brand: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 35%, #3b82f6 65%, #14b8a6 100%)',
    soft: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(20,184,166,0.10))',
    emerald: 'linear-gradient(135deg, #10b981, #14b8a6)',
    warm: 'linear-gradient(135deg, #f59e0b, #ef4444, #d946ef)',
  },
}

/** Deterministic gradient pairs for avatars / badges keyed by name hash. */
export const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #3b82f6)',
  'linear-gradient(135deg, #14b8a6, #0ea5e9)',
  'linear-gradient(135deg, #10b981, #84cc16)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #d946ef, #6366f1)',
  'linear-gradient(135deg, #0ea5e9, #6366f1)',
  'linear-gradient(135deg, #f43f5e, #f59e0b)',
  'linear-gradient(135deg, #8b5cf6, #14b8a6)',
]

export function avatarGradient(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
}

export const CHART_COLORS = {
  indigo: '#6366f1',
  blue: '#3b82f6',
  teal: '#14b8a6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  slate: '#94a3b8',
  palette: ['#6366f1', '#3b82f6', '#14b8a6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9'],
}
