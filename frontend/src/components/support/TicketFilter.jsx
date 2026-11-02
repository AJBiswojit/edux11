/**
 * Shared support-ticket filter bar (status pills + count). Identical in the
 * Student and Faculty Support pages.
 */
const STATUSES = ['All', 'Open', 'In Progress', 'Resolved']

function TicketFilter({ filter, onFilter, count }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {STATUSES.map((f) => (
        <button key={f} onClick={() => onFilter(f)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${filter === f ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
          {f}
        </button>
      ))}
      <span className="ml-auto text-xs font-semibold text-slate-400">{count} tickets</span>
    </div>
  )
}

export { TicketFilter }
export default TicketFilter
