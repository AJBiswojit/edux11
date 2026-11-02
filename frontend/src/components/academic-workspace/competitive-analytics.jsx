/**
 * Academic Intelligence Workspace — COMPETITIVE analytics (context view).
 * Mock trend, PYQ chapter intelligence, speed, negative-marking discipline
 * and subject accuracy radars per exam family — all derived from the
 * competitive engine. University signals never appear here (Part 5).
 */

import { ChartCard } from '@/components/shared/chart-card'
import { BarCompare, LineTrend, RadarCompare } from '@/components/charts'
import { Badge } from '@/components/ui'
import { ProgressRing } from '@/components/shared/progress-ring'

function CompetitiveAnalytics({ derived }) {
  const c = derived.competitive
  const families = c?.examFamilies ?? []

  const mockTrend = (c?.performance?.mocks ?? []).map((m) => ({ axis: m.title.split(' — ')[0].slice(0, 16), pct: m.pct, percentile: m.percentile ?? null }))
  const chaptersByFamily = families.map((f) => ({
    family: f,
    chapters: (c?.exams?.[f]?.pyq.byChapter ?? []).slice().sort((a, b) => a.mastery - b.mastery).map((ch) => ({ axis: ch.chapter.slice(0, 16), accuracy: ch.mastery, subject: ch.subject })),
  }))

  return (
    <div className="space-y-6">
      {/* competitive performance timeline */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Competitive mock trend" subtitle="Score % & percentile across all mocks" actions={<Badge variant="gradient" size="sm">AI modelled</Badge>}>
          {mockTrend.length ? (
            <LineTrend data={mockTrend} xKey="axis" height={240} series={[
              { key: 'pct', name: 'Score %', color: '#6366f1' },
              { key: 'percentile', name: 'Percentile', color: '#14b8a6' },
            ]} formatter={(v) => `${v}%`} />
          ) : <p className="py-10 text-center text-xs text-slate-400">No mocks completed yet.</p>}
        </ChartCard>

        <ChartCard title="Speed & negative-marking discipline" subtitle="Per exam family">
          <div className="grid grid-cols-2 gap-3">
            {families.map((f) => {
              const exam = c?.exams?.[f] ?? {}
              return (
                <div key={f} className="space-y-2.5 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">{f}</p>
                  <div className="flex items-center gap-3">
                    <ProgressRing value={exam.speed?.score ?? 0} size={64} stroke={7} label={`${exam.speed?.score ?? 0}`} sublabel="Speed" color="#6366f1" />
                    <ProgressRing value={exam.negativeMarking?.discipline ?? 0} size={64} stroke={7} label={`${exam.negativeMarking?.discipline ?? 0}`} sublabel="Disc." color="#14b8a6" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{exam.speed?.avgSeconds ?? 0}s/question · {exam.negativeMarking?.guessRate ?? 0}% guess rate</p>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      {/* PYQ chapter intelligence per family */}
      {chaptersByFamily.map(({ family, chapters }) => (
        <ChartCard
          key={family}
          title={`${family} — PYQ chapter intelligence`}
          subtitle="Accuracy per chapter, previous-year questions (lowest first)"
          actions={<Badge variant={family === 'JEE' ? 'info' : 'success'} size="sm">{family}</Badge>}
        >
          {chapters.length ? (
            <BarCompare data={chapters} xKey="axis" height={230} series={[{ key: 'accuracy', name: 'Accuracy %', color: family === 'JEE' ? '#8b5cf6' : '#10b981' }]} formatter={(v) => `${v}%`} />
          ) : <p className="py-10 text-center text-xs text-slate-400">No PYQ chapter data for {family}.</p>}
        </ChartCard>
      ))}

      {/* subject accuracy radars — exam-specific subject models */}
      <div className="grid gap-6 lg:grid-cols-2">
        {families.map((f) => {
          const subjects = (c?.exams?.[f]?.pyq.bySubject ?? []).map((s) => ({ axis: s.subject.slice(0, 10), accuracy: s.accuracy }))
          return (
            <ChartCard
              key={`radar-${f}`}
              title={`${f} subject accuracy`}
              subtitle={f === 'JEE' ? 'Physics · Chemistry · Mathematics' : 'Physics · Chemistry · Biology'}
              actions={<Badge variant="gradient" size="sm">{f} model</Badge>}
            >
              {subjects.length ? (
                <RadarCompare data={subjects} angleKey="axis" height={230} series={[{ key: 'accuracy', name: 'Accuracy %', color: f === 'JEE' ? '#6366f1' : '#10b981' }]} />
              ) : <p className="py-10 text-center text-xs text-slate-400">No data.</p>}
            </ChartCard>
          )
        })}
      </div>
    </div>
  )
}

export { CompetitiveAnalytics }
export default CompetitiveAnalytics
