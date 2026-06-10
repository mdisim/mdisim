import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, Phone, Mail, MapPin, Briefcase, Hash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

function statusVariant(s: string) {
  const m: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    completed: 'success',
    pending: 'warning',
    cancelled: 'danger',
  }
  return m[s] ?? 'default'
}

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: contractor } = await supabase
    .from('contractors')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!contractor) notFound()

  const [{ data: payments }, { data: workforce }] = await Promise.all([
    supabase
      .from('contractor_payments')
      .select('*, project:projects(id, name)')
      .eq('contractor_id', id)
      .order('payment_date', { ascending: false }),
    supabase
      .from('sdr_workforce')
      .select('*, report:site_daily_reports(project_id)')
      .eq('contractor_id', id),
  ])

  const totalPaid = (payments ?? []).filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0)
  const totalPending = (payments ?? []).filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)

  // Distinct projects
  const projectMap = new Map<string, { id: string; name: string }>()
  for (const p of payments ?? []) {
    if (p.project && !projectMap.has(p.project.id)) {
      projectMap.set(p.project.id, p.project)
    }
  }
  const projects = Array.from(projectMap.values())

  const totalWorkforceDays = (workforce ?? []).reduce((s, w) => s + w.actual_count, 0)
  const totalOvertimeHours = (workforce ?? []).reduce((s, w) => s + w.overtime_hours, 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/contractors" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to Contractors
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{contractor.name}</h1>
            {contractor.company && <p className="text-slate-500 text-sm mt-1">{contractor.company}</p>}
          </div>
          {contractor.specialty && (
            <Badge variant="info">{contractor.specialty}</Badge>
          )}
        </div>
      </div>

      {/* Contact info */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {contractor.email && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail size={15} className="text-slate-400" />{contractor.email}
          </div>
        )}
        {contractor.phone && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone size={15} className="text-slate-400" />{contractor.phone}
          </div>
        )}
        {contractor.address && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={15} className="text-slate-400" />{contractor.address}
          </div>
        )}
        {contractor.specialty && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Briefcase size={15} className="text-slate-400" />{contractor.specialty}
          </div>
        )}
        {contractor.license_number && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Hash size={15} className="text-slate-400" />License: {contractor.license_number}
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Paid</p>
          <p className="text-xl font-bold text-green-600 mt-1">${totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Pending</p>
          <p className="text-xl font-bold text-amber-600 mt-1">${totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Workforce Days</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalWorkforceDays.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Overtime Hours</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalOvertimeHours.toLocaleString()}</p>
        </div>
      </div>

      {/* Rating (static UI) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Performance Rating</h2>
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map(i => (
            <Star key={i} size={20} className={i <= 4 ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
          ))}
          <span className="ml-2 text-sm text-slate-500">4.0 / 5.0 (based on project performance)</span>
        </div>
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Projects Worked On ({projects.length})</h2>
          <div className="flex flex-wrap gap-2">
            {projects.map(p => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg text-sm text-slate-700 transition-colors"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Payment history */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Payment History ({payments?.length ?? 0})</h2>
        </div>
        {(!payments || payments.length === 0) ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">No payments recorded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase font-medium">Date</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase font-medium">Project</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase font-medium">Description</th>
                <th className="text-right px-4 py-3 text-xs text-slate-500 uppercase font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-xs text-slate-500 uppercase font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {new Date(p.payment_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {p.project ? (
                      <Link href={`/projects/${p.project.id}`} className="text-amber-600 hover:underline">
                        {p.project.name}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.description ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">${p.amount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
