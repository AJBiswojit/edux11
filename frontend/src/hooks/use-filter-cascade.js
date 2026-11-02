/**
 * useFilterCascade — feature-level cascading filter state.
 *
 * React binding for the pure engine in `src/utils/filter-cascade.js`.
 *
 * Usage (feature declares its own graph + dataset-derived options):
 *
 *   const { values, options, set, apply, reset } = useFilterCascade({
 *     dependencies: { subject: ['exam'], chapter: ['subject'], topic: ['chapter'] },
 *     emptyValues:  { subject: 'All subjects', chapter: 'All chapters', topic: 'All topics' },
 *     initialValues: { exam: 'All', subject: 'All subjects', chapter: 'All chapters', topic: 'All topics' },
 *     deriveOptions: useMemo((key, v) => deriveMyOptions(key, v, dataset), [dataset, otherFeatureState]),
 *   })
 *
 * Contract:
 *   - `deriveOptions` MUST be memoized by the feature over every input that
 *     can change the option lists (dataset ref, mode/exam chips, …). When
 *     its identity changes the hook re-sanitizes the current values, so a
 *     stale child can never survive a dataset or context change.
 *   - `set(key, value)` / `apply(patch)` return the sanitized values
 *     synchronously (features with compound state can mirror them).
 *   - Keys absent from `dependencies` are never touched by the engine —
 *     only declared parents cascade into their children.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { deriveCascadeOptions, emptyValueFor, sanitizeCascadeValues } from '@/utils/filter-cascade'

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true
  const ka = Object.keys(a ?? {})
  const kb = Object.keys(b ?? {})
  if (ka.length !== kb.length) return false
  for (const key of ka) if (!Object.is(a[key], b[key])) return false
  return true
}

export function useFilterCascade(config) {
  const configRef = useRef(config)
  configRef.current = config

  const [values, setValuesState] = useState(() => sanitizeCascadeValues(config.initialValues ?? {}, config))
  const valuesRef = useRef(values)
  valuesRef.current = values

  /* Re-sanitize when the option derivation source changes (dataset load,
     mode/exam context change) — invalid children clear automatically. */
  useEffect(() => {
    setValuesState((current) => {
      const next = sanitizeCascadeValues(current, configRef.current)
      const stable = shallowEqual(next, current) ? current : next
      valuesRef.current = stable
      return stable
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.deriveOptions])

  const options = useMemo(
    () => deriveCascadeOptions(values, configRef.current),
    [values, config.deriveOptions],
  )

  /** Merge `patch` into the current values, sanitize, store — returns sanitized. */
  const apply = useCallback((patch) => {
    const next = sanitizeCascadeValues({ ...valuesRef.current, ...(patch ?? {}) }, configRef.current)
    valuesRef.current = next
    setValuesState(next)
    return next
  }, [])

  const set = useCallback((key, value) => apply({ [key]: value }), [apply])

  /** Reset every declared key to its empty value (independent keys keep their state). */
  const reset = useCallback(() => {
    const cfg = configRef.current
    const patch = {}
    for (const key of Object.keys(cfg.dependencies ?? {})) patch[key] = emptyValueFor(cfg, key)
    return apply(patch)
  }, [apply])

  return { values, options, set, apply, reset }
}

export default useFilterCascade
