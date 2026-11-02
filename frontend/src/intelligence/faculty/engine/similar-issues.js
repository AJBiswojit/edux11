/**
 * Faculty Intelligence Engine — SIMILAR-ISSUE + INTERVENTION FOUNDATION (Phase 5).
 *
 * Consumes the EXISTING derived intelligence (canonical attempts →
 * buildAttemptSignals from the Phase 2 adapter) and produces:
 *
 *   · computeIssueFingerprints()   — deterministic per-student issue
 *     fingerprints (dimensions: domain · examFamily · subject · chapter ·
 *     issueType · severity · accuracy/time/skip bands · trend · persistence)
 *   · groupSimilarIssues()         — partition-based grouping
 *     (domain → examFamily → subject → chapter — NO cross-domain mixing,
 *     NO O(n²) across partitions); pairwise weighted "AI Similarity Score";
 *     groups of ≥2 students; single matches → "Individual issue".
 *   · computeInterventions()       — evidence-based recommendations with
 *     derived priority + status (Detected / Recommended / Planned).
 *
 * SAFETY (deliberate):
 *   · issueType is CONSERVATIVE — "Conceptual Weakness" is never claimed
 *     from accuracy alone; falls back to "Performance Gap".
 *   · no psychological claims, no automatic delivery, no re-tests.
 *   · similarity is labelled a prototype "AI Similarity Score", not
 *     scientifically validated.
 */

import { round1, avg } from './scores.js'
import { buildAttemptSignals } from '@/intelligence/engine/exam-attempt-intelligence.js'

/* ------------------------------------------------------------------ */
/* Fingerprint                                                         */
/* ------------------------------------------------------------------ */

const accuracyBand = (acc) => (acc == null ? 'none' : acc < 45 ? 'low' : acc < 60 ? 'mid-low' : acc < 75 ? 'mid-high' : 'high')
const timeBand = (t) => (t == null ? 'none' : t < 60 ? 'fast' : t <= 100 ? 'normal' : 'high')
const skipBand = (r) => (r == null ? 'none' : r === 0 ? 'none' : r < 0.15 ? 'low' : r < 0.3 ? 'mid' : 'high')

/** Conservative issue-type classification from observable evidence. */
export function classifyIssueType({ status, trend, accuracy, highTime, incorrect, skipRate, careless, questions, attempted }) {
  if (status === 'persistent') return 'Persistent Weakness'
  if (trend === 'declining' && accuracy < 65) return 'Declining Performance'
  if (accuracy < 55) return 'Low Accuracy'
  if (highTime && accuracy < 75 && incorrect >= 2) return 'Time Management'
  if (skipRate >= 0.25 && questions >= 5) return 'High Skip Rate'
  if (careless >= 2) return 'Careless Errors'
  if (accuracy < 75 && attempted >= 3) return 'Performance Gap'
  return null
}

export function deriveIssueSeverity({ issueType, accuracy, highTime, persistent, declining }) {
  if ((accuracy != null && accuracy < 45) && (persistent || declining)) return 'Critical'
  if (accuracy != null && accuracy < 55) return 'High'
  if (issueType === 'Persistent Weakness') return 'High'
  if (accuracy != null && accuracy < 70) return 'High'
  if (highTime || issueType === 'Time Management' || issueType === 'Declining Performance') return 'Medium'
  return 'Low'
}

/** Builds one student's issue fingerprints from their canonical attempts. */
export function computeStudentIssueFingerprints(student, attempts = []) {
  const manual = (attempts ?? []).filter((a) => a?.mode !== 'demo')
  if (!manual.length) return []
  const signals = buildAttemptSignals(manual)

  /* error counts from question-level evidence (classification already computed) */
  let careless = 0
  manual.forEach((a) => {
    ;(a.questionAttempts ?? []).forEach((q) => {
      if (q.evaluation?.classification === 'fast-incorrect') careless += 1
    })
  })

  const allChapters = [...signals.university.chapters, ...signals.competitive.JEE.chapters, ...signals.competitive.NEET.chapters]
  const fps = []

  allChapters.forEach((c) => {
    if (!c.chapter) return
    const skipRate = c.questions ? c.skipped / c.questions : 0
    const highTime = c.avgTime != null && c.avgTime >= 100
    const attempted = c.attempted ?? 0
    const issueType = classifyIssueType({
      status: c.status, trend: c.trend, accuracy: c.accuracy, highTime,
      incorrect: c.incorrect ?? 0, skipRate, careless, questions: c.questions ?? 0, attempted,
    })
    if (!issueType) return
    if (attempted < 2) return /* never label from one question */
    const persistent = c.status === 'persistent'
    const declining = c.trend === 'declining'
    const severity = deriveIssueSeverity({ issueType, accuracy: c.accuracy, highTime, persistent, declining })
    const lastExam = [...manual].sort((a, b) => String(b.submittedAt ?? '').localeCompare(String(a.submittedAt ?? '')))[0]
    fps.push({
      studentId: student.id,
      roll: student.roll,
      name: student.name,
      batchId: student.batchId,
      domain: c.domain === 'university' ? 'University' : 'Competitive',
      examFamily: c.domain === 'university' ? null : c.domain,
      subject: c.subject,
      chapter: c.chapter,
      issueType,
      severity,
      accuracy: c.accuracy,
      accuracyBand: accuracyBand(c.accuracy),
      avgTime: c.avgTime,
      timeBand: timeBand(c.avgTime),
      highTime,
      skipRate: round1(skipRate * 100),
      skipBand: skipBand(skipRate),
      incorrect: c.incorrect ?? 0,
      skipped: c.skipped ?? 0,
      questions: c.questions ?? 0,
      attempted,
      trend: c.trend,
      status: c.status,
      persistence: c.attempts ?? 1,
      careless,
      evidence: {
        attempts: c.attempts ?? 0,
        questions: c.questions ?? 0,
        accuracy: c.accuracy ?? 0,
        avgTime: c.avgTime ?? 0,
        incorrect: c.incorrect ?? 0,
        skipped: c.skipped ?? 0,
      },
      lastExam: lastExam ? { id: lastExam.id, examId: lastExam.examId, title: lastExam.examName ?? lastExam.examTitle, date: (lastExam.submittedAt ?? '').slice(0, 10) } : null,
      series: c.series ?? [],
    })
  })
  return fps
}

/* ------------------------------------------------------------------ */
/* Similarity + grouping                                              */
/* ------------------------------------------------------------------ */

/**
 * Transparent weighted "AI Similarity Score" between two fingerprints of
 * the SAME partition (domain+family+subject+chapter are guaranteed equal
 * by the partition — those 0.55 base points are structural, not claimed
 * as insight). Remaining weights: issueType 0.15 · accuracyBand 0.10 ·
 * timeBand 0.10 · trend 0.05 · skipBand 0.05. Prototype label, not a
 * validated measure.
 */
export const SIMILARITY_WEIGHTS = {
  issueType: 0.15, accuracyBand: 0.1, timeBand: 0.1, trend: 0.05, skipBand: 0.05,
}

export function similarityBetween(a, b) {
  let score = 0.55 /* same partition (domain+family+subject+chapter) */
  if (a.issueType === b.issueType) score += SIMILARITY_WEIGHTS.issueType
  if (a.accuracyBand === b.accuracyBand) score += SIMILARITY_WEIGHTS.accuracyBand
  if (a.timeBand === b.timeBand) score += SIMILARITY_WEIGHTS.timeBand
  if (a.trend === b.trend) score += SIMILARITY_WEIGHTS.trend
  if (a.skipBand === b.skipBand) score += SIMILARITY_WEIGHTS.skipBand
  return Math.round(Math.min(1, score) * 100) / 100
}

const GROUP_THRESHOLD = 0.85

/** Union-find over fingerprints; edges = similarity ≥ threshold. */
function unionFind(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x] } return x }
  edges.forEach(([a, b]) => { parent[find(a)] = find(b) })
  const groups = new Map()
  for (let i = 0; i < n; i += 1) {
    const root = find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(i)
  }
  return [...groups.values()]
}

/**
 * Groups issue fingerprints: partition by domain → examFamily → subject →
 * chapter (no cross-domain mixing, no O(n²) across partitions), then
 * connect fingerprints whose similarity ≥ 0.85. Groups need ≥ 2 students;
 * singletons become "Individual issue" entries.
 */
export function groupSimilarIssues(fingerprints = []) {
  const partitions = new Map()
  ;(fingerprints ?? []).forEach((f) => {
    const key = `${f.domain}|${f.examFamily ?? 'uni'}|${f.subject ?? '?'}|${f.chapter ?? '?'}`
    if (!partitions.has(key)) partitions.set(key, [])
    partitions.get(key).push(f)
  })

  const groups = []
  const individuals = []
  let seq = 0

  partitions.forEach((members) => {
    if (members.length < 2) {
      members.forEach((f) => individuals.push(f))
      return
    }
    /* pairwise similarity within the partition only */
    const edges = []
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        if (similarityBetween(members[i], members[j]) >= GROUP_THRESHOLD) edges.push([i, j])
      }
    }
    const components = unionFind(members.length, edges)
    components.forEach((indices) => {
      const fps = indices.map((i) => members[i])
      if (fps.length < 2) {
        fps.forEach((f) => individuals.push(f))
        return
      }
      groups.push(buildGroup(fps, seq++))
    })
  })

  return { groups, individuals }
}

function buildGroup(fps, seq) {
  const avgAcc = round1(avg(fps.map((f) => f.accuracy ?? 0)))
  const avgTime = round1(avg(fps.map((f) => f.avgTime ?? 0)))
  const totalIncorrect = fps.reduce((n, f) => n + (f.incorrect ?? 0), 0)
  const totalQuestions = fps.reduce((n, f) => n + (f.questions ?? 0), 0)
  const totalSkipped = fps.reduce((n, f) => n + (f.skipped ?? 0), 0)
  const maxSeverity = fps.some((f) => f.severity === 'Critical') ? 'Critical'
    : fps.some((f) => f.severity === 'High') ? 'High'
      : fps.some((f) => f.severity === 'Medium') ? 'Medium' : 'Low'
  const persistent = fps.some((f) => f.persistence >= 2 && f.status === 'persistent')
  const declining = fps.some((f) => f.trend === 'declining')
  const highTime = fps.some((f) => f.highTime)
  const maxPersistence = Math.max(...fps.map((f) => f.persistence ?? 1))
  const affectedExams = new Set(fps.flatMap((f) => (f.series ?? []).map((s) => s.date))).size
  const batches = [...new Set(fps.map((f) => f.batchId))]
  const students = fps.map((f) => ({
    studentId: f.studentId, roll: f.roll, name: f.name, batchId: f.batchId,
    accuracy: f.accuracy, severity: f.severity, avgTime: f.avgTime, trend: f.trend,
    status: f.status, evidence: f.evidence, lastExam: f.lastExam,
  }))
  const first = fps[0]
  const domainLabel = first.domain === 'University'
    ? `University — ${first.subject ?? '?'} — ${first.chapter}`
    : `${first.examFamily} ${first.subject} — ${first.chapter}`
  return {
    id: `issue-group-${seq + 1}`,
    name: domainLabel,
    domain: first.domain,
    examFamily: first.examFamily,
    subject: first.subject,
    chapter: first.chapter,
    issueType: first.issueType,
    severity: maxSeverity,
    persistent,
    declining,
    highTime,
    studentCount: students.length,
    students,
    batchIds: batches,
    batches,
    avgAccuracy: avgAcc,
    avgTime,
    totalIncorrect,
    totalSkipped,
    totalQuestions,
    affectedExams,
    maxPersistence,
    trend: persistent ? 'Persistent' : declining ? 'Declining' : first.trend,
    evidence: {
      students: students.length,
      subject: first.subject,
      chapter: first.chapter,
      issueType: first.issueType,
      avgAccuracy: avgAcc,
      avgTime,
      questions: totalQuestions,
      incorrect: totalIncorrect,
      skipped: totalSkipped,
      affectedExams,
      persistence: maxPersistence,
      trend: persistent ? 'persistent' : declining ? 'declining' : first.trend,
    },
    whyDetected: buildWhyDetected(first, fps),
    recommendation: buildRecommendation(first, { avgAcc, highTime, persistent, declining, skipRate: round1(avg(fps.map((f) => f.skipRate ?? 0))) }),
    priority: derivePriority({ severity: maxSeverity, count: students.length, persistent, declining }),
  }
}

/** Why this group exists — generated from the actual data. */
function buildWhyDetected(first, fps) {
  const n = fps.length
  const acc = round1(avg(fps.map((f) => f.accuracy ?? 0)))
  const time = round1(avg(fps.map((f) => f.avgTime ?? 0)))
  const pers = fps.some((f) => f.persistence >= 2)
  const decl = fps.some((f) => f.trend === 'declining')
  const parts = [
    `${n} students showed ${acc}% average accuracy in ${first.chapter} (${first.subject})`,
    pers ? 'across at least 2 assessments' : 'across recent assessments',
  ]
  if (time >= 100) parts.push(`with average time ${time} seconds (above the 100s threshold)`)
  if (decl) parts.push('with a declining performance trend')
  return parts.join(', ') + '.'
}

/**
 * Why this SINGLE-student issue exists — deterministic template grounded only
 * in the fingerprint's own numbers (no psychological claims, no inference
 * beyond observable status/trend/time/skip facts).
 */
export function buildIndividualWhyDetected(f = {}) {
  const attempts = f.persistence ?? f.evidence?.attempts ?? 1
  const questions = f.questions ?? f.evidence?.questions ?? 0
  const incorrect = f.incorrect ?? f.evidence?.incorrect ?? 0
  const skipped = f.skipped ?? f.evidence?.skipped ?? 0
  const accuracy = f.accuracy ?? f.evidence?.accuracy ?? null
  const avgTime = f.avgTime ?? f.evidence?.avgTime ?? null
  const parts = []
  if (f.status === 'persistent') {
    parts.push(`Performance remained below the configured threshold across ${attempts} attempt${attempts === 1 ? '' : 's'} with ${incorrect} incorrect response${incorrect === 1 ? '' : 's'}`)
  } else if (f.trend === 'declining') {
    const first = (f.series ?? []).find((s) => s?.accuracy != null)?.accuracy
    parts.push(first != null && accuracy != null
      ? `Accuracy declined from ${first}% to ${accuracy}% across ${attempts} attempt${attempts === 1 ? '' : 's'}`
      : `Accuracy declined across ${attempts} attempt${attempts === 1 ? '' : 's'} to ${accuracy ?? '—'}%`)
  } else if (accuracy != null && accuracy < 55) {
    parts.push(`Accuracy of ${accuracy}% across ${questions} question${questions === 1 ? '' : 's'} (${incorrect} incorrect) is below the 55% threshold`)
  } else {
    parts.push(`${incorrect} of ${questions} question${questions === 1 ? '' : 's'} were answered incorrectly (${accuracy ?? '—'}% accuracy)`)
  }
  if (f.highTime && avgTime != null) parts.push(`average time ${avgTime}s exceeds the 100s threshold`)
  if ((f.skipRate ?? 0) >= 15 && questions > 0) parts.push(`${skipped} of ${questions} question${questions === 1 ? '' : 's'} were skipped`)
  return `${parts.join(', ')}.`
}

/**
 * Phase 5 hardening — canonical view of an INDIVIDUAL issue: a fingerprint
 * that did not join any ≥2-student group. Reuses the SAME fingerprint fields,
 * issue types, severity and priority rules (derivePriority with count 1) —
 * this is a presentation view, NOT a second classifier.
 */
export function buildIndividualIssue(fingerprint = {}) {
  const persistent = fingerprint.status === 'persistent'
  const declining = fingerprint.trend === 'declining'
  return {
    studentId: fingerprint.studentId,
    roll: fingerprint.roll,
    name: fingerprint.name,
    batchId: fingerprint.batchId,
    domain: fingerprint.domain,
    examFamily: fingerprint.examFamily ?? null,
    subject: fingerprint.subject,
    chapter: fingerprint.chapter,
    issueType: fingerprint.issueType,
    severity: fingerprint.severity,
    priority: derivePriority({ severity: fingerprint.severity, count: 1, persistent, declining }),
    accuracy: fingerprint.accuracy ?? null,
    avgTime: fingerprint.avgTime ?? null,
    trend: fingerprint.trend ?? null,
    status: fingerprint.status ?? null,
    persistence: fingerprint.persistence ?? fingerprint.evidence?.attempts ?? 1,
    incorrect: fingerprint.incorrect ?? fingerprint.evidence?.incorrect ?? 0,
    skipped: fingerprint.skipped ?? fingerprint.evidence?.skipped ?? 0,
    questions: fingerprint.questions ?? fingerprint.evidence?.questions ?? 0,
    skipRate: fingerprint.skipRate ?? null,
    highTime: !!fingerprint.highTime,
    evidence: fingerprint.evidence ?? null,
    lastExam: fingerprint.lastExam ?? null,
    whyDetected: buildIndividualWhyDetected(fingerprint),
    evidenceQuestionCount: fingerprint.evidence?.questions
      ?? (fingerprint.questions ?? 0),
    grouped: false,
  }
}

/* ------------------------------------------------------------------ */
/* Recommendations + priority                                         */
/* ------------------------------------------------------------------ */

export function buildRecommendation(first, ctx = {}) {
  const { avgAcc, highTime, persistent, declining, skipRate } = ctx
  const ch = first.chapter
  const subj = first.subject
  const actions = []
  const title = { 'Persistent Weakness': 'Faculty intervention + targeted practice', 'Declining Performance': 'Performance review + practice plan', 'Low Accuracy': 'Concept revision + targeted questions', 'Time Management': 'Timed practice + worked examples', 'High Skip Rate': 'Question selection + confidence-building practice', 'Careless Errors': 'Error correction exercise', 'Performance Gap': 'Concept review + targeted practice' }[first.issueType] ?? 'Targeted practice'
  actions.push({ label: 'Concept revision', detail: `Revisit ${ch} fundamentals with worked examples (${subj}).` })
  if (highTime || first.issueType === 'Time Management') actions.push({ label: 'Timed practice', detail: `15 timed ${ch} questions — target ${Math.max(45, Math.round((first.avgTime ?? 100) * 0.8))}s per question.` })
  actions.push({ label: 'Targeted practice', detail: `15–20 ${ch} questions from the question bank.` })
  if (first.domain === 'Competitive') actions.push({ label: 'PYQ practice', detail: `${first.examFamily} PYQs on ${ch} — 10 questions with timed review.` })
  if (persistent) actions.push({ label: 'Faculty review', detail: `Small-group session on ${ch} — ${first.issueType === 'Persistent Weakness' ? 'persistent across multiple assessments' : 'recurring difficulty'}.` })
  if (declining) actions.push({ label: 'Trend check', detail: 'Re-assess after 2 practice sessions to confirm the trend reverses.' })
  if ((skipRate ?? 0) >= 25) actions.push({ label: 'Question selection', detail: 'Practise selecting which questions to attempt — skip-and-return strategy.' })
  return { title, actions, detail: `${first.issueType} in ${ch} — ${avgAcc ?? '—'}% average accuracy${highTime ? `, ${first.avgTime ?? '—'}s average time` : ''}.` }
}

/** Deterministic priority rules (documented, prototype label). */
export function derivePriority({ severity, count, persistent, declining }) {
  if (severity === 'Critical' || (severity === 'High' && count >= 8)) return 'Critical'
  if (severity === 'High' || ((persistent || declining) && count >= 5)) return 'High'
  if (severity === 'Medium' || count >= 3) return 'Medium'
  return 'Low'
}

/* ------------------------------------------------------------------ */
/* Interventions (status: Detected / Recommended / Planned)           */
/* ------------------------------------------------------------------ */

export function computeInterventions(groups = [], statusOverrides = {}) {
  return groups.map((g) => {
    const override = statusOverrides[g.id] ?? null
    return {
      id: g.id,
      groupId: g.id,
      priority: g.priority,
      issue: `${g.examFamily ? `${g.examFamily} ` : ''}${g.subject} — ${g.chapter}`,
      issueType: g.issueType,
      students: g.studentCount,
      studentList: g.students,
      evidence: g.evidence,
      whyDetected: g.whyDetected,
      recommendation: g.recommendation,
      status: override?.status ?? 'Detected',
      action: override?.action ?? null,
      updatedAt: override?.updatedAt ?? null,
    }
  })
}

export default { computeStudentIssueFingerprints, classifyIssueType, deriveIssueSeverity, similarityBetween, groupSimilarIssues, buildIndividualIssue, buildIndividualWhyDetected, buildRecommendation, derivePriority, computeInterventions, SIMILARITY_WEIGHTS }
