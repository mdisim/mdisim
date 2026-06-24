'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus, FileSpreadsheet, Search, Download } from 'lucide-react'

interface MeasurementToolbarProps {
  onAddItem: () => void
  onGenerateBOQ: () => void
  onExport?: () => void
  selectedCount: number
  sections: string[]
  activeSection: string | null
  onSectionFilter: (section: string | null) => void
  searchQuery: string
  onSearch: (q: string) => void
  itemCount: number
  lineCount: number
}

export function MeasurementToolbar({
  onAddItem,
  onGenerateBOQ,
  onExport,
  selectedCount,
  sections,
  activeSection,
  onSectionFilter,
  searchQuery,
  onSearch,
  itemCount,
  lineCount,
}: MeasurementToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-1 py-3 flex-wrap">
      {/* Left: actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onAddItem}>
          <Plus size={15} />
          Item
        </Button>
        <Button
          size="sm"
          variant="accent"
          disabled={selectedCount === 0}
          onClick={onGenerateBOQ}
          className="relative"
        >
          <FileSpreadsheet size={15} />
          Generate BOQ
          {selectedCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-white/25 text-[10px] font-bold">
              {selectedCount}
            </span>
          )}
        </Button>
        {onExport && (
          <Button size="sm" variant="outline" onClick={onExport} disabled={itemCount === 0}>
            <Download size={15} />
            Export
          </Button>
        )}
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
          {itemCount} items &middot; {lineCount} lines
        </span>
      </div>

      {/* Center: section filter */}
      <div className="flex items-center gap-2">
        <select
          value={activeSection ?? ''}
          onChange={(e) => onSectionFilter(e.target.value || null)}
          className={cn(
            'text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          )}
        >
          <option value="">All Sections</option>
          {sections.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Right: search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className={cn(
            'text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 w-52',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'placeholder-slate-400 dark:placeholder-slate-500',
          )}
        />
      </div>
    </div>
  )
}
