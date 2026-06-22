'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { getDrawings, createDrawing, deleteDrawing, getDrawingUrl } from '@/app/actions/drawings'
import type { Drawing, DrawingType } from '@/lib/types'
import { DRAWING_TYPES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { Upload, Trash2, FileText, Eye, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { PdfViewer } from '@/components/drawings/pdf-viewer'

export default function DrawingsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewDrawing, setViewDrawing] = useState<Drawing | null>(null)
  const [viewUrl, setViewUrl] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    drawing_type: 'other' as DrawingType,
    revision: '',
  })
  const [file, setFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getDrawings(projectId)
    setDrawings(data)
    setLoading(false)
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
    const { error: uploadErr } = await supabase.storage.from('drawings').upload(filePath, file)

    if (uploadErr) {
      setError(uploadErr.message)
      setUploading(false)
      return
    }

    const result = await createDrawing({
      project_id: projectId,
      name: form.name,
      drawing_type: form.drawing_type,
      revision: form.revision || undefined,
      file_path: filePath,
      file_type: ext,
      file_size: file.size,
    })

    if (result.error) {
      setError(result.error)
      setUploading(false)
      return
    }

    setShowUpload(false)
    setForm({ name: '', drawing_type: 'other', revision: '' })
    setFile(null)
    setUploading(false)
    load()
  }

  const handleView = async (drawing: Drawing) => {
    const url = await getDrawingUrl(drawing.file_path)
    if (url) {
      setViewUrl(url)
      setViewDrawing(drawing)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this drawing?')) return
    await deleteDrawing(id)
    load()
  }

  const typeLabel = (t: string) => DRAWING_TYPES.find((d) => d.value === t)?.label ?? t

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Drawings</h2>
          <p className="text-sm text-slate-500">{drawings.length} drawing{drawings.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload size={16} />
          Upload Drawing
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : drawings.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No drawings yet</h3>
          <p className="text-slate-500 text-sm mb-6">Upload project drawings (PDF, DWG, DXF, or images).</p>
          <Button onClick={() => setShowUpload(true)}>
            <Upload size={16} />
            Upload Drawing
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {drawings.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-blue-200 transition-colors"
            >
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <FileText size={18} className="text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{d.name}</p>
                <p className="text-xs text-slate-500">
                  {typeLabel(d.drawing_type)} · {d.file_type.toUpperCase()} · {d.revision ? `Rev ${d.revision}` : 'No rev'} · {formatDate(d.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {d.file_type === 'pdf' && (
                  <button onClick={() => handleView(d)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="View">
                    <Eye size={16} />
                  </button>
                )}
                <button onClick={() => handleDelete(d.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
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
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Drawing Type</label>
            <select
              value={form.drawing_type}
              onChange={(e) => setForm({ ...form, drawing_type: e.target.value as DrawingType })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DRAWING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <Input
            label="Revision"
            value={form.revision}
            onChange={(e) => setForm({ ...form, revision: e.target.value })}
            placeholder="e.g. A, B, 01"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">File</label>
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
              className="text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button onClick={handleUpload} loading={uploading} disabled={!file || !form.name.trim()}>
              Upload
            </Button>
          </div>
        </div>
      </Modal>

      {/* PDF viewer modal */}
      {viewDrawing && viewUrl && (
        <Modal
          isOpen={true}
          onClose={() => { setViewDrawing(null); setViewUrl(null) }}
          title={viewDrawing.name}
          size="xl"
        >
          <PdfViewer url={viewUrl} />
        </Modal>
      )}
    </div>
  )
}
