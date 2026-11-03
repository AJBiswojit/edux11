/**
 * AI Exam Analysis PDF — production export entry points.
 *
 * The Premium PDF renderer under ./premium-pdf/ is the single PDF generation
 * system for Student, Faculty and Admin. This module owns only the two
 * production exports plus the shared helpers that those exports and the
 * premium data layer need. No legacy writer, HTML report, fallback or
 * duplicate engine remains.
 */

function formatPace(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${String(r).padStart(2, '0')}s`
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export function masteryFromAccuracy(acc) {
  const n = Number(acc)
  if (!Number.isFinite(n)) return 'Average'
  if (n >= 75) return 'Strong'
  if (n >= 60) return 'Average'
  if (n >= 45) return 'Weak'
  return 'Critical'
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

function fileStub(name) {
  return String(name || 'exam_analysis').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'exam_analysis'
}

function logPdfExportReady(label, result, blob, filename) {
  if (import.meta.env?.DEV) {
    console.info(`[EduX PDF Export] ${label} blob created and download initiated`, {
      filename,
      bytes: blob.size,
      pageCount: result?.pageCount,
      flags: result?.flags?.length ?? 0,
    })
  }
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
 * Exam Intelligence Report — premium PDFKit publication.
 * Production entry point used by Student, Faculty and Admin.
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
  const filename = `MediXO_EduX_${fileStub(model.examName)}_Exam_Intelligence_Report.pdf`
  triggerDownload(blob, filename)
  logPdfExportReady('Report', result, blob, filename)
  return result
}

/**
 * Full Exam Analysis — premium multi-page PDFKit publication.
 * Production entry point used by Student, Faculty and Admin.
 */
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
  const filename = `MediXO_EduX_${fileStub(model.examName)}_Full_Exam_Analysis_Report.pdf`
  triggerDownload(blob, filename)
  logPdfExportReady('Full Analysis', result, blob, filename)
  return result
}
