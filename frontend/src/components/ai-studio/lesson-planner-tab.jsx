/**
 * MediXO EduX — AI Teaching Studio · Tab 2: Lesson Planner.
 * Configure course/subject/chapter/LO/duration/method/difficulty →
 * AI generates the full lecture flow. Preview · edit · save · duplicate ·
 * export PDF (prototype). Saved plans persist via the studio save API.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpenCheck, Copy, PencilLine, Save, Sparkles, Wand2 } from 'lucide-react'
import { useSaveStudioItem } from '@/services/extra'
import { generateLessonPlan } from '@/intelligence/faculty'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Select, SelectItem, Textarea, useToast } from '@/components/ui'
import { WorkspaceSection } from '@/components/teaching-workspace/shared'

const COURSES = ['CS501', 'CS503', 'CS505', 'CS506']
const METHODS = ['Lecture + Practice', 'Flipped Classroom', 'Case Study', 'Problem-Based Learning', 'Peer Teaching', 'Demo + Lab']
const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

function LessonPlannerTab({ data }) {
  const { mutateAsync: saveStudio } = useSaveStudioItem()
  const saved = data.derived.aiStudio?.savedLessonPlans ?? []
  const [config, setConfig] = useState({ course: 'CS501', subject: 'Data Structures & Algorithms', chapter: 'Graph Algorithms', learningOutcome: 'Apply core concepts to solve problems', duration: 50, method: 'Lecture + Practice', difficulty: 'Medium' })
  const [plan, setPlan] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editingText, setEditingText] = useState('')
  const toast = useToast()

  const generate = () => {
    const p = generateLessonPlan({ config, derived: data.derived, datasets: data.datasets })
    setPlan(p)
    toast.success('Lesson plan generated ✨', `${p.title} — ${p.sections.length} sections ready for review.`)
  }

  const savePlan = async (p = plan) => {
    if (!p) return
    try {
      await saveStudio({ kind: 'lesson-plan', item: { title: p.title, meta: `${p.course} · ${p.duration} min · ${p.method}`, plan: p } })
      toast.success('Lesson plan saved 💾', `"${p.title}" added to your teaching history.`)
    } catch {
      toast.error('Could not save', 'Please try again.')
    }
  }

  const openEdit = (section) => {
    setEditing(section)
    setEditingText(section.content)
  }

  const commitEdit = () => {
    setPlan((prev) => ({ ...prev, sections: prev.sections.map((s) => (s.title === editing.title ? { ...s, content: editingText } : s)) }))
    setEditing(null)
    toast.success('Section updated', `"${editing.title}" saved in the plan.`)
  }

  return (
    <div className="space-y-6">
      {/* Config */}
      <Card className="p-6">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          <Wand2 className="h-3.5 w-3.5" /> AI lesson planner
        </p>
        <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">Configure the lecture</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Course">
            <Select value={config.course} onValueChange={(v) => setConfig((c) => ({ ...c, course: v }))}>
              {COURSES.map((c) => <SelectItem key={c} value={c}>{c} — {(data.datasets?.questionCoverage ?? []).find((x) => x.course === c)?.title ?? c}</SelectItem>)}
            </Select>
          </Field>
          <Field label="Chapter">
            <Select value={config.chapter} onValueChange={(v) => setConfig((c) => ({ ...c, chapter: v }))}>
              <SelectItem value="Graph Algorithms">Graph Algorithms</SelectItem>
              <SelectItem value="Dynamic Programming">Dynamic Programming</SelectItem>
              <SelectItem value="Sorting & Searching">Sorting & Searching</SelectItem>
              <SelectItem value="Trees & Heaps">Trees & Heaps</SelectItem>
              <SelectItem value="CPU Scheduling">CPU Scheduling</SelectItem>
              <SelectItem value="Memory Management">Memory Management</SelectItem>
              <SelectItem value="Synchronisation">Synchronisation</SelectItem>
              <SelectItem value="Network flows">Network flows</SelectItem>
            </Select>
          </Field>
          <Field label="Duration (min)">
            <Select value={String(config.duration)} onValueChange={(v) => setConfig((c) => ({ ...c, duration: Number(v) }))}>
              {[30, 45, 50, 60, 90].map((m) => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}
            </Select>
          </Field>
          <Field label="Teaching method">
            <Select value={config.method} onValueChange={(v) => setConfig((c) => ({ ...c, method: v }))}>
              {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </Select>
          </Field>
          <Field label="Difficulty">
            <Select value={config.difficulty} onValueChange={(v) => setConfig((c) => ({ ...c, difficulty: v }))}>
              {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </Select>
          </Field>
          <div className="sm:col-span-2 xl:col-span-3">
            <Field label="Learning outcome">
              <Input value={config.learningOutcome} onChange={(e) => setConfig((c) => ({ ...c, learningOutcome: e.target.value }))} />
            </Field>
          </div>
        </div>
        <Button className="mt-5" size="lg" onClick={generate}>
          <Sparkles className="h-4 w-4" /> Generate lesson plan
        </Button>
      </Card>

      {/* Generated plan */}
      {plan && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{plan.course} · {plan.subject}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{plan.title}</h3>
                <p className="mt-1 text-[11.5px] text-slate-400">{plan.coLine}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" size="sm">{plan.duration} min</Badge>
                <Badge variant="outline" size="sm">{plan.method}</Badge>
                <Badge variant={plan.difficulty === 'Hard' ? 'danger' : plan.difficulty === 'Medium' ? 'warning' : 'success'} size="sm">{plan.difficulty}</Badge>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {plan.objectives.map((o, i) => (
                <div key={o} className="flex items-start gap-2 rounded-xl bg-indigo-50/60 px-3.5 py-2.5 text-[12px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">{i + 1}</span>
                  {o}
                </div>
              ))}
            </div>

            {plan.revisionNote && (
              <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-2.5 text-[11.5px] font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                {plan.revisionNote}
              </p>
            )}

            <div className="mt-5 space-y-2.5">
              {plan.sections.map((s, i) => (
                <div key={s.title} className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-[11px] font-bold text-white shadow-md">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.title}</p>
                      {s.minutes > 0 && <Badge variant="outline" size="sm">{s.minutes} min</Badge>}
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{s.content}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={() => openEdit(s)}>
                    <PencilLine className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={() => savePlan()}><Save className="h-4 w-4" /> Save plan</Button>
              <Button variant="outline" onClick={() => { const copy = { ...plan, title: `${plan.title} (copy)` }; setPlan(copy); toast.success('Duplicated', 'Working copy created — edit and save.') }}>
                <Copy className="h-4 w-4" /> Duplicate
              </Button>
              <Button variant="outline" onClick={() => toast.success('Exporting…', `${plan.title} exported as PDF.`)}>Export PDF</Button>
              <Button variant="ghost" onClick={() => setPlan(null)}>Discard</Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Saved plans */}
      {saved.length > 0 && (
        <WorkspaceSection title="Saved lesson plans" subtitle="From your teaching history" icon={BookOpenCheck}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {saved.slice(0, 4).map((p) => (
              <Card key={p.id} className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{p.course} · {p.chapter}</p>
                <h4 className="mt-1 text-[14px] font-bold text-slate-900 dark:text-white">{p.title}</h4>
                <p className="mt-1 text-[11px] text-slate-400">{p.duration} min · {p.method} · created {p.created}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setPlan(p); toast.info('Loaded', 'Saved plan opened in the editor.') }}>Open</Button>
                  <Button size="sm" variant="ghost" onClick={() => savePlan(p)}><Save className="h-3.5 w-3.5" /> Re-save</Button>
                </div>
              </Card>
            ))}
          </div>
        </WorkspaceSection>
      )}

      {/* Edit section dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit — {editing?.title}</DialogTitle>
            <DialogDescription>Refine the AI-generated content before saving the plan.</DialogDescription>
          </DialogHeader>
          <Textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} rows={7} className="text-sm" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={commitEdit}><PencilLine className="h-4 w-4" /> Save section</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { LessonPlannerTab }
export default LessonPlannerTab
