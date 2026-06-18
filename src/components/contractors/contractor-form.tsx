'use client'

import { Contractor } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ContractorFormProps {
  contractor?: Contractor
  onSuccess?: () => void
  onCancel?: () => void
}

export function ContractorForm({ contractor, onSuccess, onCancel }: ContractorFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: contractor?.name || '',
    company: contractor?.company || '',
    email: contractor?.email || '',
    phone: contractor?.phone || '',
    address: contractor?.address || '',
    specialty: contractor?.specialty || '',
    license_number: contractor?.license_number || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload = {
        name: form.name,
        company: form.company || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        specialty: form.specialty || null,
        license_number: form.license_number || null,
        user_id: user.id,
      }

      if (contractor) {
        const { error: err } = await supabase
          .from('contractors')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', contractor.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('contractors').insert(payload)
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
          label="Full Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          placeholder="John Smith"
        />
        <Input
          label="Company"
          name="company"
          value={form.company}
          onChange={handleChange}
          placeholder="Smith Construction Co."
        />
      </div>

      <Input
        label="Specialty"
        name="specialty"
        value={form.specialty}
        onChange={handleChange}
        placeholder="e.g. Electrical, Plumbing, Civil Works"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="john@example.com"
        />
        <Input
          label="Phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="+1 (555) 000-0000"
        />
      </div>

      <Input
        label="License Number"
        name="license_number"
        value={form.license_number}
        onChange={handleChange}
        placeholder="License/registration number"
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Address</label>
        <textarea
          name="address"
          value={form.address}
          onChange={handleChange}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Street address, city, state"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          {contractor ? 'Update Contractor' : 'Add Contractor'}
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
