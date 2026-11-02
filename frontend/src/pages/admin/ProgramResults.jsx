import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileBarChart, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { useAdminProgramResults } from '@/services/extra'
import { downloadResultsExcel, downloadResultsPdf } from './program-results-export'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, useToast } from '@/components/ui'

function formatSheetDate(iso) {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  if (!y || !m || !d) return iso
  return `${d}.${m}.${y}`
}

function cell(value, extra = '') {
  const text = value === 0 || value ? String(value) : '—'
  return <td className={`border border-slate-700 px-1.5 py-1 text-center tabular-nums ${extra}`}>{text}</td>
}

function ProgramResults() {
  const { programId } = useParams()
  const { data, isLoading, isError, refetch } = useAdminProgramResults(programId)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const toast = useToast()

  const scheme = data?.scheme
  const rows = data?.rows ?? []
  const analysis = data?.analysis
  const subjects = scheme?.subjects ?? []

  const title = useMemo(() => {
    const name = data?.examName || data?.program?.name || 'Examination results'
    const date = formatSheetDate(data?.examDate)
    return date ? `${name}    DATE-${date}` : name
  }, [data])

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        className="print:hidden"
        eyebrow="Academics · Programs · Results"
        title={data?.program?.name || 'Program results'}
        description={`${scheme?.family || ''} official pattern: ${scheme?.nq || 0} questions, +${scheme?.correctMarks ?? 4} / ${scheme?.wrongMarks ?? -1}. This sheet adds ${scheme?.gracePercent ?? 15}% grace on official maximum; students do not see that grace.`}
        breadcrumbs={[
          { label: 'Admin' },
          { label: 'Programs', to: '/admin/programs' },
          { label: 'Results' },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print sheet
            </Button>
            <Button size="sm" onClick={() => setShowAnalysis(true)}>
              <FileBarChart className="h-4 w-4" /> Get analysis report
            </Button>
          </>
        }
      />

      <Link
        to="/admin/programs"
        className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 print:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to programs
      </Link>

      <div className="exam-results-sheet overflow-x-auto rounded-sm border-2 border-slate-800 bg-white print:border print:shadow-none dark:bg-white">
        <table className="min-w-full border-collapse text-[11px] text-slate-900">
          <thead>
            <tr>
              <th colSpan={10 + subjects.length * 2} className="border border-slate-800 bg-[#12345c] px-3 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-white">
                Examination results — {title}
              </th>
            </tr>
            <tr className="bg-[#1d4f8c] text-white">
              <th className="border border-slate-700 px-1.5 py-2 font-semibold">Sl No.</th>
              <th className="border border-slate-700 px-1.5 py-2 font-semibold">Roll No.</th>
              <th className="border border-slate-700 px-2 py-2 text-left font-semibold">Name</th>
              {subjects.map((s) => (
                <th key={s.code} className="border border-slate-700 px-1.5 py-2 font-semibold">{s.code}</th>
              ))}
              <th className="border border-slate-700 px-1.5 py-2 font-semibold">Total</th>
              <th className="border border-slate-700 px-1.5 py-2 font-semibold">NCA</th>
              <th className="border border-slate-700 px-1.5 py-2 font-semibold">NWA</th>
              <th className="border border-slate-700 px-1.5 py-2 font-semibold">NUQ</th>
              <th className="border border-slate-700 px-1.5 py-2 font-semibold">NQ</th>
              <th className="border border-slate-700 px-1.5 py-2 font-semibold">%age</th>
              {subjects.map((s) => (
                <th key={`${s.code}-rank`} className="border border-slate-700 px-1.5 py-2 font-semibold">{s.code} Rank</th>
              ))}
              <th className="border border-slate-700 bg-amber-300 px-1.5 py-2 font-semibold text-slate-900">Overall Rank</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10 + subjects.length * 2} className="border border-slate-700 px-4 py-8 text-center text-slate-500">
                  No submitted {scheme?.family || 'exam'} attempts yet for this program.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.studentId} className="odd:bg-white even:bg-slate-50">
                  {cell(row.slNo)}
                  {cell(row.rollNo)}
                  <td className="border border-slate-700 px-2 py-1 text-left font-semibold uppercase">
                    <Link className="text-slate-900 hover:text-indigo-700" to={`/admin/students/${row.studentId}/exams/${row.attemptId}`}>
                      {row.name}
                    </Link>
                  </td>
                  {subjects.map((s) => cell((row.subjects?.[s.code] || {}).score ?? 0))}
                  {cell(row.total, 'font-bold')}
                  {cell(row.nca)}
                  {cell(row.nwa)}
                  {cell(row.nuq)}
                  {cell(row.nq)}
                  {cell(Number(row.percentage).toFixed(2))}
                  {subjects.map((s) => cell((row.subjects?.[s.code] || {}).rank ?? row.subjectRanks?.[s.code]))}
                  {cell(row.overallRank, 'bg-amber-100 font-bold')}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-slate-500 print:hidden">
        NCA / NWA / NUQ stay as raw answers. Subject marks, total and %age on this sheet already include a {scheme?.gracePercent ?? 15}% administrative grace on official maximum (capped at 100%). Students still see raw +4/−1 scores only — this grace is not shown in the student portal.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2 print:hidden">
        <Button
          variant="outline"
          disabled={!rows.length}
          onClick={() => {
            try {
              downloadResultsPdf({ title, examName: data?.examName || data?.program?.name, examDate: data?.examDate, scheme, rows, subjects })
              toast.success('PDF downloaded', 'Result sheet saved as PDF.')
            } catch (err) {
              toast.error('PDF failed', err?.message || 'Could not create the PDF.')
            }
          }}
        >
          <FileText className="h-4 w-4" /> PDF
        </Button>
        <Button
          variant="outline"
          disabled={!rows.length}
          onClick={() => {
            try {
              downloadResultsExcel({ title, examName: data?.examName || data?.program?.name, examDate: data?.examDate, scheme, rows, subjects })
              toast.success('Excel downloaded', 'Result sheet saved as Excel.')
            } catch (err) {
              toast.error('Excel failed', err?.message || 'Could not create the spreadsheet.')
            }
          }}
        >
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </Button>
        <Button onClick={() => setShowAnalysis(true)}>
          <FileBarChart className="h-4 w-4" /> Get analysis report
        </Button>
      </div>

      {showAnalysis && analysis && (
        <Card className="analysis-report mt-6 p-6 print:border-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600">Analysis report</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{analysis.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{analysis.marking}</p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => window.print()}>Print report</Button>
              <Button variant="outline" size="sm" onClick={() => setShowAnalysis(false)}>Close</Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Students ranked', analysis.students],
              ['Class %age', analysis.averagePercentage],
              ['Highest %age', analysis.highestPercentage],
              ['Attempt rate', `${analysis.attemptRate}%`],
              ['Avg attended', analysis.averageAttended],
              ['Avg correct (NCA)', analysis.averageCorrect],
              ['Avg wrong (NWA)', analysis.averageWrong],
              ['Below 30%', analysis.below30Count],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-2">Subject</th>
                  <th className="pb-2">Avg score</th>
                  <th className="pb-2">Avg questions attended</th>
                </tr>
              </thead>
              <tbody>
                {(analysis.subjects || []).map((s) => (
                  <tr key={s.code} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2 font-semibold">{s.code} · {s.name}</td>
                    <td className="py-2 tabular-nums">{s.avgScore}</td>
                    <td className="py-2 tabular-nums">{s.avgAttended}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(analysis.toppers || []).length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Toppers</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {analysis.toppers.map((t) => (
                  <li key={`${t.rollNo}-${t.rank}`}>
                    <Badge variant="warning" className="mr-2">#{t.rank}</Badge>
                    {t.name} ({t.rollNo}) — {t.total} marks · {t.percentage}%
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="mt-6 list-disc space-y-1 pl-5 text-[13px] text-slate-600 dark:text-slate-300">
            {(analysis.notes || []).map((note) => (
              <li key={note}>{note}</li>
            ))}
            {analysis.lowAttemptCount > 0 && (
              <li>{analysis.lowAttemptCount} student(s) attended fewer than half of the official questions.</li>
            )}
          </ul>
        </Card>
      )}
    </div>
  )
}

export { ProgramResults }
export default ProgramResults
