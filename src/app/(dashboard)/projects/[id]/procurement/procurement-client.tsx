'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PurchaseOrder } from '@/lib/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { createPurchaseOrder, updatePurchaseOrderStatus, deletePurchaseOrder } from '@/app/actions/procurement'

interface Props {
  purchaseOrders: PurchaseOrder[]
  projectId: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  ordered: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const NEXT_STATUS: Record<string, string | null> = {
  draft: 'ordered',
  ordered: 'delivered',
  delivered: null,
  cancelled: null,
}

export function ProcurementClient({ purchaseOrders, projectId }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const totalOrdered = purchaseOrders.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (p.total_amount ?? 0), 0)
  const delivered = purchaseOrders.filter(p => p.status === 'delivered').reduce((s, p) => s + (p.total_amount ?? 0), 0)
  const pending = purchaseOrders.filter(p => p.status === 'ordered').reduce((s, p) => s + (p.total_amount ?? 0), 0)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createPurchaseOrder(projectId, fd)
      if (result.error) { setError(result.error); return }
      setShowAdd(false)
      router.refresh()
    })
  }

  async function handleAdvance(id: string, status: string) {
    await updatePurchaseOrderStatus(id, projectId, status)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this purchase order?')) return
    await deletePurchaseOrder(id, projectId)
    router.refresh()
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Ordered</p>
          <p className="text-xl font-bold text-slate-900 mt-1">${totalOrdered.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Delivered</p>
          <p className="text-xl font-bold text-green-600 mt-1">${delivered.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Pending Delivery</p>
          <p className="text-xl font-bold text-amber-600 mt-1">${pending.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => { setShowAdd(true); setError('') }}>
          <Plus size={16} />
          Add Purchase Order
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">PO Number</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Supplier</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Total</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Delivery</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchaseOrders.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No purchase orders yet.</td></tr>
            ) : (
              purchaseOrders.map(po => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900">{po.po_number}</td>
                  <td className="px-4 py-3 text-slate-700">{po.supplier}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{po.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[po.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">${(po.total_amount ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {NEXT_STATUS[po.status] && (
                        <button
                          onClick={() => handleAdvance(po.id, NEXT_STATUS[po.status]!)}
                          className="px-2 py-0.5 text-xs border border-slate-300 rounded hover:bg-slate-100 transition-colors"
                        >
                          → {(NEXT_STATUS[po.status] ?? '').charAt(0).toUpperCase() + (NEXT_STATUS[po.status] ?? '').slice(1)}
                        </button>
                      )}
                      <button onClick={() => handleDelete(po.id)} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
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

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Purchase Order" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PO Number *</label>
              <input name="po_number" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier *</label>
              <input name="supplier" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input name="description" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input name="category" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <input name="unit" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
              <input name="quantity" type="number" step="0.01" min="0" defaultValue="1" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit Price</label>
              <input name="unit_price" type="number" step="0.01" min="0" defaultValue="0" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Order Date</label>
              <input name="order_date" type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
              <input name="expected_delivery" type="date" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select name="status" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="draft">Draft</option>
                <option value="ordered">Ordered</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea name="notes" rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Create PO'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
