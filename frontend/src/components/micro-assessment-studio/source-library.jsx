import { useEffect, useMemo } from 'react'
import { BookOpen, Check, FileText, Filter, Library, Search, Sparkles, X } from 'lucide-react'
import { Badge, Button, Card, Field, Input, Select, SelectItem, Textarea } from '@/components/ui'
import { EmptyState } from '@/components/shared/empty-state'
import { activeSourceFilters, deriveSourceFilterOptions, sanitizeSourceFilters, sourceMatchesFilters } from './source-library-filters'

const DOMAIN_LABELS = { university: 'University', competitive: 'Competitive' }
const DOMAIN_BADGES = { university: 'info', competitive: 'warning' }
const INITIAL_FILTERS = { search: '', domain: '', examFamily: '', subject: '', chapter: '', topic: '', sourceType: '' }

function SourceContext({ source }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={DOMAIN_BADGES[source.domain] ?? 'secondary'} size="sm">{DOMAIN_LABELS[source.domain] ?? source.domain}</Badge>
      {source.examFamily && <Badge variant="secondary" size="sm">{source.examFamily}</Badge>}
      <Badge variant="outline" size="sm">{source.sourceType}</Badge>
    </div>
  )
}

export function SourceCard({ source, onUseSource }) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600/10 to-teal-500/15 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-900 dark:text-white">{source.title}</h3>
          <div className="mt-2"><SourceContext source={source} /></div>
        </div>
      </div>
      <dl className="mt-3 space-y-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        <div className="flex gap-2"><dt className="font-bold text-slate-400">Subject</dt><dd className="truncate">{source.subject}</dd></div>
        <div className="flex gap-2"><dt className="font-bold text-slate-400">Chapter</dt><dd className="truncate">{source.chapter}</dd></div>
        <div className="flex gap-2"><dt className="font-bold text-slate-400">Topic</dt><dd className="truncate">{source.topic}</dd></div>
      </dl>
      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <span className="text-[10.5px] font-semibold text-slate-400">{source.wordCount} words · {source.estimatedReadingTime} min read</span>
        <Button type="button" size="sm" onClick={() => onUseSource(source)} aria-label={`Use sample ${source.title}`}>
          <Sparkles className="h-3 w-3" /> Use Sample
        </Button>
      </div>
    </article>
  )
}

function FilterSelect({ label, value, placeholder, options = [], onChange, disabled = false, helper }) {
  const current = value || 'All'
  /* Keep an active value visible even in a deliberate no-match state caused by
     Search or Source Type. It remains selected and can be cleared to All. */
  const visibleOptions = current !== 'All' && !options.includes(current) ? [current, ...options] : options
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <Select
        value={current}
        onValueChange={(next) => onChange(next === 'All' ? '' : next)}
        disabled={disabled}
        active={current !== 'All'}
        group="source-library"
        ariaLabel={`${label} filter`}
      >
        <SelectItem value="All">{placeholder}</SelectItem>
        {visibleOptions.map((option) => <SelectItem key={option} value={option}>{option === 'university' ? 'University' : option === 'competitive' ? 'Competitive' : option}</SelectItem>)}
      </Select>
      {helper && <p className="text-[10px] font-medium text-slate-400">{helper}</p>}
    </div>
  )
}

function SearchFilter({ value, onChange }) {
  return (
    <div className="min-w-0 space-y-1 lg:col-span-2">
      <label htmlFor="micro-source-search" className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-400">Search</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <Input id="micro-source-search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search title, subject, chapter, topic or content…" className={`h-11 pl-9 text-xs ${value ? 'pr-9 border-indigo-300 bg-indigo-50/30 dark:border-indigo-500/50 dark:bg-indigo-500/5' : ''}`} aria-label="Search source library" />
        {value && <button type="button" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:hover:bg-slate-700" aria-label="Clear search"><X className="h-3.5 w-3.5" /></button>}
      </div>
    </div>
  )
}

export function SourceLibrary({ data, filters = INITIAL_FILTERS, onFiltersChange, onUseSource, onStartCustom, selectedSourceId, onSourceNoLongerVisible }) {
  const catalog = data?.filterCatalog ?? data?.items ?? []
  const options = deriveSourceFilterOptions(filters, catalog)
  const active = activeSourceFilters(filters)
  const update = (key, value) => {
    const proposed = { ...filters, [key]: value }
    onFiltersChange(sanitizeSourceFilters(proposed, catalog))
  }
  const clearAll = () => onFiltersChange({ ...INITIAL_FILTERS })
  const items = useMemo(() => catalog.length ? catalog.filter((source) => sourceMatchesFilters(source, filters)) : (data?.items ?? []), [catalog, filters, data?.items])
  const domain = filters.domain
  useEffect(() => {
    if (!selectedSourceId || !active.length || !onSourceNoLongerVisible) return
    if (!items.some((source) => source.id === selectedSourceId)) onSourceNoLongerVisible()
  }, [active.length, items, onSourceNoLongerVisible, selectedSourceId])
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300"><Library className="h-3.5 w-3.5" /> Source Library</p>
          <h2 className="mt-1 text-[17px] font-bold text-slate-900 dark:text-white">Start with teaching material</h2>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">Ten curated study passages are ready for a faculty review. Choose one, then edit the source before processing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><Badge variant="gradient" size="sm">{data?.total ?? 10} sample sources</Badge>{onStartCustom && <Button type="button" size="sm" variant="outline" onClick={onStartCustom}><FileText className="h-3 w-3" /> Paste custom</Button>}</div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SearchFilter value={filters.search} onChange={(value) => update('search', value)} />
        <FilterSelect label="Domain" value={filters.domain} placeholder="All domains" options={options.domains} onChange={(value) => update('domain', value)} />
        {domain === 'competitive' && <FilterSelect label="Exam Family" value={filters.examFamily} placeholder="All competitive exams" options={options.examFamilies} onChange={(value) => update('examFamily', value)} disabled={!filters.domain || filters.domain !== 'competitive'} helper={!filters.domain || filters.domain !== 'competitive' ? 'Select Competitive domain first' : undefined} />}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect label="Subject" value={filters.subject} placeholder="All subjects" options={options.subjects} onChange={(value) => update('subject', value)} disabled={!filters.domain} helper={!filters.domain ? 'Select a domain first' : undefined} />
        <FilterSelect label="Chapter" value={filters.chapter} placeholder="All chapters" options={options.chapters} onChange={(value) => update('chapter', value)} disabled={!filters.subject} helper={!filters.subject ? 'Select a subject first' : undefined} />
        <FilterSelect label="Topic" value={filters.topic} placeholder="All topics" options={options.topics} onChange={(value) => update('topic', value)} disabled={!filters.chapter} helper={!filters.chapter ? 'Select a chapter first' : undefined} />
        <FilterSelect label="Source Type" value={filters.sourceType} placeholder="All source types" options={options.sourceTypes} onChange={(value) => update('sourceType', value)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400"><Filter className="h-3.5 w-3.5" /> {active.length ? `${active.length} filter${active.length === 1 ? '' : 's'} active` : 'No filters active'}</span>
        {active.length > 0 && <div className="flex min-w-0 flex-wrap gap-1.5">{active.map((item) => <span key={item.key} className="inline-flex max-w-full items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[10.5px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"><span className="text-indigo-400">{item.label}:</span><span className="max-w-[12rem] truncate" title={String(item.value)}>{item.value}</span></span>)}</div>}
        {active.length > 0 && <Button type="button" size="sm" variant="ghost" className="ml-auto h-7 text-[11px] text-indigo-600 dark:text-indigo-300" onClick={clearAll}>Clear all filters</Button>}
        <span className="ml-auto text-[11px] font-semibold text-slate-400">{items.length} matching source{items.length === 1 ? '' : 's'}</span>
      </div>

      {items.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((source) => <SourceCard key={source.id} source={source} onUseSource={onUseSource} />)}
        </div>
      ) : (
        <div className="mt-4"><EmptyState compact icon={BookOpen} title="No sources match these filters" description="Try changing or clearing one of your filters." action={active.length > 0 ? <Button type="button" size="sm" variant="outline" onClick={clearAll}>Clear all filters</Button> : undefined} /></div>
      )}
    </Card>
  )
}

export function SourceEditor({ draft, onChange, errors = {}, onProcess, processing, processed }) {
  const set = (key, value) => onChange((current) => ({ ...current, [key]: value }))
  const hasDraft = !!draft
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Step 1 · Choose Source</p>
          <h2 className="mt-1 text-[17px] font-bold text-slate-900 dark:text-white">Teach EduX what to assess</h2>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">Paste a paragraph or use a curated sample. Metadata keeps the assessment in the right University, JEE or NEET context.</p>
        </div>
        {hasDraft && <Badge variant={processed ? 'success' : 'secondary'} size="sm">{processed ? <><Check className="h-3 w-3" /> Source processed</> : 'Editable source'}</Badge>}
      </div>

      {!hasDraft ? (
        <EmptyState compact className="mt-4" icon={FileText} title="No source selected" description="Choose Use Sample from the library above, or start a custom paragraph." />
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Source title" error={errors.title} required className="sm:col-span-2 lg:col-span-1"><Input value={draft.title ?? ''} onChange={(event) => set('title', event.target.value)} placeholder="e.g. Week 4 lecture — graph traversal" /></Field>
            <Field label="Domain" required>
              <Select value={draft.domain || 'university'} onValueChange={(value) => onChange((current) => ({ ...current, domain: value, examFamily: value === 'competitive' ? (current.examFamily || 'JEE') : null }))}>
                <SelectItem value="university">University</SelectItem>
                <SelectItem value="competitive">Competitive</SelectItem>
              </Select>
            </Field>
            {draft.domain === 'competitive' ? (
              <Field label="Exam family" error={errors.examFamily} required>
                <Select value={draft.examFamily || 'JEE'} onValueChange={(value) => set('examFamily', value)}>
                  <SelectItem value="JEE">JEE</SelectItem>
                  <SelectItem value="NEET">NEET</SelectItem>
                </Select>
              </Field>
            ) : <Field label="Exam family"><Input value="Not applicable" disabled aria-label="University exam family not applicable" /></Field>}
            <Field label="Subject" error={errors.subject} required><Input value={draft.subject ?? ''} onChange={(event) => set('subject', event.target.value)} placeholder="e.g. Computer Science" /></Field>
            <Field label="Chapter" error={errors.chapter} required><Input value={draft.chapter ?? ''} onChange={(event) => set('chapter', event.target.value)} placeholder="e.g. Data Structures" /></Field>
            <Field label="Topic" error={errors.topic} required><Input value={draft.topic ?? ''} onChange={(event) => set('topic', event.target.value)} placeholder="e.g. Graph Traversal" /></Field>
            <Field label="Source type"><Select value={draft.sourceType || 'Custom Text'} onValueChange={(value) => set('sourceType', value)}>
              {['Textbook', 'NCERT', 'Lecture Notes', 'PDF', 'Faculty Notes', 'Custom Text', 'NCERT / Study Material', 'Study Material'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </Select></Field>
          </div>
          <Field label="Paragraph / source content" error={errors.content} hint={`${draft.content?.trim().split(/\s+/).filter(Boolean).length ?? 0} words · edit sample content before processing`} required>
            <Textarea value={draft.content ?? ''} onChange={(event) => set('content', event.target.value)} rows={8} placeholder="Paste a paragraph of teaching material here…" className="resize-y leading-relaxed" />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="max-w-xl text-[10.5px] font-medium leading-relaxed text-slate-400"><Sparkles className="mr-1 inline h-3 w-3 text-indigo-500" />Prototype processing reads the selected source metadata; it does not call a real LLM or parse files.</p>
            <Button type="button" onClick={onProcess} disabled={processing} aria-busy={processing}>
              {processing ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Processing source…</> : <><Sparkles className="h-3.5 w-3.5" /> Process with AI</>}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

export default SourceLibrary
