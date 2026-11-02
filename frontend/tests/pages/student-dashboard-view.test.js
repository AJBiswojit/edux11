import { describe, expect, it } from 'vitest'
import { assignmentSubtext, buildDashboardKpis, buildSubjectMasteryRows } from '../../src/pages/student/dashboard-view.js'

describe('student dashboard view', () => {
  it('does not repeat the pending assignment count beside the value', () => {
    const [assignments] = buildDashboardKpis({
      profile: { cgpa: null },
      datasets: {
        assignments: [{ status: 'Pending' }, { status: 'Graded' }],
        learningBehaviourDetailed: { assignmentCompletion: { onTime: 0 } },
        attendance: { overall: 0 },
      },
    }).filter((kpi) => kpi.id === 'assignments')

    expect(assignments.value).toBe('1')
    expect(assignments.delta).toBeUndefined()
    expect(assignments.sub).not.toContain('1')
    expect(assignmentSubtext(0, 0)).toBe('You\u2019re clear \u2014 nothing is waiting.')
  })

  it('uses each course mastery when the ranking repeats one fallback score', () => {
    const rows = buildSubjectMasteryRows({
      ranking: [
        { subjectCode: 'NEET-BIO', subject: 'Biology (NEET UG)', mastery: 90 },
        { subjectCode: 'NEET-PHY', subject: 'Physics (NEET UG)', mastery: 90 },
        { subjectCode: 'NEET-CHEM', subject: 'Chemistry (NEET UG)', mastery: 90 },
      ],
      courses: [
        { id: 'c_neet_bio', title: 'Biology (NEET UG)', color: '#ec4899', internal: 85, stats: { mastery: 85 } },
        { id: 'c_neet_phy', title: 'Physics (NEET UG)', color: '#6366f1', internal: 76, stats: { mastery: 76 } },
        { id: 'c_neet_chem', title: 'Chemistry (NEET UG)', color: '#10b981', internal: 82, stats: { mastery: 82 } },
      ],
    })

    expect(rows.map((row) => row.mastery)).toEqual([85, 76, 82])
    expect(rows.map((row) => row.subject)).toEqual([
      'Biology (NEET UG)',
      'Physics (NEET UG)',
      'Chemistry (NEET UG)',
    ])
  })

  it('keeps a varied ranking when every course shares one placeholder score', () => {
    const rows = buildSubjectMasteryRows({
      ranking: [
        { subjectCode: 'CS501', subject: 'Data Structures', mastery: 86 },
        { subjectCode: 'CS504', subject: 'Networks', mastery: 69 },
      ],
      courses: [
        { code: 'CS501', title: 'Data Structures', internal: 82, stats: { mastery: 80 } },
        { code: 'CS504', title: 'Networks', internal: 82, stats: { mastery: 80 } },
      ],
    })

    expect(rows.map((row) => row.mastery)).toEqual([86, 69])
    expect(rows.map((row) => row.subject)).toEqual(['Data Structures', 'Networks'])
  })
})
