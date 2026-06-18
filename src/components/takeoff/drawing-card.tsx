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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
            <FileText size={18} className="text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-slate-800 truncate">{drawing.name}</p>
            <p className="text-xs text-slate-400 truncate">{drawing.original_filename}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-2"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mb-4">
        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-xs font-medium">{drawing.page_count} page{drawing.page_count !== 1 ? 's' : ''}</span>
        {sizeLabel && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-xs font-medium">{sizeLabel}</span>}
        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-xs font-medium">{formatDate(drawing.created_at)}</span>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full">
          <Ruler size={11} />
          {measurementCount} measurement{measurementCount !== 1 ? 's' : ''}
        </div>
      </div>

      <Link
        href={`/projects/${projectId}/takeoff/${drawing.id}`}
        className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all"
      >
        Open in Viewer <ExternalLink size={13} />
      </Link>
    </div>
  )
}
