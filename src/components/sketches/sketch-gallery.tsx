'use client'

import { useState, useEffect } from 'react'
import type { MeasurementSketch } from '@/lib/types'
import { getSketchImageUrl, deleteSketch } from '@/app/actions/sketches'
import { Image as ImageIcon, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SketchGalleryProps {
  sketches: MeasurementSketch[]
  compact?: boolean
  onDeleted?: (id: string) => void
  className?: string
}

export function SketchGallery({ sketches, compact = false, onDeleted, className }: SketchGalleryProps) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const entries: Record<string, string> = {}
      for (const s of sketches) {
        if (s.file_path) {
          const url = await getSketchImageUrl(s.file_path)
          if (url) entries[s.id] = url
        }
      }
      if (!cancelled) setUrls(entries)
    }
    if (sketches.length > 0) load()
    return () => { cancelled = true }
  }, [sketches])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await deleteSketch(id)
    setDeletingId(null)
    onDeleted?.(id)
  }

  if (sketches.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-[var(--color-text-muted)]">
        <ImageIcon size={24} className="mx-auto mb-2 opacity-30" />
        No sketches yet.
      </div>
    )
  }

  return (
    <div className={cn(compact ? 'grid grid-cols-2 sm:grid-cols-3 gap-2' : 'space-y-3', className)}>
      {sketches.map((s) => (
        <div key={s.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden group relative">
          {urls[s.id] ? (
            <img src={urls[s.id]} alt="Sketch" className={cn('w-full object-contain bg-black/20', compact ? 'h-24' : 'max-h-48')} />
          ) : (
            <div className={cn('flex items-center justify-center bg-black/10', compact ? 'h-24' : 'h-32')}>
              <ImageIcon size={20} className="opacity-20" />
            </div>
          )}
          {!compact && (
            <div className="px-3 py-2 space-y-1">
              <div className="flex items-center gap-3 text-[11px]">
                {s.drawing_ref && <span className="font-mono text-[var(--color-amber)]">{s.drawing_ref}</span>}
                {s.page_number != null && <span className="text-[var(--color-text-muted)]">Pg {s.page_number}</span>}
                {s.scale_label && <span className="text-[var(--color-text-muted)]">Scale {s.scale_label}</span>}
              </div>
              {s.formula && (
                <div className="font-mono text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface-hover)] px-2 py-1 rounded">
                  {s.formula}
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-muted)]">{s.snapshot_type === 'auto' ? 'Auto-generated' : 'Manual'}</span>
                {s.quantity != null && (
                  <span className="font-mono font-semibold text-[var(--color-amber)]">
                    {s.quantity.toLocaleString('en-US', { minimumFractionDigits: 3 })} {s.unit}
                  </span>
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => handleDelete(s.id)}
            disabled={deletingId === s.id}
            className="absolute top-1.5 end-1.5 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80"
            title="Delete sketch"
          >
            {deletingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      ))}
    </div>
  )
}
