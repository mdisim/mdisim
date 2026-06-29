'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDrawing, getDrawingUrl } from '@/app/actions/drawings'
import type { Drawing } from '@/lib/types'
import { DRAWING_TYPES } from '@/lib/types'
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react'
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
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error || !drawing || !drawingUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] gap-4">
        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <ArrowLeft size={20} className="text-red-400 rotate-[135deg]" />
        </div>
        <p className="text-sm text-red-500 dark:text-red-400">{error ?? 'Failed to load drawing'}</p>
        <div className="flex gap-3">
          <button
            onClick={() => setRetryCount(c => c + 1)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
          <button
            onClick={() => router.push(`/projects/${projectId}/drawings`)}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Back to drawings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900' : 'flex flex-col h-[calc(100vh-120px)]'}>
      {/* Compact professional header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 shrink-0">
        <button
          onClick={() => router.push(`/projects/${projectId}/drawings`)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
          title="Back to drawings"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
          {drawing.name}
        </h2>
        {drawing.drawing_number && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            #{drawing.drawing_number}
          </span>
        )}
        {drawing.revision_number && (
          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded">
            Rev {drawing.revision_number}
          </span>
        )}
        <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded">
          {typeLabel(drawing.drawing_type)}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setFullscreen(v => !v)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
          title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      {/* Takeoff workspace */}
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
