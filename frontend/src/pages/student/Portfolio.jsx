/**
 * AI Digital Portfolio — portfolio, career readiness (integrated) and
 * achievement timeline. All values from the Student Intelligence Foundation.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStudentIntelligence } from '@/services/intelligence'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import {
  Award, Briefcase, Download, ExternalLink, FileText, Github, GraduationCap,
  Linkedin, Printer, Sparkles, Target, Trophy,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { ProgressRing } from '@/components/shared/progress-ring'
import { Badge, Button, Card, Progress, useToast } from '@/components/ui'
import { formatDate } from '@/utils/format'

const DIM_LABELS = {
  technicalSkills: 'Technical skills', communication: 'Communication', problemSolving: 'Problem solving',
  projects: 'Projects', leadership: 'Leadership', certifications: 'Certifications',
}

function Portfolio() {
  const toast = useToast()
  const { data: intel, isLoading, isError, refetch } = useStudentIntelligence()
  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  const derived = intel.derived
  const pw = derived.portfolioWorkspace
  const career = pw.career
  const portfolio = pw.portfolio
  const completion = pw.completion
  const journey = derived.academicJourney ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Profile · AI Digital Portfolio"
        title="AI Digital Portfolio"
        description="Your projects, certificates, achievements, skills and AI career readiness — one living portfolio."
        breadcrumbs={[{ label: 'Student' }, { label: 'Digital Portfolio' }]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.info('Not available yet', 'Portfolio PDF export is not available yet.')}><Download className="h-4 w-4" /> Export portfolio</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print portfolio</Button>
            <Button asChild size="sm"><Link to="/student/mentor"><Sparkles className="h-4 w-4" /> Improve with AI</Link></Button>
          </>
        }
      />

      {/* Hero: completion + career readiness */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-lift lg:col-span-2">
          <div className="bg-dots absolute inset-0 opacity-15" />
          <div className="relative flex flex-wrap items-center gap-6">
            <ProgressRing value={completion.completion} size={130} stroke={11} color="#ffffff" track="rgba(255,255,255,0.2)" label={`${completion.completion}%`} sublabel="Complete" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Portfolio completion</p>
              <h2 className="mt-1 font-display text-xl font-bold">{portfolio.resume.headline}</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/85">{portfolio.resume.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {portfolio.profiles?.github ? <a href={`https://${portfolio.profiles.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold ring-1 ring-white/25 transition-all hover:bg-white/25"><Github className="h-3 w-3" /> GitHub</a> : <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold ring-1 ring-white/25">GitHub —</span>}
                {portfolio.profiles?.linkedin ? <a href={`https://${portfolio.profiles.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold ring-1 ring-white/25 transition-all hover:bg-white/25"><Linkedin className="h-3 w-3" /> LinkedIn</a> : <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold ring-1 ring-white/25">LinkedIn —</span>}
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold ring-1 ring-white/25"><FileText className="mr-1 inline h-3 w-3" /> Resume {portfolio.resumeScore}/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Career readiness */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white"><Briefcase className="h-4 w-4 text-amber-500" /> AI Career Readiness</p>
            <Badge variant={career.score >= 80 ? 'success' : career.score >= 60 ? 'warning' : 'danger'}>{career.placementReadiness}</Badge>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <ProgressRing value={career.score} size={92} stroke={9} label={`${career.score}`} sublabel="Ready" color={career.score >= 80 ? '#10b981' : career.score >= 60 ? '#f59e0b' : '#f43f5e'} />
            <div className="space-y-1 text-[11.5px] text-slate-500 dark:text-slate-400">
              <p><span className="font-bold text-slate-700 dark:text-slate-200">{career.trend === 'improving' ? '▲' : '▼'} {career.delta >= 0 ? `+${career.delta}` : career.delta}</span> vs last month</p>
              <p>Goal: <span className="font-semibold text-slate-600 dark:text-slate-300">{career.careerGoal ?? '—'}</span></p>
              <p>Target: <span className="font-semibold text-slate-600 dark:text-slate-300">{career.targetTimeline ?? '—'}</span></p>
              <p>Drive: <span className="font-semibold text-slate-600 dark:text-slate-300">{career.placementDrive?.date ?? '—'}</span></p>
            </div>
          </div>
        </Card>
      </div>

      {/* completion breakdown + skill dimensions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Completion breakdown" subtitle="What builds your portfolio score">
          <div className="space-y-3">
            {completion.breakdown.map((b) => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="w-28 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{b.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" style={{ width: `${b.value}%` }} />
                </div>
                <span className="w-8 text-right text-xs font-bold text-slate-700 dark:text-slate-200">{Math.round(b.value)}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Career skill dimensions" subtitle="AI-assessed across 6 axes" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(career.dimensions ?? {}).map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{DIM_LABELS[k] ?? k}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{v}%</span>
                </div>
                <Progress value={v} className="mt-1.5 h-2" gradient={v >= 80 ? 'from-emerald-500 to-teal-400' : v >= 65 ? 'from-amber-500 to-orange-400' : 'from-rose-500 to-red-400'} />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* projects · certifications · achievements */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Projects" subtitle={`${portfolio.projects?.length ?? 0} shipped`}>
          <div className="space-y-2.5">
            {(portfolio.projects ?? []).map((p) => (
              <div key={p.title} className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{p.title}</p>
                <p className="text-[10.5px] text-slate-400">{p.role} · {p.tech.join(', ')} · {p.year}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Certificates" subtitle="Verified credentials">
          <div className="space-y-2.5">
            {(portfolio.certifications ?? []).map((c) => (
              <div key={c.title} className="flex items-start gap-2.5 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <Award className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{c.title}</p>
                  <p className="text-[10.5px] text-slate-400">{c.issuer} · {c.year}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Achievements" subtitle={`${derived.achievements.completed}/${derived.achievements.total} unlocked`}>
          <div className="flex flex-wrap gap-1.5">
            {derived.achievements.completedList.map((a) => <Badge key={a.id} variant="success"><Trophy className="mr-1 h-3 w-3" /> {a.title}</Badge>)}
            {derived.achievements.inProgressList.map((a) => <Badge key={a.id} variant="secondary">{a.title} · {a.progress}%</Badge>)}
          </div>
        </ChartCard>
      </div>

      {/* competitions · internships · research */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Competitions" subtitle="Contests & hackathons">
          <div className="space-y-2">
            {(portfolio.competitions ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2.5 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-bold text-slate-700 dark:text-slate-200">{c.name}</p>
                  <p className="text-[10.5px] text-slate-400">{c.year}</p>
                </div>
                <Badge variant={c.status === 'Won' ? 'success' : c.status === 'Finalist' ? 'warning' : 'secondary'} size="sm">{c.rank}</Badge>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Internships" subtitle="Industry & research experience">
          <div className="space-y-2">
            {(portfolio.internships ?? []).map((i) => (
              <div key={i.id} className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{i.role}</p>
                  <Badge variant={i.status === 'Completed' ? 'success' : 'info'} size="sm">{i.status}</Badge>
                </div>
                <p className="text-[10.5px] text-slate-400">{i.org} · {i.year}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{i.detail}</p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Research" subtitle="Publications & papers">
          <div className="space-y-2">
            {(portfolio.research ?? []).map((r) => (
              <div key={r.id} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-500/15 dark:bg-indigo-500/5">
                <p className="text-[12.5px] font-bold leading-snug text-slate-800 dark:text-slate-100">{r.title}</p>
                <p className="mt-0.5 text-[10.5px] text-slate-400">{r.role} · {r.venue} · {r.year}</p>
              </div>
            ))}
            {(portfolio.research ?? []).length === 0 && <p className="py-6 text-center text-xs text-slate-400">No research yet — optional.</p>}
          </div>
        </ChartCard>
      </div>

      {/* recommended certs + skills + roadmap */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Recommended certifications" subtitle={career.careerGoal ? `AI-suggested for your ${career.careerGoal} goal` : 'AI-suggested when a career goal is set'} actions={<Badge variant="gradient"><Sparkles className="h-3 w-3" /> AI ranked</Badge>}>
          <div className="space-y-2.5">
            {(career.recommendedCertifications ?? []).map((c) => (
              <div key={c.title} className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <Award className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{c.title}</p>
                  <p className="text-[11px] text-slate-400">{c.reason}</p>
                </div>
                <Badge variant="outline" size="sm">{c.effort}</Badge>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Recommended skills" subtitle="Gap-closing plan">
          <div className="space-y-3">
            {(career.recommendedSkills ?? []).map((s) => (
              <div key={s.skill}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{s.skill} <span className="font-normal text-slate-400">· {s.reason}</span></span>
                  <span className="font-bold text-slate-600 dark:text-slate-300">{s.level}% → <span className="text-emerald-600 dark:text-emerald-400">{s.target}%</span></span>
                </div>
                <div className="mt-1.5 flex gap-1">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" style={{ width: `${s.level}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* improvement roadmap */}
      <ChartCard title="Career improvement roadmap" subtitle="Phase-by-phase plan to placement">
        <div className="grid gap-3 md:grid-cols-3">
          {(career.roadmap ?? []).map((r, i) => (
            <motion.div key={r.phase} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="relative rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-teal-500 text-[11px] font-bold text-white">{i + 1}</span>
                <Badge variant={r.status === 'In Progress' ? 'warning' : 'secondary'} size="sm">{r.status}</Badge>
              </div>
              <p className="mt-2 text-[10.5px] font-bold uppercase tracking-widest text-indigo-500">{r.phase}</p>
              <h3 className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{r.title}</h3>
              <ul className="mt-2 space-y-1">
                {r.items.map((it) => (
                  <li key={it} className="flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <Target className="mt-0.5 h-3 w-3 shrink-0 text-indigo-500" /> {it}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </ChartCard>

      {/* Achievement timeline */}
      <ChartCard title="Achievement timeline" subtitle="Milestones across your academic journey" actions={<Badge variant="gradient"><Trophy className="h-3 w-3" /> {journey.length} milestones</Badge>}>
        <ol className="relative ml-2 space-y-4 border-l-2 border-slate-100 pl-6 dark:border-slate-800">
          {journey.slice(0, 10).map((e, i) => (
            <motion.li key={e.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative">
              <span className={`absolute -left-[31px] top-1 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 ${e.type === 'achievement' ? 'bg-emerald-500' : e.type === 'certification' ? 'bg-amber-500' : e.type === 'project' ? 'bg-violet-500' : 'bg-indigo-500'}`}>
                {e.type === 'achievement' ? <Trophy className="h-3 w-3 text-white" /> : e.type === 'certification' ? <Award className="h-3 w-3 text-white" /> : <GraduationCap className="h-3 w-3 text-white" />}
              </span>
              <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{e.title}</p>
                  <span className="text-[10.5px] font-medium text-slate-400">{formatDate(e.date, 'MMM d, yyyy')}</span>
                </div>
                {e.detail && <p className="mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">{e.detail}</p>}
              </div>
            </motion.li>
          ))}
        </ol>
      </ChartCard>

      {/* resume preview */}
      <Card className="p-6">
        <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white"><FileText className="h-4 w-4 text-indigo-500" /> Resume summary</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Headline</p>
            <p className="mt-1 text-[13px] font-bold text-slate-800 dark:text-slate-100">{portfolio.resume.headline}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Experience</p>
            <div className="mt-1 space-y-1">
              {(portfolio.resume.experience ?? []).map((e) => (
                <p key={e.role} className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{e.role} <span className="font-normal text-slate-400">· {e.org} · {e.period}</span></p>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Education</p>
            <p className="mt-1 text-[11.5px] font-semibold text-slate-700 dark:text-slate-200">{portfolio.resume.education}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info('Not available yet', 'Resume PDF preview is not available yet.')}><FileText className="h-3.5 w-3.5" /> View resume</Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('Not available yet', 'Portfolio PDF export is not available yet.')}><Download className="h-3.5 w-3.5" /> Export</Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /> Print</Button>
          {portfolio.profiles?.github ? <a href={`https://${portfolio.profiles.github}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-[11.5px] font-bold text-slate-600 transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"><Github className="h-3.5 w-3.5" /> GitHub <ExternalLink className="h-3 w-3" /></a> : null}
          {portfolio.profiles?.linkedin ? <a href={`https://${portfolio.profiles.linkedin}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-[11.5px] font-bold text-slate-600 transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"><Linkedin className="h-3.5 w-3.5" /> LinkedIn <ExternalLink className="h-3 w-3" /></a> : null}
        </div>
      </Card>
    </div>
  )
}

export { Portfolio }
export default Portfolio
