'use client'

import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFitToPage: () => void
  onZoomSet: (z: number) => void
}

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.5, 2, 3]

export function ZoomControls({ zoom, onZoomIn, onZoomOut, onFitToPage, onZoomSet }: ZoomControlsProps) {
  return (
    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-1">
      <button
        onClick={onZoomOut}
        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
        title="Zoom out (−)"
      >
        <ZoomOut size={14} />
      </button>

      <select
        value=""
        onChange={e => {
          const v = parseFloat(e.target.value)
          if (!isNaN(v)) onZoomSet(v)
        }}
        className="appearance-none bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 w-[52px] text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded py-1 transition-colors"
        title="Zoom level"
      >
        <option value="" disabled>{Math.round(zoom * 100)}%</option>
        {ZOOM_PRESETS.map(z => (
          <option key={z} value={z}>{Math.round(z * 100)}%</option>
        ))}
      </select>

      <button
        onClick={onZoomIn}
        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
        title="Zoom in (+)"
      >
        <ZoomIn size={14} />
      </button>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-0.5" />

      <button
        onClick={onFitToPage}
        className={cn(
          'p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors',
        )}
        title="Fit to page (0)"
      >
        <Maximize size={14} />
      </button>
    </div>
  )
}
