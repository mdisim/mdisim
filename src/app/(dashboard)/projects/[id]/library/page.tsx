'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import type { LibraryCategory, LibraryItem } from '@/lib/types'
import { MEASUREMENT_UNITS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  Plus,
  BookOpen,
  Trash2,
  Pencil,
  FolderOpen,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getLibraryCategories,
  createLibraryCategory,
  getLibraryItems,
  createLibraryItem,
  updateLibraryItem,
  deleteLibraryItem,
  deleteLibraryCategory,
} from '@/app/actions/library'

interface EditingCell {
  itemId: string
  field: keyof LibraryItem
}

export default function LibraryPage() {
  const { id: projectId } = useParams<{ id: string }>()
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
    const data = await getLibraryCategories()
    setCategories(data)
    setLoading(false)
  }, [])

  const loadItems = useCallback(async (categoryId: string) => {
    setLoadingItems(true)
    const data = await getLibraryItems(categoryId)
    setItems(data)
    setLoadingItems(false)
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

  const handleDeleteCategory = async (id: string) => {
    setConfirmAction({
      message: 'Delete this category and all its items?',
      onConfirm: async () => {
        try { await deleteLibraryCategory(id) } catch { /* ignore */ }
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
        try { await deleteLibraryItem(id) } catch { /* ignore */ }
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
      await updateLibraryItem(itemId, { [field]: val })
    } catch { /* ignore */ }

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
          className="w-full px-2 py-1 text-sm border border-blue-400 rounded bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
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
          'px-2 py-1.5 cursor-pointer rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 min-h-[32px] flex items-center',
          isNumeric && 'justify-end tabular-nums'
        )}
        onClick={() => startEdit(item.id, field, value)}
      >
        {isNumeric && value != null ? formatRate(Number(value)) : (value ?? '-')}
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="md:hidden fixed top-[130px] left-2 z-30 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
        aria-label="Toggle categories sidebar"
      >
        <Menu size={18} />
      </button>
      {/* Left panel — Categories */}
      <div className={cn('border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col shrink-0', sidebarOpen ? 'w-[300px]' : 'hidden', 'md:block md:w-[300px]')}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Categories</h3>
          <button
            onClick={() => setShowCreateCategory(true)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Add category"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
              No categories yet
            </div>
          ) : (
            <div className="py-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={cn(
                    'group flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors',
                    selectedCategory === cat.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-600 dark:border-blue-400'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                  )}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <FolderOpen size={16} className={cn(
                    selectedCategory === cat.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cat.name}</p>
                    {cat.description && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{cat.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingCategory(cat)
                      }}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCategory(cat.id)
                      }}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-slate-500 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — Items */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {selectedCategoryData?.name ?? 'Select a Category'}
            </h2>
            {selectedCategoryData?.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{selectedCategoryData.description}</p>
            )}
          </div>
          {selectedCategory && (
            <Button onClick={() => setShowCreateItem(true)} size="sm">
              <Plus size={16} />
              Add Item
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {!selectedCategory ? (
            <div className="text-center py-20">
              <BookOpen size={48} className="mx-auto text-slate-300 dark:text-slate-500 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">Pricing Library</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Select a category to view and manage rate items.
              </p>
            </div>
          ) : loadingItems ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen size={48} className="mx-auto text-slate-300 dark:text-slate-500 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">No items in this category</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Add rate items to build your pricing catalog.
              </p>
              <Button onClick={() => setShowCreateItem(true)}>
                <Plus size={16} />
                Add First Item
              </Button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[80px]">Code</th>
                      <th className="text-left px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[200px]">Description</th>
                      <th className="text-left px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[60px]">Unit</th>
                      <th className="text-right px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[100px]">Rate</th>
                      <th className="text-right px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[100px]">Material</th>
                      <th className="text-right px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[100px]">Labor</th>
                      <th className="text-right px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[100px]">Equipment</th>
                      <th className="w-[40px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group"
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
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 dark:text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
            </div>
          )}
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
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateCategory(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} loading={creating} disabled={!categoryForm.name.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Item Modal */}
      <Modal isOpen={showCreateItem} onClose={() => setShowCreateItem(false)} title="New Library Item" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
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
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Unit</label>
              <select
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="grid grid-cols-3 gap-4">
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
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Notes</label>
            <textarea
              value={itemForm.notes}
              onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateItem(false)}>Cancel</Button>
            <Button onClick={handleCreateItem} loading={creating} disabled={!itemForm.description.trim()}>
              Add Item
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>Confirm</Button>
        </div>
      </Modal>
    </div>
  )
}
