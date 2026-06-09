'use client'

import { useState } from 'react'
import { saveSettings } from '@/app/actions/profile'
import { Company, Profile } from '@/lib/types'

interface SettingsFormProps {
  profile: (Profile & { companies?: Company }) | null
  company: Company | null
}

export function SettingsForm({ profile, company }: SettingsFormProps) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const formData = new FormData(e.currentTarget)
    const result = await saveSettings(formData)
    if ('error' in result) {
      setMessage({ type: 'error', text: result.error ?? 'An error occurred' })
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully.' })
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Profile */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-base">Company Profile</h2>

        <div>
          <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Company Name</label>
          <input
            name="company_name"
            defaultValue={company?.name ?? ''}
            placeholder="My Company"
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Address</label>
          <input
            name="address"
            defaultValue={company?.address ?? ''}
            placeholder="123 Main St, City, Country"
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
            <input
              name="phone"
              defaultValue={company?.phone ?? ''}
              placeholder="+1 555 000 0000"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Company Email</label>
            <input
              name="company_email"
              type="email"
              defaultValue={company?.email ?? ''}
              placeholder="info@company.com"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Website</label>
          <input
            name="website"
            defaultValue={company?.website ?? ''}
            placeholder="https://www.company.com"
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Personal Profile */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-base">Your Profile</h2>

        <div>
          <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
          <input
            name="full_name"
            defaultValue={profile?.full_name ?? ''}
            placeholder="John Smith"
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
          <select
            name="role"
            defaultValue={profile?.role ?? 'owner'}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="project_manager">Project Manager</option>
            <option value="engineer">Engineer</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}
