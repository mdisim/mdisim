'use client'

import { ContractorPayment, Contractor } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface PaymentFormProps {
  projectId: string
  payment?: ContractorPayment
  contractors: Contractor[]
  onSuccess?: () => void
  onCancel?: () => void
}

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'wire', label: 'Wire Transfer' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function PaymentForm({ projectId, payment, contractors, onSuccess, onCancel }: PaymentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    contractor_id: payment?.contractor_id || '',
    amount: payment?.amount?.toString() || '',
    payment_date: payment?.payment_date || new Date().toISOString().split('T')[0],
    payment_method: payment?.payment_method || 'bank_transfer',
    reference_number: payment?.reference_number || '',
    description: payment?.description || '',
    status: payment?.status || 'pending',
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
        contractor_id: form.contractor_id,
        amount: parseFloat(form.amount) || 0,
        payment_date: form.payment_date,
        payment_method: form.payment_method || null,
        reference_number: form.reference_number || null,
        description: form.description || null,
        status: form.status as ContractorPayment['status'],
      }

      if (payment) {
        const { error: err } = await supabase
          .from('contractor_payments')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', payment.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('contractor_payments').insert(payload)
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

  const contractorOptions = contractors.map((c) => ({
    value: c.id,
    label: c.company ? `${c.name} (${c.company})` : c.name,
  }))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Contractor *</label>
        <select
          name="contractor_id"
          value={form.contractor_id}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a contractor...</option>
          {contractorOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
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
          label="Payment Date"
          name="payment_date"
          type="date"
          value={form.payment_date}
          onChange={handleChange}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Payment Method"
          name="payment_method"
          value={form.payment_method}
          onChange={handleChange}
          options={PAYMENT_METHODS}
        />
        <Select
          label="Status"
          name="status"
          value={form.status}
          onChange={handleChange}
          options={STATUS_OPTIONS}
        />
      </div>

      <Input
        label="Reference Number"
        name="reference_number"
        value={form.reference_number}
        onChange={handleChange}
        placeholder="Check #, transaction ID, etc."
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Description (optional)</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Payment description or notes..."
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          {payment ? 'Update Payment' : 'Record Payment'}
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
