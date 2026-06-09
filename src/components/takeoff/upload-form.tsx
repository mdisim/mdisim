'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Loader2, X, CheckCircle } from 'lucide-react'
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

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf') {
      setFile(f)
      setName(f.name.replace('.pdf', ''))
    } else {
      setError('Only PDF files are supported.')
    }
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setName(f.name.replace('.pdf', '')) }
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

      // Get page count from PDF.js (lightweight check)
      let pageCount = 1
      try {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
        GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`
        const buf = await file.arrayBuffer()
        const pdf = await getDocument({ data: buf }).promise
        pageCount = pdf.numPages
        await pdf.cleanup()
      } catch { /* page count estimation failed, default 1 */ }

      setProgress(85)
      const result = await createDrawingRecord(projectId, {
        name: name || file.name.replace('.pdf', ''),
        original_filename: file.name,
        storage_path: json.storagePath,
        file_size_bytes: json.fileSizeBytes,
        page_count: pageCount,
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
        <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={onFileChange} />

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
            <p className="text-slate-700 font-medium">Drop a PDF here or click to browse</p>
            <p className="text-sm text-slate-400 mt-1">Max 50 MB · PDF only</p>
          </>
        )}
      </div>

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

      <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before uploading</p>
        <p>Ensure your Supabase project has a <code className="bg-amber-100 px-1 rounded text-xs">drawings</code> storage bucket created. See <code className="bg-amber-100 px-1 rounded text-xs">supabase/schema.sql</code> for the SQL command.</p>
      </div>

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
