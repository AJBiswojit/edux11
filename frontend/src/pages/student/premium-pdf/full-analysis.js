/**
 * REPORT ONE — Full Exam Analysis Report, V2.
 *
 * An editorial publication rather than a dashboard: a typographic cover,
 * four intelligence spreads, open question review pages, learning evidence,
 * and a complete source register. Every section uses measured components and
 * page-aware flow; no fixed page plan or fixed chart row height is used.
 */

import {
  CONTENT, COLORS, FONTS, TYPE,
  fmt, pct, mix, masteryColor, priorityColor, difficultyColor, statusColor,
  subjectColor,
} from './theme.js'
import {
  SectionHeading, Subheading, Paragraph, EditorialColumns, MetricLedger,
  MetricLedgerSpec, BarChartSpec, StackedBarSpec, DonutGaugeSpec,
  StaticTable, StaticTableSpec, MeasuredTable, SubjectBand, QuestionCard, Pill,
} from './components.js'

function text(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function list(value) {
  if (Array.isArray(value) && value.length) return value.map(text).join(' · ')
  return '—'
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

function numeric(value) {
  const n = Number(String(value ?? '').replace('%', ''))
  return Number.isFinite(n) ? n : 0
}

/** A vertical stack of static specs, each with its own measured boundary. */
function stackSpecs(ctx, builders, gap = 10) {
  return {
    type: 'column-stack',
    label: 'Editorial column stack',
    measure: (w) => {
      const heights = builders.map((build) => build(w).measure(w))
      return heights.reduce((sum, h) => sum + h, 0) + gap * Math.max(0, heights.length - 1)
    },
    draw: (frame) => {
      let y = frame.y
      builders.forEach((build, index) => {
        const spec = build(frame.w)
        const h = spec.measure(frame.w)
        ctx.child({
          type: spec.type || 'stack-item',
          label: spec.label || '',
          x: frame.x, y, w: frame.w, h,
        }, (childFrame) => spec.draw(childFrame))
        y += h + (index < builders.length - 1 ? gap : 0)
      })
    },
  }
}

function ParagraphSpec(ctx, { label = '', title = '', text = '', size = TYPE.body, accent = COLORS.indigo } = {}) {
  const measure = (w) => {
    const titleH = title ? ctx.measureText(title, w - 14, { size: TYPE.label, font: FONTS.bodySemi, characterSpacing: 0.7 }) + 3 : 0
    const bodyH = ctx.measureText(fmt(text, '—'), w - 16, { size, font: FONTS.body, paragraphGap: 2 })
    return 8 + titleH + bodyH + 8
  }
  const draw = (frame) => {
    ctx.canvas.rect(frame.x, frame.y + 3, 2, frame.h - 10, { fill: accent, audit: false })
    let cursor = frame.y + 5
    if (title) {
      cursor += ctx.text(title, frame.x + 12, cursor, frame.w - 14, {
        size: TYPE.label, font: FONTS.bodySemi, color: accent, characterSpacing: 0.7,
      }) + 3
    }
    ctx.text(fmt(text, '—'), frame.x + 12, cursor, frame.w - 16, {
      size, font: FONTS.body, color: COLORS.ink, paragraphGap: 2,
    })
  }
  return { type: 'static-paragraph', label: label || title, measure, draw }
}

function signals(m) {
  return [
    { label: 'Grade', value: text(m.hero.grade) },
    { label: 'Rank', value: text(m.hero.rank) },
    { label: 'Percentile', value: text(m.hero.percentile) },
    { label: 'Batch rank', value: text(m.hero.batchRank) },
    { label: 'Cohort size', value: text(m.hero.cohortSize) },
    { label: 'Overall speed', value: text(m.hero.overallSpeed) },
    { label: 'Confidence index', value: text(m.hero.confidenceIndex) },
    { label: 'Readiness score', value: text(m.hero.readinessScore) },
    { label: 'Health score', value: text(m.hero.healthScore) },
    { label: 'Negative marks', value: text(m.qi.negativeMarks) },
    { label: 'Guess attempts', value: text(m.qi.guessAttempts) },
    { label: 'Attempt ratio', value: pct(m.qi.attemptRatio) },
    { label: 'Total questions', value: text(m.totalQuestions) },
    { label: 'Success rate', value: pct(m.successRate) },
    { label: 'Badge', value: text(m.hero.badge) },
  ]
}

function CoverIdentity(ctx) {
  const m = ctx.model
  const titleText = m.reportTitle.replace(' REPORT', '\nREPORT')
  const measure = () => {
    const kickerH = ctx.measureText('EDUX  /  ACADEMIC INTELLIGENCE', CONTENT.w, { size: TYPE.label, font: FONTS.bodySemi, characterSpacing: 1.1 })
    const titleH = ctx.measureText(titleText, CONTENT.w, { size: TYPE.coverTitle, font: FONTS.heading, lineHeight: TYPE.coverTitle * 1.18, paragraphGap: 0 })
    const examH = ctx.measureText(m.examName, CONTENT.w, { size: 12, font: FONTS.heading })
    const metaH = ctx.measureText(`${m.course}   ·   ${m.pattern}   ·   ${m.subjectText}   ·   Generated ${m.generatedDate}`, CONTENT.w, { size: TYPE.bodySmall, font: FONTS.body })
    return 4 + kickerH + 7 + titleH + 8 + examH + 5 + metaH + 8
  }
  return ctx.component({
    type: 'cover-identity', label: 'Executive report cover', bottomSpacing: 12,
    measure,
    draw: (frame) => {
      ctx.canvas.rect(frame.x, frame.y + 3, 3, 58, { fill: COLORS.indigo, audit: false })
      let cursor = frame.y + 2
      cursor += ctx.text('EDUX  /  ACADEMIC INTELLIGENCE', frame.x + 14, cursor, frame.w - 14, {
        size: TYPE.label, font: FONTS.bodySemi, color: COLORS.indigo, characterSpacing: 1.1,
      }) + 7
      cursor += ctx.text(titleText, frame.x + 14, cursor, frame.w - 14, {
        size: TYPE.coverTitle, font: FONTS.heading, color: COLORS.midnight,
        lineHeight: TYPE.coverTitle * 1.18, paragraphGap: 0,
      }) + 8
      cursor += ctx.text(m.examName, frame.x + 14, cursor, frame.w - 14, {
        size: 12, font: FONTS.heading, color: COLORS.ink,
      }) + 5
      ctx.text(`${m.course}   ·   ${m.pattern}   ·   ${m.subjectText}   ·   Generated ${m.generatedDate}`, frame.x + 14, cursor, frame.w - 14, {
        size: TYPE.bodySmall, font: FONTS.body, color: COLORS.muted,
      })
    },
  })
}

function CoverScoreFeature(ctx) {
  const m = ctx.model
  const correct = numeric(m.qi.correct)
  const incorrect = numeric(m.qi.incorrect)
  const skipped = numeric(m.qi.skipped)
  const total = correct + incorrect + skipped || 1
  const scoreFraction = Math.max(0, Math.min(1, numeric(m.scorePct) / 100))
  const measure = () => 224
  return ctx.component({
    type: 'cover-score-feature', label: 'Dominant score and response visualisation',
    bottomSpacing: 12, measure,
    draw: (frame) => {
      ctx.canvas.rect(frame.x, frame.y, frame.w, frame.h, { fill: COLORS.midnight, audit: false })
      ctx.canvas.rect(frame.x + 16, frame.y + 16, 2, 62, { fill: COLORS.indigo, audit: false })
      ctx.text('TOTAL MARKS OBTAINED', frame.x + 28, frame.y + 16, 220, {
        size: TYPE.label, font: FONTS.bodySemi, color: COLORS.paper, characterSpacing: 1,
      })
      ctx.text(fmt(m.hero.score), frame.x + 28, frame.y + 38, 140, {
        size: TYPE.metricLarge, font: FONTS.heading, color: COLORS.white,
        features: ['tnum'], lineHeight: TYPE.metricLarge * 1.18,
      })
      ctx.text(`/ ${fmt(m.hero.maxScore)} marks`, frame.x + 28, frame.y + 126, 220, {
        size: 10, font: FONTS.body, color: COLORS.paper,
      })
      ctx.text(m.breakdownLine, frame.x + 28, frame.y + 148, frame.w - 56, {
        size: TYPE.bodySmall, font: FONTS.body, color: COLORS.paper,
      })

      const cx = frame.x + frame.w - 112
      const cy = frame.y + 82
      const radius = 47
      ctx.canvas.arc(cx, cy, radius, -Math.PI / 2, Math.PI * 1.5, { color: mix(COLORS.white, COLORS.midnight, 0.18), width: 9 })
      if (scoreFraction > 0.001) {
        ctx.canvas.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * scoreFraction, { color: COLORS.indigo, width: 9, cap: 'round' })
      }
      ctx.text(m.scorePct, cx - 50, cy - 13, 100, {
        size: 17, font: FONTS.heading, color: COLORS.white, align: 'center', features: ['tnum'],
      })
      ctx.text('SCORE', cx - 50, cy + 14, 100, {
        size: TYPE.label, font: FONTS.bodySemi, color: COLORS.paper, align: 'center', characterSpacing: 0.8,
      })

      const barX = frame.x + 28
      const barW = frame.w - 56
      const barY = frame.y + 178
      ctx.canvas.bar(barX, barY, barW, 10, mix(COLORS.white, COLORS.midnight, 0.2), { variant: 'track' })
      let x = barX
      const segments = [
        { label: 'Correct', value: correct, color: COLORS.success },
        { label: 'Incorrect', value: incorrect, color: COLORS.error },
        { label: 'Skipped', value: skipped, color: COLORS.warning },
      ]
      segments.forEach((segment) => {
        const w = (segment.value / total) * barW
        if (w > 0.5) ctx.canvas.bar(x, barY, w, 10, segment.color, { variant: 'segment' })
        x += w
      })
      const labelY = barY + 20
      segments.forEach((segment, index) => {
        const lx = barX + index * (barW / 3)
        ctx.canvas.rect(lx, labelY + 3, 7, 7, { fill: segment.color, kind: 'shape', role: 'legend' })
        ctx.text(`${segment.label}  ${text(segment.value)}`, lx + 12, labelY, barW / 3 - 14, {
          size: TYPE.bodySmall, font: FONTS.bodySemi, color: COLORS.white,
        })
      })
    },
  })
}

function CoverCoordinates(ctx) {
  const m = ctx.model
  return ctx.component({
    type: 'cover-coordinates', label: 'Report coordinates', bottomSpacing: 0,
    measure: () => 18,
    draw: (frame) => {
      ctx.text(`${m.reportId}   ·   ${m.examId}   ·   Source fingerprint ${m.sourceHash}   ·   ${m.generatedAtISO}`, frame.x, frame.y + 2, frame.w, {
        size: TYPE.folio, font: FONTS.body, color: COLORS.muted, align: 'center',
      })
    },
  })
}

function renderCover(ctx) {
  const m = ctx.model
  CoverIdentity(ctx)
  MetricLedger(ctx, {
    label: 'Candidate and examination identity',
    items: [
      { label: 'Student', value: m.studentName },
      { label: 'Roll number', value: m.rollNo },
      { label: 'Examination date', value: m.examDate },
      { label: 'Total marks', value: m.totalMarks },
    ],
    columns: 4, valueSize: 11, bottomSpacing: 12,
  })
  CoverScoreFeature(ctx)
  MetricLedger(ctx, {
    label: 'Executive signals',
    items: [
      { label: 'Score', value: m.scorePct, color: COLORS.indigo },
      { label: 'Accuracy', value: pct(m.questionAccuracy), color: COLORS.success },
      { label: 'Response distribution', value: m.breakdownLine, color: COLORS.midnight },
    ],
    columns: 3, valueSize: 11, bottomSpacing: 10,
  })
  Paragraph(ctx, {
    title: 'PUBLISHED PERFORMANCE BRIEF', text: m.aiSummary,
    size: 9.6, accent: COLORS.indigo, bottomSpacing: 10,
  })
  CoverCoordinates(ctx)
}

function renderPerformanceIntelligence(ctx) {
  const m = ctx.model
  SectionHeading(ctx, {
    number: '01', kicker: 'PERFORMANCE INTELLIGENCE', title: 'Performance intelligence',
    note: '',
  })
  const responseSegments = [
    { label: 'Correct', value: numeric(m.qi.correct), color: COLORS.success },
    { label: 'Incorrect', value: numeric(m.qi.incorrect), color: COLORS.error },
    { label: 'Skipped', value: numeric(m.qi.skipped), color: COLORS.warning },
  ]
  const difficultyBars = m.difficulty.map((row) => ({
    label: text(row.level), value: numeric(row.questions), valueLabel: `${text(row.questions)} Q  ·  ${pct(row.accuracy)}`,
    color: difficultyColor(row.level),
  }))
  const mistakeBars = m.mistakes.map((row, index) => ({
    label: text(row.category), value: numeric(row.count), valueLabel: text(row.count),
    color: [COLORS.error, COLORS.warning, COLORS.indigo, COLORS.midnight, COLORS.success, COLORS.muted, COLORS.error][index % 7],
  }))
  const subjectBars = m.subjectValues.map((row, index) => ({
    label: text(row.name), value: numeric(row.accuracy), valueLabel: pct(row.accuracy),
    color: subjectColor(row.name, index),
  }))
  EditorialColumns(ctx, {
    id: 'performance-charts', gap: 20, bottomSpacing: 8,
    columns: [
      stackSpecs(ctx, [
        (w) => StackedBarSpec(ctx, {
          label: 'Response composition', title: 'Response composition',
          subtitle: `${m.totalQuestions} questions in the paper`,
          segments: responseSegments.map((segment) => ({ ...segment, value: text(segment.value) })),
          legend: true,
        }),
        (w) => BarChartSpec(ctx, {
          label: 'Difficulty analysis', title: 'Difficulty analysis',
          subtitle: 'Questions and published accuracy', bars: difficultyBars,
          accent: COLORS.indigo, minRowHeight: 16, rowGap: 1,
          legend: 'Accuracy values are reproduced from the payload.',
        }),
      ], 8),
      stackSpecs(ctx, [
        (w) => BarChartSpec(ctx, {
          label: 'Mistake distribution', title: 'Mistake distribution',
          subtitle: 'Count by published classification', bars: mistakeBars,
          accent: COLORS.error, minRowHeight: 16, rowGap: 1,
          legend: 'Seven source classifications; rows are measured independently.',
        }),
        (w) => BarChartSpec(ctx, {
          label: 'Subject-wise performance', title: 'Subject-wise performance',
          subtitle: 'Accuracy by subject', bars: subjectBars,
          accent: COLORS.indigo, minRowHeight: 16, rowGap: 1,
          legend: m.subjectValues.map((row) => `${text(row.name)} ${text(row.score)} / ${text(row.maxMarks)}`).join('   '),
        }),
      ], 8),
    ],
  })
  Subheading(ctx, { title: 'Important performance signals', note: '', accent: COLORS.indigo })
  MetricLedger(ctx, {
    label: 'Performance signals', items: signals(m), columns: 8, valueSize: 9.2, bottomSpacing: 4,
  })
}


function renderSubjectAndChapter(ctx) {
  const m = ctx.model
  SectionHeading(ctx, {
    number: '02', kicker: 'MASTERY MAP', title: 'Subject and chapter mastery',
    note: '',
  })
  const subjectRows = m.subjectValues.map((subject) => {
    const name = text(subject.name)
    const chapters = m.chapters.filter((chapter) => String(chapter.subject) === name)
    const strong = chapters.filter((row) => String(row.mastery).toLowerCase() === 'strong').map((row) => text(row.chapter || row.name)).join(' · ') || '—'
    const weak = chapters.filter((row) => ['weak', 'critical'].includes(String(row.mastery).toLowerCase())).map((row) => text(row.chapter || row.name)).join(' · ') || '—'
    const critical = chapters.filter((row) => String(row.mastery).toLowerCase() === 'critical').map((row) => text(row.chapter || row.name)).join(' · ') || '—'
    return {
      subject: name, score: `${text(subject.score)} / ${text(subject.maxMarks)}`,
      accuracy: pct(subject.accuracy), rank: text(subject.rank), level: text(subject.difficulty),
      strongAreas: list(subject.strongAreas), weakAreas: list(subject.weakAreas),
      strong, weak, critical,
    }
  })
  MeasuredTable(ctx, {
    id: 'subject-summary', title: 'Subject marks, accuracy and classification',
    rows: subjectRows,
    columns: [
      { key: 'subject', label: 'Subject', width: 1.2, font: FONTS.bodySemi },
      { key: 'score', label: 'Marks', width: 0.9, align: 'right', features: ['tnum'] },
      { key: 'accuracy', label: 'Accuracy', width: 0.8, align: 'right', color: (v) => masteryColor(v) },
      { key: 'rank', label: 'Rank', width: 0.5, align: 'right' },
      { key: 'level', label: 'Level', width: 0.7, color: (v) => difficultyColor(v) },
      { key: 'strongAreas', label: 'Strong areas', width: 1.6 },
      { key: 'weakAreas', label: 'Weak areas', width: 1.6 },
    ],
    rowPadding: 0.5, bottomSpacing: 4,
  })
  MeasuredTable(ctx, {
    id: 'subject-chapter-classification', title: 'Strong, weak and critical chapters by subject',
    rows: subjectRows,
    columns: [
      { key: 'subject', label: 'Subject', width: 1.0, font: FONTS.bodySemi },
      { key: 'strong', label: 'Strong chapters', width: 2.0, color: () => COLORS.success },
      { key: 'weak', label: 'Weak chapters', width: 2.0, color: () => COLORS.warning },
      { key: 'critical', label: 'Critical chapters', width: 2.0, color: () => COLORS.error },
    ],
    rowPadding: 0.5, bottomSpacing: 4,
  })
  const chapterRows = m.chapters.map((chapter) => ({
    chapter: text(chapter.chapter || chapter.name), subject: text(chapter.subject),
    accuracy: pct(chapter.accuracy), marks: text(chapter.marks), time: text(chapter.time),
    mastery: text(chapter.mastery),
  }))
  MeasuredTable(ctx, {
    id: 'chapter-mastery-complete', title: 'Chapter mastery  ·  grouped by subject',
    rows: chapterRows, groupKey: 'subject',
    columns: [
      { key: 'chapter', label: 'Chapter', width: 2.3, font: FONTS.bodySemi },
      { key: 'subject', label: 'Subject', width: 1.0 },
      { key: 'accuracy', label: 'Accuracy', width: 1.0, render: 'bar', color: (v) => masteryColor(v) },
      { key: 'marks', label: 'Marks', width: 0.7, align: 'right', features: ['tnum'] },
      { key: 'time', label: 'Time', width: 0.8, align: 'right' },
      { key: 'mastery', label: 'Mastery', width: 1.0, render: 'pill', color: (v) => masteryColor(v), soft: (v) => masterySoft(v) },
    ],
    rowPadding: 1, bottomSpacing: 4,
  })
}


function renderTimeIntelligence(ctx) {
  const m = ctx.model
  const ti = m.timeIntelligence || {}
  SectionHeading(ctx, {
    number: '03', kicker: 'PACE INTELLIGENCE', title: 'Time intelligence',
    note: '',
  })
  const timeRows = m.chapters.map((chapter) => ({
    chapter: text(chapter.chapter || chapter.name),
    subject: text(chapter.subject),
    bar: pct(chapter.sharePct),
    time: text(chapter.time),
    share: text(chapter.share),
  }))
  MeasuredTable(ctx, {
    id: 'chapter-time-ledger', title: 'Chapter time consumption  ·  measured rows',
    rows: timeRows, groupKey: 'subject', rowPadding: 0.5, bottomSpacing: 4,
    columns: [
      { key: 'chapter', label: 'Chapter', width: 2.4, font: FONTS.bodySemi },
      { key: 'subject', label: 'Subject', width: 1.1 },
      { key: 'bar', label: 'Share of total time', width: 1.5, render: 'bar', color: (v) => subjectColor(v) },
      { key: 'time', label: 'Time consumed', width: 1.0, align: 'right' },
      { key: 'share', label: 'Share', width: 0.7, align: 'right', features: ['tnum'] },
    ],
  })
  Subheading(ctx, { title: 'Time-management metrics', accent: COLORS.indigo })
  EditorialColumns(ctx, {
    id: 'time-metrics-columns', gap: 18, bottomSpacing: 4,
    columns: [
      (w) => MetricLedgerSpec(ctx, {
        label: 'Time-management metrics',
        items: [
          { label: 'Average / question', value: text(ti.avgTimePerQuestion) },
          { label: 'Navigation count', value: text(ti.navigationCount) },
          { label: 'Management score', value: text(ti.timeManagementScore) },
          { label: 'Fastest question', value: text(ti.fastestQuestion?.q) },
          { label: 'Fastest time', value: text(ti.fastestQuestion?.time) },
          { label: 'Slowest question', value: text(ti.slowestQuestion?.q) },
          { label: 'Slowest time', value: text(ti.slowestQuestion?.time) },
        ],
        columns: 4, valueSize: 9.2,
      }),
      (w) => StaticTableSpec(ctx, {
        label: 'Sectional time allocation', title: 'Sectional allocation and efficiency',
        rows: (ti.distribution || []).map((row) => ({
          section: text(row.section), allocated: text(row.allocated), used: text(row.used), efficiency: text(row.efficiency),
        })),
        columns: [
          { key: 'section', label: 'Section', width: 1.4, font: FONTS.bodySemi },
          { key: 'allocated', label: 'Alloc.', width: 0.8, align: 'right' },
          { key: 'used', label: 'Used', width: 0.8, align: 'right' },
          { key: 'efficiency', label: 'Eff.', width: 0.7, align: 'right', color: (v) => masteryColor(v) },
        ],
        rowPadding: 1.5,
      }),
    ],
  })
}


function renderComparisonAndProjection(ctx) {
  const m = ctx.model
  const comp = m.comparison || {}
  const pred = m.prediction || {}
  SectionHeading(ctx, {
    number: '04', kicker: 'COMPARISON & TRAJECTORY', title: 'Comparison and projection',
    note: '',
  })
  const benchmarkKeys = ['previousTest', 'previousMonth', 'batchAverage', 'instituteAverage', 'topPerformer']
  const comparisonRows = benchmarkKeys.filter((key) => comp[key]).map((key) => ({
    label: text(comp[key].label), score: text(comp[key].score),
    percentile: text(comp[key].percentile), grade: text(comp[key].grade), reference: text(comp[key].name),
  }))
  Subheading(ctx, { title: 'Comparative performance', note: '', accent: COLORS.indigo })
  EditorialColumns(ctx, {
    id: 'comparison-columns', gap: 18, bottomSpacing: 6,
    columns: [
      (w) => BarChartSpec(ctx, {
        label: 'Benchmark score comparison', title: 'Benchmark scores',
        bars: comparisonRows.map((row, index) => ({
          label: row.label, value: numeric(row.score), valueLabel: row.score,
          color: [COLORS.indigo, COLORS.midnight, COLORS.muted, COLORS.success, COLORS.warning][index % 5],
        })),
        accent: COLORS.indigo, minRowHeight: 16, rowGap: 1,
        legend: `Current score ${text(m.hero.score)} / ${text(m.hero.maxScore)}`,
      }),
      (w) => StaticTableSpec(ctx, {
        label: 'Published comparison fields', title: 'Comparison register', rows: comparisonRows,
        columns: [
          { key: 'label', label: 'Benchmark', width: 1.8, font: FONTS.bodySemi },
          { key: 'score', label: 'Score', width: 0.8, align: 'right', features: ['tnum'] },
          { key: 'percentile', label: 'Pct.', width: 0.8, align: 'right' },
          { key: 'grade', label: 'Grade', width: 0.7, align: 'center' },
          { key: 'reference', label: 'Reference', width: 1.2 },
        ],
        rowPadding: 1.5,
      }),
    ],
  })
  MetricLedger(ctx, {
    label: 'Published score changes',
    items: (comp.deltas || []).map((row) => ({
      label: text(row.label), value: text(row.value), color: row.up === true ? COLORS.success : COLORS.muted,
    })),
    columns: 4, valueSize: 10, bottomSpacing: 8,
  })
  Subheading(ctx, { title: 'Projection and readiness', note: '', accent: COLORS.success })
  const trajectoryRows = (pred.trajectory || []).map((row) => ({ exam: text(row.exam), score: text(row.score) }))
  EditorialColumns(ctx, {
    id: 'projection-columns', gap: 18, bottomSpacing: 6,
    columns: [
      (w) => BarChartSpec(ctx, {
        label: 'Score trajectory', title: 'Score trajectory',
        bars: trajectoryRows.map((row, index) => ({
          label: row.exam, value: numeric(row.score), valueLabel: row.score,
          color: index === trajectoryRows.length - 1 ? COLORS.success : COLORS.indigo,
        })),
        accent: COLORS.success, minRowHeight: 14, rowGap: 1,
        legend: `Expected improvement ${text(pred.expectedImprovement)}   ·   Risk ${text(pred.riskLevel)}`,
      }),
      stackSpecs(ctx, [
        (w) => MetricLedgerSpec(ctx, {
          label: 'Prediction signals',
          items: [
            { label: 'JEE percentile', value: text(pred.jeePercentile) },
            { label: 'NEET score', value: text(pred.neetScore) },
            { label: 'Expected AIR', value: text(pred.expectedAIR) },
            { label: 'Target probability', value: text(pred.targetProbability) },
            { label: 'Risk level', value: text(pred.riskLevel) },
            { label: 'Expected improvement', value: text(pred.expectedImprovement) },
          ],
          columns: 3, valueSize: 9.2,
        }),
        (w) => StaticTableSpec(ctx, {
          label: 'Trajectory register', title: 'Trajectory values', rows: trajectoryRows,
          columns: [
            { key: 'exam', label: 'Examination / projection', width: 2.2, font: FONTS.bodySemi },
            { key: 'score', label: 'Score', width: 0.8, align: 'right', features: ['tnum'] },
          ],
          rowPadding: 0.5,
        }),
      ], 6),
    ],
  })
  MetricLedger(ctx, {
    label: 'Readiness metrics',
    items: [
      { label: 'Readiness score', value: text(m.hero.readinessScore), color: COLORS.success },
      { label: 'Confidence index', value: text(m.hero.confidenceIndex), color: COLORS.indigo },
      { label: 'Health score', value: text(m.hero.healthScore) },
      { label: 'Overall accuracy', value: pct(m.overallAccuracy) },
      { label: 'Success rate', value: pct(m.successRate) },
      { label: 'Badge', value: text(m.hero.badge) },
    ],
    columns: 6, valueSize: 9.2, bottomSpacing: 4,
  })
}


function renderQuestionIntelligence(ctx) {
  const m = ctx.model
  SectionHeading(ctx, {
    number: '05', kicker: 'QUESTION INTELLIGENCE', title: 'Question-by-question analysis',
    note: `${m.questionRowsSupplied} question-review rows supplied. Missing optional values are shown as —; full source explanations are never shortened.`,
  })
  Paragraph(ctx, {
    title: 'REVIEW LEGEND',
    text: 'Correct  ·  Incorrect  ·  Skipped     Each question presents its identity, classifications, answer comparison, marks, time, mistake category and complete solution.',
    size: TYPE.bodySmall, accent: COLORS.indigo, bottomSpacing: 10,
  })
  m.questions.forEach((question) => QuestionCard(ctx, { question }))
}

function actionRows(rec) {
  return [
    ...(rec.suggestedPYQs || []).map((row) => ({ kind: 'PYQ', title: text(row.title), detail: text(row.source) })),
    ...(rec.practiceQuestions || []).map((row) => ({ kind: 'Practice', title: text(row.title), detail: `${text(row.count)} · ${text(row.difficulty)}` })),
    ...(rec.mockTests || []).map((row) => ({ kind: 'Mock test', title: text(row.title), detail: text(row.mode) })),
    ...(rec.lectures || []).map((row) => ({ kind: 'Lecture', title: text(row.title), detail: text(row.type) })),
  ]
}

function renderLearningIntelligence(ctx) {
  const m = ctx.model
  const rec = m.recommendations || {}
  SectionHeading(ctx, {
    number: '06', kicker: 'LEARNING INTELLIGENCE', title: 'Learning intelligence',
    note: '',
  })
  Subheading(ctx, { title: 'Published revision priorities', note: '', accent: COLORS.error })
  MeasuredTable(ctx, {
    id: 'published-revision-priorities', title: 'Priority revision register',
    rows: (rec.priorityRevision || []).map((row) => ({
      topic: text(row.topic), priority: text(row.priority), timeframe: text(row.timeframe),
    })),
    columns: [
      { key: 'topic', label: 'Priority topic', width: 3.0, font: FONTS.bodySemi },
      { key: 'priority', label: 'Classification', width: 1.1, render: 'pill', color: (v) => priorityColor(v), soft: (v) => prioritySoft(v) },
      { key: 'timeframe', label: 'Timeframe', width: 1.1 },
    ],
    rowPadding: 1, bottomSpacing: 6,
  })
  const topicRows = m.topics.map((row) => ({
    topic: text(row.topic), subject: text(row.subject), accuracy: pct(row.mastery), level: text(row.level),
  }))
  const evidenceRows = m.mistakeList.map((row) => ({ q: text(row.q), detail: text(row.detail) }))
  const weakChapters = (rec.weakChapters || []).map((value, index) => ({ index: String(index + 1), value: text(value) }))
  const weakTopics = (rec.weakTopics || []).map((value, index) => ({ index: String(index + 1), value: text(value) }))
  EditorialColumns(ctx, {
    id: 'learning-evidence-columns', gap: 16, bottomSpacing: 8,
    columns: [
      (w) => StaticTableSpec(ctx, {
        label: 'Topic-level accuracy', title: 'Topic-level accuracy', rows: topicRows,
        columns: [
          { key: 'topic', label: 'Topic', width: 2.2, font: FONTS.bodySemi },
          { key: 'subject', label: 'Subject', width: 1.0 },
          { key: 'accuracy', label: 'Acc.', width: 0.7, align: 'right', color: (v) => masteryColor(v) },
          { key: 'level', label: 'Level', width: 0.8, color: (v) => masteryColor(v) },
        ],
        rowPadding: 1.5,
      }),
      stackSpecs(ctx, [
        (w) => StaticTableSpec(ctx, {
          label: 'Mistake evidence', title: 'Mistake evidence', rows: evidenceRows,
          columns: [
            { key: 'q', label: 'Q', width: 0.45, font: FONTS.bodyBold },
            { key: 'detail', label: 'Source detail', width: 3.0 },
          ],
          rowPadding: 1.5,
        }),
        (w) => StaticTableSpec(ctx, {
          label: 'Weak chapters', title: 'Weak chapters', rows: weakChapters,
          columns: [
            { key: 'index', label: 'No.', width: 0.4, align: 'center' },
            { key: 'value', label: 'Weak chapter', width: 2.6, font: FONTS.bodySemi },
          ],
          rowPadding: 1.5,
        }),
      ], 6),
    ],
  })
  Subheading(ctx, { title: 'Subject-wise revision sections', note: '', accent: COLORS.indigo })
  const revisionRows = m.revisionGroups.flatMap((group) => group.topics.map((topic) => ({
    subject: text(group.subject), topic: text(topic.name), chapter: text(topic.chapter),
    accuracy: text(topic.accuracyLabel), priority: text(topic.priority),
  })))
  MeasuredTable(ctx, {
    id: 'subject-wise-revision-sections', title: 'Priority topics grouped by subject',
    rows: revisionRows, groupKey: 'subject', rowPadding: 1, bottomSpacing: 6,
    columns: [
      { key: 'subject', label: 'Subject', width: 1.1, font: FONTS.bodySemi },
      { key: 'topic', label: 'Priority topic', width: 2.4 },
      { key: 'chapter', label: 'Chapter', width: 1.8 },
      { key: 'accuracy', label: 'Accuracy', width: 0.9, align: 'right', color: (v) => masteryColor(v) },
      { key: 'priority', label: 'Classification', width: 1.1, render: 'pill', color: (v) => priorityColor(v), soft: (v) => prioritySoft(v) },
    ],
  })
  Subheading(ctx, { title: 'Recommended next actions', note: '', accent: COLORS.success })
  MeasuredTable(ctx, {
    id: 'recommended-next-actions', title: 'Published action register', rows: actionRows(rec),
    columns: [
      { key: 'kind', label: 'Action', width: 1.0, render: 'pill', color: () => COLORS.indigo, soft: () => mix(COLORS.indigo, COLORS.white, 0.08) },
      { key: 'title', label: 'Resource', width: 3.2, font: FONTS.bodySemi },
      { key: 'detail', label: 'Detail', width: 1.5 },
    ],
    rowPadding: 1, bottomSpacing: 6,
  })
  EditorialColumns(ctx, {
    id: 'weak-topics-list', gap: 18, bottomSpacing: 4,
    columns: [
      (w) => StaticTableSpec(ctx, {
        label: 'Weak topics', title: 'Weak topics  /  published list', rows: weakTopics,
        columns: [
          { key: 'index', label: 'No.', width: 0.4, align: 'center' },
          { key: 'value', label: 'Weak topic', width: 2.6, font: FONTS.bodySemi },
        ],
        rowPadding: 1.5,
      }),
      (w) => ParagraphSpec(ctx, {
        label: 'Published performance brief', title: 'PUBLISHED PERFORMANCE BRIEF', text: m.aiSummary, size: 9.2,
      }),
    ],
  })
}


export function renderFullAnalysis(ctx) {
  renderCover(ctx)
  ctx.sectionBreak(0.62)
  renderPerformanceIntelligence(ctx)
  ctx.sectionBreak(0.62)
  renderSubjectAndChapter(ctx)
  ctx.sectionBreak(0.62)
  renderTimeIntelligence(ctx)
  ctx.sectionBreak(0.62)
  renderComparisonAndProjection(ctx)
  ctx.sectionBreak(0.62)
  renderQuestionIntelligence(ctx)
  ctx.sectionBreak(0.62)
  renderLearningIntelligence(ctx)
}
