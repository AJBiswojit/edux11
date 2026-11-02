import { motion } from 'framer-motion'
import { KeyRound, Plus, RefreshCw, ShieldCheck, Webhook } from 'lucide-react'
import { useAdminApiConfig } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, useToast } from '@/components/ui'
import { useState } from 'react'

function ApiConfig() {
  const { data, isLoading, isError, refetch } = useAdminApiConfig()
  const [open, setOpen] = useState(false)
  const [reveal, setReveal] = useState({})
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Governance · API Configuration"
        title="API & integrations"
        description="Endpoints, webhooks and API keys — the integration surface for ERP, LMS and partner systems."
        breadcrumbs={[{ label: 'Admin' }, { label: 'API Configuration' }]}
        actions={
          <Button size="sm" onClick={() => toast.info('Unavailable', 'API keys are not available yet.')}>
            <KeyRound className="h-4 w-4" /> Generate API key
          </Button>
        }
      />

      {/* Endpoints */}
      <h2 className="mb-4 text-[15px] font-bold text-slate-900 dark:text-white">Endpoints</h2>
      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="overflow-x-auto scrollbar-thin"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Endpoint</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Method</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Path</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Usage</th>
                <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Latency</th>
                <th className="px-5 py-3.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Version</th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.endpoints ?? []).map((e, i) => (
                <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-100">{e.name}</td>
                  <td className="px-5 py-3.5"><Badge variant="secondary" size="sm">{e.method}</Badge></td>
                  <td className="px-5 py-3.5 font-mono text-[12px] text-slate-500 dark:text-slate-400">{e.path}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">{e.usage}</td>
                  <td className="px-5 py-3.5 text-center font-semibold text-slate-600 dark:text-slate-300">{e.latency}ms</td>
                  <td className="px-5 py-3.5 text-center"><Badge variant="outline" size="sm">{e.version}</Badge></td>
                  <td className="px-5 py-3.5 text-right">
                    <Badge variant={e.status === 'Healthy' ? 'success' : 'warning'}>{e.status}</Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
</div>        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Webhooks */}
        <Card className="p-6">
          <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <Webhook className="h-4 w-4 text-indigo-500" /> Webhooks
          </p>
          <div className="mt-4 space-y-3">
            {(data?.webhooks ?? []).map((w, i) => (
              <motion.div key={w.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{w.name}</p>
                  <Badge variant={w.status === 'Active' ? 'success' : 'secondary'}>{w.status}</Badge>
                </div>
                <p className="mt-1 truncate font-mono text-[11px] text-slate-400">{w.url}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {(w.events || []).map((ev) => <Badge key={ev} variant="outline" size="sm">{ev}</Badge>)}
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">{w.lastDelivery !== '—' ? `last delivery ${w.lastDelivery}` : 'never delivered'}</span>
                </div>
              </motion.div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => toast.info('New webhook', 'Register a receiver URL and choose events.')}>
            <Plus className="h-3.5 w-3.5" /> Add webhook
          </Button>
        </Card>

        {/* Keys */}
        <Card className="p-6">
          <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <KeyRound className="h-4 w-4 text-emerald-500" /> API keys
          </p>
          <div className="mt-4 space-y-3">
            {(data?.keys ?? []).map((k, i) => (
              <motion.div key={k.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{k.name}</p>
                  <Badge variant={k.status === 'Active' ? 'success' : k.status === 'Revoked' ? 'danger' : 'secondary'}>{k.status}</Badge>
                </div>
                <button
                  onClick={() => setReveal((r) => ({ ...r, [k.id]: !r[k.id] }))}
                  className="mt-2 block w-full truncate rounded-lg bg-slate-50 px-3 py-1.5 text-left font-mono text-[11px] text-slate-500 transition-colors hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400"
                  aria-label="Toggle key visibility"
                >
                  {reveal[k.id] ? k.key.replaceAll('•', '') : k.key}
                </button>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(k.scopes || []).map((s) => <Badge key={s} variant="outline" size="sm">{s}</Badge>)}
                </div>
                <p className="mt-2 text-[10px] font-medium text-slate-400">Created {k.created} · last used {k.lastUsed}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 text-[11px] leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
            Keys are shown once at creation. Rotate immediately if a key is ever exposed — revocation is instant.
          </div>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-indigo-500" /> Generate API key</DialogTitle>
            <DialogDescription>Keys inherit the calling role's permissions. Store it securely — it's shown once.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Key name" required><Input placeholder="e.g. ERP Sync — Production" /></Field>
            <Field label="Environment">
              <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                <option>Production</option><option>Staging</option><option>Development</option>
              </select>
            </Field>
            <Field label="Scopes">
              <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                <option>Read-only</option><option>Read + write</option><option>Full access</option>
              </select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { setOpen(false); toast.info('Unavailable', 'API keys are not available yet.') }}>
              <RefreshCw className="h-4 w-4" /> Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { ApiConfig }
export default ApiConfig
