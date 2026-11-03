/**
 * REPORT TWO — Exam Intelligence Report, V2.
 *
 * A concise academic briefing with its own warm-paper personality: spacious
 * performance snapshot, analytical learning spread, and an actionable
 * revision strategy. It is deliberately not a compressed full report.
 */

import {
  CONTENT, COLORS, FONTS, TYPE,
  fmt, pct, mix, normalizeForMatch,
  masteryColor, priorityColor,
} from './theme.js'
import {
  SectionHeading, Subheading, MetricLedger,
  BarChart, MeasuredTable, SubjectBand,
} from './components.js'

function text(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function numeric(value) {
  const n = Number(String(value ?? '').replace('%', ''))
  return Number.isFinite(n) ? n : 0
}

function masterySoft(value) {
  const key = String(value || '').toLowerCase()
  if (key === 'strong') return mix(COLORS.success, COLORS.white, 0.1)
  if (key === 'critical' || key === 'high') return mix(COLORS.error, COLORS.white, 0.1)
  if (key === 'weak') return mix(COLORS.warning, COLORS.white, 0.1)
  return mix(COLORS.indigo, COLORS.white, 0.08)
}

function prioritySoft(value) {
  const key = String(value || '').toLowerCase()
  if (key === 'critical') return mix(COLORS.error, COLORS.white, 0.1)
  if (key === 'high' || key === 'weak') return mix(COLORS.warning, COLORS.white, 0.1)
  return mix(COLORS.indigo, COLORS.white, 0.08)
}

/** Resolve a published weak topic to its source subject; never infer one. */
function subjectForTopic(m, topic) {
  const needle = normalizeForMatch(topic)
  const topicHit = m.topics.find((row) => {
    const name = normalizeForMatch(row.topic)
    return name && (name === needle || name.includes(needle) || needle.includes(name))
  })
  if (topicHit?.subject) return text(topicHit.subject)
  const chapterHit = m.chapters.find((row) => {
    const name = normalizeForMatch(row.chapter || row.name)
    return name && (name === needle || name.includes(needle) || needle.includes(name))
  })
  return chapterHit?.subject ? text(chapterHit.subject) : '—'
}

function IntelligenceMasthead(ctx) {
  const m = ctx.model
  const measure = () => {
    const kickerH = ctx.measureText('MEDIXO EDUX  /  EXAMINATION INTELLIGENCE BRIEFING', CONTENT.w, {
      size: TYPE.label, font: FONTS.bodySemi, characterSpacing: 1,
    })
    const titleH = ctx.measureText(m.reportTitle, CONTENT.w, {
      size: 28, font: FONTS.heading, lineHeight: 34,
    })
    const examH = ctx.measureText(m.examName, CONTENT.w, { size: 12, font: FONTS.heading })
    const metaH = ctx.measureText(`${m.course}   ·   ${m.pattern}   ·   ${m.subjectText}   ·   Generated ${m.generatedDate}`, CONTENT.w, {
      size: TYPE.bodySmall, font: FONTS.body,
    })
    return 4 + kickerH + 6 + titleH + 8 + examH + 5 + metaH + 10
  }
  return ctx.component({
    type: 'intelligence-masthead', label: 'Exam Intelligence Report', bottomSpacing: 12,
    measure,
    draw: (frame) => {
      let cursor = frame.y + 2
      cursor += ctx.text('MEDIXO EDUX  /  EXAMINATION INTELLIGENCE BRIEFING', frame.x, cursor, frame.w, {
        size: TYPE.label, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 1,
      }) + 6
      cursor += ctx.text(m.reportTitle, frame.x, cursor, frame.w, {
        size: 28, font: FONTS.heading, color: COLORS.midnight, lineHeight: 34,
      }) + 8
      cursor += ctx.text(m.examName, frame.x, cursor, frame.w, {
        size: 12, font: FONTS.heading, color: COLORS.ink,
      }) + 5
      ctx.text(`${m.course}   ·   ${m.pattern}   ·   ${m.subjectText}   ·   Generated ${m.generatedDate}`, frame.x, cursor, frame.w, {
        size: TYPE.bodySmall, font: FONTS.body, color: COLORS.muted,
      })
      ctx.canvas.line(frame.x, frame.y + frame.h - 7, frame.x + frame.w, frame.y + frame.h - 7, { color: COLORS.line, width: 0.6 })
      ctx.canvas.line(frame.x, frame.y + frame.h - 7, frame.x + 88, frame.y + frame.h - 7, { color: COLORS.indigo, width: 1.8 })
    },
  })
}

function IntelligenceScoreBand(ctx) {
  const m = ctx.model
  const measure = () => 112
  return ctx.component({
    type: 'intelligence-score-band', label: 'Score and accuracy', bottomSpacing: 12,
    measure,
    draw: (frame) => {
      ctx.canvas.rect(frame.x, frame.y, frame.w, frame.h, {
        fill: mix(COLORS.indigo, COLORS.paper, 0.055), radius: 2, kind: 'shape', role: 'band',
      })
      ctx.canvas.rect(frame.x, frame.y, 3, frame.h, { fill: COLORS.indigo, audit: false })
      const half = frame.w / 2
      ctx.text('MARKS OBTAINED', frame.x + 16, frame.y + 10, half - 30, {
        size: TYPE.label, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.8,
      })
      ctx.text(`${fmt(m.hero.score)} / ${fmt(m.hero.maxScore)}`, frame.x + 16, frame.y + 28, half - 30, {
        size: 28, font: FONTS.heading, color: COLORS.midnight, features: ['tnum'], lineHeight: 34,
      })
      ctx.canvas.line(frame.x + half, frame.y + 16, frame.x + half, frame.y + 78, { color: COLORS.line, width: 0.6 })
      ctx.text('QUESTION ACCURACY', frame.x + half + 16, frame.y + 10, half - 30, {
        size: TYPE.label, font: FONTS.bodySemi, color: COLORS.muted, characterSpacing: 0.8,
      })
      ctx.text(pct(m.questionAccuracy), frame.x + half + 16, frame.y + 28, half - 30, {
        size: 28, font: FONTS.heading, color: COLORS.success, features: ['tnum'], lineHeight: 34,
      })
      ctx.text(`${m.scoreLine}   ·   ${m.breakdownLine}   ·   Attempted ${m.attempted} / ${m.totalQuestions}   ·   Time ${m.timeTakenLabel}`, frame.x + 16, frame.y + 80, frame.w - 32, {
        size: TYPE.bodySmall, font: FONTS.body, color: COLORS.ink,
      })
      ctx.text(`Grade ${text(m.hero.grade)}   ·   Rank ${text(m.hero.rank)}   ·   Percentile ${text(m.hero.percentile)}   ·   Readiness ${text(m.hero.readinessScore)}`, frame.x + 16, frame.y + 95, frame.w - 32, {
        size: TYPE.label, font: FONTS.body, color: COLORS.muted,
      })
    },
  })
}

function renderSnapshot(ctx) {
  const m = ctx.model
  IntelligenceMasthead(ctx)
  MetricLedger(ctx, {
    label: 'Candidate and examination information',
    items: [
      { label: 'Student', value: m.studentName },
      { label: 'Roll number', value: m.rollNo },
      { label: 'Examination date', value: m.examDate },
      { label: 'Duration', value: m.durationLabel },
    ],
    columns: 4, valueSize: 10.5, bottomSpacing: 8,
  })
  IntelligenceScoreBand(ctx)
  Subheading(ctx, { title: 'Subject performance', accent: COLORS.indigo, bottomSpacing: 4 })
  MetricLedger(ctx, {
    label: 'Subject performance',
    items: m.subjectValues.map((row) => ({
      label: text(row.name),
      value: `${text(row.score)} / ${text(row.maxMarks)}   ·   ${pct(row.accuracy)}   ·   Rank ${text(row.rank)}   ·   ${text(row.difficulty)}`,
      color: masteryColor(row.accuracy),
    })),
    columns: Math.max(1, m.subjectValues.length || 1), valueSize: 9.2, bottomSpacing: 6,
  })
  const chapterRows = m.chapters.map((row) => ({
    chapter: text(row.chapter || row.name), subject: text(row.subject),
    accuracy: pct(row.accuracy), mastery: text(row.mastery),
  }))
  Subheading(ctx, { title: 'Chapter mastery', accent: COLORS.indigo, bottomSpacing: 4 })
  MeasuredTable(ctx, {
    id: 'intelligence-chapter-mastery', title: 'Chapter mastery by subject', rows: chapterRows,
    groupKey: 'subject',
    columns: [
      { key: 'chapter', label: 'Chapter', width: 2.6, font: FONTS.bodySemi },
      { key: 'subject', label: 'Subject', width: 1.0 },
      { key: 'accuracy', label: 'Accuracy', width: 0.8, align: 'right', color: (v) => masteryColor(v) },
      { key: 'mastery', label: 'Mastery', width: 0.9, render: 'pill', color: (v) => masteryColor(v), soft: (v) => masterySoft(v) },
    ],
    rowPadding: 1.5, bottomSpacing: 6,
  })
}


function renderLearning(ctx) {
  const m = ctx.model
  SectionHeading(ctx, {
    number: '02', kicker: 'LEARNING INTELLIGENCE', title: 'Error patterns and topic accuracy',
    note: 'Mistake classifications, topic-level accuracy, subject-wise weak topics and source evidence.',
    accent: COLORS.error,
  })
  const mistakeBars = m.mistakes.map((row, index) => ({
    label: text(row.category), value: numeric(row.count), valueLabel: text(row.count),
    color: [COLORS.error, COLORS.warning, COLORS.indigo, COLORS.midnight, COLORS.success, COLORS.muted, COLORS.error][index % 7],
  }))
  const topicRows = m.topics.map((row) => ({
    topic: text(row.topic), subject: text(row.subject), accuracy: pct(row.mastery), level: text(row.level),
  }))
  const weakRows = (m.recommendations.weakTopics || []).map((topic) => ({ subject: subjectForTopic(m, topic), topic: text(topic) }))
  const evidenceRows = m.mistakeList.slice(0, 3).map((row) => ({ q: text(row.q), detail: text(row.detail) }))
  BarChart(ctx, {
    title: 'Mistake pattern analysis', bars: mistakeBars,
    accent: COLORS.error, minRowHeight: 18, rowGap: 2, bottomSpacing: 10,
  })
  MeasuredTable(ctx, {
    id: 'intelligence-topic-accuracy', title: 'Topic-level accuracy', rows: topicRows,
    groupKey: 'subject',
    columns: [
      { key: 'topic', label: 'Topic', width: 2.8, font: FONTS.bodySemi },
      { key: 'subject', label: 'Subject', width: 1.0 },
      { key: 'accuracy', label: 'Accuracy', width: 0.8, align: 'right', color: (v) => masteryColor(v) },
      { key: 'level', label: 'Level', width: 0.9, color: (v) => masteryColor(v) },
    ],
    rowPadding: 1.5, bottomSpacing: 8,
  })
  MeasuredTable(ctx, {
    id: 'intelligence-weak-topics', title: 'Subject-wise weak topics', rows: weakRows,
    columns: [
      { key: 'subject', label: 'Subject', width: 1.1, font: FONTS.bodySemi },
      { key: 'topic', label: 'Weak topic', width: 3.4 },
    ],
    rowPadding: 1.5, bottomSpacing: 8,
  })
  MeasuredTable(ctx, {
    id: 'intelligence-mistake-evidence', title: 'Source mistake evidence', rows: evidenceRows,
    columns: [
      { key: 'q', label: 'Question', width: 0.55, font: FONTS.bodyBold },
      { key: 'detail', label: 'Source detail', width: 3.4 },
    ],
    rowPadding: 1.5, bottomSpacing: 6,
  })
  const priorityRows = (m.recommendations.priorityRevision || []).map((row) => ({
    topic: text(row.topic), priority: text(row.priority), timeframe: text(row.timeframe),
  }))
  MeasuredTable(ctx, {
    id: 'intelligence-priority-classification', title: 'Priority classification  /  published list', rows: priorityRows,
    columns: [
      { key: 'topic', label: 'Priority topic', width: 2.8, font: FONTS.bodySemi },
      { key: 'priority', label: 'Class', width: 0.8, render: 'pill', color: (v) => priorityColor(v), soft: (v) => prioritySoft(v) },
      { key: 'timeframe', label: 'When', width: 0.8 },
    ],
    rowPadding: 0.5, bottomSpacing: 4,
  })
}


function classificationItems(rows) {
  const counts = new Map()
  rows.forEach((row) => {
    const key = text(row.priority)
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return [...counts.entries()].map(([key, count]) => ({
    label: key, value: String(count), color: priorityColor(key),
  }))
}

function renderRevision(ctx) {
  const m = ctx.model
  const rec = m.recommendations || {}
  const priorityRows = (rec.priorityRevision || []).map((row, index) => ({
    sequence: String(index + 1).padStart(2, '0'), topic: text(row.topic),
    priority: text(row.priority), timeframe: text(row.timeframe),
  }))
  SectionHeading(ctx, {
    number: '03', kicker: 'REVISION STRATEGY', title: 'What to study next',
    note: 'Published priority sequence, classification, subject-wise revision sections and timeframe.',
    accent: COLORS.success,
  })
  Subheading(ctx, { title: 'Recommended study sequence', note: 'Order reproduced from the published priority revision list.', accent: COLORS.success, bottomSpacing: 5 })
  MeasuredTable(ctx, {
    id: 'intelligence-priority-board', title: 'Priority board  ·  most actionable page', rows: priorityRows,
    columns: [
      { key: 'sequence', label: 'Seq.', width: 0.5, align: 'center', font: FONTS.bodyBold, features: ['tnum'] },
      { key: 'topic', label: 'Priority topic', width: 3.0, font: FONTS.bodySemi },
      { key: 'priority', label: 'Classification', width: 1.1, render: 'pill', color: (v) => priorityColor(v), soft: (v) => prioritySoft(v) },
      { key: 'timeframe', label: 'Revision timeframe', width: 1.1 },
    ],
    rowPadding: 1.5, bottomSpacing: 7,
  })
  MetricLedger(ctx, {
    label: 'Priority classification', items: classificationItems(rec.priorityRevision || []),
    columns: Math.max(1, classificationItems(rec.priorityRevision || []).length || 1),
    valueSize: 11, bottomSpacing: 8,
  })
  Subheading(ctx, { title: 'Subject-wise revision sections', note: 'Source revision groups ordered by the analysis engine.', accent: COLORS.indigo })
  const revisionRows = m.revisionGroups.flatMap((group) => group.topics.map((topic) => ({
    subject: text(group.subject), topic: text(topic.name), chapter: text(topic.chapter),
    accuracy: text(topic.accuracyLabel), priority: text(topic.priority),
  })))
  MeasuredTable(ctx, {
    id: 'intelligence-subject-revision', title: 'Priority topics grouped by subject', rows: revisionRows,
    groupKey: 'subject', rowPadding: 1.5, bottomSpacing: 8,
    columns: [
      { key: 'subject', label: 'Subject', width: 1.1, font: FONTS.bodySemi },
      { key: 'topic', label: 'Priority topic', width: 2.4 },
      { key: 'chapter', label: 'Chapter', width: 1.7 },
      { key: 'accuracy', label: 'Accuracy', width: 0.9, align: 'right', color: (v) => masteryColor(v) },
      { key: 'priority', label: 'Classification', width: 1.1, render: 'pill', color: (v) => priorityColor(v), soft: (v) => prioritySoft(v) },
    ],
  })
  Subheading(ctx, { title: 'Published next actions', note: 'Practice, PYQ, mock and lecture resources attached to this attempt.', accent: COLORS.success })
  const actions = [
    ...(rec.suggestedPYQs || []).map((row) => ({ kind: 'PYQ', title: text(row.title), detail: text(row.source) })),
    ...(rec.practiceQuestions || []).map((row) => ({ kind: 'Practice', title: text(row.title), detail: `${text(row.count)} · ${text(row.difficulty)}` })),
    ...(rec.mockTests || []).map((row) => ({ kind: 'Mock test', title: text(row.title), detail: text(row.mode) })),
    ...(rec.lectures || []).map((row) => ({ kind: 'Lecture', title: text(row.title), detail: text(row.type) })),
  ]
  MeasuredTable(ctx, {
    id: 'intelligence-next-actions', title: 'Recommended action register', rows: actions,
    columns: [
      { key: 'kind', label: 'Action', width: 1.0, render: 'pill', color: () => COLORS.indigo, soft: () => mix(COLORS.indigo, COLORS.white, 0.08) },
      { key: 'title', label: 'Resource', width: 3.2, font: FONTS.bodySemi },
      { key: 'detail', label: 'Detail', width: 1.5 },
    ],
    rowPadding: 1.5, bottomSpacing: 8,
  })
  MeasuredTable(ctx, {
    id: 'intelligence-detailed-evidence', title: 'Source mistake evidence  /  detailed register',
    rows: m.mistakeList.map((row) => ({
      q: text(row.q), subject: text(row.subject), category: text(row.category), detail: text(row.detail),
    })),
    columns: [
      { key: 'q', label: 'Q', width: 0.5, font: FONTS.bodyBold },
      { key: 'subject', label: 'Subject', width: 1.0 },
      { key: 'category', label: 'Category', width: 1.3, color: () => COLORS.error },
      { key: 'detail', label: 'Source detail', width: 3.0 },
    ],
    rowPadding: 1.5, bottomSpacing: 8,
  })
}


export function renderIntelligenceReport(ctx) {
  renderSnapshot(ctx)
  ctx.sectionBreak(0.62)
  renderLearning(ctx)
  ctx.sectionBreak(0.62)
  renderRevision(ctx)
}
