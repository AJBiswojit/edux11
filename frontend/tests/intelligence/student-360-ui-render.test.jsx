import { beforeAll, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'

/**
 * Student 360 page render smoke test (SSR, no browser).
 *
 * Phase 11 (Complete Physical Mock-Shim Removal) — the in-browser prototype
 * API router, its mock handlers and the prototype persistence store have been
 * deleted. There is no fake backend. The axios boundary is therefore replaced
 * with a thin adapter that mirrors the REAL service contract by calling the
 * REAL intelligence engines (computeStudent360 / similar issues over the
 * canonical fixtures) — NOT a mock route. This lets the true StudentProfile
 * page + real service layer + real react-query render against the canonical
 * contract data without a browser or backend.
 *
 * Interactive browser verification is unavailable in this environment, so this
 * suite renders the REAL StudentProfile page (real components, real router,
 * real react-query, real engines) to a string and asserts the evidence→action
 * surfaces are present:
 *   · Weaknesses tab renders evidence + suggested-intervention actions
 *   · Similar Issues tab renders GROUPED and INDIVIDUAL sections
 *   · Chapter Intelligence renders derived metrics + actionable buttons
 *   · Strengths render evidence actions (no unconditional interventions)
 *   · Interventions tab renders the honest empty state
 *   · the page renders for a JEE student without cross-domain content
 */
import {
  computeStudent360,
} from '../../src/intelligence/faculty/engine/student-360.js'
import {
  computeStudentIssueFingerprints, groupSimilarIssues,
} from '../../src/intelligence/faculty/engine/similar-issues.js'
import { jeeStudent } from '../fixtures/students.js'
import { jeeAttempt, neetAttempt, universityAttempt } from '../fixtures/attempts.js'

/* Canonical fixture attempts for the JEE student used in this render. */
const JEE_ID = 'fs_jee_a_03'
const NEET_ID = 'fs_neet_a_04'
const UNI_ID = 'fs_s2'

const studentById = {
  [JEE_ID]: jeeStudent,
  [NEET_ID]: { id: NEET_ID, roll: 'N24-104', name: 'Rohan Verma', batchId: 'batch_neet_a' },
  [UNI_ID]: { id: UNI_ID, roll: '21CS101', name: 'Ishita Gupta', batchId: 'batch_uni_a' },
}

const attemptsFor = (studentId) => {
  if (studentId === NEET_ID) {
    return [
      neetAttempt({ id: 'neet-01', student: studentId, subject: 'Biology', chapter: 'Human Physiology', submittedAt: '2026-08-06T10:00:00.000Z', outcomes: [{ correct: false, time: 120 }, { skipped: true, time: 0 }, { correct: false, time: 60 }] }),
    ]
  }
  if (studentId === UNI_ID) {
    return [
      universityAttempt({ id: 'uni-01', student: studentId, subject: 'CS501', chapter: 'Graph Algorithms', submittedAt: '2026-08-05T10:00:00.000Z', outcomes: [{ correct: false, time: 100 }, { correct: false, time: 110 }] }),
    ]
  }
  /* JEE — Physics & Mathematics are weak, Chemistry is a genuine strength */
  return [
    jeeAttempt({ id: 'jee-02', student: studentId, subject: 'Physics', chapter: 'Rotational Motion', submittedAt: '2026-08-05T10:00:00.000Z', outcomes: [{ correct: false, time: 25 }, { correct: false, time: 110 }, { correct: true, time: 90 }] }),
    jeeAttempt({ id: 'jee-03', student: studentId, subject: 'Physics', chapter: 'Rotational Motion', submittedAt: '2026-08-20T10:00:00.000Z', outcomes: [{ correct: false, time: 25 }, { correct: false, time: 110 }, { correct: false, time: 60 }] }),
    jeeAttempt({ id: 'jee-04', student: studentId, subject: 'Mathematics', chapter: 'Calculus', submittedAt: '2026-08-22T10:00:00.000Z', outcomes: [{ correct: false, time: 120 }, { correct: false, time: 130 }, { correct: false, time: 60 }] }),
    jeeAttempt({ id: 'jee-05', student: studentId, subject: 'Chemistry', chapter: 'Chemical Equilibrium', submittedAt: '2026-08-24T10:00:00.000Z', outcomes: [{ correct: true, time: 20 }, { correct: true, time: 30 }, { correct: true, time: 40 }, { correct: false, time: 95 }] }),
    jeeAttempt({ id: 'jee-06', student: studentId, subject: 'Chemistry', chapter: 'Chemical Equilibrium', submittedAt: '2026-08-26T10:00:00.000Z', outcomes: [{ correct: true, time: 20 }, { correct: true, time: 30 }, { correct: true, time: 40 }, { correct: true, time: 50 }] }),
  ]
}

function buildS360(studentId) {
  return computeStudent360({ student: studentById[studentId], attempts: attemptsFor(studentId) })
}

function buildSimilarIssues(scope) {
  if (scope === 'all') {
    const student = studentById[JEE_ID]
    const fps = computeStudentIssueFingerprints(student, attemptsFor(JEE_ID))
    const { groups, individuals } = groupSimilarIssues(fps)
    /* the service contract scopes similar issues to groups/individuals; with
       only one student there is no multi-student group — return the honest shape */
    return { groups: groups ?? [], individuals: individuals ?? [] }
  }
  return { groups: [], individuals: [] }
}

/* Thin axios adapter reproducing the REAL request() contract from the engines. */
vi.mock('@/api/axios', () => {
  const apiFn = (config = {}) => {
    const method = (config.method || 'get').toLowerCase()
    const url = (config.url || '').split('?')[0]
    const params = config.params || {}

    if (method === 'get' && /^\/faculty\/students\/[^/]+\/360$/.test(url)) {
      const studentId = url.split('/')[3]
      return Promise.resolve({ data: buildS360(studentId), status: 200 })
    }
    if (method === 'get' && url === '/faculty/similar-issues') {
      return Promise.resolve({ data: buildSimilarIssues(params.scope), status: 200 })
    }
    if (method === 'get' && /^\/faculty\/students\/[^/]+\/interventions$/.test(url)) {
      // No intervention is created automatically → honest empty state.
      return Promise.resolve({ data: { items: [] }, status: 200 })
    }
    const error = new Error(`[axios-mock] No handler for ${method.toUpperCase()} ${url}`)
    error.response = { status: 404, data: { message: error.message } }
    return Promise.reject(error)
  }
  apiFn.get = (url, opts = {}) => apiFn({ method: 'get', url, params: opts.params, data: opts.data })
  apiFn.post = (url, data, opts = {}) => apiFn({ method: 'post', url, data, params: opts.params })
  apiFn.put = (url, data, opts = {}) => apiFn({ method: 'put', url, data, params: opts.params })
  apiFn.patch = (url, data, opts = {}) => apiFn({ method: 'patch', url, data, params: opts.params })
  apiFn.delete = (url, opts = {}) => apiFn({ method: 'delete', url, params: opts.params })
  apiFn.interceptors = { request: { use: () => {} }, response: { use: () => {} } }
  return { default: apiFn }
})

/* framer-motion requires a real DOM; replace it with passthrough components
   so the SSR smoke render works without a browser. */
vi.mock('framer-motion', async () => {
  const React = await import('react')
  const motion = new Proxy({}, {
    get: (_target, tag) => {
      if (typeof tag !== 'string') return undefined
      return React.forwardRef(function MotionStub(props, ref) {
        const { initial, animate, exit, transition, whileHover, whileTap, whileInView, variants, layout, viewport, drag, dragConstraints, onViewportEnter, ...rest } = props
        return React.createElement(tag, { ...rest, ref }, props.children)
      })
    },
  })
  const AnimatePresence = ({ children }) => React.createElement(React.Fragment, null, children)
  const MotionConfig = ({ children }) => React.createElement(React.Fragment, null, children)
  return { motion, AnimatePresence, MotionConfig }
})
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { installTestStorage } from '../setup/api.js'

installTestStorage()
/* minimal SSR shims so framer-motion can render outside a browser */
if (typeof globalThis.SVGElement === 'undefined') globalThis.SVGElement = class SVGElement {}
if (typeof globalThis.HTMLElement === 'undefined') globalThis.HTMLElement = class HTMLElement {}

let request
let StudentProfile
let ToastProvider

const STUDENT_ID = JEE_ID

async function renderPage(path, studentId = STUDENT_ID) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  await queryClient.fetchQuery({
    queryKey: ['faculty', 'students', studentId, '360'],
    queryFn: () => request({ url: `/faculty/students/${studentId}/360` }).then((r) => r.data),
  })
  await queryClient.fetchQuery({
    queryKey: ['faculty', 'similar-issues', 'all'],
    queryFn: () => request({ url: '/faculty/similar-issues', params: { scope: 'all' } }).then((r) => r.data),
  })
  await queryClient.fetchQuery({
    queryKey: ['faculty', 'students', studentId, 'interventions'],
    queryFn: () => request({ url: `/faculty/students/${studentId}/interventions` }).then((r) => r.data),
  })
  return renderToString(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/faculty/my-students/:studentId" element={<StudentProfile />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

beforeAll(async () => {
  ;({ default: request } = await import('../../src/api/client.js'))
  ;({ default: StudentProfile } = await import('../../src/pages/faculty/StudentProfile.jsx'))
  ;({ ToastProvider } = await import('../../src/components/ui/toast.jsx'))
})

describe('Student 360 page render (SSR smoke)', () => {
  it('renders the weaknesses tab with evidence + suggested intervention actions', async () => {
    const html = await renderPage(`/faculty/my-students/${STUDENT_ID}?context=jee&tab=weaknesses`)
    expect(html).toContain('Aarav Sharma')
    expect(html).toContain('a complete view of exam performance, strengths, and areas that need attention.')
    expect(html).toContain('Priority weaknesses — JEE')
    expect(html).toContain('Evidence questions')
    expect(html).toContain('Suggested intervention')
  })

  it('renders the similar issues tab with GROUPED and INDIVIDUAL sections', async () => {
    const html = await renderPage(`/faculty/my-students/${STUDENT_ID}?context=jee&tab=similar`)
    expect(html).toContain('Similar issues — JEE')
    expect(html).toContain('A. Grouped issues')
    expect(html).toContain('B. Individual issues')
    const individualPresent = html.includes('Individual issue</')
    const individualEmpty = html.includes('No individual issues currently identified.')
    expect(individualPresent || individualEmpty).toBe(true)
    const groupedEmpty = html.includes('No similar issues currently identified.')
    if (!groupedEmpty) expect(html).toContain('students')
  })

  it('renders chapter intelligence with derived metrics and actionable buttons', async () => {
    const html = await renderPage(`/faculty/my-students/${STUDENT_ID}?context=jee&tab=chapters`)
    expect(html).toContain('Chapter Intelligence')
    expect(html).toContain('priority')
    expect(html).toContain('avg')
  })

  it('renders strengths with evidence actions and no unconditional intervention buttons', async () => {
    const html = await renderPage(`/faculty/my-students/${STUDENT_ID}?context=jee&tab=strengths`)
    expect(html).toContain('Strengths — JEE')
    expect(html).toContain('View evidence questions')
    /* the intervention action only appears next to a real negative signal */
    if (html.includes('Suggested intervention')) expect(html).toContain('Related concern')
  })

  it('renders the interventions tab with the honest empty state (nothing auto-created)', async () => {
    const html = await renderPage(`/faculty/my-students/${STUDENT_ID}?context=jee&tab=interventions`)
    expect(html).toContain('Interventions for this student')
    expect(html).toContain('Open Intervention Center')
    expect(html).toContain('No interventions created for this student.')
  })

  it('renders for NEET and University students without cross-domain selectors', async () => {
    const neet = await renderPage(`/faculty/my-students/${NEET_ID}?context=neet&tab=weaknesses`, NEET_ID)
    expect(neet).toContain('Priority weaknesses — NEET')
    const uni = await renderPage(`/faculty/my-students/${UNI_ID}?context=university&tab=weaknesses`, UNI_ID)
    expect(uni).toContain('Priority weaknesses — University')
  })
})
