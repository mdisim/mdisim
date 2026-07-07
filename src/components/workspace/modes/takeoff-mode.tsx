'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { getDrawingUrl } from '@/app/actions/drawings'
import { TakeoffViewer } from '@/components/takeoff/takeoff-viewer'
import { DwgViewer } from '@/components/takeoff/dwg-viewer'
import { ImageViewer } from '@/components/takeoff/image-viewer'
import { SaveToQuantitiesDialog } from '@/components/takeoff/save-to-quantities-dialog'
import type { DrawingMeasurement } from '@/lib/types'
import { FileImage, Ruler, AlertTriangle, Loader2 } from 'lucide-react'

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
      <div className="h-full overflow-y-auto p-6">
        <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Choose a sheet to measure</p>
        {data.drawings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-16">
            <Ruler size={28} className="text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text)]">No drawings uploaded yet</p>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {data.drawings.map(d => (
              <button
                key={d.id}
                onClick={() => selectDrawing(d)}
                className="text-start surface-elevated rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3 hover:border-[var(--color-border-strong)] transition-colors"
              >
                <div className="w-full aspect-[4/3] rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] flex items-center justify-center mb-2 text-[var(--color-text-muted)]">
                  <FileImage size={22} />
                </div>
                <div className="text-[12px] font-medium text-[var(--color-text)] truncate">{d.name}</div>
                <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 font-mono uppercase">{d.drawing_number ?? d.file_type}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading || !drawingUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        {error ? (
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <AlertTriangle size={22} className="text-[var(--color-danger)]" />
            <p className="text-[12.5px] text-[var(--color-danger)] max-w-xs">{error}</p>
          </div>
        ) : (
          <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
        )}
      </div>
    )
  }

  return (
    <div className="relative h-full">
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
  )
}
