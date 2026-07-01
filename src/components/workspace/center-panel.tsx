'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useWorkspace } from './workspace-context'
import { getDrawingUrl } from '@/app/actions/drawings'
import {
  ImageIcon, Eye, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  RotateCw, Download, Maximize2, Layers, FileText,
} from 'lucide-react'

export function CenterPanel() {
  const { data, selection, selectDrawing } = useWorkspace()
  const drawing = selection.drawing
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    if (!drawing) { setImageUrl(null); return }
    setLoadingUrl(true)
    setZoom(1)
    setRotation(0)
    getDrawingUrl(drawing.file_path)
      .then(url => setImageUrl(url))
      .catch(() => setImageUrl(null))
      .finally(() => setLoadingUrl(false))
  }, [drawing])

  const currentIndex = drawing ? data.drawings.findIndex(d => d.id === drawing.id) : -1
  const canPrev = currentIndex > 0
  const canNext = currentIndex < data.drawings.length - 1

  const isPdf = drawing?.file_type === 'pdf'
  const isImage = drawing?.file_type && ['png', 'jpg', 'jpeg'].includes(drawing.file_type)

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] dark:bg-[#0a0b0f] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 h-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-2">
          {/* Drawing selector tabs */}
          <div className="flex items-center gap-0.5 overflow-x-auto max-w-[400px] scrollbar-none">
            {data.drawings.map(d => (
              <button
                key={d.id}
                onClick={() => selectDrawing(d)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-md whitespace-nowrap transition-all',
                  drawing?.id === d.id
                    ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]'
                )}
              >
                <FileText size={10} />
                {d.drawing_number ?? d.name}
              </button>
            ))}
          </div>
        </div>

        {/* Viewer controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => canPrev && selectDrawing(data.drawings[currentIndex - 1])}
            disabled={!canPrev}
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-30 transition-colors"
            title="Previous drawing"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => canNext && selectDrawing(data.drawings[currentIndex + 1])}
            disabled={!canNext}
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-30 transition-colors"
            title="Next drawing"
          >
            <ChevronRight size={14} />
          </button>
          <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]" title="Zoom in">
            <ZoomIn size={14} />
          </button>
          <span className="text-[10px] tabular-nums text-[var(--color-text-muted)] w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]" title="Zoom out">
            <ZoomOut size={14} />
          </button>
          <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]" title="Rotate">
            <RotateCw size={14} />
          </button>
          <button onClick={() => { setZoom(1); setRotation(0) }} className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]" title="Reset view">
            <Maximize2 size={14} />
          </button>
          {drawing && (
            <a
              href={`/projects/${drawing.project_id}/drawings/${drawing.id}`}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors ml-1"
            >
              <Eye size={10} />Open Full
            </a>
          )}
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-auto flex items-center justify-center relative">
        <AnimatePresence mode="wait">
          {!drawing ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--color-surface-elevated)] flex items-center justify-center">
                <ImageIcon size={32} className="text-[var(--color-border)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text-muted)]">No Drawings</p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Upload drawings to view them here</p>
            </motion.div>
          ) : loadingUrl ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] text-[var(--color-text-muted)]">Loading drawing...</span>
            </motion.div>
          ) : isPdf && imageUrl ? (
            <motion.div key="pdf" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="w-full h-full">
              <iframe
                src={`${imageUrl}#toolbar=0`}
                className="w-full h-full border-0"
                title={drawing.name}
                style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transformOrigin: 'center center' }}
              />
            </motion.div>
          ) : isImage && imageUrl ? (
            <motion.div key="image" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="flex items-center justify-center p-4">
              <img
                src={imageUrl}
                alt={drawing.name}
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg transition-transform duration-200"
                style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
              />
            </motion.div>
          ) : (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md p-8">
              <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/20 dark:to-indigo-800/20 flex items-center justify-center shadow-lg">
                <ImageIcon size={36} className="text-indigo-500" />
              </div>
              <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">{drawing.name}</h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mb-1">
                {drawing.drawing_number && <span className="font-mono">{drawing.drawing_number} · </span>}
                {drawing.drawing_type} · Rev {drawing.revision_number ?? '—'}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)] mb-4">
                {drawing.file_type?.toUpperCase()} · {drawing.file_size ? `${(drawing.file_size / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
              </p>
              <a
                href={`/projects/${drawing.project_id}/drawings/${drawing.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Eye size={12} />
                Open in Full Viewer
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status bar */}
      {drawing && (
        <div className="flex items-center justify-between px-3 h-6 bg-[var(--color-surface)] border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] shrink-0">
          <div className="flex items-center gap-3">
            <span>{drawing.name}</span>
            <span className="font-mono">{drawing.drawing_number}</span>
            <span>{drawing.drawing_type}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{drawing.file_type?.toUpperCase()}</span>
            {drawing.file_size && <span>{(drawing.file_size / 1024 / 1024).toFixed(1)} MB</span>}
            <span>{drawing.page_count} page{drawing.page_count !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  )
}
