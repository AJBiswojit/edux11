/**
 * MediXO EduX — Premium Full Exam Analysis cover.
 *
 * Art-directed open-door composition rendered natively through the existing
 * ReportContext / PDFKit pipeline. Only the doorway / walking-student artwork
 * is a reusable local raster asset; every report value, the score ring, rules,
 * icons and feature labels are selectable / vector PDF content.
 *
 * This module is deliberately cover-only. It does not change the interior
 * editorial components, question rendering or content-driven pagination.
 */

import { A4, COLORS, FONTS, fmt, mix } from './theme.js'

const COVER = Object.freeze({
  navy: '#071A3D',
  primary: '#123F91',
  // Sampled from the existing MediXO EduX logo's dominant blue.
  brand: '#1050D8',
  light: '#EAF1FF',
  ink: '#111827',
  secondary: '#64748B',
  panel: '#F6F9FF',
  panelBorder: '#DFE8F8',
  rule: '#E6EBF3',
  track: '#DDE3ED',
  success: '#168568',
  error: '#C64D5B',
  left: 32,
  columnW: 306,
})

const FEATURES = Object.freeze([
  { icon: 'chart', lines: ['Subject', 'Analysis'] },
  { icon: 'target', lines: ['Chapter', 'Mastery'] },
  { icon: 'file', lines: ['Question-wise', 'Review'] },
  { icon: 'zap', lines: ['Error &', 'Learning Insights'] },
  { icon: 'clipboard', lines: ['Revision Plan', '& Next Steps'] },
])

function finite(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(String(value).replace('%', '').replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

function displayNumber(value) {
  const n = finite(value)
  if (n === null) return null
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
}

function formatDate(value) {
  const raw = fmt(value)
  if (raw === '—') return raw
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Cover fields are derived from the analysis payload, never from sample art. */
export function coverData(model) {
  const meta = model.meta || {}
  const hero = model.hero || {}
  const qi = model.qi || {}
  const score = finite(hero.score)
  const total = finite(hero.maxScore ?? hero.totalScore ?? meta.totalMarks)
  let percentage = null
  if (score !== null && total !== null && total > 0) {
    percentage = Math.round((score / total) * 1000) / 10
  } else {
    percentage = finite(hero.percentage)
  }
  const counts = [
    { key: 'correct', label: 'Correct', value: displayNumber(qi.correct ?? hero.correct), color: COVER.success },
    { key: 'incorrect', label: 'Incorrect', value: displayNumber(qi.incorrect ?? hero.incorrect), color: COVER.error },
    { key: 'skipped', label: 'Skipped', value: displayNumber(qi.skipped ?? hero.unattempted), color: COVER.primary },
  ].filter((item) => item.value !== null)

  const active = model.activeSubject
  const subjectNames = (model.subjectValues || [])
    .map((row) => row.name)
    .filter(Boolean)
  const fallbackSubjects = Array.isArray(meta.sections) ? meta.sections.filter(Boolean) : []
  const names = subjectNames.length ? subjectNames : fallbackSubjects
  const scope = active
    ? `${active}  |  Single-subject analysis`
    : names.length
      ? `Combined (${names.join(', ')})  |  ${model.subjectText || 'All Subjects'}`
      : fmt(model.subjectText, 'All Subjects')

  return {
    examName: fmt(model.examName, 'Examination'),
    studentName: fmt(model.coverStudentName ?? model.studentName),
    rollNo: fmt(model.coverRollNo ?? model.rollNo),
    examDate: formatDate(model.examDate),
    totalMarks: displayNumber(meta.totalMarks ?? total) ?? '—',
    scoreLabel: score === null ? '—' : displayNumber(hero.score),
    totalLabel: total === null ? '—' : displayNumber(total),
    percentage,
    scoreText: percentage === null ? '—' : `${percentage}%`,
    counts,
    scope,
  }
}

function runsWidth(ctx, runs, size, opts = {}) {
  return runs.reduce((sum, run) => sum + ctx.textEngine.measureRun(
    run.text,
    run.font || opts.font || FONTS.body,
    run.size || size,
    { characterSpacing: opts.characterSpacing || 0, features: opts.features },
  ), 0)
}

function drawRuns(ctx, runs, x, y, size, opts = {}) {
  let cursor = x
  for (const run of runs) {
    const font = run.font || opts.font || FONTS.body
    const runSize = run.size || size
    const width = ctx.textEngine.measureRun(run.text, font, runSize, {
      characterSpacing: opts.characterSpacing || 0,
      features: opts.features,
    })
    ctx.canvas.textRun(run.text, cursor, y, {
      font,
      size: runSize,
      color: run.color || opts.color || COVER.ink,
      characterSpacing: opts.characterSpacing || 0,
      features: opts.features,
      role: opts.role || 'text',
      chrome: !!opts.chrome,
      width,
    })
    cursor += width
  }
  return cursor - x
}

function polygon(ctx, points, fill) {
  const doc = ctx.doc
  doc.save()
  doc.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i += 1) doc.lineTo(points[i][0], points[i][1])
  doc.closePath()
  doc.fill(fill)
  doc.restore()
}

// A sampled cubic keeps the pathway flowing while holding its left edge
// below the student rows; it then sweeps upward into the doorway threshold.
const PATH_BOUNDARY = Array.from({ length: 18 }, (_, index) => {
  const t = (index + 1) / 18
  const u = 1 - t
  const x = 3 * u * u * t * 160 + 3 * u * t * t * 400 + t * t * t * 445
  const y = u * u * u * 675 + 3 * u * u * t * 675 + 3 * u * t * t * 735 + t * t * t * 477
  return [x, y]
})
const PATH_POINTS = Object.freeze([
  [445, 477], [548, 472], [450, A4.height], [0, A4.height], [0, 675], ...PATH_BOUNDARY,
])

function drawPathBase(ctx) {
  const gradient = ctx.doc.linearGradient(445, 477, 0, A4.height)
    .stop(0, COVER.primary)
    .stop(0.45, '#0B2B66')
    .stop(1, COVER.navy)
  polygon(ctx, PATH_POINTS, gradient)
  ctx.recordBox('shape', 0, 472, A4.width, A4.height - 472, { role: 'cover-pathway' })
}

function drawPathDepth(ctx) {
  const gradient = ctx.doc.linearGradient(0, 560, 0, 760)
    .stop(0, COVER.navy, 0)
    .stop(0.35, COVER.navy, 0.95)
    .stop(1, COVER.navy, 1)
  polygon(ctx, PATH_POINTS, gradient)
}

function drawDoorway(ctx) {
  const bytes = ctx.assets?.coverDoorway
  if (!bytes) throw new Error('Premium PDF cover doorway asset missing: premium-cover-doorway.png')
  ctx.canvas.image(bytes, 372, 220, 195, 330, {
    role: 'cover-illustration',
    meta: { asset: 'premium-cover-doorway.png' },
  })
}

function drawBranding(ctx) {
  const logoW = 46
  if (ctx.assets?.logo) ctx.canvas.image(ctx.assets.logo, 27, 24, logoW, logoW, { role: 'cover-logo' })
  drawRuns(ctx, [
    { text: 'MediXO ', color: COVER.navy },
    { text: 'EduX', color: COVER.brand },
  ], 80, 30, 18, { font: FONTS.bodyBold, chrome: true, role: 'cover-brand' })
  ctx.text('AI Academic Intelligence', 80, 54, 220, {
    size: 10.5, font: FONTS.body, color: COVER.ink, chrome: true, role: 'cover-tagline',
  })

  const rightX = 452
  const rightW = 113
  ;['EXAMINATION', 'INTELLIGENCE', 'REPORT'].forEach((line, index) => {
    ctx.text(line, rightX, 30 + index * 13, rightW, {
      size: 8.5, font: FONTS.bodySemi, color: COVER.navy, align: 'right',
      characterSpacing: 1.6, chrome: true, role: 'cover-editorial-label',
    })
  })
  ctx.canvas.line(32, 82, 56, 82, { color: COVER.primary, width: 1.6, role: 'cover-accent' })
  ctx.canvas.line(543, 80, 565, 80, { color: COVER.primary, width: 1.6, role: 'cover-accent' })
}

function drawHeadline(ctx) {
  const lines = [
    { text: 'FULL EXAM', y: 112, color: COVER.navy },
    { text: 'ANALYSIS', y: 167, color: COVER.navy },
    { text: 'REPORT', y: 222, color: COVER.brand },
  ]
  for (const line of lines) {
    ctx.text(line.text, 30, line.y, 360, {
      size: 44, font: FONTS.bodyBold, color: line.color, role: 'cover-title',
    })
  }
  ctx.text('DETAILED PERFORMANCE • QUESTION ANALYSIS • LEARNING INSIGHTS', 32, 286, 380, {
    size: 7.6, font: FONTS.bodySemi, color: COVER.ink, characterSpacing: 0.55,
    role: 'cover-supporting-headline',
  })
  ctx.canvas.line(32, 307, 56, 307, { color: COVER.brand, width: 1.6, role: 'cover-accent' })
}

function fitExamTitle(ctx, title) {
  const width = COVER.columnW - 20
  for (let size = 14; size >= 9; size -= 0.5) {
    const height = ctx.measureText(title, width, { size, font: FONTS.bodyBold })
    const lines = Math.round(height / ctx.textEngine.lineHeight({ size, font: FONTS.bodyBold }))
    if (lines <= 2) return { size, height, width }
  }
  const size = 9
  return { size, height: ctx.measureText(title, width, { size, font: FONTS.bodyBold }), width }
}

function drawExamInformation(ctx, data) {
  const x = COVER.left
  const y = 318
  const title = fitExamTitle(ctx, data.examName)
  const labelH = title.height + 14
  ctx.canvas.rect(x, y, COVER.columnW, labelH, {
    fill: COVER.light, radius: 8, role: 'cover-exam-label',
  })
  ctx.text(data.examName, x + 10, y + 7, title.width, {
    size: title.size, font: FONTS.bodyBold, color: COVER.navy, role: 'cover-exam-name',
  })
  const scopeY = y + labelH + 8
  const scopeH = ctx.text(data.scope, x, scopeY, COVER.columnW + 24, {
    size: 9.3, font: FONTS.body, color: COVER.ink, role: 'cover-subject-scope',
  })
  return scopeY + scopeH + 12
}

function drawScorePanel(ctx, data, y) {
  const x = COVER.left
  const w = COVER.columnW
  const h = 110
  ctx.canvas.rect(x, y, w, h, {
    fill: COVER.panel, stroke: COVER.panelBorder, lineWidth: 0.6, radius: 12,
    role: 'cover-performance-panel',
  })

  const cx = x + 62
  const cy = y + 55
  const radius = 42
  ctx.canvas.arc(cx, cy, radius, -Math.PI / 2, Math.PI * 1.5, {
    color: COVER.track, width: 9, role: 'cover-score-track',
  })
  const fraction = data.percentage === null ? 0 : Math.max(0, Math.min(1, data.percentage / 100))
  if (fraction > 0.001) {
    ctx.canvas.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction, {
      color: COVER.brand, width: 9, cap: 'round', role: 'cover-score-arc',
      meta: { percentage: data.percentage },
    })
  }
  ctx.text(data.scoreText, cx - 45, y + 42, 90, {
    size: 19, font: FONTS.bodyBold, color: COVER.navy, align: 'center', features: ['tnum'],
    role: 'cover-score-percentage',
  })
  ctx.text('Score', cx - 45, y + 66, 90, {
    size: 9.5, font: FONTS.bodySemi, color: COVER.ink, align: 'center', role: 'cover-score-label',
  })

  ctx.canvas.line(x + 128, y + 22, x + 128, y + 88, { color: COVER.panelBorder, width: 0.7, role: 'cover-panel-divider' })
  const rightX = x + 144
  ctx.text('Marks Obtained', rightX, y + 20, w - 156, {
    size: 10.2, font: FONTS.bodySemi, color: COVER.ink, role: 'cover-marks-label',
  })
  ctx.text(`${data.scoreLabel} / ${data.totalLabel}`, rightX, y + 37, w - 156, {
    size: 24, font: FONTS.bodyBold, color: COVER.navy, features: ['tnum'], role: 'cover-marks-value',
  })
  ctx.canvas.line(rightX, y + 76, x + w - 16, y + 76, { color: COVER.panelBorder, width: 0.6, role: 'cover-panel-rule' })

  if (data.counts.length) {
    const runs = []
    data.counts.forEach((item, index) => {
      if (index) runs.push({ text: '  |  ', color: COVER.secondary, font: FONTS.body })
      runs.push({ text: item.value, color: item.color, font: FONTS.bodyBold })
      runs.push({ text: ` ${item.label}`, color: COVER.ink, font: FONTS.body })
    })
    let size = 7.8
    const maxWidth = w - 160
    while (size > 6.8 && runsWidth(ctx, runs, size) > maxWidth) size -= 0.2
    drawRuns(ctx, runs, rightX, y + 86, size, { role: 'cover-response-counts' })
  }
  return y + h
}

function drawIcon(ctx, name, x, y, size, color) {
  const doc = ctx.doc
  doc.save()
  doc.translate(x, y)
  doc.scale(size / 24)
  doc.lineWidth(1.8)
  doc.strokeColor(color)
  doc.fillColor(color)
  switch (name) {
    case 'user':
      doc.circle(12, 8, 3.5).stroke()
      doc.path('M4 20 C4 16 7.5 14 12 14 C16.5 14 20 16 20 20').stroke()
      break
    case 'id':
      doc.roundedRect(3, 5, 18, 14, 2).stroke()
      doc.circle(8, 11, 2).stroke()
      doc.moveTo(14, 10).lineTo(18, 10).stroke()
      doc.moveTo(14, 14).lineTo(18, 14).stroke()
      doc.moveTo(6, 16).lineTo(12, 16).stroke()
      break
    case 'calendar':
      doc.roundedRect(3, 5, 18, 16, 2).stroke()
      doc.moveTo(3, 10).lineTo(21, 10).stroke()
      doc.moveTo(8, 3).lineTo(8, 7).stroke()
      doc.moveTo(16, 3).lineTo(16, 7).stroke()
      doc.circle(8, 14, 0.8).fill()
      doc.circle(12, 14, 0.8).fill()
      doc.circle(16, 14, 0.8).fill()
      break
    case 'layers':
      doc.path('M12 3 L21 8 L12 13 L3 8 Z').stroke()
      doc.path('M3 12 L12 17 L21 12').stroke()
      doc.path('M3 16 L12 21 L21 16').stroke()
      break
    case 'chart':
      doc.rect(4, 12, 3, 8).fill()
      doc.rect(10, 8, 3, 12).fill()
      doc.rect(16, 4, 3, 16).fill()
      break
    case 'target':
      doc.circle(11, 13, 8).stroke()
      doc.circle(11, 13, 4.5).stroke()
      doc.circle(11, 13, 1.3).fill()
      doc.moveTo(11, 13).lineTo(21, 3).stroke()
      doc.path('M16 3 L21 3 L21 8').stroke()
      break
    case 'file':
      doc.path('M6 3 L14 3 L18 7 L18 21 L6 21 Z').stroke()
      doc.path('M14 3 L14 7 L18 7').stroke()
      doc.moveTo(9, 11).lineTo(15, 11).stroke()
      doc.moveTo(9, 14).lineTo(15, 14).stroke()
      doc.moveTo(9, 17).lineTo(13, 17).stroke()
      break
    case 'zap':
      doc.path('M13 2 L5 14 L11 14 L10 22 L19 10 L13 10 Z').fill()
      break
    case 'clipboard':
      doc.roundedRect(5, 4, 14, 17, 2).stroke()
      doc.roundedRect(9, 2, 6, 4, 1).stroke()
      doc.path('M8 13 L11 16 L16 10').stroke()
      break
    default:
      break
  }
  doc.restore()
}

function drawStudentInformation(ctx, data, startY) {
  const rows = [
    { icon: 'user', label: 'Student', value: data.studentName },
    { icon: 'id', label: 'Roll Number', value: data.rollNo },
    { icon: 'calendar', label: 'Exam Date', value: data.examDate },
    { icon: 'layers', label: 'Total Marks', value: data.totalMarks },
  ]
  const x = COVER.left
  const valueX = x + 100
  const valueW = COVER.columnW - 100
  let y = startY
  for (const row of rows) {
    let size = 9.3
    let valueH = ctx.measureText(row.value, valueW, { size, font: FONTS.bodyBold })
    while (size > 8.2 && valueH > ctx.textEngine.lineHeight({ size, font: FONTS.bodyBold }) * 1.1) {
      size -= 0.2
      valueH = ctx.measureText(row.value, valueW, { size, font: FONTS.bodyBold })
    }
    const rowH = Math.max(24, valueH + 12)
    drawIcon(ctx, row.icon, x + 2, y + 5, 12, COVER.primary)
    ctx.text(row.label, x + 26, y + 6, 70, {
      size: 9.3, font: FONTS.body, color: COVER.ink, role: 'cover-student-label',
    })
    ctx.text(row.value, valueX, y + 6, valueW, {
      size, font: FONTS.bodyBold, color: COVER.navy, role: 'cover-student-value',
    })
    ctx.canvas.line(x, y + rowH - 1, x + COVER.columnW, y + rowH - 1, {
      color: COVER.rule, width: 0.5, role: 'cover-student-rule',
    })
    y += rowH
  }
  return y
}

function drawFeatureStrip(ctx) {
  const x = COVER.left
  const totalW = 438
  const colW = totalW / FEATURES.length
  const iconY = 682
  const labelY = 708
  const separatorColor = mix(COVER.navy, COLORS.white, 0.28)
  FEATURES.forEach((feature, index) => {
    const cx = x + colW * index + colW / 2
    drawIcon(ctx, feature.icon, cx - 9, iconY, 18, COLORS.white)
    ctx.text(feature.lines.join('\n'), x + colW * index + 4, labelY, colW - 8, {
      size: 8.2, font: FONTS.bodySemi, color: COLORS.white, align: 'center',
      lineHeight: 11, role: 'cover-feature-label',
    })
    if (index > 0) {
      ctx.canvas.line(x + colW * index, 680, x + colW * index, 742, {
        color: separatorColor, width: 0.6, role: 'cover-feature-separator',
      })
    }
  })
}

function drawFooterMessages(ctx) {
  const left = ['DISCIPLINE', 'CREATIVITY', 'PROGRESS']
  const right = ['A BRIGHTER', 'TOMORROW', 'TOGETHER']
  left.forEach((line, index) => {
    ctx.text(line, 32, 775 + index * 12, 160, {
      size: 7.4, font: FONTS.bodySemi, color: COLORS.white, characterSpacing: 1.8,
      chrome: true, role: 'footer',
    })
  })
  right.forEach((line, index) => {
    ctx.text(line, 470, 775 + index * 12, 95, {
      size: 7.4, font: FONTS.bodySemi, color: COVER.navy, align: 'right', characterSpacing: 1.8,
      chrome: true, role: 'footer',
    })
  })
  ctx.canvas.line(32, 816, 48, 816, { color: COLORS.white, width: 1.4, role: 'cover-accent' })
  ctx.canvas.line(549, 816, 565, 816, { color: COVER.brand, width: 1.4, role: 'cover-accent' })
}

/** Render the full-bleed cover into the already-started first page. */
export function renderFullAnalysisCover(ctx) {
  const data = coverData(ctx.model)
  ctx.chrome({
    type: 'full-analysis-cover', role: 'chrome', label: 'Full Exam Analysis open-door cover',
    x: 0, y: 0, w: A4.width, h: A4.height,
  }, () => {
    drawPathBase(ctx)
    drawDoorway(ctx)
    drawPathDepth(ctx)
    drawBranding(ctx)
    drawHeadline(ctx)
    const panelY = drawExamInformation(ctx, data)
    const panelBottom = drawScorePanel(ctx, data, panelY)
    drawStudentInformation(ctx, data, panelBottom + 16)
    drawFeatureStrip(ctx)
    drawFooterMessages(ctx)
  })
}
