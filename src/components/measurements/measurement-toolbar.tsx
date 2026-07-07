'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Plus,
  FileSpreadsheet,
  Search,
  Download,
  BookOpen,
  Filter,
  FileText,
} from 'lucide-react'

interface MeasurementToolbarProps {
  onAddItem: () => void
  onGenerateBOQ: () => void
  onExport?: () => Promise<void> | void
  onExportPDF?: () => Promise<void> | void
  selectedCount: number
  sections: string[]
  activeSection: string | null
  onSectionFilter: (section: string | null) => void
  searchQuery: string
  onSearch: (q: string) => void
  itemCount: number
  lineCount: number
  totalAdditions?: number
  totalDeductions?: number
  netQuantity?: number
}

export function MeasurementToolbar({
  onAddItem,
  onGenerateBOQ,
  onExport,
  onExportPDF,
  selectedCount,
  sections,
  activeSection,
  onSectionFilter,
  searchQuery,
  onSearch,
  itemCount,
  lineCount,
  totalAdditions = 0,
  totalDeductions = 0,
  netQuantity = 0,
}: MeasurementToolbarProps) {
  const sectionCount = sections.length
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)

  const handleExportExcel = async () => {
    if (!onExport || exportingExcel) return
    setExportingExcel(true)
    try { await onExport() } finally { setExportingExcel(false) }
  }

  const handleExportPDF = async () => {
    if (!onExportPDF || exportingPDF) return
    setExportingPDF(true)
    try { await onExportPDF() } finally { setExportingPDF(false) }
  }

  return (
    <div className="mb-6 space-y-0">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--color-info)] to-[var(--color-info)] text-white shadow-lg shadow-blue-500/20">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)] dark:text-white tracking-tight">
              Measurement Book
            </h1>
            <p className="text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] mt-0.5">
              {itemCount} item{itemCount !== 1 ? 's' : ''} &middot; {lineCount} measurement line{lineCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onExport && (
            <Button size="sm" variant="outline" onClick={handleExportExcel} disabled={itemCount === 0 || exportingExcel} loading={exportingExcel}>
              <Download size={14} />
              Export Excel
            </Button>
          )}
          {onExportPDF && (
            <Button size="sm" variant="outline" onClick={handleExportPDF} disabled={itemCount === 0 || exportingPDF} loading={exportingPDF}>
              <FileText size={14} />
              Export PDF
            </Button>
          )}
          <Button size="sm" onClick={onAddItem}>
            <Plus size={14} />
            Add Item
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={selectedCount === 0}
            onClick={onGenerateBOQ}
          >
            <FileSpreadsheet size={14} />
            Generate BOQ
            {selectedCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-white/25 text-[10px] font-bold">
                {selectedCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Compact Filter Bar */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]" />
          <select
            value={activeSection ?? ''}
            onChange={(e) => onSectionFilter(e.target.value || null)}
            className={cn(
              'text-xs px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-elevated)]/80 text-[var(--color-text-secondary)] dark:text-[var(--color-text)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/40 focus:border-[var(--color-amber)]',
              'transition-colors',
              activeSection && 'border-[var(--color-amber)] dark:border-[var(--color-amber)] bg-[var(--color-info-bg)] dark:bg-[var(--color-info-bg)]/30 text-[var(--color-info)] dark:text-[var(--color-info)]',
            )}
          >
            <option value="">All Sections{sectionCount > 0 ? ` (${sectionCount})` : ''}</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by description, code, location..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className={cn(
              'w-full text-xs pl-7 pr-3 py-1.5 rounded-lg border border-[var(--color-border)] dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-elevated)]/80 text-[var(--color-text-secondary)] dark:text-[var(--color-text)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/40 focus:border-[var(--color-amber)]',
              'placeholder-slate-400 dark:placeholder-slate-500 transition-colors',
            )}
          />
        </div>
      </div>

      {/* Summary Stats Bar */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-px rounded-xl overflow-hidden border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-elevated)]">
        <StatCell label="Total Items" value={itemCount} />
        <StatCell label="Additions Qty" value={totalAdditions} className="text-emerald-600 dark:text-emerald-400" prefix="+" />
        <StatCell label="Deductions Qty" value={totalDeductions} className="text-red-500 dark:text-red-400" prefix="-" />
        <StatCell label="Net Quantity" value={netQuantity} className="text-[var(--color-info)] font-semibold" />
        <StatCell label="Sections" value={sectionCount} />
      </div>
    </div>
  )
}

function StatCell({
  label,
  value,
  className,
  prefix,
}: {
  label: string
  value: number
  className?: string
  prefix?: string
}) {
  const formatted = typeof value === 'number' && !Number.isInteger(value)
    ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : value.toLocaleString()

  return (
    <div className="bg-white dark:bg-[var(--color-surface-elevated)] px-4 py-2.5 text-center">
      <div className={cn('text-sm font-semibold tabular-nums', className ?? 'text-[var(--color-text)] dark:text-white')}>
        {prefix}{formatted}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] mt-0.5">
        {label}
      </div>
    </div>
  )
}
