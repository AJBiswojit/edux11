import { describe, expect, it } from 'vitest'
import {
  cascadeOrder,
  createFilterCascade,
  deriveCascadeOptions,
  sanitizeCascadeValues,
} from '../../src/utils/filter-cascade.js'

const SUBJECT_CHAPTERS = {
  'university:Data Structures': ['Trees', 'Graphs'],
  'competitive:JEE:Physics': ['Rotational Motion'],
  'competitive:JEE:Mathematics': ['Calculus'],
  'competitive:NEET:Physics': ['Optics'],
  'competitive:NEET:Biology': ['Genetics'],
}
const CHAPTER_TOPICS = {
  'university:Data Structures:Trees': ['AVL', 'B+ Trees'],
  'university:Data Structures:Graphs': ['Dijkstra'],
  'competitive:JEE:Physics:Rotational Motion': ['Torque'],
  'competitive:JEE:Mathematics:Calculus': ['Integration'],
  'competitive:NEET:Physics:Optics': ['Lenses'],
  'competitive:NEET:Biology:Genetics': ['Mendel'],
}
const SUBJECTS = {
  university: ['Data Structures'],
  'competitive:JEE': ['Physics', 'Mathematics'],
  'competitive:NEET': ['Physics', 'Biology'],
}

/* Canonical JEE/NEET/University tree used to prove domain isolation.
   Strict mode: the dataset is synchronous, so an empty option list really
   means "no valid value" (e.g. Exam Family outside Competitive). */
const FAMILY_TREE = {
  treatEmptyOptionsAsInvalid: true,
  dependencies: {
    domain: [],
    examFamily: ['domain'],
    subject: ['domain', 'examFamily'],
    chapter: ['domain', 'examFamily', 'subject'],
    topic: ['domain', 'examFamily', 'subject', 'chapter'],
  },
  deriveOptions: (key, values) => {
    const scope = values.domain === 'competitive' ? `competitive:${values.examFamily}` : 'university'
    if (key === 'domain') return ['university', 'competitive']
    if (key === 'examFamily') return values.domain === 'competitive' ? ['JEE', 'NEET'] : []
    if (key === 'subject') return SUBJECTS[scope] ?? []
    if (key === 'chapter') return SUBJECT_CHAPTERS[`${scope}:${values.subject}`] ?? []
    return CHAPTER_TOPICS[`${scope}:${values.subject}:${values.chapter}`] ?? []
  },
}

describe('cascade graph', () => {
  it('orders parents before children deterministically', () => {
    expect(cascadeOrder(FAMILY_TREE.dependencies)).toEqual(['domain', 'examFamily', 'subject', 'chapter', 'topic'])
  })

  it('throws on circular dependencies', () => {
    expect(() => cascadeOrder({ a: ['b'], b: ['a'] })).toThrow(/Circular/i)
  })
})

describe('sanitizeCascadeValues — invalid state prevention', () => {
  it('keeps a fully valid combination untouched', () => {
    const next = sanitizeCascadeValues(
      { domain: 'competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion', topic: 'Torque', search: 'torque' },
      FAMILY_TREE,
    )
    expect(next).toMatchObject({ domain: 'competitive', examFamily: 'JEE', subject: 'Physics', chapter: 'Rotational Motion', topic: 'Torque', search: 'torque' })
  })

  it('switching exam family clears subject/chapter/topic that belong to the other family', () => {
    // state after the user switches JEE → NEET while a JEE-only subject was selected
    const switched = { domain: 'competitive', examFamily: 'NEET', subject: 'Mathematics', chapter: 'Calculus', topic: 'Integration' }
    const sanitized = sanitizeCascadeValues(switched, FAMILY_TREE)
    expect(sanitized).toMatchObject({ domain: 'competitive', examFamily: 'NEET', subject: '', chapter: '', topic: '' })
  })

  it('University Physics and JEE Physics never mix (domain isolation)', () => {
    const university = sanitizeCascadeValues({ domain: 'university', subject: 'Data Structures', chapter: 'Trees', topic: 'AVL' }, FAMILY_TREE)
    expect(university).toMatchObject({ domain: 'university', subject: 'Data Structures', chapter: 'Trees', topic: 'AVL' })

    // "Physics" under university does not exist -> cleared, nothing leaks in
    const leaky = sanitizeCascadeValues({ domain: 'university', examFamily: 'JEE', subject: 'Physics' }, FAMILY_TREE)
    expect(leaky.examFamily).toBe('')
    expect(leaky.subject).toBe('')
  })

  it('NEET Physics is isolated from JEE Physics (same subject name, different context)', () => {
    const neet = sanitizeCascadeValues({ domain: 'competitive', examFamily: 'NEET', subject: 'Physics', chapter: 'Optics', topic: 'Lenses' }, FAMILY_TREE)
    expect(neet).toMatchObject({ examFamily: 'NEET', subject: 'Physics', chapter: 'Optics', topic: 'Lenses' })
    // the JEE chapter under Physics is invalid in NEET
    const crossed = sanitizeCascadeValues({ domain: 'competitive', examFamily: 'NEET', subject: 'Physics', chapter: 'Rotational Motion' }, FAMILY_TREE)
    expect(crossed).toMatchObject({ examFamily: 'NEET', subject: 'Physics', chapter: '', topic: '' })
  })

  it('transitively clears all strict descendants of an invalidated key', () => {
    // invalidate the top: domain switches competitive → university
    const switched = { domain: 'university', examFamily: 'NEET', subject: 'Biology', chapter: 'Genetics', topic: 'Mendel' }
    const sanitized = sanitizeCascadeValues(switched, FAMILY_TREE)
    expect(sanitized).toMatchObject({ domain: 'university', examFamily: '', subject: '', chapter: '', topic: '' })
  })

  it('never touches keys outside the declared dependency graph', () => {
    const next = sanitizeCascadeValues(
      { domain: 'competitive', examFamily: 'JEE', subject: 'Physics', search: 'torque', sourceType: 'NCERT' },
      FAMILY_TREE,
    )
    expect(next.search).toBe('torque')
    expect(next.sourceType).toBe('NCERT')
  })

  it('supports per-key empty sentinels (clear = "All …")', () => {
    const cascade = createFilterCascade({
      dependencies: { chapter: ['subject'] },
      emptyValues: { subject: 'All subjects', chapter: 'All chapters' },
      deriveOptions: (key, values) => (key === 'subject' ? ['Physics', 'Chemistry'] : values.subject === 'Physics' ? ['Optics'] : ['Algebra']),
    })
    const next = cascade.sanitize({ subject: 'Physics', chapter: 'Algebra' })
    expect(next).toEqual({ subject: 'Physics', chapter: 'All chapters' })
    const kept = cascade.sanitize({ subject: 'All subjects', chapter: 'Optics' })
    expect(kept.subject).toBe('All subjects') // sentinel is never "invalidated"
  })

  it('keeps values while an async option list is still empty (default) — and clears them in strict mode', () => {
    const cfg = {
      dependencies: { subject: [] },
      deriveOptions: () => [],
    }
    const loose = sanitizeCascadeValues({ subject: 'Physics' }, cfg)
    expect(loose.subject).toBe('Physics')

    const strict = sanitizeCascadeValues({ subject: 'Physics' }, { ...cfg, treatEmptyOptionsAsInvalid: true })
    expect(strict.subject).toBe('')
  })
})

describe('deriveCascadeOptions', () => {
  it('derives every declared key from the current (sanitized) values', () => {
    const options = deriveCascadeOptions(
      { domain: 'competitive', examFamily: 'NEET', subject: 'Physics', chapter: 'Optics' },
      FAMILY_TREE,
    )
    expect(options.examFamily).toEqual(['JEE', 'NEET'])
    expect(options.subject).toEqual(['Physics', 'Biology'])
    expect(options.chapter).toEqual(['Optics'])
    expect(options.topic).toEqual(['Lenses'])
  })
})
