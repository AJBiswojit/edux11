import { format, formatDistanceToNow, parseISO } from 'date-fns'

/** Compact number formatting: 12400 -> 12.4K */
export function formatCompact(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const n = Number(value)
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return n.toLocaleString('en-IN')
}

export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return `${Number(value).toFixed(decimals)}%`
}

export function formatDate(date, pattern = 'MMM d, yyyy') {
  if (!date) return '—'
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, pattern)
  } catch {
    return '—'
  }
}

export function formatRelative(date) {
  if (!date) return '—'
  try {
    return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, { addSuffix: true })
  } catch {
    return '—'
  }
}

export function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function sum(arr, key) {
  return arr.reduce((acc, item) => acc + (key ? Number(item[key] ?? 0) : Number(item ?? 0)), 0)
}

export function avg(arr, key) {
  if (!arr?.length) return 0
  return sum(arr, key) / arr.length
}

export function percentOf(part, whole) {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

export function debounce(fn, wait = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
}

/** Simulate network latency for API layers. */
export function sleep(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Deterministic pseudo-random for stable mock charts. */
export function seededRandom(seed = 1) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function truncate(str, length = 80) {
  if (!str) return ''
  return str.length > length ? `${str.slice(0, length).trim()}…` : str
}
