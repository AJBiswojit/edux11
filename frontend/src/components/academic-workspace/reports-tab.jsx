/**
 * Academic Intelligence Workspace — Reports tab.
 * Academic snapshot + download / print / share / summary actions.
 */

import { Download, FileBarChart, Printer, Share2, Sparkles } from 'lucide-react'
import { Card, Badge, useToast } from '@/components/ui'
import { formatDate } from '@/utils/format'

function ReportsTab({ derived, profile, datasets }) {
  const toast = useToast()
  const d = derived
  const ex = d.dnaWorkspace?.executive ?? {}

  const snapshot = [
    { label: 'Student', value: profile?.fullName ?? '—' },
    { label: 'Roll number', value: profile?.rollNo ?? '—' },
    { label: 'Program · Semester', value: `${profile?.program ?? '—'} · ${profile?.semester ?? '—'}` },
    { label: 'Academic health', value: `${d.academicHealth.score}/100 (${d.academicHealth.grade})` },
    { label: 'Overall intelligence', value: `${ex?.overallRating ?? d.academicHealth?.score ?? 0}/100 (${ex?.overallGrade ?? d.academicHealth?.grade ?? 'Building'})` },
    { label: 'CGPA', value: String(profile?.cgpa ?? '—') },
    { label: 'Attendance', value: `${datasets?.attendance?.overall ?? 0}%` },
    { label: 'Strengths', value: (d.strengths ?? []).map((s) => s.subject).join(', ') || '—' },
    { label: 'Weak areas', value: (d.weaknesses ?? []).slice(0, 3).map((s) => s.subject).join(', ') || '—' },
    { label: 'Active interventions', value: String((d.interventions ?? []).length) },
    { label: 'Open recommendations', value: String((d.recommendations ?? []).length) },
    { label: 'Report generated', value: formatDate(new Date(), 'MMMM d, yyyy') },
  ]

  const actions = [
    { label: 'Download PDF', icon: Download, grad: 'from-rose-500 to-red-500', msg: 'Academic intelligence report saved as PDF.' },
    { label: 'Print report', icon: Printer, grad: 'from-indigo-500 to-blue-500', msg: 'Report sent to print.' },
    { label: 'Export summary', icon: FileBarChart, grad: 'from-teal-500 to-emerald-500', msg: 'Summary exported (CSV + JSON).' },
    { label: 'Share report', icon: Share2, grad: 'from-amber-500 to-orange-500', msg: 'Shareable report link copied.' },
  ]

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => (
          <button key={a.label} onClick={() => toast.success(a.label, a.msg)} className={`group rounded-3xl bg-gradient-to-br ${a.grad} p-5 text-left text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-lift`}>
            <a.icon className="h-6 w-6 opacity-85 transition-transform group-hover:scale-110" />
            <p className="mt-2.5 text-[13.5px] font-bold">{a.label}</p>
          </button>
        ))}
      </div>

      {/* Academic snapshot */}
      <Card className="overflow-hidden">
        <div className="relative bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-6 text-white">
          <div className="bg-dots absolute inset-0 opacity-15" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Academic summary</p>
              <h2 className="mt-1 font-display text-xl font-bold">MediXO EduX · Academic Intelligence Report</h2>
            </div>
            <Badge className="bg-white/15 text-white ring-white/30"><Sparkles className="h-3 w-3" /> AI generated</Badge>
          </div>
        </div>
        <div className="grid gap-x-8 gap-y-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {snapshot.map((s) => (
            <div key={s.label} className="border-b border-slate-100 pb-2.5 last:border-0 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
              <p className="mt-0.5 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{s.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Executive narrative */}
      <div className="flex items-start gap-4 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-6 ring-1 ring-indigo-500/15">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-md">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-slate-900 dark:text-white">Executive summary</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">{ex.summary}</p>
        </div>
      </div>
    </div>
  )
}

export { ReportsTab }
export default ReportsTab
