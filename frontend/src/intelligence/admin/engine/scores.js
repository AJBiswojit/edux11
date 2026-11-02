/**
 * Admin Intelligence Engine — scoring utilities (pure functions).
 * Deterministic: same datasets in → same scores out. Mirrors the
 * faculty/student engine conventions (clamp / round1 / avg / weighted).
 */

export const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, Number.isFinite(v) ? v : 0))

export const round1 = (v) => Math.round((Number.isFinite(v) ? v : 0) * 10) / 10

export const avg = (arr, key) => {
  if (!arr?.length) return 0
  const vals = arr.map((x) => (key ? Number(x?.[key]) : Number(x))).filter(Number.isFinite)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
}

export const weighted = (factors) => {
  const total = factors.reduce((a, f) => a + (Number(f.weight) || 0), 0) || 1
  return factors.reduce((a, f) => a + (clamp(f.value) * (Number(f.weight) || 0)), 0) / total
}

export default { clamp, round1, avg, weighted }
