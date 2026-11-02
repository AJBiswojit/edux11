import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { useTheme } from '@/contexts/theme-context'
import { ROLE_HOME } from '@/config'

function CommandPalette({ open, onOpenChange, navGroups }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { toggleTheme } = useTheme()
  const role = user?.role ?? 'student'

  /* Role-aware destinations (Phase 27.2): every quick action lands inside the
     user's own portal — never on the public landing or another role's pages. */
  const aiWorkspacePath = role === 'student' ? '/student/mentor' : role === 'faculty' ? '/faculty/ai-assistant' : role === 'admin' ? '/admin' : '/parent/ai-insights'
  const aiWorkspaceLabel = role === 'student' ? 'Open MediXO Mentor' : role === 'faculty' ? 'Open AI Teaching Assistant' : role === 'admin' ? 'Open exam dashboard' : 'Open AI Insights'

  const actions = useMemo(
    () => [
      { label: 'Go to Dashboard', icon: LayoutDashboard, run: () => navigate(ROLE_HOME[role] ?? '/'), shortcut: 'g d' },
      { label: aiWorkspaceLabel, icon: Sparkles, run: () => navigate(aiWorkspacePath), shortcut: 'g a' },
      { label: 'Toggle Dark Mode', icon: Moon, run: () => toggleTheme(), shortcut: 't m' },
      { label: 'Sign out', icon: LogOut, run: () => { logout(); navigate('/auth/login') }, shortcut: 's o' },
    ],
    [navigate, logout, toggleTheme, role, aiWorkspaceLabel, aiWorkspacePath]
  )

  const groups = useMemo(() => navGroups ?? [], [navGroups])

  return (
    <Command open={open} onOpenChange={onOpenChange}>
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput placeholder="Search pages, jump to anything…" />
        <CommandList>
          <CommandEmpty />
          {groups.map((group) => (
            <CommandGroup key={group.label} title={group.label}>
              {group.items.map((item) => {
                const Icon = Icons[item.icon] ?? Icons.Circle
                return (
                  <CommandItem key={item.to} onSelect={() => navigate(item.to)}>
                    <Icon className="h-4 w-4 text-slate-400" />
                    <span>{item.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}
          <CommandGroup title="Quick actions">
            {actions.map((a) => (
              <CommandItem key={a.label} onSelect={a.run} shortcut={a.shortcut}>
                <a.icon className="h-4 w-4 text-slate-400" />
                <span>{a.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </Command>
  )
}

const { LayoutDashboard, Sparkles, Moon, LogOut } = Icons

export { CommandPalette }
export default CommandPalette
