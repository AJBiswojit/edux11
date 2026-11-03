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
  SectionHeading, Subheading, Paragraph, MetricLedger,
  BarChart, StackedBar, MeasuredTable, SubjectBand, QuestionCard, measureQuestionCard,
} from './components.js'
import { renderFullAnalysisCover } from './cover.js'

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
  StackedBar(ctx, {
    title: 'Response composition',
    subtitle: `${m.totalQuestions} questions in the paper`,
    segments: responseSegments.map((segment) => ({ ...segment, value: text(segment.value) })),
    legend: true, bottomSpacing: 10,
  })
  BarChart(ctx, {
    title: 'Difficulty analysis',
    subtitle: 'Questions and published accuracy', bars: difficultyBars,
    accent: COLORS.indigo, minRowHeight: 16, rowGap: 2,
    legend: 'Accuracy values are reproduced from the payload.', bottomSpacing: 10,
  })
  BarChart(ctx, {
    title: 'Mistake distribution',
    subtitle: 'Count by published classification', bars: mistakeBars,
    accent: COLORS.error, minRowHeight: 16, rowGap: 2,
    legend: 'Source classifications; rows are measured independently.', bottomSpacing: 10,
  })
  BarChart(ctx, {
    title: 'Subject-wise performance',
    subtitle: 'Accuracy by subject', bars: subjectBars,
    accent: COLORS.indigo, minRowHeight: 16, rowGap: 2,
    legend: m.subjectValues.map((row) => `${text(row.name)} ${text(row.score)} / ${text(row.maxMarks)}`).join('   '),
    bottomSpacing: 8,
  })
  Subheading(ctx, { title: 'Important performance signals', note: '', accent: COLORS.indigo })
  MetricLedger(ctx, {
    label: 'Performance signals', items: signals(m), columns: 3, valueSize: 10.4, bottomSpacing: 4,
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
  MetricLedger(ctx, {
    label: 'Time-management metrics',
    items: [
      { label: 'Average per question', value: text(ti.avgTimePerQuestion) },
      { label: 'Navigation count', value: text(ti.navigationCount) },
      { label: 'Management score', value: text(ti.timeManagementScore) },
      { label: 'Fastest question', value: text(ti.fastestQuestion?.q) },
      { label: 'Fastest time', value: text(ti.fastestQuestion?.time) },
      { label: 'Slowest question', value: text(ti.slowestQuestion?.q) },
      { label: 'Slowest time', value: text(ti.slowestQuestion?.time) },
    ],
    columns: 3, valueSize: 10.4, bottomSpacing: 10,
  })
  MeasuredTable(ctx, {
    id: 'sectional-time-allocation', title: 'Sectional allocation and efficiency',
    rows: (ti.distribution || []).map((row) => ({
      section: text(row.section), allocated: text(row.allocated), used: text(row.used), efficiency: text(row.efficiency),
    })),
    columns: [
      { key: 'section', label: 'Section', width: 1.4, font: FONTS.bodySemi },
      { key: 'allocated', label: 'Allocated', width: 0.8, align: 'right' },
      { key: 'used', label: 'Used', width: 0.8, align: 'right' },
      { key: 'efficiency', label: 'Efficiency', width: 0.8, align: 'right', color: (v) => masteryColor(v) },
    ],
    rowPadding: 2, bottomSpacing: 6,
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
  // The benchmark chart that used to sit here repeated the same five scores as
  // the register below it. The register carries score, percentile, grade and
  // reference, so it is the single source for this comparison.
  MeasuredTable(ctx, {
    id: 'comparison-register', title: 'Comparison register', rows: comparisonRows,
    columns: [
      { key: 'label', label: 'Benchmark', width: 1.8, font: FONTS.bodySemi },
      { key: 'score', label: 'Score', width: 0.8, align: 'right', features: ['tnum'] },
      { key: 'percentile', label: 'Percentile', width: 0.9, align: 'right' },
      { key: 'grade', label: 'Grade', width: 0.7, align: 'center' },
      { key: 'reference', label: 'Reference', width: 1.2 },
    ],
    rowPadding: 2, bottomSpacing: 6,
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
  BarChart(ctx, {
    title: 'Score trajectory',
    bars: trajectoryRows.map((row, index) => ({
      label: row.exam, value: numeric(row.score), valueLabel: row.score,
      color: index === trajectoryRows.length - 1 ? COLORS.success : COLORS.indigo,
    })),
    accent: COLORS.success, minRowHeight: 14, rowGap: 2,
    legend: `Expected improvement ${text(pred.expectedImprovement)}   ·   Risk ${text(pred.riskLevel)}`,
    bottomSpacing: 10,
  })
  MetricLedger(ctx, {
    label: 'Prediction signals',
    items: [
      { label: 'JEE percentile', value: text(pred.jeePercentile) },
      { label: 'NEET score', value: text(pred.neetScore) },
      { label: 'Expected AIR', value: text(pred.expectedAIR) },
      { label: 'Target probability', value: text(pred.targetProbability) },
      { label: 'Risk level', value: text(pred.riskLevel) },
      { label: 'Expected improvement', value: text(pred.expectedImprovement) },
    ],
    columns: 3, valueSize: 10.4, bottomSpacing: 8,
  })
  MeasuredTable(ctx, {
    id: 'trajectory-register', title: 'Trajectory values', rows: trajectoryRows,
    columns: [
      { key: 'exam', label: 'Examination / projection', width: 2.2, font: FONTS.bodySemi },
      { key: 'score', label: 'Score', width: 0.8, align: 'right', features: ['tnum'] },
    ],
    rowPadding: 2, bottomSpacing: 6,
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
    columns: 3, valueSize: 10.4, bottomSpacing: 6,
  })
}


function renderQuestionIntelligence(ctx) {
  const m = ctx.model
  SectionHeading(ctx, {
    number: '05', kicker: 'QUESTION INTELLIGENCE', title: 'Question-by-question analysis',
    note: `${m.questionRowsSupplied} questions reviewed · published explanations reproduced in full`,
  })
  const subjectCounts = new Map()
  m.questions.forEach((question) => {
    const key = fmt(question.subject)
    subjectCounts.set(key, (subjectCounts.get(key) || 0) + 1)
  })
  let lastSubject = null
  let subjectIndex = 0
  m.questions.forEach((question) => {
    const subject = fmt(question.subject)
    if (subject !== lastSubject) {
      SubjectBand(ctx, {
        subject,
        index: subjectIndex,
        note: `${subjectCounts.get(subject) || 1} questions`,
        bottomSpacing: 8,
        // Reserve enough for the opening of the card, capped so a single
        // figure-heavy question cannot push the band onto an empty page.
        keepWithNext: Math.min(330, Math.max(170, measureQuestionCard(ctx, question))),
      })
      subjectIndex += 1
      lastSubject = subject
    }
    QuestionCard(ctx, { question })
  })
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
  MeasuredTable(ctx, {
    id: 'topic-level-accuracy', title: 'Topic-level accuracy', rows: topicRows,
    columns: [
      { key: 'topic', label: 'Topic', width: 2.4, font: FONTS.bodySemi },
      { key: 'subject', label: 'Subject', width: 1.0 },
      { key: 'accuracy', label: 'Accuracy', width: 0.8, align: 'right', color: (v) => masteryColor(v) },
      { key: 'level', label: 'Level', width: 0.9, color: (v) => masteryColor(v) },
    ],
    rowPadding: 2, bottomSpacing: 8,
  })
  MeasuredTable(ctx, {
    id: 'mistake-evidence', title: 'Mistake evidence', rows: evidenceRows,
    columns: [
      { key: 'q', label: 'Question', width: 0.55, font: FONTS.bodyBold },
      { key: 'detail', label: 'Source detail', width: 3.4 },
    ],
    rowPadding: 2, bottomSpacing: 8,
  })
  MeasuredTable(ctx, {
    id: 'weak-chapters', title: 'Weak chapters', rows: weakChapters,
    columns: [
      { key: 'index', label: 'No.', width: 0.4, align: 'center' },
      { key: 'value', label: 'Weak chapter', width: 3.2, font: FONTS.bodySemi },
    ],
    rowPadding: 2, bottomSpacing: 6,
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
  MeasuredTable(ctx, {
    id: 'weak-topics', title: 'Weak topics · published list', rows: weakTopics,
    columns: [
      { key: 'index', label: 'No.', width: 0.4, align: 'center' },
      { key: 'value', label: 'Weak topic', width: 3.2, font: FONTS.bodySemi },
    ],
    rowPadding: 2, bottomSpacing: 6,
  })
}


export function renderFullAnalysis(ctx) {
  renderFullAnalysisCover(ctx)
  // The cover is a fixed editorial page. Start the first interior spread on a
  // fresh page so the existing content-driven pagination is unchanged.
  ctx.startPage({ cover: false })
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
