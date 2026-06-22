'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  getMeasurementItems,
  createMeasurementItem,
  deleteMeasurementItem,
  updateMeasurementItem,
} from '@/app/actions/measurements'
import type { MeasurementItem } from '@/lib/types'
import { MEASUREMENT_UNITS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { MeasurementSheet } from '@/components/measurements/measurement-sheet'
import { Plus, Ruler, ChevronDown, ChevronRight, Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MeasurementsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [items, setItems] = useState<MeasurementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [editingItem, setEditingItem] = useState<MeasurementItem | null>(null)

  const [form, setForm] = useState({
    item_code: '',
    description: '',
    unit: 'm',
    section: '',
    drawing_ref: '',
    location: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getMeasurementItems(projectId)
    setItems(data)
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.description.trim()) return
    setCreating(true)
    setError(null)
    const result = await createMeasurementItem({ project_id: projectId, ...form })
    if (result.error) {
      setError(result.error)
      setCreating(false)
      return
    }
    setShowCreate(false)
    setForm({ item_code: '', description: '', unit: 'm', section: '', drawing_ref: '', location: '' })
    setCreating(false)
    if (result.data) {
      setExpandedItems((prev) => new Set([...prev, result.data!.id]))
    }
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this measurement item and all its lines?')) return
    await deleteMeasurementItem(id)
    load()
  }

  const handleEditSave = async () => {
    if (!editingItem) return
    await updateMeasurementItem(editingItem.id, {
      item_code: editingItem.item_code,
      description: editingItem.description,
      unit: editingItem.unit,
      section: editingItem.section,
      drawing_ref: editingItem.drawing_ref,
      location: editingItem.location,
    })
    setEditingItem(null)
    load()
  }

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sections = groupBySection(items)

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Measurement Book</h2>
          <p className="text-sm text-slate-500">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          Add Item
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Ruler size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No measurement items yet</h3>
          <p className="text-slate-500 text-sm mb-6">
            Add measurement items to start building your quantity calculation book.
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map(([section, sectionItems]) => (
            <div key={section}>
              {section && (
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 px-1">
                  {section}
                </h3>
              )}
              <div className="space-y-2">
                {sectionItems.map((item) => {
                  const isExpanded = expandedItems.has(item.id)
                  return (
                    <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      {/* Item header */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleExpand(item.id)}
                      >
                        <button className="p-0.5 text-slate-400">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {item.item_code && (
                              <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                {item.item_code}
                              </span>
                            )}
                            <span className="font-medium text-slate-900 truncate">{item.description}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                            <span>{item.unit}</span>
                            {item.location && <span>· {item.location}</span>}
                            {item.drawing_ref && <span>· Dwg: {item.drawing_ref}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn(
                            'text-sm font-bold tabular-nums',
                            item.total_qty < 0 ? 'text-red-600' : 'text-slate-900'
                          )}>
                            {formatQty(item.total_qty)}
                          </p>
                          <p className="text-[11px] text-slate-400">{item.unit}</p>
                        </div>
                        <div className="flex items-center gap-0.5 ml-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setEditingItem({ ...item })}
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit item"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Measurement lines spreadsheet */}
                      {isExpanded && (
                        <div className="border-t border-slate-100">
                          <MeasurementSheet item={item} onUpdate={load} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Measurement Item" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Item Code"
              value={form.item_code}
              onChange={(e) => setForm({ ...form, item_code: e.target.value })}
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
          <div className="grid grid-cols-2 gap-4">
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
              label="Section / Category"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              placeholder="e.g. Substructure"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Drawing Reference"
              value={form.drawing_ref}
              onChange={(e) => setForm({ ...form, drawing_ref: e.target.value })}
              placeholder="e.g. S-01"
            />
            <Input
              label="Location / Floor"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Ground Floor"
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

      {/* Edit modal */}
      {editingItem && (
        <Modal isOpen={true} onClose={() => setEditingItem(null)} title="Edit Measurement Item" size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Item Code"
                value={editingItem.item_code ?? ''}
                onChange={(e) => setEditingItem({ ...editingItem, item_code: e.target.value })}
              />
              <div className="col-span-2">
                <Input
                  label="Description"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Unit</label>
                <select
                  value={editingItem.unit}
                  onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {MEASUREMENT_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Section"
                value={editingItem.section ?? ''}
                onChange={(e) => setEditingItem({ ...editingItem, section: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Drawing Reference"
                value={editingItem.drawing_ref ?? ''}
                onChange={(e) => setEditingItem({ ...editingItem, drawing_ref: e.target.value })}
              />
              <Input
                label="Location / Floor"
                value={editingItem.location ?? ''}
                onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button onClick={handleEditSave}>Save</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function groupBySection(items: MeasurementItem[]): [string, MeasurementItem[]][] {
  const map = new Map<string, MeasurementItem[]>()
  for (const item of items) {
    const key = item.section ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries())
}

function formatQty(n: number): string {
  if (n === 0) return '0.00'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}
