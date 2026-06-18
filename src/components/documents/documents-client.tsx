'use client'

import { useState, useTransition } from 'react'
import { FolderOpen, Plus, Trash2, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { createDocument, deleteDocument, addDocumentRevision, getDocumentRevisions } from '@/app/actions/documents'
import type { ProjectDocument, DocumentRevision } from '@/lib/types'

const DOC_TYPES = ['drawing', 'specification', 'report', 'contract', 'other'] as const
const DOC_STATUSES = ['current', 'draft', 'superseded'] as const
const REV_STATUSES = ['draft', 'under_review', 'approved', 'superseded'] as const

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
    approved: 'success',
    under_review: 'info',
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

  // Revision tracking state
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null)
  const [revisions, setRevisions] = useState<Record<string, DocumentRevision[]>>({})
  const [loadingRevId, setLoadingRevId] = useState<string | null>(null)
  const [showRevModal, setShowRevModal] = useState<string | null>(null)
  const [revSaving, setRevSaving] = useState(false)
  const [revError, setRevError] = useState<string | null>(null)

  const filtered = filterType === 'all' ? documents : documents.filter(d => d.document_type === filterType)

  async function handleAdd(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createDocument(projectId, formData)
      if ('error' in result) {
        setError(result.error ?? 'Unknown error')
      } else {
        setShowModal(false)
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

  async function toggleExpand(docId: string) {
    if (expandedDocId === docId) {
      setExpandedDocId(null)
      return
    }
    setExpandedDocId(docId)
    if (!revisions[docId]) {
      setLoadingRevId(docId)
      const result = await getDocumentRevisions(docId)
      setLoadingRevId(null)
      if ('revisions' in result) {
        setRevisions(prev => ({ ...prev, [docId]: result.revisions as DocumentRevision[] }))
      }
    }
  }

  async function handleAddRevision(e: React.FormEvent<HTMLFormElement>, docId: string) {
    e.preventDefault()
    setRevSaving(true)
    setRevError(null)
    const fd = new FormData(e.currentTarget)
    const result = await addDocumentRevision(docId, projectId, fd)
    setRevSaving(false)
    if ('error' in result) {
      setRevError(result.error ?? 'Error')
    } else {
      setShowRevModal(null)
      // Reload revisions for this doc
      const updated = await getDocumentRevisions(docId)
      if ('revisions' in updated) {
        setRevisions(prev => ({ ...prev, [docId]: updated.revisions as DocumentRevision[] }))
      }
    }
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
              className={`px-3 py-1.5 text-xs rounded-full border transition-all ${filterType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
            >
              {t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
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
                <th className="w-8 px-4 py-3" />
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
                <>
                  <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpand(doc.id)}
                        className="text-slate-400 hover:text-slate-600"
                        title="Show revisions"
                      >
                        {expandedDocId === doc.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {doc.file_url ? (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setShowRevModal(doc.id); setRevError(null) }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors text-xs"
                          title="Add revision"
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded revisions row */}
                  {expandedDocId === doc.id && (
                    <tr key={`${doc.id}-revisions`} className="bg-slate-50 border-b border-slate-100">
                      <td colSpan={8} className="px-8 py-4">
                        {loadingRevId === doc.id ? (
                          <p className="text-sm text-slate-400">Loading revisions...</p>
                        ) : (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Revision History</p>
                            {(revisions[doc.id] ?? []).length === 0 ? (
                              <p className="text-sm text-slate-400">No revisions recorded yet.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-slate-400">
                                    <th className="pb-2 pr-4">Revision</th>
                                    <th className="pb-2 pr-4">Status</th>
                                    <th className="pb-2 pr-4">Reviewed By</th>
                                    <th className="pb-2 pr-4">Approved By</th>
                                    <th className="pb-2 pr-4">Notes</th>
                                    <th className="pb-2">Date</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {(revisions[doc.id] ?? []).map(rev => (
                                    <tr key={rev.id}>
                                      <td className="py-1.5 pr-4 font-mono font-semibold text-slate-700">{rev.revision}</td>
                                      <td className="py-1.5 pr-4">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadgeVariant(rev.status) === 'success' ? 'bg-green-100 text-green-700' : statusBadgeVariant(rev.status) === 'info' ? 'bg-blue-100 text-blue-700' : statusBadgeVariant(rev.status) === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                          {rev.status}
                                        </span>
                                      </td>
                                      <td className="py-1.5 pr-4 text-slate-600">{rev.reviewed_by ?? '—'}</td>
                                      <td className="py-1.5 pr-4 text-slate-600">{rev.approved_by ?? '—'}</td>
                                      <td className="py-1.5 pr-4 text-slate-500 max-w-xs truncate">{rev.notes ?? '—'}</td>
                                      <td className="py-1.5 text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}

                  {/* Add Revision Modal */}
                  {showRevModal === doc.id && (
                    <tr key={`${doc.id}-revmodal`}>
                      <td colSpan={8} className="p-0">
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                              <h3 className="font-semibold text-slate-800">Add Revision — {doc.title}</h3>
                              <button onClick={() => setShowRevModal(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
                            </div>
                            <form onSubmit={e => handleAddRevision(e, doc.id)} className="p-6 space-y-4">
                              {revError && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{revError}</p>}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Revision *</label>
                                  <input name="revision" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Rev A" />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
                                  <select name="status" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {REV_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Reviewed By</label>
                                  <input name="reviewed_by" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Approved By</label>
                                  <input name="approved_by" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Approved Date</label>
                                <input name="approved_date" type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              </div>
                              <div>
                                <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
                                <textarea name="notes" rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                              </div>
                              <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowRevModal(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={revSaving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
                                  {revSaving ? 'Saving...' : 'Add Revision'}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
            <input name="title" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select name="document_type" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {DOC_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select name="status" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {DOC_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Revision</label>
            <input name="revision" placeholder="e.g. Rev A, v1.2" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">File URL (optional)</label>
            <input name="file_url" type="url" placeholder="https://..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea name="notes" rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
              {isPending ? 'Saving…' : 'Add Document'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
