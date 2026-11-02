/**
 * REPORT TWO — Exam Intelligence Report.
 *
 * A deliberately different, tighter editorial object: two fixed A4 pages,
 * both planned on a 12-column grid rather than auto-flowed. The revision
 * board on page two is the visual centre of gravity of the document.
 */

import {
  CONTENT, COLORS, FONTS, TYPE,
  fmt, pct, masteryColor, priorityColor, subjectColor, difficultyColor,
  twoColumns,
} from './theme.js'
import {
  PerformanceChart, KeyValueGrid, StaticTable, SubjectSection,
  Pill, ProgressBar, rule,
} from './components.js'

function textValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function heading(ctx, y, number, kicker, title, note = '') {
  ctx.drawText(number, CONTENT.x, y, 32, {
    size: 7.4, font: FONTS.bodyBold, color: COLORS.indigo, characterSpacing: 1.1,
  })
  ctx.drawText(kicker, CONTENT.x + 36, y, CONTENT.w - 36, {
    size: 6.9, font: FONTS.bodySemi, color: COLORS.slate, characterSpacing: 1.2,
  })
  ctx.drawText(title, CONTENT.x + 36, y + 11, CONTENT.w - 36, {
    size: TYPE.reportTitle - 2, font: FONTS.heading, color: COLORS.midnight, lineHeight: 20,
  })
  rule(ctx, CONTENT.x, y + 35, CONTENT.w, COLORS.border, 0.5)
  ctx.doc.rect(CONTENT.x, y + 34, 48, 2).fill(COLORS.indigo)
  if (note) {
    ctx.drawText(note, CONTENT.x, y + 39, CONTENT.w, {
      size: 7.2, font: FONTS.body, color: COLORS.slate, lineHeight: 10,
    })
    return 54
  }
  return 44
}

function drawGauge(ctx, { x, y, w, h, value, label, color }) {
  const doc = ctx.doc
  const cx = x + w / 2
  const cy = y + h / 2 - 2
  const r = Math.max(18, Math.min(w, h) / 2 - 12)
  const numeric = Number.parseFloat(String(value).replace('%', ''))
  const fraction = Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric / 100)) : 0
  doc.save()
  doc.lineWidth(8).lineCap('round').strokeColor(COLORS.border)
    .arc(cx, cy, r, -Math.PI / 2, Math.PI * 1.5).stroke()
  if (fraction > 0.001) {
    doc.lineWidth(8).lineCap('round').strokeColor(color)
      .arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction).stroke()
  }
  doc.restore()
  ctx.drawText(value, cx - 42, cy - 10, 84, {
    size: 15, font: FONTS.heading, color: COLORS.midnight, align: 'center', features: ['tnum'],
  })
  ctx.drawText(label, cx - 48, cy + 10, 96, {
    size: 6.8, font: FONTS.bodySemi, color: COLORS.slate, align: 'center', characterSpacing: 0.8,
  })
}

function subjectForTopic(m, topic) {
  const name = String(topic || '').toLowerCase()
  const match = m.topics.find((row) => (
    String(row.topic || '').toLowerCase() === name
    || String(row.topic || '').toLowerCase().startsWith(name)
    || name.startsWith(String(row.topic || '').toLowerCase())
  ))
  if (match?.subject) return match.subject
  const review = m.questions.find((row) => name.includes(String(row.topic || '').toLowerCase()))
  if (review?.subject) return review.subject
  if (name.includes('optic') || name.includes('lens')) return 'Physics'
  if (name.includes('coordination') || name.includes('organic') || name.includes('ncert')) return 'Chemistry'
  if (name.includes('integration') || name.includes('geometry') || name.includes('probability') || name.includes('bayes')) return 'Mathematics'
  return 'Cross-subject priorities'
}

function pageOne(ctx) {
  const m = ctx.model
  ctx.reserve(CONTENT.h)
  let y = CONTENT.y
  y += heading(ctx, y, '01', 'EXAM INTELLIGENCE  /  PERFORMANCE BRIEF', 'Exam Intelligence Report', `${m.examName}  ·  ${m.subjectText}  ·  ${m.reportId}  ·  Generated ${m.generatedDate}`)

  const info = [
    { label: 'Student', value: m.studentName },
    { label: 'Roll number', value: m.rollNo },
    { label: 'Examination date', value: m.examDate },
    { label: 'Pattern', value: m.pattern },
    { label: 'Duration', value: m.durationLabel },
    { label: 'Examination status', value: m.status },
  ]
  KeyValueGrid(ctx, {
    x: CONTENT.x, y, w: CONTENT.w, items: info, columns: 3, cardH: 34, gap: 8,
    valueSize: 8.6, valueLineHeight: 9.5,
  })
  y += 2 * (34 + 6) + 6

  const summaryW = CONTENT.w
  ctx.doc.roundedRect(CONTENT.x, y, summaryW, 92, 3).fill(COLORS.ivory).stroke(COLORS.border)
  ctx.drawText('OVERALL PERFORMANCE SUMMARY', CONTENT.x + 12, y + 8, 220, {
    size: 7, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.8,
  })
  ctx.drawText(`${m.scoreLine}   ·   ${m.breakdownLine}`, CONTENT.x + 12, y + 22, 250, {
    size: 10, font: FONTS.heading, color: COLORS.midnight, features: ['tnum'],
  })
  ctx.drawText(`Attempted ${m.attempted} / ${m.totalQuestions}   ·   Time ${m.timeTakenLabel}   ·   Grade ${textValue(m.hero.grade)}   ·   Rank ${textValue(m.hero.rank)}`, CONTENT.x + 12, y + 39, 250, {
    size: 7.4, font: FONTS.body, color: COLORS.slate,
  })
  const gaugeW = (summaryW - 300) / 2
  drawGauge(ctx, { x: CONTENT.x + 270, y: y + 2, w: gaugeW - 8, h: 86, value: m.scorePct, label: 'SCORE', color: COLORS.indigo })
  drawGauge(ctx, { x: CONTENT.x + 270 + gaugeW, y: y + 2, w: gaugeW - 8, h: 86, value: pct(m.questionAccuracy), label: 'ACCURACY', color: COLORS.success })
  y += 100

  ctx.drawText('SUBJECT-WISE PERFORMANCE', CONTENT.x, y, CONTENT.w, {
    size: 8.4, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.8,
  })
  y += 13
  const subjectRows = m.subjectValues.map((s) => ({
    subject: textValue(s.name), score: s.scoreLabel, accuracy: pct(s.accuracy),
    time: textValue(s.time), rank: textValue(s.rank), mastery: textValue(s.mastery || s.difficulty),
  }))
  const subjectH = StaticTable(ctx, {
    x: CONTENT.x, y, w: CONTENT.w, rows: subjectRows, fontSize: 6.9, rowPadding: 2,
    columns: [
      { key: 'subject', label: 'Subject', width: 1.4, font: FONTS.bodySemi },
      { key: 'score', label: 'Marks', width: 0.9, align: 'right', features: ['tnum'] },
      { key: 'accuracy', label: 'Accuracy', width: 1.0, render: 'bar', color: (v) => masteryColor(v) },
      { key: 'time', label: 'Time', width: 0.8, align: 'right' },
      { key: 'rank', label: 'Rank', width: 0.6, align: 'right' },
      { key: 'mastery', label: 'Level', width: 0.8, render: 'pill', color: (v) => masteryColor(v), soft: (v) => (v === 'Strong' ? COLORS.successSoft : COLORS.infoSoft) },
    ],
  })
  y += subjectH + 10

  ctx.drawText('CHAPTER MASTERY', CONTENT.x, y, CONTENT.w, {
    size: 8.4, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.8,
  })
  y += 13
  const chapterRows = m.chapters.map((c) => ({
    chapter: textValue(c.chapter), subject: textValue(c.subject), accuracy: textValue(c.accuracy),
    time: textValue(c.time), mastery: textValue(c.mastery),
  }))
  const chapterH = StaticTable(ctx, {
    x: CONTENT.x, y, w: CONTENT.w, rows: chapterRows, fontSize: 6.8, rowPadding: 2,
    columns: [
      { key: 'chapter', label: 'Chapter', width: 2.5, font: FONTS.bodySemi },
      { key: 'subject', label: 'Subject', width: 1.1 },
      { key: 'accuracy', label: 'Accuracy', width: 1.0, render: 'bar', color: (v) => masteryColor(v) },
      { key: 'time', label: 'Time', width: 0.9, align: 'right' },
      { key: 'mastery', label: 'Mastery', width: 1.0, render: 'pill', color: (v) => masteryColor(v), soft: (v) => (v === 'Strong' ? COLORS.successSoft : v === 'Critical' ? COLORS.errorSoft : v === 'Weak' ? COLORS.warningSoft : COLORS.infoSoft) },
    ],
  })
  y += chapterH + 8

  const maxTime = Math.max(...m.chapters.map((c) => Number(c.timeMinutes) || 0), 1)
  const bars = m.chapters.map((c) => ({
    label: `${textValue(c.chapter)} · ${textValue(c.subject)}`,
    value: Number(c.timeMinutes) || 0, max: maxTime,
    valueLabel: `${textValue(c.time)} (${textValue(c.share)})`,
    color: subjectColor(c.subject),
  }))
  const timeH = Math.min(170, 44 + bars.length * 10.5)
  PerformanceChart(ctx, {
    x: CONTENT.x, y, w: CONTENT.w, h: timeH, type: 'hbar',
    title: 'Chapter time consumption', subtitle: 'Recorded time and share of total chapter time',
    bars, accent: COLORS.info,
    legend: m.hasChapterTime ? 'Complete chapter-time ledger · values reproduced from the attempt payload.' : 'Chapter timing was not recorded for this attempt.',
  })
  y += timeH + 6
  ctx.drawText(`Source fingerprint ${m.sourceHash}   ·   ${m.questionRowsSupplied} question-review rows supplied   ·   ${m.sections.join(' / ') || m.subjectText}`, CONTENT.x, y, CONTENT.w, {
    size: 6.8, font: FONTS.body, color: COLORS.slate,
  })
}

function revisionBoard(ctx, x, y, w) {
  const m = ctx.model
  ctx.drawText('WHAT TO STUDY NEXT', x, y, w, {
    size: 9.4, font: FONTS.heading, color: COLORS.midnight, characterSpacing: 0.5,
  })
  ctx.drawText('Revision priorities · weakest topics first · source classifications preserved', x, y + 13, w, {
    size: 7, font: FONTS.body, color: COLORS.slate,
  })
  rule(ctx, x, y + 27, w, COLORS.indigo, 1.2)
  y += 35
  const groups = m.revisionGroups.length ? m.revisionGroups : []
  groups.forEach((group, index) => {
    SubjectSection(ctx, {
      subject: group.subject, x, y, w, index,
      note: `${group.mastery || 'Review'}  ·  ${group.topics.length} priority topics`,
    })
    y += 32
    const rows = group.topics.map((topic) => ({
      topic: textValue(topic.name), chapter: textValue(topic.chapter),
      accuracy: textValue(topic.accuracyLabel), priority: textValue(topic.priority),
    }))
    const tableH = StaticTable(ctx, {
      x, y, w, rows, fontSize: 6.9, rowPadding: 2, header: false,
      columns: [
        { key: 'topic', label: 'Priority topic', width: 2.3, font: FONTS.bodySemi },
        { key: 'chapter', label: 'Chapter', width: 1.5 },
        { key: 'accuracy', label: 'Acc.', width: 0.7, align: 'right', color: (v) => masteryColor(v) },
        { key: 'priority', label: 'Priority', width: 0.9, render: 'pill', color: (v) => priorityColor(v), soft: (v) => (v === 'Critical' ? COLORS.errorSoft : COLORS.warningSoft) },
      ],
    })
    // Fine critical rules, never filled warning blocks.
    group.topics.forEach((topic, rowIndex) => {
      if (String(topic.priority).toLowerCase() === 'critical') {
        ctx.doc.rect(x, y + 2 + rowIndex * 14, 2, 12).fill(COLORS.error)
      }
    })
    y += tableH + 8
  })
  if (!groups.length) {
    ctx.drawText('No revision-priority groups were supplied in the source payload.', x, y, w, {
      size: 7.4, font: FONTS.body, color: COLORS.slate,
    })
    y += 20
  }
  return y
}

function pageTwo(ctx) {
  const m = ctx.model
  ctx.reserve(CONTENT.h)
  let y = CONTENT.y
  y += heading(ctx, y, '02', 'LEARNING INTELLIGENCE  /  REVISION STRATEGY', 'Revision priorities and error intelligence', 'Mistake patterns, topic accuracy and the next-study plan — organised by subject.')

  const cols = twoColumns(14)
  const leftX = cols[0].x
  const leftW = cols[0].w
  const rightX = cols[1].x
  const rightW = cols[1].w
  let ly = y
  let ry = y

  ctx.drawText('MISTAKE PATTERN ANALYSIS', leftX, ly, leftW, {
    size: 8.4, font: FONTS.bodySemi, color: COLORS.error, characterSpacing: 0.8,
  })
  ly += 13
  PerformanceChart(ctx, {
    x: leftX, y: ly, w: leftW, h: 116, type: 'hbar',
    title: 'Error categories', subtitle: 'Count by classification',
    bars: m.mistakes.map((x, i) => ({
      label: textValue(x.category), value: Number(x.count) || 0, valueLabel: textValue(x.count),
      color: [COLORS.error, COLORS.warning, COLORS.info, COLORS.indigo, COLORS.success, COLORS.slate, COLORS.midnight][i % 7],
    })), accent: COLORS.error,
  })
  ly += 124

  ctx.drawText('TOPIC-LEVEL ACCURACY', leftX, ly, leftW, {
    size: 8.4, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.8,
  })
  ly += 13
  const topicRows = m.topics.map((row) => ({
    topic: textValue(row.topic), accuracy: pct(row.mastery), level: textValue(row.level),
  }))
  ly += StaticTable(ctx, {
    x: leftX, y: ly, w: leftW, rows: topicRows, fontSize: 6.6, rowPadding: 1.5,
    columns: [
      { key: 'topic', label: 'Topic', width: 2.2, font: FONTS.bodySemi },
      { key: 'accuracy', label: 'Acc.', width: 0.8, render: 'bar', color: (v) => masteryColor(v) },
      { key: 'level', label: 'Level', width: 0.9, render: 'pill', color: (v) => masteryColor(v), soft: (v) => (v === 'Strong' ? COLORS.successSoft : v === 'Critical' ? COLORS.errorSoft : COLORS.infoSoft) },
    ],
  }) + 8

  ctx.drawText('SUBJECT-WISE WEAK TOPICS', leftX, ly, leftW, {
    size: 8.4, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.8,
  })
  ly += 13
  const weakRows = (m.recommendations.weakTopics || []).map((topic) => ({
    subject: subjectForTopic(m, topic), topic: textValue(topic),
  }))
  ly += StaticTable(ctx, {
    x: leftX, y: ly, w: leftW, rows: weakRows, fontSize: 6.6, rowPadding: 1.5,
    columns: [
      { key: 'subject', label: 'Subject', width: 1.0, font: FONTS.bodySemi },
      { key: 'topic', label: 'Weak topic', width: 2.4 },
    ],
  }) + 8

  ctx.drawText('PRIORITY CLASSIFICATION', leftX, ly, leftW, {
    size: 8.4, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.8,
  })
  ly += 13
  const priorityRows = (m.recommendations.priorityRevision || []).map((row) => ({
    topic: textValue(row.topic), priority: textValue(row.priority), timeframe: textValue(row.timeframe),
  }))
  ly += StaticTable(ctx, {
    x: leftX, y: ly, w: leftW, rows: priorityRows, fontSize: 6.6, rowPadding: 1.5,
    columns: [
      { key: 'topic', label: 'Priority topic', width: 2.3, font: FONTS.bodySemi },
      { key: 'priority', label: 'Class', width: 0.8, render: 'pill', color: (v) => priorityColor(v), soft: (v) => (v === 'Critical' ? COLORS.errorSoft : COLORS.warningSoft) },
      { key: 'timeframe', label: 'When', width: 0.8 },
    ],
  })

  ry = revisionBoard(ctx, rightX, ry, rightW)
  ctx.drawText('WEAK CHAPTERS  /  PUBLISHED LIST', rightX, ry + 6, rightW, {
    size: 8.4, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.8,
  })
  const chapterRows = (m.recommendations.weakChapters || []).map((value, index) => ({ index: index + 1, value: textValue(value) }))
  const weakChaptersH = StaticTable(ctx, {
    x: rightX, y: ry + 19, w: rightW, rows: chapterRows, fontSize: 6.8, rowPadding: 1.5,
    columns: [
      { key: 'index', label: 'No.', width: 0.4, align: 'center' },
      { key: 'value', label: 'Weak chapter', width: 2.6, font: FONTS.bodySemi },
    ],
  })
  ry += 19 + weakChaptersH + 7

  ctx.drawText('SOURCE MISTAKE EVIDENCE', rightX, ry, rightW, {
    size: 8.4, font: FONTS.bodySemi, color: COLORS.error, characterSpacing: 0.8,
  })
  const evidenceRows = m.mistakeList.map((row) => ({
    q: textValue(row.q), detail: textValue(row.detail),
  }))
  StaticTable(ctx, {
    x: rightX, y: ry + 12, w: rightW, rows: evidenceRows, fontSize: 6.4, rowPadding: 1.5,
    accent: COLORS.error,
    columns: [
      { key: 'q', label: 'Q', width: 0.45, font: FONTS.bodyBold },
      { key: 'detail', label: 'Source detail', width: 3.2 },
    ],
  })

  // Leave the last 58 pt for the quiet final branding drawn by the renderer.
  ctx.y = CONTENT.bottom - 58
}

export function renderIntelligenceReport(ctx) {
  pageOne(ctx)
  ctx.startFreshPage()
  pageTwo(ctx)
}
