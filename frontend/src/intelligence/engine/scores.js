/**
 * Student Intelligence Engine — scoring utilities (pure functions).
 *
 * Frontend-only simulation of AI outputs. Every function is deterministic:
 * given the same datasets it always returns the same values, so derived
 * metrics can be recomputed (data synchronization) without any state.
 */

/* ---------- helpers ---------- */

export const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, Number.isFinite(v) ? v : 0))

export const round1 = (v) => Math.round((Number.isFinite(v) ? v : 0) * 10) / 10

export const avg = (arr, key) => {
  if (!arr?.length) return 0
  const vals = arr.map((x) => (key ? Number(x?.[key]) : Number(x))).filter(Number.isFinite)
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export const weighted = (factors) => {
  const total = factors.reduce((a, f) => a + (Number(f.weight) || 0), 0) || 1
  return factors.reduce((a, f) => a + (clamp(f.value) * (Number(f.weight) || 0)), 0) / total
}

export const pctOf = (part, whole) => (whole ? clamp((part / whole) * 100) : 0)

/* ---------- 1. Consistency score ----------
 * Attendance regularity (weekly pattern spread) + study regularity
 * (active days, streak) + practice cadence.
 */
export function computeConsistencyScore({ attendanceAnalytics, studyStatistics, practiceSessions }) {
  const weekly = attendanceAnalytics?.weeklyPattern ?? []
  const pcts = weekly.map((d) => Number(d.pct)).filter(Number.isFinite)
  const avgPct = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0
  const spread = pcts.length > 1 ? Math.max(...pcts) - Math.min(...pcts) : 0
  const attendanceRegularity = clamp(avgPct - spread * 0.6)

  const streak = studyStatistics?.streakDays ?? 0
  const activeDays = studyStatistics?.activeDaysPerWeek ?? 0
  const streakScore = clamp((streak / 21) * 60 + (activeDays / 7) * 40)

  const sessions = practiceSessions ?? []
  const weeksCovered = 4
  const expectedPerWeek = 2.5
  const practiceCadence = clamp((sessions.length / (weeksCovered * expectedPerWeek)) * 100)

  return round1(weighted([
    { value: attendanceRegularity, weight: 0.4 },
    { value: streakScore, weight: 0.35 },
    { value: practiceCadence, weight: 0.25 },
  ]))
}

/* ---------- 2. Learning behaviour score ----------
 * Focus quality, session depth, active days and distraction level.
 */
export function computeLearningBehaviourScore({ learningBehaviour, studyStatistics }) {
  const lb = learningBehaviour ?? {}
  const focusValues = (lb.focusHoursByTimeOfDay ?? []).map((s) => Number(s.focus)).filter(Number.isFinite)
  const avgFocus = focusValues.length ? focusValues.reduce((a, b) => a + b, 0) / focusValues.length : 0

  const dist = lb.sessionLengthDistribution ?? []
  const deepSessions = dist.filter((d) => d.bucket === '30–60 min' || d.bucket === '> 60 min')
    .reduce((a, d) => a + (Number(d.sessions) || 0), 0)
  const totalSessions = dist.reduce((a, d) => a + (Number(d.sessions) || 0), 0) || 1
  const depthScore = clamp((deepSessions / totalSessions) * 100)

  const activeDays = Number(lb.activeDaysPerWeek ?? studyStatistics?.activeDaysPerWeek ?? 0)
  const activeScore = clamp((activeDays / 7) * 100)

  const distractionScore = clamp(100 - (Number(lb.distractionScore) || 0) * 2)

  return round1(weighted([
    { value: avgFocus, weight: 0.4 },
    { value: depthScore, weight: 0.25 },
    { value: activeScore, weight: 0.2 },
    { value: distractionScore, weight: 0.15 },
  ]))
}

/* ---------- 3. Confidence index ----------
 * Average accuracy across exams + practice outcomes.
 */
export function computeConfidenceIndex({ examPerformance, quizResults, practiceSessions }) {
  const examPcts = (examPerformance ?? []).map((e) => Number(e.pct)).filter(Number.isFinite)
  const quizAcc = (quizResults ?? []).map((q) => Number(q.accuracy)).filter(Number.isFinite)
  const practiceScores = (practiceSessions ?? []).map((p) => Number(p.score)).filter(Number.isFinite)

  const examAvg = examPcts.length ? examPcts.reduce((a, b) => a + b, 0) / examPcts.length : 0
  const quizAvg = quizAcc.length ? quizAcc.reduce((a, b) => a + b, 0) / quizAcc.length : 0
  const practiceAvg = practiceScores.length ? practiceScores.reduce((a, b) => a + b, 0) / practiceScores.length : 0

  return round1(weighted([
    { value: examAvg, weight: 0.5 },
    { value: quizAvg, weight: 0.25 },
    { value: practiceAvg, weight: 0.25 },
  ]))
}

/* ---------- 4. Improvement index ----------
 * CGPA trajectory + rank improvement + exam score deltas.
 */
export function computeImprovementIndex({ academicPerformance, examPerformance }) {
  const history = academicPerformance?.semesterHistory ?? []
  const gpas = history.map((h) => Number(h.gpa)).filter(Number.isFinite)
  const ranks = history.map((h) => Number(h.rank)).filter(Number.isFinite)

  const gpaDelta = gpas.length > 1 ? gpas[gpas.length - 1] - gpas[0] : 0
  const rankDelta = ranks.length > 1 ? ranks[0] - ranks[ranks.length - 1] : 0

  const completed = (examPerformance ?? []).filter((e) => e.status === 'Completed')
  const competitive = completed.filter((e) => e.type === 'Competitive' && Number.isFinite(e.percentile))
  const percentileDelta = competitive.length > 1
    ? competitive[competitive.length - 1].percentile - competitive[0].percentile
    : 0

  const gpaScore = clamp(50 + gpaDelta * 40)
  const rankScore = clamp(rankDelta > 0 ? 50 + Math.min(rankDelta, 30) : 40 + rankDelta)
  const percentileScore = clamp(50 + percentileDelta * 6)

  return round1(weighted([
    { value: gpaScore, weight: 0.4 },
    { value: rankScore, weight: 0.35 },
    { value: percentileScore, weight: 0.25 },
  ]))
}

/* ---------- 5. Per-subject mastery score ----------
 * Blends internal marks, attendance and practice outcomes for a subject.
 */
export function computeSubjectMastery(subjectCode, { subjects, attendance, quizResults, practiceSessions, academicDnaInputs }) {
  const subject = (subjects ?? []).find((s) => s.code === subjectCode)
  const att = (attendance?.bySubject ?? []).find((a) => a.subjectCode === subjectCode)
  const dna = (academicDnaInputs?.masteryHistory ?? []).find((d) => d.subjectCode === subjectCode)
  const quizzes = (quizResults ?? []).filter((q) => q.subjectCode === subjectCode)
  const practice = (practiceSessions ?? []).filter((p) => p.subjectCode === subjectCode)

  const internal = Number(subject?.internal ?? 0)
  const attPct = Number(att?.pct ?? 0)
  const dnaMastery = Number(dna?.mastery)
  const quizAvg = quizzes.length ? avg(quizzes, 'accuracy') : null
  const practiceAvg = practice.length ? avg(practice, 'score') : null

  const parts = [
    { value: dnaMastery || internal, weight: 0.4 },
    { value: internal, weight: 0.3 },
    { value: attPct, weight: 0.15 },
  ]
  if (quizAvg != null) parts.push({ value: quizAvg, weight: 0.15 })
  else parts[0].weight += 0.15

  return round1(weighted(parts))
}
