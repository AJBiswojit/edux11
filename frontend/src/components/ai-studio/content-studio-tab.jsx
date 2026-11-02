/**
 * MediXO EduX — AI Teaching Studio · Tab 3: Content Studio.
 * Generate 14 types of teaching material — each editable and savable.
 * MCQs pull real question texts from the question bank when available.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, Briefcase, ClipboardList, FileText, FlaskConical, ListChecks,
  MessageSquare, Network, Presentation, RefreshCw, Scale, Sigma, Wand2, Wrench, Zap,
} from 'lucide-react'
import { useSaveStudioItem } from '@/services/extra'
import { generateStudioContent } from '@/intelligence/faculty'
import { Badge, Button, Card, Field, Select, SelectItem, Textarea, useToast } from '@/components/ui'

const ICON_MAP = {
  BookOpen, Presentation, ClipboardList, ListChecks, FileText, Briefcase, MessageSquare,
  FlaskConical, Wrench, Scale, RefreshCw, Sigma, Zap, Network,
}

function ContentStudioTab({ data }) {
  const { mutateAsync: saveStudio } = useSaveStudioItem()
  const types = data.derived.aiStudio?.contentTypes ?? []
  const [selected, setSelected] = useState(null)
  const [config, setConfig] = useState({ course: 'CS501', topic: 'Graph Algorithms', count: 10, difficulty: 'Medium' })
  const [generated, setGenerated] = useState(null)
  const [editText, setEditText] = useState('')
  const toast = useToast()

  const generate = () => {
    const out = generateStudioContent({ type: selected.id, config, derived: data.derived, datasets: data.datasets })
    setGenerated(out)
    setEditText(JSON.stringify(out.items ?? out.sections ?? out.slides ?? [], null, 2).slice(0, 4000))
    toast.success(`${selected.name} generated ✨`, out.meta)
  }

  const save = async () => {
    if (!generated) return
    try {
      await saveStudio({ kind: 'content', item: { title: generated.title, type: generated.type, meta: generated.meta } })
      toast.success('Content saved 💾', `"${generated.title}" added to your teaching history.`)
    } catch {
      toast.error('Could not save', 'Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Type catalogue */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {types.map((t, i) => {
          const Icon = ICON_MAP[t.icon] ?? FileText
          return (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => { setSelected(t); setGenerated(null) }}
              className={`rounded-3xl border p-4 text-left transition-all ${selected?.id === t.id ? 'border-indigo-400 bg-indigo-50/70 shadow-md dark:border-indigo-500/40 dark:bg-indigo-500/10' : 'border-slate-200/70 bg-white shadow-card hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lift dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30'}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${selected?.id === t.id ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300'}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-2.5 text-[11.5px] font-bold leading-tight text-slate-800 dark:text-slate-100">{t.name}</p>
              <p className="mt-1 hidden text-[9.5px] leading-snug text-slate-400 xl:block">{t.description}</p>
            </motion.button>
          )
        })}
      </div>

      {/* Generator config */}
      {selected && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                <Wand2 className="mr-1 inline h-3.5 w-3.5" /> {selected.name}
              </p>
              <p className="mt-1 text-[12px] text-slate-400">{selected.description}</p>
            </div>
            <Badge variant="outline" size="sm">default {selected.defaultCount} items</Badge>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Course">
              <Select value={config.course} onValueChange={(v) => setConfig((c) => ({ ...c, course: v }))}>
                {['CS501', 'CS503', 'CS505', 'CS506'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </Select>
            </Field>
            <Field label="Topic / chapter">
              <Select value={config.topic} onValueChange={(v) => setConfig((c) => ({ ...c, topic: v }))}>
                {['Graph Algorithms', 'Dynamic Programming', 'Sorting & Searching', 'Trees & Heaps', 'CPU Scheduling', 'Memory Management', 'Synchronisation', 'Network flows', 'Regression', 'Neural Networks'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </Select>
            </Field>
            <Field label="Difficulty">
              <Select value={config.difficulty} onValueChange={(v) => setConfig((c) => ({ ...c, difficulty: v }))}>
                {['Easy', 'Medium', 'Hard'].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </Select>
            </Field>
            <Field label="Count">
              <Select value={String(config.count)} onValueChange={(v) => setConfig((c) => ({ ...c, count: Number(v) }))}>
                {[5, 8, 10, 12, 15, 20].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </Select>
            </Field>
          </div>

          <Button className="mt-5" onClick={generate}>
            <Wand2 className="h-4 w-4" /> Generate {selected.name.toLowerCase()}
          </Button>
        </Card>
      )}

      {/* Generated output */}
      {generated && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">{generated.title}</h3>
                <p className="mt-1 text-[11.5px] text-slate-400">{generated.meta} · generated from your foundation</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={save}><Wand2 className="h-3.5 w-3.5" /> Save</Button>
                <Button size="sm" variant="outline" onClick={() => toast.success('Exporting…', `${generated.title} exported as PDF.`)}>Export</Button>
              </div>
            </div>

            {/* Readable preview */}
            <div className="mt-4 space-y-2.5">
              {(generated.items ?? generated.sections ?? generated.slides ?? []).map((item, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                  {item.heading && <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{item.heading}</p>}
                  {item.band && <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{item.band}</p>}
                  {item.label && <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{item.label}</p>}
                  {item.title && <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{item.title}</p>}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.no != null && <Badge variant="secondary" size="sm">Q{item.no}</Badge>}
                    {item.marks != null && <Badge variant="outline" size="sm">{item.marks} marks</Badge>}
                    {item.difficulty && <Badge variant={item.difficulty === 'Hard' ? 'danger' : item.difficulty === 'Medium' ? 'warning' : 'success'} size="sm">{item.difficulty}</Badge>}
                    {item.bloom && <Badge variant="outline" size="sm">{item.bloom}</Badge>}
                    {item.slide != null && <Badge variant="secondary" size="sm">Slide {item.slide}</Badge>}
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">{item.text ?? item.content ?? item.scenario ?? item.fact ?? ''}</p>
                  {(item.points ?? []).length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {item.points.map((pt) => <li key={pt} className="text-[11.5px] text-slate-500 dark:text-slate-400">· {pt}</li>)}
                    </ul>
                  )}
                  {(item.tests ?? []).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {item.tests.map((t) => <Badge key={t} variant="outline" size="sm">{t}</Badge>)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Editor */}
            <div className="mt-4">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">Editor — make it yours</p>
              <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={8} className="font-mono text-[11px]" />
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

export { ContentStudioTab }
export default ContentStudioTab
