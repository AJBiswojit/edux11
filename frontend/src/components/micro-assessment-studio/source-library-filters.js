/**
 * Pure Source Library filter helpers.
 *
 * The component receives `filterCatalog` through the service/API response;
 * it never imports the source dataset. Hierarchy options are derived from
 * the catalog with downstream filters deliberately ignored so a parent can
 * always be changed and invalid children can be cleared.
 *
 * The dependency graph (Domain → Exam Family → Subject → Chapter → Topic)
 * is declared here for this feature only and validated through the shared
 * EduX cascade engine (`src/utils/filter-cascade.js`) — the project-wide
 * invalid-state prevention. Search and Source Type are INDEPENDENT keys:
 * they are not part of the graph and a no-match state they create must
 * never clear hierarchy values (they are neutralized during sanitizing).
 */

import { sanitizeCascadeValues } from '@/utils/filter-cascade'

const HIERARCHY_KEYS = ['domain', 'examFamily', 'subject', 'chapter', 'topic']
const LABELS = {
  search: 'Search',
  domain: 'Domain',
  examFamily: 'Exam Family',
  subject: 'Subject',
  chapter: 'Chapter',
  topic: 'Topic',
  sourceType: 'Source Type',
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function optionalValue(value) {
  const normalized = String(value ?? '').trim()
  return !normalized || normalized.toLowerCase().startsWith('all ') || normalized.toLowerCase() === 'all' ? '' : normalized
}

function searchable(source) {
  return [source.title, source.subject, source.chapter, source.topic, source.sourceType, source.examFamily, source.content]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function independentMatch(source, filters) {
  const search = String(filters.search ?? '').trim().toLowerCase()
  const sourceType = optionalValue(filters.sourceType)
  return (!search || searchable(source).includes(search))
    && (!sourceType || source.sourceType === sourceType)
}

function hierarchyMatch(source, filters, through) {
  if (!independentMatch(source, filters)) return false
  const end = HIERARCHY_KEYS.indexOf(through)
  return HIERARCHY_KEYS.slice(0, end + 1).every((key) => {
    const value = optionalValue(filters[key])
    if (!value) return true
    if (key === 'domain') return source.domain === value
    return source[key] === value
  })
}

function valuesFor(catalog, filters, key) {
  if (key === 'domain') return unique(catalog.filter((source) => independentMatch(source, filters)).map((source) => source.domain))
  if (key === 'examFamily') {
    if (optionalValue(filters.domain).toLowerCase() !== 'competitive') return []
    return unique(catalog.filter((source) => hierarchyMatch(source, filters, 'domain')).filter((source) => source.domain === 'competitive').map((source) => source.examFamily))
  }
  if (key === 'subject') {
    const sources = catalog.filter((source) => hierarchyMatch(source, filters, 'examFamily'))
    return unique(sources.map((source) => source.subject))
  }
  if (key === 'chapter') {
    const sources = catalog.filter((source) => hierarchyMatch(source, filters, 'subject'))
    return unique(sources.map((source) => source.chapter))
  }
  if (key === 'topic') {
    if (!optionalValue(filters.chapter)) return []
    const sources = catalog.filter((source) => hierarchyMatch(source, filters, 'chapter'))
    return unique(sources.map((source) => source.topic))
  }
  /* Source Type is independent from the hierarchy but still reflects the
     current search/context so its options remain useful. */
  return unique(catalog.filter((source) => hierarchyMatch(source, filters, 'topic')).map((source) => source.sourceType))
}

export function deriveSourceFilterOptions(filters = {}, catalog = []) {
  return {
    domains: valuesFor(catalog, filters, 'domain'),
    examFamilies: valuesFor(catalog, filters, 'examFamily'),
    subjects: valuesFor(catalog, filters, 'subject'),
    chapters: valuesFor(catalog, filters, 'chapter'),
    topics: valuesFor(catalog, filters, 'topic'),
    sourceTypes: valuesFor(catalog, filters, 'sourceType'),
  }
}

/**
 * Feature-declared Source Library cascade (used by the shared engine).
 * Strict mode: an empty option list invalidates the current value — e.g.
 * Exam Family has no options outside Competitive, and Topic has no options
 * without a Chapter, and both must clear.
 */
export const SOURCE_FILTER_DEPENDENCIES = {
  domain: [],
  examFamily: ['domain'],
  subject: ['domain', 'examFamily'],
  chapter: ['domain', 'examFamily', 'subject'],
  topic: ['domain', 'examFamily', 'subject', 'chapter'],
}

const SOURCE_KEY_OPTIONS = {
  domain: 'domains',
  examFamily: 'examFamilies',
  subject: 'subjects',
  chapter: 'chapters',
  topic: 'topics',
}

export function buildSourceFilterCascade(catalog = []) {
  return {
    dependencies: SOURCE_FILTER_DEPENDENCIES,
    treatEmptyOptionsAsInvalid: true,
    deriveOptions: (key, values, purpose = 'display') => {
      const effective =
        purpose === 'sanitize'
          ? { ...(values ?? {}), search: '', sourceType: '' }
          : (values ?? {})
      const derived = deriveSourceFilterOptions(effective, catalog)
      return derived[SOURCE_KEY_OPTIONS[key]] ?? []
    },
  }
}

/** Clears only downstream values that are no longer valid after a parent
 * change. Search and sourceType intentionally survive hierarchy changes.
 * Implemented on the shared cascade engine — one invalid-state rule for
 * the whole project. */
export function sanitizeSourceFilters(nextFilters = {}, catalog = []) {
  const normalized = {
    ...nextFilters,
    search: nextFilters.search ?? '',
    domain: optionalValue(nextFilters.domain),
    examFamily: optionalValue(nextFilters.examFamily),
    subject: optionalValue(nextFilters.subject),
    chapter: optionalValue(nextFilters.chapter),
    topic: optionalValue(nextFilters.topic),
    sourceType: optionalValue(nextFilters.sourceType),
  }
  return sanitizeCascadeValues(normalized, buildSourceFilterCascade(catalog))
}

export function activeSourceFilters(filters = {}) {
  return Object.entries(LABELS)
    .filter(([key]) => key === 'search' ? String(filters[key] ?? '').trim() : optionalValue(filters[key]))
    .map(([key]) => ({ key, label: LABELS[key], value: filters[key] }))
}

export function sourceMatchesFilters(source, filters = {}) {
  const domain = optionalValue(filters.domain)
  const examFamily = optionalValue(filters.examFamily)
  const subject = optionalValue(filters.subject)
  const chapter = optionalValue(filters.chapter)
  const topic = optionalValue(filters.topic)
  return independentMatch(source, filters)
    && (!domain || source.domain === domain)
    && (!examFamily || source.examFamily === examFamily)
    && (!subject || source.subject === subject)
    && (!chapter || source.chapter === chapter)
    && (!topic || source.topic === topic)
}

export { LABELS }
