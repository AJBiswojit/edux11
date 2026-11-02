import { NavLink } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { cn } from '@/utils/cn'
import { Logo } from '@/components/shared/logo'
import { Badge } from '@/components/ui/badge'
import { ROLE_HOME } from '@/config'

/* Sidebar destinations are exact by default. A route may opt into descendant
   matching only when it is intentionally the parent navigation surface (for
   example My Students → a student profile). This keeps independent siblings
   such as Question Intelligence and AI Micro-Assessment mutually exclusive. */
export function sidebarItemEnd(item) {
  return item.matchDescendants !== true
}

function Sidebar({ navGroups, role, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-slate-200/70 px-6 dark:border-slate-800">
        <Logo size={30} href={ROLE_HOME[role]} />
        <span className="ml-auto hidden rounded-full bg-gradient-to-r from-indigo-500/10 to-teal-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-indigo-600 ring-1 ring-indigo-500/20 xl:block dark:text-indigo-300">
          {role} Portal
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3.5 py-4" aria-label="Primary">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = Icons[item.icon] ?? Icons.Circle
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      end={sidebarItemEnd(item)}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13.5px] font-medium transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-r from-indigo-600/12 to-blue-600/8 text-indigo-700 shadow-sm ring-1 ring-indigo-500/20 dark:from-indigo-500/15 dark:to-blue-500/10 dark:text-indigo-300 dark:ring-indigo-400/25'
                            : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-500 to-teal-400" />
                          )}
                          <Icon
                            className={cn(
                              'h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110',
                              isActive ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-slate-500'
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                          {item.badge && <Badge variant="gradient" size="sm" className="ml-auto">{item.badge}</Badge>}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}

export { Sidebar }
export default Sidebar
