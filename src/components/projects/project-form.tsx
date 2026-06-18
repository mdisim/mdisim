'use client'

import { Project } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ensureUserProfile } from '@/app/actions/profile'

interface ProjectFormProps {
  project?: Project
  onSuccess?: () => void
  onCancel?: () => void
}

const statusOptions = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
]

export function ProjectForm({ project, onSuccess, onCancel }: ProjectFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'planning',
    start_date: project?.start_date || '',
    end_date: project?.end_date || '',
    budget: project?.budget?.toString() || '',
    location: project?.location || '',
    client_name: project?.client_name || '',
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get or create company profile to retrieve company_id
      const profileResult = await ensureUserProfile()
      if ('error' in profileResult) throw new Error(profileResult.error)

      const payload = {
        name: form.name,
        description: form.description || null,
        status: form.status as Project['status'],
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        budget: parseFloat(form.budget) || 0,
        location: form.location || null,
        client_name: form.client_name || null,
        created_by: user.id,
        company_id: profileResult.company_id,
      }

      if (project) {
        const { error: err } = await supabase
          .from('projects')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', project.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('projects').insert(payload)
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
      <Input
        label="Project Name"
        name="name"
        value={form.name}
        onChange={handleChange}
        required
        placeholder="e.g. Office Building Renovation"
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Project description..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Status"
          name="status"
          value={form.status}
          onChange={handleChange}
          options={statusOptions}
        />
        <Input
          label="Budget (USD)"
          name="budget"
          type="number"
          min="0"
          step="0.01"
          value={form.budget}
          onChange={handleChange}
          placeholder="0.00"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Date"
          name="start_date"
          type="date"
          value={form.start_date}
          onChange={handleChange}
        />
        <Input
          label="End Date"
          name="end_date"
          type="date"
          value={form.end_date}
          onChange={handleChange}
        />
      </div>

      <Input
        label="Client Name"
        name="client_name"
        value={form.client_name}
        onChange={handleChange}
        placeholder="Client or company name"
      />

      <Input
        label="Location"
        name="location"
        value={form.location}
        onChange={handleChange}
        placeholder="Project site location"
      />

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading} className="flex-1">
          {project ? 'Update Project' : 'Create Project'}
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
