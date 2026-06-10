'use client'

import { useState, useTransition } from 'react'
import { Variation } from '@/lib/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { createVariation, updateVariation, deleteVariation, advanceVariationStatus } from '@/app/actions/variations'
import { useRouter } from 'next/navigation'

interface Props {
  variations: Variation[]
  projectId: string
}

const TYPE_COLORS: Record<string, string> = {
  addition: 'bg-green-100 text-green-700',
  omission: 'bg-red-100 text-red-700',
  substitution: 'bg-blue-100 text-blue-700',
  provisional: 'bg-yellow-100 text-yellow-700',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-600',
}

const NEXT_STATUS: Record<string, string[]> = {
  pending: ['submitted', 'withdrawn'],
  submitted: ['approved', 'rejected'],
  approved: [],
  rejected: [],
  withdrawn: [],
}

export function VariationsClient({ variations, projectId }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<Variation | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const totalAdditions = variations.filter(v => v.type === 'addition' && v.status === 'approved').reduce((s, v) => s + (v.approved_amount ?? v.amount), 0)
  const totalOmissions = variations.filter(v => v.type === 'omission' && v.status === 'approved').reduce((s, v) => s + (v.approved_amount ?? v.amount), 0)
  const netVariation = totalAdditions - totalOmissions

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createVariation(projectId, fd)
      if (result.error) { setError(result.error); return }
      setShowAdd(false)
      router.refresh()
    })
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editItem) return
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateVariation(editItem.id, projectId, fd)
      if (result.error) { setError(result.error); return }
      setEditItem(null)
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this variation?')) return
    await deleteVariation(id, projectId)
    router.refresh()
  }

  async function handleAdvance(id: string, status: string) {
    await advanceVariationStatus(id, projectId, status)
    router.refresh()
  }

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Additions (Approved)</p>
          <p className="text-xl font-bold text-green-600 mt-1">+${totalAdditions.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Omissions (Approved)</p>
          <p className="text-xl font-bold text-red-600 mt-1">-${totalOmissions.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Net Variation</p>
          <p className={`text-xl font-bold mt-1 ${netVariation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netVariation >= 0 ? '+' : ''}${netVariation.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => { setShowAdd(true); setError('') }}>
          <Plus size={16} />
          New Variation
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Number</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Approved Amt</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Raised By</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {variations.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No variations yet. Click &quot;New Variation&quot; to add one.</td></tr>
            ) : (
              variations.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{v.variation_number}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{v.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[v.type]}`}>
                      {v.type.charAt(0).toUpperCase() + v.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[v.status]}`}>
                      {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">${v.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{v.approved_amount != null ? `$${v.approved_amount.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{v.raised_by ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {NEXT_STATUS[v.status]?.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleAdvance(v.id, s)}
                          className="px-2 py-0.5 text-xs border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                        >
                          → {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                      <button onClick={() => { setEditItem(v); setError('') }} className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(v.id)} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="New Variation" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Variation Number *</label>
              <input name="variation_number" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select name="type" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="addition">Addition</option>
                <option value="omission">Omission</option>
                <option value="substitution">Substitution</option>
                <option value="provisional">Provisional</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input name="title" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
              <input name="amount" type="number" step="0.01" min="0" defaultValue="0" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Raised By</label>
              <input name="raised_by" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea name="notes" rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Create Variation'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Variation" size="lg">
        {editItem && (
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Variation Number *</label>
                <input name="variation_number" required defaultValue={editItem.variation_number} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select name="type" defaultValue={editItem.type} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="addition">Addition</option>
                  <option value="omission">Omission</option>
                  <option value="substitution">Substitution</option>
                  <option value="provisional">Provisional</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input name="title" required defaultValue={editItem.title} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea name="description" rows={3} defaultValue={editItem.description ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select name="status" defaultValue={editItem.status} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                <input name="amount" type="number" step="0.01" min="0" defaultValue={editItem.amount} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Approved Amount</label>
                <input name="approved_amount" type="number" step="0.01" min="0" defaultValue={editItem.approved_amount ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Raised By</label>
                <input name="raised_by" defaultValue={editItem.raised_by ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Submitted Date</label>
                <input name="submitted_date" type="date" defaultValue={editItem.submitted_date ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Approved By</label>
                <input name="approved_by" defaultValue={editItem.approved_by ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea name="notes" rows={2} defaultValue={editItem.notes ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditItem(null)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
