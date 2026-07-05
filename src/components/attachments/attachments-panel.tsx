'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { QuantityAttachment, AttachmentCategory } from '@/lib/types'
import { uploadAttachment, deleteAttachment, getAttachmentUrl } from '@/app/actions/attachments'
import {
  Upload, Trash2, FileText, Image, FileSpreadsheet,
  File, Loader2, Download, Eye, Plus, X,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'

const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  site_photo: 'Site Photo',
  inspection: 'Inspection',
  drawing: 'Drawing',
  calculation: 'Calculation',
  specification: 'Specification',
  correspondence: 'Correspondence',
  other: 'Other',
}

const ACCEPT = 'image/*,.pdf,.xlsx,.xls,.csv,.doc,.docx,.dwg,.dxf'

function FileIcon({ type }: { type: string }) {
  if (type === 'photo') return <Image size={16} className="text-[var(--color-amber)]" />
  if (type === 'pdf') return <FileText size={16} className="text-[var(--color-danger-light)]" />
  if (type === 'excel') return <FileSpreadsheet size={16} className="text-[var(--color-success-light)]" />
  return <File size={16} className="text-[var(--color-text-muted)]" />
}

function fmt(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

interface AttachmentsPanelProps {
  projectId: string
  miId?: string
  boqItemId?: string
  drawingMeasurementId?: string
  lineId?: string
  initialAttachments?: QuantityAttachment[]
  onCountChange?: (count: number) => void
  className?: string
  compact?: boolean
}

export function AttachmentsPanel({
  projectId,
  miId,
  boqItemId,
  drawingMeasurementId,
  lineId,
  initialAttachments = [],
  onCountChange,
  className,
  compact = false,
}: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<QuantityAttachment[]>(initialAttachments)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewAtt, setPreviewAtt] = useState<QuantityAttachment | null>(null)
  const [category, setCategory] = useState<AttachmentCategory>('other')
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    setAttachments(initialAttachments)
  }, [initialAttachments])

  useEffect(() => {
    onCountChange?.(attachments.length)
  }, [attachments.length, onCountChange])

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const results = await Promise.all(
        Array.from(files).map((file) =>
          uploadAttachment({
            projectId,
            miId,
            boqItemId,
            drawingMeasurementId,
            lineId,
            file,
            category,
          })
        )
      )
      const newAtts = results.flatMap((r) => (r.data ? [r.data] : []))
      const errors = results.filter((r) => r.error)
      if (newAtts.length > 0) {
        setAttachments((prev) => [...newAtts, ...prev])
        toast({ title: `${newAtts.length} file${newAtts.length > 1 ? 's' : ''} uploaded`, variant: 'success' })
      }
      if (errors.length > 0) {
        toast({ title: `${errors.length} upload(s) failed`, variant: 'danger' })
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }, [projectId, miId, boqItemId, drawingMeasurementId, lineId, category, toast])

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    const { error } = await deleteAttachment(id)
    if (error) {
      toast({ title: error, variant: 'danger' })
    } else {
      setAttachments((prev) => prev.filter((a) => a.id !== id))
    }
    setDeletingId(null)
  }, [toast])

  const handlePreview = useCallback(async (att: QuantityAttachment) => {
    setPreviewAtt(att)
    const url = await getAttachmentUrl(att.file_path)
    setPreviewUrl(url)
  }, [])

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Upload strip */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as AttachmentCategory)}
          className="h-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] text-xs px-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-amber)]/50"
        >
          {(Object.entries(CATEGORY_LABELS) as [AttachmentCategory, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[var(--color-amber)]/10 hover:bg-[var(--color-amber)]/20 text-[var(--color-amber)] text-xs font-medium transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          {uploading ? 'Uploading…' : 'Add Files'}
        </button>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Drop zone (compact mode hidden) */}
      {!compact && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
          className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-4 text-center text-[var(--color-text-muted)] text-xs hover:border-[var(--color-amber)]/50 transition-colors cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={18} className="mx-auto mb-1 opacity-40" />
          Drag & drop photos, PDFs, Excel, or DWG files here
        </div>
      )}

      {/* Attachment list */}
      <AnimatePresence initial={false}>
        {attachments.map((att) => (
          <motion.div
            key={att.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-2 p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] group"
          >
            <FileIcon type={att.file_type} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--color-text)] truncate">{att.title ?? att.file_name}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {CATEGORY_LABELS[att.category]} {att.file_size ? `· ${fmt(att.file_size)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {att.file_type === 'photo' && (
                <button
                  onClick={() => handlePreview(att)}
                  className="p-1 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  title="Preview"
                >
                  <Eye size={13} />
                </button>
              )}
              <button
                onClick={async () => {
                  const url = await getAttachmentUrl(att.file_path)
                  if (url) window.open(url, '_blank')
                }}
                className="p-1 rounded hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                title="Download"
              >
                <Download size={13} />
              </button>
              <button
                onClick={() => handleDelete(att.id)}
                disabled={deletingId === att.id}
                className="p-1 rounded hover:bg-[var(--color-danger-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-danger-light)] disabled:opacity-50"
                title="Delete"
              >
                {deletingId === att.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {attachments.length === 0 && !uploading && (
        <p className="text-xs text-[var(--color-text-muted)] text-center py-2">No attachments yet</p>
      )}

      {/* Photo preview modal */}
      <AnimatePresence>
        {previewAtt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => { setPreviewAtt(null); setPreviewUrl(null) }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-3xl max-h-[80vh] rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setPreviewAtt(null); setPreviewUrl(null) }}
                className="absolute top-3 end-3 z-10 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70"
              >
                <X size={16} />
              </button>
              {previewUrl ? (
                <img src={previewUrl} alt={previewAtt.title ?? previewAtt.file_name} className="max-h-[80vh] object-contain" />
              ) : (
                <div className="flex items-center justify-center w-64 h-64 bg-[var(--color-surface)]">
                  <Loader2 className="animate-spin text-[var(--color-amber)]" />
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-sm font-medium">{previewAtt.title ?? previewAtt.file_name}</p>
                <p className="text-white/60 text-xs">{CATEGORY_LABELS[previewAtt.category]}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
