import { useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Bot, Gauge, Sparkles, Zap } from 'lucide-react'
import { useAdminAiConfig } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Progress, Switch, useToast } from '@/components/ui'

function AiConfig() {
  const { data, isLoading, isError, refetch } = useAdminAiConfig()
  const [guardrails, setGuardrails] = useState(null)
  const toast = useToast()
  const g = guardrails ?? data?.guardrails ?? {}

  const toggle = (key) => {
    setGuardrails((prev) => ({ ...(prev ?? data.guardrails), [key]: !(prev ?? data.guardrails)[key] }))
    toast.info('Unavailable', 'AI guardrails cannot be saved yet.')
  }

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Governance · AI Configuration"
        title="AI configuration"
        description="Models, quotas, guardrails and prompts — full control over the institution's AI behaviour."
        breadcrumbs={[{ label: 'Admin' }, { label: 'AI Configuration' }]}
        actions={<Badge variant="gradient" className="px-3 py-1"><Sparkles className="h-3 w-3" /> MediXO LLM v4.2</Badge>}
      />

      {/* Models */}
      <h2 className="mb-4 text-[15px] font-bold text-slate-900 dark:text-white">AI models</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(data?.models ?? []).map((m, i) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${m.status === 'Healthy' ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 ring-1 ring-emerald-500/20' : 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600 ring-1 ring-amber-500/20'}`}>
                  <Bot className="h-5 w-5" />
                </span>
                <Badge variant={m.status === 'Healthy' ? 'success' : 'warning'}>{m.status}</Badge>
              </div>
              <h3 className="mt-3 text-[14px] font-bold text-slate-900 dark:text-white">{m.name}</h3>
              <p className="text-[11px] text-slate-400">{m.provider} · {m.version}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{m.role}</p>
              <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> {m.latency}ms</span>
                <span>{m.usage}% load</span>
              </div>
              <Progress value={m.usage} className="mt-1.5 h-1.5" gradient={m.status === 'Healthy' ? 'from-emerald-500 to-teal-400' : 'from-amber-500 to-orange-400'} />
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Quotas */}
        <ChartCard title="Usage quotas" subtitle="Current period · resets monthly">
          <div className="space-y-4">
            {(data?.quotas ?? []).map((q) => {
              const pct = Math.round((q.current / q.limit) * 100)
              return (
                <div key={q.feature}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{q.feature}</span>
                    <span className="font-bold text-slate-500 dark:text-slate-300">
                      {q.current.toLocaleString()} / {q.limit.toLocaleString()} <span className="text-slate-300 dark:text-slate-600">{q.unit}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <Progress value={pct} className="flex-1" gradient={pct > 85 ? 'from-rose-500 to-red-400' : pct > 60 ? 'from-amber-500 to-orange-400' : 'from-indigo-500 to-blue-400'} />
                    <span className={`w-10 text-right text-[11px] font-bold ${pct > 85 ? 'text-rose-500' : 'text-slate-400'}`}>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>

        {/* Guardrails */}
        <ChartCard title="Guardrails & safety" subtitle="Applied to every AI request">
          <div className="space-y-1">
            {[
              { key: 'safeMode', label: 'Safe mode', desc: 'Block harmful, exam-invalid content instantly' },
              { key: 'filterHate', label: 'Hate & harassment filter', desc: 'Zero tolerance on abusive language in prompts' },
              { key: 'filterPlagiarism', label: 'Plagiarism screening', desc: 'Flag AI-copied submissions for faculty review' },
              { key: 'requireCitations', label: 'Citation requirement', desc: 'Every factual AI answer must cite sources' },
              { key: 'allowMultilingual', label: 'Multilingual support', desc: 'English, Hindi + 12 Indian and global languages' },
              { key: 'allowVoice', label: 'Voice interactions', desc: 'Enable speech input for tutor and copilot' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 rounded-2xl px-2 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <div>
                  <p className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100">{item.label}</p>
                  <p className="text-[11px] text-slate-400">{item.desc}</p>
                </div>
                <Switch checked={g[item.key]} onCheckedChange={() => toggle(item.key)} />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Prompt templates */}
      <h2 className="mb-4 mt-8 text-[15px] font-bold text-slate-900 dark:text-white">Prompt templates</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {(data?.prompts ?? []).map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-center justify-between">
                <p className="text-[13.5px] font-bold text-slate-900 dark:text-white">{p.name}</p>
                <Badge variant="secondary" size="sm">v{p.id.slice(1)}</Badge>
              </div>
              <p className="mt-2.5 rounded-2xl bg-slate-50 p-3.5 font-mono text-[11px] leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                {p.template}
              </p>
              <p className="mt-2.5 text-[10px] font-medium text-slate-400">Updated {p.updated}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-600 to-teal-500 p-6 text-white shadow-lift">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[14.5px] font-bold">AI budget this period: not tracked</p>
            <p className="text-xs text-white/80">AI cost reporting is not available yet.</p>
          </div>
        </div>
        <Button variant="secondary" className="bg-white text-indigo-700 hover:bg-indigo-50" onClick={() => toast.info('Unavailable', 'AI cost reporting is not available yet.')}>
          <Gauge className="h-4 w-4" /> Cost report
        </Button>
      </div>
    </div>
  )
}

export { AiConfig }
export default AiConfig
