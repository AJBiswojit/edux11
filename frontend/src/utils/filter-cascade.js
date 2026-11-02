/**
 * EduX Filter Cascade Engine — pure, feature-declared dependency logic.
 *
 * This is the ONE project-wide mechanism for cascading filters. A feature
 * (Source Library, PYQ Analysis, Exam Analysis, Paper Generator, …) declares
 * its own dependency graph and option derivation from its own dataset:
 *
 *   createFilterCascade({
 *     // 1. only REAL data dependencies — independent keys stay out of the map
 *     dependencies: {
 *       examFamily: ['domain'],
 *       subject:    ['domain', 'examFamily'],
 *       chapter:    ['domain', 'examFamily', 'subject'],
 *       topic:      ['domain', 'examFamily', 'subject', 'chapter'],
 *     },
 *     // 2. options always derived from the canonical dataset/metadata
 *     deriveOptions: (key, values) => deriveSourceFilterOptions(values, catalog)[MAP[key]],
 *     // 3. how "cleared" looks for each key (optional sentinels supported)
 *     emptyValue: '',
 *     emptyValues: { subject: 'All subjects' },
 *     // 4. strict mode: an EMPTY option list invalidates the current value
 *     //    (use when the list can be empty because a parent is unselected,
 *     //     e.g. Topic with no Chapter). Default false = keep when empty,
 *     //    which protects values while an async dataset is still loading.
 *     treatEmptyOptionsAsInvalid: true,
 *   })
 *
 * `deriveOptions(key, values, purpose)` receives `purpose`:
 *   - 'display'  → options shown in the dropdown (may reflect independent
 *                  keys such as search/source-type);
 *   - 'sanitize' → options used to validate state. If an independent key
 *                  influences your derivation, neutralize it here so a
 *                  legitimate no-match state can never clear hierarchy values.
 *
 * Guarantees:
 *   - sanitize() never leaves `Parent = A, Child = value belonging to B`:
 *     a child value missing from its parent-derived options is reset to its
 *     empty value, and descendants are re-validated against the UPDATED
 *     parents in the same pass — a child still valid under the new
 *     combination is kept, one that is not is cleared (transitively).
 *   - keys outside the dependency graph (search boxes, source type, year
 *     ranges, …) pass through untouched — no global cross-dependency is
 *     introduced.
 *   - option lists are recomputed from the dataset, never hardcoded in UI.
 */

/**
 * Deterministic parent-first ordering of the declared keys.
 * @throws on circular dependencies (fail fast — a cycle cannot cascade).
 */
export function cascadeOrder(dependencies = {}) {
  const declared = new Set(Object.keys(dependencies ?? {}))
  const order = []
  const state = new Map() // key -> 0 visiting · 1 done
  /* Undeclared parents (e.g. a context chip) are walked for cycle
     detection but never validated — only declared keys are cascade state. */
  const visit = (key, trail) => {
    if (state.get(key) === 1) return
    if (state.get(key) === 0) {
      throw new Error(`Circular filter dependency detected at "${key}" (${[...trail, key].join(' → ')})`)
    }
    state.set(key, 0)
    for (const parent of dependencies[key] ?? []) visit(parent, [...trail, key])
    state.set(key, 1)
    if (declared.has(key)) order.push(key)
  }
  for (const key of declared) visit(key, [])
  return order
}

export function emptyValueFor(config, key) {
  const configEmpty = config?.emptyValues?.[key]
  if (configEmpty !== undefined) return configEmpty
  return config?.emptyValue ?? ''
}

/**
 * Validate `values` against the declared dependency graph and return a new
 * object where every child whose value is no longer offered by its parents
 * is reset to its empty value. Keys are visited parent-first, so an
 * invalidated key's descendants are validated against the UPDATED parents
 * in the same pass (kept if still valid, cleared if not — transitively).
 * Undeclared keys pass through unchanged.
 *
 * @param {Object} values
 * @param {Object} config { dependencies, deriveOptions, emptyValue?, emptyValues?, treatEmptyOptionsAsInvalid? }
 * @returns {Object} sanitized values
 */
export function sanitizeCascadeValues(values, config) {
  const { dependencies = {}, deriveOptions, treatEmptyOptionsAsInvalid = false } = config ?? {}
  if (typeof deriveOptions !== 'function') throw new Error('filter-cascade: deriveOptions(key, values) is required')
  const base = values ?? {}
  const order = cascadeOrder(dependencies)
  const next = { ...base }

  for (const key of order) {
    const value = next[key]
    const empty = emptyValueFor(config, key)
    if (value == null || value === '' || value === empty) {
      if (value == null) next[key] = empty
      continue
    }
    const options = deriveOptions(key, next, 'sanitize') ?? []
    if (options.length === 0 && !treatEmptyOptionsAsInvalid) continue
    if (!options.includes(value)) {
      /* Reset ONLY this key. Descendants are re-validated a moment later in
         the same topological pass against the UPDATED parents — so a child
         that is still valid under the new combination is kept, and a child
         that is not is cleared (transitively, one level per pass). */
      next[key] = empty
    }
  }
  return next
}

/**
 * Derive the option list for every declared key from the current values.
 * Parents are derived first; each key's derivation receives the full
 * (already-sanitized) values object and may read feature state from its
 * closure (e.g. exam family chips).
 *
 * @returns {Object.<string, string[]>}
 */
export function deriveCascadeOptions(values, config) {
  const { dependencies = {}, deriveOptions } = config ?? {}
  if (typeof deriveOptions !== 'function') throw new Error('filter-cascade: deriveOptions(key, values) is required')
  const out = {}
  for (const key of cascadeOrder(dependencies)) {
    out[key] = deriveOptions(key, values ?? {}, 'display') ?? []
  }
  return out
}

/**
 * Convenience bundle for features that keep cascade state in plain state
 * (object) rather than the useFilterCascade hook.
 */
export function createFilterCascade(config) {
  return {
    ...config,
    order: cascadeOrder(config?.dependencies ?? {}),
    sanitize: (values) => sanitizeCascadeValues(values, config),
    options: (values) => deriveCascadeOptions(values, config),
  }
}

export default createFilterCascade
