/**
 * REPORT ONE — Full Exam Analysis Report.
 *
 * Editorial structure:
 *   01  Cover / executive overview
 *   02  Performance breakdown
 *   03  Subject & chapter intelligence
 *   04  Time, comparison and trajectory
 *   05+ Question-by-question analysis (intelligent pagination)
 *   ..  Mistake evidence, revision strategy, source register, final branding
 */

import {
  CONTENT, COLORS, FONTS, TYPE, A4,
  fmt, pct, masteryColor, difficultyColor, priorityColor, subjectColor, statusColor,
  twoColumns, threeColumns,
} from './theme.js'
import {
  MetricCard, PerformanceChart, KeyValueGrid, SectionHeading, SubsectionHeading,
  SimpleTable, SubjectPerformance, ChapterMastery, ChapterTime,
  QuestionAnalysisCard, RevisionPriorityTable, SubjectSection,
  Pill, ProgressBar, rule,
} from './components.js'

function flow(ctx, height, draw) {
  const reserved = ctx.reserve(height)
  draw(reserved.y)
  return height
}

function metricGrid(ctx, items, columns = 4, cardH = 52) {
  const gap = 8
  const colW = (CONTENT.w - gap * (columns - 1)) / columns
  const rows = Math.ceil(items.length / columns)
  for (let row = 0; row < rows; row += 1) {
    flow(ctx, cardH + 6, (y) => {
      items.slice(row * columns, (row + 1) * columns).forEach((item, col) => {
        MetricCard(ctx, {
          x: CONTENT.x + col * (colW + gap),
          y,
          w: colW,
          h: cardH,
          label: item.label,
          value: item.value,
          sub: item.sub || '',
          tone: item.tone || COLORS.indigo,
          soft: item.soft || COLORS.white,
          size: item.size || TYPE.metric,
        })
      })
    })
  }
}

function chartRow(ctx, charts, height = 150) {
  const cols = threeColumns(12)
  flow(ctx, height + 10, (y) => {
    charts.forEach((chart, index) => {
      PerformanceChart(ctx, {
        x: cols[index].x,
        y,
        w: cols[index].w,
        h: height,
        ...chart,
      })
    })
  })
}

function subsection(ctx, title, note = '', accent = COLORS.indigo) {
  const noteH = note ? ctx.measureText(note, CONTENT.w - 14, { size: 7.6, font: FONTS.body }) + 2 : 0
  const h = 22 + noteH
  flow(ctx, h + 6, (y) => SubsectionHeading(ctx, { y, title, note, accent }))
}

function textValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function cover(ctx) {
  const m = ctx.model
  const doc = ctx.doc
  flow(ctx, 88, (y) => {
    doc.rect(CONTENT.x, y + 2, 3, 66).fill(COLORS.indigo)
    ctx.drawText('EDUX / ACADEMIC INTELLIGENCE', CONTENT.x + 16, y, CONTENT.w - 16, {
      size: 7.2, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 1.4,
    })
    ctx.drawText(m.reportTitle, CONTENT.x + 16, y + 14, CONTENT.w - 16, {
      size: TYPE.coverTitle, font: FONTS.heading, color: COLORS.midnight, characterSpacing: 1.1,
      lineHeight: TYPE.coverTitle * 1.2,
    })
    ctx.drawText(m.examName, CONTENT.x + 16, y + 48, CONTENT.w - 16, {
      size: 11, font: FONTS.heading, color: COLORS.deepInk,
    })
    ctx.drawText(`${m.subjectText}   ·   ${m.reportId}   ·   Generated ${m.generatedDate}`, CONTENT.x + 16, y + 66, CONTENT.w - 16, {
      size: 8, font: FONTS.body, color: COLORS.slate,
    })
  })

  const infoItems = [
    { label: 'Student', value: m.studentName },
    { label: 'Roll number', value: m.rollNo },
    { label: 'Examination date', value: m.examDate },
    { label: 'Generated', value: m.generatedDate },
    { label: 'Pattern', value: m.pattern },
    { label: 'Duration', value: m.durationLabel },
    { label: 'Subjects', value: m.sections.join(' · ') || m.subjectText },
    { label: 'Examination status', value: m.status },
  ]
  const gap = 8
  const colW = (CONTENT.w - gap * 3) / 4
  flow(ctx, 2 * (40 + 6), (y) => KeyValueGrid(ctx, {
    x: CONTENT.x, y, w: CONTENT.w, items: infoItems, columns: 4, gap, cardH: 40,
    valueSize: 9, valueLineHeight: 10.5,
  }))

  flow(ctx, 82, (y) => {
    doc.roundedRect(CONTENT.x, y, CONTENT.w, 78, 4).fill(COLORS.midnight)
    doc.rect(CONTENT.x + 14, y + 12, 2, 52).fill(COLORS.indigo)
    ctx.drawText('TOTAL MARKS OBTAINED', CONTENT.x + 24, y + 12, 210, {
      size: 7.2, font: FONTS.bodySemi, color: '#BFC7D6', characterSpacing: 1.0,
    })
    ctx.drawText(fmt(m.hero.score), CONTENT.x + 24, y + 28, 120, {
      size: TYPE.metricLarge, font: FONTS.heading, color: COLORS.white, features: ['tnum'],
    })
    ctx.drawText(`/ ${fmt(m.hero.maxScore)} marks`, CONTENT.x + 118, y + 49, 120, {
      size: 9, font: FONTS.body, color: '#BFC7D6',
    })
    const rightX = CONTENT.x + 270
    const signals = [
      ['SCORE', m.scorePct],
      ['ACCURACY', pct(m.questionAccuracy)],
      ['SUCCESS RATE', pct(m.successRate)],
      ['OVERALL ACCURACY', pct(m.overallAccuracy)],
    ]
    signals.forEach((signal, index) => {
      const col = index % 2
      const row = Math.floor(index / 2)
      const sx = rightX + col * 118
      const sy = y + 14 + row * 30
      ctx.drawText(signal[0], sx, sy, 108, {
        size: 6.8, font: FONTS.bodySemi, color: '#9CA8BD', characterSpacing: 0.7,
      })
      ctx.drawText(signal[1], sx, sy + 11, 108, {
        size: 14, font: FONTS.heading, color: COLORS.white, features: ['tnum'],
      })
    })
    ctx.drawText(`${m.breakdownLine}   ·   Attempted ${m.attempted} / ${m.totalQuestions}   ·   Time ${m.timeTakenLabel}`, CONTENT.x + 24, y + 65, CONTENT.w - 48, {
      size: 7.4, font: FONTS.body, color: '#C9D2E2',
    })
  })

  metricGrid(ctx, [
    { label: 'Marks obtained', value: fmt(m.hero.score), sub: `of ${fmt(m.hero.maxScore)}`, tone: COLORS.indigo },
    { label: 'Maximum marks', value: fmt(m.hero.maxScore), sub: m.pattern, tone: COLORS.midnight },
    { label: 'Correct answers', value: fmt(m.qi.correct), sub: 'recorded', tone: COLORS.success },
    { label: 'Incorrect answers', value: fmt(m.qi.incorrect), sub: 'recorded', tone: COLORS.error },
    { label: 'Skipped questions', value: fmt(m.qi.skipped), sub: 'unattempted', tone: COLORS.warning },
    { label: 'Overall score', value: m.scorePct, sub: 'percentage', tone: COLORS.info },
    { label: 'Accuracy', value: pct(m.questionAccuracy), sub: 'question intelligence', tone: COLORS.success },
    { label: 'Time taken', value: m.timeTakenLabel, sub: m.hasTime ? 'recorded' : 'not recorded', tone: COLORS.indigo },
  ], 4, 48)

  chartRow(ctx, [
    {
      title: 'Difficulty analysis', subtitle: 'Questions by level', type: 'hbar', accent: COLORS.info,
      bars: m.difficulty.map((d) => ({
        label: textValue(d.level), value: Number(d.questions) || 0,
        valueLabel: `${textValue(d.questions)} Q`, color: difficultyColor(d.level),
      })),
      legend: m.difficulty.map((d) => `${textValue(d.level)} ${textValue(d.accuracy)}%`).join(' · '),
    },
    {
      title: 'Mistake distribution', subtitle: 'Error categories', type: 'hbar', accent: COLORS.error,
      bars: m.mistakes.map((x, i) => ({
        label: textValue(x.category), value: Number(x.count) || 0,
        valueLabel: textValue(x.count), color: [COLORS.error, COLORS.warning, COLORS.info, COLORS.indigo, COLORS.success, COLORS.slate, COLORS.midnight][i % 7],
      })),
      legend: 'Counts reproduced from the attempt payload.',
    },
    {
      title: 'Subject-wise performance', subtitle: 'Accuracy by subject', type: 'hbar', accent: COLORS.indigo,
      bars: m.subjectValues.map((s, i) => ({
        label: textValue(s.name), value: Number(s.accuracy) || 0,
        valueLabel: pct(s.accuracy), color: subjectColor(s.name, i),
      })),
      legend: m.subjectValues.map((s) => `${textValue(s.name)} ${s.scoreLabel}`).join(' · ') || m.subjectText,
    },
  ], 140)

  const summaryH = ctx.measureText(m.aiSummary || 'No editorial summary was supplied in the source payload.', CONTENT.w - 28, {
    size: 8.6, font: FONTS.body, color: COLORS.deepInk, lineHeight: 12,
  }) + 20
  flow(ctx, summaryH, (y) => {
    doc.roundedRect(CONTENT.x, y, CONTENT.w, summaryH - 4, 3).fill(COLORS.ivory).stroke(COLORS.border)
    ctx.drawText('PERFORMANCE BRIEF  /  EDITORIAL SUMMARY', CONTENT.x + 14, y + 6, CONTENT.w - 28, {
      size: 7, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 0.9,
    })
    ctx.drawText(m.aiSummary || 'No editorial summary was supplied in the source payload.', CONTENT.x + 14, y + 18, CONTENT.w - 28, {
      size: 8.6, font: FONTS.body, color: COLORS.deepInk, lineHeight: 12,
    })
  })

  const mapItems = [
    { title: 'Performance breakdown', note: `${m.totalQuestions} questions · ${m.mistakes.length} error categories · ${m.difficulty.length} difficulty bands` },
    { title: 'Subject & chapter intelligence', note: `${m.subjectValues.length} subjects · ${m.chapters.length} chapters · mastery classifications` },
    { title: 'Time, comparison and projection', note: `${m.timeTakenLabel} recorded · ${(m.timeIntelligence.distribution || []).length} timing sections` },
    { title: 'Question-by-question analysis', note: `${m.questionRowsSupplied} review rows · full source explanations and answer comparison` },
    { title: 'Mistake pattern and evidence', note: `${m.mistakes.length} categories · ${m.mistakeList.length} source evidence notes` },
    { title: 'Revision strategy', note: `${m.revisionGroups.length} subject groups · ${(m.recommendations.priorityRevision || []).length} published priorities` },
  ]
  flow(ctx, 106, (y) => {
    ctx.drawText('REPORT MAP  /  CONTENTS', CONTENT.x, y, CONTENT.w, {
      size: 7, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 1.0,
    })
    rule(ctx, CONTENT.x, y + 13, CONTENT.w, COLORS.border, 0.5)
    const cols = twoColumns(18)
    mapItems.forEach((item, index) => {
      const col = index < 3 ? 0 : 1
      const row = index % 3
      const x = cols[col].x
      const yy = y + 19 + row * 29
      doc.rect(x, yy, 2, 22).fill(index < 3 ? COLORS.indigo : COLORS.info)
      ctx.drawText(String(index + 1).padStart(2, '0'), x + 10, yy, 22, {
        size: 8.4, font: FONTS.bodyBold, color: COLORS.indigo, features: ['tnum'],
      })
      ctx.drawText(item.title, x + 34, yy, cols[col].w - 34, {
        size: 9.2, font: FONTS.heading, color: COLORS.midnight,
      })
      ctx.drawText(item.note, x + 34, yy + 12, cols[col].w - 34, {
        size: 7.2, font: FONTS.body, color: COLORS.slate, lineHeight: 9,
      })
    })
  })
}

function performanceBreakdown(ctx) {
  const m = ctx.model
  ctx.startFreshPage()
  SectionHeading(ctx, {
    number: '01', kicker: 'ANALYTICS', title: 'Performance breakdown',
    note: 'Response composition, difficulty, error patterns and subject marks — all values are reproduced from the examination payload.',
  })

  const cols = twoColumns(14)
  const responseBars = [
    { label: 'Correct', value: Number(m.qi.correct) || 0, color: COLORS.success },
    { label: 'Incorrect', value: Number(m.qi.incorrect) || 0, color: COLORS.error },
    { label: 'Skipped', value: Number(m.qi.skipped) || 0, color: COLORS.warning },
  ]
  flow(ctx, 158, (y) => {
    PerformanceChart(ctx, {
      x: cols[0].x, y, w: cols[0].w, h: 150, type: 'donut',
      title: 'Correct versus incorrect', subtitle: `${m.totalQuestions} questions in the paper`,
      slices: responseBars.map((bar) => ({ ...bar, label: `${bar.label} ${bar.value}` })),
      centerValue: fmt(m.qi.attempted), centerLabel: 'ATTEMPTED', accent: COLORS.success,
    })
    PerformanceChart(ctx, {
      x: cols[1].x, y, w: cols[1].w, h: 150, type: 'hbar',
      title: 'Mistake categories', subtitle: 'Count by classification',
      bars: m.mistakes.map((x, i) => ({
        label: textValue(x.category), value: Number(x.count) || 0, valueLabel: textValue(x.count),
        color: [COLORS.error, COLORS.warning, COLORS.info, COLORS.indigo, COLORS.success, COLORS.slate, COLORS.midnight][i % 7],
      })),
      accent: COLORS.error,
    })
  })

  subsection(ctx, 'Difficulty distribution', 'Questions, attempted counts, accuracy and average time by difficulty level.')
  SimpleTable(ctx, {
    rows: m.difficulty.map((d) => ({
      level: textValue(d.level), questions: textValue(d.questions), attempted: textValue(d.attempted),
      accuracy: pct(d.accuracy), time: `${textValue(d.time)} min`,
    })),
    columns: [
      { key: 'level', label: 'Level', width: 1.2, render: 'pill', color: (v) => difficultyColor(v), soft: () => COLORS.ivory },
      { key: 'questions', label: 'Questions', width: 1, align: 'right', features: ['tnum'] },
      { key: 'attempted', label: 'Attempted', width: 1, align: 'right', features: ['tnum'] },
      { key: 'accuracy', label: 'Accuracy', width: 1, render: 'bar', color: (v) => masteryColor(v) },
      { key: 'time', label: 'Avg. time', width: 1, align: 'right' },
    ],
  })

  subsection(ctx, 'Subject-wise marks and accuracy', 'Scores, pace, attempt quality and evidence areas.')
  SubjectPerformance(ctx, { subjects: m.subjectValues })

  subsection(ctx, 'Performance signals', 'Additional headline metrics published with this attempt.')
  const signals = [
    { label: 'Grade', value: textValue(m.hero.grade) },
    { label: 'Rank', value: textValue(m.hero.rank) },
    { label: 'Percentile', value: textValue(m.hero.percentile) },
    { label: 'Batch rank', value: textValue(m.hero.batchRank) },
    { label: 'Cohort size', value: textValue(m.hero.cohortSize) },
    { label: 'Overall speed', value: textValue(m.hero.overallSpeed) },
    { label: 'Confidence index', value: textValue(m.hero.confidenceIndex) },
    { label: 'Readiness score', value: textValue(m.hero.readinessScore) },
    { label: 'Health score', value: textValue(m.hero.healthScore) },
    { label: 'Negative marks', value: textValue(m.qi.negativeMarks) },
    { label: 'Guess attempts', value: textValue(m.qi.guessAttempts) },
    { label: 'Attempt ratio', value: pct(m.qi.attemptRatio) },
    { label: 'Total questions', value: textValue(m.totalQuestions) },
    { label: 'Success rate', value: pct(m.successRate) },
    { label: 'Badge', value: textValue(m.hero.badge) },
  ]
  const kvH = Math.ceil(signals.length / 5) * (40 + 6)
  flow(ctx, kvH, (y) => KeyValueGrid(ctx, { y, items: signals, columns: 5, cardH: 40, valueSize: 8.8, valueLineHeight: 10.5 }))
}

function subjectAndChapter(ctx) {
  const m = ctx.model
  ctx.startFreshPage()
  SectionHeading(ctx, {
    number: '02', kicker: 'MASTERY MAP', title: 'Subject and chapter intelligence',
    note: 'Chapter-level accuracy and mastery are ordered exactly as supplied by the analysis engine.',
  })
  SubjectPerformance(ctx, { subjects: m.subjectValues })
  ctx.space(10)
  ChapterMastery(ctx, { chapters: m.chapters })

  const counts = { Strong: 0, Average: 0, Weak: 0, Critical: 0 }
  m.chapters.forEach((c) => {
    const key = String(c.mastery || '')
    if (counts[key] !== undefined) counts[key] += 1
  })
  const slices = Object.entries(counts).filter(([, value]) => value > 0).map(([label, value]) => ({
    label, value, color: masteryColor(label),
  }))
  flow(ctx, 148, (y) => PerformanceChart(ctx, {
    x: CONTENT.x, y, w: CONTENT.w, h: 140, type: 'donut',
    title: 'Mastery distribution', subtitle: `${m.chapters.length} chapters classified`,
    slices, centerValue: String(m.chapters.length), centerLabel: 'CHAPTERS', accent: COLORS.indigo,
  }))
}

function timeAndComparison(ctx) {
  const m = ctx.model
  ctx.startFreshPage()
  SectionHeading(ctx, {
    number: '03', kicker: 'PACE & TRAJECTORY', title: 'Time, comparison and projection',
    note: 'Timing and comparative signals are shown as published; no trend or score has been recomputed.',
  })
  ChapterTime(ctx, { chapters: m.chapters })

  const ti = m.timeIntelligence || {}
  subsection(ctx, 'Time intelligence', `Fastest: ${textValue(ti.fastestQuestion?.q)} · ${textValue(ti.fastestQuestion?.time)} min   |   Slowest: ${textValue(ti.slowestQuestion?.q)} · ${textValue(ti.slowestQuestion?.time)} min`)
  const timeRows = (ti.distribution || []).map((row) => ({
    section: textValue(row.section), allocated: textValue(row.allocated), used: textValue(row.used), efficiency: textValue(row.efficiency),
  }))
  SimpleTable(ctx, {
    rows: timeRows,
    columns: [
      { key: 'section', label: 'Section', width: 1.4, font: FONTS.bodySemi },
      { key: 'allocated', label: 'Allocated (min)', width: 1, align: 'right' },
      { key: 'used', label: 'Used (min)', width: 1, align: 'right' },
      { key: 'efficiency', label: 'Efficiency', width: 1, align: 'right', color: (v) => masteryColor(v) },
    ],
  })
  const timeSignals = [
    { label: 'Avg. time / question', value: textValue(ti.avgTimePerQuestion) },
    { label: 'Navigation count', value: textValue(ti.navigationCount) },
    { label: 'Time management', value: textValue(ti.timeManagementScore) },
    { label: 'Fastest question', value: textValue(ti.fastestQuestion?.q) },
    { label: 'Fastest time', value: textValue(ti.fastestQuestion?.time) },
    { label: 'Slowest question', value: textValue(ti.slowestQuestion?.q) },
    { label: 'Slowest time', value: textValue(ti.slowestQuestion?.time) },
  ]
  flow(ctx, Math.ceil(timeSignals.length / 4) * (38 + 6), (y) => KeyValueGrid(ctx, { y, items: timeSignals, columns: 4, cardH: 38, valueSize: 8.8, valueLineHeight: 10.5 }))

  const comp = m.comparison || {}
  const comparisonRows = ['previousTest', 'previousMonth', 'batchAverage', 'instituteAverage', 'topPerformer']
    .filter((key) => comp[key])
    .map((key) => ({
      label: textValue(comp[key].label), score: textValue(comp[key].score),
      percentile: textValue(comp[key].percentile), grade: textValue(comp[key].grade), name: textValue(comp[key].name),
    }))
  subsection(ctx, 'Comparative performance', 'Cohort and historical benchmarks attached to this attempt.')
  SimpleTable(ctx, {
    rows: comparisonRows,
    columns: [
      { key: 'label', label: 'Benchmark', width: 1.8, font: FONTS.bodySemi },
      { key: 'score', label: 'Score', width: 0.8, align: 'right', features: ['tnum'] },
      { key: 'percentile', label: 'Percentile', width: 0.9, align: 'right' },
      { key: 'grade', label: 'Grade', width: 0.7, align: 'center' },
      { key: 'name', label: 'Reference', width: 1.4 },
    ],
  })
  const deltaRows = (comp.deltas || []).map((row) => ({
    label: textValue(row.label), value: textValue(row.value), up: textValue(row.up),
  }))
  SimpleTable(ctx, {
    rows: deltaRows,
    columns: [
      { key: 'label', label: 'Delta', width: 2 },
      { key: 'value', label: 'Value', width: 1, align: 'right', color: COLORS.success },
      { key: 'up', label: 'Up flag', width: 1, align: 'center' },
    ],
  })

  const pred = m.prediction || {}
  subsection(ctx, 'Projection and readiness', `Expected improvement ${textValue(pred.expectedImprovement)} · risk ${textValue(pred.riskLevel)}`)
  const trajRows = (pred.trajectory || []).map((row) => ({ exam: textValue(row.exam), score: textValue(row.score) }))
  SimpleTable(ctx, {
    rows: trajRows,
    columns: [
      { key: 'exam', label: 'Examination / projection', width: 2.4, font: FONTS.bodySemi },
      { key: 'score', label: 'Score', width: 1, align: 'right', features: ['tnum'] },
    ],
  })
  const predSignals = [
    { label: 'JEE percentile', value: textValue(pred.jeePercentile) },
    { label: 'NEET score', value: textValue(pred.neetScore) },
    { label: 'Expected AIR', value: textValue(pred.expectedAIR) },
    { label: 'Target probability', value: textValue(pred.targetProbability) },
    { label: 'Risk level', value: textValue(pred.riskLevel) },
    { label: 'Expected improvement', value: textValue(pred.expectedImprovement) },
  ]
  flow(ctx, Math.ceil(predSignals.length / 3) * (38 + 6), (y) => KeyValueGrid(ctx, { y, items: predSignals, columns: 3, cardH: 38, valueSize: 8.8, valueLineHeight: 10.5 }))
}

function questionReview(ctx) {
  const m = ctx.model
  ctx.startFreshPage()
  SectionHeading(ctx, {
    number: '04', kicker: 'QUESTION INTELLIGENCE', title: 'Question-by-question analysis',
    note: `${m.questionRowsSupplied} question-review rows supplied in the source payload. Missing optional fields are shown as — and are never inferred.`,
  })
  const legendH = 26
  flow(ctx, legendH, (y) => {
    const items = [
      ['Correct', COLORS.success], ['Incorrect', COLORS.error], ['Skipped', COLORS.warning],
    ]
    let x = CONTENT.x
    items.forEach(([label, color]) => {
      Pill(ctx, { x, y: y + 2, text: label, color, soft: COLORS.ivory, width: 74, size: 7 })
      x += 82
    })
    ctx.drawText('Each card preserves question metadata, answer comparison, marks, time, mistake category and the full source explanation.', x + 4, y + 3, CONTENT.x + CONTENT.w - x - 4, {
      size: 7.4, font: FONTS.body, color: COLORS.slate,
    })
  })
  m.questions.forEach((question) => QuestionAnalysisCard(ctx, { question }))
  ctx.space(4)
  subsection(ctx, 'Question data completeness', `${m.totalQuestions} questions are recorded in the paper intelligence summary; ${m.questionRowsSupplied} per-question review rows were supplied for publication.`)
}

function mistakeEvidence(ctx) {
  const m = ctx.model
  ctx.startFreshPage()
  SectionHeading(ctx, {
    number: '05', kicker: 'ERROR INTELLIGENCE', title: 'Mistake pattern and evidence',
    note: 'Mistake categories, the question-level evidence attached to them, and topic-level accuracy.',
  })
  const cols = twoColumns(14)
  flow(ctx, 148, (y) => {
    PerformanceChart(ctx, {
      x: cols[0].x, y, w: cols[0].w, h: 140, type: 'hbar',
      title: 'Mistake pattern', subtitle: 'Count by category',
      bars: m.mistakes.map((x, i) => ({
        label: textValue(x.category), value: Number(x.count) || 0, valueLabel: textValue(x.count),
        color: [COLORS.error, COLORS.warning, COLORS.info, COLORS.indigo, COLORS.success, COLORS.slate, COLORS.midnight][i % 7],
      })), accent: COLORS.error,
    })
    PerformanceChart(ctx, {
      x: cols[1].x, y, w: cols[1].w, h: 140, type: 'stacked',
      title: 'Response composition', subtitle: `${m.totalQuestions} questions`,
      bars: [
        { label: 'Correct', value: Number(m.qi.correct) || 0, color: COLORS.success },
        { label: 'Incorrect', value: Number(m.qi.incorrect) || 0, color: COLORS.error },
        { label: 'Skipped', value: Number(m.qi.skipped) || 0, color: COLORS.warning },
      ], accent: COLORS.success,
    })
  })

  subsection(ctx, 'Question-level mistake evidence', 'Details are reproduced verbatim from the source payload.')
  SimpleTable(ctx, {
    rows: m.mistakeList.map((row) => ({
      q: textValue(row.q), subject: textValue(row.subject), category: textValue(row.category),
      topic: textValue(row.topic), detail: textValue(row.detail),
    })),
    columns: [
      { key: 'q', label: 'Q', width: 0.55, font: FONTS.bodyBold },
      { key: 'subject', label: 'Subject', width: 1.1 },
      { key: 'category', label: 'Category', width: 1.5, render: 'pill', color: () => COLORS.error, soft: () => COLORS.errorSoft },
      { key: 'topic', label: 'Topic', width: 1.4 },
      { key: 'detail', label: 'Source detail', width: 3.0 },
    ],
  })

  subsection(ctx, 'Topic-level accuracy', `${m.topics.length} topics with published mastery levels.`)
  SimpleTable(ctx, {
    rows: m.topics.map((row) => ({
      topic: textValue(row.topic), subject: textValue(row.subject), mastery: pct(row.mastery), level: textValue(row.level),
    })),
    columns: [
      { key: 'topic', label: 'Topic', width: 2.2, font: FONTS.bodySemi },
      { key: 'subject', label: 'Subject', width: 1.2 },
      { key: 'mastery', label: 'Accuracy', width: 1.0, render: 'bar', color: (v) => masteryColor(v) },
      { key: 'level', label: 'Level', width: 1.0, render: 'pill', color: (v) => masteryColor(v), soft: (v) => (v === 'Strong' ? COLORS.successSoft : v === 'Critical' ? COLORS.errorSoft : COLORS.infoSoft) },
    ],
  })
}

function revisionStrategy(ctx) {
  const m = ctx.model
  ctx.startFreshPage()
  SectionHeading(ctx, {
    number: '06', kicker: 'LEARNING INTELLIGENCE', title: 'Revision strategy',
    note: 'Revision priorities are ordered weakest first. Critical topics are highlighted with a fine rule, not an aggressive warning block.',
    accent: COLORS.error,
  })
  RevisionPriorityTable(ctx, { groups: m.revisionGroups, emphasis: true })

  const rec = m.recommendations || {}
  subsection(ctx, 'Published revision priorities', 'Priority, topic and timeframe from the recommendation engine.', COLORS.error)
  SimpleTable(ctx, {
    rows: (rec.priorityRevision || []).map((row) => ({
      topic: textValue(row.topic), priority: textValue(row.priority), timeframe: textValue(row.timeframe),
    })),
    columns: [
      { key: 'topic', label: 'Priority topic', width: 3.0, font: FONTS.bodySemi },
      { key: 'priority', label: 'Classification', width: 1.1, render: 'pill', color: (v) => priorityColor(v), soft: (v) => (v === 'Critical' ? COLORS.errorSoft : COLORS.warningSoft) },
      { key: 'timeframe', label: 'Timeframe', width: 1.1 },
    ],
  })

  const weakChapters = (rec.weakChapters || []).map((value, index) => ({ index: index + 1, value: textValue(value) }))
  const weakTopics = (rec.weakTopics || []).map((value, index) => ({ index: index + 1, value: textValue(value) }))
  subsection(ctx, 'Subject-wise weak topics and chapters', 'Names are reproduced exactly as supplied by the recommendation engine.')
  const weakCols = twoColumns(14)
  flow(ctx, 126, (y) => {
    StaticTableLocal(ctx, { x: weakCols[0].x, y, w: weakCols[0].w, title: 'Weak chapters', rows: weakChapters })
    StaticTableLocal(ctx, { x: weakCols[1].x, y, w: weakCols[1].w, title: 'Weak topics', rows: weakTopics })
  })

  subsection(ctx, 'Recommended next actions', 'Practice, PYQ, mock and lecture resources attached to this attempt.')
  const actionRows = [
    ...(rec.suggestedPYQs || []).map((row) => ({ kind: 'PYQ', title: textValue(row.title), detail: textValue(row.source) })),
    ...(rec.practiceQuestions || []).map((row) => ({ kind: 'Practice', title: textValue(row.title), detail: `${textValue(row.count)} · ${textValue(row.difficulty)}` })),
    ...(rec.mockTests || []).map((row) => ({ kind: 'Mock test', title: textValue(row.title), detail: textValue(row.mode) })),
    ...(rec.lectures || []).map((row) => ({ kind: 'Lecture', title: textValue(row.title), detail: textValue(row.type) })),
  ]
  SimpleTable(ctx, {
    rows: actionRows,
    columns: [
      { key: 'kind', label: 'Action', width: 1.0, render: 'pill', color: () => COLORS.indigo, soft: () => COLORS.indigoSoft },
      { key: 'title', label: 'Resource', width: 3.2, font: FONTS.bodySemi },
      { key: 'detail', label: 'Detail', width: 1.5 },
    ],
  })
}

function StaticTableLocal(ctx, { x, y, w, title, rows }) {
  ctx.drawText(title, x, y, w, { size: 8.2, font: FONTS.bodySemi, color: COLORS.slate })
  let cursor = y + 14
  ctx.doc.rect(x, cursor, w, 15).fill(COLORS.midnight)
  ctx.drawText('NO.', x + 4, cursor + 3, 24, { size: 6.5, font: FONTS.bodySemi, color: COLORS.white })
  ctx.drawText('SOURCE VALUE', x + 30, cursor + 3, w - 34, { size: 6.5, font: FONTS.bodySemi, color: COLORS.white })
  cursor += 15
  rows.forEach((row, index) => {
    const h = Math.max(16, ctx.measureText(row.value, w - 38, { size: 7.2, font: FONTS.body }) + 6)
    ctx.doc.rect(x, cursor, w, h).fill(index % 2 ? COLORS.ivory : COLORS.white)
    ctx.doc.lineWidth(0.3).strokeColor(COLORS.border).rect(x, cursor, w, h).stroke()
    ctx.drawText(String(row.index), x + 4, cursor + 3, 24, { size: 7, font: FONTS.bodyBold, color: COLORS.indigo })
    ctx.drawText(row.value, x + 30, cursor + 3, w - 34, { size: 7.2, font: FONTS.body, color: COLORS.deepInk })
    cursor += h
  })
  return cursor - y
}

export function renderFullAnalysis(ctx) {
  cover(ctx)
  performanceBreakdown(ctx)
  subjectAndChapter(ctx)
  timeAndComparison(ctx)
  questionReview(ctx)
  mistakeEvidence(ctx)
  revisionStrategy(ctx)
}
