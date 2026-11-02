/**
 * PYQ Analysis (Faculty · Question Intelligence) — feature-declared filter
 * cascade.
 *
 * Dependency reality (from the canonical pyqFilters dataset):
 *   - Subject → Chapter → Topic are real dependencies: chapters exist per
 *     subject and topics exist per chapter in `filtersData`.
 *   - Program (Class/Program) and Year range are INDEPENDENT: the dataset
 *     declares no program→subject relationship (one subject catalog serves
 *     every program), so no dependency is invented.
 *
 * State validation runs through the shared cascade engine
 * (src/utils/filter-cascade.js); options come from the service dataset —
 * nothing academic is hardcoded in the UI.
 */

export const PYQ_FILTER_DEPENDENCIES = {
  subject: [],
  chapter: ['subject'],
  topic: ['subject', 'chapter'],
}

/**
 * @param {{ subjects?: Array<{code:string, chapters:string[]}>, chapters?: Record<string,string[]> } | null} filtersData
 */
export function buildPyqFilterCascade(filtersData = null) {
  const subjects = filtersData?.subjects ?? []
  const chapterMap = filtersData?.chapters ?? {}
  return {
    dependencies: PYQ_FILTER_DEPENDENCIES,
    treatEmptyOptionsAsInvalid: true,
    deriveOptions: (key, values) => {
      if (key === 'subject') return subjects.map((s) => s.code)
      if (key === 'chapter') return subjects.find((s) => s.code === values.subject)?.chapters ?? []
      return chapterMap[values.chapter] ?? []
    },
  }
}

export default buildPyqFilterCascade
