/**
 * AI Question Studio — feature-declared filter cascade.
 *
 * Topic → Concept, derived from the analyzed source's detected topics and
 * concepts (per-source, per-domain — a JEE source's concepts are never
 * offered for a University source because the source itself selects).
 * Switching the source resets both (handled by the workflow) — a concept
 * that does not exist under the newly selected topic is cleared by the
 * shared engine.
 */

export const STUDIO_CASCADE_DEPENDENCIES = {
  topic: [],
  concept: ['topic'],
}

export const STUDIO_CASCADE_EMPTY = { topic: 'All topics', concept: 'All concepts' }

/**
 * @param {{ topics?: Array<{topic:string, concepts:string[]}>, concepts?: string[] } | null} source
 */
export function buildStudioCascade(source = null) {
  const topics = source?.topics ?? []
  return {
    dependencies: STUDIO_CASCADE_DEPENDENCIES,
    treatEmptyOptionsAsInvalid: true,
    emptyValues: STUDIO_CASCADE_EMPTY,
    deriveOptions: (key, values) => {
      if (key === 'topic') return topics.map((t) => t.topic)
      return topics.find((t) => t.topic === values.topic)?.concepts ?? source?.concepts ?? []
    },
  }
}

export default buildStudioCascade
