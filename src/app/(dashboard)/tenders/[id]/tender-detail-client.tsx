'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Tender } from '@/lib/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { updateTender, advanceTenderStatus } from '@/app/actions/tenders'

interface Props {
  tender: Tender
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  awarded: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-500',
}

const NEXT_STATUS: Record<string, string[]> = {
  draft: ['submitted'],
  submitted: ['awarded', 'lost'],
  awarded: [],
  lost: [],
  withdrawn: [],
}

export function TenderDetailClient({ tender }: Props) {
  const router = useRouter()
  const [showEdit, setShowEdit] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateTender(tender.id, fd)
      if (result.error) { setError(result.error); return }
      setShowEdit(false)
      router.refresh()
    })
  }

  async function handleAdvance(status: string) {
    await advanceTenderStatus(tender.id, status)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Info Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Tender Details</h2>
          <div className="flex items-center gap-2">
            {(NEXT_STATUS[tender.status] ?? []).map(s => (
              <button
                key={s}
                onClick={() => handleAdvance(s)}
                className="px-3 py-1.5 text-xs border border-blue-400 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
              >
                → {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            <Button variant="secondary" onClick={() => { setShowEdit(true); setError('') }}>
              <Pencil size={14} />
              Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Status</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[tender.status]}`}>
              {tender.status.charAt(0).toUpperCase() + tender.status.slice(1)}
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Client</p>
            <p className="text-sm text-slate-700 mt-1">{tender.client_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Tender Number</p>
            <p className="text-sm font-mono text-slate-700 mt-1">{tender.tender_number ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Issue Date</p>
            <p className="text-sm text-slate-700 mt-1">{tender.issue_date ? new Date(tender.issue_date).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Submission Deadline</p>
            <p className="text-sm text-slate-700 mt-1">{tender.submission_deadline ? new Date(tender.submission_deadline).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Estimated Value</p>
            <p className="text-sm font-semibold text-slate-700 mt-1">${(tender.estimated_value ?? 0).toLocaleString()}</p>
          </div>
          {tender.submitted_value != null && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Submitted Value</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">${tender.submitted_value.toLocaleString()}</p>
            </div>
          )}
        </div>

        {tender.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{tender.description}</p>
          </div>
        )}

        {tender.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{tender.notes}</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Tender" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input name="title" required defaultValue={tender.title} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
              <input name="client_name" defaultValue={tender.client_name ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tender Number</label>
              <input name="tender_number" defaultValue={tender.tender_number ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
              <input name="issue_date" type="date" defaultValue={tender.issue_date ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Submission Deadline</label>
              <input name="submission_deadline" type="date" defaultValue={tender.submission_deadline ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Value</label>
              <input name="estimated_value" type="number" step="0.01" min="0" defaultValue={tender.estimated_value ?? 0} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Submitted Value</label>
              <input name="submitted_value" type="number" step="0.01" min="0" defaultValue={tender.submitted_value ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select name="status" defaultValue={tender.status} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="awarded">Awarded</option>
                <option value="lost">Lost</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" rows={3} defaultValue={tender.description ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea name="notes" rows={2} defaultValue={tender.notes ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
