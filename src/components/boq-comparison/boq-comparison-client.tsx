'use client'

import { BOQItem, CostEntry } from '@/lib/types'

interface BOQComparisonClientProps {
  boqItems: BOQItem[]
  costEntries: CostEntry[]
  projectName: string
}

interface ComparisonRow {
  id: string
  item_code: string
  description: string
  unit: string
  boq_qty: number
  boq_rate: number
  boq_amount: number
  actual_cost: number
  variance: number
  variance_pct: number
  status: 'under' | 'at' | 'over'
}

export function BOQComparisonClient({ boqItems, costEntries, projectName }: BOQComparisonClientProps) {
  // Group cost entries by boq_item_id
  const costByBOQ: Record<string, number> = {}
  const unallocatedCosts: CostEntry[] = []

  for (const ce of costEntries) {
    if (ce.boq_item_id) {
      costByBOQ[ce.boq_item_id] = (costByBOQ[ce.boq_item_id] ?? 0) + ce.amount
    } else {
      unallocatedCosts.push(ce)
    }
  }

  const rows: ComparisonRow[] = boqItems.map(item => {
    const actual = costByBOQ[item.id] ?? 0
    const variance = actual - item.total_amount
    const variance_pct = item.total_amount > 0 ? (variance / item.total_amount) * 100 : 0
    const status: 'under' | 'at' | 'over' =
      variance_pct < -5 ? 'under' : variance_pct <= 5 ? 'at' : 'over'
    return {
      id: item.id,
      item_code: item.item_code,
      description: item.description,
      unit: item.unit,
      boq_qty: item.quantity,
      boq_rate: item.unit_rate,
      boq_amount: item.total_amount,
      actual_cost: actual,
      variance,
      variance_pct,
      status,
    }
  })

  const boqTotal = rows.reduce((s, r) => s + r.boq_amount, 0)
  const actualTotal = rows.reduce((s, r) => s + r.actual_cost, 0)
  const varianceTotal = actualTotal - boqTotal
  const variancePctTotal = boqTotal > 0 ? (varianceTotal / boqTotal) * 100 : 0
  const unallocatedTotal = unallocatedCosts.reduce((s, c) => s + c.amount, 0)

  const underCount = rows.filter(r => r.status === 'under').length
  const atCount = rows.filter(r => r.status === 'at').length
  const overCount = rows.filter(r => r.status === 'over').length

  function handleExportCSV() {
    const headers = ['#', 'Item Code', 'Description', 'Unit', 'BOQ Qty', 'BOQ Rate', 'BOQ Amount', 'Actual Cost', 'Variance $', 'Variance %', 'Status']
    const csvRows = rows.map((r, i) => [
      i + 1, r.item_code, `"${r.description}"`, r.unit, r.boq_qty, r.boq_rate,
      r.boq_amount, r.actual_cost, r.variance, r.variance_pct.toFixed(1) + '%', r.status
    ])
    const csv = [headers, ...csvRows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName}-boq-comparison.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fmt = (n: number) => `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtSigned = (n: number) => `${n >= 0 ? '+' : '-'}${fmt(n)}`

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">BOQ Total</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(boqTotal)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Actual Cost</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(actualTotal)}</p>
        </div>
        <div className={`bg-white border rounded-xl p-4 ${varianceTotal > 0 ? 'border-red-200' : 'border-green-200'}`}>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Variance $</p>
          <p className={`text-2xl font-bold mt-1 ${varianceTotal > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {fmtSigned(varianceTotal)}
          </p>
        </div>
        <div className={`bg-white border rounded-xl p-4 ${varianceTotal > 0 ? 'border-red-200' : 'border-green-200'}`}>
          <p className="text-xs text-slate-400 uppercase tracking-wide">Variance %</p>
          <p className={`text-2xl font-bold mt-1 ${varianceTotal > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {variancePctTotal >= 0 ? '+' : ''}{variancePctTotal.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
          <span className="font-semibold">{underCount}</span> items under budget
        </div>
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
          <span className="font-semibold">{atCount}</span> items at budget (±5%)
        </div>
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
          <span className="font-semibold">{overCount}</span> items over budget
        </div>
        <button
          onClick={handleExportCSV}
          className="ml-auto px-4 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Main Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">BOQ Qty</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">BOQ Rate</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">BOQ Amount</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actual Cost</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Variance $</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Variance %</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400 text-sm">No BOQ items found</td>
                </tr>
              )}
              {rows.map((row, i) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.item_code}</td>
                  <td className="px-4 py-3 text-slate-800 max-w-xs">{row.description}</td>
                  <td className="px-4 py-3 text-slate-500">{row.unit}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{row.boq_qty.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(row.boq_rate)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{fmt(row.boq_amount)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{fmt(row.actual_cost)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${row.variance > 0 ? 'text-red-600' : row.variance < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                    {row.variance === 0 ? '—' : fmtSigned(row.variance)}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${row.variance > 0 ? 'text-red-600' : row.variance < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                    {row.variance === 0 ? '—' : `${row.variance_pct >= 0 ? '+' : ''}${row.variance_pct.toFixed(1)}%`}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === 'under' && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Under Budget</span>}
                    {row.status === 'at' && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">At Budget</span>}
                    {row.status === 'over' && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Over Budget</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold">
                  <td colSpan={6} className="px-4 py-3 text-slate-700">TOTALS</td>
                  <td className="px-4 py-3 text-right text-slate-900">{fmt(boqTotal)}</td>
                  <td className="px-4 py-3 text-right text-slate-900">{fmt(actualTotal)}</td>
                  <td className={`px-4 py-3 text-right ${varianceTotal > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtSigned(varianceTotal)}</td>
                  <td className={`px-4 py-3 text-right ${varianceTotal > 0 ? 'text-red-600' : 'text-green-600'}`}>{variancePctTotal >= 0 ? '+' : ''}{variancePctTotal.toFixed(1)}%</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Unallocated Costs */}
      {unallocatedCosts.length > 0 && (
        <div className="bg-white border border-orange-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-orange-100 bg-orange-50">
            <h2 className="font-semibold text-orange-800">Unallocated Costs ({unallocatedCosts.length})</h2>
            <p className="text-xs text-orange-600 mt-0.5">Cost entries not linked to any BOQ item — Total: {fmt(unallocatedTotal)}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-orange-50 border-b border-orange-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-orange-600 uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-orange-600 uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-orange-600 uppercase tracking-wide">Vendor</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-orange-600 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-orange-600 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-50">
                {unallocatedCosts.map(ce => (
                  <tr key={ce.id} className="hover:bg-orange-50">
                    <td className="px-4 py-3 text-slate-800">{ce.description}</td>
                    <td className="px-4 py-3 text-slate-500">{ce.category}</td>
                    <td className="px-4 py-3 text-slate-500">{ce.vendor ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-orange-700">{fmt(ce.amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(ce.cost_date).toLocaleDateString()}</td>
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
