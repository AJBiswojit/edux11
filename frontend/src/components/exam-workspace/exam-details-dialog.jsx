/**
 * Examination Intelligence Workspace — Exam Details dialog.
 * Complete instructions · hall · seat · reporting time · allowed/not allowed
 * items · syllabus · faculty · download admit card.
 */

import { AlertCircle, Building2, CalendarDays, CheckCircle2, ClipboardList, DoorOpen, QrCode, Ticket, XCircle  } from 'lucide-react'
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, useToast } from '@/components/ui'
import { formatDate } from '@/utils/format'

function ExamDetailsDialog({ exam, open, onOpenChange, admit, onDownload }) {
  const toast = useToast()
  if (!exam) return null
  const instructions = exam.instructions?.length ? exam.instructions : (admit?.instructions ?? [])
  const allowed = exam.allowedItems ?? ['Pen', 'Pencil', 'Admit card', 'College ID']
  const notAllowed = exam.notAllowedItems ?? ['Smartwatch', 'Calculator', 'Mobile phone', 'Bags']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-500" /> {exam.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Exam details */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Exam details</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {[
                { label: 'Course / Subject', value: exam.course ?? exam.subject ?? '—' },
                { label: 'Faculty', value: exam.faculty ?? '—' },
                { label: 'Department', value: exam.department ?? '—' },
                { label: 'Date', value: formatDate(exam.date, 'EEEE, MMMM d, yyyy') },
                { label: 'Time', value: `${formatDate(exam.date, 'h:mm a')} · ${exam.duration}` },
                { label: 'Reporting time', value: exam.reportingTime ?? '30 min before start' },
                { label: 'Maximum marks', value: `${exam.maxMarks} marks` },
                { label: 'Pattern', value: exam.pattern ?? (exam.mode === 'Offline' ? 'Offline (written)' : exam.mode ?? '—') },
                { label: 'Negative marking', value: exam.negativeMarking ?? 'None' },
                { label: 'Difficulty', value: exam.difficulty ?? '—' },
                { label: 'Chapter', value: exam.chapter ?? 'Full syllabus' },
                { label: 'Status', value: exam.status },
                { label: 'Priority', value: exam.priority ?? '—' },
              ].map((f) => (
                <div key={f.label} className="rounded-2xl bg-slate-50 px-3.5 py-2.5 dark:bg-slate-800/60">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{f.label}</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{f.value}</p>
                </div>
              ))}
            </div>
            {exam.syllabus && (
              <div className="mt-2.5 flex items-center gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[12px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Syllabus: {exam.syllabus}
              </div>
            )}
            {exam.resultAvailability && (
              <div className="mt-2.5 flex items-center gap-2 rounded-2xl bg-sky-50 px-3.5 py-2.5 text-[12px] font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" /> Result: {exam.resultAvailability}
              </div>
            )}
          </div>

          {/* Venue & seat */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Venue & seat information</p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Building2 className="h-3 w-3" /> Venue</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{exam.venue ?? exam.mode ?? '—'}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><DoorOpen className="h-3 w-3" /> Hall / Room</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{exam.room ?? (exam.pattern ? `Online (${exam.pattern})` : exam.mode ?? '—')}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Ticket className="h-3 w-3" /> Seat</p>
                <p className="mt-1 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{exam.seat ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Allowed / not allowed */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Allowed items</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {allowed.map((a) => <Badge key={a} variant="success" size="sm">{a}</Badge>)}
              </div>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3.5 dark:border-rose-500/20 dark:bg-rose-500/5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400"><XCircle className="h-3 w-3" /> Not allowed</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {notAllowed.map((a) => <Badge key={a} variant="danger" size="sm">{a}</Badge>)}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Complete instructions</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">
              {(instructions.length ? instructions : exam.pattern
                ? ['Log in to the test portal 15 minutes before the scheduled start.', 'Marking scheme: +4 for correct, −1 for incorrect in MCQs.', 'Unattempted questions carry no negative marking.', 'Results and AI analysis are available after submission.']
                : ['Report 30 minutes before the exam start time.', 'Carry a government photo ID (Aadhaar / College ID).']).map((ins) => <li key={ins}>{ins}</li>)}
            </ul>
          </div>

          {/* Admit card */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-4 ring-1 ring-indigo-500/15">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-md">
                <QrCode className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">Admit card · {admit?.available ? (exam.admitStatus ?? 'Available') : (exam.admitStatus ?? 'Not issued')}</p>
                <p className="text-[11px] text-slate-400">
                  {admit ? `${admit.name ?? 'Student'} · ${admit.rollNo ?? '—'} · ${admit.semester ?? '—'}` : 'Available for download once issued.'}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => {
              if (onDownload) onDownload()
              else toast.info('Not available yet', 'Admit-card PDF download is not available yet.')
            }}>
              <Ticket className="h-4 w-4" /> Download admit card
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { ExamDetailsDialog }
export default ExamDetailsDialog
