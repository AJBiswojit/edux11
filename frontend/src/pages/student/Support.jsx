import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, Headphones, LifeBuoy, MessageCircle, Plus, Star } from 'lucide-react'
import { useSupportTickets, useCreateSupportTicket } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Field, Input, Textarea, useToast } from '@/components/ui'
import { SUPPORT_STATUS_STYLES } from '@/constants/ui'
import { CreateTicketDialog, SupportHelpChannels, TicketFilter, TicketList } from '@/components/support'
import { formatRelative } from '@/utils/format'

const CHANNELS = [
  { icon: LifeBuoy, title: 'Help centre', desc: '400+ articles on every module — searchable and updated weekly.', cta: 'Browse articles', color: 'from-indigo-500 to-blue-500' },
  { icon: Headphones, title: 'AI support assistant', desc: 'Instant answers to common questions, 24×7, in any language.', cta: 'Chat now', color: 'from-teal-500 to-emerald-500' },
  { icon: MessageCircle, title: 'Human support', desc: 'Escalate anytime — tickets route to the right team within minutes.', cta: 'Open a ticket', color: 'from-amber-500 to-orange-500' },
]

function Support() {
  const { data, isLoading, isError, refetch } = useSupportTickets()
  const { mutateAsync: createTicket } = useCreateSupportTicket()
  const [filter, setFilter] = useState('All')
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const tickets = useMemo(() => (data?.tickets ?? []).filter((t) => filter === 'All' || t.status === filter), [data, filter])

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const submit = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const title = String(fd.get('title') ?? '').trim()
    if (title.length < 5) {
      toast.error('Almost there', 'Please describe the issue in a few words.')
      return
    }
    setSubmitting(true)
    try {
      await createTicket({ title, category: fd.get('category'), priority: fd.get('priority'), detail: fd.get('detail') })
      toast.success('Ticket created ✓', 'Our support team will respond within 24 hours.')
      setOpen(false)
    } catch {
      toast.error('Could not create ticket', 'Please try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderTicket = (t) => (
    <Card className="group h-full p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${t.status === 'Resolved' ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 ring-1 ring-emerald-500/20' : 'bg-gradient-to-br from-indigo-500/10 to-blue-500/10 text-indigo-600 ring-1 ring-indigo-500/20'}`}>
            {t.status === 'Resolved' ? <CheckCircle2 className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
          </span>
          <div>
            <h3 className="text-[14.5px] font-bold leading-snug text-slate-900 dark:text-white">{t.title}</h3>
            <p className="text-[11px] text-slate-400">{t.category} · created {formatRelative(t.created)}</p>
          </div>
        </div>
        <Badge variant={SUPPORT_STATUS_STYLES[t.status]}>{t.status}</Badge>
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3.5 text-[11px] font-medium text-slate-400 dark:border-slate-800">
        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {t.messages} messages</span>
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> updated {formatRelative(t.updated)}</span>
        <Badge variant={t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warning' : 'secondary'} size="sm">{t.priority}</Badge>
        {t.satisfaction && (
          <span className="ml-auto flex items-center gap-1 font-bold text-amber-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {t.satisfaction}/5
          </span>
        )}
      </div>
    </Card>
  )

  return (
    <div>
      <PageHeader
        eyebrow="Account · Support"
        title="Help & support"
        description="24×7 knowledge base, AI assistant, and human support tickets — average first response under 6 hours."
        breadcrumbs={[{ label: 'Student' }, { label: 'Support' }]}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New ticket
          </Button>
        }
      />

      <SupportHelpChannels channels={CHANNELS} />

      <TicketFilter filter={filter} onFilter={setFilter} count={tickets.length} />

      <TicketList tickets={tickets} renderTicket={renderTicket} />

      <CreateTicketDialog
        open={open}
        onOpenChange={setOpen}
        description="Describe your issue — attach anything relevant and we'll route it to the right team."
        onSubmit={submit}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create ticket'}</Button>
          </>
        }
      >
        <Field label="Subject" required>
          <Input name="title" placeholder="Brief summary of the issue" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select name="category" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
              <option>Technical</option><option>Records</option><option>Academic</option><option>Finance</option><option>How-to</option><option>Other</option>
            </select>
          </Field>
          <Field label="Priority">
            <select name="priority" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
              <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
            </select>
          </Field>
        </div>
        <Field label="Details" required>
          <Textarea name="detail" rows={4} placeholder="What happened? What did you expect? Any error messages…" />
        </Field>
      </CreateTicketDialog>
    </div>
  )
}

export { Support }
export default Support
