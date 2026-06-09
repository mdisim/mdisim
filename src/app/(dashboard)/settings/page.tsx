import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Account Information</h2>
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wide mb-1">Email</label>
          <p className="text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm">
            {user?.email}
          </p>
        </div>
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wide mb-1">User ID</label>
          <p className="text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-mono">
            {user?.id}
          </p>
        </div>
        <div>
          <label className="block text-xs text-slate-400 uppercase tracking-wide mb-1">Member Since</label>
          <p className="text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
          </p>
        </div>
      </div>

      {/* Supabase Setup Guide */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
        <h2 className="font-semibold text-amber-900 mb-3">Supabase Setup Required</h2>
        <p className="text-sm text-amber-800 mb-3">
          To use ANGEL D.C. with a real database, configure your Supabase project:
        </p>
        <ol className="text-sm text-amber-800 space-y-2 list-decimal list-inside">
          <li>Create a project at <strong>supabase.com</strong></li>
          <li>Run the SQL in <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">supabase/schema.sql</code></li>
          <li>Add your keys to <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">.env.local</code></li>
        </ol>
        <div className="mt-4 bg-amber-100 rounded-lg p-3 font-mono text-xs text-amber-900">
          <p>NEXT_PUBLIC_SUPABASE_URL=your_project_url</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key</p>
        </div>
      </div>
    </div>
  )
}
