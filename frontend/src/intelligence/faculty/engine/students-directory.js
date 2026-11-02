/**
 * Faculty Intelligence Engine — STUDENT DIRECTORY (Phase 3).
 *
 * Derives everything the My Students / Batch / Student Profile surfaces
 * show from the canonical batch/student/attempt relationships:
 *
 *   · computeMyStudentsDirectory()   — overview KPIs + enriched student
 *     list + batch aggregates (University/Competitive separated)
 *   · computeBatchDetail()           — one batch + its students
 *   · computeStudentProfileBundle()  — identity · batch · exam history ·
 *     derived status · AI Academic DNA evidence (reuses the Phase 2
 *     buildExamEvidence — never a second strength/weakness engine)
 *   · computeStudentExamHistory()    — canonical attempts (demo excluded),
 *     domain/family filtered
 *   · computeAttemptAnalysis()       — per-attempt analysis reusing the
 *     existing buildAttemptAnalysisVariant (AI Exam Analysis shape)
 *
 * Statuses are DERIVED with transparent deterministic rules from the
 * student's own attempt series — never hardcoded labels:
 *   Strong         latest accuracy ≥ 75 and not declining
 *   Improving      late-half − early-half accuracy ≥ +8 and latest ≥ 55
 *   Needs Attention  latest < 55  OR  declining (≤ −8)  OR  existing
 *                  at-risk model flag on the roll
 *   Stable         otherwise
 */

import { round1, avg } from './scores.js'
import { buildExamEvidence, buildAttemptAnalysisVariant } from '@/intelligence/engine/exam-attempt-intelligence.js'

/* ------------------------------------------------------------------ */
/* Status derivation                                                  */
/* ------------------------------------------------------------------ */

export function deriveStudentStatus(attempts = [], weakFlag = false) {
  const manual = (attempts ?? []).filter((a) => a?.mode !== 'demo')
  const sorted = [...manual].sort((a, b) => String(a.submittedAt ?? '').localeCompare(String(b.submittedAt ?? '')))
  const accuracies = sorted
    .map((a) => a.scoring?.accuracy ?? a.summary?.accuracy ?? null)
    .filter((v) => v != null)
  if (!accuracies.length) return { status: 'No exams', accuracy: null, trend: 'new', latest: null, examsCompleted: 0 }

  const latest = accuracies[accuracies.length - 1]
  const first = accuracies[0]
  let trend = 'new'
  if (accuracies.length >= 2) {
    const mid = Math.ceil(accuracies.length / 2)
    const delta = avg(accuracies.slice(mid)) - avg(accuracies.slice(0, mid))
    trend = delta >= 8 ? 'improving' : delta <= -8 ? 'declining' : 'stable'
  }
  let status
  if (weakFlag || latest < 55 || trend === 'declining') status = 'Needs Attention'
  else if (latest >= 75 && trend !== 'declining') status = 'Strong'
  else if (trend === 'improving' && latest >= 55) status = 'Improving'
  else status = 'Stable'

  return { status, trend, latest, first, accuracy: round1(avg(accuracies)), examsCompleted: sorted.length }
}

function getAttemptRate(a) {
  if (!a) return null
  if (a.scoring?.attemptRate != null) return a.scoring.attemptRate
  if (a.summary?.attemptRate != null) return a.summary.attemptRate
  if (a.attemptRate != null) return a.attemptRate
  const sc = a.scoring || a.summary || {}
  const total = sc.total ?? (a.questionAttempts?.length || 0)
  const correct = sc.correct ?? 0
  const incorrect = sc.incorrect ?? 0
  const attempted = sc.attempted ?? (correct + incorrect)
  if (total > 0 && attempted >= 0) {
    return round1((attempted / total) * 100)
  }
  return null
}

function getTimeEfficiency(a) {
  if (!a) return null
  if (a.scoring?.timeEfficiency != null) return a.scoring.timeEfficiency
  if (a.summary?.timeEfficiency != null) return a.summary.timeEfficiency
  if (a.timeEfficiency != null) return a.timeEfficiency
  const tm = a.timing || {}
  const sc = a.scoring || a.summary || {}
  const elapsed = a.elapsedSeconds ?? tm.elapsedSeconds ?? 0
  const correct = sc.correct ?? 0
  const incorrect = sc.incorrect ?? 0
  const attempted = sc.attempted ?? (correct + incorrect)
  if (elapsed > 0 && attempted > 0) {
    const pace = elapsed / attempted
    const targetPace = 120
    const ratio = pace / targetPace
    return Math.round(Math.max(15, Math.min(100, 100 - Math.max(0, ratio - 1) * 40)))
  }
  if (tm.timeUsagePct != null && tm.timeUsagePct > 0) {
    return Math.round(Math.min(100, tm.timeUsagePct * 1.1))
  }
  return null
}

export function computeMyStudentsDirectory({ batches = [], students = [], attemptsFor = () => [] }) {
  const enriched = students.map((s) => {
    const attempts = (attemptsFor(s.id) ?? []).filter((a) => a?.mode !== 'demo')
    const manual = [...attempts].sort((a, b) => String(a.submittedAt ?? '').localeCompare(String(b.submittedAt ?? '')))
    const derived = deriveStudentStatus(attempts, s._weakFlag === true)
    const batch = batches.find((b) => b.id === s.batchId)
    const last = manual[manual.length - 1] ?? null
    const latestScore = last?.scoring?.score ?? last?.summary?.score ?? null
    const attemptRate = last ? (getAttemptRate(last) ?? null) : null
    const timeEff = last ? (getTimeEfficiency(last) ?? null) : null
    return {
      id: s.id,
      roll: s.roll,
      name: s.name,
      batchId: s.batchId,
      batchName: batch?.name ?? '—',
      domain: s.domain ?? batch?.domain ?? 'University',
      examFamily: s.examFamily ?? batch?.examFamily ?? null,
      program: batch?.program ?? null,
      course: batch?.course ?? null,
      courseCode: batch?.courseCode ?? null,
      semester: batch?.semester ?? null,
      section: batch?.section ?? null,
      academicSession: batch?.academicSession ?? null,
      examsCompleted: derived.examsCompleted,
      latestAccuracy: derived.latest,
      accuracy: derived.accuracy,
      latestScore,
      maxScore: last?.scoring?.maxScore ?? last?.summary?.maxScore ?? null,
      attemptRate,
      timeEfficiency: timeEff,
      status: derived.status,
      trend: derived.trend,
      attention: derived.status === 'Needs Attention',
      attentionReason: s._attentionReason ?? (derived.status === 'Needs Attention' ? (derived.trend === 'declining' ? 'Declining performance trend' : 'Latest accuracy below 55%') : null),
      lastExam: last ? { title: last.examName ?? last.examTitle ?? null, shortTitle: last.shortTitle ?? null, date: (last.submittedAt ?? '').slice(0, 10), pct: last.scoring?.pct ?? last.summary?.pct ?? null, attemptId: last.id } : null,
    }
  })

  const overview = {
    students: enriched.length,
    batches: batches.length,
    needsAttention: enriched.filter((s) => s.status === 'Needs Attention').length,
    improving: enriched.filter((s) => s.status === 'Improving').length,
    strong: enriched.filter((s) => s.status === 'Strong').length,
    stable: enriched.filter((s) => s.status === 'Stable').length,
  }

  const batchRows = batches.map((b) => {
    const members = enriched.filter((s) => s.batchId === b.id)
    const accuracies = members.map((s) => s.latestAccuracy).filter((v) => v != null)
    const scores = members.map((s) => s.latestScore).filter((v) => v != null)
    const dates = members.map((s) => s.lastExam?.date).filter(Boolean).sort()
    return {
      ...b,
      studentCount: members.length,
      avgAccuracy: accuracies.length ? round1(avg(accuracies)) : 0,
      avgScore: scores.length ? round1(avg(scores)) : 0,
      attentionCount: members.filter((s) => s.attention).length,
      improvingCount: members.filter((s) => s.status === 'Improving').length,
      strongCount: members.filter((s) => s.status === 'Strong').length,
      latestExam: dates.length ? dates[dates.length - 1] : null,
      students: members,
    }
  })

  return { overview, students: enriched, batches: batchRows }
}

export function computeBatchDetail(batchId, directory) {
  const batch = (directory.batches ?? []).find((b) => b.id === batchId)
  return batch ?? null
}

/* ------------------------------------------------------------------ */
/* Student profile                                                    */
/* ------------------------------------------------------------------ */

export function computeStudentProfileBundle({ student, batches = [], attempts = [], weakFlag = false, attentionReason = null }) {
  const batch = batches.find((b) => b.id === student?.batchId) ?? null
  const manual = (attempts ?? []).filter((a) => a?.mode !== 'demo')
  const derived = deriveStudentStatus(manual, weakFlag)
  const sorted = [...manual].sort((a, b) => String(a.submittedAt ?? '').localeCompare(String(b.submittedAt ?? '')))
  const dnaEvidence = manual.length ? buildExamEvidence(manual) : null
  return {
    student: {
      ...student,
      batchName: batch?.name ?? '—',
      domain: student?.domain ?? batch?.domain ?? 'University',
      examFamily: student?.examFamily ?? batch?.examFamily ?? null,
      program: batch?.program ?? null,
      course: batch?.course ?? null,
      courseCode: batch?.courseCode ?? null,
      semester: batch?.semester ?? null,
      section: batch?.section ?? null,
      academicSession: batch?.academicSession ?? null,
    },
    batch,
    attempts: sorted.map((a) => ({
      id: a.id,
      examId: a.examId,
      examName: a.examName ?? a.examTitle,
      shortTitle: a.shortTitle,
      examMode: a.examMode ?? a.category,
      examFamily: a.examFamily ?? (a.examType === 'JEE' || a.examType === 'NEET' ? a.examType : null),
      date: (a.submittedAt ?? a.completedAt ?? '').slice(0, 10),
      score: a.scoring?.score ?? a.summary?.score ?? 0,
      maxScore: a.scoring?.maxScore ?? a.summary?.maxScore ?? null,
      pct: a.scoring?.pct ?? a.summary?.pct ?? 0,
      accuracy: a.scoring?.accuracy ?? a.summary?.accuracy ?? 0,
      attemptRate: getAttemptRate(a) ?? 0,
      timeEfficiency: getTimeEfficiency(a) ?? null,
      questions: (a.questionAttempts ?? []).length,
      mock: !!a.mock,
    })),
    status: derived.status,
    trend: derived.trend,
    /* Phase 4 — expose the full derived series metrics for the 360 overview */
    derived: {
      status: derived.status,
      trend: derived.trend,
      latest: derived.latest,
      first: derived.first,
      accuracy: derived.accuracy,
      examsCompleted: derived.examsCompleted,
    },
    attention: derived.status === 'Needs Attention',
    attentionReason,
    dnaEvidence,
  }
}

/* ------------------------------------------------------------------ */
/* Exam history (canonical, demo excluded, filtered)                  */
/* ------------------------------------------------------------------ */

export function computeStudentExamHistory(attempts = [], filters = {}) {
  const { domain, examFamily } = filters ?? {}
  return (attempts ?? [])
    .filter((a) => a?.mode !== 'demo')
    .filter((a) => {
      if (domain && (a.examMode ?? a.category) !== domain) return false
      if (examFamily) {
        const fam = a.examFamily ?? (a.examType === 'JEE' || a.examType === 'NEET' ? a.examType : null)
        if (fam !== examFamily) return false
      }
      return true
    })
    .sort((a, b) => String(b.submittedAt ?? b.completedAt ?? '').localeCompare(String(a.submittedAt ?? a.completedAt ?? '')))
}

/* ------------------------------------------------------------------ */
/* Per-attempt analysis (reuses the existing AI Exam Analysis shape)  */
/* ------------------------------------------------------------------ */

export function computeAttemptAnalysis(attempt, previous = []) {
  return buildAttemptAnalysisVariant(attempt, previous)
}

export default { deriveStudentStatus, computeMyStudentsDirectory, computeBatchDetail, computeStudentProfileBundle, computeStudentExamHistory, computeAttemptAnalysis }
