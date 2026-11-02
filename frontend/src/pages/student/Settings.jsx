import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Bell, BellRing, Download, Languages, Lock, Moon, Palette, ShieldCheck, Trash2, User, Zap } from 'lucide-react'
import { useStudentSettings, useUpdateStudentSettings } from '@/services'
import { useMasterStudentProfile } from '@/services/intelligence'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Button, Card, Select, SelectItem, Switch, useToast } from '@/components/ui'
import { SettingRow, SettingsProfileCard } from '@/components/settings'
import { useTheme } from '@/contexts/theme-context'

function Settings() {
  const { data, isLoading, isError, refetch } = useStudentSettings()
  const { data: profile } = useMasterStudentProfile()
  const { mutateAsync: update } = useUpdateStudentSettings()
  const { theme, setLight, setDark, reducedMotion, toggleReducedMotion } = useTheme()
  const systemPrefersReduced = useReducedMotion()
  const toast = useToast()
  const [prefs, setPrefs] = useState(null)
  const [privacy, setPrivacy] = useState(null)

  const togglePref = async (key, value) => {
    const next = { ...prefs, [key]: value }
    setPrefs(next)
    try {
      await update({ preferences: next })
      toast.success('Preference saved', 'Applied instantly.')
    } catch {
      toast.error('Could not save')
    }
  }

  const togglePrivacy = async (key, value) => {
    const next = { ...privacy, [key]: value }
    setPrivacy(next)
    try {
      await update({ privacy: next })
      toast.success('Privacy setting updated')
    } catch {
      toast.error('Could not save')
    }
  }

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const currentPrefs = prefs ?? data.preferences
  const currentPrivacy = privacy ?? data.privacy

  return (
    <div>
      <PageHeader
        eyebrow="Account · Settings"
        title="Settings"
        description="Profile, notifications, AI preferences and privacy — all in one place."
        breadcrumbs={[{ label: 'Student' }, { label: 'Settings' }]}
      />

      {/* Profile card */}
      <SettingsProfileCard
        name={profile?.fullName || 'Student'}
        badge={{ label: 'Verified student', variant: 'success' }}
        subtitle={[profile?.rollNo, profile?.program, profile?.semester, profile?.institution].filter(Boolean).join(' · ') || 'Profile'}
        contact={`${data.profile?.email || ''} · ${data.profile?.phone || ''}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.info('Not available yet', 'Profile editing is not available yet.')}>
              <User className="h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info('Not available yet', 'Data export is not available yet.')}>
              <Download className="h-4 w-4" /> Export data
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notifications */}
        <Card className="divide-y divide-slate-100 p-6 dark:divide-slate-800">
          <div className="flex items-center gap-2 pb-3">
            <Bell className="h-4 w-4 text-indigo-500" />
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Notifications</h3>
          </div>
          <SettingRow icon={Bell} title="Email notifications" desc="Grades, deadlines and announcements to your inbox.">
            <Switch checked={currentPrefs.emailNotifications} onCheckedChange={(v) => togglePref('emailNotifications', v)} />
          </SettingRow>
          <SettingRow icon={BellRing} title="Push notifications" desc="Real-time alerts on your devices.">
            <Switch checked={currentPrefs.pushNotifications} onCheckedChange={(v) => togglePref('pushNotifications', v)} />
          </SettingRow>
          <SettingRow icon={Bell} title="Weekly digest" desc="A Sunday summary of your week's progress.">
            <Switch checked={currentPrefs.weeklyDigest} onCheckedChange={(v) => togglePref('weeklyDigest', v)} />
          </SettingRow>
          <SettingRow icon={BellRing} title="Deadline reminders" desc="Reminders 48h and 6h before every deadline.">
            <Switch checked={currentPrefs.deadlineReminders} onCheckedChange={(v) => togglePref('deadlineReminders', v)} />
          </SettingRow>
          <SettingRow icon={Zap} title="AI insights" desc="Weekly AI-written summaries of your learning.">
            <Switch checked={currentPrefs.aiInsights} onCheckedChange={(v) => togglePref('aiInsights', v)} />
          </SettingRow>
          <SettingRow icon={Bell} title="Streak reminders" desc="A gentle nudge when your streak is at risk.">
            <Switch checked={currentPrefs.streakReminders} onCheckedChange={(v) => togglePref('streakReminders', v)} />
          </SettingRow>
        </Card>

        <div className="space-y-6">
          {/* Appearance */}
          <Card className="p-6">
            <div className="flex items-center gap-2 pb-3">
              <Palette className="h-4 w-4 text-indigo-500" />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Appearance</h3>
            </div>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                onClick={() => { setLight(); toast.success('Light mode on') }}
                className={`flex-1 rounded-2xl border-2 p-4 text-center transition-all ${theme === 'light' ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}
              >
                <span className="mx-auto block h-8 w-14 rounded-lg bg-white shadow-sm ring-1 ring-slate-200" />
                <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">Light</p>
              </button>
              <button
                onClick={() => { setDark(); toast.success('Dark mode on') }}
                className={`flex-1 rounded-2xl border-2 p-4 text-center transition-all ${theme === 'dark' ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}
              >
                <span className="mx-auto block h-8 w-14 rounded-lg bg-slate-900 shadow-sm" />
                <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">Dark</p>
              </button>
            </div>
            <SettingRow icon={Moon} title="Reduced motion" desc="Minimise animations across the platform.">
              <Switch
                checked={reducedMotion || currentPrefs.reducedMotion}
                onCheckedChange={(v) => {
                  togglePref('reducedMotion', v)
                  toggleReducedMotion()
                }}
              />
            </SettingRow>
            {!reducedMotion && systemPrefersReduced && (
              <p className="rounded-xl bg-indigo-50 px-3.5 py-2.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                Your system prefers reduced motion — we've applied it automatically.
              </p>
            )}
          </Card>

          {/* Privacy */}
          <Card className="p-6">
            <div className="flex items-center gap-2 pb-3">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Privacy</h3>
            </div>
            <SettingRow icon={ShieldCheck} title="Show rank to classmates" desc="Your class rank is visible to peers in leaderboards.">
              <Switch checked={currentPrivacy.showRankToPeers} onCheckedChange={(v) => togglePrivacy('showRankToPeers', v)} />
            </SettingRow>
            <SettingRow icon={Lock} title="Public portfolio" desc="Anyone with the link can view your portfolio.">
              <Switch checked={currentPrivacy.showProfilePublic} onCheckedChange={(v) => togglePrivacy('showProfilePublic', v)} />
            </SettingRow>
            <SettingRow icon={Zap} title="Share learning data with AI" desc="Let AI models analyse your patterns to personalise recommendations.">
              <Switch checked={currentPrivacy.shareLearningData} onCheckedChange={(v) => togglePrivacy('shareLearningData', v)} />
            </SettingRow>
          </Card>

          {/* Language */}
          <Card className="p-6">
            <div className="flex items-center gap-2 pb-3">
              <Languages className="h-4 w-4 text-indigo-500" />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Language & region</h3>
            </div>
            <div className="grid gap-3 pt-1 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Interface language</p>
                <Select defaultValue="English (India)">
                  <SelectItem value="English (India)">English (India)</SelectItem>
                  <SelectItem value="हिन्दी">हिन्दी</SelectItem>
                  <SelectItem value="English (US)">English (US)</SelectItem>
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Time zone</p>
                <Select defaultValue={data.profile.timezone}>
                  <SelectItem value={data.profile.timezone}>{data.profile.timezone}</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </Select>
              </div>
            </div>
          </Card>

          {/* Danger zone */}
          <Card className="border-rose-200/70 p-6 dark:border-rose-500/20">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-rose-600 dark:text-rose-400">
              <Trash2 className="h-4 w-4" /> Danger zone
            </h3>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Delete my account</p>
                <p className="text-xs text-slate-400">Permanently remove your account and all learning data. This cannot be undone.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => toast.error('Action blocked', 'Account deletion is disabled. Contact your institution.')}>
                Delete account
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export { Settings }
export default Settings
