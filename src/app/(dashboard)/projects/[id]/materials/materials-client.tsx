'use client'

import { useState, useMemo, useTransition } from 'react'
import { MaterialDelivery } from '@/lib/types'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { createMaterialDelivery, deleteMaterialDelivery } from '@/app/actions/materials'
import { useRouter } from 'next/navigation'

interface Props {
  deliveries: MaterialDelivery[]
  projectId: string
}

interface MaterialSummary {
  material_name: string
  unit: string
  total: number
}

export function MaterialsClient({ deliveries, projectId }: Props) {
  const router = useRouter()
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const grouped = useMemo<MaterialSummary[]>(() => {
    const map = new Map<string, MaterialSummary>()
    deliveries.forEach((d) => {
      const key = `${d.material_name}|${d.unit}`
      const existing = map.get(key)
      if (existing) {
        existing.total += d.quantity
      } else {
        map.set(key, { material_name: d.material_name, unit: d.unit, total: d.quantity })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.material_name.localeCompare(b.material_name))
  }, [deliveries])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createMaterialDelivery(projectId, fd)
      if (result.error) { setError(result.error); return }
      setShowAdd(false)
      router.refresh()
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this delivery record?')) return
    await deleteMaterialDelivery(id, projectId)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      {grouped.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">Material Totals</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Material</th>
                <th className="px-4 py-2 text-right font-medium text-slate-600">Total Received</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grouped.map((g) => (
                <tr key={`${g.material_name}|${g.unit}`} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">{g.material_name}</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-900">{g.total.toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-500">{g.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delivery log */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-slate-800">Delivery Log</h2>
          <Button onClick={() => { setShowAdd(true); setError('') }}>
            <Plus size={16} />
            Log Delivery
          </Button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Material</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Qty</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Unit</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Supplier</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">DN #</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Location</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveries.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No deliveries logged yet.</td></tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{d.delivery_date}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{d.material_name}</td>
                    <td className="px-4 py-3 text-right">{d.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500">{d.unit}</td>
                    <td className="px-4 py-3 text-slate-500">{d.supplier ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{d.delivery_note_number ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{d.location_on_site ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(d.id)} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Log Material Delivery" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Material Name *</label>
              <input name="material_name" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input name="category" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
              <input name="quantity" type="number" step="0.001" min="0" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit *</label>
              <input name="unit" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Date *</label>
              <input name="delivery_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <input name="supplier" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Note #</label>
              <input name="delivery_note_number" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Received By</label>
              <input name="received_by" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location on Site</label>
              <input name="location_on_site" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea name="notes" rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Log Delivery'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
