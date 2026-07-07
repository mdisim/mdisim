'use client'

import { useState } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useWorkspace } from '../workspace-context'
import { createDrawing } from '@/app/actions/drawings'
import { createClient } from '@/lib/supabase/client'
import { DRAWING_TYPES } from '@/lib/types'
import type { Drawing, DrawingType } from '@/lib/types'
import { FileImage, Upload, AlertTriangle } from 'lucide-react'

const ALLOWED_EXTENSIONS = ['pdf', 'dwg', 'dxf', 'png', 'jpg', 'jpeg']

/** Shared sheet-picker grid for Drawings and Takeoff modes — keeps the "choose a sheet" moment identical everywhere it appears. Carries its own upload flow so a first-time user never has to leave the instrument to get a drawing in. */
export function DrawingPicker({ drawings, projectId, eyebrow, emptyTitle, onSelect, footer }: {
  drawings: Drawing[]
  projectId: string
  eyebrow: string
  emptyTitle: string
  onSelect: (d: Drawing) => void
  footer?: React.ReactNode
}) {
  const { reload } = useWorkspace()
  const { toast } = useToast()
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ name: '', drawing_type: 'other' as DrawingType, revision_number: '' })

  const resetForm = () => {
    setForm({ name: '', drawing_type: 'other', revision_number: '' })
    setFile(null)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file || !form.name.trim()) return
    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
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

    setUploading(false)
    setShowUpload(false)
    resetForm()
    reload()
    toast({ title: 'Drawing uploaded', description: form.name, variant: 'success' })
  }

  const uploadModal = (
    <Modal isOpen={showUpload} onClose={() => { setShowUpload(false); resetForm() }} title="Upload drawing" size="md">
      <div className="space-y-4">
        <Input
          label="Drawing name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Ground Floor Plan"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">Drawing type</label>
          <select
            value={form.drawing_type}
            onChange={e => setForm({ ...form, drawing_type: e.target.value as DrawingType })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/40"
          >
            {DRAWING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <Input
          label="Revision"
          value={form.revision_number}
          onChange={e => setForm({ ...form, revision_number: e.target.value })}
          placeholder="e.g. A, B, 01"
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">File</label>
          <input
            type="file"
            accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
            onChange={e => {
              const f = e.target.files?.[0] ?? null
              setFile(f)
              if (f && !form.name) setForm(prev => ({ ...prev, name: f.name.replace(/\.[^.]+$/, '') }))
            }}
            className="text-sm text-[var(--color-text-secondary)] file:me-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-wider file:bg-[var(--color-brand-tint)] file:text-[var(--color-brand)] hover:file:opacity-80 transition-all"
          />
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-danger-tint)] border border-[var(--color-danger)]/20">
            <AlertTriangle size={14} className="text-[var(--color-danger)] shrink-0" />
            <p className="text-xs text-[var(--color-danger)]">{error}</p>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => { setShowUpload(false); resetForm() }}>Cancel</Button>
          <Button onClick={handleUpload} loading={uploading} disabled={!file || !form.name.trim()}>Upload</Button>
        </div>
      </div>
    </Modal>
  )

  if (drawings.length === 0) {
    return (
      <>
        <EmptyState
          icon={FileImage}
          title={emptyTitle}
          description="Upload a drawing to this project to get started."
          actionLabel="Upload drawing"
          onAction={() => setShowUpload(true)}
        />
        {uploadModal}
      </>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">{eyebrow}</p>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-brand)] hover:opacity-80 transition-opacity"
        >
          <Upload size={12} /> Upload drawing
        </button>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {drawings.map(d => (
          <button
            key={d.id}
            onClick={() => onSelect(d)}
            className="text-start surface-elevated rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3 hover-lift hover:border-[var(--color-border-strong)] focus-ring"
          >
            <div className="w-full aspect-[4/3] rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] flex items-center justify-center mb-2.5 text-[var(--color-text-muted)]">
              <FileImage size={22} strokeWidth={1.5} />
            </div>
            <div className="text-[13px] font-medium text-[var(--color-text)] truncate">{d.name}</div>
            <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 font-mono uppercase tracking-wide">
              Rev {d.revision_number ?? '—'} · {d.file_type}
            </div>
          </button>
        ))}
      </div>
      {footer && <div className="mt-5">{footer}</div>}
      {uploadModal}
    </div>
  )
}
