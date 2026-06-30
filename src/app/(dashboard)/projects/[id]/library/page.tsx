'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import type { LibraryCategory, LibraryItem } from '@/lib/types'
import { MEASUREMENT_UNITS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { TableSkeleton } from '@/components/ui/skeleton'
import {
  Plus,
  BookOpen,
  Trash2,
  Pencil,
  FolderOpen,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import {
  getLibraryCategories,
  createLibraryCategory,
  getLibraryItems,
  createLibraryItem,
  updateLibraryItem,
  deleteLibraryItem,
  deleteLibraryCategory,
  updateLibraryCategory,
} from '@/app/actions/library'

interface EditingCell {
  itemId: string
  field: keyof LibraryItem
}

export default function LibraryPage() {
  const { id: _projectId } = useParams<{ id: string }>()
  const { t } = useI18n()
  const [categories, setCategories] = useState<LibraryCategory[]>([])
  const [items, setItems] = useState<LibraryItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  const [showCreateItem, setShowCreateItem] = useState(false)
  const [editingCategory, setEditingCategory] = useState<LibraryCategory | null>(null)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' })
  const [itemForm, setItemForm] = useState({
    code: '',
    description: '',
    unit: 'm',
    default_rate: '',
    material_rate: '',
    labor_rate: '',
    equipment_rate: '',
    notes: '',
  })

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getLibraryCategories()
      setCategories(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadItems = useCallback(async (categoryId: string) => {
    setLoadingItems(true)
    setError(null)
    try {
      const data = await getLibraryItems(categoryId)
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items')
    } finally {
      setLoadingItems(false)
    }
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  useEffect(() => {
    if (selectedCategory) {
      loadItems(selectedCategory)
    } else {
      setItems([])
    }
  }, [selectedCategory, loadItems])

  // Auto-select first category
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].id)
    }
  }, [categories, selectedCategory])

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const result = await createLibraryCategory({
        name: categoryForm.name,
        description: categoryForm.description || undefined,
      })
      if (result.error) {
        setError(result.error)
        setCreating(false)
        return
      }
    } catch {
      setError('Failed to create category')
      setCreating(false)
      return
    }
    setShowCreateCategory(false)
    setCategoryForm({ name: '', description: '' })
    setCreating(false)
    loadCategories()
  }

  const handleEditCategory = async () => {
    if (!editingCategory || !categoryForm.name.trim()) return
    setCreating(true)
    setError(null)
    try {
      const result = await updateLibraryCategory(editingCategory.id, {
        name: categoryForm.name,
        description: categoryForm.description || undefined,
      })
      if (result?.error) {
        setError(result.error)
        setCreating(false)
        return
      }
    } catch {
      setError('Failed to update category')
      setCreating(false)
      return
    }
    setEditingCategory(null)
    setCategoryForm({ name: '', description: '' })
    setCreating(false)
    loadCategories()
  }

  const handleDeleteCategory = async (id: string) => {
    setConfirmAction({
      message: 'Delete this category and all its items?',
      onConfirm: async () => {
        try { await deleteLibraryCategory(id) } catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete category') }
        if (selectedCategory === id) setSelectedCategory(null)
        loadCategories()
      },
    })
  }

  const handleCreateItem = async () => {
    if (!itemForm.description.trim() || !selectedCategory) return
    setCreating(true)
    setError(null)
    try {
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
    setShowCreateItem(false)
    setItemForm({ code: '', description: '', unit: 'm', default_rate: '', material_rate: '', labor_rate: '', equipment_rate: '', notes: '' })
    setCreating(false)
    if (selectedCategory) loadItems(selectedCategory)
  }

  const handleDeleteItem = async (id: string) => {
    setConfirmAction({
      message: 'Delete this library item?',
      onConfirm: async () => {
        try { await deleteLibraryItem(id) } catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete item') }
        if (selectedCategory) loadItems(selectedCategory)
      },
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
    const val = numericFields.includes(field)
      ? (parseFloat(editValue) || 0)
      : editValue

    setItems((prev) =>
      prev.map((item) => item.id === itemId ? { ...item, [field]: val } : item)
    )

    try {
      const result = await updateLibraryItem(itemId, { [field]: val })
      if (result?.error) {
        setError(result.error)
        if (selectedCategory) loadItems(selectedCategory)
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to update item') }

    setEditingCell(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditingCell(null)
  }

  const selectedCategoryData = categories.find((c) => c.id === selectedCategory)

  const formatRate = (n: number | null) =>
    n != null ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'

  const renderCell = (item: LibraryItem, field: keyof LibraryItem, value: string | number | null, isNumeric = false) => {
    const isEditing = editingCell?.itemId === item.id && editingCell?.field === field
    if (isEditing) {
      return (
        <input
          autoFocus
          className="w-full px-2 py-1 text-sm border border-[color:var(--color-amber)] rounded bg-[color:var(--color-surface-elevated)] outline-none focus:ring-1 focus:ring-[color:var(--color-amber)] text-[color:var(--color-text)]"
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
          'px-2 py-1.5 cursor-pointer rounded hover:bg-[color:var(--color-amber)]/10 min-h-[32px] flex items-center transition-colors text-[color:var(--color-text)]',
          isNumeric && 'justify-end tabular-nums font-mono text-xs'
        )}
        onClick={() => startEdit(item.id, field, value)}
      >
        {isNumeric && value != null ? formatRate(Number(value)) : (value ?? '-')}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Page Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)]">
        <div className="w-8 h-8 rounded-lg bg-[color:var(--color-amber)]/10 flex items-center justify-center">
          <BookOpen size={16} className="text-[color:var(--color-amber)]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[color:var(--color-text)]">{t.library.title}</h2>
          <p className="text-sm text-[color:var(--color-text-secondary)]">Manage reusable rate items and categories</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="md:hidden fixed top-[130px] start-2 z-30 p-2 rounded-lg bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] shadow-sm text-[color:var(--color-text-secondary)]"
          aria-label="Toggle categories sidebar"
        >
          <Menu size={18} />
        </button>

        {/* Left panel — Categories */}
        <div className={cn(
          'border-e border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] flex flex-col shrink-0',
          sidebarOpen ? 'w-[280px]' : 'hidden',
          'md:block md:w-[280px]'
        )}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--color-border)]">
            <h3 className="text-sm font-bold text-[color:var(--color-text)] uppercase tracking-wider font-mono">Categories</h3>
            <button
              onClick={() => setShowCreateCategory(true)}
              className="p-1.5 rounded-lg hover:bg-[color:var(--color-amber)]/10 text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-amber)] transition-colors"
              title="Add category"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4">
                <TableSkeleton rows={3} columns={1} />
              </div>
            ) : categories.length === 0 ? (
              <div className="p-4 text-center text-sm text-[color:var(--color-text-secondary)]">
                No categories yet
              </div>
            ) : (
              <div className="py-2 space-y-0.5 px-2">
                {categories.map((cat, idx) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                  >
                    <div
                      className={cn(
                        'group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors rounded-xl',
                        selectedCategory === cat.id
                          ? 'bg-[color:var(--color-amber)]/10 text-[color:var(--color-amber)] border-e-2 border-[color:var(--color-amber)]'
                          : 'text-[color:var(--color-text)] hover:bg-[color:var(--color-surface)]'
                      )}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <FolderOpen size={16} className={cn(
                        selectedCategory === cat.id ? 'text-[color:var(--color-amber)]' : 'text-[color:var(--color-text-secondary)]'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cat.name}</p>
                        {cat.description && (
                          <p className="text-xs text-[color:var(--color-text-secondary)] truncate">{cat.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCategoryForm({ name: cat.name, description: cat.description ?? '' })
                            setEditingCategory(cat)
                          }}
                          className="p-1 rounded hover:bg-[color:var(--color-amber)]/10 text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-amber)] transition-colors"
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCategory(cat.id)
                          }}
                          className="p-1 rounded hover:bg-red-500/10 text-[color:var(--color-text-secondary)] hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — Items */}
        <div className="flex-1 flex flex-col bg-[color:var(--background)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 bg-[color:var(--color-surface-elevated)] border-b border-[color:var(--color-border)]">
            <div>
              <h2 className="text-lg font-bold text-[color:var(--color-text)]">
                {selectedCategoryData?.name ?? 'Select a Category'}
              </h2>
              {selectedCategoryData?.description && (
                <p className="text-sm text-[color:var(--color-text-secondary)]">{selectedCategoryData.description}</p>
              )}
            </div>
            {selectedCategory && (
              <button
                onClick={() => setShowCreateItem(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl bg-[color:var(--color-amber)] text-[color:var(--color-on-amber)] hover:opacity-90 transition-opacity shadow-sm"
              >
                <Plus size={15} />
                Add Item
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto p-5">
            {!selectedCategory ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 rounded-2xl bg-[color:var(--color-amber)]/10 flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={28} className="text-[color:var(--color-amber)]" />
                </div>
                <h3 className="text-lg font-semibold text-[color:var(--color-text)] mb-1">Pricing Library</h3>
                <p className="text-[color:var(--color-text-secondary)] text-sm">
                  Select a category to view and manage rate items.
                </p>
              </div>
            ) : loadingItems ? (
              <div className="bg-[color:var(--color-surface-elevated)] rounded-2xl border border-[color:var(--color-border)] p-4">
                <TableSkeleton rows={6} columns={4} />
              </div>
            ) : error && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={() => selectedCategory && loadItems(selectedCategory)} className="px-4 py-2 text-sm font-medium bg-[color:var(--color-amber)] text-[color:var(--color-on-amber)] rounded-xl hover:opacity-90">Retry</button>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 rounded-2xl bg-[color:var(--color-amber)]/10 flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={28} className="text-[color:var(--color-amber)]" />
                </div>
                <h3 className="text-lg font-semibold text-[color:var(--color-text)] mb-1">No items in this category</h3>
                <p className="text-[color:var(--color-text-secondary)] text-sm mb-6">
                  Add rate items to build your pricing catalog.
                </p>
                <button
                  onClick={() => setShowCreateItem(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl bg-[color:var(--color-amber)] text-[color:var(--color-on-amber)] hover:opacity-90 transition-opacity mx-auto"
                >
                  <Plus size={15} />
                  Add First Item
                </button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-[color:var(--color-surface-elevated)] rounded-2xl border border-[color:var(--color-border)] overflow-hidden"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[color:var(--color-surface)] border-b border-[color:var(--color-border)]">
                        <th className="text-start px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[80px]">Code</th>
                        <th className="text-start px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] min-w-[200px]">Description</th>
                        <th className="text-start px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[60px]">Unit</th>
                        <th className="text-end px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[100px]">Rate</th>
                        <th className="text-end px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[100px]">Material</th>
                        <th className="text-end px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[100px]">Labor</th>
                        <th className="text-end px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[100px]">Equipment</th>
                        <th className="w-[40px]" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--color-border)]/50">
                      {items.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={cn(
                            'hover:bg-[color:var(--color-amber)]/5 transition-colors group',
                            idx % 2 === 1 && 'bg-[color:var(--color-surface)]/30'
                          )}
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
                            {renderCell(item, 'default_rate', item.default_rate, true)}
                          </td>
                          <td className="px-1 py-0.5">
                            {renderCell(item, 'material_rate', item.material_rate, true)}
                          </td>
                          <td className="px-1 py-0.5">
                            {renderCell(item, 'labor_rate', item.labor_rate, true)}
                          </td>
                          <td className="px-1 py-0.5">
                            {renderCell(item, 'equipment_rate', item.equipment_rate, true)}
                          </td>
                          <td className="px-1 py-0.5">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 rounded hover:bg-red-500/10 text-[color:var(--color-border)] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Create Category Modal */}
      <Modal isOpen={showCreateCategory} onClose={() => setShowCreateCategory(false)} title="New Category" size="sm">
        <div className="space-y-4">
          <Input
            label="Category Name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            placeholder="e.g. Earthworks"
          />
          <Input
            label="Description"
            value={categoryForm.description}
            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            placeholder="Optional description"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateCategory(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} loading={creating} disabled={!categoryForm.name.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Category Modal */}
      <Modal isOpen={!!editingCategory} onClose={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }) }} title="Edit Category" size="sm">
        <div className="space-y-4">
          <Input
            label="Category Name"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            placeholder="e.g. Earthworks"
          />
          <Input
            label="Description"
            value={categoryForm.description}
            onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            placeholder="Optional description"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }) }}>Cancel</Button>
            <Button onClick={handleEditCategory} loading={creating} disabled={!categoryForm.name.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Item Modal */}
      <Modal isOpen={showCreateItem} onClose={() => setShowCreateItem(false)} title="New Library Item" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Code"
              value={itemForm.code}
              onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
              placeholder="e.g. EW-01"
            />
            <div className="col-span-2">
              <Input
                label="Description"
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="e.g. Excavation in ordinary soil"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[color:var(--color-text)]">Unit</label>
              <select
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-amber)]/30"
              >
                {MEASUREMENT_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <Input
              label="Default Rate"
              type="number"
              value={itemForm.default_rate}
              onChange={(e) => setItemForm({ ...itemForm, default_rate: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Material Rate"
              type="number"
              value={itemForm.material_rate}
              onChange={(e) => setItemForm({ ...itemForm, material_rate: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Labor Rate"
              type="number"
              value={itemForm.labor_rate}
              onChange={(e) => setItemForm({ ...itemForm, labor_rate: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Equipment Rate"
              type="number"
              value={itemForm.equipment_rate}
              onChange={(e) => setItemForm({ ...itemForm, equipment_rate: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[color:var(--color-text)]">Notes</label>
            <textarea
              value={itemForm.notes}
              onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-amber)]/30 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateItem(false)}>Cancel</Button>
            <Button onClick={handleCreateItem} loading={creating} disabled={!itemForm.description.trim()}>
              Add Item
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm" size="sm">
        <p className="text-sm text-[color:var(--color-text-secondary)] mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>Confirm</Button>
        </div>
      </Modal>
    </div>
  )
}
