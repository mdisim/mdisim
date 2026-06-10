import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/settings/settings-form'
import { LanguageSettings } from '@/components/settings/language-settings'
import type { UserRole } from '@/lib/types'

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  company_admin: 'Company Admin',
  project_manager: 'Project Manager',
  quantity_surveyor: 'Quantity Surveyor',
  site_engineer: 'Site Engineer',
  viewer: 'Viewer',
}

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
  company_admin: 'bg-blue-900/10 text-blue-900 border-blue-200',
  project_manager: 'bg-blue-100 text-blue-800 border-blue-200',
  quantity_surveyor: 'bg-teal-100 text-teal-800 border-teal-200',
  site_engineer: 'bg-amber-100 text-amber-800 border-amber-200',
  viewer: 'bg-slate-100 text-slate-700 border-slate-200',
}

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: 'Full access to all features across all companies.',
  company_admin: 'Manage all projects, team members, tenders, and company settings.',
  project_manager: 'Create and manage projects, BOQ, costs, and contractors.',
  quantity_surveyor: 'Manage BOQ items, costs, and view contractor information.',
  site_engineer: 'View projects and BOQ, record costs, and submit site reports.',
  viewer: 'Read-only access to projects, BOQ, costs, and contractors.',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let company = null

  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', user.id)
      .single()

    if (profileData) {
      profile = profileData
      company = profileData.companies
    }
  }

  const userRole = (profile?.role as UserRole | null) ?? 'viewer'

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your company profile and account details</p>
      </div>

      {/* Account Info bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-6">
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wide mb-0.5">Email</label>
          <p className="text-slate-800 text-sm font-medium">{user?.email}</p>
        </div>
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wide mb-0.5">Member Since</label>
          <p className="text-slate-800 text-sm font-medium">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
          </p>
        </div>
        {company?.id && (
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wide mb-0.5">Company ID</label>
            <p className="text-slate-500 text-xs font-mono">{company.id}</p>
          </div>
        )}
      </div>

      {/* Your Role Card */}
      <div className={`rounded-xl border p-5 flex flex-col gap-2 ${ROLE_COLORS[userRole]}`}>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${ROLE_COLORS[userRole]}`}>
            {ROLE_LABELS[userRole]}
          </span>
          <span className="text-sm font-medium">Your Role</span>
        </div>
        <p className="text-sm">{ROLE_DESCRIPTIONS[userRole]}</p>
        <p className="text-xs opacity-70 mt-1">Contact your administrator to request a role change.</p>
      </div>

      {/* Two-column settings form */}
      <SettingsForm profile={profile} company={company} />

      {/* Language & Region */}
      <LanguageSettings />
    </div>
  )
}
