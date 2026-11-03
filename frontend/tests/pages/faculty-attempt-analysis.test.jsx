// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderDom, settle } from '../setup/dom.js'

const h = vi.hoisted(() => ({
  state: {
    analysis: {
      meta: { examId: 'EX-1', examName: 'NEET UG · Full Mock 01' },
      attempt: { roll: 'DEV-STU-001' },
      hero: {}, questionIntelligence: {}, subjects: [], chapters: [],
      topics: [], mistakes: [], questionReview: [], recommendations: {},
    },
    profile: { student: { name: 'Dev Student', roll: 'DEV-STU-001' } },
    analysisLoading: false,
    analysisError: false,
    pathname: '/faculty/my-students/u_dev_student/exams/ATT-1',
  },
  toast: { success: vi.fn(), error: vi.fn() },
  exportAnalysisPDF: vi.fn(),
  exportFullAnalysisPDF: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  const { createElement } = await import('react')
  return {
    ...actual,
    useParams: () => ({ studentId: 'u_dev_student', attemptId: 'ATT-1' }),
    useLocation: () => ({ pathname: h.state.pathname }),
    Link: ({ children, to, ...rest }) => createElement('a', { href: to, ...rest }, children),
  }
})

vi.mock('@/services/faculty-students', () => ({
  useFacultyAttemptAnalysis: () => ({
    data: h.state.analysis,
    isLoading: h.state.analysisLoading,
    isError: h.state.analysisError,
    refetch: vi.fn(),
  }),
  useFacultyStudent360: () => ({ data: h.state.profile, isLoading: false, isError: false }),
}))

vi.mock('@/pages/student/exam-analysis-pdf', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    exportAnalysisPDF: h.exportAnalysisPDF,
    exportFullAnalysisPDF: h.exportFullAnalysisPDF,
  }
})

vi.mock('@/components/ui', async () => {
  const { createElement } = await import('react')
  return {
    Badge: ({ children }) => createElement('span', { 'data-testid': 'badge' }, children),
    Button: ({ children, disabled, onClick }) => createElement('button', { type: 'button', disabled, onClick }, children),
    useToast: () => h.toast,
  }
})

vi.mock('@/components/shared/page-header', async () => {
  const { createElement } = await import('react')
  return {
    PageHeader: ({ title, actions }) => createElement(
      'div',
      { 'data-testid': 'page-header' },
      createElement('h1', null, title),
      actions,
    ),
  }
})

vi.mock('@/components/shared/loading', () => ({
  DashboardSkeleton: () => null,
  ErrorState: () => null,
}))

vi.mock('@/pages/student/ExamAnalysis', () => ({
  AnalysisDashboard: () => null,
}))

import FacultyAttemptAnalysis from '../../src/pages/faculty/FacultyAttemptAnalysis.jsx'

const buttons = (container) => [...container.querySelectorAll('button')]
const byText = (container, text) => buttons(container).find((b) => b.textContent.trim() === text)
const click = async (button) => {
  await act(async () => { button.click() })
  await settle()
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  vi.clearAllMocks()
  h.state.analysis = {
    meta: { examId: 'EX-1', examName: 'NEET UG · Full Mock 01' },
    attempt: { roll: 'DEV-STU-001' },
    hero: {}, questionIntelligence: {}, subjects: [], chapters: [],
    topics: [], mistakes: [], questionReview: [], recommendations: {},
  }
  h.state.profile = { student: { name: 'Dev Student', roll: 'DEV-STU-001' } }
  h.state.analysisLoading = false
  h.state.analysisError = false
  h.state.pathname = '/faculty/my-students/u_dev_student/exams/ATT-1'
  h.exportAnalysisPDF.mockResolvedValue({ pageCount: 4, flags: [] })
  h.exportFullAnalysisPDF.mockResolvedValue({ pageCount: 13, flags: [] })
})

afterEach(() => {
  vi.restoreAllMocks()
  globalThis.IS_REACT_ACT_ENVIRONMENT = false
})

describe('Faculty/Admin attempt analysis — premium PDF actions', () => {
  it('renders Report + Full Analysis (no single PDF button) and passes the real student identity', async () => {
    const { container, unmount } = renderDom(<FacultyAttemptAnalysis />)
    expect(byText(container, 'Report')).toBeTruthy()
    expect(byText(container, 'Full Analysis')).toBeTruthy()
    expect(byText(container, 'PDF')).toBeUndefined()
    expect(buttons(container)).toHaveLength(2)

    await click(byText(container, 'Report'))
    expect(h.exportAnalysisPDF).toHaveBeenCalledOnce()
    expect(h.exportAnalysisPDF).toHaveBeenCalledWith(
      h.state.analysis,
      'All Subjects',
      { fullName: 'Dev Student', rollNo: 'DEV-STU-001' },
    )

    await click(byText(container, 'Full Analysis'))
    expect(h.exportFullAnalysisPDF).toHaveBeenCalledOnce()
    expect(h.exportFullAnalysisPDF).toHaveBeenCalledWith(
      h.state.analysis,
      'All Subjects',
      { fullName: 'Dev Student', rollNo: 'DEV-STU-001' },
    )

    expect(h.toast.success).toHaveBeenCalledTimes(2)
    expect(h.toast.success).toHaveBeenCalledWith('Report downloaded', expect.any(String))
    expect(h.toast.success).toHaveBeenCalledWith('Full analysis downloaded', expect.any(String))
    expect(h.toast.error).not.toHaveBeenCalled()
    unmount()
  })

  it('provides the same two actions on the Admin route', () => {
    h.state.pathname = '/admin/students/u_dev_student/exams/ATT-1'
    const { container, unmount } = renderDom(<FacultyAttemptAnalysis />)
    expect(byText(container, 'Report')).toBeTruthy()
    expect(byText(container, 'Full Analysis')).toBeTruthy()
    expect(byText(container, 'PDF')).toBeUndefined()
    unmount()
  })

  it('keeps loading states independent and blocks duplicate clicks of the same action', async () => {
    let resolveReport
    h.exportAnalysisPDF.mockImplementation(() => new Promise((resolve) => { resolveReport = resolve }))

    const { container, unmount } = renderDom(<FacultyAttemptAnalysis />)
    const report = byText(container, 'Report')
    const full = byText(container, 'Full Analysis')

    // Two rapid clicks: the ref lock must allow only one export.
    await act(async () => { report.click(); report.click() })
    await settle()
    expect(h.exportAnalysisPDF).toHaveBeenCalledOnce()
    expect(report.disabled).toBe(true)
    expect(full.disabled).toBe(false)
    expect(container.querySelector('.animate-spin')).toBeTruthy()

    // The other action is still usable while Report is busy.
    await click(full)
    expect(h.exportFullAnalysisPDF).toHaveBeenCalledOnce()
    expect(h.toast.success).toHaveBeenCalledWith('Full analysis downloaded', expect.any(String))

    await act(async () => { resolveReport({ pageCount: 4, flags: [] }) })
    await settle()
    expect(report.disabled).toBe(false)
    expect(h.toast.success).toHaveBeenCalledWith('Report downloaded', expect.any(String))
    unmount()
  })

  it('logs the exact exception and stack in DEV, shows a friendly toast, and resets both buttons', async () => {
    const reportError = new Error('Report asset failed')
    reportError.stack = 'Error: Report asset failed\n    at loadBrowserAssets'
    const fullError = new Error('Full asset failed')
    fullError.stack = 'Error: Full asset failed\n    at loadBrowserAssets'
    h.exportAnalysisPDF.mockRejectedValue(reportError)
    h.exportFullAnalysisPDF.mockRejectedValue(fullError)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container, unmount } = renderDom(<FacultyAttemptAnalysis />)
    await click(byText(container, 'Report'))
    await click(byText(container, 'Full Analysis'))

    expect(spy).toHaveBeenCalledWith('[EduX PDF Export] Report failed', reportError)
    expect(spy).toHaveBeenCalledWith('[EduX PDF Export] Report stack', reportError.stack)
    expect(spy).toHaveBeenCalledWith('[EduX PDF Export] Full Analysis failed', fullError)
    expect(spy).toHaveBeenCalledWith('[EduX PDF Export] Full Analysis stack', fullError.stack)

    expect(h.toast.error).toHaveBeenCalledTimes(2)
    expect(h.toast.error).toHaveBeenCalledWith('PDF failed', 'Could not create the report. Please try again.')
    expect(h.toast.error).toHaveBeenCalledWith('PDF failed', 'Could not create the full analysis. Please try again.')
    expect(h.toast.success).not.toHaveBeenCalled()
    expect(buttons(container).every((b) => !b.disabled)).toBe(true)
    unmount()
  })

  it('falls back to the roll label without inventing a name or using staff identity', async () => {
    h.state.profile = { student: { roll: 'DEV-STU-001' } }
    const { container, unmount } = renderDom(<FacultyAttemptAnalysis />)
    await click(byText(container, 'Report'))
    expect(h.exportAnalysisPDF).toHaveBeenCalledWith(
      h.state.analysis,
      'All Subjects',
      { fullName: 'Roll DEV-STU-001', rollNo: 'DEV-STU-001' },
    )
    unmount()
  })

  it('falls back to the analysis payload when the student-profile request is unavailable', async () => {
    h.state.profile = undefined
    h.state.analysis.attempt = { roll: 'PAYLOAD-ROLL', studentName: 'Payload Student' }
    const { container, unmount } = renderDom(<FacultyAttemptAnalysis />)
    await click(byText(container, 'Report'))
    expect(h.exportAnalysisPDF).toHaveBeenCalledWith(
      h.state.analysis,
      'All Subjects',
      { fullName: 'Payload Student', rollNo: 'PAYLOAD-ROLL' },
    )
    unmount()
  })
})
