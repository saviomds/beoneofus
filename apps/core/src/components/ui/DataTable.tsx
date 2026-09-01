import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { EmptyState } from './states'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  hideOnMobile?: boolean
}

export interface FilterDef<T> {
  key: string
  label: string
  options: string[]
  match: (row: T, value: string) => boolean
}

interface Props<T> {
  rows: T[]
  columns: Column<T>[]
  getKey: (row: T) => string
  searchable?: (row: T) => string
  searchPlaceholder?: string
  filters?: FilterDef<T>[]
  pageSize?: number
  rowActions?: (row: T) => ReactNode
  emptyTitle?: string
  emptyAction?: ReactNode
  toolbarExtra?: ReactNode
}

export function DataTable<T>({
  rows,
  columns,
  getKey,
  searchable,
  searchPlaceholder = 'Search…',
  filters = [],
  pageSize = 10,
  rowActions,
  emptyTitle = 'No records found',
  emptyAction,
  toolbarExtra,
}: Props<T>) {
  const [query, setQuery] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [page, setPage] = useState(0)

  const processed = useMemo(() => {
    let out = [...rows]
    if (searchable && query.trim()) {
      const q = query.trim().toLowerCase()
      out = out.filter((r) => searchable(r).toLowerCase().includes(q))
    }
    for (const f of filters) {
      const v = filterValues[f.key]
      if (v && v !== 'All') out = out.filter((r) => f.match(r, v))
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)
      if (col?.sortValue) {
        out.sort((a, b) => {
          const av = col.sortValue!(a)
          const bv = col.sortValue!(b)
          return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir
        })
      }
    }
    return out
  }, [rows, query, filterValues, sort, filters, columns, searchable])

  const pageCount = Math.max(1, Math.ceil(processed.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const visible = processed.slice(safePage * pageSize, safePage * pageSize + pageSize)

  const toggleSort = (key: string) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))
  }

  return (
    <div>
      {(searchable || filters.length > 0 || toolbarExtra) && (
        <div className="toolbar">
          {searchable && (
            <input
              className="input grow"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(0)
              }}
              aria-label="Search"
            />
          )}
          {filters.map((f) => (
            <select
              key={f.key}
              className="select"
              aria-label={f.label}
              value={filterValues[f.key] ?? 'All'}
              onChange={(e) => {
                setFilterValues((v) => ({ ...v, [f.key]: e.target.value }))
                setPage(0)
              }}
            >
              <option>All</option>
              {f.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ))}
          {toolbarExtra}
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={query || Object.values(filterValues).some((v) => v && v !== 'All') ? 'Try adjusting your search or filters.' : undefined}
          action={emptyAction}
        />
      ) : (
        <>
          <div className="table-wrap">
            <table className="data table-sortable">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={c.hideOnMobile ? 'hide-mobile' : ''}>
                      {c.sortValue ? (
                        <button onClick={() => toggleSort(c.key)}>
                          {c.header}
                          {sort?.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  ))}
                  {rowActions && <th aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={getKey(row)}>
                    {columns.map((c) => (
                      <td key={c.key}>{c.render(row)}</td>
                    ))}
                    {rowActions && <td><div className="row-actions">{rowActions(row)}</div></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                Previous
              </button>
              <span>
                Page {safePage + 1} of {pageCount} · {processed.length} records
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
