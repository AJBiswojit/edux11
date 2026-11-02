import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Building2, CalendarRange, GraduationCap, Landmark, Lock, Mail, Phone, ShieldCheck, ToggleLeft } from 'lucide-react'
import { useAdminSettings } from '@/services'
import { useSaveAdminSettings } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Select, SelectItem, Switch, useToast } from '@/components/ui'

function SettingRow({ icon: Icon, title, desc, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 text-violet-600 ring-1 ring-violet-500/15 dark:text-violet-300">
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
  const { data, isLoading, isError, refetch } = useAdminSettings()
  const [features, setFeatures] = useState(null)
  const saveSettings = useSaveAdminSettings()
  const toast = useToast()
  const f = features ?? data?.features ?? {}

  const toggle = (key) => {
    setFeatures((prev) => ({ ...(prev ?? data.features), [key]: !(prev ?? data.features)[key] }))
  }

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Governance · Settings"
        title="System settings"
        description="Institution identity, academic policy, feature flags and security posture."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Settings' }]}
        actions={<Badge variant="success" className="px-3 py-1"><span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-emerald-500" /> All settings healthy</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Institution profile */}
        <Card className="p-6">
          <div className="flex items-center gap-2 pb-3">
            <Building2 className="h-4 w-4 text-violet-500" />
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Institution profile</h3>
          </div>
          <div className="space-y-3.5 pt-1">
            {[
              { icon: Building2, label: 'Full name', value: data.institution?.name ?? '—' },
              { icon: Landmark, label: 'Short name', value: data.institution?.shortName ?? '—' },
              { icon: MapPin, label: 'Address', value: data.institution?.address ?? '—' },
              { icon: Phone, label: 'Phone', value: data.institution?.phone ?? '—' },
              { icon: Mail, label: 'Email', value: data.institution?.email ?? '—' },
              { icon: Globe, label: 'Time zone', value: data.institution?.timezone ?? '—' },
              { icon: CalendarRange, label: 'Fiscal year', value: data.institution?.fiscalYear ?? '—' },
            ].map((row, i) => (
              <motion.div key={row.label} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 px-3.5 py-3 dark:border-slate-800">
                <row.icon className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="w-28 shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">{row.label}</span>
                <span className="truncate text-[13px] font-semibold text-slate-700 dark:text-slate-200">{row.value}</span>
              </motion.div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          {/* Academic policy */}
          <Card className="p-6">
            <div className="flex items-center gap-2 pb-3">
              <GraduationCap className="h-4 w-4 text-violet-500" />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Academic policy</h3>
            </div>
            <div className="grid grid-cols-1 gap-3.5 pt-1 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">Semester system</p>
                <Select defaultValue={data.academics?.semesterSystem || 'Semester'}>
                  <SelectItem value="Semester">Semester</SelectItem>
                  <SelectItem value="Trimester">Trimester</SelectItem>
                  <SelectItem value="Annual">Annual</SelectItem>
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">Current term</p>
                <Select defaultValue={data.academics?.currentTerm || '—'}>
                  <SelectItem value={data.academics?.currentTerm || '—'}>{data.academics?.currentTerm || '—'}</SelectItem>
                  <SelectItem value="Sem 4 · 2026-27">Sem 4 · 2026-27</SelectItem>
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">Grading scale</p>
                <Select defaultValue={data.academics?.gradingScale || '10-point CGPA'}>
                  <SelectItem value={data.academics?.gradingScale || '10-point CGPA'}>{data.academics?.gradingScale || '10-point CGPA'}</SelectItem>
                  <SelectItem value="4-point GPA">4-point GPA</SelectItem>
                  <SelectItem value="Percentage">Percentage</SelectItem>
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">Attendance threshold</p>
                <Select defaultValue={`${data.academics?.attendanceThreshold ?? 75}%`}>
                  <SelectItem value="75%">75%</SelectItem>
                  <SelectItem value="80%">80%</SelectItem>
                  <SelectItem value="70%">70%</SelectItem>
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">Pass mark</p>
                <Select defaultValue={`${data.academics?.passMark ?? 40}%`}>
                  <SelectItem value="40%">40%</SelectItem>
                  <SelectItem value="35%">35%</SelectItem>
                  <SelectItem value="50%">50%</SelectItem>
                </Select>
              </div>
            </div>
          </Card>

          {/* Security */}
          <Card className="p-6">
            <div className="flex items-center gap-2 pb-3">
              <ShieldCheck className="h-4 w-4 text-violet-500" />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Security</h3>
            </div>
            <SettingRow icon={ShieldCheck} title="SSO / SAML" desc={`${data.security?.ssoProvider || 'Not configured'} — ${data.security?.ssoEnabled ? 'enabled' : 'not configured'}`}>
              <Switch checked={!!data.security?.ssoEnabled} onCheckedChange={() => toast.info('SSO setup', 'SAML configuration is stored with institution settings after Save.')} />
            </SettingRow>
            <SettingRow icon={Lock} title="Multi-factor authentication" desc="Required for admin and faculty accounts.">
              <Switch checked={!!data.security?.mfaRequired} onCheckedChange={() => {}} />
            </SettingRow>
            <SettingRow icon={Bell} title="Session timeout" desc={`${data.security?.sessionTimeout ?? 30} minutes of inactivity.`}>
              <Select defaultValue={`${data.security.sessionTimeout} min`}>
                <SelectItem value="15 min">15 min</SelectItem>
                <SelectItem value="30 min">30 min</SelectItem>
                <SelectItem value="60 min">60 min</SelectItem>
              </Select>
            </SettingRow>
            <SettingRow icon={Lock} title="Data residency" desc={data.security?.dataResidency || '—'}>
              <Badge variant="success">Compliant</Badge>
            </SettingRow>
          </Card>
        </div>
      </div>

      {/* Feature flags */}
      <Card className="mt-6 p-6">
        <div className="flex items-center gap-2 pb-3">
          <ToggleLeft className="h-4 w-4 text-violet-500" />
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Feature flags</h3>
          <span className="ml-auto text-xs font-semibold text-slate-400">Institution-wide</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { key: 'enableAiTutor', label: 'AI Tutor', desc: '24×7 conversational tutor for all students' },
            { key: 'enableCodingLab', label: 'Coding Lab', desc: 'In-browser practice with instant feedback' },
            { key: 'enableParentPortal', label: 'Parent Portal', desc: 'Progress, insights and communication' },
            { key: 'enablePlacements', label: 'Placement Engine', desc: 'Drives, offers and career coaching' },
            { key: 'enableResearch', label: 'Research Console', desc: 'Publications, grants and citations' },
            { key: 'enablePublicPortfolio', label: 'Public Portfolios', desc: 'Shareable student profile pages' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <div>
                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{item.label}</p>
                <p className="text-[11px] text-slate-400">{item.desc}</p>
              </div>
              <Switch checked={f[item.key]} onCheckedChange={() => toggle(item.key)} />
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 flex justify-end gap-2.5">
        <Button variant="outline" onClick={() => { setFeatures(null); toast.info('Discarded', 'Local edits reverted.') }}>Discard</Button>
        <Button onClick={async () => {
          try {
            await saveSettings.mutateAsync({ features: f, institution: data.institution, academics: data.academics, security: data.security })
            toast.success('Settings saved', 'Persisted to the institution record.')
          } catch (err) {
            toast.error('Save failed', err?.response?.data?.detail || 'Could not save settings.')
          }
        }}>Save all changes</Button>
      </div>
    </div>
  )
}

import { Globe, MapPin } from 'lucide-react'

export { Settings }
export default Settings
