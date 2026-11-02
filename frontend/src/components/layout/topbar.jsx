import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, Command, Eye, EyeOff, FolderOpen, KeyRound, LogOut, Menu, Moon, Search, Settings, Sparkles, Sun, User,
} from 'lucide-react'
import {
  Avatar, DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Tooltip,
} from '@/components/ui'
import { useChangePassword } from '@/services/auth'

/* ── Change-Password Modal ──────────────────────────────────────────── */
function ChangePasswordModal({ onClose }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [success, setSuccess] = useState(false)
  const [fieldError, setFieldError] = useState('')

  const { mutate, isPending, error } = useChangePassword()

  function handleSubmit(e) {
    e.preventDefault()
    setFieldError('')

    if (!oldPassword) return setFieldError('Please enter your current password.')
    if (!newPassword) return setFieldError('Please enter a new password.')
    if (newPassword.length < 8) return setFieldError('New password must be at least 8 characters.')

    mutate(
      { oldPassword, newPassword },
      {
        onSuccess: () => {
          setSuccess(true)
          setOldPassword('')
          setNewPassword('')
        },
        onError: () => {},
      }
    )
  }

  const serverError =
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    null

  return (
    /* backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900 mx-4">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
              <KeyRound className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">Change Password</h2>
              <p className="text-[11px] text-slate-400">Update your account password</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div className="px-6 py-5">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Password updated successfully!</p>
              <p className="text-xs text-slate-400">Your new password is now active.</p>
              <button
                onClick={onClose}
                className="mt-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* old password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label="Toggle visibility"
                    tabIndex={-1}
                  >
                    {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* new password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/20"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label="Toggle visibility"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">Minimum 8 characters</p>
              </div>

              {/* errors */}
              {(fieldError || serverError) && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                  {fieldError || serverError}
                </p>
              )}

              {/* actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  {isPending ? 'Updating…' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Topbar ─────────────────────────────────────────────────────────── */
function Topbar({ role, user, isDark, onToggleTheme, onOpenSidebar, onOpenPalette, onLogout }) {
  const navigate = useNavigate()
  const [showChangePassword, setShowChangePassword] = useState(false)

  // Students use the unified MediXO Mentor workspace; faculty use the AI
  // Teaching Assistant. Other roles (admin) have no AI workspace in the
  // current version — the sparkles entry is hidden for them (no dead links).
  const hasAiWorkspace = role === 'student' || role === 'faculty'
  const mentorPath = hasAiWorkspace
    ? (role === 'student' ? '/student/mentor' : '/faculty/ai-assistant')
    : null

  return (
    <>
      <header className="glass-nav sticky top-0 z-30">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            onClick={onOpenSidebar}
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search trigger */}
          <button
            onClick={onOpenPalette}
            className="group hidden h-10 w-full max-w-md items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white/70 px-3.5 text-sm text-slate-400 shadow-sm transition-all hover:border-indigo-300 hover:shadow-soft sm:flex dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500 dark:hover:border-indigo-500/40"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search anything…</span>
            <kbd className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* MediXO Mentor navbar icon — commented out
            {hasAiWorkspace && (
            <Tooltip content={role === 'student' ? 'MediXO Mentor' : 'AI Teaching Assistant'}>
              <button
                onClick={() => navigate(mentorPath)}
                className="group relative rounded-xl p-2.5 text-slate-500 transition-all hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                aria-label={role === 'student' ? 'Open MediXO Mentor' : 'Open AI Teaching Assistant'}
              >
                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-500" />
                </span>
                <Sparkles className="h-[18px] w-[18px]" />
              </button>
            </Tooltip>
            )}
            */}

            <Tooltip content={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              <button
                onClick={onToggleTheme}
                className="rounded-xl p-2.5 text-slate-500 transition-all hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </button>
            </Tooltip>

            <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-800" />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-2xl p-1.5 pr-2.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Account menu">
                <Avatar name={user?.fullName} size="sm" />
                <span className="hidden max-w-[140px] truncate text-[13px] font-semibold text-slate-700 md:block dark:text-slate-200">
                  {user?.fullName}
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 md:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-2.5 py-1">
                    <Avatar name={user?.fullName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.fullName}</p>
                      <p className="truncate text-[11px] font-normal normal-case tracking-normal text-slate-400">{user?.email}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem icon={User} onClick={() => navigate(role === 'faculty' ? '/faculty/ai-assistant?tab=profile' : `/${role}/settings`)}>
                    Profile
                  </DropdownMenuItem>
                  {/* Digital Portfolio — commented out
                  {role === 'student' && (
                    <DropdownMenuItem icon={FolderOpen} onClick={() => navigate('/student/portfolio')}>
                      Digital Portfolio
                    </DropdownMenuItem>
                  )}
                  */}
                  {/* Settings — commented out
                  <DropdownMenuItem icon={Settings} onClick={() => navigate(`/${role}/settings`)}>
                    Settings
                  </DropdownMenuItem>
                  */}
                  {/* MediXO Mentor dropdown menu item — commented out
                  {hasAiWorkspace && (
                    <DropdownMenuItem icon={Sparkles} onClick={() => navigate(mentorPath)}>
                      {role === 'student' ? 'MediXO Mentor' : 'AI Teaching Assistant'}
                    </DropdownMenuItem>
                  )}
                  */}
                  <DropdownMenuItem
                    icon={KeyRound}
                    onClick={() => setShowChangePassword(true)}
                  >
                    Change Password
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem icon={LogOut} className="text-rose-600 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-500/10" onClick={onLogout}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  )
}

export { Topbar }
export default Topbar
