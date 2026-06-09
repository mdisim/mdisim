'use client'

import { CostEntry, BOQItem } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CostFormProps {
  projectId: string
  cost?: CostEntry
  boqItems?: BOQItem[]
  onSuccess?: () => void
  onCancel?: () => void
}

const COST_CATEGORIES = [
  'Materials', 'Labor', 'Equipment', 'Subcontractor',
  'Professional Fees', 'Permits & Licenses', 'Transportation',
  'Utilities', 'Overhead', 'Other',
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
]

export function CostForm({ projectId, cost, boqItems = [], onSuccess, onCancel }: CostFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    description: cost?.description || '',
    amount: cost?.amount?.toString() || '',
    cost_date: cost?.cost_date || new Date().toISOString().split('T')[0],
    category: cost?.category || 'Materials',
    invoice_number: cost?.invoice_number || '',
    vendor: cost?.vendor || '',
    status: cost?.status || 'pending',
    boq_item_id: cost?.boq_item_id || '',
    notes: cost?.notes || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const payload = {
        project_id: projectId,
        description: form.description,
        amount: parseFloat(form.amount) || 0,
        cost_date: form.cost_date,
        category: form.category,
        invoice_number: form.invoice_number || null,
        vendor: form.vendor || null,
        status: form.status as CostEntry['status'],
        boq_item_id: form.boq_item_id || null,
        notes: form.notes || null,
      }

      if (cost) {
        const { error: err } = await supabase
          .from('cost_entries')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', cost.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('cost_entries').insert(payload)
        if (err) throw err
      }

      router.refresh()
      onSuccess?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const categoryOptions = COST_CATEGORIES.map((c) => ({ value: c, label: c }))
  const boqOptions = boqItems.map((b) => ({ value: b.id, label: `${b.item_code} - ${b.description.slice(0, 40)}` }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          required
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Cost description..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Amount (USD)"
          name="amount"
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={handleChange}
          required
          placeholder="0.00"
        />
        <Input
          label="Date"
          name="cost_date"
          type="date"
          value={form.cost_date}
          onChange={handleChange}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Category"
          name="category"
          value={form.category}
          onChange={handleChange}
          options={categoryOptions}
        />
        <Select
          label="Status"
          name="status"
          value={form.status}
          onChange={handleChange}
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Vendor"
          name="vendor"
          value={form.vendor}
          onChange={handleChange}
          placeholder="Supplier/vendor name"
        />
        <Input
          label="Invoice Number"
          name="invoice_number"
          value={form.invoice_number}
          onChange={handleChange}
          placeholder="INV-001"
        />
      </div>

      {boqItems.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Link to BOQ Item (optional)</label>
          <select
            name="boq_item_id"
            value={form.boq_item_id}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">None</option>
            {boqOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Notes (optional)</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Additional notes..."
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          {cost ? 'Update Cost' : 'Record Cost'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
