import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface DataTableColumn<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  accessor?: (row: T) => string | number
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  rowKey: (row: T) => string | number
  rowClassName?: (row: T) => string | undefined
  defaultSortKey?: string
}

type SortDir = 'asc' | 'desc'

export function DataTable<T>({ columns, data, rowKey, rowClassName, defaultSortKey }: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey)
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sorted = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.accessor) return data
    const accessor = col.accessor
    const copy = [...data]
    copy.sort((a, b) => {
      const av = accessor(a)
      const bv = accessor(b)
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return copy
  }, [data, sortKey, sortDir, columns])

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable) return
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(col.key)
      setSortDir('desc')
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col)}
                className={cn(
                  'select-none whitespace-nowrap px-3 py-2 font-medium',
                  col.sortable && 'cursor-pointer hover:text-fg',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                )}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={rowKey(row)} className={cn('border-b border-line/60 transition-colors hover:bg-white/5', rowClassName?.(row))}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'whitespace-nowrap px-3 py-2.5 text-fg',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                  )}
                >
                  {col.render ? col.render(row) : col.accessor ? col.accessor(row) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}