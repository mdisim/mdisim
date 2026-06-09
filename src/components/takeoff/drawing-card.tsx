'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Ruler, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import { deleteDrawing } from '@/app/actions/takeoff'
import { DrawingFile } from '@/lib/types'
import { formatDate } from '@/lib/utils'

interface Props {
  drawing: DrawingFile
  projectId: string
  measurementCount: number
}

export function DrawingCard({ drawing, projectId, measurementCount }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm(`Delete "${drawing.name}"? All measurements will be lost.`)) return
    startTransition(async () => {
      await deleteDrawing(drawing.id, projectId, drawing.storage_path)
      router.refresh()
    })
  }

  const sizeLabel = drawing.file_size_bytes
    ? drawing.file_size_bytes > 1024 * 1024
      ? `${(drawing.file_size_bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(drawing.file_size_bytes / 1024)} KB`
    : ''

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
            <FileText size={18} className="text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{drawing.name}</p>
            <p className="text-xs text-slate-400 truncate">{drawing.original_filename}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-2"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
        <span>{drawing.page_count} page{drawing.page_count !== 1 ? 's' : ''}</span>
        {sizeLabel && <span>{sizeLabel}</span>}
        <span>{formatDate(drawing.created_at)}</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full">
          <Ruler size={11} />
          {measurementCount} measurement{measurementCount !== 1 ? 's' : ''}
        </div>
      </div>

      <Link
        href={`/projects/${projectId}/takeoff/${drawing.id}`}
        className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-all"
      >
        Open in Viewer <ExternalLink size={13} />
      </Link>
    </div>
  )
}
