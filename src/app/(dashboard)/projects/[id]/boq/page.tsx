'use client'

import { useEffect, useState, useCallback, useRef, Fragment } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import type { BOQItem } from '@/lib/types'
import { MEASUREMENT_UNITS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { TableSkeleton } from '@/components/ui/skeleton'
import {
  Plus,
  FileSpreadsheet,
  Download,
  Upload,
  FileText,
  Trash2,
  Filter,
  Link2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Copy,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getBOQItems,
  createBOQItem,
  updateBOQItem,
  deleteBOQItem,
  bulkCreateBOQItems,
} from '@/app/actions/boq'
import { getLibraryItems } from '@/app/actions/library'
import type { LibraryItem } from '@/lib/types'
import { getProject } from '@/app/actions/projects'
import { exportBOQToExcel } from '@/lib/export/boq-excel'
import { exportBOQToPDF } from '@/lib/export/boq-pdf'
import { parseBOQExcel } from '@/lib/import/boq-excel'
import type { ImportedBOQRow } from '@/lib/import/boq-excel'

interface EditingCell {
  itemId: string
  field: keyof BOQItem
}

const EDITABLE_FIELDS: (keyof BOQItem)[] = ['code', 'description', 'unit', 'quantity', 'original_quantity', 'revised_quantity', 'unit_rate']

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
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<ImportedBOQRow[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [showLibraryLink, setShowLibraryLink] = useState<string | null>(null)
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryLoaded, setLibraryLoaded] = useState(false)

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
    setError(null)
    try {
      const data = await getBOQItems(projectId)
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load BOQ items')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.description.trim()) return
    setCreating(true)
    setError(null)
    try {
      const result = await createBOQItem({
        project_id: projectId,
        code: form.code || undefined,
        description: form.description,
        unit: form.unit,
        quantity: parseFloat(form.quantity) || 0,
        unit_rate: parseFloat(form.unit_rate) || 0,
        material_rate: parseFloat(form.material_rate) || undefined,
        labor_rate: parseFloat(form.labor_rate) || undefined,
        equipment_rate: parseFloat(form.equipment_rate) || undefined,
        section: form.section || undefined,
        notes: form.notes || undefined,
      })
      if (result.error) {
        setError(result.error)
        setCreating(false)
        return
      }
    } catch (e) {
      console.error('Failed to create BOQ item:', e)
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
    setConfirmAction({
      message: 'Delete this BOQ item?',
      onConfirm: async () => {
        try {
          await deleteBOQItem(id)
        } catch (e) { console.error('Failed to delete BOQ item:', e) }
        load()
      },
    })
  }

  const handleImportFile = async (file: File) => {
    setImportError(null)
    const result = await parseBOQExcel(file)
    if (result.error) {
      setImportError(result.error)
      return
    }
    setImportRows(result.rows)
  }

  const handleImportConfirm = async () => {
    if (importRows.length === 0) return
    setImporting(true)
    const result = await bulkCreateBOQItems(projectId, importRows)
    if (result.error) {
      setImportError(result.error)
      setImporting(false)
      return
    }
    setShowImport(false)
    setImportRows([])
    setImporting(false)
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
    } catch (e) { console.error('Failed to update BOQ item:', e) }

    setEditingCell(null)
  }

  const navigateCell = useCallback((direction: 'next' | 'prev' | 'down' | 'up') => {
    if (!editingCell) return
    const flatItems = items.sort((a, b) => a.sort_order - b.sort_order)
    const itemIdx = flatItems.findIndex(i => i.id === editingCell.itemId)
    const fieldIdx = EDITABLE_FIELDS.indexOf(editingCell.field)
    if (itemIdx === -1 || fieldIdx === -1) return

    let nextItemIdx = itemIdx
    let nextFieldIdx = fieldIdx

    if (direction === 'next') {
      nextFieldIdx++
      if (nextFieldIdx >= EDITABLE_FIELDS.length) {
        nextFieldIdx = 0
        nextItemIdx++
      }
    } else if (direction === 'prev') {
      nextFieldIdx--
      if (nextFieldIdx < 0) {
        nextFieldIdx = EDITABLE_FIELDS.length - 1
        nextItemIdx--
      }
    } else if (direction === 'down') {
      nextItemIdx++
    } else if (direction === 'up') {
      nextItemIdx--
    }

    if (nextItemIdx >= 0 && nextItemIdx < flatItems.length) {
      const nextItem = flatItems[nextItemIdx]
      const nextField = EDITABLE_FIELDS[nextFieldIdx]
      startEdit(nextItem.id, nextField, nextItem[nextField] as string | number | null)
    }
  }, [editingCell, items, startEdit])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit()
      setTimeout(() => navigateCell(e.shiftKey ? 'prev' : 'next'), 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
      setTimeout(() => navigateCell('down'), 0)
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  const handleDuplicate = async (item: BOQItem) => {
    try {
      const result = await createBOQItem({
        project_id: projectId,
        code: item.code ? item.code + ' (copy)' : undefined,
        description: item.description,
        unit: item.unit ?? 'm',
        quantity: item.quantity ?? 0,
        unit_rate: item.unit_rate ?? 0,
        material_rate: item.material_rate ?? undefined,
        labor_rate: item.labor_rate ?? undefined,
        equipment_rate: item.equipment_rate ?? undefined,
        section: item.section ?? undefined,
        notes: item.notes ?? undefined,
      })
      if (!result.error) load()
    } catch (e) { console.error('Failed to duplicate BOQ item:', e) }
  }

  const handleOpenLibraryLink = async (boqItemId: string) => {
    setShowLibraryLink(boqItemId)
    setLibrarySearch('')
    if (!libraryLoaded) {
      const items = await getLibraryItems()
      setLibraryItems(items)
      setLibraryLoaded(true)
    }
  }

  const handleLinkLibraryItem = async (libraryItem: LibraryItem) => {
    if (!showLibraryLink) return
    await updateBOQItem(showLibraryLink, {
      library_item_id: libraryItem.id,
      unit_rate: libraryItem.default_rate ?? undefined,
      material_rate: libraryItem.material_rate ?? undefined,
      labor_rate: libraryItem.labor_rate ?? undefined,
      equipment_rate: libraryItem.equipment_rate ?? undefined,
    })
    setShowLibraryLink(null)
    load()
  }

  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return }
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)
    const dragIdx = sorted.findIndex(i => i.id === dragId)
    const targetIdx = sorted.findIndex(i => i.id === targetId)
    if (dragIdx === -1 || targetIdx === -1) return
    const [moved] = sorted.splice(dragIdx, 1)
    sorted.splice(targetIdx, 0, moved)
    const updates = sorted.map((item, idx) => ({ ...item, sort_order: idx }))
    setItems(updates)
    setDragId(null)
    setDragOverId(null)
    for (const item of updates) {
      if (item.sort_order !== items.find(i => i.id === item.id)?.sort_order) {
        await updateBOQItem(item.id, { sort_order: item.sort_order })
      }
    }
  }

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(section) ? next.delete(section) : next.add(section)
      return next
    })
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
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bill of Quantities</h2>
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
              {!loading && items.length > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200 tabular-nums">{formatCurrency(grandTotal)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allSections.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-slate-400 dark:text-slate-500" />
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-2 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sections</option>
                {allSections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => { setShowImport(true); setImportRows([]); setImportError(null) }}
          >
            <Upload size={16} />
            Import Excel
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const project = await getProject(projectId)
              if (project) {
                await exportBOQToExcel(items, project.name, project.currency, vatPct)
              }
            }}
            disabled={items.length === 0}
          >
            <Download size={16} />
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const project = await getProject(projectId)
              if (project) {
                exportBOQToPDF(items, project.name, project.currency, vatPct)
              }
            }}
            disabled={items.length === 0}
          >
            <FileText size={16} />
            Export PDF
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Add Item
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : error && !loading && items.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-block p-3 rounded-xl bg-red-100 dark:bg-red-900/30 mb-4">
            <FileSpreadsheet size={48} className="text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">Failed to load BOQ items</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            {error}
          </p>
          <Button onClick={load}>
            Try Again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <FileSpreadsheet size={48} className="mx-auto text-slate-300 dark:text-slate-500 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">No BOQ items yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Add items to build your Bill of Quantities.
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Add First Item
          </Button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[calc(100vh-220px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700">
                  <th className="w-[28px]" />
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[80px]">Code</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 min-w-[200px]">Description</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[60px]">Unit</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[90px]">Qty</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[90px]">Orig Qty</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[90px]">Rev Qty</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[80px]">Diff</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[100px]">Unit Rate</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 w-[120px]">Amount</th>
                  <th className="w-[56px]" />
                </tr>
              </thead>
              <tbody>
                {sections.map(([section, sectionItems]) => {
                  const sectionTotal = sectionItems.reduce((sum, i) => sum + (i.total_amount ?? 0), 0)
                  return (
                    <Fragment key={section}>
                      {section && (
                        <tr className="bg-slate-100/80 dark:bg-slate-800/80 cursor-pointer" tabIndex={0} onClick={() => toggleSection(section)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection(section) } }}>
                          <td colSpan={11} className="px-0 py-2.5">
                            <div className="flex items-center gap-2 border-l-[3px] border-blue-500 pl-3 ml-1">
                              {collapsedSections.has(section)
                                ? <ChevronRight size={14} className="text-slate-400" />
                                : <ChevronDown size={14} className="text-slate-400" />
                              }
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                {section}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                                {sectionItems.length} items
                              </span>
                              <span className="ml-auto text-xs tabular-nums font-medium text-slate-500 dark:text-slate-400 pr-3">
                                {formatCurrency(sectionTotal)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {!collapsedSections.has(section) && sectionItems.map((item, idx) => (
                        <tr
                          key={item.id}
                          draggable
                          onDragStart={() => setDragId(item.id)}
                          onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id) }}
                          onDragLeave={() => setDragOverId(null)}
                          onDrop={() => handleDrop(item.id)}
                          onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                          className={cn(
                            'group border-b border-slate-100 dark:border-slate-700/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors',
                            idx % 2 === 1 && 'bg-slate-50/40 dark:bg-slate-800/40',
                            dragId === item.id && 'opacity-40',
                            dragOverId === item.id && dragId !== item.id && 'border-t-2 border-t-blue-500'
                          )}
                        >
                          <td className="px-0.5 py-0.5 w-[28px]">
                            <GripVertical size={14} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity mx-auto" />
                          </td>
                          <td className="px-1 py-0.5">
                            <div className="flex items-center gap-1">
                              {renderCell(item, 'code', item.code)}
                              {item.mi_id && (
                                <span title="Linked measurement item">
                                  <Link2 size={12} className="text-blue-400 dark:text-blue-500 shrink-0" />
                                </span>
                              )}
                            </div>
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
                              item.quantity_difference != null && item.quantity_difference > 0 && 'text-green-600 dark:text-green-400',
                              item.quantity_difference != null && item.quantity_difference < 0 && 'text-red-600 dark:text-red-400'
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
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenLibraryLink(item.id)}
                                className={cn(
                                  'p-1 rounded transition-colors',
                                  item.library_item_id
                                    ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                    : 'text-slate-300 dark:text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                )}
                                title={item.library_item_id ? 'Linked to library' : 'Link to library item'}
                              >
                                <BookOpen size={13} />
                              </button>
                              <button
                                onClick={() => handleDuplicate(item)}
                                className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-300 dark:text-slate-500 hover:text-blue-500 transition-colors"
                                title="Duplicate row"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 dark:text-slate-500 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {section && (
                        <tr className="bg-slate-100/60 dark:bg-slate-800/60 border-b-2 border-slate-200 dark:border-slate-700">
                          <td colSpan={8} className="px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {section} Subtotal
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-sm tabular-nums text-slate-800 dark:text-slate-100">
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
                <tr className="border-t border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/30 dark:bg-slate-900/30">
                  <td />
                  <td className="px-1 py-1">
                    <input
                      placeholder="Code"
                      className="w-full px-2 py-1.5 text-sm rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      placeholder="+ Add item description..."
                      className="w-full px-2 py-1.5 text-sm rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      onKeyDown={async e => {
                        if (e.key === 'Enter' && form.description.trim()) {
                          e.preventDefault()
                          await handleCreate()
                        }
                      }}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <select
                      className="w-full px-1 py-1.5 text-sm rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent focus:border-blue-400 outline-none"
                      value={form.unit}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    >
                      {MEASUREMENT_UNITS.map(u => <option key={u.value} value={u.value}>{u.value}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <input
                      placeholder="0"
                      type="number"
                      className="w-full px-2 py-1.5 text-sm text-right rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800 outline-none tabular-nums placeholder:text-slate-300"
                      value={form.quantity}
                      onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    />
                  </td>
                  <td /><td /><td />
                  <td className="px-1 py-1">
                    <input
                      placeholder="0"
                      type="number"
                      className="w-full px-2 py-1.5 text-sm text-right rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent focus:border-blue-400 focus:bg-white dark:focus:bg-slate-800 outline-none tabular-nums placeholder:text-slate-300"
                      value={form.unit_rate}
                      onChange={e => setForm(f => ({ ...f, unit_rate: e.target.value }))}
                    />
                  </td>
                  <td />
                  <td className="px-1 py-1">
                    {form.description.trim() && (
                      <button
                        onClick={handleCreate}
                        className="p-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                        title="Add item (or press Enter)"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </td>
                </tr>
                <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-900/80">
                  <td colSpan={8} className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wide">
                    Subtotal
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(subtotal)}
                  </td>
                  <td />
                </tr>
                <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800">
                  <td colSpan={7} className="px-4 py-3 text-right font-semibold text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wide">
                    VAT
                  </td>
                  <td className="px-1 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={vatPct}
                        onChange={(e) => setVatPct(parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-sm text-right border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums"
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                    {formatCurrency(vatAmount)}
                  </td>
                  <td />
                </tr>
                <tr className="bg-gradient-to-r from-blue-50 to-blue-100/80 dark:from-blue-900/30 dark:to-blue-800/20 border-t-2 border-blue-300 dark:border-blue-700">
                  <td colSpan={8} className="px-4 py-4 text-right font-bold text-blue-900 dark:text-blue-100 text-base uppercase tracking-wide">
                    Grand Total
                  </td>
                  <td className="px-4 py-4 text-right font-black text-lg text-blue-900 dark:text-blue-100 tabular-nums">
                    {formatCurrency(grandTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>
      )}

      {/* Import Modal */}

      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Import BOQ from Excel" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload an Excel file (.xlsx, .xls) with BOQ data. The importer will auto-detect columns for Code, Description, Unit, Quantity, Rate, and Section.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImportFile(f)
            }}
            className="text-sm text-slate-600 dark:text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100"
          />
          {importError && <p className="text-sm text-red-500">{importError}</p>}
          {importRows.length > 0 && (
            <>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Preview: {importRows.length} items found
              </div>
              <div className="max-h-[300px] overflow-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium text-slate-500">Code</th>
                      <th className="text-left px-2 py-1.5 font-medium text-slate-500">Description</th>
                      <th className="text-left px-2 py-1.5 font-medium text-slate-500">Unit</th>
                      <th className="text-right px-2 py-1.5 font-medium text-slate-500">Qty</th>
                      <th className="text-right px-2 py-1.5 font-medium text-slate-500">Rate</th>
                      <th className="text-left px-2 py-1.5 font-medium text-slate-500">Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 50).map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="px-2 py-1 text-slate-600 dark:text-slate-300">{row.code ?? '-'}</td>
                        <td className="px-2 py-1 text-slate-700 dark:text-slate-200 max-w-[200px] truncate">{row.description}</td>
                        <td className="px-2 py-1 text-slate-500">{row.unit}</td>
                        <td className="px-2 py-1 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.quantity}</td>
                        <td className="px-2 py-1 text-right tabular-nums text-slate-600 dark:text-slate-300">{row.unit_rate}</td>
                        <td className="px-2 py-1 text-slate-500">{row.section ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importRows.length > 50 && (
                  <div className="px-2 py-1.5 text-xs text-slate-400 text-center border-t border-slate-100 dark:border-slate-700">
                    Showing first 50 of {importRows.length} rows
                  </div>
                )}
              </div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowImport(false)}>Cancel</Button>
            <Button
              onClick={handleImportConfirm}
              loading={importing}
              disabled={importRows.length === 0}
            >
              Import {importRows.length} Items
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New BOQ Item" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>Confirm</Button>
        </div>
      </Modal>

      {/* Library Link Modal */}
      <Modal isOpen={!!showLibraryLink} onClose={() => setShowLibraryLink(null)} title="Link Library Item" size="md">
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a library item to apply its rates to this BOQ item.
          </p>
          <input
            type="text"
            placeholder="Search library items..."
            value={librarySearch}
            onChange={e => setLibrarySearch(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg">
            {libraryItems.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No library items found. Add items in the Library page first.</p>
            ) : (
              libraryItems
                .filter(li => {
                  if (!librarySearch.trim()) return true
                  const q = librarySearch.toLowerCase()
                  return (li.description?.toLowerCase().includes(q)) || (li.code?.toLowerCase().includes(q))
                })
                .map(li => (
                  <button
                    key={li.id}
                    onClick={() => handleLinkLibraryItem(li)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {li.code && <span className="text-[10px] font-mono text-slate-400 shrink-0">{li.code}</span>}
                        <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{li.description}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                        <span>{li.unit}</span>
                        {li.default_rate != null && <span>Rate: {li.default_rate}</span>}
                        {li.material_rate != null && <span>Mat: {li.material_rate}</span>}
                        {li.labor_rate != null && <span>Lab: {li.labor_rate}</span>}
                      </div>
                    </div>
                    <BookOpen size={14} className="text-emerald-500 shrink-0 ml-2" />
                  </button>
                ))
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setShowLibraryLink(null)}>Cancel</Button>
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

