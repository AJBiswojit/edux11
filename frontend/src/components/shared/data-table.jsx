import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Input } from '@/components/ui'
import { EmptyState } from './empty-state'

/**
 * Premium generic data table — search, sort, pagination, empty states.
 * Columns: [{ key, label, render, sortable, className, headerClassName }]
 */
function DataTable({ columns = [], data = [], searchKeys = [], searchPlaceholder = 'Search…', pageSize = 8, toolbar, emptyTitle = 'Nothing here yet', emptyDescription = 'Try adjusting your filters or search.', initialSort }) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState(initialSort ?? null) // { key, dir }

  const filtered = useMemo(() => {
    let rows = data
    if (query && searchKeys.length) {
      const q = query.toLowerCase()
      rows = rows.filter((row) => searchKeys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)))
    }
    if (sort) {
      rows = [...rows].sort((a, b) => {
        const av = a[sort.key]
        const bv = b[sort.key]
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''))
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return rows
  }, [data, query, searchKeys, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pages)
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize)

  const toggleSort = (key) => {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  const PageBtn = ({ onClick, disabled, children, label }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
    >
      {children}
    </button>
  )

  return (
    <div>
      {(searchKeys.length > 0 || toolbar) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1) }} placeholder={searchPlaceholder} className="pl-10" />
          </div>
          <div className="flex items-center gap-2">{toolbar}</div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500',
                      col.headerClassName
                    )}
                  >
                    {col.sortable ? (
                      <button onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
                        {col.label}
                        {sort?.key === col.key && <span className="text-[9px]">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="p-6">
                      <EmptyState compact title={emptyTitle} description={emptyDescription} />
                    </div>
                  </td>
                </tr>
              )}
              {pageRows.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className="border-b border-slate-100 transition-colors last:border-0 hover:bg-indigo-50/40 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3.5 align-middle text-slate-700 dark:text-slate-200', col.className)}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > pageSize && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 px-4 py-3 dark:border-slate-800">
            <p className="text-xs text-slate-400">
              Showing <span className="font-semibold text-slate-600 dark:text-slate-300">{pageRows.length}</span> of{' '}
              <span className="font-semibold text-slate-600 dark:text-slate-300">{filtered.length}</span> entries
            </p>
            <div className="flex items-center gap-1.5">
              <PageBtn onClick={() => setPage(1)} disabled={current === 1} label="First page"><ChevronsLeft className="h-4 w-4" /></PageBtn>
              <PageBtn onClick={() => setPage(current - 1)} disabled={current === 1} label="Previous page"><ChevronLeft className="h-4 w-4" /></PageBtn>
              <span className="mx-1 text-xs font-semibold text-slate-500">
                {current} / {pages}
              </span>
              <PageBtn onClick={() => setPage(current + 1)} disabled={current === pages} label="Next page"><ChevronRight className="h-4 w-4" /></PageBtn>
              <PageBtn onClick={() => setPage(pages)} disabled={current === pages} label="Last page"><ChevronsRight className="h-4 w-4" /></PageBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { DataTable }
export default DataTable
