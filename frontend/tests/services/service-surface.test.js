import { describe, expect, it } from 'vitest'

/**
 * Service/API surface protection suite — Phase 11 (Complete Physical Mock-Shim
 * Removal).
 *
 * Phase 11 deleted the in-browser prototype API router, its mock route
 * handlers, the prototype stores and the fake persistence entirely. There is
 * NO fake backend, no mock router and no seeded response available to tests.
 *
 * What this suite therefore guarantees:
 *   · the production API layer is a STRICT backend consumer — the central
 *     axios client + `request()` wrapper only, no route module, no dispatch;
 *   · the intelligence engines are pure functions over the canonical fixture
 *     attempts (University / JEE / NEET domain isolation preserved);
 *   · backend-owned examination datasets carry NO seeded/mock fallback
 *     (paperGenerator.generatedPapers, student academics mockTests/exams).
 *
 * It does NOT assert route presence/absence via a mock server — that
 * infrastructure is gone. Those assertions were removed because they only
 * verified deleted mock infrastructure.
 */

describe('Phase 11 — production runtime is a strict backend consumer', () => {
  it('the prototype mock router is removed from production src/api', () => {
    // The in-browser prototype adapter no longer exists anywhere in the repo.
    // Production src/api exposes ONLY the central axios client + request().
    expect(() => import.meta.resolve('@/api/core/router.js')).toThrow()
  })

  it('the API index exposes only the central client and request() wrapper', async () => {
    const mod = await import('@/api/index.js')
    expect(typeof mod.default).toBe('function') // request()
    expect(mod.request).toBe(mod.default)
    expect(mod.api).toBeTruthy() // axios instance
    // No route registry / dispatchRequest / mock router is exported.
    expect(mod.router).toBeUndefined()
    expect(mod.dispatchRequest).toBeUndefined()
  })

  it('src/api contains no route/handler modules', async () => {
    const reg = await import.meta.glob('/src/api/**/*.js')
    const modules = Object.keys(reg)
    expect(modules.some((p) => /router|dispatch|route|handler|mock/i.test(p))).toBe(false)
    // Only the central client surface is present.
    expect(modules).toContain('/src/api/client.js')
    expect(modules).toContain('/src/api/axios.js')
    expect(modules).toContain('/src/api/index.js')
  })
})

describe('backend-owned examination datasets carry no mock fallback', () => {
  it('Phase 9 — paper generator is backend-only, no generatedPapers fallback', async () => {
    const { paperGenerator } = await import('@/datasets/faculty/paper-generator.js')
    expect(paperGenerator.generatedPapers.length).toBe(0)
  })

  it('Phase 9 — student examinations are backend-only, no seeded exams/mock tests', async () => {
    const { mockTests, exams } = await import('@/datasets/student/academics.js')
    expect(mockTests.length).toBe(0)
    expect(exams.length).toBe(0)
  })

  it('workspace intelligence datasets never include seeded authoritative exam attempts', async () => {
    const workspace = await import('@/intelligence/datasets/workspace.js')
    // The intelligence workspace holds assistant/conversation/dropdown content,
    // never an authoritative ExamAttempt store (backend-owned).
    for (const key of ['aiConversations', 'suggestedQuestions', 'quickPrompts', 'resourceRecommendations', 'generatedNotes', 'downloads', 'completedRecommendations']) {
      expect(Array.isArray(workspace[key])).toBe(true)
    }
    // There is no exam/attempt export on this module at all.
    expect(Object.keys(workspace).some((k) => /attempt|examAttempt|scoring/i.test(k))).toBe(false)
  })
})

describe('canonical ExamAttempt domain isolation (University/JEE/NEET)', () => {
  it('classifies University / JEE / NEET contexts without leaking across filters', async () => {
    const { classifyAttemptContext } = await import('@/intelligence/engine/exam-attempt-intelligence.js')
    expect(classifyAttemptContext({ examMode: 'University', examFamily: null }).domain).toBe('university')
    expect(classifyAttemptContext({ examMode: 'Competitive', examFamily: 'JEE' }).examFamily).toBe('JEE')
    expect(classifyAttemptContext({ examMode: 'Competitive', examFamily: 'NEET' }).examFamily).toBe('NEET')
  })
})
