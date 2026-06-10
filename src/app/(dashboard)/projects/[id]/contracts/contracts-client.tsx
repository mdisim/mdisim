'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectContract, Contractor } from '@/lib/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { createContract, updateContract, deleteContract } from '@/app/actions/contracts'

interface Props {
  contracts: ProjectContract[]
  projectId: string
  contractors: Contractor[]
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  terminated: 'bg-red-100 text-red-700',
  disputed: 'bg-orange-100 text-orange-700',
}

const TYPE_LABELS: Record<string, string> = {
  lump_sum: 'Lump Sum',
  remeasured: 'Remeasured',
  cost_plus: 'Cost Plus',
  target: 'Target',
}

export function ContractsClient({ contracts, projectId, contractors }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<ProjectContract | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const totalValue = contracts.reduce((s, c) => s + (c.value ?? 0), 0)
  const activeContracts = contracts.filter(c => c.status === 'active').length
  const retentionHeld = contracts.reduce((s, c) => s + ((c.value ?? 0) * (c.retention_percent ?? 0) / 100), 0)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createContract(projectId, fd)
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
      const result = await updateContract(editItem.id, projectId, fd)
      if (result.error) { setError(result.error); return }
      setEditItem(null)
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this contract?')) return
    await deleteContract(id, projectId)
    router.refresh()
  }

  const contractorOptions = contractors.map(c => ({ value: c.id, label: `${c.name}${c.company ? ` (${c.company})` : ''}` }))

  function ContractForm({ defaultValues }: { defaultValues?: ProjectContract }) {
    return (
      <>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input name="title" required defaultValue={defaultValues?.title ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract Number</label>
            <input name="contract_number" defaultValue={defaultValues?.contract_number ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contractor</label>
            <select name="contractor_id" defaultValue={defaultValues?.contractor_id ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">— None —</option>
              {contractorOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract Type</label>
            <select name="contract_type" defaultValue={defaultValues?.contract_type ?? 'lump_sum'} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="lump_sum">Lump Sum</option>
              <option value="remeasured">Remeasured</option>
              <option value="cost_plus">Cost Plus</option>
              <option value="target">Target</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select name="status" defaultValue={defaultValues?.status ?? 'draft'} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="terminated">Terminated</option>
              <option value="disputed">Disputed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract Value</label>
            <input name="value" type="number" step="0.01" min="0" defaultValue={defaultValues?.value ?? 0} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Retention %</label>
            <input name="retention_percent" type="number" step="0.01" min="0" max="100" defaultValue={defaultValues?.retention_percent ?? 0} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input name="start_date" type="date" defaultValue={defaultValues?.start_date ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input name="end_date" type="date" defaultValue={defaultValues?.end_date ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea name="notes" rows={2} defaultValue={defaultValues?.notes ?? ''} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
      </>
    )
  }

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Contract Value</p>
          <p className="text-xl font-bold text-slate-900 mt-1">${totalValue.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Active Contracts</p>
          <p className="text-xl font-bold text-green-600 mt-1">{activeContracts}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Retention Held</p>
          <p className="text-xl font-bold text-amber-600 mt-1">${retentionHeld.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => { setShowAdd(true); setError('') }}>
          <Plus size={16} />
          Add Contract
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Contractor</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Value</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Dates</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contracts.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No contracts yet.</td></tr>
            ) : (
              contracts.map(c => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.title}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.contractor?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      {TYPE_LABELS[c.contract_type] ?? c.contract_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">${(c.value ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'}
                    {c.end_date ? ` → ${new Date(c.end_date).toLocaleDateString()}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditItem(c); setError('') }} className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
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

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Contract" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <ContractForm />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Create Contract'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Contract" size="lg">
        {editItem && (
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <ContractForm defaultValues={editItem} />
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
