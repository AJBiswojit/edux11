/**
 * Shared base-model normalisation for the Premium PDF reports.
 *
 * These data helpers are consumed by the premium model and full-analysis data
 * layers. No PDF bytes are produced here.
 */

import { formatReportTime, masteryFromAccuracy } from '../exam-analysis-pdf.js'

function isBlank(value) {
  return value == null || value === '' || value === '—'
}

function formatDurationLabel(raw) {
  if (isBlank(raw)) return '—'
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw > 0 ? `${raw} min` : '—'
  const str = String(raw).trim()
  return str || '—'
}

function totalTimeTakenMinutes(data, subjects) {
  const elapsed = Number(
    data?.attempt?.elapsedSeconds
    ?? data?.attempt?.timing?.elapsedSeconds
    ?? data?.elapsedSeconds
    ?? 0,
  )
  if (elapsed > 0) return elapsed / 60
  const fromSubjects = (subjects ?? []).reduce((n, s) => n + (Number(s.time) || 0), 0)
  if (fromSubjects > 0) return fromSubjects
  return (data?.questionReview ?? []).reduce((n, q) => n + (Number(q.time) || 0), 0)
}

function fileStub(name) {
  return String(name || 'exam_analysis').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'exam_analysis'
}

function normName(value) {
  return String(value ?? '').trim().toLowerCase()
}

function accuracyNumber(value) {
  if (value == null || value === '' || value === '—') return null
  const n = Number(String(value).replace('%', '').trim())
  return Number.isFinite(n) ? n : null
}

function formatAccuracy(acc) {
  if (acc == null) return '—'
  const rounded = Math.round(acc * 10) / 10
  return `${rounded}%`
}

function priorityFromAccuracy(acc, lowAttempt) {
  if (lowAttempt && (acc == null || acc >= 65)) return 'Low attempt'
  if (acc == null) return 'Revise'
  if (acc < 45) return 'Critical'
  if (acc < 60) return 'Weak'
  if (acc < 65) return 'Review'
  return 'Revise'
}

/**
 * Topic revision list for the premium analysis PDF.
 * Weak topics are grouped under their subject. Chapter rows are not included.
 */
function buildRevisionGroups({
  chapters = [],
  topics = [],
  subjects = [],
  questionReview = [],
  recommendations = {},
  subjectText = 'All Subjects',
} = {}) {
  const topicChapter = new Map()
  for (const question of questionReview) {
    const topicKey = normName(question.topic)
    const chapter = String(question.chapter ?? '').trim()
    const subject = String(question.subject ?? '').trim()
    if (!topicKey || !chapter) continue
    if (normName(chapter) === topicKey || normName(chapter) === normName(subject)) continue
    if (!topicChapter.has(topicKey)) topicChapter.set(topicKey, chapter)
  }

  const groups = new Map()
  const ensure = (name) => {
    const subject = name || 'General'
    if (!groups.has(subject)) {
      const source = subjects.find((row) => normName(row.name) === normName(subject))
      const acc = source ? accuracyNumber(source.accuracy) : null
      groups.set(subject, {
        subject,
        accuracy: acc,
        accuracyLabel: formatAccuracy(acc),
        mastery: acc == null ? '' : masteryFromAccuracy(acc),
        topics: [],
        seen: new Set(),
      })
    }
    return groups.get(subject)
  }

  for (const topic of topics) {
    const subject = topic.subject || (subjectText !== 'All Subjects' ? subjectText : 'General')
    const name = String(topic.topic || '').trim()
    if (!name) continue
    const acc = accuracyNumber(topic.mastery ?? topic.accuracy)
    if (acc == null || acc >= 65) continue
    const group = ensure(subject)
    if (normName(name) === normName(subject)) {
      group.seen.add(normName(name))
      continue
    }
    const rawChapter = String(topic.chapter || topicChapter.get(normName(name)) || '').trim()
    if (group.seen.has(`topic:${normName(name)}`)) continue
    group.seen.add(`topic:${normName(name)}`)
    group.seen.add(normName(name))
    const chapterLabel = rawChapter && normName(rawChapter) !== normName(subject) ? rawChapter : '—'
    group.topics.push({
      name,
      chapter: chapterLabel,
      accuracy: acc,
      accuracyLabel: formatAccuracy(acc),
      priority: priorityFromAccuracy(acc, false),
    })
  }

  const knownSubjects = subjects.map((row) => row.name).filter(Boolean)
  const placeRecommendation = (name, level) => {
    const label = String(name ?? '').trim()
    if (!label) return
    const chapterHit = chapters.find((row) => normName(row.chapter || row.name) === normName(label))
    const topicHit = topics.find((row) => normName(row.topic) === normName(label))
    const reviewHit = (questionReview ?? []).find((row) => normName(row.topic) === normName(label) || normName(row.chapter) === normName(label))
    let subject = chapterHit?.subject || topicHit?.subject || reviewHit?.subject || ''
    if (!subject && knownSubjects.length === 1) subject = knownSubjects[0]
    if (!subject && subjectText && subjectText !== 'All Subjects') subject = subjectText
    if (!subject) subject = 'Also revise'
    const group = ensure(subject)
    if (level !== 'Topic') return
    if (group.seen.has(normName(label)) || normName(label) === normName(subject)) return
    const rawChapter = String(topicHit?.chapter || topicChapter.get(normName(label)) || reviewHit?.chapter || '').trim()
    group.seen.add(normName(label))
    group.topics.push({
      name: label,
      chapter: rawChapter && normName(rawChapter) !== normName(subject) && normName(rawChapter) !== normName(label) ? rawChapter : '—',
      accuracy: null,
      accuracyLabel: '—',
      priority: 'Revise',
    })
  }

  for (const name of recommendations.weakTopics ?? []) placeRecommendation(name, 'Topic')

  const byAccuracy = (a, b) => (a.accuracy ?? 101) - (b.accuracy ?? 101)
  const worst = (group) => Math.min(
    group.accuracy ?? 101,
    ...group.topics.map((row) => row.accuracy ?? 101),
  )

  return [...groups.values()]
    .map((group) => ({
      subject: group.subject,
      accuracyLabel: group.accuracyLabel,
      mastery: group.accuracy != null && group.accuracy < 65 ? group.mastery : '',
      topics: [...group.topics].sort(byAccuracy),
    }))
    .filter((group) => group.topics.length > 0)
    .sort((a, b) => worst(a) - worst(b))
}

function withChapterTime(chapters, subjectText) {
  const minutes = chapters.map((c) => {
    const n = Number(c.time)
    return Number.isFinite(n) && n > 0 ? n : 0
  })
  const total = minutes.reduce((sum, n) => sum + n, 0)
  return chapters.map((c, index) => {
    const mins = minutes[index]
    const pct = total > 0 ? Math.round((100 * mins) / total) : 0
    return {
      chapter: c.chapter || c.name || 'Chapter',
      subject: c.subject || subjectText,
      accuracy: `${c.accuracy ?? 0}%`,
      marks: `${c.marks ?? 0}`,
      mastery: c.mastery || c.status || masteryFromAccuracy(c.accuracy),
      time: formatReportTime(mins),
      timeMinutes: mins,
      share: total > 0 ? `${pct}%` : '—',
      sharePct: pct,
    }
  })
}

export function buildBaseReportModel({ data, subject, user, generatedAt }) {
  const isAll = subject === 'All Subjects' || !subject
  const activeSubject = isAll ? null : subject
  const h = data?.hero || {}
  const meta = data?.meta || {}
  const qi = data?.questionIntelligence || {}
  const rec = data?.recommendations || {}

  const examName = meta.examName || h.examName || 'Exam Intelligence Analysis'
  const subjectText = activeSubject || 'All Subjects'
  const when = generatedAt instanceof Date ? generatedAt : new Date()
  const dateStr = when.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  const subjects = activeSubject
    ? (data.subjects ?? []).filter((s) => s.name === activeSubject)
    : (data.subjects ?? [])
  const chapterSource = activeSubject
    ? (data.chapters ?? []).filter((c) => c.subject === activeSubject)
    : (data.chapters ?? [])
  const topicSource = activeSubject
    ? (data.topics ?? []).filter((t) => t.subject === activeSubject)
    : (data.topics ?? [])
  const reviewSource = activeSubject
    ? (data.questionReview ?? []).filter((q) => q.subject === activeSubject)
    : (data.questionReview ?? [])
  const chapters = withChapterTime(chapterSource, subjectText)
  const mistakes = data.mistakes ?? []

  const timeTakenMin = totalTimeTakenMinutes(data, subjects)
  const timeTakenLabel = formatReportTime(timeTakenMin)
  const accuracy = qi.successRate ?? qi.accuracy ?? h.overallAccuracy ?? h.percentage ?? 0
  const scorePct = h.percentage ?? 0
  const who = [user?.fullName, user?.rollNo ? `Roll No: ${user.rollNo}` : null].filter(Boolean).join(' | ')

  return {
    examName,
    subjectText,
    who,
    dateStr,
    pattern: meta.pattern || h.pattern || '—',
    examStatus: h.status || meta.examStatus || 'Completed',
    examDate: meta.date || '—',
    durationLabel: formatDurationLabel(meta.duration),
    timeTakenLabel,
    hasTime: timeTakenLabel !== '—',
    scoreLine: `${h.score ?? '—'} / ${h.maxScore ?? h.totalScore ?? '—'} marks`,
    breakdownLine: `${qi.correct ?? h.correct ?? 0} correct | ${qi.incorrect ?? h.incorrect ?? 0} incorrect | ${qi.skipped ?? h.unattempted ?? 0} skipped`,
    scorePct: `${scorePct}%`,
    accuracy: `${accuracy}%`,
    attempted: `${qi.attempted ?? 0}`,
    aiSummary: h.aiSummary || '',
    subjects: subjects.map((s) => {
      const minutes = chapters
        .filter((c) => c.subject === s.name)
        .reduce((sum, c) => sum + (Number(c.timeMinutes) || 0), 0)
      return {
        name: s.name,
        score: `${s.score ?? 0} / ${s.maxMarks ?? s.maxScore ?? '—'}`,
        accuracy: `${s.accuracy ?? 0}%`,
        timeSpent: formatReportTime(minutes),
        mastery: s.mastery || masteryFromAccuracy(s.accuracy),
      }
    }),
    chapters,
    hasChapterTime: chapters.some((c) => c.timeMinutes > 0),
    mistakes: mistakes.map((m) => ({
      category: m.category || 'Error pattern',
      count: String(m.count ?? 1),
    })),
    revisionGroups: buildRevisionGroups({
      chapters: chapterSource,
      topics: topicSource,
      subjects,
      questionReview: reviewSource,
      recommendations: rec,
      subjectText,
    }),
  }
}
