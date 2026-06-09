'use client'

import { BOQItem } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface BOQItemFormProps {
  projectId: string
  item?: BOQItem
  onSuccess?: () => void
  onCancel?: () => void
}

const CATEGORIES = [
  'Earthworks', 'Concrete', 'Masonry', 'Steel', 'Carpentry',
  'Roofing', 'Plumbing', 'Electrical', 'HVAC', 'Finishes',
  'Landscaping', 'Equipment', 'General',
]

export function BOQItemForm({ projectId, item, onSuccess, onCancel }: BOQItemFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    item_code: item?.item_code || '',
    description: item?.description || '',
    unit: item?.unit || '',
    quantity: item?.quantity?.toString() || '',
    unit_rate: item?.unit_rate?.toString() || '',
    category: item?.category || 'General',
    notes: item?.notes || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const total = (parseFloat(form.quantity) || 0) * (parseFloat(form.unit_rate) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const payload = {
        project_id: projectId,
        item_code: form.item_code,
        description: form.description,
        unit: form.unit,
        quantity: parseFloat(form.quantity) || 0,
        unit_rate: parseFloat(form.unit_rate) || 0,
        category: form.category || null,
        notes: form.notes || null,
      }

      if (item) {
        const { error: err } = await supabase
          .from('boq_items')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', item.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('boq_items').insert(payload)
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Item Code"
          name="item_code"
          value={form.item_code}
          onChange={handleChange}
          required
          placeholder="e.g. BOQ-001"
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Category</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          required
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Detailed description of the work item..."
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Unit"
          name="unit"
          value={form.unit}
          onChange={handleChange}
          required
          placeholder="m², m³, kg, ls"
        />
        <Input
          label="Quantity"
          name="quantity"
          type="number"
          min="0"
          step="0.001"
          value={form.quantity}
          onChange={handleChange}
          required
          placeholder="0"
        />
        <Input
          label="Unit Rate (USD)"
          name="unit_rate"
          type="number"
          min="0"
          step="0.01"
          value={form.unit_rate}
          onChange={handleChange}
          required
          placeholder="0.00"
        />
      </div>

      <div className="bg-amber-50 rounded-lg px-4 py-3 flex justify-between items-center">
        <span className="text-sm text-amber-700 font-medium">Calculated Total</span>
        <span className="text-lg font-bold text-amber-800">
          ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

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
          {item ? 'Update Item' : 'Add BOQ Item'}
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
