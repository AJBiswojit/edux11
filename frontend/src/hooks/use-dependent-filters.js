/**
 * useDependentFilters — Higher-level controller for cascading filters with disabled state.
 *
 * Builds on useFilterCascade to provide automatic disabled state computation
 * and helper messages for dependent dropdowns.
 *
 * Usage:
 *   const { values, options, set, apply, reset, disabled, helpers } = useDependentFilters(config)
 *
 *   <Select 
 *     value={values.subject ?? ''} 
 *     onValueChange={(v) => set('subject', v)} 
 *     disabled={disabled.subject}
 *     placeholder={helpers.subject?.placeholder ?? 'Select subject...'}
 *     helper={helpers.subject?.message}
 *   >
 *     {options.subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
 *   </Select>
 */

import { useMemo } from 'react'
import { useFilterCascade } from './use-filter-cascade'

/**
 * Compute which dependencies are missing for a given key.
 */
function getMissingDependencies(key, dependencies, values) {
  const deps = dependencies[key] ?? []
  return deps.filter((dep) => !values[dep] || values[dep] === '' || values[dep] === null)
}

/**
 * Format a dependency name for display.
 */
function formatDependency(dep) {
  const labels = {
    context: 'Context',
    domain: 'Domain',
    examFamily: 'Exam Family',
    examId: 'Exam',
    subject: 'Subject',
    chapter: 'Chapter',
    topic: 'Topic',
    program: 'Program',
    yearRange: 'Year Range',
    family: 'Family',
  }
  return labels[dep] ?? dep
}

export function useDependentFilters(config) {
  const cascade = useFilterCascade(config)
  const { values, options, set, apply, reset } = cascade

  /* Compute disabled state for each declared key. */
  const disabled = useMemo(() => {
    const result = {}
    const dependencies = config?.dependencies ?? {}
    
    for (const key of Object.keys(dependencies)) {
      const missingDeps = getMissingDependencies(key, dependencies, values)
      result[key] = missingDeps.length > 0
    }
    
    return result
  }, [config?.dependencies, values])

  /* Compute helper messages and placeholders for each key. */
  const helpers = useMemo(() => {
    const result = {}
    const dependencies = config?.dependencies ?? {}
    
    for (const key of Object.keys(dependencies)) {
      const missingDeps = getMissingDependencies(key, dependencies, values)
      
      if (missingDeps.length === 0) {
        result[key] = { 
          message: undefined, 
          placeholder: config?.placeholders?.[key] ?? `Select ${formatDependency(key)}…` 
        }
      } else if (missingDeps.length === 1) {
        const dep = missingDeps[0]
        result[key] = {
          message: `Select ${formatDependency(dep)} first`,
          placeholder: `Select ${formatDependency(dep)} first`
        }
      } else {
        const formattedDeps = missingDeps.map(formatDependency)
        const last = formattedDeps.pop()
        const depsStr = formattedDeps.length > 0 ? `${formattedDeps.join(', ')} and ${last}` : last
        result[key] = {
          message: `Select ${depsStr} first`,
          placeholder: `Select ${depsStr} first`
        }
      }
    }
    
    return result
  }, [config?.dependencies, config?.placeholders, values])

  /* Check if a specific key is ready (all dependencies satisfied). */
  const isReady = useCallback((key) => {
    const dependencies = config?.dependencies ?? {}
    const deps = dependencies[key] ?? []
    return deps.every((dep) => values[dep] && values[dep] !== '' && values[dep] !== null)
  }, [config?.dependencies, values])

  /* Get the dependency chain for a key. */
  const getDependencyChain = useCallback((key) => {
    const dependencies = config?.dependencies ?? {}
    const chain = []
    let current = key
    
    // Build the chain from leaf to root
    while (current && dependencies[current]) {
      for (const dep of dependencies[current]) {
        if (!chain.includes(dep)) {
          chain.push(dep)
        }
      }
      current = dependencies[current]?.[0] // Follow first dependency
    }
    
    return chain.reverse()
  }, [config?.dependencies])

  return {
    ...cascade,
    disabled,
    helpers,
    isReady,
    getDependencyChain,
  }
}

export default useDependentFilters