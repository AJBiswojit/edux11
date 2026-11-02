/**
 * Faculty — Student Profile · Examinations tab.
 * Exam history table + the domain/family badge maps shared by the profile
 * header. Pure presentational — fed by the 360 bundle (`s360.attempts`).
 */
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { DOMAIN_BADGE, FAMILY_BADGE } from '@/constants/ui'
import { formatDate } from '@/utils/format'

function ExamHistoryTable({ attempts, studentId, basePath }) {
  /* basePath: e.g. '/admin/students' or '/faculty/my-students' */
  const base = basePath ?? '/faculty/my-students'
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[820px]">
        <TableHeader>
          <TableRow>
            <TableHead>Exam</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-center">Score</TableHead>
            <TableHead className="text-center">Accuracy</TableHead>
            <TableHead className="text-center">Attempt rate</TableHead>
            <TableHead className="text-center">Time eff.</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attempts.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{a.examName ?? a.examId}</p>
                <p className="text-[10.5px] font-medium text-slate-400">{a.shortTitle}{a.mock ? ' · mock test' : ''}</p>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={DOMAIN_BADGE[a.examMode]} size="sm">{a.examMode}</Badge>
                  {a.examFamily && <Badge variant={FAMILY_BADGE[a.examFamily]} size="sm">{a.examFamily}</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-[11.5px] font-medium text-slate-500">{a.date ? formatDate(a.date, 'MMM d, yyyy') : '—'}</TableCell>
              <TableCell className="text-center font-bold text-slate-800 dark:text-slate-100">
                {a.score != null ? a.score : '—'}<span className="text-[10px] font-medium text-slate-400">/{a.maxScore ?? '—'}</span>
              </TableCell>
              <TableCell className={`text-center font-bold ${a.accuracy >= 75 ? 'text-emerald-600 dark:text-emerald-400' : a.accuracy >= 55 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'}`}>
                {a.accuracy != null ? `${a.accuracy}%` : '—'}
              </TableCell>
              <TableCell className="text-center text-[12px] font-semibold text-slate-500">
                {a.attemptRate != null ? `${a.attemptRate}%` : '—'}
              </TableCell>
              <TableCell className="text-center text-[12px] font-semibold text-slate-500">
                {a.timeEfficiency != null ? `${a.timeEfficiency}%` : '—'}
              </TableCell>
              <TableCell className="text-right">
                <Link to={`${base}/${studentId}/exams/${a.id}`}>
                  <Button size="sm" variant="outline"><FileText className="h-3.5 w-3.5" /> View Analysis</Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export { ExamHistoryTable }
export default ExamHistoryTable
