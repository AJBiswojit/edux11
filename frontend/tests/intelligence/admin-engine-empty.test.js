import { describe, expect, it } from 'vitest'
import { computeAdminIntelligence } from '../../src/intelligence/admin/index.js'
import { computeStudentIntelligence } from '../../src/intelligence/admin/engine/students.js'
import { computeOutcomesHealth } from '../../src/intelligence/admin/engine/health.js'
import { computeAssessmentIntelligence } from '../../src/intelligence/admin/engine/assessments.js'

describe('Admin intelligence engines — no dataset stays empty', () => {
  it('computeAdminIntelligence({}) does not inject MIT-P / 12480 / 640', () => {
    const derived = computeAdminIntelligence({})
    const blob = JSON.stringify(derived)
    expect(derived.totals.students ?? 0).toBe(0)
    expect(derived.totals.faculty ?? 0).toBe(0)
    expect(derived.faculty.byDept).toEqual([])
    expect(derived.departments.list).toEqual([])
    expect(derived.students.totals.totalStudents).toBe(0)
    expect(derived.students.totals.flagged).toBe(0)
    expect(derived.assessments.exams.total).toBe(0)
    expect(derived.assessments.exams.averageScore).toBe(0)
    expect(derived.institutionHealth.score).toBe(0)
    expect(derived.interventions.list).toEqual([])
    expect(blob).not.toContain('MIT-P')
    expect(blob).not.toContain('12480')
    expect(blob).not.toMatch(/"faculty":640/)
    expect(blob).not.toContain('Anil')
    expect(blob).not.toContain('Meera')
    expect(blob).not.toContain('Aarav')
  })

  it('student / outcomes / assessment engines default to 0 without evidence', () => {
    const students = computeStudentIntelligence({})
    expect(students.totals.totalStudents).toBe(0)
    expect(students.totals.flagged).toBe(0)
    expect(students.riskSummary.latestRate).toBe(0)

    const outcomes = computeOutcomesHealth({})
    expect(outcomes.placementRate).toBe(0)
    expect(outcomes.grants).toBe(0)

    const assessments = computeAssessmentIntelligence({})
    expect(assessments.exams.total).toBe(0)
    expect(assessments.exams.averageScore).toBe(0)
    expect(assessments.exams.passRate).toBe(0)
    expect(assessments.assignments.total).toBe(0)
  })
})
