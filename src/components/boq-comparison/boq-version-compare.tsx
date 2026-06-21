'use client'

import React, { useState, useEffect } from 'react'
import { ArrowUpDown, Plus, Minus, Equal, Download, ChevronDown } from 'lucide-react'
import { getTemplates, getTemplateWithItems } from '@/app/actions/boq-templates'
import * as XLSX from 'xlsx'

interface BOQItem {
  id: string
  item_code: string | null
  description: string | null
  unit: string | null
  quantity: number | null
  unit_rate: number | null
  total_amount: number | null
  category: string | null
}

interface TemplateItem {
  item_code: string
  description: string
  unit: string
  unit_rate: number
  category: string | null
}

interface Template {
  id: string
  name: string
  description: string | null
  category: string | null
  created_at: string
}

interface DiffRow {
  item_code: string
  description: string
  unit: string
  status: 'added' | 'removed' | 'changed' | 'unchanged'
  current_qty: number | null
  current_rate: number | null
  current_total: number | null
  baseline_qty: number | null
  baseline_rate: number | null
  baseline_total: number | null
  qty_diff: number | null
  rate_diff: number | null
  total_diff: number | null
}

interface Props {
  boqItems: BOQItem[]
  projectName: string
}

export default function BOQVersionCompare({ boqItems, projectName }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [baselineItems, setBaselineItems] = useState<TemplateItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilter, setShowFilter] = useState<'all' | 'added' | 'removed' | 'changed'>('all')

  useEffect(() => {
    getTemplates().then((result) => {
      if (!result.error) setTemplates(result.data as unknown as Template[])
    })
  }, [])

  useEffect(() => {
    if (!selectedTemplate) {
      setBaselineItems([])
      return
    }
    setLoading(true)
    getTemplateWithItems(selectedTemplate).then((result) => {
      if (!result.error && result.items) {
        setBaselineItems(result.items as unknown as TemplateItem[])
      }
      setLoading(false)
    })
  }, [selectedTemplate])

  const diffRows: DiffRow[] = React.useMemo(() => {
    if (baselineItems.length === 0) return []

    const baselineMap = new Map(baselineItems.map((i) => [i.item_code, i]))
    const currentMap = new Map(boqItems.map((i) => [i.item_code ?? '', i]))
    const rows: DiffRow[] = []
    const seen = new Set<string>()

    for (const item of boqItems) {
      const code = item.item_code ?? ''
      seen.add(code)
      const baseline = baselineMap.get(code)

      if (!baseline) {
        rows.push({
          item_code: code,
          description: item.description ?? '',
          unit: item.unit ?? '',
          status: 'added',
          current_qty: item.quantity,
          current_rate: item.unit_rate,
          current_total: item.total_amount,
          baseline_qty: null,
          baseline_rate: null,
          baseline_total: null,
          qty_diff: item.quantity,
          rate_diff: item.unit_rate,
          total_diff: item.total_amount,
        })
      } else {
        const bTotal = (baseline.unit_rate ?? 0) * 0
        const qtyDiff = (item.quantity ?? 0) - 0
        const rateDiff = (item.unit_rate ?? 0) - (baseline.unit_rate ?? 0)
        const totalDiff = (item.total_amount ?? 0) - bTotal
        const changed = rateDiff !== 0 || (item.description ?? '') !== baseline.description

        rows.push({
          item_code: code,
          description: item.description ?? '',
          unit: item.unit ?? '',
          status: changed ? 'changed' : 'unchanged',
          current_qty: item.quantity,
          current_rate: item.unit_rate,
          current_total: item.total_amount,
          baseline_qty: 0,
          baseline_rate: baseline.unit_rate,
          baseline_total: bTotal,
          qty_diff: qtyDiff,
          rate_diff: rateDiff,
          total_diff: totalDiff,
        })
      }
    }

    for (const baseline of baselineItems) {
      if (!seen.has(baseline.item_code)) {
        rows.push({
          item_code: baseline.item_code,
          description: baseline.description,
          unit: baseline.unit,
          status: 'removed',
          current_qty: null,
          current_rate: null,
          current_total: null,
          baseline_qty: 0,
          baseline_rate: baseline.unit_rate,
          baseline_total: 0,
          qty_diff: null,
          rate_diff: null,
          total_diff: null,
        })
      }
    }

    return rows
  }, [boqItems, baselineItems])

  const filtered = showFilter === 'all' ? diffRows : diffRows.filter((r) => r.status === showFilter)

  const counts = {
    added: diffRows.filter((r) => r.status === 'added').length,
    removed: diffRows.filter((r) => r.status === 'removed').length,
    changed: diffRows.filter((r) => r.status === 'changed').length,
    unchanged: diffRows.filter((r) => r.status === 'unchanged').length,
  }

  function exportDiff() {
    const rows = filtered.map((r) => ({
      Status: r.status.toUpperCase(),
      'Item Code': r.item_code,
      Description: r.description,
      Unit: r.unit,
      'Current Qty': r.current_qty,
      'Current Rate': r.current_rate,
      'Current Total': r.current_total,
      'Baseline Rate': r.baseline_rate,
      'Rate Diff': r.rate_diff,
      'Total Diff': r.total_diff,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'BOQ Comparison')
    XLSX.writeFile(wb, `BOQ_Compare_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const statusColors: Record<string, string> = {
    added: 'bg-green-50 text-green-700 border-green-200',
    removed: 'bg-red-50 text-red-700 border-red-200',
    changed: 'bg-amber-50 text-amber-700 border-amber-200',
    unchanged: 'bg-slate-50 text-slate-500',
  }

  const statusIcons: Record<string, React.ReactNode> = {
    added: <Plus size={12} />,
    removed: <Minus size={12} />,
    changed: <ArrowUpDown size={12} />,
    unchanged: <Equal size={12} />,
  }

  return (
    <div className="space-y-4">
      {/* Select baseline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Compare against</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a saved template (baseline)...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.category ? ` — ${t.category}` : ''}</option>
              ))}
            </select>
          </div>

          {diffRows.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                {(['all', 'added', 'removed', 'changed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setShowFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      showFilter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {f === 'all' ? `All (${diffRows.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f]})`}
                  </button>
                ))}
              </div>
              <button onClick={exportDiff} className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-100 flex items-center gap-1.5 border border-slate-200">
                <Download size={13} /> Export
              </button>
            </>
          )}
        </div>
      </div>

      {loading && <div className="text-center py-12 text-slate-400 text-sm">Loading baseline...</div>}

      {!selectedTemplate && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-12 text-center">
          <ArrowUpDown size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">Select a saved template to compare against</p>
          <p className="text-slate-400 text-xs mt-1">Save your current BOQ as a template first, then make changes and compare</p>
        </div>
      )}

      {/* Comparison Table */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">Status</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Cur. Rate ₪</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Rate ₪</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate Diff ₪</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Cur. Total ₪</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row, i) => (
                <tr key={i} className={`hover:bg-blue-50/30 ${row.status === 'removed' ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[row.status]}`}>
                      {statusIcons[row.status]} {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-blue-600">{row.item_code}</td>
                  <td className="px-3 py-2 text-slate-800">{row.description}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.current_rate != null ? `₪${row.current_rate.toFixed(2)}` : '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{row.baseline_rate != null ? `₪${row.baseline_rate.toFixed(2)}` : '—'}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${(row.rate_diff ?? 0) > 0 ? 'text-red-600' : (row.rate_diff ?? 0) < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                    {row.rate_diff != null ? `${row.rate_diff > 0 ? '+' : ''}₪${row.rate_diff.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">{row.current_total != null ? `₪${row.current_total.toFixed(2)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-slate-200 bg-slate-50/80 text-xs text-slate-500">
            {filtered.length} items · {counts.added} added · {counts.removed} removed · {counts.changed} changed
          </div>
        </div>
      )}
    </div>
  )
}
