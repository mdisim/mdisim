'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { useToast } from '@/components/ui/toast'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, BookOpen, Trash2, Pencil, FolderOpen } from 'lucide-react'
import { MEASUREMENT_UNITS } from '@/lib/types'
import type { LibraryCategory, LibraryItem } from '@/lib/types'
import {
  createLibraryCategory, createLibraryItem, updateLibraryItem,
  deleteLibraryItem, deleteLibraryCategory, updateLibraryCategory,
} from '@/app/actions/library'

interface EditingCell { itemId: string; field: keyof LibraryItem }

export function LibraryMode() {
  const { data, reload } = useWorkspace()
  const { toast } = useToast()
  const { categories, libraryItems } = data

  const [selectedCategory, setSelectedCategory] = useState<string | null>(categories[0]?.id ?? null)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [showCreateItem, setShowCreateItem] = useState(false)
  const [editingCategory, setEditingCategory] = useState<LibraryCategory | null>(null)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' })
  const [itemForm, setItemForm] = useState({
    code: '', description: '', unit: 'm', default_rate: '', material_rate: '', labor_rate: '', equipment_rate: '', notes: '',
  })

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) setSelectedCategory(categories[0].id)
  }, [categories, selectedCategory])

  const items = libraryItems.filter(i => i.category_id === selectedCategory)

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) return
    setCreating(true)
    setError(null)
    const result = await createLibraryCategory({ name: categoryForm.name, description: categoryForm.description || undefined })
    if (result.error) { setError(result.error); setCreating(false); return }
    setShowCreateCategory(false)
    setCategoryForm({ name: '', description: '' })
    setCreating(false)
    reload()
  }

  const handleEditCategory = async () => {
    if (!editingCategory || !categoryForm.name.trim()) return
    setCreating(true)
    setError(null)
    const result = await updateLibraryCategory(editingCategory.id, { name: categoryForm.name, description: categoryForm.description || undefined })
    if (result?.error) { setError(result.error); setCreating(false); return }
    setEditingCategory(null)
    setCategoryForm({ name: '', description: '' })
    setCreating(false)
    reload()
  }

  const handleDeleteCategory = (id: string) => {
    setConfirmAction({
      message: 'Delete this category and all its items?',
      onConfirm: async () => {
        await deleteLibraryCategory(id)
        if (selectedCategory === id) setSelectedCategory(null)
        reload()
      },
    })
  }

  const handleCreateItem = async () => {
    if (!itemForm.description.trim() || !selectedCategory) return
    setCreating(true)
    setError(null)
    const result = await createLibraryItem({
      category_id: selectedCategory,
      code: itemForm.code || undefined,
      description: itemForm.description,
      unit: itemForm.unit,
      default_rate: parseFloat(itemForm.default_rate) || undefined,
      material_rate: parseFloat(itemForm.material_rate) || undefined,
      labor_rate: parseFloat(itemForm.labor_rate) || undefined,
      equipment_rate: parseFloat(itemForm.equipment_rate) || undefined,
      notes: itemForm.notes || undefined,
    })
    if (result.error) { setError(result.error); setCreating(false); return }
    setShowCreateItem(false)
    setItemForm({ code: '', description: '', unit: 'm', default_rate: '', material_rate: '', labor_rate: '', equipment_rate: '', notes: '' })
    setCreating(false)
    reload()
  }

  const handleDeleteItem = (id: string) => {
    setConfirmAction({
      message: 'Delete this library item?',
      onConfirm: async () => { await deleteLibraryItem(id); reload() },
    })
  }

  const startEdit = (itemId: string, field: keyof LibraryItem, value: string | number | null) => {
    setEditingCell({ itemId, field })
    setEditValue(String(value ?? ''))
  }

  const commitEdit = async () => {
    if (!editingCell) return
    const { itemId, field } = editingCell
    const numericFields = ['default_rate', 'material_rate', 'labor_rate', 'equipment_rate']
    const val = numericFields.includes(field) ? (parseFloat(editValue) || 0) : editValue
    setEditingCell(null)
    const result = await updateLibraryItem(itemId, { [field]: val })
    if (result?.error) setError(result.error)
    reload()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditingCell(null)
  }

  const selectedCategoryData = categories.find(c => c.id === selectedCategory)
  const formatRate = (n: number | null) => n != null ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'

  const renderCell = (item: LibraryItem, field: keyof LibraryItem, value: string | number | null, isNumeric = false) => {
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === field
    if (isEditing) {
      return (
        <input
          autoFocus
          className="w-full px-2 py-1 text-sm border border-[var(--color-brand)] rounded-[var(--radius-sm)] bg-[var(--color-surface-elevated)] outline-none focus:ring-1 focus:ring-[var(--color-brand)] text-[var(--color-text)]"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          type={isNumeric ? 'number' : 'text'}
          step={isNumeric ? 'any' : undefined}
        />
      )
    }
    return (
      <div
        className={cn('px-2 py-1.5 cursor-pointer rounded-[var(--radius-sm)] hover:bg-[var(--color-brand-tint)] min-h-[32px] flex items-center transition-colors text-[var(--color-text)]', isNumeric && 'justify-end mono text-xs')}
        onClick={() => startEdit(item.id, field, value)}
      >
        {isNumeric && value != null ? formatRate(Number(value)) : (value ?? '-')}
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <>
        <EmptyState
          icon={BookOpen}
          title="Library is empty"
          description="Create a category to start building a reusable catalog of rate items."
          actionLabel="New category"
          onAction={() => setShowCreateCategory(true)}
        />
        <Modal isOpen={showCreateCategory} onClose={() => setShowCreateCategory(false)} title="New category" size="sm">
          <div className="space-y-4">
            <Input label="Category name" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g. Earthworks" />
            <Input label="Description" value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Optional description" />
            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowCreateCategory(false)}>Cancel</Button>
              <Button onClick={handleCreateCategory} loading={creating} disabled={!categoryForm.name.trim()}>Create</Button>
            </div>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-[260px] shrink-0 border-e border-[var(--color-border)] bg-[var(--color-surface-elevated)] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-border)]">
          <h3 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider font-mono">Categories</h3>
          <button onClick={() => setShowCreateCategory(true)} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-brand-tint)] text-[var(--color-text-secondary)] hover:text-[var(--color-brand)] transition-colors" title="Add category">
            <Plus size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {categories.map(cat => (
            <div
              key={cat.id}
              className={cn(
                'group flex items-center gap-2 px-2.5 py-2 cursor-pointer transition-colors rounded-[var(--radius-md)]',
                selectedCategory === cat.id ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand)]' : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
              )}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <FolderOpen size={14} className={selectedCategory === cat.id ? 'text-[var(--color-brand)]' : 'text-[var(--color-text-muted)]'} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{cat.name}</p>
                {cat.description && <p className="text-[11px] text-[var(--color-text-muted)] truncate">{cat.description}</p>}
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); setCategoryForm({ name: cat.name, description: cat.description ?? '' }); setEditingCategory(cat) }}
                  className="p-1 rounded hover:bg-[var(--color-brand-tint)] text-[var(--color-text-muted)] hover:text-[var(--color-brand)] transition-colors"
                  title="Edit"
                ><Pencil size={11} /></button>
                <button
                  onClick={e => { e.stopPropagation(); handleDeleteCategory(cat.id) }}
                  className="p-1 rounded hover:bg-[var(--color-danger-tint)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                  title="Delete"
                ><Trash2 size={11} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-[var(--color-text)]">{selectedCategoryData?.name ?? 'Select a category'}</h2>
            {selectedCategoryData?.description && <p className="text-[12px] text-[var(--color-text-muted)]">{selectedCategoryData.description}</p>}
          </div>
          {selectedCategory && (
            <Button size="sm" onClick={() => setShowCreateItem(true)}><Plus size={14} /> Add item</Button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {items.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No items in this category"
              description="Add rate items to build your pricing catalog."
              actionLabel="Add first item"
              onAction={() => setShowCreateItem(true)}
            />
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border-strong)]">
                      <th className="text-start px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] w-[80px]">Code</th>
                      <th className="text-start px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] min-w-[200px]">Description</th>
                      <th className="text-start px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] w-[60px]">Unit</th>
                      <th className="text-end px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] w-[100px]">Rate</th>
                      <th className="text-end px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] w-[100px]">Material</th>
                      <th className="text-end px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] w-[100px]">Labor</th>
                      <th className="text-end px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] w-[100px]">Equipment</th>
                      <th className="w-[40px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)] transition-colors group">
                        <td className="px-1 py-0.5">{renderCell(item, 'code', item.code)}</td>
                        <td className="px-1 py-0.5">{renderCell(item, 'description', item.description)}</td>
                        <td className="px-1 py-0.5">{renderCell(item, 'unit', item.unit)}</td>
                        <td className="px-1 py-0.5">{renderCell(item, 'default_rate', item.default_rate, true)}</td>
                        <td className="px-1 py-0.5">{renderCell(item, 'material_rate', item.material_rate, true)}</td>
                        <td className="px-1 py-0.5">{renderCell(item, 'labor_rate', item.labor_rate, true)}</td>
                        <td className="px-1 py-0.5">{renderCell(item, 'equipment_rate', item.equipment_rate, true)}</td>
                        <td className="px-1 py-0.5">
                          <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 rounded hover:bg-[var(--color-danger-tint)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showCreateCategory} onClose={() => setShowCreateCategory(false)} title="New category" size="sm">
        <div className="space-y-4">
          <Input label="Category name" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g. Earthworks" />
          <Input label="Description" value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Optional description" />
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateCategory(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} loading={creating} disabled={!categoryForm.name.trim()}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingCategory} onClose={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }) }} title="Edit category" size="sm">
        <div className="space-y-4">
          <Input label="Category name" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g. Earthworks" />
          <Input label="Description" value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} placeholder="Optional description" />
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }) }}>Cancel</Button>
            <Button onClick={handleEditCategory} loading={creating} disabled={!categoryForm.name.trim()}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showCreateItem} onClose={() => setShowCreateItem(false)} title="New library item" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Code" value={itemForm.code} onChange={e => setItemForm({ ...itemForm, code: e.target.value })} placeholder="e.g. EW-01" />
            <div className="col-span-2"><Input label="Description" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} placeholder="e.g. Excavation in ordinary soil" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">Unit</label>
              <select value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} className="w-full px-3 py-2 text-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]">
                {MEASUREMENT_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <Input label="Default rate" type="number" value={itemForm.default_rate} onChange={e => setItemForm({ ...itemForm, default_rate: e.target.value })} placeholder="0.00" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Material rate" type="number" value={itemForm.material_rate} onChange={e => setItemForm({ ...itemForm, material_rate: e.target.value })} placeholder="0.00" />
            <Input label="Labor rate" type="number" value={itemForm.labor_rate} onChange={e => setItemForm({ ...itemForm, labor_rate: e.target.value })} placeholder="0.00" />
            <Input label="Equipment rate" type="number" value={itemForm.equipment_rate} onChange={e => setItemForm({ ...itemForm, equipment_rate: e.target.value })} placeholder="0.00" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text)]">Notes</label>
            <textarea value={itemForm.notes} onChange={e => setItemForm({ ...itemForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 text-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] resize-none" />
          </div>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateItem(false)}>Cancel</Button>
            <Button onClick={handleCreateItem} loading={creating} disabled={!itemForm.description.trim()}>Add item</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm" size="sm">
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>Confirm</Button>
        </div>
      </Modal>
    </div>
  )
}
