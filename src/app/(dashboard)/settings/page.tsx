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
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your company profile and account details</p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-base">Account Information</h2>
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wide mb-1">Email</label>
          <p className="text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm">
            {user?.email}
          </p>
        </div>
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wide mb-1">Member Since</label>
          <p className="text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
          </p>
        </div>
      </div>

      {/* Editable form */}
      <SettingsForm profile={profile} company={company} />
    </div>
  )
}
