/**
 * Shared settings profile card shell — Avatar + name/badge + subtitle +
 * contact + optional extra lines + action buttons. Role-specific content is
 * passed in via props so Student and Faculty keep their own copy exactly.
 */
import { Avatar, Badge, Card } from '@/components/ui'

function SettingsProfileCard({ name, badge, subtitle, contact, extra = null, actions = null }) {
  return (
    <Card className="mb-6 p-6">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar name={name} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{name}</h2>
            {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          <p className="text-xs text-slate-400">{contact}</p>
          {extra}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </Card>
  )
}

export { SettingsProfileCard }
export default SettingsProfileCard
