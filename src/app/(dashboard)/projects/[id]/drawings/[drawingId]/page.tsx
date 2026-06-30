'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDrawing, getDrawingUrl } from '@/app/actions/drawings'
import type { Drawing } from '@/lib/types'
import { DRAWING_TYPES } from '@/lib/types'
import { ArrowLeft, Maximize2, Minimize2, AlertTriangle } from 'lucide-react'
import { TakeoffViewer } from '@/components/takeoff/takeoff-viewer'
import { DwgViewer } from '@/components/takeoff/dwg-viewer'
import { ImageViewer } from '@/components/takeoff/image-viewer'

export default function TakeoffPage() {
  const { id: projectId, drawingId } = useParams<{ id: string; drawingId: string }>()
  const router = useRouter()
  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const [drawingUrl, setDrawingUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const d = await getDrawing(drawingId)
        if (cancelled) return
        if (!d) {
          setError('Drawing not found')
          setLoading(false)
          return
        }
        setDrawing(d)
        const url = await getDrawingUrl(d.file_path)
        if (cancelled) return
        if (!url) {
          setError('Could not generate file URL. The file may have been deleted from storage.')
          setLoading(false)
          return
        }
        setDrawingUrl(url)
        setLoading(false)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load drawing')
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [drawingId, retryCount])

  const typeLabel = (t: string) => DRAWING_TYPES.find((d) => d.value === t)?.label ?? t

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)] bg-[#0e0e10]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-amber)]/20" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[var(--color-amber)] border-transparent animate-spin" />
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-text-muted)]">Loading blueprint…</p>
        </div>
      </div>
    )
  }

  if (error || !drawing || !drawingUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] gap-4 bg-[#0e0e10]">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle size={22} className="text-red-400" />
        </div>
        <p className="text-sm text-red-400 max-w-xs text-center">{error ?? 'Failed to load drawing'}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setRetryCount(c => c + 1)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[var(--color-amber)] text-[var(--color-on-amber)] rounded-lg hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
          <button
            onClick={() => router.push(`/projects/${projectId}/drawings`)}
            className="px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            Back to drawings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 flex flex-col bg-[#0e0e10]' : 'flex flex-col h-[calc(100vh-120px)]'}>
      {/* Obsidian toolbar — dark chrome matching the Stitch precision workspace */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        {/* Back */}
        <button
          onClick={() => router.push(`/projects/${projectId}/drawings`)}
          className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-amber)] transition-colors"
          title="Back to drawings"
        >
          <ArrowLeft size={15} />
        </button>

        <div className="w-px h-4 bg-[var(--color-border)]" />

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[var(--color-text)] truncate">
            {drawing.name}
          </h2>
          {drawing.drawing_number && (
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
              #{drawing.drawing_number}
            </span>
          )}
          {drawing.revision_number && (
            <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[var(--color-amber)]/10 text-[var(--color-amber)] rounded border border-[var(--color-amber)]/20">
              Rev {drawing.revision_number}
            </span>
          )}
          <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-mono uppercase text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded">
            {typeLabel(drawing.drawing_type)}
          </span>
          <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-mono uppercase text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded">
            {drawing.file_type.toUpperCase()}
          </span>
        </div>

        {/* Fullscreen toggle */}
        <button
          onClick={() => setFullscreen(v => !v)}
          className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-amber)] transition-colors"
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {/* Takeoff workspace — canvas rendering code untouched */}
      <div className="flex-1 min-h-0">
        {drawing.file_type === 'pdf' ? (
          <TakeoffViewer
            drawingId={drawing.id}
            projectId={projectId}
            drawingUrl={drawingUrl}
            pageCount={drawing.page_count}
            drawingName={drawing.name}
            drawingType={drawing.drawing_type}
          />
        ) : drawing.file_type === 'dwg' || drawing.file_type === 'dxf' ? (
          <DwgViewer
            drawingId={drawing.id}
            projectId={projectId}
            drawingUrl={drawingUrl}
            drawingName={drawing.name}
            drawingType={drawing.drawing_type}
            fileType={drawing.file_type}
            filePath={drawing.file_path}
          />
        ) : (
          <ImageViewer
            drawingId={drawing.id}
            projectId={projectId}
            drawingUrl={drawingUrl}
            drawingName={drawing.name}
            drawingType={drawing.drawing_type}
          />
        )}
      </div>
    </div>
  )
}
