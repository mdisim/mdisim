'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, RefreshCw, X } from 'lucide-react'
import { PaymentCertificate } from '@/lib/types'
import {
  CertificateLineItem,
  getCertificateLineItems,
  createCertificateLineItem,
  deleteCertificateLineItem,
  generateLineItemsFromBOQ,
} from '@/app/actions/certificates'

interface Props {
  certificate: PaymentCertificate
  projectId: string
  onClose: () => void
}

const inputClass = 'w-full px-2 py-1.5 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500'

export function CertificateDetailModal({ certificate, projectId, onClose }: Props) {
  const router = useRouter()
  const [lineItems, setLineItems] = useState<CertificateLineItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Load on mount
  useEffect(() => {
    getCertificateLineItems(certificate.id).then(items => {
      setLineItems(items)
      setLoaded(true)
    })
  }, [certificate.id])

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateLineItemsFromBOQ(certificate.id, projectId)
      if ('error' in result && result.error) {
        alert(result.error)
        return
      }
      const items = await getCertificateLineItems(certificate.id)
      setLineItems(items)
      router.refresh()
    })
  }

  async function handleDelete(itemId: string) {
    await deleteCertificateLineItem(itemId, projectId)
    setLineItems(prev => prev.filter(i => i.id !== itemId))
    router.refresh()
  }

  async function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAddError(null)
    const fd = new FormData(e.currentTarget)
    const description = (fd.get('description') as string).trim()
    if (!description) { setAddError('Description is required'); return }
    const result = await createCertificateLineItem(certificate.id, projectId, {
      description,
      unit: (fd.get('unit') as string) || undefined,
      quantity: parseFloat(fd.get('quantity') as string) || undefined,
      unit_rate: parseFloat(fd.get('unit_rate') as string) || undefined,
      certified_pct: parseFloat(fd.get('certified_pct') as string) || 100,
      previous_certified: parseFloat(fd.get('previous_certified') as string) || 0,
    })
    if ('error' in result && result.error) { setAddError(result.error); return }
    const items = await getCertificateLineItems(certificate.id)
    setLineItems(items)
    setShowAddForm(false)
    router.refresh()
  }

  const gross = lineItems.reduce((s, i) => s + (i.certified_amount ?? 0), 0)
  const retentionAmount = (gross * (certificate.retention_percent ?? 0)) / 100
  const net = gross - retentionAmount

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Certificate {certificate.certificate_number}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {new Date(certificate.period_start).toLocaleDateString()} – {new Date(certificate.period_end).toLocaleDateString()}
              {' · '}
              <span className={`capitalize font-medium ${certificate.status === 'paid' ? 'text-green-600' : certificate.status === 'certified' ? 'text-amber-600' : 'text-slate-500'}`}>
                {certificate.status}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Actions bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 shrink-0">
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
          >
            <RefreshCw size={12} />
            {isPending ? 'Generating…' : 'Generate from BOQ'}
          </button>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-white rounded-lg font-semibold transition-colors"
          >
            <Plus size={12} />
            Add Line Item
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <form onSubmit={handleAddSubmit} className="px-6 py-3 bg-amber-50 border-b border-amber-100 shrink-0">
            <div className="grid grid-cols-6 gap-2 items-end">
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Description *</label>
                <input name="description" required className={inputClass} placeholder="Item description" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Unit</label>
                <input name="unit" className={inputClass} placeholder="m2" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Quantity</label>
                <input name="quantity" type="number" step="0.001" className={inputClass} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Unit Rate</label>
                <input name="unit_rate" type="number" step="0.01" className={inputClass} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Certified %</label>
                <input name="certified_pct" type="number" step="0.01" defaultValue="100" min="0" max="100" className={inputClass} />
              </div>
            </div>
            {addError && <p className="text-xs text-red-600 mt-2">{addError}</p>}
            <div className="flex gap-2 mt-3">
              <button type="submit" className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-semibold rounded-lg">Save</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {!loaded ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Loading…</div>
          ) : lineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
              <p>No line items yet.</p>
              <p className="mt-1 text-xs">Click "Generate from BOQ" or "Add Line Item" to start.</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-slate-500">Description</th>
                  <th className="text-center px-3 py-2 font-semibold text-slate-500">Unit</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500">Qty</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500">Rate</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500">Contract Value</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500">Prev Certified</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500">This Period</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500">% Complete</th>
                  <th className="text-right px-3 py-2 font-semibold text-slate-500">Certified Amt</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-800 max-w-xs truncate">{item.description}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{item.unit ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{item.quantity?.toLocaleString() ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{item.unit_rate != null ? `₪${item.unit_rate.toLocaleString()}` : '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{item.amount != null ? `₪${item.amount.toLocaleString()}` : '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{item.previous_certified > 0 ? `₪${item.previous_certified.toLocaleString()}` : '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{item.this_period != null ? `₪${item.this_period.toLocaleString()}` : '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-medium ${(item.certified_pct ?? 0) >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
                        {item.certified_pct ?? 0}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{item.certified_amount != null ? `₪${item.certified_amount.toLocaleString()}` : '—'}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Totals footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 shrink-0">
          <div className="flex items-center justify-end gap-8 text-sm">
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Gross Certified</p>
              <p className="font-bold text-slate-900">₪{gross.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Retention ({certificate.retention_percent}%)</p>
              <p className="font-semibold text-amber-600">- ₪{retentionAmount.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Net Payment</p>
              <p className="text-xl font-bold text-green-700">₪{net.toLocaleString()}</p>
            </div>
          </div>
          {certificate.notes && (
            <p className="text-xs text-slate-400 mt-2">Notes: {certificate.notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}
