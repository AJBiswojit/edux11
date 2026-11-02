/**
 * Academic Intelligence Workspace — Exam evidence card (Phase 2).
 * A compact, additive section for the AI Academic DNA tab: strengths &
 * weaknesses derived from completed Exam Agent attempts (manual mode
 * only), each insight carrying traceable evidence (attempts · questions ·
 * accuracy · avg time · incorrect · skipped) and a longitudinal trend.
 * University and Competitive (JEE/NEET) pools are rendered separately.
 */
import { AlertTriangle, CheckCircle2, ClipboardList, TrendingDown, TrendingUp, Minus, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui'
import { ChartCard } from '@/components/shared/chart-card'

const TREND_STYLE = {
  improving: 'success',
  declining: 'danger',
  stable: 'secondary',
  new: 'info',
}
const STATUS_STYLE = {
  strong: 'success',
  resolved: 'success',
  improving: 'info',
  developing: 'warning',
  weak: 'danger',
  persistent: 'danger',
}
const TREND_ICON = { improving: TrendingUp, declining: TrendingDown, stable: Minus, new: Sparkles }

function EvidenceRow({ item }) {
  const TrendIcon = TREND_ICON[item.trend] ?? Minus
  const ev = item.evidence ?? {}
  return (
    <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{item.chapter}</p>
        <span className="text-[11px] font-bold text-slate-400">{item.accuracy}% · {item.avgTime}s avg</span>
        {item.trend && (
          <Badge variant={TREND_STYLE[item.trend] ?? 'secondary'} size="sm">
            <TrendIcon className="h-2.5 w-2.5" /> {item.trend}
          </Badge>
        )}
        {item.status && <Badge variant={STATUS_STYLE[item.status] ?? 'secondary'} size="sm">{item.status}</Badge>}
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] font-medium text-slate-400">
        <ClipboardList className="h-3 w-3" />
        Evidence: {ev.attempts ?? 0} attempt{(ev.attempts ?? 0) === 1 ? '' : 's'} · {ev.questions ?? 0} questions · {ev.incorrect ?? 0} incorrect · {ev.skipped ?? 0} skipped
      </p>
    </div>
  )
}

function DomainBlock({ label, pool, tone }) {
  const strengths = pool?.strengths ?? []
  const weaknesses = pool?.weaknesses ?? []
  if (!strengths.length && !weaknesses.length) return null
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          {strengths.length > 0 && (
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Strengths
            </p>
          )}
          {strengths.map((s) => <EvidenceRow key={`st-${label}-${s.chapter}`} item={s} />)}
          {!strengths.length && <p className="text-[11px] text-slate-400">No strengths detected yet.</p>}
        </div>
        <div className="space-y-2">
          {weaknesses.length > 0 && (
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-3 w-3" /> Weaknesses
            </p>
          )}
          {weaknesses.map((w) => <EvidenceRow key={`wk-${label}-${w.chapter}`} item={w} />)}
          {!weaknesses.length && <p className="text-[11px] text-slate-400">No weaknesses flagged — excellent.</p>}
        </div>
      </div>
    </div>
  )
}

function ExamEvidenceCard({ evidence, domain = 'university' }) {
  const pools = evidence?.university || evidence?.competitive
  if (!evidence || !pools) return null
  const hasAny =
    (evidence.university?.strengths?.length || evidence.university?.weaknesses?.length ||
     evidence.competitive?.JEE?.strengths?.length || evidence.competitive?.JEE?.weaknesses?.length ||
     evidence.competitive?.NEET?.strengths?.length || evidence.competitive?.NEET?.weaknesses?.length)

  return (
    <ChartCard
      title="Exam evidence — practice attempts"
      subtitle="Strengths & weaknesses derived from completed Exam Agent attempts (manual mode) — every insight traces to actual questions"
      actions={<Badge variant="gradient"><Sparkles className="h-3 w-3" /> {evidence.totals?.attempts ?? 0} attempts</Badge>}
    >
      {hasAny ? (
        <div className="space-y-4">
          {domain === 'university' ? (
            <DomainBlock label="🏛️ University" pool={evidence.university} tone="university" />
          ) : (
            <>
              <DomainBlock label="🎯 JEE" pool={evidence.competitive?.JEE} tone="jee" />
              <DomainBlock label="🧬 NEET" pool={evidence.competitive?.NEET} tone="neet" />
            </>
          )}
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[10.5px] font-medium leading-relaxed text-slate-400 dark:bg-slate-800/60">
            Trends compare your accuracy across attempts (improving · declining · stable · persistent · resolved).
            Demo attempts never contribute to this evidence. {evidence.latest ? `Latest: ${evidence.latest.examName ?? evidence.latest.examId} — ${evidence.latest.pct}%.` : ''}
          </p>
        </div>
      ) : (
        <p className="py-4 text-center text-xs text-slate-400">
          No exam evidence yet — complete a practice exam in the AI Exam Conducting Agent (manual mode) to build it.
        </p>
      )}
    </ChartCard>
  )
}

export { ExamEvidenceCard }
export default ExamEvidenceCard
