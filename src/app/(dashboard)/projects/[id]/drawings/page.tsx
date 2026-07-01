'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getDrawings, createDrawing, deleteDrawing } from '@/app/actions/drawings'
import type { Drawing, DrawingType } from '@/lib/types'
import { DRAWING_TYPES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { CardSkeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { Upload, Trash2, FileText, Eye, Brain, ChevronDown, ChevronRight, ImageIcon, AlertTriangle } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { DrawingIntelligence } from '@/components/drawings/drawing-intelligence'

export default function DrawingsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const router = useRouter()
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showIntelligence, setShowIntelligence] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const [form, setForm] = useState({
    name: '',
    drawing_type: 'other' as DrawingType,
    revision_number: '',
  })
  const [file, setFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDrawings(projectId)
      setDrawings(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load drawings')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleUpload = async () => {
    if (!file || !form.name.trim()) return
    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const allowed = ['pdf', 'dwg', 'dxf', 'png', 'jpg', 'jpeg']
    if (!allowed.includes(ext)) {
      setError('Unsupported file type. Use PDF, DWG, DXF, or images.')
      setUploading(false)
      return
    }

    const supabase = createClient()
    const filePath = `${projectId}/${crypto.randomUUID()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('qb-drawings').upload(filePath, file)

    if (uploadErr) {
      setError(uploadErr.message)
      setUploading(false)
      return
    }

    const result = await createDrawing({
      project_id: projectId,
      name: form.name,
      drawing_type: form.drawing_type,
      revision_number: form.revision_number || undefined,
      file_path: filePath,
      file_type: ext,
      file_size: file.size,
    })

    if (result.error) {
      supabase.storage.from('qb-drawings').remove([filePath]).catch(() => {})
      setError(result.error)
      setUploading(false)
      return
    }

    setShowUpload(false)
    setForm({ name: '', drawing_type: 'other', revision_number: '' })
    setFile(null)
    setUploading(false)
    load()
  }

  const handleView = (drawing: Drawing) => {
    router.push(`/projects/${projectId}/drawings/${drawing.id}`)
  }

  const handleDelete = async (id: string) => {
    setConfirmAction({
      message: 'Delete this drawing?',
      onConfirm: async () => {
        await deleteDrawing(id)
        load()
      },
    })
  }

  const typeLabel = (t: string) => DRAWING_TYPES.find((d) => d.value === t)?.label ?? t

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-amber)] flex items-center justify-center shrink-0">
            <ImageIcon size={20} className="text-[var(--color-on-amber)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--color-text)] tracking-tight">Drawings</h2>
            <p className="text-xs text-[var(--color-text-muted)] font-mono uppercase tracking-wider">
              {drawings.length} blueprint{drawings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-amber)] text-[var(--color-on-amber)] text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
        >
          <Upload size={15} />
          Upload Drawing
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : error && !loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">{error}</p>
          <button
            onClick={() => load()}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : drawings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-center mb-5">
            <FileText size={28} className="text-[var(--color-text-muted)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">No drawings yet</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-xs">
            Upload project drawings in PDF, DWG, DXF, or image format to begin.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-amber)] text-[var(--color-on-amber)] text-sm font-bold hover:opacity-90 active:scale-95 transition-all"
          >
            <Upload size={15} />
            Upload Drawing
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {drawings.map((d, idx) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-amber)]/40 transition-all">
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-[var(--color-amber)]" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)] truncate">{d.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
                      {typeLabel(d.drawing_type)}
                    </span>
                    <span className="text-[var(--color-border)] text-xs">·</span>
                    <span className="text-[10px] font-mono uppercase text-[var(--color-amber)]/80">
                      {d.file_type}
                    </span>
                    {d.revision_number && (
                      <>
                        <span className="text-[var(--color-border)] text-xs">·</span>
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">Rev {d.revision_number}</span>
                      </>
                    )}
                    <span className="text-[var(--color-border)] text-xs">·</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{formatDate(d.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleView(d)}
                    className="p-2 rounded-lg hover:bg-[var(--color-amber)]/10 text-[var(--color-text-muted)] hover:text-[var(--color-amber)] transition-colors"
                    title="View"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Drawing Intelligence — Amber neural panel */}
      {drawings.length > 0 && (
        <div className="mt-5">
          <button
            onClick={() => setShowIntelligence(v => !v)}
            className={cn(
              'flex items-center gap-2.5 px-4 py-3 w-full rounded-xl border transition-all',
              showIntelligence
                ? 'border-[var(--color-amber)]/50 bg-[var(--color-amber)]/5'
                : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-amber)]/30'
            )}
          >
            {showIntelligence
              ? <ChevronDown size={15} className="text-[var(--color-amber)] shrink-0" />
              : <ChevronRight size={15} className="text-[var(--color-amber)] shrink-0" />
            }
            <Brain size={16} className="text-[var(--color-amber)] shrink-0" />
            <span className="text-sm font-bold text-[var(--color-text)]">Drawing Intelligence</span>
            <span className="text-xs text-[var(--color-text-muted)] hidden sm:inline">
              — Quantity change detection &amp; auto-update suggestions
            </span>
          </button>
          {showIntelligence && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 rounded-xl border border-[var(--color-amber)]/20 bg-[var(--color-surface-elevated)] overflow-hidden"
            >
              <DrawingIntelligence projectId={projectId} drawings={drawings} />
            </motion.div>
          )}
        </div>
      )}

      {/* Upload modal */}
      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Upload Drawing" size="md">
        <div className="space-y-4">
          <Input
            label="Drawing Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Ground Floor Plan"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Drawing Type</label>
            <select
              value={form.drawing_type}
              onChange={(e) => setForm({ ...form, drawing_type: e.target.value as DrawingType })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/40"
            >
              {DRAWING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Revision"
            value={form.revision_number}
            onChange={(e) => setForm({ ...form, revision_number: e.target.value })}
            placeholder="e.g. A, B, 01"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">File</label>
            <input
              type="file"
              accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                if (f && !form.name) {
                  setForm({ ...form, name: f.name.replace(/\.[^.]+$/, '') })
                }
              }}
              className="text-sm text-[var(--color-text-secondary)] file:me-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-wider file:bg-[var(--color-amber)]/10 file:text-[var(--color-amber)] hover:file:bg-[var(--color-amber)]/20 transition-all"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={handleUpload} loading={uploading} disabled={!file || !form.name.trim()}>
              Upload
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm" size="sm">
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>Confirm</Button>
        </div>
      </Modal>
    </div>
  )
}
