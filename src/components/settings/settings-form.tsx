'use client'

import { useState } from 'react'
import { saveSettings } from '@/app/actions/profile'
import { Company, Profile } from '@/lib/types'

interface DangerZoneProps {
  companyName: string
}

function DangerZone({ companyName }: DangerZoneProps) {
  const [showExportModal, setShowExportModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  return (
    <div className="bg-white rounded-xl border border-red-200 p-6 space-y-4 col-span-full">
      <h2 className="font-semibold text-red-700 text-base">Danger Zone</h2>
      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => setShowExportModal(true)}
          className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
        >
          Export All Company Data
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
        >
          Delete Company Account
        </button>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-slate-800 mb-3">Data Export</h3>
            <p className="text-slate-600 text-sm mb-4">Data export will be emailed to you. This may take a few minutes to process.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
              <button onClick={() => setShowExportModal(false)} className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold rounded-lg">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-red-700 mb-3">Delete Company Account</h3>
            <p className="text-slate-600 text-sm mb-4">This action cannot be undone. Type <strong>{companyName}</strong> to confirm.</p>
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={companyName}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
              <button
                disabled={deleteConfirm !== companyName}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
    formData.set('full_name', profile?.full_name ?? '')
    formData.set('role', profile?.role ?? 'owner')
    // logo_url, registration_number, vat_number are already in the form
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

  const isAdmin = ['company_admin', 'super_admin'].includes(profile?.role ?? '')

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

        <div>
          <label className={labelClass}>Registration Number</label>
          <input
            name="registration_number"
            defaultValue={company?.registration_number ?? ''}
            placeholder="REG-123456"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>VAT Number</label>
          <input
            name="vat_number"
            defaultValue={company?.vat_number ?? ''}
            placeholder="VAT-12345678"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Company Logo URL</label>
          <input
            name="logo_url"
            defaultValue={company?.logo_url ?? ''}
            placeholder="https://example.com/logo.png"
            className={inputClass}
          />
          {company?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt="Company logo" className="mt-2 h-12 object-contain rounded border border-slate-200" />
          )}
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

      {/* Danger Zone (admin only) */}
      {isAdmin && <DangerZone companyName={company?.name ?? 'My Company'} />}
    </div>
  )
}
