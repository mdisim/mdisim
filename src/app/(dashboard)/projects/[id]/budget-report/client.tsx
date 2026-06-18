'use client'

import { BOQItem, CostEntry, ContractorPayment, ProjectPhase, Project } from '@/lib/types'

interface Props {
  project: Project
  boqItems: BOQItem[]
  costEntries: CostEntry[]
  payments: ContractorPayment[]
  phases: ProjectPhase[]
}

function varianceColor(pct: number) {
  if (pct <= 80) return 'bg-green-50 text-green-700'
  if (pct <= 100) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function BudgetReportClient({ project, boqItems, costEntries, payments, phases }: Props) {
  const boqTotal = boqItems.reduce((s, i) => s + i.total_amount, 0)
  const costTotal = costEntries.reduce((s, c) => s + c.amount, 0)
  const paymentsTotal = payments.reduce((s, p) => s + p.amount, 0)
  const totalSpent = costTotal + paymentsTotal
  const variance = project.budget - totalSpent
  const variancePct = project.budget > 0 ? (totalSpent / project.budget) * 100 : 0

  // Per-category breakdown from BOQ
  const categories = Array.from(new Set(boqItems.map(i => i.category ?? 'Uncategorised')))

  const boqByCategory: Record<string, number> = {}
  for (const item of boqItems) {
    const cat = item.category ?? 'Uncategorised'
    boqByCategory[cat] = (boqByCategory[cat] ?? 0) + item.total_amount
  }

  // Match cost entries to categories via boq_item_id
  const boqItemMap: Record<string, BOQItem> = {}
  for (const b of boqItems) boqItemMap[b.id] = b

  const costByCategory: Record<string, number> = {}
  const uncategorizedCosts: CostEntry[] = []
  for (const c of costEntries) {
    if (c.boq_item_id && boqItemMap[c.boq_item_id]) {
      const cat = boqItemMap[c.boq_item_id].category ?? 'Uncategorised'
      costByCategory[cat] = (costByCategory[cat] ?? 0) + c.amount
    } else {
      uncategorizedCosts.push(c)
    }
  }

  const exportCSV = () => {
    const rows = [
      ['Category', 'BOQ Amount', 'Actual Spent', 'Variance $', 'Variance %'],
      ...categories.map(cat => {
        const boqAmt = boqByCategory[cat] ?? 0
        const actual = costByCategory[cat] ?? 0
        const v = boqAmt - actual
        const vp = boqAmt > 0 ? (actual / boqAmt * 100).toFixed(1) : '0'
        return [cat, boqAmt.toString(), actual.toString(), v.toString(), vp]
      }),
      [],
      ['Summary'],
      ['Original Budget', project.budget.toString()],
      ['BOQ Total', boqTotal.toString()],
      ['Total Spent', totalSpent.toString()],
      ['Variance', variance.toString()],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `budget-report-${project.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Original Budget</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{fmt(project.budget)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">BOQ Total</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{fmt(boqTotal)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Spent</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{fmt(totalSpent)}</p>
        </div>
        <div className={`border rounded-xl p-4 ${variance < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Variance $</p>
          <p className={`text-xl font-bold mt-1 ${variance < 0 ? 'text-red-700' : 'text-green-700'}`}>{fmt(variance)}</p>
        </div>
        <div className={`border rounded-xl p-4 ${variancePct > 100 ? 'bg-red-50 border-red-200' : variancePct > 80 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Variance %</p>
          <p className={`text-xl font-bold mt-1 ${variancePct > 100 ? 'text-red-700' : variancePct > 80 ? 'text-amber-700' : 'text-green-700'}`}>{variancePct.toFixed(1)}%</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">BOQ Category Breakdown</h2>
          <button
            onClick={exportCSV}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">BOQ Amount</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actual Spent</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Variance $</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Variance %</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[120px]">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map(cat => {
                const boqAmt = boqByCategory[cat] ?? 0
                const actual = costByCategory[cat] ?? 0
                const v = boqAmt - actual
                const vPct = boqAmt > 0 ? (actual / boqAmt) * 100 : 0
                const rowClass = varianceColor(vPct)
                return (
                  <tr key={cat} className={`${rowClass} hover:brightness-95 transition-all`}>
                    <td className="px-5 py-3 font-medium">{cat}</td>
                    <td className="text-right px-4 py-3">{fmt(boqAmt)}</td>
                    <td className="text-right px-4 py-3">{fmt(actual)}</td>
                    <td className={`text-right px-4 py-3 font-medium ${v < 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(v)}</td>
                    <td className="text-right px-4 py-3">{vPct.toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <div className="h-2 bg-white/60 rounded-full">
                        <div
                          className={`h-full rounded-full ${vPct > 100 ? 'bg-red-500' : vPct > 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(vPct, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Uncategorized costs */}
      {uncategorizedCosts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Uncategorized Cost Entries</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {uncategorizedCosts.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">{c.description}</td>
                    <td className="px-4 py-3 text-slate-500">{c.cost_date}</td>
                    <td className="px-4 py-3 text-slate-500">{c.category}</td>
                    <td className="text-right px-5 py-3 font-medium">{fmt(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phase summary */}
      {phases.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Phase-Level Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Phase</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Progress</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[120px]">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {phases.map(ph => (
                  <tr key={ph.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium">{ph.name}</td>
                    <td className="px-4 py-3 text-slate-500 capitalize">{ph.status.replace(/_/g, ' ')}</td>
                    <td className="text-right px-4 py-3">{ph.progress_percent}%</td>
                    <td className="px-4 py-3">
                      <div className="h-2 bg-slate-100 rounded-full">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${ph.progress_percent}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
