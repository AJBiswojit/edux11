/**
 * MediXO EduX — Administrator · Support.
 * Lightweight admin support: help center, FAQs, getting started, contact,
 * report an issue, feature requests, system status. Frontend-only
 * interactions (toasts) — no backend tickets.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, CheckCircle2, Headphones, HelpCircle, LifeBuoy, MessageSquare, Rocket, Wrench } from 'lucide-react'
import { useCreateAdminSupportTicket } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Select, SelectItem, Textarea, useToast } from '@/components/ui'

const FAQS = [
  { q: 'How do I interpret the institution health score?', a: 'The score is a weighted blend of six pillars — academic health, student success, attendance, assessment, faculty and outcomes. It updates from the intelligence foundation whenever you open the Command Center.' },
  { q: 'Where can I find department-level analytics?', a: 'Open Institution Intelligence → Department Intelligence, or generate a Department Comparison Report from Reports → Department Comparison.' },
  { q: 'How are the AI insights generated?', a: 'The Executive AI reads your current institution data and generates its answers from it — it never invents data outside that.' },
  { q: 'What do the intervention levels mean?', a: 'Critical = act immediately, Needs Attention = act this week, Improving = sustain momentum. Every intervention includes evidence and a recommended action.' },
]

const STATUS = [
  { label: 'Platform', value: 'Operational', ok: true },
  { label: 'AI services', value: 'Operational', ok: true },
  { label: 'Data sync', value: 'Operational', ok: true },
  { label: 'API gateway', value: 'Operational', ok: true },
]

function Support() {
  const toast = useToast()
  const [open, setOpen] = useState(null) // 'issue' | 'feature' | null
  const [category, setCategory] = useState('Technical')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const createTicket = useCreateAdminSupportTicket()

  const submit = async (kind) => {
    try {
      await createTicket.mutateAsync({ title: title || (kind === 'issue' ? 'Issue' : 'Feature request'), body: details, category })
      setOpen(null)
      setTitle('')
      setDetails('')
      toast.success(kind === 'issue' ? 'Issue reported' : 'Feature requested', 'Saved as a support ticket.')
    } catch (err) {
      toast.error('Submit failed', err?.response?.data?.detail || 'Could not create ticket.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Administrator · Support"
        title="Admin support"
        description="Help centre, FAQs, getting started and contact — plus system status at a glance."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Support' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen('issue')}><Wrench className="h-4 w-4" /> Report an issue</Button>
            <Button size="sm" onClick={() => setOpen('feature')}><Rocket className="h-4 w-4" /> Feature request</Button>
          </div>
        }
      />

      {/* Help channels */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: LifeBuoy, title: 'Help centre', desc: 'Guides on every admin surface — Command Center, Institution Intelligence, Reports and Executive AI.', cta: 'Browse help', color: 'from-indigo-500 to-blue-500' },
          { icon: Headphones, title: 'Contact support', desc: 'Reach the institution support desk — average first response under 6 hours.', cta: 'Contact team', color: 'from-teal-500 to-emerald-500' },
          { icon: BookOpen, title: 'Getting started', desc: 'New to the platform? Tour the Command Center, then explore intelligence, reports and AI.', cta: 'Start tour', color: 'from-amber-500 to-orange-500' },
        ].map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${c.color} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-[15px] font-bold text-slate-900 dark:text-white">{c.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">{c.desc}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => toast.info(c.title, 'Prototype — this channel would open here.')}>{c.cta}</Button>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* FAQs */}
      <h2 className="mb-3.5 mt-8 flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
        <HelpCircle className="h-4 w-4 text-indigo-500" /> Frequently asked questions
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {FAQS.map((f) => (
          <Card key={f.q} className="p-5">
            <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{f.q}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{f.a}</p>
          </Card>
        ))}
      </div>

      {/* System status */}
      <h2 className="mb-3.5 mt-8 flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
        <MessageSquare className="h-4 w-4 text-emerald-500" /> System status
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATUS.map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-4">
            <CheckCircle2 className={`h-4 w-4 shrink-0 ${s.ok ? 'text-emerald-500' : 'text-rose-500'}`} />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{s.label}</p>
              <p className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Report issue / feature dialog */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{open === 'issue' ? 'Report an issue' : 'Request a feature'}</DialogTitle>
            <DialogDescription>Creates a support ticket for this institution.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Title" required><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={open === 'issue' ? 'e.g. Department comparison chart looks wrong' : 'e.g. Add export to weekly review email'} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <Select value={category} onValueChange={setCategory}>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Analytics">Analytics</SelectItem>
                  <SelectItem value="Reports">Reports</SelectItem>
                  <SelectItem value="AI">AI</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </Select>
              </Field>
              <Field label="Priority">
                <Select defaultValue="Medium">
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </Select>
              </Field>
            </div>
            <Field label="Details">
              <Textarea rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Describe the issue or feature…" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={() => submit(open)}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Support }
export default Support
