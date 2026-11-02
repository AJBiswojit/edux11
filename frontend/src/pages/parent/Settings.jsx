import { useState } from 'react'
import { Bell, Briefcase, Download, Globe, Languages, Lock, Moon, ShieldCheck, User, Wallet } from 'lucide-react'
import { useParentSettings, useUpdateParentSettings } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Avatar, Badge, Button, Card, Select, SelectItem, Switch, useToast } from '@/components/ui'

function SettingRow({ icon: Icon, title, desc, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 ring-1 ring-emerald-500/15 dark:text-emerald-300">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{desc}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Settings() {
  const { data, isLoading, isError, refetch } = useParentSettings()
  const { mutateAsync: update } = useUpdateParentSettings()
  const [prefs, setPrefs] = useState(null)
  const [privacy, setPrivacy] = useState(null)
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const p = prefs ?? data.preferences
  const priv = privacy ?? data.privacy

  const toggle = async (key, value, kind) => {
    const next = kind === 'prefs' ? { ...p, [key]: value } : { ...priv, [key]: value }
    if (kind === 'prefs') setPrefs(next)
    else setPrivacy(next)
    await update(kind === 'prefs' ? { preferences: next } : { privacy: next }).catch(() => toast.error('Could not save'))
    toast.success('Saved', 'Setting applied instantly.')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Account · Settings"
        title="Settings & profile"
        description="Your family account — notifications, privacy and how MediXO EduX keeps you informed."
        breadcrumbs={[{ label: 'Parent' }, { label: 'Settings' }]}
      />

      {/* Profile */}
      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={data.profile.name} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{data.profile.name}</h2>
              <Badge variant="success">Verified guardian</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-400">{data.profile.occupation}</p>
            <p className="text-xs text-slate-400">{data.profile.email} · {data.profile.phone}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.info('Edit profile', 'Profile editing is available in the full editor.')}>
              <User className="h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.success('Exporting…', 'Your data archive is being prepared.')}>
              <Download className="h-4 w-4" /> Export data
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notifications */}
        <Card className="divide-y divide-slate-100 p-6 dark:divide-slate-800">
          <div className="flex items-center gap-2 pb-3">
            <Bell className="h-4 w-4 text-emerald-500" />
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Notifications</h3>
          </div>
          <SettingRow icon={Bell} title="Weekly digest" desc="A Sunday summary of Aarav's week.">
            <Switch checked={p.weeklyDigest} onCheckedChange={(v) => toggle('weeklyDigest', v, 'prefs')} />
          </SettingRow>
          <SettingRow icon={Bell} title="Grade alerts" desc="Instant alerts when major results publish.">
            <Switch checked={p.gradeAlerts} onCheckedChange={(v) => toggle('gradeAlerts', v, 'prefs')} />
          </SettingRow>
          <SettingRow icon={Bell} title="Attendance alerts" desc="Notify when attendance drops below 85%.">
            <Switch checked={p.attendanceAlerts} onCheckedChange={(v) => toggle('attendanceAlerts', v, 'prefs')} />
          </SettingRow>
          <SettingRow icon={Wallet} title="Fee reminders" desc="Reminders 7 and 2 days before due dates.">
            <Switch checked={p.feeReminders} onCheckedChange={(v) => toggle('feeReminders', v, 'prefs')} />
          </SettingRow>
          <SettingRow icon={Briefcase} title="Behavioural flags" desc="Only meaningful flags — never trivia.">
            <Switch checked={p.behaviouralFlags} onCheckedChange={(v) => toggle('behaviouralFlags', v, 'prefs')} />
          </SettingRow>
          <SettingRow icon={Bell} title="AI insight summaries" desc="Monthly plain-language progress narratives.">
            <Switch checked={p.aiInsightsMonthly} onCheckedChange={(v) => toggle('aiInsightsMonthly', v, 'prefs')} />
          </SettingRow>
        </Card>

        <div className="space-y-6">
          {/* Language */}
          <Card className="p-6">
            <div className="flex items-center gap-2 pb-3">
              <Languages className="h-4 w-4 text-emerald-500" />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Language & region</h3>
            </div>
            <div className="grid gap-3 pt-1 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">Preferred language</p>
                <Select defaultValue={data.profile.preferredLanguage}>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="हिन्दी">हिन्दी</SelectItem>
                  <SelectItem value="मराठी">मराठी</SelectItem>
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">Time zone</p>
                <Select defaultValue={data.profile.timezone}>
                  <SelectItem value={data.profile.timezone}>{data.profile.timezone}</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </Select>
              </div>
            </div>
            <SettingRow icon={Globe} title="Insight language" desc="AI summaries follow your preferred language.">
              <Badge variant="success">Auto</Badge>
            </SettingRow>
          </Card>

          {/* Privacy */}
          <Card className="p-6">
            <div className="flex items-center gap-2 pb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Privacy</h3>
            </div>
            <SettingRow icon={ShieldCheck} title="Share data with institution" desc="Attendance and behaviour data visible to the academic office.">
              <Switch checked={priv.shareWithInstitution} onCheckedChange={(v) => toggle('shareWithInstitution', v, 'privacy')} />
            </SettingRow>
            <SettingRow icon={Lock} title="Ward in leaderboards" desc="Aarav's name appears in class rankings.">
              <Switch checked={priv.showWardInLeaderboards} onCheckedChange={(v) => toggle('showWardInLeaderboards', v, 'privacy')} />
            </SettingRow>
            <SettingRow icon={Bell} title="Product updates" desc="Occasional emails about new MediXO EduX features.">
              <Switch checked={priv.receivePromotions} onCheckedChange={(v) => toggle('receivePromotions', v, 'privacy')} />
            </SettingRow>
          </Card>

          {/* Appearance */}
          <Card className="p-6">
            <div className="flex items-center gap-2 pb-3">
              <Moon className="h-4 w-4 text-emerald-500" />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Appearance</h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Theme follows the platform setting — switch light/dark from the top-right icon anytime.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

export { Settings }
export default Settings
