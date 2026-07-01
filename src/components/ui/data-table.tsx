'use client'

import { cn } from '@/lib/utils'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useState, useMemo, ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  width?: string
  align?: 'start' | 'center' | 'end'
  sortable?: boolean
  render?: (row: T, index: number) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  compact?: boolean
  stickyHeader?: boolean
  emptyMessage?: string
  className?: string
  maxHeight?: string
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  compact = false,
  stickyHeader = true,
  emptyMessage = 'No data',
  className,
  maxHeight,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey]
      const bVal = (b as Record<string, unknown>)[sortKey]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const cellPad = compact ? 'px-3 py-2' : 'px-4 py-3'

  return (
    <div
      className={cn(
        'border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-surface)]',
        className
      )}
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      <table className="w-full text-sm">
        <thead className={cn(
          'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] text-xs uppercase tracking-wider',
          stickyHeader && 'sticky top-0 z-10'
        )}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  cellPad,
                  'font-semibold text-start',
                  col.align === 'center' && 'text-center',
                  col.align === 'end' && 'text-end',
                  col.sortable && 'cursor-pointer select-none hover:text-[var(--color-text)] transition-colors'
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    sortKey === col.key
                      ? sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      : <ArrowUpDown size={12} className="opacity-30" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-[var(--color-text-muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : sorted.map((row, idx) => (
            <tr
              key={keyExtractor(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'transition-colors',
                idx % 2 === 1 && 'bg-[var(--color-surface-elevated)]/40',
                onRowClick && 'cursor-pointer hover:bg-[var(--color-amber)]/5'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    cellPad,
                    'text-[var(--color-text-secondary)]',
                    col.align === 'center' && 'text-center',
                    col.align === 'end' && 'text-end'
                  )}
                >
                  {col.render
                    ? col.render(row, idx)
                    : String((row as Record<string, unknown>)[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
