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
            ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent',
          !isCurrentPage && 'opacity-60'
        )}
      >
        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full" >
          {isActive && (
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          )}
        </div>

        <Ruler size={14} className="flex-shrink-0 text-slate-400 dark:text-slate-500" />

        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
            {formatLabel(scale)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {formatRatio(scale)} &middot; {scale.unit}
          </div>
        </div>

        {isActive && (
          <Check size={12} className="flex-shrink-0 text-blue-500" />
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
              : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400'
          )}
          title={isConfirming ? 'Click again to confirm' : 'Delete scale'}
        >
          <Trash2 size={12} />
        </button>
      </button>
    )
  }

  return (
    <div className="w-[300px] flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
          Scales
        </h3>
        <span className="text-[10px] text-slate-400 dark:text-slate-500">
          {scales.length} total
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-[400px]">
        {currentPageScales.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Page {currentPage}
            </div>
            {currentPageScales.map(renderScaleItem)}
          </div>
        )}

        {otherPageScales.length > 0 && (
          <div>
            <div className="px-2 py-1 mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Other Pages
            </div>
            {otherPageScales.map(renderScaleItem)}
          </div>
        )}

        {scales.length === 0 && (
          <div className="px-3 py-6 text-center">
            <Ruler size={20} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No scales calibrated
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Calibrate a scale to begin measuring
            </p>
          </div>
        )}
      </div>

      <div className="p-1.5 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onCalibrate}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
        >
          <Plus size={14} />
          Calibrate New
        </button>
      </div>
    </div>
  )
}
