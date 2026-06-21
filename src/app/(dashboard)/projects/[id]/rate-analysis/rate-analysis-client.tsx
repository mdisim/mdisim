'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Trash2, Calculator, Download, ChevronDown, ChevronRight, Wrench, Users, Truck, Building2, Percent, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getRateAnalysis,
  createRateComponent,
  updateRateComponent,
  deleteRateComponent,
  applyAllRatesToBoq,
} from '@/app/actions/rate-analysis'
import * as XLSX from 'xlsx'

interface BOQItem {
  id: string
  item_code: string | null
  description: string | null
  unit: string | null
  unit_rate: number | null
  quantity: number | null
}

interface RateComponent {
  id: string
  project_id: string
  boq_item_id: string
  component_type: string
  description: string
  unit: string
  quantity: number | null
  rate: number | null
  amount: number | null
  sort_order: number
  notes: string | null
  boq_items?: { item_code: string; description: string; unit: string; unit_rate: number } | null
}

const COMPONENT_TYPES = [
  { value: 'material', label: 'Material', icon: Wrench, color: 'text-blue-600 bg-blue-50' },
  { value: 'labor', label: 'Labor', icon: Users, color: 'text-amber-600 bg-amber-50' },
  { value: 'equipment', label: 'Equipment', icon: Truck, color: 'text-purple-600 bg-purple-50' },
  { value: 'subcontractor', label: 'Subcontractor', icon: Building2, color: 'text-emerald-600 bg-emerald-50' },
  { value: 'overhead', label: 'Overhead', icon: Percent, color: 'text-slate-600 bg-slate-100' },
  { value: 'profit', label: 'Profit', icon: DollarSign, color: 'text-green-600 bg-green-50' },
]

interface Props {
  projectId: string
  boqItems: BOQItem[]
}

export default function RateAnalysisClient({ projectId, boqItems }: Props) {
  const [components, setComponents] = useState<RateComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedBoqItem, setSelectedBoqItem] = useState('')
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)

  const loadData = useCallback(async () => {
    const result = await getRateAnalysis(projectId, selectedBoqItem || undefined)
    if (!result.error) setComponents(result.data as unknown as RateComponent[])
    setLoading(false)
  }, [projectId, selectedBoqItem])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const grouped = useMemo(() => {
    const groups = new Map<string, { boqItem: BOQItem | null; components: RateComponent[]; total: number }>()
    for (const comp of components) {
      const existing = groups.get(comp.boq_item_id)
      if (existing) {
        existing.components.push(comp)
        existing.total += comp.amount ?? 0
      } else {
        groups.set(comp.boq_item_id, {
          boqItem: boqItems.find((b) => b.id === comp.boq_item_id) ?? null,
          components: [comp],
          total: comp.amount ?? 0,
        })
      }
    }
    return groups
  }, [components, boqItems])

  async function handleAdd(boqItemId: string, componentType: string) {
    setSaving(true)
    const result = await createRateComponent(projectId, {
      boq_item_id: boqItemId,
      component_type: componentType as 'material',
      description: '',
      sort_order: components.length,
    })
    setSaving(false)
    if (result.data) {
      setComponents((prev) => [...prev, result.data as unknown as RateComponent])
    }
  }

  async function handleUpdate(id: string, field: string, value: string) {
    const numFields = ['quantity', 'rate']
    const parsed = numFields.includes(field) ? (value === '' ? null : parseFloat(value)) : value

    const comp = components.find((c) => c.id === id)
    if (!comp) return

    const updated = { ...comp, [field]: parsed }
    if (numFields.includes(field)) {
      updated.amount = (updated.quantity ?? 1) * (updated.rate ?? 0)
    }

    setComponents((prev) => prev.map((c) => (c.id === id ? updated : c)))
    setEditingCell(null)

    const updateData: Record<string, unknown> = { [field]: parsed }
    await updateRateComponent(id, updateData as Record<string, string | number | null>)
  }

  async function handleDelete(id: string) {
    setComponents((prev) => prev.filter((c) => c.id !== id))
    await deleteRateComponent(id)
  }

  async function handleApplyAll() {
    setSaving(true)
    await applyAllRatesToBoq(projectId)
    setSaving(false)
  }

  function toggleItem(boqId: string) {
    setCollapsedItems((prev) => {
      const next = new Set(prev)
      if (next.has(boqId)) next.delete(boqId)
      else next.add(boqId)
      return next
    })
  }

  function exportToExcel() {
    const rows = components.map((c) => ({
      'BOQ Item': c.boq_items?.item_code ?? '',
      Type: c.component_type,
      Description: c.description,
      Unit: c.unit,
      Quantity: c.quantity,
      Rate: c.rate,
      Amount: c.amount,
      Notes: c.notes ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rate Analysis')
    XLSX.writeFile(wb, `RateAnalysis_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  function renderComponentRow(comp: RateComponent) {
    const typeInfo = COMPONENT_TYPES.find((t) => t.value === comp.component_type) ?? COMPONENT_TYPES[0]
    const isEditing = (field: string) => editingCell?.id === comp.id && editingCell?.field === field

    function cellInput(field: string, value: string | number | null, type: 'text' | 'number' = 'text', className = '') {
      if (isEditing(field)) {
        return (
          <input
            autoFocus
            type={type}
            step={type === 'number' ? '0.01' : undefined}
            defaultValue={value ?? ''}
            onBlur={(e) => void handleUpdate(comp.id, field, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleUpdate(comp.id, field, (e.target as HTMLInputElement).value)
              if (e.key === 'Escape') setEditingCell(null)
            }}
            className={`w-full bg-blue-50 border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none ${className}`}
          />
        )
      }
      return (
        <div
          onClick={() => setEditingCell({ id: comp.id, field })}
          className={`cursor-text px-2 py-1 rounded hover:bg-slate-50 min-h-[28px] text-sm ${className}`}
        >
          {value != null && value !== '' ? value : <span className="text-slate-300">—</span>}
        </div>
      )
    }

    return (
      <tr key={comp.id} className="hover:bg-blue-50/30 border-b border-slate-100">
        <td className="px-2 py-1 w-28">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${typeInfo.color}`}>
            <typeInfo.icon size={11} />
            {typeInfo.label}
          </span>
        </td>
        <td className="px-2 py-1 w-56">{cellInput('description', comp.description)}</td>
        <td className="px-2 py-1 w-16">{cellInput('unit', comp.unit)}</td>
        <td className="px-2 py-1 w-20">{cellInput('quantity', comp.quantity, 'number', 'text-right tabular-nums')}</td>
        <td className="px-2 py-1 w-24">{cellInput('rate', comp.rate, 'number', 'text-right tabular-nums')}</td>
        <td className="px-2 py-1 w-24 text-right tabular-nums font-semibold text-slate-900 text-sm">
          {comp.amount != null ? `₪${comp.amount.toFixed(2)}` : '—'}
        </td>
        <td className="px-2 py-1 w-8">
          <button onClick={() => void handleDelete(comp.id)} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50">
            <Trash2 size={13} />
          </button>
        </td>
      </tr>
    )
  }

  if (loading) return <div className="text-center py-12 text-slate-400">Loading rate analysis...</div>

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 shadow-sm flex-wrap">
        <select
          value={selectedBoqItem}
          onChange={(e) => setSelectedBoqItem(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All BOQ Items</option>
          {boqItems.filter((b) => b.description && !b.description.includes('[SECTION]')).map((b) => (
            <option key={b.id} value={b.id}>{b.item_code} — {(b.description ?? '').substring(0, 40)}</option>
          ))}
        </select>
        <div className="w-px h-6 bg-slate-200" />
        <button onClick={() => void handleApplyAll()} disabled={saving} className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex items-center gap-1.5 disabled:opacity-50">
          <Calculator size={13} /> Apply All Rates to BOQ
        </button>
        <button onClick={exportToExcel} className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-100 flex items-center gap-1.5">
          <Download size={13} /> Export
        </button>
        <div className="ml-auto text-xs text-slate-400">
          {components.length} components · {grouped.size} items
        </div>
      </div>

      {/* Grouped Analysis */}
      <div className="space-y-4">
        {boqItems
          .filter((b) => b.description && !b.description.includes('[SECTION]'))
          .filter((b) => !selectedBoqItem || b.id === selectedBoqItem)
          .map((boq) => {
            const group = grouped.get(boq.id)
            const comps = group?.components ?? []
            const total = group?.total ?? 0
            const collapsed = collapsedItems.has(boq.id)

            return (
              <div key={boq.id} className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                {/* BOQ Item Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleItem(boq.id)}
                >
                  <div className="flex items-center gap-3">
                    {collapsed ? <ChevronRight size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    <span className="font-mono text-xs text-blue-600">{boq.item_code}</span>
                    <span className="text-sm font-medium text-slate-800">{boq.description}</span>
                    <span className="text-xs text-slate-400">per {boq.unit}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Current Rate</div>
                      <div className="text-sm font-semibold text-slate-600 tabular-nums">₪{(boq.unit_rate ?? 0).toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Analyzed Rate</div>
                      <div className={`text-sm font-bold tabular-nums ${total !== (boq.unit_rate ?? 0) ? 'text-amber-600' : 'text-emerald-600'}`}>
                        ₪{total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {!collapsed && (
                  <div>
                    {comps.length > 0 && (
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50/60">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                            <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
                            <th className="px-2 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                            <th className="px-2 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate ₪</th>
                            <th className="px-2 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount ₪</th>
                            <th className="px-2 py-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {comps.map((comp) => renderComponentRow(comp))}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-slate-200">
                          <tr>
                            <td colSpan={5} className="px-2 py-2 text-right text-xs font-bold text-slate-600 uppercase">Total Unit Rate</td>
                            <td className="px-2 py-2 text-right tabular-nums font-bold text-slate-900">₪{total.toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    )}

                    {/* Add component buttons */}
                    <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {COMPONENT_TYPES.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => void handleAdd(boq.id, type.value)}
                          disabled={saving}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-50 ${type.color}`}
                        >
                          <Plus size={11} />
                          <type.icon size={11} />
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {boqItems.filter((b) => b.description && !b.description.includes('[SECTION]')).length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-12 text-center">
          <Calculator size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">No BOQ items to analyze</p>
          <p className="text-slate-400 text-xs mt-1">Add items in the BOQ Builder first</p>
        </div>
      )}
    </div>
  )
}
