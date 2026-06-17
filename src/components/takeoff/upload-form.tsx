'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Loader2, X, Info } from 'lucide-react'
import { createDrawingRecord } from '@/app/actions/takeoff'

interface Props { projectId: string }

export function UploadForm({ projectId }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const isDxf = file?.name.toLowerCase().endsWith('.dxf') ?? false

  const MAX_SIZE_MB = 100
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

  const acceptFile = useCallback((f: File) => {
    const lower = f.name.toLowerCase()
    if (!(f.type === 'application/pdf' || lower.endsWith('.pdf') || lower.endsWith('.dxf'))) {
      setError('Only PDF and DXF files are supported.')
      return
    }
    if (f.size > MAX_SIZE_BYTES) {
      const sizeMB = (f.size / (1024 * 1024)).toFixed(1)
      setError(`File size ${sizeMB} MB exceeds the ${MAX_SIZE_MB} MB limit. Try compressing the PDF or splitting into smaller files.`)
      return
    }
    setFile(f)
    setName(f.name.replace(/\.(pdf|dxf)$/i, ''))
    setError(null)
  }, [MAX_SIZE_BYTES])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) acceptFile(f)
  }, [acceptFile])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) acceptFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)

      setProgress(30)
      const res = await fetch('/api/takeoff/upload', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setProgress(70)

      let pageCount = 1
      if (!isDxf) {
        try {
          const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
          GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
          const buf = await file.arrayBuffer()
          const pdf = await getDocument({ data: buf }).promise
          pageCount = pdf.numPages
          await pdf.cleanup()
        } catch { /* default 1 */ }
      }

      setProgress(85)
      const result = await createDrawingRecord(projectId, {
        name: name || file.name.replace(/\.(pdf|dxf)$/i, ''),
        original_filename: file.name,
        storage_path: json.storagePath,
        file_size_bytes: json.fileSizeBytes,
        page_count: pageCount,
        file_type: json.fileType ?? 'pdf',
      })

      if (result.error) throw new Error(result.error)
      setProgress(100)
      router.push(`/projects/${projectId}/takeoff/${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onClick={() => !file && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragging ? 'border-amber-400 bg-amber-50' :
          file ? 'border-green-400 bg-green-50 cursor-default' : 'border-slate-300 hover:border-amber-400 hover:bg-amber-50/30'
        }`}
      >
        <input ref={inputRef} type="file" accept=".pdf,.dxf" className="hidden" onChange={onFileChange} />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText size={32} className="text-green-500" />
            <div className="text-left">
              <p className="font-medium text-slate-800">{file.name}</p>
              <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button onClick={e => { e.stopPropagation(); setFile(null); setName('') }}
              className="ml-2 p-1 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500">
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={36} className="mx-auto mb-3 text-slate-400" />
            <p className="text-slate-700 font-medium">Drop a PDF or DXF here or click to browse</p>
            <p className="text-sm text-slate-400 mt-1">Max {MAX_SIZE_MB} MB · PDF or DXF</p>
          </>
        )}
      </div>

      {/* DXF notice */}
      {isDxf && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-0.5">DXF file detected</p>
            <p className="text-blue-700">DXF files are rendered with full layer visibility and support all measurement tools — calibrate scale, measure lengths, areas, and counts, then push to BOQ.</p>
          </div>
        </div>
      )}

      {/* Drawing name */}
      {file && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Drawing Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Ground Floor Plan - Rev C"
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-slate-600">{progress < 70 ? 'Uploading…' : progress < 90 ? 'Processing…' : 'Saving…'}</span>
            <span className="text-slate-500">{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
      >
        {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        {uploading ? 'Uploading…' : 'Upload & Open'}
      </button>
    </div>
  )
}
