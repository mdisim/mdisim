'use client'

import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '../workspace-context'
import { getDrawingUrl } from '@/app/actions/drawings'
import { TakeoffViewer } from '@/components/takeoff/takeoff-viewer'
import { DwgViewer } from '@/components/takeoff/dwg-viewer'
import { ImageViewer } from '@/components/takeoff/image-viewer'
import { SaveToQuantitiesDialog } from '@/components/takeoff/save-to-quantities-dialog'
import { DrawingPicker } from './drawing-picker'
import type { DrawingMeasurement } from '@/lib/types'
import { AlertTriangle, Loader2, ChevronLeft } from 'lucide-react'

export function TakeoffMode({ projectId }: { projectId: string }) {
  const { data, selection, selectDrawing } = useWorkspace()
  const [drawingUrl, setDrawingUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ dm: DrawingMeasurement; canvas: string | null } | null>(null)

  const drawing = selection.drawing

  useEffect(() => {
    if (!drawing) { setDrawingUrl(null); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    getDrawingUrl(drawing.file_path)
      .then(url => { if (!cancelled) { setDrawingUrl(url); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e instanceof Error ? e.message : 'Failed to load drawing'); setLoading(false) } })
    return () => { cancelled = true }
  }, [drawing])

  const onSaved = useCallback((dm: DrawingMeasurement, canvasDataUrl: string | null) => {
    setPending({ dm, canvas: canvasDataUrl })
  }, [])

  if (!drawing) {
    return (
      <DrawingPicker
        drawings={data.drawings}
        projectId={projectId}
        eyebrow="Choose a sheet to measure"
        emptyTitle="No drawings uploaded yet"
        onSelect={selectDrawing}
      />
    )
  }

  if (loading || !drawingUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        {error ? (
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <AlertTriangle size={22} className="text-[var(--color-danger)]" />
            <p className="text-[13px] text-[var(--color-danger)] max-w-xs">{error}</p>
          </div>
        ) : (
          <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--color-border)] shrink-0">
        <button onClick={() => selectDrawing(null)} className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors focus-ring rounded-[var(--radius-sm)]">
          <ChevronLeft size={13} /> All sheets
        </button>
        <span className="text-[var(--color-border-strong)]">/</span>
        <span className="text-[12px] font-medium text-[var(--color-text)] truncate">{drawing.name}</span>
      </div>
      <div className="relative flex-1 min-h-0">
      {drawing.file_type === 'pdf' ? (
        <TakeoffViewer
          drawingId={drawing.id}
          projectId={projectId}
          drawingUrl={drawingUrl}
          pageCount={drawing.page_count}
          drawingName={drawing.name}
          drawingType={drawing.drawing_type}
          onMeasurementSaved={onSaved}
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
      {pending && (
        <SaveToQuantitiesDialog
          dm={pending.dm}
          canvasDataUrl={pending.canvas}
          projectId={projectId}
          drawingId={drawing.id}
          drawingName={drawing.name}
          drawingNumber={drawing.drawing_number ?? undefined}
          revisionNumber={drawing.revision_number ?? undefined}
          pageNumber={pending.dm.page_number}
          onSaved={() => setPending(null)}
          onClose={() => setPending(null)}
        />
      )}
      </div>
    </div>
  )
}
