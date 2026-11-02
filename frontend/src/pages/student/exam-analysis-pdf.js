/**
 * AI Exam Analysis — one-click PDF download.
 * Used by the student analysis page and the faculty/admin attempt-analysis
 * wrapper. Isolated from progress-report print and program-results PDF.
 */

function formatPace(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${String(r).padStart(2, '0')}s`
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="#0f172a"/>
  <path d="M18 12 h10 v16 L46 12 h12 L34 32 L56 52 H44 L28 34 v18 H18 Z" fill="url(#g)"/>
</svg>`

export const FAVICON_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(FAVICON_SVG)}`

const HEADER_RGB = [15, 23, 42]

export function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function masteryFromAccuracy(acc) {
  const n = Number(acc)
  if (!Number.isFinite(n)) return 'Average'
  if (n >= 75) return 'Strong'
  if (n >= 60) return 'Average'
  if (n >= 45) return 'Weak'
  return 'Critical'
}

export function badgeClassFor(level) {
  if (level === 'Strong' || level === 'Correct' || level === 'Low') return 'badge-success'
  if (level === 'Critical' || level === 'Incorrect' || level === 'High') return 'badge-danger'
  if (level === 'Weak' || level === 'Skipped' || level === 'Medium') return 'badge-warning'
  return 'badge-info'
}

export function formatReportTime(minutes) {
  const n = Number(minutes)
  if (!Number.isFinite(n) || n <= 0) return '—'
  const seconds = Math.round(n * 60)
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`
  return formatPace(seconds)
}

export function optLetter(val) {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'number') return LETTERS[val] || String(val)
  const str = String(val).trim()
  if (/^[0-5]$/.test(str)) return LETTERS[parseInt(str, 10)] || str
  if (/^[A-Fa-f]$/.test(str)) return str.toUpperCase()
  return str
}

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
 * Topic revision list for the analysis PDF.
 * Weak topics are grouped under their subject. Chapter rows are not included.
 */
export function buildRevisionGroups({
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

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function pdfEscape(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
}

function pdfSafe(value) {
  const raw = String(value ?? '')
  const escaped = pdfEscape(raw)
  if (escaped.trim()) return escaped
  if (raw.trim()) return '-'
  return ''
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

export function buildReportModel({ data, subject, user, generatedAt }) {
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

function reportCss() {
  return `
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      font-size: 12px;
      line-height: 1.45;
    }
    .page-frame {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      overflow: hidden;
      min-height: calc(100vh - 8px);
    }
    .ribbon { height: 6px; background: linear-gradient(90deg, #22d3ee 0%, #2563eb 48%, #4f46e5 100%); }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      background: #0f172a;
      color: #ffffff;
      padding: 16px 18px 18px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo-mark {
      width: 46px; height: 46px; object-fit: contain;
      background: #0f172a; border-radius: 10px;
    }
    .eyebrow {
      font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
      text-transform: uppercase; color: #67e8f9;
    }
    .brand-name { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; color: #ffffff; margin-top: 2px; }
    .brand-edu { color: #22d3ee; }
    .sub { font-size: 11px; text-align: right; color: #cbd5e1; }
    .sub .who { font-size: 12px; font-weight: 700; color: #ffffff; }
    .sub .when { font-size: 10px; margin-top: 3px; color: #94a3b8; }
    .body { padding: 16px 18px 14px; }

    .meta-box {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .meta-col {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #4f46e5;
      border-radius: 10px;
      padding: 7px 9px;
    }
    .meta-lbl { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0f766e; }
    .meta-val { font-size: 11.5px; font-weight: 700; margin-top: 2px; color: #0f172a; word-break: break-word; }

    .hero {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 12px;
    }
    .hero-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
    .hero-title { font-size: 22px; font-weight: 800; margin: 0; color: #312e81; }
    .hero-sub { font-size: 12px; margin-top: 4px; color: #475569; }
    .hero-summary { font-size: 11.5px; margin-top: 8px; color: #334155; }

    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
    .stat-card { border-radius: 12px; padding: 10px 8px; text-align: center; border: 1px solid transparent; }
    .stat-attempted { background: #eef2ff; border-color: #c7d2fe; color: #4338ca; }
    .stat-score { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
    .stat-accuracy { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
    .stat-time { background: #fffbeb; border-color: #fde68a; color: #b45309; }
    .stat-val { font-size: 16px; font-weight: 800; }
    .stat-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; margin-top: 2px; color: #64748b; }

    .sec-title {
      font-size: 13px; font-weight: 800; margin: 16px 0 8px; color: #312e81;
      border-bottom: 2px solid #e0e7ff; padding-bottom: 4px;
    }
    .note { font-size: 11px; color: #b45309; margin: 0 0 8px; }

    table.data-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11.5px; }
    table.data-table th, table.data-table td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
    table.data-table th { font-size: 10px; text-transform: uppercase; background: #4f46e5; color: #ffffff; letter-spacing: 0.3px; }
    table.data-table tr:nth-child(even) td { background: #f8fafc; }
    table.data-table .ctr { text-align: center; }
    table.data-table .time { color: #4f46e5; font-weight: 700; text-align: center; }

    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .badge-success { background: #d1fae5; color: #047857; }
    .badge-danger { background: #ffe4e6; color: #be123c; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-info { background: #e0e7ff; color: #4338ca; }

    .time-row { display: grid; grid-template-columns: 1.3fr 1fr 1.6fr auto auto; gap: 8px; align-items: center; margin-bottom: 7px; }
    .time-name { font-weight: 700; color: #0f172a; }
    .time-meta { color: #64748b; font-size: 11px; }
    .time-track { height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
    .time-fill { height: 100%; background: linear-gradient(90deg, #22d3ee, #4f46e5); border-radius: 999px; }
    .time-val { font-weight: 800; color: #4f46e5; min-width: 52px; text-align: right; }
    .time-share { color: #64748b; font-size: 11px; min-width: 36px; text-align: right; }

    .rev-note { font-size: 11px; color: #475569; margin: 2px 0 12px; }
    .rev-block {
      margin: 0 0 14px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;
    }
    .rev-head {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      background: #0f172a; color: #ffffff; padding: 10px 12px;
    }
    .rev-subject { font-size: 13px; font-weight: 800; }
    .rev-meta { display: flex; align-items: center; gap: 8px; }
    .rev-acc { font-weight: 700; color: #c7d2fe; font-size: 11px; }
    .rev-label {
      font-size: 11px; font-weight: 800; color: #4338ca;
      background: #eef2ff; border-top: 1px solid #e0e7ff;
      padding: 7px 12px; margin: 0;
    }
    .rev-block table.data-table { margin: 0; }
    .rev-empty {
      font-size: 11px; color: #334155; margin: 0;
      padding: 10px 12px; background: #f8fafc;
    }

    .footer {
      margin: 8px 18px 14px; padding-top: 8px; border-top: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; font-size: 10px; color: #64748b;
    }
  `
}

function metaCell(label, value) {
  return `<div class="meta-col">
    <div class="meta-lbl">${htmlEscape(label)}</div>
    <div class="meta-val">${htmlEscape(value)}</div>
  </div>`
}

function statCard(value, label, tone) {
  return `<div class="stat-card stat-${tone}">
    <div class="stat-val">${htmlEscape(value)}</div>
    <div class="stat-lbl">${htmlEscape(label)}</div>
  </div>`
}

function masteryBadge(level) {
  return `<span class="badge ${badgeClassFor(level)}">${htmlEscape(level)}</span>`
}

function priorityBadge(level) {
  const tone = level === 'Low attempt' ? 'badge-warning' : badgeClassFor(level)
  return `<span class="badge ${tone}">${htmlEscape(level)}</span>`
}

function revisionSectionHtml(groups) {
  if (!groups.length) return ''
  const blocks = groups.map((group) => {
    const acc = group.accuracyLabel && group.accuracyLabel !== '—'
      ? `<span class="rev-acc">${htmlEscape(group.accuracyLabel)} section accuracy</span>`
      : ''
    const badge = group.mastery ? masteryBadge(group.mastery) : ''
    const topicTable = group.topics.length ? `
      <div class="rev-label">Topics to revise</div>
      <table class="data-table">
        <thead><tr><th>Topic</th><th>Chapter</th><th class="ctr">Accuracy</th><th class="ctr">Priority</th></tr></thead>
        <tbody>${group.topics.map((row) => `<tr>
          <td><strong>${htmlEscape(row.name)}</strong></td>
          <td>${htmlEscape(row.chapter)}</td>
          <td class="ctr">${htmlEscape(row.accuracyLabel)}</td>
          <td class="ctr">${priorityBadge(row.priority)}</td>
        </tr>`).join('')}</tbody>
      </table>` : ''
    return `<div class="rev-block">
      <div class="rev-head">
        <span class="rev-subject">${htmlEscape(group.subject)}</span>
        <span class="rev-meta">${acc}${badge}</span>
      </div>
      ${topicTable}
    </div>`
  }).join('')
  return `<div class="sec-title">Revision priorities</div>
    <p class="rev-note">Weakest subject first. Every weak topic from this attempt is listed under its subject.</p>
    ${blocks}`
}

export function buildAnalysisPdfHtml({ data, subject, user, logoSrc, generatedAt }) {
  const model = buildReportModel({ data, subject, user, generatedAt })
  const logo = htmlEscape(logoSrc || FAVICON_DATA_URI)

  const subjectRows = model.subjects.map((s) => `<tr>
      <td><strong>${htmlEscape(s.name)}</strong></td>
      <td class="ctr">${htmlEscape(s.score)}</td>
      <td class="ctr">${htmlEscape(s.accuracy)}</td>
      <td class="time">${htmlEscape(s.timeSpent)}</td>
      <td class="ctr">${masteryBadge(s.mastery)}</td>
    </tr>`).join('')

  const chapterRows = model.chapters.map((c) => `<tr>
      <td><strong>${htmlEscape(c.chapter)}</strong></td>
      <td>${htmlEscape(c.subject)}</td>
      <td class="ctr">${htmlEscape(c.accuracy)}</td>
      <td class="ctr">${htmlEscape(c.marks)}</td>
      <td class="time">${htmlEscape(c.time)}</td>
      <td class="ctr">${masteryBadge(c.mastery)}</td>
    </tr>`).join('')

  const timeRows = model.chapters.map((c) => `<div class="time-row">
      <div class="time-name">${htmlEscape(c.chapter)}</div>
      <div class="time-meta">${htmlEscape(c.subject)}</div>
      <div class="time-track"><div class="time-fill" style="width:${Math.max(0, Math.min(100, c.sharePct))}%"></div></div>
      <div class="time-val">${htmlEscape(c.time)}</div>
      <div class="time-share">${htmlEscape(c.share)}</div>
    </div>`).join('')

  const mistakeRows = model.mistakes.map((m) => `<tr>
      <td><strong>${htmlEscape(m.category)}</strong></td>
      <td class="ctr">${htmlEscape(m.count)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${htmlEscape(`${model.examName} - ${model.subjectText} - MediXO EduX Analysis Report`)}</title>
  <style>${reportCss()}</style>
</head>
<body>
  <div class="page-frame">
    <div class="ribbon"></div>
    <div class="header">
      <div class="brand">
        <img class="logo-mark" src="${logo}" alt="MediXO EduX" width="46" height="46" />
        <div>
          <div class="eyebrow">Exam intelligence report</div>
          <div class="brand-name">MediXO <span class="brand-edu">EduX</span></div>
        </div>
      </div>
      <div class="sub">
        ${model.who ? `<div class="who">${htmlEscape(model.who)}</div>` : ''}
        <div class="when">Generated ${htmlEscape(model.dateStr)}</div>
      </div>
    </div>
    <div class="body">
    <div class="meta-box">
      ${metaCell('Exam name', model.examName)}
      ${metaCell('Subject', model.subjectText)}
      ${metaCell('Pattern', model.pattern)}
      ${metaCell('Status', model.examStatus)}
      ${metaCell('Exam date', model.examDate)}
      ${metaCell('Duration', model.durationLabel)}
      ${metaCell('Time taken', model.timeTakenLabel)}
      ${metaCell('Attempted', model.attempted)}
    </div>

    <div class="hero">
      <div class="hero-top">
        <div>
          <h1 class="hero-title">${htmlEscape(model.scoreLine)}</h1>
          <div class="hero-sub">${htmlEscape(`${model.breakdownLine} · Score ${model.scorePct} · Accuracy ${model.accuracy}`)}</div>
        </div>
      </div>
      ${model.aiSummary ? `<div class="hero-summary">${htmlEscape(model.aiSummary)}</div>` : ''}
    </div>

    <div class="grid-4">
      ${statCard(model.attempted, 'Attempted', 'attempted')}
      ${statCard(model.scorePct, 'Score', 'score')}
      ${statCard(model.accuracy, 'Accuracy', 'accuracy')}
      ${statCard(model.timeTakenLabel, 'Time taken', 'time')}
    </div>

    ${!model.hasTime ? `<p class="note">Timing was not recorded for this attempt.</p>` : ''}

    ${model.subjects.length ? `
    <div class="sec-title">Subject performance</div>
    <table class="data-table">
      <thead><tr><th>Subject</th><th class="ctr">Score</th><th class="ctr">Accuracy</th><th class="ctr">Time Spent</th><th class="ctr">Mastery</th></tr></thead>
      <tbody>${subjectRows}</tbody>
    </table>` : ''}

    ${model.chapters.length ? `
    <div class="sec-title">Chapter mastery</div>
    <table class="data-table">
      <thead><tr><th>Chapter</th><th>Subject</th><th class="ctr">Accuracy</th><th class="ctr">Marks</th><th class="ctr">Time</th><th class="ctr">Mastery</th></tr></thead>
      <tbody>${chapterRows}</tbody>
    </table>
    <div class="sec-title">Chapter time consumption</div>
    ${model.hasChapterTime ? '' : '<p class="note">Chapter timing was not recorded for this attempt.</p>'}
    ${timeRows}` : ''}

    ${model.mistakes.length ? `
    <div class="sec-title">Mistake pattern</div>
    <table class="data-table">
      <thead><tr><th>Category</th><th class="ctr">Count</th></tr></thead>
      <tbody>${mistakeRows}</tbody>
    </table>` : ''}

    ${revisionSectionHtml(model.revisionGroups)}
    </div>

    <div class="footer">
      <div>Generated by MediXO EduX</div>
      <div>${htmlEscape(model.examName)} · ${htmlEscape(model.subjectText)}</div>
    </div>
  </div>
</body>
</html>`
}

const INK = [0.118, 0.161, 0.231]
const MUTED = [0.392, 0.455, 0.545]
const WHITE = [1, 1, 1]
const NAVY = [0.059, 0.090, 0.165]
const INDIGO = [0.310, 0.275, 0.898]
const BLUE = [0.145, 0.388, 0.922]
const CYAN = [0.133, 0.827, 0.933]
const TEAL = [0.078, 0.722, 0.651]
const EMERALD = [0.020, 0.588, 0.412]
const AMBER = [0.706, 0.325, 0.035]
const ROSE = [0.725, 0.110, 0.227]
const SLATE = [0.945, 0.961, 0.976]
const LINE = [0.886, 0.910, 0.941]
const INDIGO_SOFT = [0.933, 0.925, 0.996]
const EMERALD_SOFT = [0.925, 0.992, 0.961]
const AMBER_SOFT = [0.996, 0.953, 0.780]
const BLUE_SOFT = [0.925, 0.961, 1]

function masteryInk(level) {
  if (level === 'Strong') return EMERALD
  if (level === 'Average' || level === 'Review') return BLUE
  if (level === 'Weak' || level === 'Low attempt') return AMBER
  if (level === 'Critical') return ROSE
  return null
}

function loadLogoPixels(image, size) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, size, size)
  const pad = Math.round(size * 0.08)
  ctx.drawImage(image, pad, pad, size - pad * 2, size - pad * 2)
  const src = ctx.getImageData(0, 0, size, size).data
  const rgb = new Uint8Array(size * size * 3)
  for (let i = 0, p = 0; i < src.length; i += 4, p += 3) {
    const r = src[i]
    const g = src[i + 1]
    const b = src[i + 2]
    const a = src[i + 3] / 255
    const backdrop = r < 40 && g < 40 && b < 40
    if (backdrop || a < 0.05) {
      rgb[p] = HEADER_RGB[0]
      rgb[p + 1] = HEADER_RGB[1]
      rgb[p + 2] = HEADER_RGB[2]
    } else {
      rgb[p] = Math.round(r * a + HEADER_RGB[0] * (1 - a))
      rgb[p + 1] = Math.round(g * a + HEADER_RGB[1] * (1 - a))
      rgb[p + 2] = Math.round(b * a + HEADER_RGB[2] * (1 - a))
    }
  }
  return { width: size, height: size, rgb }
}

async function loadBrandLogo() {
  if (typeof document === 'undefined') return null
  try {
    const logoMod = await import('../../assets/logo.png')
    const src = typeof logoMod.default === 'string' ? logoMod.default : ''
    if (!src) return null
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('logo'))
      img.src = src
      if (img.complete && img.naturalWidth) resolve()
    })
    return loadLogoPixels(img, 180)
  } catch {
    return null
  }
}

export function buildReportPdf(model, logo) {
  const pageW = 595.28
  const pageH = 841.89
  const margin = 28
  const contentW = pageW - margin * 2
  const floor = margin + 20
  const objects = []
  const add = (body) => {
    objects.push(body)
    return objects.length
  }
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  let imageId = null
  if (logo && logo.width > 0 && logo.height > 0 && logo.rgb && logo.rgb.length === logo.width * logo.height * 3) {
    const encoder = new TextEncoder()
    const header = encoder.encode(
      `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${logo.rgb.length} >>\nstream\n`,
    )
    const footer = encoder.encode('\nendstream')
    const body = new Uint8Array(header.length + logo.rgb.length + footer.length)
    body.set(header, 0)
    body.set(logo.rgb, header.length)
    body.set(footer, header.length + logo.rgb.length)
    imageId = add(body)
  }

  const pagesOps = []
  let ops = []
  let y = 0

  const rgb = (color) => color.map((n) => Number(n).toFixed(3)).join(' ')
  const fillRect = (x, yy, w, h, color) => {
    ops.push(`${rgb(color)} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`)
  }
  const strokeRect = (x, yy, w, h, color, width = 0.6) => {
    ops.push(`${rgb(color)} RG ${width} w ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`)
  }
  const clipRaw = (str, width, size) => {
    const raw = String(str ?? '')
    const max = Math.max(1, Math.floor((width - 8) / (size * 0.5)))
    if (raw.length <= max) return raw
    return `${raw.slice(0, Math.max(1, max - 3))}...`
  }
  const wrapLines = (str, width, size, maxLines) => {
    const words = String(str ?? '').split(/\s+/).filter(Boolean)
    const maxChars = Math.max(12, Math.floor((width - 8) / (size * 0.48)))
    const lines = []
    let current = ''
    let index = 0
    while (index < words.length && lines.length < maxLines) {
      const next = current ? `${current} ${words[index]}` : words[index]
      if (next.length > maxChars && current) {
        lines.push(current)
        current = ''
        continue
      }
      current = next
      index += 1
    }
    if (current && lines.length < maxLines) lines.push(current)
    if (index < words.length && lines.length) {
      const last = lines[lines.length - 1]
      lines[lines.length - 1] = `${last.slice(0, Math.max(0, last.length - 3))}...`
    }
    return lines
  }
  const text = (str, x, yy, size, bold, color) => {
    const safe = pdfSafe(str)
    if (!safe) return
    ops.push(`${rgb(color || INK)} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td (${safe}) Tj ET`)
  }
  const textWidth = (str, size, bold) => pdfSafe(str).length * size * (bold ? 0.56 : 0.5)
  const textRight = (str, rightX, yy, size, bold, color) => {
    text(str, rightX - textWidth(str, size, bold), yy, size, bold, color)
  }
  const hline = (yy) => {
    ops.push(`${rgb(LINE)} RG 0.8 w ${margin.toFixed(2)} ${yy.toFixed(2)} m ${(pageW - margin).toFixed(2)} ${yy.toFixed(2)} l S`)
  }
  const drawLogo = (x, yy, size) => {
    if (!imageId) {
      fillRect(x, yy, size, size, INDIGO)
      text('M', x + size * 0.28, yy + size * 0.32, Math.max(8, size * 0.42), true, WHITE)
      return
    }
    ops.push(`q ${size.toFixed(2)} 0 0 ${size.toFixed(2)} ${x.toFixed(2)} ${yy.toFixed(2)} cm /Im1 Do Q`)
  }

  const paintChrome = (continued) => {
    strokeRect(margin - 8, margin - 8, pageW - (margin - 8) * 2, pageH - (margin - 8) * 2, LINE, 0.8)
    text('Generated by MediXO EduX', margin, margin + 2, 8, false, MUTED)
    textRight(clipRaw(`${model.examName} | ${model.subjectText}`, 250, 8), pageW - margin, margin + 2, 8, false, MUTED)

    if (!continued) {
      const headerH = 78
      const headerBottom = pageH - margin - headerH
      fillRect(margin, headerBottom, contentW, headerH, NAVY)
      fillRect(margin, headerBottom, contentW, 3, CYAN)
      const logoSize = 46
      const logoY = headerBottom + (headerH - logoSize) / 2
      drawLogo(margin + 14, logoY, logoSize)
      const tx = margin + 14 + logoSize + 12
      text('EXAM INTELLIGENCE REPORT', tx, logoY + 32, 8, true, CYAN)
      text('MediXO', tx, logoY + 14, 16, true, WHITE)
      text('EduX', tx + 64, logoY + 14, 16, true, CYAN)
      if (model.who) textRight(clipRaw(model.who, 210, 9), pageW - margin - 12, logoY + 30, 9, true, WHITE)
      textRight(`Generated ${model.dateStr}`, pageW - margin - 12, logoY + 14, 8, false, [0.741, 0.796, 0.882])
      y = headerBottom - 16
      return
    }

    const barH = 32
    const barBottom = pageH - margin - barH
    fillRect(margin, barBottom, contentW, barH, NAVY)
    fillRect(margin, barBottom, contentW, 2, CYAN)
    drawLogo(margin + 8, barBottom + 7, 18)
    text('MediXO EduX', margin + 32, barBottom + 12, 10, true, WHITE)
    textRight(clipRaw(model.examName, 220, 8), pageW - margin - 10, barBottom + 12, 8, false, [0.741, 0.796, 0.882])
    y = barBottom - 16
  }

  const newPage = (continued) => {
    if (ops.length) pagesOps.push(ops)
    ops = []
    paintChrome(continued)
  }
  const ensure = (need) => {
    if (y - need < floor) newPage(true)
  }
  const sectionTitle = (title) => {
    ensure(36)
    y -= 2
    fillRect(margin, y - 1, 4, 12, INDIGO)
    text(title, margin + 10, y, 11, true, [0.192, 0.180, 0.506])
    y -= 8
    hline(y)
    y -= 12
  }

  const drawTable = (title, headers, rows, widths) => {
    if (!rows.length) return
    sectionTitle(title)
    const rowH = 16
    const drawHeader = () => {
      let x = margin
      headers.forEach((header, index) => {
        fillRect(x, y - 4, widths[index], rowH, INDIGO)
        text(clipRaw(header, widths[index], 7.5), x + 4, y, 7.5, true, WHITE)
        x += widths[index]
      })
      y -= rowH
    }
    const drawRow = (row, alt) => {
      let x = margin
      row.forEach((val, index) => {
        const timeCol = headers.findIndex((header) => header === 'Time' || header === 'Time Spent')
        const mastery = index === row.length - 1 ? masteryInk(val) : null
        const tone = mastery || (index === timeCol ? INDIGO : null)
        fillRect(x, y - 4, widths[index], rowH, alt ? SLATE : WHITE)
        strokeRect(x, y - 4, widths[index], rowH, LINE, 0.4)
        text(clipRaw(val, widths[index], 8), x + 4, y, 8, index === 0 || !!mastery, tone || INK)
        x += widths[index]
      })
      y -= rowH
    }
    ensure(rowH + 4)
    drawHeader()
    rows.forEach((row, index) => {
      if (y - rowH < floor) {
        newPage(true)
        sectionTitle(title)
        drawHeader()
      }
      drawRow(row, index % 2 === 1)
    })
    y -= 6
  }

  newPage(false)

  const meta = [
    ['Exam name', model.examName],
    ['Subject', model.subjectText],
    ['Pattern', model.pattern],
    ['Status', model.examStatus],
    ['Exam date', model.examDate],
    ['Duration', model.durationLabel],
    ['Time taken', model.timeTakenLabel],
    ['Attempted', model.attempted],
  ]
  const gap = 6
  const cardW = (contentW - gap * 3) / 4
  const cardH = 34
  for (let i = 0; i < meta.length; i += 4) {
    ensure(cardH + 8)
    for (let c = 0; c < 4 && i + c < meta.length; c += 1) {
      const x = margin + c * (cardW + gap)
      const bottom = y - cardH
      fillRect(x, bottom, cardW, cardH, SLATE)
      fillRect(x, bottom, 3, cardH, INDIGO)
      text(meta[i + c][0].toUpperCase(), x + 8, bottom + 20, 7, true, TEAL)
      text(clipRaw(meta[i + c][1], cardW - 12, 9), x + 8, bottom + 7, 9, true, INK)
    }
    y -= cardH + 6
  }

  const summaryLines = model.aiSummary ? wrapLines(model.aiSummary, contentW - 28, 8, 2) : []
  const heroH = 40 + summaryLines.length * 12
  ensure(heroH + 8)
  const heroBottom = y - heroH
  fillRect(margin, heroBottom, contentW, heroH, INDIGO_SOFT)
  fillRect(margin, heroBottom, 4, heroH, INDIGO)
  text(clipRaw(model.scoreLine, contentW - 28, 14), margin + 14, heroBottom + heroH - 16, 14, true, [0.192, 0.180, 0.506])
  text(clipRaw(`${model.breakdownLine}   |   Score ${model.scorePct}   |   Accuracy ${model.accuracy}`, contentW - 28, 8), margin + 14, heroBottom + heroH - 32, 8, false, MUTED)
  summaryLines.forEach((line, index) => {
    text(line, margin + 14, heroBottom + 8 + (summaryLines.length - 1 - index) * 11, 8, false, INK)
  })
  y = heroBottom - 12

  const stats = [
    [model.attempted, 'ATTEMPTED', INDIGO, INDIGO_SOFT],
    [model.scorePct, 'SCORE', BLUE, BLUE_SOFT],
    [model.accuracy, 'ACCURACY', EMERALD, EMERALD_SOFT],
    [model.timeTakenLabel, 'TIME TAKEN', AMBER, AMBER_SOFT],
  ]
  const statGap = 6
  const statW = (contentW - statGap * 3) / 4
  const statH = 42
  ensure(statH + 6)
  stats.forEach((stat, index) => {
    const x = margin + index * (statW + statGap)
    const bottom = y - statH
    fillRect(x, bottom, statW, statH, stat[3])
    fillRect(x, bottom + statH - 3, statW, 3, stat[2])
    text(clipRaw(stat[0], statW - 10, 12), x + 8, bottom + 18, 12, true, stat[2])
    text(stat[1], x + 8, bottom + 7, 7, true, MUTED)
  })
  y -= statH + 8
  if (!model.hasTime) {
    ensure(14)
    text('Timing was not recorded for this attempt.', margin, y, 8, false, AMBER)
    y -= 12
  }

  const tableW = contentW
  drawTable(
    'Subject performance',
    ['Subject', 'Score', 'Accuracy', 'Time Spent', 'Mastery'],
    model.subjects.map((s) => [s.name, s.score, s.accuracy, s.timeSpent, s.mastery]),
    [tableW * 0.26, tableW * 0.18, tableW * 0.16, tableW * 0.20, tableW * 0.20],
  )
  drawTable(
    'Chapter mastery',
    ['Chapter', 'Subject', 'Accuracy', 'Marks', 'Time', 'Mastery'],
    model.chapters.map((c) => [c.chapter, c.subject, c.accuracy, c.marks, c.time, c.mastery]),
    [tableW * 0.24, tableW * 0.18, tableW * 0.14, tableW * 0.12, tableW * 0.14, tableW * 0.18],
  )

  if (model.chapters.length) {
    sectionTitle('Chapter time consumption')
    if (!model.hasChapterTime) {
      text('Chapter timing was not recorded for this attempt.', margin, y, 8, false, AMBER)
      y -= 14
    } else {
      const maxMin = Math.max(...model.chapters.map((c) => c.timeMinutes))
      const nameW = 156
      const subjectX = margin + nameW
      const timeW = 92
      const barX = subjectX + 86
      const barMax = Math.max(40, pageW - margin - timeW - barX)
      model.chapters.forEach((chapter) => {
        ensure(18)
        text(clipRaw(chapter.chapter, nameW, 9), margin, y, 9, true, INK)
        text(clipRaw(chapter.subject, 78, 8), subjectX, y, 8, false, MUTED)
        fillRect(barX, y - 1, barMax, 6, SLATE)
        const barW = maxMin > 0 ? (chapter.timeMinutes / maxMin) * barMax : 0
        if (barW > 0.4) fillRect(barX, y - 1, barW, 6, INDIGO)
        textRight(`${chapter.time} (${chapter.share})`, pageW - margin, y, 8, true, INDIGO)
        y -= 16
      })
    }
  }

  drawTable(
    'Mistake pattern',
    ['Category', 'Count'],
    model.mistakes.map((m) => [m.category, m.count]),
    [tableW * 0.78, tableW * 0.22],
  )

  if (model.revisionGroups.length) {
    sectionTitle('Revision priorities')
    let top = y
    const syncPage = () => {
      newPage(true)
      top = y
    }
    const ensureTop = (need) => {
      if (top - need < floor) syncPage()
    }
    const gap = (px) => {
      top -= px
    }
    const band = (height, fill, accent) => {
      const bottom = top - height
      fillRect(margin, bottom, tableW, height, fill)
      if (accent) fillRect(margin, bottom, 3, height, accent)
      return bottom
    }
    const paintSubjectBand = (group) => {
      const height = 28
      const bottom = band(height, NAVY, CYAN)
      const base = bottom + 10
      const mastery = group.mastery || ''
      let reserve = 12
      if (mastery) {
        const pillW = textWidth(mastery, 8, true) + 14
        const pillH = 14
        const pillX = pageW - margin - 10 - pillW
        const pillBottom = bottom + (height - pillH) / 2
        const pillFill = mastery === 'Critical' ? [1, 0.894, 0.906] : mastery === 'Weak' ? AMBER_SOFT : INDIGO_SOFT
        fillRect(pillX, pillBottom, pillW, pillH, pillFill)
        text(mastery, pillX + 7, pillBottom + 4, 8, true, masteryInk(mastery) || INDIGO)
        reserve += pillW + 8
      }
      const accuracy = group.accuracyLabel && group.accuracyLabel !== '—' ? `${group.accuracyLabel} accuracy` : ''
      if (accuracy) {
        textRight(accuracy, pageW - margin - reserve, base, 8, false, [0.78, 0.82, 0.96])
        reserve += textWidth(accuracy, 8, false) + 10
      }
      text(clipRaw(group.subject, Math.max(80, tableW - reserve - 8), 11), margin + 12, base, 11, true, WHITE)
      top = bottom
    }
    const paintContinue = (subject, kind) => {
      const height = 22
      const bottom = band(height, NAVY, CYAN)
      text(clipRaw(`${subject}   ·   ${kind} continued`, tableW - 24, 9), margin + 12, bottom + 7, 9, true, WHITE)
      top = bottom - 8
    }
    const paintLabel = (label) => {
      const height = 16
      const bottom = band(height, INDIGO_SOFT, INDIGO)
      text(label, margin + 12, bottom + 4, 8, true, INDIGO)
      top = bottom - 6
    }
    const drawRevisionTable = (headers, rows, widths, subject, kind) => {
      if (!rows.length) return
      const rowH = 18
      const paintHeader = () => {
        const bottom = top - rowH
        let x = margin
        headers.forEach((header, index) => {
          fillRect(x, bottom, widths[index], rowH, INDIGO)
          text(clipRaw(header, widths[index] - 8, 8), x + 6, bottom + 5, 8, true, WHITE)
          x += widths[index]
        })
        top = bottom
      }
      const paintData = (row, alt) => {
        const bottom = top - rowH
        let x = margin
        row.forEach((val, index) => {
          const tone = index === row.length - 1 ? masteryInk(val) : null
          fillRect(x, bottom, widths[index], rowH, alt ? SLATE : WHITE)
          strokeRect(x, bottom, widths[index], rowH, LINE, 0.4)
          text(clipRaw(val, widths[index] - 8, 8), x + 6, bottom + 5, 8, index === 0 || !!tone, tone || INK)
          x += widths[index]
        })
        top = bottom
      }
      paintHeader()
      rows.forEach((row, index) => {
        if (top - rowH < floor) {
          syncPage()
          paintContinue(subject, kind)
          paintHeader()
        }
        paintData(row, index % 2 === 1)
      })
    }

    const noteLines = wrapLines(
      'Weakest subject first. Every weak topic from this attempt is listed under its subject.',
      tableW,
      8,
      2,
    )
    ensureTop(noteLines.length * 12 + 8)
    noteLines.forEach((line) => {
      text(line, margin, top - 10, 8, false, MUTED)
      top -= 12
    })
    gap(8)

    model.revisionGroups.forEach((group) => {
      ensureTop(28 + 8 + 16 + 6 + 18 + 18)
      paintSubjectBand(group)
      const need = 8 + 16 + 6 + 18 + 18
      if (top - need < floor) {
        syncPage()
        paintContinue(group.subject, 'Topics')
      } else {
        gap(8)
      }
      paintLabel('Topics to revise')
      drawRevisionTable(
        ['Topic', 'Chapter', 'Accuracy', 'Priority'],
        group.topics.map((row) => [row.name, row.chapter, row.accuracyLabel, row.priority]),
        [tableW * 0.40, tableW * 0.28, tableW * 0.16, tableW * 0.16],
        group.subject,
        'Topics',
      )
      gap(14)
    })
    y = top
  }

  pagesOps.push(ops)

  const contentIds = pagesOps.map((pageOps) => {
    const stream = pageOps.join('\n')
    return add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })
  const pagesObjIndex = objects.length
  objects.push('')
  const catalogId = add('')
  const xobj = imageId ? ` /XObject << /Im1 ${imageId} 0 R >>` : ''
  const pageIds = contentIds.map((contentId) => add(
    `<< /Type /Page /Parent ${pagesObjIndex + 1} 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${font} 0 R /F2 ${fontBold} 0 R >>${xobj} >> /Contents ${contentId} 0 R >>`,
  ))
  objects[pagesObjIndex] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesObjIndex + 1} 0 R >>`

  const encoder = new TextEncoder()
  const chunks = [encoder.encode('%PDF-1.4\n'), new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A])]
  const offsets = [0]
  let pos = chunks[0].length + chunks[1].length
  objects.forEach((body, i) => {
    const head = encoder.encode(`${i + 1} 0 obj\n`)
    const mid = typeof body === 'string' ? encoder.encode(body) : body
    const tail = encoder.encode('\nendobj\n')
    offsets.push(pos)
    chunks.push(head, mid, tail)
    pos += head.length + mid.length + tail.length
  })
  const xrefStart = pos
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  chunks.push(encoder.encode(xref))
  chunks.push(encoder.encode(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`))
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  chunks.forEach((c) => {
    out.set(c, o)
    o += c.length
  })
  return out
}

/** Student identity for the PDF header. Prefers an explicit user (student portal); otherwise the analysis payload (faculty/admin viewing a student). */
export function analysisPdfUser(data, fallbackUser) {
  if (fallbackUser?.fullName || fallbackUser?.rollNo) return fallbackUser
  const meta = data?.meta ?? {}
  const attempt = data?.attempt ?? {}
  const student = (typeof meta.student === 'object' && meta.student) || data?.student || {}
  const fullName = student.fullName
    || student.name
    || (typeof meta.student === 'string' ? meta.student : null)
    || meta.studentName
    || attempt.studentName
    || null
  const rollNo = student.rollNo || student.roll || meta.rollNo || attempt.roll || null
  return { fullName, rollNo }
}

/**
 * Exam Intelligence Report — premium two-page publication.
 *
 * The legacy raw PDF writer below remains exported for backward compatibility
 * and unit tests. The production download path now uses the reusable premium
 * engine, which embeds fonts, preserves Unicode/LaTeX and supports the full
 * dynamic analysis payload.
 */
export async function exportAnalysisPDF(data, subject, user) {
  if (!data || typeof window === 'undefined') return
  const generatedAt = new Date()
  const [{ buildPremiumIntelligenceModel }, { createPremiumPdf }] = await Promise.all([
    import('./premium-pdf/model.js'),
    import('./premium-pdf/index.js'),
  ])
  const model = buildPremiumIntelligenceModel({ data, subject, user, generatedAt })
  const result = await createPremiumPdf({ kind: 'intelligence', model })
  if (result.flags.length) console.warn('[MediXO EduX] expressions flagged for verification', result.flags)
  const blob = new Blob([result.bytes], { type: 'application/pdf' })
  triggerDownload(blob, `MediXO_EduX_${fileStub(model.examName)}_Exam_Intelligence_Report.pdf`)
  return result
}

/* ============================================================
   FULL ANALYSIS PDF — premium multi-page document
   Includes: cover, score summary, per-question review,
   difficulty breakdown bar chart, mistake pie chart,
   subject performance bar chart, time distribution.
   ============================================================ */

/* ---------- Colour palette (reused from base PDF) ---------- */
const FA_NAVY    = [0.059, 0.090, 0.165]
const FA_INDIGO  = [0.310, 0.275, 0.898]
const FA_BLUE    = [0.145, 0.388, 0.922]
const FA_CYAN    = [0.133, 0.827, 0.933]
const FA_TEAL    = [0.078, 0.722, 0.651]
const FA_EMERALD = [0.020, 0.588, 0.412]
const FA_AMBER   = [0.706, 0.325, 0.035]
const FA_ROSE    = [0.725, 0.110, 0.227]
const FA_VIOLET  = [0.545, 0.361, 0.961]
const FA_SLATE   = [0.945, 0.961, 0.976]
const FA_LINE    = [0.886, 0.910, 0.941]
const FA_WHITE   = [1, 1, 1]
const FA_INK     = [0.118, 0.161, 0.231]
const FA_MUTED   = [0.392, 0.455, 0.545]
const FA_INDIGO_SOFT  = [0.933, 0.925, 0.996]
const FA_EMERALD_SOFT = [0.925, 0.992, 0.961]
const FA_ROSE_SOFT    = [1.000, 0.894, 0.906]
const FA_AMBER_SOFT   = [0.996, 0.953, 0.780]
const FA_BLUE_SOFT    = [0.925, 0.961, 1.000]
const FA_VIOLET_SOFT  = [0.953, 0.933, 1.000]
const FA_TEAL_SOFT    = [0.878, 0.992, 0.973]

const FA_STATUS_COLOR = {
  Correct:   FA_EMERALD,
  Incorrect: FA_ROSE,
  Skipped:   FA_AMBER,
}
const FA_STATUS_SOFT = {
  Correct:   FA_EMERALD_SOFT,
  Incorrect: FA_ROSE_SOFT,
  Skipped:   FA_AMBER_SOFT,
}
const FA_DIFFICULTY_COLOR = {
  Easy:   FA_TEAL,
  Medium: FA_AMBER,
  Hard:   FA_ROSE,
}

/** Map a palette colour index (0-5) to a distinct accent colour */
function faSubjectColor(index) {
  const palette = [FA_INDIGO, FA_TEAL, FA_VIOLET, FA_EMERALD, FA_AMBER, FA_ROSE, FA_BLUE, FA_CYAN]
  return palette[index % palette.length]
}

function faMasteryInk(level) {
  if (level === 'Strong')               return FA_EMERALD
  if (level === 'Average' || level === 'Review') return FA_BLUE
  if (level === 'Weak'   || level === 'Low attempt') return FA_AMBER
  if (level === 'Critical')             return FA_ROSE
  return null
}

/**
 * Build the full analysis model — extends buildReportModel with
 * per-question rows and chart data aggregations.
 */
function buildFullModel({ data, subject, user, generatedAt }) {
  const base = buildReportModel({ data, subject, user, generatedAt })

  const isAll = subject === 'All Subjects' || !subject
  const activeSubject = isAll ? null : subject

  const allReview = (data?.questionReview ?? [])
  const reviewSource = activeSubject
    ? allReview.filter((q) => q.subject === activeSubject)
    : allReview

  /* ---- per-question rows ---- */
  const questions = reviewSource.map((q) => ({
    q:          String(q.q ?? ''),
    subject:    String(q.subject ?? ''),
    chapter:    String(q.chapter ?? ''),
    topic:      String(q.topic ?? ''),
    difficulty: String(q.difficulty ?? 'Medium'),
    type:       String(q.type ?? 'MCQ'),
    status:     String(q.status ?? 'Skipped'),
    marks:      String(q.marks ?? '0'),
    time:       formatReportTime(q.time),
    selected:   optLetter(q.selected),
    correct:    optLetter(q.correctAnswer),
    hint:       String(q.hint ?? q.explanation ?? '').slice(0, 220),
    mistake:    String(q.mistakeCategory ?? ''),
  }))

  /* ---- difficulty breakdown (for bar chart) ---- */
  const diffMap = {}
  for (const q of reviewSource) {
    const d = String(q.difficulty ?? 'Medium')
    if (!diffMap[d]) diffMap[d] = { level: d, total: 0, correct: 0, incorrect: 0, skipped: 0 }
    diffMap[d].total += 1
    const s = String(q.status ?? '').toLowerCase()
    if (s === 'correct')   diffMap[d].correct   += 1
    else if (s === 'incorrect') diffMap[d].incorrect += 1
    else                   diffMap[d].skipped   += 1
  }
  const diffBreakdown = ['Easy', 'Medium', 'Hard']
    .map((d) => diffMap[d])
    .filter(Boolean)
    .map((d) => ({
      ...d,
      accuracyPct: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    }))

  /* ---- mistake breakdown (for pie chart) ---- */
  const mistakeData = (data?.mistakes ?? []).map((m, i) => ({
    label: String(m.category ?? 'Other'),
    count: Number(m.count ?? 0),
    color: [FA_ROSE, FA_AMBER, FA_VIOLET, FA_BLUE, FA_TEAL, FA_INDIGO, FA_MUTED][i % 7],
  }))

  /* ---- subject bar chart ---- */
  const subjectBars = (base.subjects ?? []).map((s, i) => {
    const acc = parseFloat(String(s.accuracy).replace('%', '')) || 0
    return {
      name:     s.name,
      score:    s.score,
      accuracy: acc,
      color:    faSubjectColor(i),
    }
  })

  /* ---- time distribution per question ---- */
  const timeDistQuestions = reviewSource
    .map((q) => ({ q: String(q.q ?? ''), mins: Number(q.time ?? 0) }))
    .filter((q) => q.mins > 0)
    .slice(0, 30)  // cap at 30 for chart readability

  /* ---- cognitive quadrant summary ---- */
  const cq = data?.cognitiveQuadrants ?? {}

  return {
    ...base,
    questions,
    diffBreakdown,
    mistakeData,
    subjectBars,
    timeDistQuestions,
    cognitiveQuadrants: {
      fastCorrect:   Number(cq.fastCorrect   ?? 0),
      slowCorrect:   Number(cq.slowCorrect   ?? 0),
      fastIncorrect: Number(cq.fastIncorrect ?? 0),
      slowIncorrect: Number(cq.slowIncorrect ?? 0),
    },
    totalQuestions: reviewSource.length,
  }
}

/**
 * Draw a horizontal bar chart.
 * @param {object[]} bars  — [{ label, value, maxValue, color, secondaryLabel }]
 * @param {number} x       — left edge
 * @param {number} topY    — top edge (PDF coords, bar goes downward from here)
 * @param {number} w       — total width
 * @param {number} barH    — height of a single bar
 * @param {number} gap     — vertical gap between bars
 * @param {Function} ops   — the push-ops function
 * @param {Function} rgb   — colour formatter
 * @param {Function} textFn — text primitive
 * @param {Function} fillFn — fillRect primitive
 * @param {Function} textWidthFn
 * @param {Function} clipFn
 * @returns {number}       — total height consumed
 */
function faDrawHBar({
  bars, x, topY, w, barH = 14, gap = 6,
  ops, rgb, textFn, fillFn, strokeFn, textWidthFn, clipFn,
}) {
  const labelW  = 98
  const valueW  = 44
  const trackX  = x + labelW + 4
  const trackW  = w - labelW - valueW - 8
  const maxVal  = Math.max(...bars.map((b) => b.value), 1)
  let consumed  = 0

  bars.forEach((bar, i) => {
    const cy = topY - consumed - barH
    const fill  = bar.color ?? FA_INDIGO
    const fillW = trackW > 0 ? Math.max(0, (bar.value / maxVal) * trackW) : 0

    /* track background */
    fillFn(trackX, cy, trackW, barH, FA_SLATE)
    /* bar fill with gradient-like lighter end */
    if (fillW > 0) fillFn(trackX, cy, fillW, barH, fill)
    /* left rounded cap accent */
    fillFn(trackX, cy, 3, barH, fill)

    /* label */
    textFn(clipFn(bar.label, labelW - 6, 8), x, cy + barH - 9, 8, false, FA_INK)

    /* value label */
    const valStr = bar.secondaryLabel ?? String(bar.value)
    textFn(valStr, trackX + trackW + 4, cy + barH - 9, 8, true, fill)

    consumed += barH + gap
    if (i < bars.length - 1) {
      /* thin separator */
      ops.push(`${rgb(FA_LINE)} RG 0.4 w ${x.toFixed(2)} ${(cy - gap / 2).toFixed(2)} m ${(x + w).toFixed(2)} ${(cy - gap / 2).toFixed(2)} l S`)
    }
  })
  return consumed
}

/**
 * Draw a simple pie/donut chart as a series of arc sectors.
 * Uses PDF arc approximation (Bezier curves).
 * @returns {number} height consumed (square bounding box = diameter)
 */
function faDrawPie({
  slices, cx, cy, r, innerR = 0,
  ops, rgb, fillFn, textFn,
}) {
  if (!slices || slices.length === 0) return 0
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  if (total <= 0) return 0

  let angle = -Math.PI / 2  // start at 12 o'clock

  const arcPath = (startAngle, endAngle, outer, inner) => {
    /* approximate arc with 4 Bezier segments */
    const segments = Math.ceil(Math.abs(endAngle - startAngle) / (Math.PI / 2))
    const step = (endAngle - startAngle) / segments
    const kappa = (4 / 3) * Math.tan(step / 4)
    let d = ''

    // outer arc forward
    for (let i = 0; i < segments; i++) {
      const a0 = startAngle + i * step
      const a1 = a0 + step
      const cos0 = Math.cos(a0); const sin0 = Math.sin(a0)
      const cos1 = Math.cos(a1); const sin1 = Math.sin(a1)
      const ox0 = cx + outer * cos0; const oy0 = cy + outer * sin0
      const ox1 = cx + outer * cos1; const oy1 = cy + outer * sin1
      const cpx0 = ox0 - kappa * outer * sin0; const cpy0 = oy0 + kappa * outer * cos0
      const cpx1 = ox1 + kappa * outer * sin1; const cpy1 = oy1 - kappa * outer * cos1
      if (i === 0) d += `${ox0.toFixed(2)} ${oy0.toFixed(2)} m `
      d += `${cpx0.toFixed(2)} ${cpy0.toFixed(2)} ${cpx1.toFixed(2)} ${cpy1.toFixed(2)} ${ox1.toFixed(2)} ${oy1.toFixed(2)} c `
    }

    if (inner > 0) {
      // line to inner arc start (at endAngle)
      const ix1 = cx + inner * Math.cos(endAngle); const iy1 = cy + inner * Math.sin(endAngle)
      d += `${ix1.toFixed(2)} ${iy1.toFixed(2)} l `
      // inner arc backward
      for (let i = segments - 1; i >= 0; i--) {
        const a0 = startAngle + i * step
        const a1 = a0 + step
        const cos0 = Math.cos(a0); const sin0 = Math.sin(a0)
        const cos1 = Math.cos(a1); const sin1 = Math.sin(a1)
        const ix0 = cx + inner * cos0; const iy0 = cy + inner * sin0
        const ix1b = cx + inner * cos1; const iy1b = cy + inner * sin1
        const cpx0 = ix1b + kappa * inner * sin1; const cpy0 = iy1b - kappa * inner * cos1
        const cpx1 = ix0 - kappa * inner * sin0; const cpy1 = iy0 + kappa * inner * cos0
        d += `${cpx0.toFixed(2)} ${cpy0.toFixed(2)} ${cpx1.toFixed(2)} ${cpy1.toFixed(2)} ${ix0.toFixed(2)} ${iy0.toFixed(2)} c `
      }
    } else {
      d += `${cx.toFixed(2)} ${cy.toFixed(2)} l `
    }
    d += 'h f'
    return d
  }

  slices.forEach((slice) => {
    const sweep = (slice.value / total) * 2 * Math.PI
    const endAngle = angle + sweep
    const col = slice.color ?? FA_INDIGO
    ops.push(`${rgb(col)} rg ${arcPath(angle, endAngle, r, innerR)}`)
    angle = endAngle
  })

  // donut hole fill
  if (innerR > 1) fillFn(cx - innerR, cy - innerR, innerR * 2, innerR * 2, FA_WHITE)
}

/**
 * Draw a vertical grouped bar chart.
 * @param {object[]} groups — [{ label, bars: [{ value, color }] }]
 */
function faDrawVBar({
  groups, x, bottomY, w, chartH = 80, barGap = 4, groupGap = 10,
  ops, rgb, textFn, fillFn, strokeFn, textWidthFn, clipFn,
}) {
  if (!groups || groups.length === 0) return 0
  const maxVal = Math.max(...groups.flatMap((g) => g.bars.map((b) => b.value)), 1)
  const numGroups = groups.length
  const numBars = groups[0].bars.length
  const totalGroupW = (w - groupGap * (numGroups - 1)) / numGroups
  const singleBarW = Math.max(4, (totalGroupW - barGap * (numBars - 1)) / numBars)

  /* axis line */
  ops.push(`${rgb(FA_LINE)} RG 0.6 w ${x.toFixed(2)} ${bottomY.toFixed(2)} m ${(x + w).toFixed(2)} ${bottomY.toFixed(2)} l S`)

  /* horizontal guide lines at 25%, 50%, 75% */
  ;[0.25, 0.5, 0.75, 1.0].forEach((frac) => {
    const lineY = bottomY + frac * chartH
    ops.push(`${rgb(FA_LINE)} RG 0.4 w ${x.toFixed(2)} ${lineY.toFixed(2)} m ${(x + w).toFixed(2)} ${lineY.toFixed(2)} l S`)
    const label = `${Math.round(frac * maxVal)}`
    textFn(label, x - textWidthFn(label, 7, false) - 2, lineY - 3, 7, false, FA_MUTED)
  })

  groups.forEach((group, gi) => {
    const groupX = x + gi * (totalGroupW + groupGap)
    group.bars.forEach((bar, bi) => {
      const bx = groupX + bi * (singleBarW + barGap)
      const bh = chartH > 0 ? (bar.value / maxVal) * chartH : 0
      const col = bar.color ?? FA_INDIGO
      if (bh > 0.5) fillFn(bx, bottomY, singleBarW, bh, col)
      /* top cap accent */
      if (bh > 2) fillFn(bx, bottomY + bh - 2, singleBarW, 2, col.map((c) => Math.min(1, c + 0.15)))
    })
    /* group label */
    const labelX = groupX + totalGroupW / 2
    const label = clipFn(group.label, totalGroupW + groupGap - 2, 7.5)
    textFn(label, labelX - textWidthFn(label, 7.5, false) / 2, bottomY - 10, 7.5, false, FA_MUTED)
  })

  return chartH + 18
}

/**
 * Render a legend row for pie/bar charts.
 */
function faLegendRow({ items, x, y, w, textFn, fillFn, textWidthFn }) {
  let cx = x
  const dotSize = 7
  const gap = 14
  items.forEach((item) => {
    if (cx + dotSize + gap + textWidthFn(item.label, 7.5, false) > x + w) return
    fillFn(cx, y - dotSize + 2, dotSize, dotSize, item.color ?? FA_INDIGO)
    textFn(item.label, cx + dotSize + 3, y - dotSize + 2, 7.5, false, FA_INK)
    cx += dotSize + 3 + textWidthFn(item.label, 7.5, false) + gap
  })
}

/** Build the full-analysis PDF binary (Uint8Array). */
export function buildFullAnalysisPdf(model, logo) {
  const pageW    = 595.28
  const pageH    = 841.89
  const margin   = 32
  const contentW = pageW - margin * 2
  const FOOTER_H = 20
  const HEADER_H_CONT = 34
  const floor    = margin + FOOTER_H + 4

  const objects = []
  const add = (body) => { objects.push(body); return objects.length }
  const font     = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  let imageId = null
  if (logo && logo.width > 0 && logo.rgb && logo.rgb.length === logo.width * logo.height * 3) {
    const encoder = new TextEncoder()
    const imgHeader = encoder.encode(
      '<< /Type /XObject /Subtype /Image /Width ' + logo.width + ' /Height ' + logo.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ' + logo.rgb.length + ' >>\nstream\n',
    )
    const imgFooter = encoder.encode('\nendstream')
    const imgBody = new Uint8Array(imgHeader.length + logo.rgb.length + imgFooter.length)
    imgBody.set(imgHeader, 0)
    imgBody.set(logo.rgb, imgHeader.length)
    imgBody.set(imgFooter, imgHeader.length + logo.rgb.length)
    imageId = add(imgBody)
  }

  const pagesOps = []
  let ops = []
  let y = 0

  const rgb   = (c) => c.map((n) => Number(n).toFixed(3)).join(' ')
  const fillR = (x, yy, w, h, c) =>
    ops.push(rgb(c) + ' rg ' + x.toFixed(2) + ' ' + yy.toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2) + ' re f')
  const strR  = (x, yy, w, h, c, lw) => {
    const lwidth = lw === undefined ? 0.5 : lw
    ops.push(rgb(c) + ' RG ' + lwidth + ' w ' + x.toFixed(2) + ' ' + yy.toFixed(2) + ' ' + w.toFixed(2) + ' ' + h.toFixed(2) + ' re S')
  }
  const txt   = (str, x, yy, size, bold, color) => {
    const safe = pdfSafe(str)
    if (!safe) return
    ops.push(rgb(color || FA_INK) + ' rg BT /' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf ' + x.toFixed(2) + ' ' + yy.toFixed(2) + ' Td (' + safe + ') Tj ET')
  }
  const txtW  = (str, size, bold) => pdfSafe(str).length * size * (bold ? 0.56 : 0.50)
  const txtR  = (str, rx, yy, size, bold, color) => txt(str, rx - txtW(str, size, bold), yy, size, bold, color)
  const clip  = (str, width, size) => {
    const raw = String(str === null || str === undefined ? '' : str)
    const max = Math.max(1, Math.floor((width - 4) / (size * 0.52)))
    return raw.length <= max ? raw : raw.slice(0, Math.max(1, max - 3)) + '...'
  }
  const wrap  = (str, width, size, maxLines) => {
    const words = String(str === null || str === undefined ? '' : str).split(/\s+/).filter(Boolean)
    const maxCh = Math.max(8, Math.floor((width - 8) / (size * 0.50)))
    const wlines = []
    let cur = ''
    let idx = 0
    while (idx < words.length && wlines.length < maxLines) {
      const next = cur ? cur + ' ' + words[idx] : words[idx]
      if (next.length > maxCh && cur) { wlines.push(cur); cur = ''; continue }
      cur = next; idx++
    }
    if (cur && wlines.length < maxLines) wlines.push(cur)
    if (idx < words.length && wlines.length) {
      const last = wlines[wlines.length - 1]
      wlines[wlines.length - 1] = last.slice(0, Math.max(0, last.length - 3)) + '...'
    }
    return wlines
  }
  const hline = (yy) =>
    ops.push(rgb(FA_LINE) + ' RG 0.6 w ' + margin.toFixed(2) + ' ' + yy.toFixed(2) + ' m ' + (pageW - margin).toFixed(2) + ' ' + yy.toFixed(2) + ' l S')
  const drawLogo = (x, yy, size) => {
    if (!imageId) {
      fillR(x, yy, size, size, FA_INDIGO)
      txt('M', x + size * 0.28, yy + size * 0.30, Math.max(8, size * 0.42), true, FA_WHITE)
      return
    }
    ops.push('q ' + size.toFixed(2) + ' 0 0 ' + size.toFixed(2) + ' ' + x.toFixed(2) + ' ' + yy.toFixed(2) + ' cm /Im1 Do Q')
  }

  let pageCount = 0

  const paintChrome = (continued) => {
    strR(margin - 10, margin - 10, pageW - (margin - 10) * 2, pageH - (margin - 10) * 2, FA_LINE, 0.6)
    const footerY = margin - 10 + 5
    txt('Full Analysis  ·  MediXO EduX', margin, footerY, 7.5, false, FA_MUTED)
    txtR('Page ' + pageCount, pageW - margin, footerY, 7.5, false, FA_MUTED)

    if (!continued) {
      const hH   = 88
      const hBot = pageH - margin - hH
      fillR(margin, hBot, contentW, hH, FA_NAVY)
      const ribH = 3
      const ribY = hBot + hH - ribH
      fillR(margin, ribY, contentW / 3, ribH, FA_CYAN)
      fillR(margin + contentW / 3, ribY, contentW / 3, ribH, FA_INDIGO)
      fillR(margin + (contentW * 2) / 3, ribY, contentW / 3, ribH, FA_TEAL)
      const logoSz = 52
      const logoY  = hBot + (hH - logoSz) / 2
      drawLogo(margin + 14, logoY, logoSz)
      const tx = margin + 14 + logoSz + 14
      txt('FULL EXAM ANALYSIS REPORT', tx, logoY + 42, 7.5, true, FA_CYAN)
      txt('MediXO', tx, logoY + 24, 16, true, FA_WHITE)
      txt('EduX', tx + 65, logoY + 24, 16, true, FA_CYAN)
      txt(clip(model.examName, 230, 8.5), tx, logoY + 9, 8.5, false, [0.741, 0.796, 0.882])
      if (model.who) txtR(clip(model.who, 190, 8.5), pageW - margin - 10, logoY + 42, 8.5, true, FA_WHITE)
      txtR('Generated ' + model.dateStr, pageW - margin - 10, logoY + 26, 7.5, false, [0.741, 0.796, 0.882])
      txtR(clip(model.subjectText, 175, 7.5), pageW - margin - 10, logoY + 11, 7.5, false, [0.741, 0.796, 0.882])
      y = hBot - 20
    } else {
      const barBot = pageH - margin - HEADER_H_CONT
      fillR(margin, barBot, contentW, HEADER_H_CONT, FA_NAVY)
      fillR(margin, barBot + HEADER_H_CONT - 2, contentW, 2, FA_CYAN)
      drawLogo(margin + 8, barBot + (HEADER_H_CONT - 18) / 2, 18)
      txt('MediXO EduX', margin + 32, barBot + HEADER_H_CONT / 2 + 1, 8.5, true, FA_WHITE)
      txt('Full Analysis Report', margin + 95, barBot + HEADER_H_CONT / 2 + 1, 7.5, false, [0.741, 0.796, 0.882])
      txtR(clip(model.examName, 215, 7.5), pageW - margin - 10, barBot + HEADER_H_CONT / 2 + 1, 7.5, false, [0.741, 0.796, 0.882])
      y = barBot - 18
    }
  }

  const newPage = (continued) => {
    if (ops.length) pagesOps.push(ops)
    ops = []
    pageCount += 1
    paintChrome(continued)
  }
  const ensure = (need) => { if (y - need < floor) newPage(true) }

  const sectionTitle = (title, subtitle) => {
    ensure(44)
    y -= 6
    fillR(margin, y - 1, 4, 13, FA_INDIGO)
    txt(title, margin + 11, y, 10.5, true, [0.192, 0.180, 0.506])
    if (subtitle) txt(subtitle, margin + 11 + txtW(title, 10.5, true) + 10, y, 7.5, false, FA_MUTED)
    y -= 8
    hline(y)
    y -= 13
  }

  // ── PAGE 1 ────────────────────────────────────────────────────
  newPage(false)

  // 8-cell meta grid
  {
    const metaRows = [
      [['Exam name', model.examName], ['Subject', model.subjectText], ['Pattern', model.pattern], ['Status', model.examStatus]],
      [['Exam date', model.examDate], ['Duration', model.durationLabel], ['Time taken', model.timeTakenLabel], ['Questions', String(model.totalQuestions)]],
    ]
    const mgap = 6
    const mcW  = (contentW - mgap * 3) / 4
    const mcH  = 33
    metaRows.forEach((row) => {
      ensure(mcH + 8)
      row.forEach(function(item, ci) {
        var lbl = item[0]; var val = item[1]
        var mx = margin + ci * (mcW + mgap)
        var mb = y - mcH
        fillR(mx, mb, mcW, mcH, FA_SLATE)
        fillR(mx, mb, 3, mcH, FA_INDIGO)
        txt(lbl.toUpperCase(), mx + 8, mb + 21, 6.5, true, FA_TEAL)
        txt(clip(val, mcW - 14, 8.5), mx + 8, mb + 7, 8.5, true, FA_INK)
      })
      y -= mcH + 5
    })
    y -= 4
  }

  // hero score panel
  {
    const slines = model.aiSummary ? wrap(model.aiSummary, contentW - 30, 8, 2) : []
    const hH = 44 + slines.length * 11
    ensure(hH + 8)
    const hB = y - hH
    fillR(margin, hB, contentW, hH, FA_INDIGO_SOFT)
    fillR(margin, hB, 5, hH, FA_INDIGO)
    strR(margin, hB, contentW, hH, FA_LINE, 0.35)
    txt(clip(model.scoreLine, contentW - 28, 14), margin + 14, hB + hH - 17, 14, true, [0.192, 0.180, 0.506])
    txt(clip(model.breakdownLine + '  ·  Score ' + model.scorePct + '  ·  Accuracy ' + model.accuracy, contentW - 28, 8), margin + 14, hB + hH - 31, 8, false, FA_MUTED)
    slines.forEach(function(line, i) { txt(line, margin + 14, hB + 8 + (slines.length - 1 - i) * 11, 8, false, FA_INK) })
    y = hB - 12
  }

  // 4 stat chips
  {
    var sdefs = [
      [model.attempted, 'ATTEMPTED', FA_INDIGO, FA_INDIGO_SOFT],
      [model.scorePct, 'SCORE', FA_BLUE, FA_BLUE_SOFT],
      [model.accuracy, 'ACCURACY', FA_EMERALD, FA_EMERALD_SOFT],
      [model.timeTakenLabel, 'TIME TAKEN', FA_AMBER, FA_AMBER_SOFT],
    ]
    var sgap = 6; var sW = (contentW - sgap * 3) / 4; var sH = 40
    ensure(sH + 8)
    sdefs.forEach(function(def, i) {
      var val = def[0]; var lbl = def[1]; var accent = def[2]; var bg = def[3]
      var sx = margin + i * (sW + sgap)
      var sb = y - sH
      fillR(sx, sb, sW, sH, bg)
      fillR(sx, sb + sH - 3, sW, 3, accent)
      txt(clip(val, sW - 10, 12), sx + 7, sb + 17, 12, true, accent)
      txt(lbl, sx + 7, sb + 6, 6.5, true, FA_MUTED)
    })
    y -= sH + 14
  }

  // charts row
  sectionTitle('Performance Breakdown', 'difficulty analysis  ·  mistake distribution')
  {
    var chartH = 120
    var boxH   = chartH + 38
    var halfW  = (contentW - 12) / 2

    ensure(boxH + 6)

    var leftX  = margin
    var rightX = margin + halfW + 12
    var cardBot = y - boxH

    fillR(leftX,  cardBot, halfW, boxH, FA_SLATE)
    strR(leftX,   cardBot, halfW, boxH, FA_LINE, 0.4)
    fillR(rightX, cardBot, halfW, boxH, FA_SLATE)
    strR(rightX,  cardBot, halfW, boxH, FA_LINE, 0.4)

    txt('Difficulty Analysis',    leftX + 8,  cardBot + boxH - 13, 8.5, true,  FA_INK)
    txt('questions per level',    leftX + 8,  cardBot + boxH - 24, 7,   false, FA_MUTED)
    txt('Mistake Categories',     rightX + 8, cardBot + boxH - 13, 8.5, true,  FA_INK)
    txt('distribution of error types', rightX + 8, cardBot + boxH - 24, 7, false, FA_MUTED)

    if (model.diffBreakdown.length > 0) {
      var dgroups = model.diffBreakdown.map(function(d) {
        return {
          label: d.level,
          bars: [
            { value: d.correct,   color: FA_EMERALD },
            { value: d.incorrect, color: FA_ROSE },
            { value: d.skipped,   color: FA_AMBER },
          ],
        }
      })
      faDrawVBar({
        groups: dgroups,
        x: leftX + 26, bottomY: cardBot + 22, w: halfW - 34,
        chartH: chartH - 18, barGap: 4, groupGap: 16,
        ops: ops, rgb: rgb, textFn: txt, fillFn: fillR, strokeFn: strR,
        textWidthFn: txtW, clipFn: clip,
      })
      faLegendRow({
        items: [{ label: 'Correct', color: FA_EMERALD }, { label: 'Incorrect', color: FA_ROSE }, { label: 'Skipped', color: FA_AMBER }],
        x: leftX + 8, y: cardBot + 14, w: halfW - 16,
        textFn: txt, fillFn: fillR, textWidthFn: txtW,
      })
    }

    if (model.mistakeData.length > 0) {
      var totalMistakes = model.mistakeData.reduce(function(s, m) { return s + m.count }, 0)
      var pieCx = rightX + halfW / 2
      var pieCy = cardBot + boxH / 2 + 4
      var pieR  = Math.min(halfW * 0.38, chartH * 0.42)
      faDrawPie({
        slices: model.mistakeData.map(function(m) { return { value: m.count, color: m.color } }),
        cx: pieCx, cy: pieCy, r: pieR, innerR: pieR * 0.54,
        ops: ops, rgb: rgb, fillFn: fillR, textFn: txt,
      })
      var ctLbl = String(totalMistakes)
      txt(ctLbl, pieCx - txtW(ctLbl, 11, true) / 2, pieCy - 4, 11, true, FA_INK)
      txt('errors', pieCx - txtW('errors', 6.5, false) / 2, pieCy - 15, 6.5, false, FA_MUTED)
      var legItems = model.mistakeData.slice(0, 6)
      var dotSz = 7; var legLineH = 12; var colW = halfW / 2 - 8
      legItems.forEach(function(m, mi) {
        var col = mi % 2; var row = Math.floor(mi / 2)
        var lx = rightX + 8 + col * colW
        var ly = cardBot + 12 + row * legLineH
        fillR(lx, ly, dotSz, dotSz, m.color)
        txt(clip(m.label + ' (' + m.count + ')', colW - dotSz - 8, 6.5), lx + dotSz + 3, ly, 6.5, false, FA_INK)
      })
    } else {
      txt('No mistake data for this attempt.', rightX + 10, cardBot + boxH / 2, 8, false, FA_MUTED)
    }

    y = cardBot - 16
  }

  // subject accuracy bars
  if (model.subjectBars.length > 0) {
    sectionTitle('Subject Performance', 'accuracy per subject')
    var consumed = faDrawHBar({
      bars: model.subjectBars.map(function(s) {
        return { label: s.name, value: s.accuracy, color: s.color, secondaryLabel: s.accuracy + '%  ·  ' + s.score }
      }),
      x: margin, topY: y, w: contentW, barH: 17, gap: 6,
      ops: ops, rgb: rgb, textFn: txt, fillFn: fillR, strokeFn: strR,
      textWidthFn: txtW, clipFn: clip,
    })
    y -= consumed + 8
  }

  // ── QUESTION REVIEW ────────────────────────────────────────────
  sectionTitle('Question-by-Question Review', model.totalQuestions + ' questions')

  var Q_COLS = [30, 58, 0, 72, 44, 40, 36, 36]  // col 2 filled below
  var baseSum = 30 + 58 + 72 + 44 + 40 + 36 + 36  // 316
  Q_COLS[2] = contentW - baseSum                   // ~215 for Chapter/Topic
  var Q_HEADERS = ['Q#', 'Subject', 'Chapter / Topic', 'Status', 'Marks', 'Time', 'Ans', 'Key']
  var Q_ROW_H  = 16
  var Q_CHIP_H = 11
  var Q_HINT_H = 11

  var paintQHeader = function() {
    ensure(Q_ROW_H + 8)
    var qx = margin
    Q_HEADERS.forEach(function(h, i) {
      fillR(qx, y - Q_ROW_H, Q_COLS[i], Q_ROW_H, FA_NAVY)
      strR(qx,  y - Q_ROW_H, Q_COLS[i], Q_ROW_H, [0.2, 0.2, 0.3], 0.3)
      txt(h, qx + 3, y - Q_ROW_H + 5, 6.5, true, FA_CYAN)
      qx += Q_COLS[i]
    })
    y -= Q_ROW_H
  }

  var paintQRow = function(q, alt) {
    var statusColor = FA_STATUS_COLOR[q.status] || FA_MUTED
    var statusBg    = FA_STATUS_SOFT[q.status]  || FA_SLATE
    var rowBg       = alt ? FA_SLATE : FA_WHITE
    var rowBot      = y - Q_ROW_H

    var qx = margin
    Q_COLS.forEach(function(cw, ci) {
      fillR(qx, rowBot, cw, Q_ROW_H, ci === 3 ? statusBg : rowBg)
      strR(qx,  rowBot, cw, Q_ROW_H, FA_LINE, 0.25)
      qx += cw
    })

    var marksNum = parseFloat(q.marks)
    var marksColor = marksNum > 0 ? FA_EMERALD : marksNum < 0 ? FA_ROSE : FA_INK
    var cells = [
      { val: q.q,                                                    bold: true,  color: FA_INDIGO   },
      { val: clip(q.subject,                   Q_COLS[1] - 6, 7),   bold: false, color: FA_INK      },
      { val: clip(q.chapter + ' / ' + q.topic, Q_COLS[2] - 6, 7),   bold: false, color: FA_INK      },
      { val: clip(q.status,                    Q_COLS[3] - 6, 7.5), bold: true,  color: statusColor  },
      { val: clip(q.marks,                     Q_COLS[4] - 6, 7.5), bold: true,  color: marksColor   },
      { val: clip(q.time,                      Q_COLS[5] - 4, 7),   bold: false, color: FA_MUTED     },
      { val: clip(q.selected || '—',       Q_COLS[6] - 4, 7.5),bold: false, color: FA_INDIGO    },
      { val: clip(q.correct  || '—',       Q_COLS[7] - 4, 7.5),bold: true,  color: FA_EMERALD   },
    ]
    var cx = margin
    cells.forEach(function(cell, ci) {
      txt(cell.val, cx + 3, rowBot + 5, 7.5, cell.bold, cell.color)
      cx += Q_COLS[ci]
    })
    y -= Q_ROW_H

    // chip row
    {
      var chipBot = y - Q_CHIP_H
      var diffColor = FA_DIFFICULTY_COLOR[q.difficulty] || FA_MUTED
      var diffLightBg = diffColor.map(function(c) { return Math.min(1, c * 0.18 + 0.82) })
      var chipX = margin + 2

      var dw = txtW(q.difficulty, 6.5, true) + 9
      fillR(chipX, chipBot + 1, dw, Q_CHIP_H - 2, diffLightBg)
      txt(q.difficulty, chipX + 4, chipBot + 3, 6.5, true, diffColor)
      chipX += dw + 5

      var tw = txtW(q.type, 6.5, false) + 9
      fillR(chipX, chipBot + 1, tw, Q_CHIP_H - 2, FA_SLATE)
      txt(q.type, chipX + 4, chipBot + 3, 6.5, false, FA_MUTED)
      chipX += tw + 5

      if (q.mistake) {
        var mclip = clip(q.mistake, 100, 6.5)
        var mw = txtW(mclip, 6.5, false) + 9
        fillR(chipX, chipBot + 1, mw, Q_CHIP_H - 2, FA_ROSE_SOFT)
        txt(mclip, chipX + 4, chipBot + 3, 6.5, false, FA_ROSE)
      }
      y -= Q_CHIP_H
    }

    // hint lines (max 2)
    if (q.hint) {
      var hintLines = wrap(q.hint, contentW - 20, 7.5, 2)
      var hintBg = q.status === 'Incorrect' ? [1.0, 0.975, 0.980] : [0.965, 0.992, 0.980]
      hintLines.forEach(function(line) {
        var hBot = y - Q_HINT_H
        fillR(margin, hBot, contentW, Q_HINT_H, hintBg)
        fillR(margin, hBot, 3, Q_HINT_H, statusColor)
        txt(line, margin + 7, hBot + 3, 7.5, false, FA_INK)
        y -= Q_HINT_H
      })
    }

    hline(y - 1)
    y -= 5
  }

  var qRowHeight = function(q) {
    var hintLines = q.hint ? Math.min(2, wrap(q.hint, contentW - 20, 7.5, 2).length) : 0
    return Q_ROW_H + Q_CHIP_H + hintLines * Q_HINT_H + 5 + 4
  }

  paintQHeader()
  model.questions.forEach(function(q, idx) {
    var need = qRowHeight(q)
    if (y - need < floor + 10) {
      newPage(true)
      paintQHeader()
    }
    paintQRow(q, idx % 2 === 1)
  })
  y -= 8

  // ── CHAPTER MASTERY ───────────────────────────────────────────
  if (model.chapters.length > 0) {
    sectionTitle('Chapter Mastery', model.chapters.length + ' chapters')
    var cmConsumed = faDrawHBar({
      bars: model.chapters.map(function(c) {
        var acc = parseFloat(String(c.accuracy).replace('%', '')) || 0
        return {
          label: clip(c.chapter, 90, 8),
          value: acc,
          color: acc >= 75 ? FA_EMERALD : acc >= 60 ? FA_BLUE : acc >= 45 ? FA_AMBER : FA_ROSE,
          secondaryLabel: c.accuracy + '  ·  ' + c.time,
        }
      }),
      x: margin, topY: y, w: contentW, barH: 16, gap: 6,
      ops: ops, rgb: rgb, textFn: txt, fillFn: fillR, strokeFn: strR,
      textWidthFn: txtW, clipFn: clip,
    })
    y -= cmConsumed + 8
  }

  // ── COGNITIVE QUADRANTS ───────────────────────────────────────
  var cqVals = model.cognitiveQuadrants
  if (cqVals.fastCorrect || cqVals.slowCorrect || cqVals.fastIncorrect || cqVals.slowIncorrect) {
    sectionTitle('Cognitive Quadrant Summary', 'speed vs accuracy')
    var qdefs = [
      { label: 'Fast & Correct',   sub: 'Mastery',       val: cqVals.fastCorrect,   bg: FA_EMERALD_SOFT, accent: FA_EMERALD },
      { label: 'Slow & Correct',   sub: 'Over-thinking', val: cqVals.slowCorrect,   bg: FA_BLUE_SOFT,    accent: FA_BLUE    },
      { label: 'Fast & Incorrect', sub: 'Hasty guess',   val: cqVals.fastIncorrect, bg: FA_AMBER_SOFT,   accent: FA_AMBER   },
      { label: 'Slow & Incorrect', sub: 'Conceptual gap',val: cqVals.slowIncorrect, bg: FA_ROSE_SOFT,    accent: FA_ROSE    },
    ]
    var qW = (contentW - 14 * 3) / 4; var qH = 50
    ensure(qH + 8)
    qdefs.forEach(function(qd, i) {
      var qx = margin + i * (qW + 14)
      var qb = y - qH
      fillR(qx, qb, qW, qH, qd.bg)
      fillR(qx, qb + qH - 3, qW, 3, qd.accent)
      strR(qx,  qb, qW, qH, FA_LINE, 0.35)
      txt(String(qd.val), qx + 7, qb + qH - 17, 17, true, qd.accent)
      txt(clip(qd.label, qW - 10, 7.5), qx + 7, qb + qH - 30, 7.5, true, FA_INK)
      txt(qd.sub, qx + 7, qb + 6, 6.5, false, FA_MUTED)
    })
    y -= qH + 12
  }

  // ── REVISION PRIORITIES ───────────────────────────────────────
  if (model.revisionGroups.length > 0) {
    sectionTitle('Revision Priorities', 'weakest topics first')
    var noteLines = wrap('Weakest subject first. Topics with accuracy below 65% - focus these before your next attempt.', contentW, 8, 2)
    noteLines.forEach(function(line) { ensure(14); txt(line, margin, y, 8, false, FA_MUTED); y -= 12 })
    y -= 6

    var T_WIDTHS = [contentW * 0.38, contentW * 0.30, contentW * 0.17, contentW * 0.15]
    var T_HEADS  = ['Topic', 'Chapter', 'Accuracy', 'Priority']
    var T_ROW_H  = 16

    model.revisionGroups.forEach(function(group) {
      ensure(24 + T_ROW_H * 2 + 6)
      var bandH   = 24
      var bandBot = y - bandH
      fillR(margin, bandBot, contentW, bandH, FA_NAVY)
      fillR(margin, bandBot, 4, bandH, FA_CYAN)
      txt(clip(group.subject, contentW - 100, 10.5), margin + 11, bandBot + 8, 10.5, true, FA_WHITE)
      if (group.accuracyLabel && group.accuracyLabel !== '—') {
        txt(group.accuracyLabel + ' acc', margin + contentW - 95, bandBot + 8, 7, false, [0.78, 0.82, 0.96])
      }
      if (group.mastery) {
        var mw = txtW(group.mastery, 7, true) + 10
        var mx = margin + contentW - mw - 8
        fillR(mx, bandBot + 5, mw, 14, group.mastery === 'Critical' ? FA_ROSE_SOFT : FA_AMBER_SOFT)
        txt(group.mastery, mx + 5, bandBot + 8, 7, true, faMasteryInk(group.mastery) || FA_AMBER)
      }
      y = bandBot - 5

      ensure(T_ROW_H * 2 + 4)
      var tx = margin
      T_HEADS.forEach(function(h, i) {
        fillR(tx, y - T_ROW_H, T_WIDTHS[i], T_ROW_H, FA_INDIGO_SOFT)
        strR(tx,  y - T_ROW_H, T_WIDTHS[i], T_ROW_H, FA_LINE, 0.3)
        txt(h, tx + 4, y - T_ROW_H + 5, 7, true, FA_INDIGO)
        tx += T_WIDTHS[i]
      })
      y -= T_ROW_H

      group.topics.forEach(function(topic, ti) {
        ensure(T_ROW_H + 4)
        var rowBg = ti % 2 === 1 ? FA_SLATE : FA_WHITE
        tx = margin
        T_WIDTHS.forEach(function(tw) {
          fillR(tx, y - T_ROW_H, tw, T_ROW_H, rowBg)
          strR(tx,  y - T_ROW_H, tw, T_ROW_H, FA_LINE, 0.25)
          tx += tw
        })
        tx = margin
        var acc = parseFloat(String(topic.accuracy || '').replace('%', '')) || null
        txt(clip(topic.name,    T_WIDTHS[0] - 8, 7.5), tx + 4, y - T_ROW_H + 5, 7.5, true,  FA_INK);     tx += T_WIDTHS[0]
        txt(clip(topic.chapter, T_WIDTHS[1] - 8, 7),   tx + 4, y - T_ROW_H + 5, 7,   false, FA_MUTED);   tx += T_WIDTHS[1]
        txt(topic.accuracyLabel || '—', tx + 4, y - T_ROW_H + 5, 7.5, true,
          faMasteryInk(masteryFromAccuracy(acc)) || FA_MUTED);  tx += T_WIDTHS[2]
        var pCol = topic.priority === 'Critical' ? FA_ROSE : topic.priority === 'Weak' ? FA_AMBER : FA_INDIGO
        txt(clip(topic.priority, T_WIDTHS[3] - 8, 7), tx + 4, y - T_ROW_H + 5, 7, true, pCol)
        y -= T_ROW_H
      })
      y -= 10
    })
  }

  // ── assemble PDF ──────────────────────────────────────────────
  pagesOps.push(ops)

  const contentIds = pagesOps.map(function(pageOps) {
    const stream = pageOps.join('\n')
    return add('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream')
  })
  const pagesObjIndex = objects.length
  objects.push('')
  const catalogId = add('')
  const xobj = imageId ? ' /XObject << /Im1 ' + imageId + ' 0 R >>' : ''
  const pageIds = contentIds.map(function(cid) {
    return add('<< /Type /Page /Parent ' + (pagesObjIndex + 1) + ' 0 R /MediaBox [0 0 ' + pageW + ' ' + pageH + '] /Resources << /Font << /F1 ' + font + ' 0 R /F2 ' + fontBold + ' 0 R >>' + xobj + ' >> /Contents ' + cid + ' 0 R >>')
  })
  objects[pagesObjIndex] = '<< /Type /Pages /Kids [' + pageIds.map(function(id) { return id + ' 0 R' }).join(' ') + '] /Count ' + pageIds.length + ' >>'
  objects[catalogId - 1] = '<< /Type /Catalog /Pages ' + (pagesObjIndex + 1) + ' 0 R >>'

  const encoder2 = new TextEncoder()
  const chunks  = [encoder2.encode('%PDF-1.4\n'), new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A])]
  const offsets = [0]
  let pos = chunks[0].length + chunks[1].length
  objects.forEach(function(body, i) {
    const head = encoder2.encode((i + 1) + ' 0 obj\n')
    const mid  = typeof body === 'string' ? encoder2.encode(body) : body
    const tail = encoder2.encode('\nendobj\n')
    offsets.push(pos)
    chunks.push(head, mid, tail)
    pos += head.length + mid.length + tail.length
  })
  const xrefStart = pos
  let xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n'
  for (let i = 1; i <= objects.length; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n'
  }
  chunks.push(encoder2.encode(xref))
  chunks.push(encoder2.encode('trailer\n<< /Size ' + (objects.length + 1) + ' /Root ' + catalogId + ' 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF'))

  const total = chunks.reduce(function(n, c) { return n + c.length }, 0)
  const out   = new Uint8Array(total)
  let o = 0
  chunks.forEach(function(c) { out.set(c, o); o += c.length })
  return out
}

/** Entry point: export the premium full exam analysis publication. */
export async function exportFullAnalysisPDF(data, subject, user) {
  if (!data || typeof window === 'undefined') return
  const generatedAt = new Date()
  const [{ buildPremiumFullModel }, { createPremiumPdf }] = await Promise.all([
    import('./premium-pdf/model.js'),
    import('./premium-pdf/index.js'),
  ])
  const model = buildPremiumFullModel({ data, subject, user, generatedAt })
  const result = await createPremiumPdf({ kind: 'full', model })
  if (result.flags.length) console.warn('[MediXO EduX] expressions flagged for verification', result.flags)
  const blob = new Blob([result.bytes], { type: 'application/pdf' })
  triggerDownload(blob, `MediXO_EduX_${fileStub(model.examName)}_Full_Exam_Analysis_Report.pdf`)
  return result
}
