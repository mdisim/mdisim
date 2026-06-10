import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/settings/settings-form'

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

      {/* Two-column settings form */}
      <SettingsForm profile={profile} company={company} />
    </div>
  )
}
