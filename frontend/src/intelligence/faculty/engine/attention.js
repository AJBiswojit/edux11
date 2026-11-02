/**
 * Faculty Intelligence Engine — Students Requiring Attention (pure functions).
 * Automatically categorizes AI-flagged students into intervention categories
 * (Low Attendance · Weak Performance · Pending Assignments · Low Engagement ·
 * Poor Quiz Results · Academic Decline) with reason, priority, suggested
 * action and expected improvement — derived from the weak-student detections.
 */

import { round1 } from './scores.js'

const CATEGORY_RULES = [
  { category: 'Low Attendance', test: (s) => s.some((x) => /attendance/i.test(x)) },
  { category: 'Pending Assignments', test: (s) => s.some((x) => /missed assignment|late submission/i.test(x)) },
  { category: 'Poor Quiz Results', test: (s) => s.some((x) => /quiz/i.test(x)) },
  { category: 'Weak Performance', test: (s) => s.some((x) => /plagiar|below-median|below median|below-median internals/i.test(x)) },
  { category: 'Academic Decline', test: (s) => s.some((x) => /decline|dip/i.test(x)) },
  { category: 'Low Engagement', test: (s) => s.some((x) => /participation|engagement/i.test(x)) },
]

const PRIORITY = (risk) => (risk >= 85 ? 'Critical' : risk >= 70 ? 'High' : risk >= 55 ? 'Medium' : 'Low')

const ESTIMATED_IMPROVEMENT = {
  'Low Attendance': { label: '+15% attendance', detail: 'within 4 weeks with weekly check-ins' },
  'Weak Performance': { label: '+12% score', detail: 'within 6 weeks with remedial practice' },
  'Pending Assignments': { label: '+18% completion', detail: 'within 2 weeks with deadline coaching' },
  'Low Engagement': { label: '+14% engagement', detail: 'within 4 weeks with participation nudges' },
  'Poor Quiz Results': { label: '+16% quiz score', detail: 'within 3 weeks with retake + concept clinic' },
  'Academic Decline': { label: '+11% score', detail: 'within 6 weeks with structured revision plan' },
}

/* ---------- Students requiring attention ---------- */
export function computeAttentionStudents({ weakStudentDetection }) {
  const detections = (weakStudentDetection?.detections ?? []).filter((d) => d.status !== 'Cleared')

  const items = detections.map((d) => {
    const signals = d.signals ?? []
    const rule = CATEGORY_RULES.find((r) => r.test(signals)) ?? CATEGORY_RULES[5]
    const extras = CATEGORY_RULES.filter((r) => r !== rule && r.test(signals)).map((r) => r.category)
    const improvement = ESTIMATED_IMPROVEMENT[rule.category] ?? ESTIMATED_IMPROVEMENT['Low Engagement']
    return {
      id: d.id,
      name: d.name,
      roll: d.roll,
      course: d.course,
      risk: d.risk,
      confidence: d.confidence,
      status: d.status,
      category: rule.category,
      tags: [rule.category, ...extras],
      reason: signals.join(' · '),
      priority: PRIORITY(d.risk),
      suggestedAction: d.recommended ?? 'Schedule a 1:1 check-in',
      estimatedImprovement: improvement.label,
      improvementDetail: improvement.detail,
      confidenceLabel: d.confidence >= 90 ? 'High confidence' : d.confidence >= 80 ? 'Moderate confidence' : 'Low confidence',
    }
  }).sort((a, b) => b.risk - a.risk)

  const byCategory = {}
  items.forEach((s) => {
    byCategory[s.category] = byCategory[s.category] ?? []
    byCategory[s.category].push(s)
  })

  const summary = Object.keys(byCategory).map((category) => ({
    category,
    count: byCategory[category].length,
    topRisk: Math.max(...byCategory[category].map((s) => s.risk)),
  })).sort((a, b) => b.count - a.count)

  return {
    items,
    summary,
    byCategory,
    total: items.length,
    critical: items.filter((s) => s.priority === 'Critical').length,
    high: items.filter((s) => s.priority === 'High').length,
    avgRisk: items.length ? round1(items.reduce((a, s) => a + s.risk, 0) / items.length) : 0,
  }
}

export default computeAttentionStudents
