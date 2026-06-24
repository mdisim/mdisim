'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDrawing, getDrawingUrl } from '@/app/actions/drawings'
import type { Drawing } from '@/lib/types'
import { DRAWING_TYPES } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'
import { TakeoffViewer } from '@/components/takeoff/takeoff-viewer'

export default function TakeoffPage() {
  const { id: projectId, drawingId } = useParams<{ id: string; drawingId: string }>()
  const router = useRouter()
  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const [drawingUrl, setDrawingUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
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
      setDrawingUrl(url)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [drawingId])

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
        <p className="text-sm text-red-500 dark:text-red-400">{error ?? 'Failed to load drawing'}</p>
        <button
          onClick={() => router.push(`/projects/${projectId}/drawings`)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to drawings
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
        <button
          onClick={() => router.push(`/projects/${projectId}/drawings`)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          title="Back to drawings"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
          {drawing.name}
        </h2>
        {drawing.revision_number && (
          <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
            Rev {drawing.revision_number}
          </span>
        )}
        <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
          {typeLabel(drawing.drawing_type)}
        </span>
      </div>

      {/* Takeoff viewer */}
      <div className="flex-1 min-h-0">
        <TakeoffViewer
          drawingId={drawing.id}
          projectId={projectId}
          drawingUrl={drawingUrl}
          pageCount={drawing.page_count}
        />
      </div>
    </div>
  )
}
