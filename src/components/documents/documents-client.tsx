'use client'

import { useState, useTransition } from 'react'
import { FolderOpen, Plus, Trash2, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { createDocument, deleteDocument } from '@/app/actions/documents'
import type { ProjectDocument } from '@/lib/types'

const DOC_TYPES = ['drawing', 'specification', 'report', 'contract', 'other'] as const
const DOC_STATUSES = ['current', 'draft', 'superseded'] as const

function typeBadgeVariant(t: string) {
  const m: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'default'> = {
    drawing: 'info',
    specification: 'success',
    report: 'default',
    contract: 'warning',
    other: 'default',
  }
  return m[t] ?? 'default'
}

function statusBadgeVariant(s: string) {
  const m: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'default'> = {
    current: 'success',
    draft: 'warning',
    superseded: 'danger',
  }
  return m[s] ?? 'default'
}

export function DocumentsClient({
  documents: initial,
  projectId,
}: {
  documents: ProjectDocument[]
  projectId: string
}) {
  const [documents, setDocuments] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const filtered = filterType === 'all' ? documents : documents.filter(d => d.document_type === filterType)

  async function handleAdd(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createDocument(projectId, formData)
      if ('error' in result) {
        setError(result.error ?? 'Unknown error')
      } else {
        setShowModal(false)
        // Optimistically reload by reusing current (server will revalidate)
        window.location.reload()
      }
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return
    startTransition(async () => {
      await deleteDocument(id, projectId)
      setDocuments(prev => prev.filter(d => d.id !== id))
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', ...DOC_TYPES] as string[]).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-all ${filterType === t ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'}`}
            >
              {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Document
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-200 rounded-xl">
          <FolderOpen size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">No documents yet</p>
          <p className="text-sm mt-1">Add engineering documents to track revisions and status.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase font-medium">Title</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase font-medium">Type</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase font-medium">Revision</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase font-medium">Status</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase font-medium">Notes</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => (
                <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {doc.file_url ? (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-amber-600 hover:underline">
                        {doc.title} <ExternalLink size={12} />
                      </a>
                    ) : (
                      doc.title
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={typeBadgeVariant(doc.document_type)}>
                      {doc.document_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{doc.revision ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusBadgeVariant(doc.status)}>
                      {doc.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{doc.notes ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Document">
        <form action={handleAdd} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
            <input name="title" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select name="document_type" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                {DOC_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select name="status" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                {DOC_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Revision</label>
            <input name="revision" placeholder="e.g. Rev A, v1.2" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">File URL (optional)</label>
            <input name="file_url" type="url" placeholder="https://..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea name="notes" rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
              {isPending ? 'Saving…' : 'Add Document'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
