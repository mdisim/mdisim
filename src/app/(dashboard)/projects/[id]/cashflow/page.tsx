import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingDown } from 'lucide-react'

function monthKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default async function CashFlowPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: costEntries }, { data: payments }] = await Promise.all([
    supabase.from('projects').select('id, name, budget').eq('id', id).single(),
    supabase.from('cost_entries').select('amount, cost_date').eq('project_id', id),
    supabase.from('contractor_payments').select('amount, payment_date, status').eq('project_id', id),
  ])

  if (!project) notFound()

  // Group by month
  const monthlyMap: Record<string, { costs: number; payments: number }> = {}

  for (const c of costEntries ?? []) {
    const key = monthKey(c.cost_date)
    if (!monthlyMap[key]) monthlyMap[key] = { costs: 0, payments: 0 }
    monthlyMap[key].costs += c.amount
  }

  for (const p of payments ?? []) {
    if (p.status === 'completed') {
      const key = monthKey(p.payment_date)
      if (!monthlyMap[key]) monthlyMap[key] = { costs: 0, payments: 0 }
      monthlyMap[key].payments += p.amount
    }
  }

  const months = Object.keys(monthlyMap).sort()
  const monthData = months.map(key => ({
    key,
    label: monthLabel(key),
    costs: monthlyMap[key].costs,
    payments: monthlyMap[key].payments,
    total: monthlyMap[key].costs + monthlyMap[key].payments,
  }))

  // Cumulative
  let cumulative = 0
  const cumulativeData = monthData.map(m => {
    cumulative += m.total
    return { ...m, cumulative }
  })

  const maxMonthly = Math.max(...monthData.map(m => m.total), 1)
  const totalSpent = cumulativeData.length > 0 ? cumulativeData[cumulativeData.length - 1].cumulative : 0
  const totalCosts = (costEntries ?? []).reduce((s, c) => s + c.amount, 0)
  const totalPayments = (payments ?? []).filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0)
  const budgetVariance = project.budget > 0 ? project.budget - totalSpent : null

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to {project.name}
        </Link>
        <div className="flex items-center gap-3">
          <TrendingDown size={22} className="text-amber-600" />
          <h1 className="text-2xl font-bold text-slate-900">Cash Flow</h1>
        </div>
        <p className="text-slate-500 text-sm mt-1">{project.name}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Outflow</p>
          <p className="text-xl font-bold text-slate-900 mt-1">${totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Cost Entries</p>
          <p className="text-xl font-bold text-slate-900 mt-1">${totalCosts.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Contractor Payments</p>
          <p className="text-xl font-bold text-slate-900 mt-1">${totalPayments.toLocaleString()}</p>
        </div>
        {project.budget > 0 && budgetVariance !== null && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Budget Remaining</p>
            <p className={`text-xl font-bold mt-1 ${budgetVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${Math.abs(budgetVariance).toLocaleString()}
              <span className="text-xs ml-1 font-normal">{budgetVariance >= 0 ? 'under' : 'over'}</span>
            </p>
          </div>
        )}
      </div>

      {monthData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white border border-slate-200 rounded-xl">
          <TrendingDown size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">No cash flow data yet</p>
          <p className="text-sm mt-1">Add cost entries or contractor payments to see the chart.</p>
        </div>
      ) : (
        <>
          {/* Monthly bar chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Monthly Outflow</h2>
            <div className="flex items-end gap-3 h-48 overflow-x-auto">
              {monthData.map(m => (
                <div key={m.key} className="flex flex-col items-center gap-1 min-w-[60px]">
                  <span className="text-xs text-slate-500">${(m.total / 1000).toFixed(0)}k</span>
                  <div className="w-full flex flex-col gap-0.5" style={{ height: `${(m.total / maxMonthly) * 160}px` }}>
                    <div
                      className="w-full bg-blue-400 rounded-t"
                      style={{ height: `${(m.payments / m.total) * 100}%` }}
                      title={`Payments: $${m.payments.toLocaleString()}`}
                    />
                    <div
                      className="w-full bg-amber-400 rounded-b"
                      style={{ height: `${(m.costs / m.total) * 100}%` }}
                      title={`Costs: $${m.costs.toLocaleString()}`}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{m.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Cost Entries</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> Contractor Payments</div>
            </div>
          </div>

          {/* Cumulative spend table */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Cumulative Spend</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 text-xs text-slate-400 uppercase font-medium">Month</th>
                    <th className="text-right py-2 text-xs text-slate-400 uppercase font-medium">Cost Entries</th>
                    <th className="text-right py-2 text-xs text-slate-400 uppercase font-medium">Payments</th>
                    <th className="text-right py-2 text-xs text-slate-400 uppercase font-medium">Monthly Total</th>
                    <th className="text-right py-2 text-xs text-slate-400 uppercase font-medium">Cumulative</th>
                    {project.budget > 0 && (
                      <th className="text-right py-2 text-xs text-slate-400 uppercase font-medium">% of Budget</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {cumulativeData.map(m => (
                    <tr key={m.key} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-700">{m.label}</td>
                      <td className="py-2 text-right text-slate-600">${m.costs.toLocaleString()}</td>
                      <td className="py-2 text-right text-slate-600">${m.payments.toLocaleString()}</td>
                      <td className="py-2 text-right font-medium text-slate-700">${m.total.toLocaleString()}</td>
                      <td className="py-2 text-right font-semibold text-slate-900">${m.cumulative.toLocaleString()}</td>
                      {project.budget > 0 && (
                        <td className="py-2 text-right">
                          <span className={`text-xs font-medium ${m.cumulative / project.budget > 0.9 ? 'text-red-600' : m.cumulative / project.budget > 0.7 ? 'text-amber-600' : 'text-green-600'}`}>
                            {((m.cumulative / project.budget) * 100).toFixed(1)}%
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
