/**
 * Shared settings row — icon + title + description + control.
 * Used by both Student and Faculty Settings. The only role difference is the
 * icon-box gradient, controlled by the `tone` prop (default 'student').
 */
const ICON_BOX_TONES = {
  student: 'from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-indigo-500/15 dark:text-indigo-300',
  faculty: 'from-teal-500/10 to-emerald-500/10 text-teal-600 ring-teal-500/15 dark:text-teal-300',
}

function SettingRow({ icon: Icon, title, desc, children, tone = 'student' }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-start gap-3.5">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ICON_BOX_TONES[tone] ?? ICON_BOX_TONES.student} ring-1`}>
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

export { SettingRow }
export default SettingRow
