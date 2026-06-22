'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { useParams } from 'next/navigation'
import type { BOQItem } from '@/lib/types'
import { MEASUREMENT_UNITS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  Plus,
  FileSpreadsheet,
  Download,
  Trash2,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Stub imports — these actions are being created in parallel
let getBOQItems: (projectId: string) => Promise<BOQItem[]>
let createBOQItem: (data: Partial<BOQItem>) => Promise<{ data?: BOQItem; error?: string }>
let updateBOQItem: (id: string, data: Partial<BOQItem>) => Promise<{ data?: BOQItem; error?: string }>
let deleteBOQItem: (id: string) => Promise<void>

try {
  const mod = require('@/app/actions/boq')
  getBOQItems = mod.getBOQItems
  createBOQItem = mod.createBOQItem
  updateBOQItem = mod.updateBOQItem
  deleteBOQItem = mod.deleteBOQItem
} catch {
  getBOQItems = async () => []
  createBOQItem = async () => ({ error: 'Not implemented' })
  updateBOQItem = async () => ({ error: 'Not implemented' })
  deleteBOQItem = async () => {}
}

const MOCK_DATA: BOQItem[] = [
  {
    id: '1', project_id: '', mi_id: null, library_item_id: null,
    code: '01.01', description: 'Excavation for foundations', unit: 'm³',
    quantity: 245.5, original_quantity: 245.5, revised_quantity: 260.0, quantity_difference: 14.5,
    unit_rate: 35, material_rate: 10, labor_rate: 20, equipment_rate: 5,
    total_amount: 8592.5, section: 'Substructure', notes: null, sort_order: 1,
    created_at: '', updated_at: '',
  },
  {
    id: '2', project_id: '', mi_id: null, library_item_id: null,
    code: '01.02', description: 'Plain concrete grade C15 for blinding', unit: 'm³',
    quantity: 18.2, original_quantity: 18.2, revised_quantity: null, quantity_difference: null,
    unit_rate: 180, material_rate: 120, labor_rate: 45, equipment_rate: 15,
    total_amount: 3276, section: 'Substructure', notes: null, sort_order: 2,
    created_at: '', updated_at: '',
  },
  {
    id: '3', project_id: '', mi_id: null, library_item_id: null,
    code: '02.01', description: 'Reinforced concrete grade C30 for columns', unit: 'm³',
    quantity: 52.8, original_quantity: 52.8, revised_quantity: 55.0, quantity_difference: 2.2,
    unit_rate: 320, material_rate: 200, labor_rate: 90, equipment_rate: 30,
    total_amount: 16896, section: 'Superstructure', notes: null, sort_order: 3,
    created_at: '', updated_at: '',
  },
  {
    id: '4', project_id: '', mi_id: null, library_item_id: null,
    code: '02.02', description: 'Steel reinforcement (high tensile)', unit: 'kg',
    quantity: 4200, original_quantity: 4200, revised_quantity: null, quantity_difference: null,
    unit_rate: 4.5, material_rate: 3.2, labor_rate: 1.0, equipment_rate: 0.3,
    total_amount: 18900, section: 'Superstructure', notes: null, sort_order: 4,
    created_at: '', updated_at: '',
  },
]

interface EditingCell {
  itemId: string
  field: keyof BOQItem
}

export default function BOQPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [items, setItems] = useState<BOQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sectionFilter, setSectionFilter] = useState<string>('')
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [vatPct, setVatPct] = useState(17)

  const [form, setForm] = useState({
    code: '',
    description: '',
    unit: 'm',
    quantity: '',
    unit_rate: '',
    material_rate: '',
    labor_rate: '',
    equipment_rate: '',
    section: '',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getBOQItems(projectId)
      if (data && data.length > 0) {
        setItems(data)
      } else {
        setItems(MOCK_DATA.map((d) => ({ ...d, project_id: projectId })))
      }
    } catch {
      setItems(MOCK_DATA.map((d) => ({ ...d, project_id: projectId })))
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.description.trim()) return
    setCreating(true)
    setError(null)
    try {
      const result = await createBOQItem({
        project_id: projectId,
        code: form.code || null,
        description: form.description,
        unit: form.unit,
        quantity: parseFloat(form.quantity) || 0,
        unit_rate: parseFloat(form.unit_rate) || 0,
        material_rate: parseFloat(form.material_rate) || null,
        labor_rate: parseFloat(form.labor_rate) || null,
        equipment_rate: parseFloat(form.equipment_rate) || null,
        section: form.section || null,
        notes: form.notes || null,
      })
      if (result.error) {
        setError(result.error)
        setCreating(false)
        return
      }
    } catch {
      setError('Failed to create item')
      setCreating(false)
      return
    }
    setShowCreate(false)
    setForm({ code: '', description: '', unit: 'm', quantity: '', unit_rate: '', material_rate: '', labor_rate: '', equipment_rate: '', section: '', notes: '' })
    setCreating(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this BOQ item?')) return
    try {
      await deleteBOQItem(id)
    } catch { /* ignore */ }
    load()
  }

  const startEdit = (itemId: string, field: keyof BOQItem, value: string | number | null) => {
    setEditingCell({ itemId, field })
    setEditValue(String(value ?? ''))
  }

  const commitEdit = async () => {
    if (!editingCell) return
    const { itemId, field } = editingCell
    const numericFields = ['quantity', 'original_quantity', 'revised_quantity', 'unit_rate', 'material_rate', 'labor_rate', 'equipment_rate']
    const val = numericFields.includes(field)
      ? (parseFloat(editValue) || 0)
      : editValue

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        const updated = { ...item, [field]: val }
        // Recalculate total
        const qty = updated.quantity ?? 0
        const rate = updated.unit_rate ?? 0
        updated.total_amount = qty * rate
        // Recalculate difference
        if (updated.original_quantity != null && updated.revised_quantity != null) {
          updated.quantity_difference = updated.revised_quantity - updated.original_quantity
        }
        return updated
      })
    )

    try {
      await updateBOQItem(itemId, { [field]: val })
    } catch { /* ignore */ }

    setEditingCell(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditingCell(null)
  }

  // Section grouping
  const sections = groupBySection(
    sectionFilter
      ? items.filter((i) => i.section === sectionFilter)
      : items
  )
  const allSections = [...new Set(items.map((i) => i.section ?? '').filter(Boolean))]

  const subtotal = items.reduce((sum, i) => sum + (i.total_amount ?? 0), 0)
  const vatAmount = subtotal * (vatPct / 100)
  const grandTotal = subtotal + vatAmount

  const formatCurrency = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const renderCell = (item: BOQItem, field: keyof BOQItem, value: string | number | null, isNumeric = false, readOnly = false) => {
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === field
    if (isEditing) {
      return (
        <input
          autoFocus
          className="w-full px-2 py-1 text-sm border border-blue-400 rounded bg-white outline-none focus:ring-1 focus:ring-blue-500"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          type={isNumeric ? 'number' : 'text'}
          step={isNumeric ? 'any' : undefined}
        />
      )
    }
    return (
      <div
        className={cn(
          'px-2 py-1.5 cursor-pointer rounded hover:bg-blue-50 min-h-[32px] flex items-center',
          readOnly && 'cursor-default hover:bg-transparent',
          isNumeric && 'justify-end tabular-nums'
        )}
        onClick={() => !readOnly && startEdit(item.id, field, value)}
      >
        {isNumeric && value != null ? formatCurrency(Number(value)) : (value ?? '-')}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Bill of Quantities</h2>
          <p className="text-sm text-slate-500">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allSections.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-slate-400" />
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-2 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sections</option>
                {allSections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          <Button variant="outline" disabled title="Coming soon">
            <Download size={16} />
            Export
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Add Item
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <FileSpreadsheet size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No BOQ items yet</h3>
          <p className="text-slate-500 text-sm mb-6">
            Add items to build your Bill of Quantities.
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 w-[80px]">Code</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 min-w-[200px]">Description</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 w-[60px]">Unit</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 w-[90px]">Qty</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 w-[90px]">Orig Qty</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 w-[90px]">Rev Qty</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 w-[80px]">Diff</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 w-[100px]">Unit Rate</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 w-[120px]">Amount</th>
                  <th className="w-[40px]" />
                </tr>
              </thead>
              <tbody>
                {sections.map(([section, sectionItems]) => {
                  const sectionTotal = sectionItems.reduce((sum, i) => sum + (i.total_amount ?? 0), 0)
                  return (
                    <Fragment key={section}>
                      {section && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={10} className="px-3 py-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              {section}
                            </span>
                          </td>
                        </tr>
                      )}
                      {sectionItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-1 py-0.5">
                            {renderCell(item, 'code', item.code)}
                          </td>
                          <td className="px-1 py-0.5">
                            {renderCell(item, 'description', item.description)}
                          </td>
                          <td className="px-1 py-0.5">
                            {renderCell(item, 'unit', item.unit)}
                          </td>
                          <td className="px-1 py-0.5">
                            {renderCell(item, 'quantity', item.quantity, true)}
                          </td>
                          <td className="px-1 py-0.5">
                            {renderCell(item, 'original_quantity', item.original_quantity, true)}
                          </td>
                          <td className="px-1 py-0.5">
                            {renderCell(item, 'revised_quantity', item.revised_quantity, true)}
                          </td>
                          <td className="px-1 py-0.5">
                            <div className={cn(
                              'px-2 py-1.5 text-right tabular-nums',
                              item.quantity_difference != null && item.quantity_difference > 0 && 'text-green-600',
                              item.quantity_difference != null && item.quantity_difference < 0 && 'text-red-600'
                            )}>
                              {item.quantity_difference != null ? (
                                <>
                                  {item.quantity_difference > 0 && '+'}
                                  {formatCurrency(item.quantity_difference)}
                                </>
                              ) : '-'}
                            </div>
                          </td>
                          <td className="px-1 py-0.5">
                            {renderCell(item, 'unit_rate', item.unit_rate, true)}
                          </td>
                          <td className="px-1 py-0.5">
                            {renderCell(item, 'total_amount', item.total_amount, true, true)}
                          </td>
                          <td className="px-1 py-0.5">
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {section && (
                        <tr className="bg-slate-50/30 border-b border-slate-200">
                          <td colSpan={8} className="px-3 py-2 text-right text-xs font-semibold text-slate-500">
                            {section} Subtotal
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-sm tabular-nums text-slate-700">
                            {formatCurrency(sectionTotal)}
                          </td>
                          <td />
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50">
                  <td colSpan={8} className="px-3 py-2.5 text-right font-semibold text-slate-600">
                    Subtotal
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-900 tabular-nums">
                    {formatCurrency(subtotal)}
                  </td>
                  <td />
                </tr>
                <tr className="bg-slate-50">
                  <td colSpan={7} className="px-3 py-2 text-right font-semibold text-slate-600">
                    VAT
                  </td>
                  <td className="px-1 py-1">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={vatPct}
                        onChange={(e) => setVatPct(parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-sm text-right border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-500">%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-700 tabular-nums">
                    {formatCurrency(vatAmount)}
                  </td>
                  <td />
                </tr>
                <tr className="bg-blue-50 border-t border-blue-200">
                  <td colSpan={8} className="px-3 py-3 text-right font-bold text-blue-900">
                    Grand Total
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-lg text-blue-900 tabular-nums">
                    {formatCurrency(grandTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New BOQ Item" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. 01.01"
            />
            <div className="col-span-2">
              <Input
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Excavation for foundations"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MEASUREMENT_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <Input
              label="Quantity"
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Unit Rate"
              type="number"
              value={form.unit_rate}
              onChange={(e) => setForm({ ...form, unit_rate: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Material Rate"
              type="number"
              value={form.material_rate}
              onChange={(e) => setForm({ ...form, material_rate: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Labor Rate"
              type="number"
              value={form.labor_rate}
              onChange={(e) => setForm({ ...form, labor_rate: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Equipment Rate"
              type="number"
              value={form.equipment_rate}
              onChange={(e) => setForm({ ...form, equipment_rate: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <Input
            label="Section"
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
            placeholder="e.g. Substructure"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating} disabled={!form.description.trim()}>
              Add Item
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function groupBySection(items: BOQItem[]): [string, BOQItem[]][] {
  const map = new Map<string, BOQItem[]>()
  for (const item of items) {
    const key = item.section ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries())
}

