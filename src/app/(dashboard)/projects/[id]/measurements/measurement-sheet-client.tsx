'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Trash2, Link2, Calculator, Download, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getMeasurementSheetEntries,
  createMeasurementEntry,
  updateMeasurementEntry,
  deleteMeasurementEntry,
  applyAllMeasurementsToBoq,
} from '@/app/actions/measurement-sheet'
import * as XLSX from 'xlsx'

interface BOQItem {
  id: string
  item_code: string | null
  description: string | null
  unit: string | null
  quantity: number | null
}

interface MeasurementEntry {
  id: string
  project_id: string
  boq_item_id: string | null
  description: string | null
  reference: string | null
  nr: number | null
  length: number | null
  width: number | null
  height: number | null
  quantity: number | null
  unit: string | null
  notes: string | null
  sort_order: number
  boq_item?: { item_code: string; description: string } | null
}

interface Props {
  projectId: string
  boqItems: BOQItem[]
}

function calcQuantity(nr: number | null, l: number | null, w: number | null, h: number | null): number {
  const dims = [l, w, h].filter((d): d is number => d != null && d !== 0)
  if (dims.length === 0) return nr ?? 1
  return (nr ?? 1) * dims.reduce((a, b) => a * b, 1)
}

export default function MeasurementSheetClient({ projectId, boqItems }: Props) {
  const [entries, setEntries] = useState<MeasurementEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterBoqId, setFilterBoqId] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)

  const loadEntries = useCallback(async () => {
    const result = await getMeasurementSheetEntries(projectId, filterBoqId || undefined)
    if (!result.error) setEntries(result.data as unknown as MeasurementEntry[])
    setLoading(false)
  }, [projectId, filterBoqId])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  const grouped = useMemo(() => {
    const groups = new Map<string, { boqItem: BOQItem | null; entries: MeasurementEntry[]; subtotal: number }>()
    const unlinked: MeasurementEntry[] = []

    for (const entry of entries) {
      if (entry.boq_item_id) {
        const existing = groups.get(entry.boq_item_id)
        if (existing) {
          existing.entries.push(entry)
          existing.subtotal += entry.quantity ?? 0
        } else {
          const boq = boqItems.find((b) => b.id === entry.boq_item_id) ?? null
          groups.set(entry.boq_item_id, {
            boqItem: boq,
            entries: [entry],
            subtotal: entry.quantity ?? 0,
          })
        }
      } else {
        unlinked.push(entry)
      }
    }

    return { groups, unlinked }
  }, [entries, boqItems])

  async function handleAddRow(boqItemId?: string) {
    setSaving(true)
    const result = await createMeasurementEntry(projectId, {
      boq_item_id: boqItemId ?? null,
      description: '',
      nr: 1,
      unit: boqItemId ? (boqItems.find((b) => b.id === boqItemId)?.unit ?? 'm') : 'm',
      sort_order: entries.length,
    })
    setSaving(false)
    if (!result.error && result.data) {
      setEntries((prev) => [...prev, result.data as unknown as MeasurementEntry])
    }
  }

  async function handleUpdate(id: string, field: string, value: string) {
    const numFields = ['nr', 'length', 'width', 'height']
    const parsed = numFields.includes(field) ? (value === '' ? null : parseFloat(value)) : value

    const entry = entries.find((e) => e.id === id)
    if (!entry) return

    const updated = { ...entry, [field]: parsed }
    if (numFields.includes(field)) {
      updated.quantity = calcQuantity(updated.nr, updated.length, updated.width, updated.height)
    }

    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)))
    setEditingCell(null)

    const updateData: Record<string, unknown> = { [field]: parsed }
    if (numFields.includes(field)) {
      updateData.quantity = updated.quantity
    }
    await updateMeasurementEntry(id, updateData as Record<string, string | number | null>)
  }

  async function handleLinkToBoq(entryId: string, boqItemId: string) {
    const boq = boqItems.find((b) => b.id === boqItemId)
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, boq_item_id: boqItemId || null, unit: boq?.unit ?? e.unit }
          : e
      )
    )
    await updateMeasurementEntry(entryId, {
      boq_item_id: boqItemId || null,
      unit: boq?.unit ?? undefined,
    } as Record<string, string | null>)
  }

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    await deleteMeasurementEntry(id)
  }

  async function handleApplyAll() {
    setSaving(true)
    await applyAllMeasurementsToBoq(projectId)
    setSaving(false)
  }

  function toggleGroup(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  function exportToExcel() {
    const rows = entries.map((e) => ({
      'BOQ Item': e.boq_item?.item_code ?? '',
      Description: e.description ?? '',
      Reference: e.reference ?? '',
      Nr: e.nr,
      Length: e.length,
      Width: e.width,
      Height: e.height,
      Quantity: e.quantity,
      Unit: e.unit ?? '',
      Notes: e.notes ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Measurement Sheet')
    XLSX.writeFile(wb, `MeasurementSheet_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  function renderRow(entry: MeasurementEntry) {
    const isEditing = (field: string) => editingCell?.id === entry.id && editingCell?.field === field

    function cellInput(field: string, value: string | number | null, type: 'text' | 'number' = 'text', className = '') {
      if (isEditing(field)) {
        return (
          <input
            autoFocus
            type={type}
            step={type === 'number' ? '0.01' : undefined}
            defaultValue={value ?? ''}
            onBlur={(e) => void handleUpdate(entry.id, field, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleUpdate(entry.id, field, (e.target as HTMLInputElement).value)
              if (e.key === 'Escape') setEditingCell(null)
            }}
            className={`w-full bg-blue-50 border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none ${className}`}
          />
        )
      }
      return (
        <div
          onClick={() => setEditingCell({ id: entry.id, field })}
          className={`cursor-text px-2 py-1 rounded hover:bg-slate-50 min-h-[28px] text-sm ${className}`}
        >
          {value != null && value !== '' ? value : <span className="text-slate-300">—</span>}
        </div>
      )
    }

    return (
      <tr key={entry.id} className="hover:bg-blue-50/30 border-b border-slate-100">
        <td className="px-2 py-1 w-48">{cellInput('description', entry.description)}</td>
        <td className="px-2 py-1 w-28">{cellInput('reference', entry.reference)}</td>
        <td className="px-2 py-1 w-16">{cellInput('nr', entry.nr, 'number', 'text-center tabular-nums')}</td>
        <td className="px-2 py-1 w-20">{cellInput('length', entry.length, 'number', 'text-right tabular-nums')}</td>
        <td className="px-2 py-1 w-20">{cellInput('width', entry.width, 'number', 'text-right tabular-nums')}</td>
        <td className="px-2 py-1 w-20">{cellInput('height', entry.height, 'number', 'text-right tabular-nums')}</td>
        <td className="px-2 py-1 w-24 text-right tabular-nums font-semibold text-slate-900 text-sm">
          {entry.quantity != null ? entry.quantity.toFixed(2) : '—'}
        </td>
        <td className="px-2 py-1 w-16 text-center text-xs text-slate-500">{entry.unit ?? ''}</td>
        <td className="px-2 py-1 w-40">
          <select
            value={entry.boq_item_id ?? ''}
            onChange={(e) => void handleLinkToBoq(entry.id, e.target.value)}
            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">— Unlinked —</option>
            {boqItems.filter((b) => !b.description?.toString().includes('[SECTION]')).map((b) => (
              <option key={b.id} value={b.id}>
                {b.item_code} — {(b.description ?? '').substring(0, 30)}
              </option>
            ))}
          </select>
        </td>
        <td className="px-2 py-1 w-8">
          <button onClick={() => void handleDelete(entry.id)} className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50">
            <Trash2 size={13} />
          </button>
        </td>
      </tr>
    )
  }

  if (loading) return <div className="text-center py-12 text-slate-400">Loading measurement sheet...</div>

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 shadow-sm flex-wrap">
        <Button onClick={() => void handleAddRow()} disabled={saving}>
          <Plus size={14} /> Add Row
        </Button>
        <div className="w-px h-6 bg-slate-200" />
        <select
          value={filterBoqId}
          onChange={(e) => setFilterBoqId(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All BOQ Items</option>
          {boqItems.filter((b) => !b.description?.toString().includes('[SECTION]')).map((b) => (
            <option key={b.id} value={b.id}>{b.item_code} — {(b.description ?? '').substring(0, 40)}</option>
          ))}
        </select>
        <div className="w-px h-6 bg-slate-200" />
        <button onClick={() => void handleApplyAll()} disabled={saving} className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex items-center gap-1.5 disabled:opacity-50">
          <Calculator size={13} /> Apply to BOQ
        </button>
        <button onClick={exportToExcel} className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-100 flex items-center gap-1.5">
          <Download size={13} /> Export Excel
        </button>
        <div className="ml-auto text-xs text-slate-400">
          {entries.length} entries
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Ref</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Nr</th>
              <th className="px-2 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Length</th>
              <th className="px-2 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Width</th>
              <th className="px-2 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Height</th>
              <th className="px-2 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
              <th className="px-2 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Link2 size={12} className="inline mr-1" />BOQ Item
              </th>
              <th className="px-2 py-2.5 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {/* Grouped by BOQ item */}
            {Array.from(grouped.groups.entries()).map(([boqId, group]) => {
              const collapsed = collapsedGroups.has(boqId)
              return (
                <React.Fragment key={boqId}>
                  <tr
                    className="bg-blue-50/60 border-b border-blue-100 cursor-pointer hover:bg-blue-50"
                    onClick={() => toggleGroup(boqId)}
                  >
                    <td colSpan={6} className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        {collapsed ? <ChevronRight size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />}
                        <span className="font-mono text-xs text-blue-600">{group.boqItem?.item_code ?? '?'}</span>
                        <span className="text-sm font-medium text-slate-800">{group.boqItem?.description ?? 'Unknown item'}</span>
                        <span className="text-xs text-slate-500">({group.entries.length} measurements)</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums font-bold text-blue-700 text-sm">{group.subtotal.toFixed(2)}</td>
                    <td className="px-2 py-2 text-center text-xs text-slate-500">{group.boqItem?.unit ?? ''}</td>
                    <td colSpan={2}></td>
                  </tr>
                  {!collapsed && group.entries.map((entry) => renderRow(entry))}
                </React.Fragment>
              )
            })}

            {/* Unlinked entries */}
            {grouped.unlinked.length > 0 && (
              <>
                <tr className="bg-amber-50/60 border-b border-amber-100">
                  <td colSpan={10} className="px-2 py-2">
                    <span className="text-sm font-medium text-amber-800">Unlinked Measurements ({grouped.unlinked.length})</span>
                  </td>
                </tr>
                {grouped.unlinked.map((entry) => renderRow(entry))}
              </>
            )}

            {entries.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center">
                  <Calculator size={40} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm font-medium">No measurements yet</p>
                  <p className="text-slate-400 text-xs mt-1">Add rows with L × W × H dimensions to calculate quantities</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-800">{entry.description || 'Measurement'}</span>
              <button onClick={() => void handleDelete(entry.id)} className="p-1 rounded text-slate-400 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
            {entry.reference && <p className="text-xs text-slate-500 mb-2">Ref: {entry.reference}</p>}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Nr</label>
                <input
                  type="number"
                  defaultValue={entry.nr ?? ''}
                  onBlur={(e) => void handleUpdate(entry.id, 'nr', e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">L</label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={entry.length ?? ''}
                  onBlur={(e) => void handleUpdate(entry.id, 'length', e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-right"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">W</label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={entry.width ?? ''}
                  onBlur={(e) => void handleUpdate(entry.id, 'width', e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-right"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase">H</label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={entry.height ?? ''}
                  onBlur={(e) => void handleUpdate(entry.id, 'height', e.target.value)}
                  className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-right"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <select
                value={entry.boq_item_id ?? ''}
                onChange={(e) => void handleLinkToBoq(entry.id, e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 max-w-[60%]"
              >
                <option value="">— Unlinked —</option>
                {boqItems.map((b) => (
                  <option key={b.id} value={b.id}>{b.item_code}</option>
                ))}
              </select>
              <span className="text-sm font-bold text-slate-800 tabular-nums">
                = {entry.quantity != null ? entry.quantity.toFixed(2) : '—'} {entry.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
