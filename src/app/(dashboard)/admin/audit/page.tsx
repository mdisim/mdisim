import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { AuditLog } from '@/lib/types'

const ACTION_BADGE: Record<string, string> = {
  created: 'bg-green-100 text-green-800',
  updated: 'bg-blue-100 text-blue-800',
  deleted: 'bg-red-100 text-red-800',
  status_changed: 'bg-purple-100 text-purple-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-orange-100 text-orange-800',
  viewed: 'bg-slate-100 text-slate-700',
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; resource?: string; days?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'company_admin'].includes(profile.role ?? '')) {
    redirect('/dashboard?error=unauthorized')
  }

  const params = await searchParams
  const filterAction = params.action ?? ''
  const filterResource = params.resource ?? ''
  const days = parseInt(params.days ?? '30', 10)

  const since = new Date()
  since.setDate(since.getDate() - days)

  let query = supabase
    .from('audit_logs')
    .select('*')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  if (filterAction) query = query.eq('action', filterAction)
  if (filterResource) query = query.eq('resource_type', filterResource)

  const { data: logs } = await query

  const auditLogs = (logs ?? []) as AuditLog[]

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-slate-500 text-sm mt-1">Track all actions performed by team members</p>
      </div>

      {/* Filters */}
      <form className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wide">Action</label>
          <select
            name="action"
            defaultValue={filterAction}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white"
          >
            <option value="">All actions</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="deleted">Deleted</option>
            <option value="status_changed">Status Changed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wide">Resource</label>
          <select
            name="resource"
            defaultValue={filterResource}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white"
          >
            <option value="">All resources</option>
            <option value="project">Project</option>
            <option value="boq_item">BOQ Item</option>
            <option value="cost_entry">Cost Entry</option>
            <option value="variation">Variation</option>
            <option value="contractor">Contractor</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1 uppercase tracking-wide">Date Range</label>
          <select
            name="days"
            defaultValue={String(days)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          Filter
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {auditLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No audit logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-slate-500 font-medium">Timestamp</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-slate-500 font-medium">User</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-slate-500 font-medium">Action</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-slate-500 font-medium">Resource Type</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-slate-500 font-medium">Resource Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate">
                      {log.user_email ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_BADGE[log.action] ?? 'bg-slate-100 text-slate-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">
                      {log.resource_type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                      {log.resource_name ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">Showing last 100 entries within selected period.</p>
    </div>
  )
}
