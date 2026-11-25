import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Download } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { Card } from './Card'
import { SearchInput } from './Form'
import { EmptyState, Skeleton } from './misc'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  /** Enables sorting on this column. */
  sort?: (row: T) => string | number
  /** Value for CSV export (defaults to sort value). Omit both to leave the column out of the export. */
  csv?: (row: T) => string | number
  align?: 'start' | 'end' | 'center'
  className?: string
  /** Hide on small screens: 'md' hides below 768px, 'lg' below 1024px. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell', '2xl': 'hidden 2xl:table-cell' }

/**
 * The table used by every list screen: search, sortable columns, pagination, CSV export, loading and empty states.
 * Filters (selects, segmented controls) go in `toolbar` and should filter `rows` before passing them in.
 */
export function DataTable<T extends { id: string }>({
  rows,
  columns,
  loading,
  search,
  searchPlaceholder = 'Search…',
  toolbar,
  onRowClick,
  pageSize = 10,
  exportName,
  empty,
  initialSort,
  className,
}: {
  rows: T[] | undefined
  columns: Column<T>[]
  loading?: boolean
  /** Text used for the search box; omit to hide search. */
  search?: (row: T) => string
  searchPlaceholder?: string
  toolbar?: ReactNode
  onRowClick?: (row: T) => void
  pageSize?: number
  /** File name for "Export CSV"; omit to hide the button. */
  exportName?: string
  empty?: ReactNode
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  className?: string
}) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState(initialSort ?? null)
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    let list = rows ?? []
    const term = q.trim().toLowerCase()
    if (term && search) list = list.filter((r) => search(r).toLowerCase().includes(term))
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      if (col?.sort) {
        const get = col.sort
        list = [...list].sort((a, b) => {
          const va = get(a)
          const vb = get(b)
          const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
          return sort.dir === 'asc' ? d : -d
        })
      }
    }
    return list
  }, [rows, q, sort, columns, search])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const current = Math.min(page, pages - 1)
  const visible = filtered.slice(current * pageSize, current * pageSize + pageSize)

  const toggleSort = (key: string) => {
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }))
  }

  const exportCsv = () => {
    const cols = columns.filter((c) => c.csv || c.sort)
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const lines = [cols.map((c) => esc(typeof c.header === 'string' ? c.header : c.key)).join(',')]
    for (const r of filtered) lines.push(cols.map((c) => esc((c.csv ?? c.sort)!(r))).join(','))
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${exportName}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const align = (a?: Column<T>['align']) => (a === 'end' ? 'text-end' : a === 'center' ? 'text-center' : 'text-start')

  return (
    <Card className={cn('overflow-hidden', className)}>
      {(search || toolbar || exportName) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          {search && (
            <SearchInput
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(0)
              }}
              placeholder={searchPlaceholder}
              className="w-full sm:w-[280px]"
              aria-label="Search"
            />
          )}
          {toolbar}
          {exportName && (
            <Button variant="outline" size="md" className="ms-auto" onClick={exportCsv} icon={<Download />}>
              Export
            </Button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-line bg-surface-2/60">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('relative px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.04em] whitespace-nowrap text-muted uppercase', align(c.align), c.hideBelow && HIDE[c.hideBelow], c.className)}>
                  {c.sort ? (
                    <button type="button" onClick={() => toggleSort(c.key)} className={cn('inline-flex items-center gap-1 uppercase hover:text-fg', c.align === 'end' && 'flex-row-reverse')}>
                      {c.header}
                      {sort?.key === c.key ? sort.dir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" /> : <ChevronsUpDown className="size-3.5 opacity-40" />}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-line/70 last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3.5', c.hideBelow && HIDE[c.hideBelow])}>
                      <Skeleton className="h-4 w-[70%]" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              visible.map((r) => (
                <tr
                  key={r.id}
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={cn('border-b border-line/70 transition-colors duration-100 last:border-0', onRowClick && 'cursor-pointer hover:bg-surface-2/70')}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn('relative px-4 py-3 align-middle whitespace-nowrap', align(c.align), c.hideBelow && HIDE[c.hideBelow], c.className)}>
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (empty ?? <EmptyState title={q ? 'No results' : 'Nothing here yet'} message={q ? `Nothing matches “${q}”.` : undefined} />)}
      </div>
      {!loading && filtered.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[12.5px] text-muted">
          <span className="tabular">
            {current * pageSize + 1}–{Math.min(filtered.length, (current + 1) * pageSize)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page">
              <ChevronLeft className="rtl:rotate-180" />
            </Button>
            <span className="px-2 font-semibold text-fg tabular">
              {current + 1} / {pages}
            </span>
            <Button variant="outline" size="icon-sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page">
              <ChevronRight className="rtl:rotate-180" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
