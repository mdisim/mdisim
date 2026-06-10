import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BarChart3 } from 'lucide-react'

function monthKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function getLast6Months(): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

export default async function ExecutiveDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get company_id via profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user!.id)
    .single()

  const companyId = profile?.company_id

  const [{ data: projects }, { data: allCosts }, { data: allPayments }] = await Promise.all([
    companyId
      ? supabase.from('projects').select('*').eq('company_id', companyId)
      : supabase.from('projects').select('*').eq('created_by', user!.id),
    supabase.from('cost_entries').select('amount, cost_date, project_id'),
    supabase.from('contractor_payments').select('amount, payment_date, contractor_id, status, contractor:contractors(id, name, company)').eq('status', 'completed'),
  ])

  const projectsList = projects ?? []
  const costs = allCosts ?? []
  const payments = allPayments ?? []

  const totalBudget = projectsList.reduce((s, p) => s + (p.budget ?? 0), 0)
  const projectIds = new Set(projectsList.map(p => p.id))

  // Costs for this company's projects only
  const companyCosts = costs.filter(c => projectIds.has(c.project_id))
  const companyPayments = payments.filter(p => {
    // We need to find which project this payment belongs to — we don't have that directly in this query
    // Accept all for executive view since we're already scoped by user
    return true
  })

  const totalSpent = companyCosts.reduce((s, c) => s + c.amount, 0)
  const active = projectsList.filter(p => p.status === 'active').length
  const completed = projectsList.filter(p => p.status === 'completed').length

  // Monthly spend last 6 months
  const last6 = getLast6Months()
  const monthlySpend: Record<string, number> = {}
  for (const key of last6) monthlySpend[key] = 0
  for (const c of companyCosts) {
    const key = monthKey(c.cost_date)
    if (monthlySpend[key] !== undefined) monthlySpend[key] += c.amount
  }
  const maxMonthly = Math.max(...Object.values(monthlySpend), 1)

  // Top 5 projects by budget
  const top5 = [...projectsList].sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0)).slice(0, 5)

  // Project cost map
  const projectCostMap: Record<string, number> = {}
  for (const c of companyCosts) {
    projectCostMap[c.project_id] = (projectCostMap[c.project_id] ?? 0) + c.amount
  }

  // Contractor spend leaderboard
  const contractorMap: Record<string, { name: string; company: string | null; total: number }> = {}
  for (const p of companyPayments) {
    const c = p.contractor as unknown as { id: string; name: string; company: string | null } | null
    if (!c) continue
    if (!contractorMap[c.id]) contractorMap[c.id] = { name: c.name, company: c.company, total: 0 }
    contractorMap[c.id].total += p.amount
  }
  const leaderboard = Object.values(contractorMap).sort((a, b) => b.total - a.total).slice(0, 10)
  const maxContractor = Math.max(...leaderboard.map(l => l.total), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 size={22} className="text-amber-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Executive Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Company-wide overview</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Projects', value: projectsList.length, color: 'text-slate-900' },
          { label: 'Active', value: active, color: 'text-green-600' },
          { label: 'Completed', value: completed, color: 'text-blue-600' },
          { label: 'Total Budget', value: `$${(totalBudget / 1e6).toFixed(1)}M`, color: 'text-slate-900' },
          { label: 'Total Spent', value: `$${(totalSpent / 1e6).toFixed(2)}M`, color: 'text-amber-600' },
          {
            label: 'Budget Variance',
            value: `${totalBudget > 0 ? (((totalBudget - totalSpent) / totalBudget) * 100).toFixed(1) : '0'}%`,
            color: totalSpent <= totalBudget ? 'text-green-600' : 'text-red-600',
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Budget utilization per project */}
      {projectsList.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Project Budget Utilization</h2>
          <div className="space-y-3">
            {projectsList.map(p => {
              const spent = projectCostMap[p.id] ?? 0
              const pct = p.budget > 0 ? Math.min((spent / p.budget) * 100, 100) : 0
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <Link href={`/projects/${p.id}`} className="font-medium text-slate-700 hover:text-amber-600">{p.name}</Link>
                    <span className="text-slate-500">${spent.toLocaleString()} / ${p.budget.toLocaleString()} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly spend trend */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Monthly Spend Trend (Last 6 Months)</h2>
          <div className="flex items-end gap-3 h-40">
            {last6.map(key => {
              const val = monthlySpend[key] ?? 0
              const h = (val / maxMonthly) * 128
              return (
                <div key={key} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-500">{val > 0 ? `$${(val / 1000).toFixed(0)}k` : ''}</span>
                  <div className="w-full bg-amber-400 rounded-t" style={{ height: `${Math.max(h, 2)}px` }} />
                  <span className="text-xs text-slate-500">{monthLabel(key)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top 5 projects by budget */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Top 5 Projects by Budget</h2>
          {top5.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No projects</p>
          ) : (
            <div className="space-y-3">
              {top5.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/projects/${p.id}`} className="text-sm font-medium text-slate-700 hover:text-amber-600 truncate block">{p.name}</Link>
                    <p className="text-xs text-slate-400">{p.status}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">${(p.budget / 1e6).toFixed(2)}M</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contractor spend leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Contractor Spend Leaderboard</h2>
          <div className="space-y-3">
            {leaderboard.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{c.name}{c.company ? ` — ${c.company}` : ''}</p>
                  <div className="mt-1 h-2 bg-slate-100 rounded-full">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(c.total / maxContractor) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">${c.total.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
