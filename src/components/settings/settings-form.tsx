'use client'

import { useState } from 'react'
import { saveSettings } from '@/app/actions/profile'
import { Company, Profile } from '@/lib/types'

interface SettingsFormProps {
  profile: (Profile & { companies?: Company }) | null
  company: Company | null
}

function InlineMessage({ type, text }: { type: 'success' | 'error'; text: string }) {
  return (
    <p className={`text-sm px-3 py-2 rounded-lg ${type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
      {text}
    </p>
  )
}

const inputClass =
  'w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
const labelClass = 'block text-xs text-slate-500 uppercase tracking-wide mb-1.5'

export function SettingsForm({ profile, company }: SettingsFormProps) {
  const [companySaving, setCompanySaving] = useState(false)
  const [companyMessage, setCompanyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleCompanySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCompanySaving(true)
    setCompanyMessage(null)
    const formData = new FormData(e.currentTarget)
    // Add placeholder profile fields so saveSettings doesn't break
    formData.set('full_name', profile?.full_name ?? '')
    formData.set('role', profile?.role ?? 'owner')
    const result = await saveSettings(formData)
    setCompanyMessage(
      'error' in result
        ? { type: 'error', text: result.error ?? 'An error occurred' }
        : { type: 'success', text: 'Company profile saved ✓' }
    )
    setCompanySaving(false)
  }

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMessage(null)
    const formData = new FormData(e.currentTarget)
    // Add placeholder company fields
    formData.set('company_name', company?.name ?? 'My Company')
    formData.set('address', company?.address ?? '')
    formData.set('phone', company?.phone ?? '')
    formData.set('company_email', company?.email ?? '')
    formData.set('website', company?.website ?? '')
    const result = await saveSettings(formData)
    setProfileMessage(
      'error' in result
        ? { type: 'error', text: result.error ?? 'An error occurred' }
        : { type: 'success', text: 'Profile saved ✓' }
    )
    setProfileSaving(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Company Profile */}
      <form onSubmit={handleCompanySubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-base">Company Profile</h2>

        <div>
          <label className={labelClass}>Company Name</label>
          <input
            name="company_name"
            defaultValue={company?.name ?? ''}
            placeholder="My Company"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Address</label>
          <input
            name="address"
            defaultValue={company?.address ?? ''}
            placeholder="123 Main St, City, Country"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Phone</label>
          <input
            name="phone"
            defaultValue={company?.phone ?? ''}
            placeholder="+1 555 000 0000"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Company Email</label>
          <input
            name="company_email"
            type="email"
            defaultValue={company?.email ?? ''}
            placeholder="info@company.com"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Website</label>
          <input
            name="website"
            defaultValue={company?.website ?? ''}
            placeholder="https://www.company.com"
            className={inputClass}
          />
        </div>

        {companyMessage && <InlineMessage {...companyMessage} />}

        <button
          type="submit"
          disabled={companySaving}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {companySaving ? 'Saving...' : 'Save Company'}
        </button>
      </form>

      {/* Right: My Profile */}
      <form onSubmit={handleProfileSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-base">My Profile</h2>

        <div>
          <label className={labelClass}>Full Name</label>
          <input
            name="full_name"
            defaultValue={profile?.full_name ?? ''}
            placeholder="John Smith"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Role</label>
          <select
            name="role"
            defaultValue={profile?.role ?? 'owner'}
            className={inputClass}
          >
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="project_manager">Project Manager</option>
            <option value="engineer">Engineer</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        {profileMessage && <InlineMessage {...profileMessage} />}

        <button
          type="submit"
          disabled={profileSaving}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {profileSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
