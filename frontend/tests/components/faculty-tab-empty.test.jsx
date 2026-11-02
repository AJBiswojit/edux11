// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { FacultyTab } from '../../src/components/institution-workspace/faculty-tab.jsx'
import { act, renderDom } from '../setup/dom.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver = IntersectionObserverStub

vi.mock('@/services/faculty-intelligence', () => ({
  useFacultyIntelligence: () => ({ data: null, isLoading: false, isError: false }),
}))

vi.mock('@/services/admin-intelligence', () => ({
  useAdminTeachingIntelligence: () => ({ data: null, isLoading: false, isError: false }),
}))

vi.mock('@/components/charts', () => ({
  BarCompare: () => null,
  DonutChart: () => null,
}))

vi.mock('@/components/ui', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    Select: ({ children, value }) => <div data-testid="class-filter">{value}{children}</div>,
    SelectItem: ({ children, value }) => <span data-value={value}>{children}</span>,
  }
})

vi.mock('@/components/shared/progress-ring', () => ({
  ProgressRing: ({ label }) => <span>{label}</span>,
  default: ({ label }) => <span>{label}</span>,
}))

const cleanups = []
afterEach(() => {
  while (cleanups.length) cleanups.shift()()
  document.body.innerHTML = ''
})

function mount(data) {
  const view = renderDom(
    <MemoryRouter>
      <FacultyTab data={data} />
    </MemoryRouter>,
  )
  cleanups.push(view.unmount)
  return view.container.textContent || ''
}

describe('Admin Faculty tab — empty institution (assembler only)', () => {
  it('shows 0 faculty and does not render demo roster copy', () => {
    const text = mount({
      derived: {
        totals: { faculty: 0, departments: 0 },
        faculty: { byDept: [], health: {}, rosterCount: 0 },
      },
    })
    expect(text).toContain('No faculty records')
    expect(text).toContain('0 departments')
    expect(text).not.toMatch(/\b640\b/)
    expect(text).not.toContain('8 departments')
    expect(text).not.toContain('Sample roster')
    expect(text).not.toContain('10 of 640')
  })

  it('renders when faculty intelligence is missing (does not block the tab)', () => {
    const text = mount({ derived: { totals: { faculty: 0, departments: 0 }, faculty: { byDept: [] } } })
    expect(text).toContain('Faculty')
    expect(text).toContain('Teaching health')
    expect(text).toContain('—')
  })

  it('uses assembler totals and byDept instead of hardcoded roster numbers', () => {
    const text = mount({
      derived: {
        totals: { faculty: 12, departments: 2 },
        faculty: {
          byDept: [{ code: 'CSE', count: 7 }, { code: 'ECE', count: 5 }],
          health: { score: 70, grade: 'Good', teachingSatisfaction: 80, publicationsPerFaculty: 1.2 },
        },
      },
    })
    expect(text).toContain('12 of 12 faculty')
    expect(text).toContain('2 departments')
    expect(text).toContain('CSE')
    expect(text).toContain('ECE')
    expect(text).not.toMatch(/\b640\b/)
    expect(text).not.toContain('8 departments')
    expect(text).not.toContain('Sample roster')
  })

  it('renders class success, error groups and chapter risk from assembler teaching', () => {
    const text = mount({
      derived: {
        totals: { faculty: 2, departments: 1 },
        faculty: {
          byDept: [{ code: 'SCI', count: 2 }],
          health: { score: 70, grade: 'Good' },
          teaching: {
            classSuccess: [{ class: 'JEE Batch A', avg: 42, passRate: 0, atRisk: 2, students: 2, attempts: 2 }],
            errorGroups: [{ category: 'Concept error', count: 4, studentCount: 2 }],
            chapterRisk: [{ class: 'JEE Batch A', subject: 'Physics', chapter: 'Kinematics', studentsAtRisk: 2, avgAccuracy: 20, questions: 4, severity: 'Critical' }],
            summary: { classes: 1, studentsAtRisk: 2, errorCount: 4, chaptersNeedingImprovement: 1, weakAccuracy: 70 },
          },
        },
      },
    })
    expect(text).toContain('Class success')
    expect(text).toContain('Error grouping')
    expect(text).toContain('Students who need to improve')
    expect(text).toContain('All classes')
    expect(text).toContain('All subjects')
    expect(text).toContain('All chapters')
    expect(text).toContain('All severities')
    expect(text).toContain('Physics')
    expect(text).toContain('Kinematics')
    expect(text).toContain('Concept error')
    expect(text).toContain('JEE Batch A')
    expect(text).toContain('Click a column header to sort')
  })

  it('lists student names when hovering the at-risk count', () => {
    const view = renderDom(
      <MemoryRouter>
        <FacultyTab
          data={{
            derived: {
              totals: { faculty: 1, departments: 1 },
              faculty: {
                byDept: [{ code: 'SCI', count: 1 }],
                health: { score: 70, grade: 'Good' },
                teaching: {
                  classSuccess: [],
                  errorGroups: [],
                  chapterRisk: [{
                    class: 'NEET-2027-A',
                    subject: 'Physics',
                    chapter: 'Motion',
                    studentsAtRisk: 2,
                    avgAccuracy: 14,
                    severity: 'Critical',
                    students: [
                      { id: 's1', name: 'Meera Iyer', roll: 'N101' },
                      { id: 's2', name: 'Arjun Rao', roll: 'N102' },
                    ],
                  }],
                  summary: { classes: 1, studentsAtRisk: 2, errorCount: 0, chaptersNeedingImprovement: 1, weakAccuracy: 70 },
                },
              },
            },
          }}
        />
      </MemoryRouter>,
    )
    cleanups.push(view.unmount)
    const trigger = view.container.querySelector('[data-testid="risk-student-count"]')
    expect(trigger).toBeTruthy()
    expect(trigger.textContent).toBe('2')
    act(() => {
      trigger.click()
    })
    const tip = document.body.textContent || ''
    expect(tip).toContain('Meera Iyer')
    expect(tip).toContain('Arjun Rao')
    expect(tip).toContain('N101')
  })
})
