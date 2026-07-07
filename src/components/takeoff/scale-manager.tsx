'use client'

import { useState } from 'react'
import { Ruler, Trash2, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteDrawingScale } from '@/app/actions/drawings'
import type { DrawingScale } from '@/lib/types'

interface ScaleManagerProps {
  drawingId: string
  currentPage: number
  activeScale: DrawingScale | null
  scales: DrawingScale[]
  onScaleSelect: (scale: DrawingScale) => void
  onCalibrate: () => void
  onScaleDelete: (id: string) => void
  onRefresh: () => void
}

export function ScaleManager({
  drawingId,
  currentPage,
  activeScale,
  scales,
  onScaleSelect,
  onCalibrate,
  onScaleDelete,
  onRefresh,
}: ScaleManagerProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const currentPageScales = scales.filter(s => s.page_number === currentPage)
  const otherPageScales = scales.filter(s => s.page_number !== currentPage)

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    setDeleting(true)
    const result = await deleteDrawingScale(id)
    setDeleting(false)
    setConfirmDeleteId(null)
    if (!result.error) {
      onScaleDelete(id)
      onRefresh()
    }
  }

  function formatLabel(scale: DrawingScale) {
    return scale.label || `Page ${scale.page_number} Scale`
  }

  function formatRatio(scale: DrawingScale) {
    return `${scale.px_per_unit.toFixed(1)} px/${scale.unit}`
  }

  function renderScaleItem(scale: DrawingScale) {
    const isActive = activeScale?.id === scale.id
    const isCurrentPage = scale.page_number === currentPage
    const isConfirming = confirmDeleteId === scale.id

    return (
      <button
        key={scale.id}
        onClick={() => onScaleSelect(scale)}
        className={cn(
          'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors group',
          isActive
            ? 'bg-[var(--color-amber)]/10 dark:bg-[var(--color-amber)]/10 border border-[var(--color-amber)]/20 dark:border-[var(--color-amber)]/20'
            : 'hover:bg-[var(--color-surface-hover)] dark:hover:bg-[var(--color-surface-hover)]/50 border border-transparent',
          !isCurrentPage && 'opacity-60'
        )}
      >
        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full" >
          {isActive && (
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand)]" />
          )}
        </div>

        <Ruler size={14} className="flex-shrink-0 text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]" />

        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-[var(--color-text)] truncate">
            {formatLabel(scale)}
          </div>
          <div className="text-[10px] text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
            {formatRatio(scale)} &middot; {scale.unit}
          </div>
        </div>

        {isActive && (
          <Check size={12} className="flex-shrink-0 text-[var(--color-amber)]" />
        )}

        <button
          onClick={e => {
            e.stopPropagation()
            handleDelete(scale.id)
          }}
          disabled={deleting}
          className={cn(
            'flex-shrink-0 p-1 rounded transition-colors',
            isConfirming
              ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
              : 'opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-500 dark:text-[var(--color-text-muted)] dark:hover:text-red-400'
          )}
          title={isConfirming ? 'Click again to confirm' : 'Delete scale'}
        >
          <Trash2 size={12} />
        </button>
      </button>
    )
  }

  return (
    <div className="w-[300px] flex flex-col bg-white dark:bg-[var(--color-surface-elevated)] border border-[var(--color-border)] dark:border-[var(--color-border)] rounded-lg shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--color-border)] dark:border-[var(--color-border)] flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wide">
          Scales
        </h3>
        <span className="text-[10px] text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
          {scales.length} total
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-[400px]">
        {currentPageScales.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[10px] font-medium text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] uppercase tracking-wider">
              Page {currentPage}
            </div>
            {currentPageScales.map(renderScaleItem)}
          </div>
        )}

        {otherPageScales.length > 0 && (
          <div>
            <div className="px-2 py-1 mt-1 text-[10px] font-medium text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] uppercase tracking-wider">
              Other Pages
            </div>
            {otherPageScales.map(renderScaleItem)}
          </div>
        )}

        {scales.length === 0 && (
          <div className="px-3 py-6 text-center">
            <Ruler size={20} className="mx-auto mb-2 text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]" />
            <p className="text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
              No scales calibrated
            </p>
            <p className="text-[10px] text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] mt-0.5">
              Calibrate a scale to begin measuring
            </p>
          </div>
        )}
      </div>

      <div className="p-1.5 border-t border-[var(--color-border)] dark:border-[var(--color-border)]">
        <button
          onClick={onCalibrate}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[var(--color-amber)] dark:text-[var(--color-amber)] bg-[var(--color-amber)]/10 dark:bg-[var(--color-amber)]/10 hover:bg-[var(--color-amber)]/10 dark:hover:bg-[var(--color-amber)]/10 transition-colors"
        >
          <Plus size={14} />
          Calibrate New
        </button>
      </div>
    </div>
  )
}
