import { useState } from 'react'
import { Bell, BookOpen, CalendarClock, Clock, ShieldCheck } from 'lucide-react'
import { useFacultySettings } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Button, Card, Select, SelectItem, Switch, useToast } from '@/components/ui'
import { SettingRow, SettingsProfileCard } from '@/components/settings'

function Settings() {
  const { data, isLoading, isError, refetch } = useFacultySettings()
  const [prefs, setPrefs] = useState(null)
  const [ai, setAi] = useState(null)
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const p = prefs ?? data.teachingPrefs
  const a = ai ?? data.aiSettings

  const toggle = (key, value, kind = 'prefs') => {
    const patch = kind === 'prefs' ? { ...p, [key]: value } : { ...a, [key]: value }
    if (kind === 'prefs') setPrefs(patch)
    else setAi(patch)
    toast.success('Saved', 'Setting applied instantly.')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Account · Settings"
        title="Settings"
        description="Teaching preferences, AI behaviour and notification controls for your classes."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Settings' }]}
      />

      <SettingsProfileCard
        name={data.profile?.name || 'Faculty'}
        badge={{ label: 'Verified faculty', variant: 'success' }}
        subtitle={[data.profile?.designation, data.profile?.department].filter(Boolean).join(' · ') || 'Faculty account'}
        contact={[data.profile?.email, data.profile?.phone].filter(Boolean).join(' · ') || '—'}
        extra={
          (data.profile?.officeHours || data.profile?.room) ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
            <Clock className="h-3 w-3" /> Office hours: {data.profile.officeHours || '—'} · {data.profile.room || '—'}
          </p>
          ) : null
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => toast.info('Edit profile', 'Profile editing opens the registrar-approved editor.')}>
            Edit profile
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="divide-y divide-slate-100 p-6 dark:divide-slate-800">
          <div className="flex items-center gap-2 pb-3">
            <BookOpen className="h-4 w-4 text-teal-500" />
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Teaching preferences</h3>
          </div>
          <SettingRow tone="faculty" icon={Bell} title="Auto-grade with AI" desc="AI pre-grades submissions; you review and approve.">
            <Switch checked={p.autoGradeWithAI} onCheckedChange={(v) => toggle('autoGradeWithAI', v)} />
          </SettingRow>
          <SettingRow tone="faculty" icon={Bell} title="AI-draft lessons" desc="Assistant drafts lesson structures from your topics.">
            <Switch checked={p.aiDraftLessons} onCheckedChange={(v) => toggle('aiDraftLessons', v)} />
          </SettingRow>
          <SettingRow tone="faculty" icon={Bell} title="Submission alerts" desc="Notify me the moment a student submits.">
            <Switch checked={p.notifyOnSubmission} onCheckedChange={(v) => toggle('notifyOnSubmission', v)} />
          </SettingRow>
          <SettingRow tone="faculty" icon={CalendarClock} title="Weekly class summary" desc="A Monday digest of class health and flags.">
            <Switch checked={p.weeklySummary} onCheckedChange={(v) => toggle('weeklySummary', v)} />
          </SettingRow>
          <SettingRow tone="faculty" icon={BookOpen} title="Student polls" desc="Allow quick comprehension polls during lectures.">
            <Switch checked={p.allowStudentPolls} onCheckedChange={(v) => toggle('allowStudentPolls', v)} />
          </SettingRow>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 pb-3">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">AI behaviour</h3>
            </div>
            <div className="space-y-4 pt-1">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">Grading strictness</p>
                <Select defaultValue={a.gradingStrictness}>
                  <SelectItem value="Lenient">Lenient — generous partial credit</SelectItem>
                  <SelectItem value="Standard">Standard — rubric-based</SelectItem>
                  <SelectItem value="Strict">Strict — exact rubrics only</SelectItem>
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">Assistant language</p>
                <Select defaultValue={a.language}>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="हिन्दी">हिन्दी</SelectItem>
                  <SelectItem value="English + हिन्दी">Bilingual</SelectItem>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <div>
                  <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Require citations</p>
                  <p className="text-[11px] text-slate-400">Every AI answer cites its sources.</p>
                </div>
                <Switch checked={a.citationsRequired} onCheckedChange={(v) => toggle('citationsRequired', v, 'ai')} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 pb-3">
              <Bell className="h-4 w-4 text-amber-500" />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Quiet hours</h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Notifications pause between 10 PM and 7 AM unless a student flags urgent help.
            </p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-300">
              🌙 10:00 PM – 7:00 AM · IST
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export { Settings }
export default Settings
