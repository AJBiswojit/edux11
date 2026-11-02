/**
 * MediXO EduX — AI Teaching Studio · Tab 7: Faculty Profile.
 * Professional information, courses, teaching statistics, achievements,
 * certifications, publications (prototype), portfolio, student feedback and
 * teaching-health trend — all derived from the foundation.
 */

import { Award, BookOpen, Download, GraduationCap, HeartPulse, Medal, Users } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend } from '@/components/charts'
import { Badge, Button, Card, useToast } from '@/components/ui'
import {  } from '@/components/teaching-workspace/shared'

function ProfileTab({ data }) {
  const p = data.derived.aiStudio?.portfolio ?? {}
  const toast = useToast()
  const prof = p.professional ?? {}
  const stats = p.teachingStatistics ?? {}

  return (
    <div className="space-y-8">
      {/* Professional info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-teal-500 font-display text-xl font-bold text-white shadow-xl shadow-indigo-500/25">
              {(prof.name ?? 'Dr').split(' ').map((x) => x[0]).slice(0, 2).join('')}
            </span>
            <div>
              <h3 className="text-[17px] font-bold text-slate-900 dark:text-white">{prof.name}</h3>
              <p className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-400">{prof.designation}</p>
              <p className="text-[11px] text-slate-400">{prof.facultyId} · {prof.institution}</p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5 text-[12px] text-slate-500 dark:text-slate-400">
            <p>🏛 {prof.department}</p>
            <p>🎓 {prof.qualification}</p>
            <p>⏳ {prof.experienceYears} years of teaching</p>
            <p>✉️ {prof.email}</p>
            <p>📞 {prof.phone}</p>
            <p>🕒 Office hours · {prof.officeHours} · {prof.officeRoom}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(prof.specialization ?? []).map((s) => <Badge key={s} variant="outline" size="sm">{s}</Badge>)}
          </div>
          <Button variant="outline" size="sm" className="mt-5 w-full" onClick={() => toast.success('Exporting…', 'Faculty profile exported as PDF (prototype).')}>
            <Download className="h-3.5 w-3.5" /> Export faculty profile
          </Button>
        </Card>

        {/* Teaching statistics */}
        <Card className="p-6 lg:col-span-1">
          <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <GraduationCap className="h-4 w-4 text-indigo-500" /> Teaching statistics
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Students taught', value: String(stats.totalStudentsTaught ?? 0), icon: Users },
              { label: 'Cumulative courses', value: String(stats.cumulativeCourses ?? 0), icon: BookOpen },
              { label: 'Class average', value: `${stats.avgClassAverage ?? 0}%`, icon: Award },
              { label: 'Pass rate', value: `${stats.avgPassRate ?? 0}%`, icon: Medal },
              { label: 'Publications', value: String(stats.publications ?? 0), icon: BookOpen },
              { label: 'h-index', value: String(stats.hIndex ?? 0), icon: Award },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <s.icon className="h-4 w-4 text-indigo-400" />
                <p className="mt-1.5 font-display text-xl font-bold text-slate-800 dark:text-white">{s.value}</p>
                <p className="text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Current courses</p>
          <div className="mt-2 space-y-1.5">
            {(p.courses ?? []).map((c) => (
              <div key={c.code} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-2 text-[12px] dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{c.code} · {c.title}</span>
                <span className="text-slate-400">{c.progress}% · avg {c.avgScore}%</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Advisory groups</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(p.advisorGroups ?? []).map((g) => <Badge key={g.id} variant="outline" size="sm">{g.name} · {g.students} students</Badge>)}
          </div>
        </Card>

        {/* Feedback + performance trend */}
        <Card className="p-6 lg:col-span-1">
          <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <HeartPulse className="h-4 w-4 text-rose-500" /> Teaching performance
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
            {[['Health', `${p.performance?.teachingHealth ?? 0}`], ['Effectiveness', `${p.performance?.effectiveness ?? 0}`], ['Engagement', `${p.performance?.engagement ?? 0}`]].map(([label, v]) => (
              <div key={label} className="rounded-2xl bg-slate-50 py-3 dark:bg-slate-800/50">
                <p className="font-display text-lg font-bold text-indigo-600 dark:text-indigo-400">{v}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          <ChartCard title="Teaching health trend" subtitle="Weekly class average" className="mt-4">
            <AreaTrend
              data={(p.performance?.healthTrend ?? []).map((w) => ({ label: w.label, value: w.value }))}
              xKey="label"
              height={150}
              series={[{ key: 'value', name: 'Class avg', color: '#6366f1' }]}
              formatter={(v) => `${v}%`}
            />
          </ChartCard>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Student feedback</p>
          <div className="mt-2 flex items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">★ {p.feedback?.avgRating ?? '—'}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{p.feedback?.responses ?? 0} responses</p>
            </div>
            <div className="min-w-0 flex-1 text-[11px]">
              <p className="font-bold text-emerald-700 dark:text-emerald-300">Top strengths: {p.feedback?.topStrengths?.join(', ')}</p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">Improve: {p.feedback?.improvementAreas?.join(', ')}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Achievements + certifications + publications */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Achievements" subtitle="Recognition & awards">
          <div className="space-y-2.5">
            {(p.achievements ?? []).map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/10"><Medal className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{a.title}</p>
                  <p className="text-[10.5px] text-slate-400">{a.year} · {a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Certifications" subtitle="Professional development">
          <div className="space-y-2.5">
            {(p.certifications ?? []).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10"><Award className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{c.name}</p>
                  <p className="text-[10.5px] text-slate-400">{c.issuer} · {c.year}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Publications" subtitle="Research output (prototype)">
          <div className="space-y-2.5">
            {(p.publications ?? []).map((pub) => (
              <div key={pub.id} className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <p className="text-[12.5px] font-bold leading-snug text-slate-800 dark:text-slate-100">{pub.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] text-slate-400">
                  <span>{pub.venue} · {pub.year}</span>
                  <Badge variant={pub.status === 'Published' ? 'success' : 'warning'} size="sm">{pub.status}</Badge>
                  <span>· {pub.citations} citations</span>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}

export { ProfileTab }
export default ProfileTab
