/**
 * Architecture guards — FRONTEND-SEEDED-QUESTION-REMOVAL.
 *
 * 1. No production module imports anything from tests/ (fixtures stay
 *    test-only forever).
 * 2. No frontend localStorage "question database" (records live only in
 *    PostgreSQL, reachable via the question-bank API).
 * 3. The frontend dataset shells that once held seeded question records
 *    stay empty — a regression that re-seeds them fails here.
 * 4. Assessment Intelligence UI no longer reads seeded record blocks out
 *    of the intelligence summary payload (records come from the live bank).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '../..')
const SRC = join(ROOT, 'src')

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const srcFiles = walk(SRC).filter((f) => /\.(js|jsx)$/.test(f))
const read = (f) => readFileSync(f, 'utf8')

describe('production never imports test fixtures', () => {
  it('0 src/ modules import from tests/', () => {
    const offenders = srcFiles.filter((f) => /from\s+['"].*\/(tests|fixtures)\//.test(read(f)))
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([])
  })
})

describe('no localStorage question database', () => {
  it('localStorage/sessionStorage keys never persist question records', () => {
    /* Legitimate persistence: auth tokens, refresh tokens, user, theme,
       and UI/session preferences (threads, history, reports library). */
    const offenders = srcFiles.filter((f) => {
      const src = read(f)
      const keyMatches = src.match(/(?:local|session)Storage\.(?:get|set|remove)Item\(\s*[`'"A-Za-z_]/g) ?? []
      return keyMatches.length > 0 && /question/i.test(src) === false
        ? false
        : /(?:local|session)Storage\.(?:get|set)Item\([^)]*question/i.test(src)
    })
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([])
  })
})

describe('frontend question dataset shells stay empty', () => {
  it('faculty questionBank shell holds no records', async () => {
    const { questionBank } = await import('../../src/datasets/faculty/workspace.js')
    expect(questionBank.questions).toEqual([])
    expect(questionBank.summary).toEqual({})
  })

  it('competitive / university PYQ pools hold no records', async () => {
    const pools = await import('../../src/intelligence/faculty/datasets/competitive-questions.js')
    expect(pools.competitiveQuestions).toEqual([])
    expect(pools.universityPyqQuestions).toEqual([])
  })

  it('Question Studio pools hold no records', async () => {
    const studio = await import('../../src/intelligence/faculty/datasets/question-studio-questions.js')
    expect(studio.questionStudioPools).toEqual({})
    expect(studio.allStudioQuestions).toEqual([])
    const sources = await import('../../src/intelligence/faculty/datasets/question-studio-sources.js')
    expect(sources.questionStudioSources).toEqual([])
  })

  it('PYQ analysis shell holds no seeded corpus', async () => {
    const { pyqAnalysis, pyqPatterns, pyqVariants } = await import('../../src/datasets/faculty/pyq-analysis.js')
    expect(pyqAnalysis.uploads).toEqual([])
    expect(pyqAnalysis.aiSuggestions).toEqual([])
    expect(pyqPatterns).toEqual([])
    expect(pyqVariants).toEqual({})
  })
})

describe('Assessment Intelligence reads records from the live bank only', () => {
  const pyqTab = read(join(SRC, 'components/assessment-workspace/pyq-intelligence-tab.jsx'))
  const qiPage = read(join(SRC, 'pages/faculty/QuestionIntelligence.jsx'))

  it('PYQ Intelligence tab no longer renders derived.competitiveQuestionIntelligence records', () => {
    expect(pyqTab).not.toMatch(/competitiveQuestionIntelligence\??\.(pyqRecords|universityPyq)/)
    expect(pyqTab).toMatch(/bankPyqBrowserRecords/)
  })

  it('the Assessment Intelligence page re-derives question stats from the live bank', () => {
    expect(qiPage).toMatch(/withLiveQuestionStats/)
    expect(qiPage).toMatch(/useFacultyQuestions/)
  })

  it('the overview no longer renders seeded prediction stems from the payload', () => {
    expect(qiPage).not.toMatch(/aiPredictedQuestions/)
  })
})
