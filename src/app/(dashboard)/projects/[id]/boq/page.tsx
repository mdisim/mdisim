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
  Layers,
  DollarSign,
  Hash,
  PieChart,
  Search,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { VirtualTable } from '@/components/ui/virtual-table'
import type { VirtualTableColumn } from '@/components/ui/virtual-table'
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
  const { t } = useI18n()
  const { toast } = useToast()
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
      setError(e instanceof Error ? e.message : t.boq.createError)
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
        toast({ title: t.boq.createError, description: result.error, variant: 'danger' })
        setCreating(false)
        return
      }
    } catch {
      setError(t.boq.createError)
      toast({ title: t.boq.createError, variant: 'danger' })
      setCreating(false)
      return
    }
    setShowCreate(false)
    setForm({ code: '', description: '', unit: 'm', quantity: '', unit_rate: '', material_rate: '', labor_rate: '', equipment_rate: '', section: '', notes: '' })
    setCreating(false)
    toast({ title: t.boq.createSuccess, variant: 'success' })
    load()
  }

  const handleDelete = async (id: string) => {
    setConfirmAction({
      message: t.boq.confirmDeleteItem,
      onConfirm: async () => {
        try {
          await deleteBOQItem(id)
          toast({ title: t.boq.deleteSuccess, variant: 'success' })
        } catch {
          setError(t.boq.deleteError)
          toast({ title: t.boq.deleteError, variant: 'danger' })
        }
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
      toast({ title: t.boq.importErrorToast, description: result.error, variant: 'danger' })
      setImporting(false)
      return
    }
    setShowImport(false)
    setImportRows([])
    setImporting(false)
    toast({ title: t.boq.importSuccess, variant: 'success' })
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
        const qty = updated.quantity ?? 0
        const rate = updated.unit_rate ?? 0
        updated.total_amount = qty * rate
        if (updated.original_quantity != null && updated.revised_quantity != null) {
          updated.quantity_difference = updated.revised_quantity - updated.original_quantity
        }
        return updated
      })
    )

    try {
      await updateBOQItem(itemId, { [field]: val })
    } catch {
      setError(t.boq.updateError)
      toast({ title: t.boq.updateError, variant: 'danger' })
    }

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
      if (result.error) {
        setError(result.error)
        toast({ title: t.boq.duplicateError, description: result.error, variant: 'danger' })
      } else {
        toast({ title: t.boq.duplicateSuccess, variant: 'success' })
        load()
      }
    } catch {
      setError(t.boq.duplicateError)
      toast({ title: t.boq.duplicateError, variant: 'danger' })
    }
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
    toast({ title: t.boq.linkSuccess, variant: 'success' })
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

  const importPreviewColumns: VirtualTableColumn<ImportedBOQRow>[] = [
    { key: 'code', header: <span className="px-2 py-1.5 font-medium text-[color:var(--color-text-secondary)] text-xs">Code</span>, width: '80px', render: (row) => <span className="px-2 py-1 text-xs text-[color:var(--color-text-secondary)]">{row.code ?? '-'}</span> },
    { key: 'description', header: <span className="px-2 py-1.5 font-medium text-[color:var(--color-text-secondary)] text-xs">Description</span>, render: (row) => <span className="px-2 py-1 text-xs text-[color:var(--color-text)] truncate block max-w-[200px]">{row.description}</span> },
    { key: 'unit', header: <span className="px-2 py-1.5 font-medium text-[color:var(--color-text-secondary)] text-xs">Unit</span>, width: '60px', render: (row) => <span className="px-2 py-1 text-xs text-[color:var(--color-text-secondary)]">{row.unit}</span> },
    { key: 'quantity', header: <span className="px-2 py-1.5 font-medium text-[color:var(--color-text-secondary)] text-xs text-end block">Qty</span>, width: '80px', render: (row) => <span className="px-2 py-1 text-xs text-end tabular-nums text-[color:var(--color-text-secondary)] block">{row.quantity}</span> },
    { key: 'unit_rate', header: <span className="px-2 py-1.5 font-medium text-[color:var(--color-text-secondary)] text-xs text-end block">Rate</span>, width: '80px', render: (row) => <span className="px-2 py-1 text-xs text-end tabular-nums text-[color:var(--color-text-secondary)] block">{row.unit_rate}</span> },
    { key: 'section', header: <span className="px-2 py-1.5 font-medium text-[color:var(--color-text-secondary)] text-xs">Section</span>, width: '100px', render: (row) => <span className="px-2 py-1 text-xs text-[color:var(--color-text-secondary)]">{row.section ?? '-'}</span> },
  ]

  const renderCell = (item: BOQItem, field: keyof BOQItem, value: string | number | null, isNumeric = false, readOnly = false) => {
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
          'px-2 py-1.5 cursor-pointer rounded hover:bg-[color:var(--color-amber)]/10 min-h-[32px] flex items-center text-[color:var(--color-text)] transition-colors',
          readOnly && 'cursor-default hover:bg-transparent',
          isNumeric && 'justify-end tabular-nums font-mono text-xs'
        )}
        onClick={() => !readOnly && startEdit(item.id, field, value)}
      >
        {isNumeric && value != null ? formatCurrency(Number(value)) : (value ?? '-')}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[color:var(--color-amber)]/10 flex items-center justify-center">
              <FileSpreadsheet size={16} className="text-[color:var(--color-amber)]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">{t.boq.title}</h1>
          </div>
          <p className="text-sm text-[color:var(--color-text-secondary)] ms-10">
            {items.length > 0 ? `${items.length} ${t.boq.items} · ${allSections.length} ${t.boq.sections}` : t.boq.defaultSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allSections.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-[color:var(--color-text-secondary)]" />
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-amber)]/30"
              >
                <option value="">{t.boq.allSections}</option>
                {allSections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => { setShowImport(true); setImportRows([]); setImportError(null) }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-[color:var(--color-border)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-elevated)] transition-colors"
          >
            <Upload size={14} /> {t.boq.importExcel}
          </button>
          <button
            onClick={async () => {
              try {
                const project = await getProject(projectId)
                if (project) {
                  await exportBOQToExcel(items, project.name, project.currency, vatPct)
                  toast({ title: t.boq.exportSuccess, variant: 'success' })
                }
              } catch (e) {
                const msg = e instanceof Error ? e.message : t.boq.exportError
                setError(msg)
                toast({ title: t.boq.exportError, description: msg, variant: 'danger' })
              }
            }}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-[color:var(--color-border)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-elevated)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} /> {t.boq.exportExcel}
          </button>
          <button
            onClick={async () => {
              try {
                const project = await getProject(projectId)
                if (project) {
                  exportBOQToPDF(items, project.name, project.currency, vatPct)
                  toast({ title: t.boq.exportSuccess, variant: 'success' })
                }
              } catch (e) {
                const msg = e instanceof Error ? e.message : t.boq.exportError
                setError(msg)
                toast({ title: t.boq.exportError, description: msg, variant: 'danger' })
              }
            }}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-[color:var(--color-border)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-elevated)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText size={14} /> {t.boq.exportPdf}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl bg-[color:var(--color-amber)] text-[color:var(--color-on-amber)] hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={14} /> {t.boq.addItem}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">&times;</button>
        </motion.div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-[color:var(--color-surface-elevated)] rounded-2xl border border-[color:var(--color-border)] animate-pulse" />)}
          </div>
          <TableSkeleton rows={8} columns={6} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title={t.boq.noItems}
          description={t.boq.noItemsDesc}
          actionLabel={t.boq.addFirstItem}
          onAction={() => setShowCreate(true)}
        />
      ) : (<>
        {/* KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: t.boq.items, value: items.length, icon: Hash },
            { label: t.boq.sections, value: allSections.length, icon: Layers },
            { label: t.boq.subtotal, value: formatCurrency(subtotal), icon: DollarSign },
            { label: t.boq.grandTotal, value: formatCurrency(grandTotal), icon: PieChart },
          ].map((stat) => (
            <div key={stat.label} className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-[color:var(--color-text-secondary)]">{stat.label}</span>
                <div className="w-7 h-7 rounded-lg bg-[color:var(--color-amber)]/10 flex items-center justify-center">
                  <stat.icon size={14} className="text-[color:var(--color-amber)]" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-[color:var(--color-text)] tabular-nums">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Grand Total Summary */}
        <div className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-widest text-[color:var(--color-text-secondary)]">{t.boq.budgetComposition}</span>
            <span className="text-xs text-[color:var(--color-text-secondary)] tabular-nums">VAT {vatPct}%: {formatCurrency(vatAmount)}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-2 bg-[color:var(--color-border)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[color:var(--color-amber)] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${grandTotal > 0 ? (subtotal / grandTotal) * 100 : 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
            <div className="text-end">
              <div className="text-lg font-bold tabular-nums font-mono text-[color:var(--color-text)]">{formatCurrency(grandTotal)}</div>
              <div className="text-[10px] text-[color:var(--color-text-secondary)] uppercase tracking-wider">{t.boq.grandTotal}</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[color:var(--color-surface-elevated)] rounded-2xl border border-[color:var(--color-border)] overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[color:var(--color-surface)] border-b-2 border-[color:var(--color-border)]">
                  <th className="w-[28px]" />
                  <th className="text-start px-3 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[80px]">{t.boq.colCode}</th>
                  <th className="text-start px-3 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] min-w-[200px]">{t.boq.colDescription}</th>
                  <th className="text-start px-3 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[60px]">{t.boq.colUnit}</th>
                  <th className="text-end px-3 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[90px]">{t.boq.colQty}</th>
                  <th className="text-end px-3 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[90px]">{t.boq.colOrigQty}</th>
                  <th className="text-end px-3 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[90px]">{t.boq.colRevQty}</th>
                  <th className="text-end px-3 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[80px]">{t.boq.colDiff}</th>
                  <th className="text-end px-3 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[100px]">{t.boq.colUnitRate}</th>
                  <th className="text-end px-3 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] w-[120px]">{t.boq.colAmount}</th>
                  <th className="w-[56px]" />
                </tr>
              </thead>
              <tbody>
                {sections.map(([section, sectionItems]) => {
                  const sectionTotal = sectionItems.reduce((sum, i) => sum + (i.total_amount ?? 0), 0)
                  return (
                    <Fragment key={section}>
                      {section && (
                        <tr
                          className="cursor-pointer"
                          tabIndex={0}
                          role="button"
                          aria-expanded={!collapsedSections.has(section)}
                          onClick={() => toggleSection(section)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSection(section) } }}
                        >
                          <td colSpan={11} className="px-0 py-2.5">
                            <div className="flex items-center gap-2 border-s-[3px] border-[color:var(--color-amber)] ps-3 ms-1 bg-[color:var(--color-amber)]/5">
                              {collapsedSections.has(section)
                                ? <ChevronRight size={14} className="text-[color:var(--color-amber)] rtl:rotate-180" aria-hidden="true" />
                                : <ChevronDown size={14} className="text-[color:var(--color-amber)]" aria-hidden="true" />
                              }
                              <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-text)]">
                                {section}
                              </span>
                              <span className="text-[10px] font-mono text-[color:var(--color-text-secondary)] bg-[color:var(--color-surface)]/60 px-1.5 py-0.5 rounded">
                                {sectionItems.length} {t.boq.items}
                              </span>
                              <span className="ms-auto text-xs tabular-nums font-mono font-bold text-[color:var(--color-amber)] pe-3">
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
                            'group border-b border-[color:var(--color-border)]/50 hover:bg-[color:var(--color-amber)]/5 transition-colors',
                            idx % 2 === 1 && 'bg-[color:var(--color-surface)]/30',
                            dragId === item.id && 'opacity-40',
                            dragOverId === item.id && dragId !== item.id && 'border-t-2 border-t-[color:var(--color-amber)]'
                          )}
                        >
                          <td className="px-0.5 py-0.5 w-[28px]">
                            <GripVertical size={14} className="text-[color:var(--color-border)] opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity mx-auto" />
                          </td>
                          <td className="px-1 py-0.5">
                            <div className="flex items-center gap-1">
                              {renderCell(item, 'code', item.code)}
                              {item.mi_id && (
                                <span title={t.boq.linkedMeasurement}>
                                  <Link2 size={12} className="text-[color:var(--color-amber)] shrink-0" aria-label={t.boq.linkedMeasurement} />
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
                              'px-2 py-1.5 text-end tabular-nums font-mono text-xs',
                              item.quantity_difference != null && item.quantity_difference > 0 && 'text-green-400',
                              item.quantity_difference != null && item.quantity_difference < 0 && 'text-red-400'
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
                                    ? 'text-[color:var(--color-amber)] hover:bg-[color:var(--color-amber)]/10'
                                    : 'text-[color:var(--color-border)] hover:text-[color:var(--color-amber)] hover:bg-[color:var(--color-amber)]/10'
                                )}
                                title={item.library_item_id ? t.boq.linkedToLibrary : t.boq.linkToLibraryItem}
                                aria-label={item.library_item_id ? t.boq.linkedToLibrary : t.boq.linkToLibraryItem}
                              >
                                <BookOpen size={13} />
                              </button>
                              <button
                                onClick={() => handleDuplicate(item)}
                                className="p-1 rounded hover:bg-[color:var(--color-amber)]/10 text-[color:var(--color-border)] hover:text-[color:var(--color-amber)] transition-colors"
                                title={t.boq.duplicateRow}
                                aria-label={t.boq.duplicateRow}
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1 rounded hover:bg-red-500/10 text-[color:var(--color-border)] hover:text-red-400 transition-colors"
                                title={t.boq.deleteRow}
                                aria-label={t.boq.deleteRow}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {section && (
                        <tr className="border-b-2 border-[color:var(--color-border)] bg-[color:var(--color-surface)]/60">
                          <td colSpan={8} className="px-3 py-2.5 text-end text-xs font-bold uppercase tracking-wide text-[color:var(--color-text-secondary)]">
                            {t.boq.sectionSubtotal.replace('{section}', section)}
                          </td>
                          <td className="px-3 py-2.5 text-end font-bold text-sm tabular-nums font-mono text-[color:var(--color-text)]">
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
                <tr className="border-t border-dashed border-[color:var(--color-border)] bg-[color:var(--color-surface)]/30">
                  <td />
                  <td className="px-1 py-1">
                    <input
                      placeholder={t.boq.codeLabel}
                      className="w-full px-2 py-1.5 text-sm rounded border border-transparent hover:border-[color:var(--color-border)] bg-transparent focus:border-[color:var(--color-amber)] focus:bg-[color:var(--color-surface-elevated)] outline-none placeholder:text-[color:var(--color-text-secondary)]/50 text-[color:var(--color-text)]"
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      placeholder={t.boq.addItemPlaceholder}
                      className="w-full px-2 py-1.5 text-sm rounded border border-transparent hover:border-[color:var(--color-border)] bg-transparent focus:border-[color:var(--color-amber)] focus:bg-[color:var(--color-surface-elevated)] outline-none placeholder:text-[color:var(--color-text-secondary)]/50 text-[color:var(--color-text)]"
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
                      className="w-full px-1 py-1.5 text-sm rounded border border-transparent hover:border-[color:var(--color-border)] bg-transparent focus:border-[color:var(--color-amber)] outline-none text-[color:var(--color-text)]"
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
                      className="w-full px-2 py-1.5 text-sm text-end rounded border border-transparent hover:border-[color:var(--color-border)] bg-transparent focus:border-[color:var(--color-amber)] focus:bg-[color:var(--color-surface-elevated)] outline-none tabular-nums placeholder:text-[color:var(--color-text-secondary)]/50 text-[color:var(--color-text)]"
                      value={form.quantity}
                      onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    />
                  </td>
                  <td /><td /><td />
                  <td className="px-1 py-1">
                    <input
                      placeholder="0"
                      type="number"
                      className="w-full px-2 py-1.5 text-sm text-end rounded border border-transparent hover:border-[color:var(--color-border)] bg-transparent focus:border-[color:var(--color-amber)] focus:bg-[color:var(--color-surface-elevated)] outline-none tabular-nums placeholder:text-[color:var(--color-text-secondary)]/50 text-[color:var(--color-text)]"
                      value={form.unit_rate}
                      onChange={e => setForm(f => ({ ...f, unit_rate: e.target.value }))}
                    />
                  </td>
                  <td />
                  <td className="px-1 py-1">
                    {form.description.trim() && (
                      <button
                        onClick={handleCreate}
                        className="p-1.5 rounded bg-[color:var(--color-amber)] hover:opacity-90 text-[color:var(--color-on-amber)] transition-opacity"
                        title={t.boq.addItemButton}
                        aria-label={t.boq.addItemButton}
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </td>
                </tr>
                <tr className="border-t-2 border-[color:var(--color-border)] bg-[color:var(--color-surface)]/60">
                  <td colSpan={8} className="px-4 py-3 text-end font-semibold text-[color:var(--color-text-secondary)] text-sm uppercase tracking-wide">
                    {t.boq.subtotal}
                  </td>
                  <td className="px-4 py-3 text-end font-bold font-mono text-[color:var(--color-text)] tabular-nums">
                    {formatCurrency(subtotal)}
                  </td>
                  <td />
                </tr>
                <tr className="bg-[color:var(--color-surface)]/60 border-t border-[color:var(--color-border)]/50">
                  <td colSpan={7} className="px-4 py-3 text-end font-semibold text-[color:var(--color-text-secondary)] text-sm uppercase tracking-wide">
                    {t.boq.vat}
                  </td>
                  <td className="px-1 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={vatPct}
                        onChange={(e) => setVatPct(parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-sm text-end border border-[color:var(--color-border)] rounded bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-amber)] tabular-nums"
                      />
                      <span className="text-xs text-[color:var(--color-text-secondary)]">%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-end font-semibold font-mono text-[color:var(--color-text)] tabular-nums">
                    {formatCurrency(vatAmount)}
                  </td>
                  <td />
                </tr>
                <tr className="bg-[color:var(--color-amber)]/5 border-t-2 border-[color:var(--color-amber)]/30">
                  <td colSpan={8} className="px-4 py-4 text-end font-bold text-[color:var(--color-amber)] text-base uppercase tracking-wide">
                    {t.boq.grandTotal}
                  </td>
                  <td className="px-4 py-4 text-end font-black text-lg font-mono text-[color:var(--color-amber)] tabular-nums">
                    {formatCurrency(grandTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </>)}

      {/* Import Modal */}
      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title={t.boq.importTitle} size="lg">
        <div className="space-y-4">
          <p className="text-sm text-[color:var(--color-text-secondary)]">
            {t.boq.importDesc}
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImportFile(f)
            }}
            className="text-sm text-[color:var(--color-text-secondary)] file:me-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[color:var(--color-amber)]/10 file:text-[color:var(--color-amber)] hover:file:bg-[color:var(--color-amber)]/20"
          />
          {importError && <p className="text-sm text-red-400">{importError}</p>}
          {importRows.length > 0 && (
            <>
              <div className="text-sm font-medium text-[color:var(--color-text)]">
                {t.boq.importPreview.replace('{count}', String(importRows.length))}
              </div>
              <div className="border border-[color:var(--color-border)] rounded-lg overflow-hidden">
                <VirtualTable<ImportedBOQRow>
                  columns={importPreviewColumns}
                  data={importRows}
                  rowHeight={32}
                  height={Math.min(300, importRows.length * 32 + 4)}
                  headerClassName="bg-[color:var(--color-surface)] text-xs"
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowImport(false)}>{t.common.cancel}</Button>
            <Button
              onClick={handleImportConfirm}
              loading={importing}
              disabled={importRows.length === 0}
            >
              {t.boq.importItems.replace('{count}', String(importRows.length))}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t.boq.newItemTitle} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={t.boq.codeLabel}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. 01.01"
            />
            <div className="col-span-2">
              <Input
                label={t.boq.descriptionLabel}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Excavation for foundations"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[color:var(--color-text)]">{t.boq.unitLabel}</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-amber)]/30"
              >
                {MEASUREMENT_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            <Input
              label={t.boq.quantityLabel}
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label={t.boq.unitRateLabel}
              type="number"
              value={form.unit_rate}
              onChange={(e) => setForm({ ...form, unit_rate: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={t.boq.materialRateLabel}
              type="number"
              value={form.material_rate}
              onChange={(e) => setForm({ ...form, material_rate: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label={t.boq.laborRateLabel}
              type="number"
              value={form.labor_rate}
              onChange={(e) => setForm({ ...form, labor_rate: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label={t.boq.equipmentRateLabel}
              type="number"
              value={form.equipment_rate}
              onChange={(e) => setForm({ ...form, equipment_rate: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <Input
            label={t.boq.sectionLabel}
            value={form.section}
            onChange={(e) => setForm({ ...form, section: e.target.value })}
            placeholder="e.g. Substructure"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[color:var(--color-text)]">{t.boq.notesLabel}</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-amber)]/30 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>{t.common.cancel}</Button>
            <Button onClick={handleCreate} loading={creating} disabled={!form.description.trim()}>
              {t.boq.addItem}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={t.boq.confirmTitle} size="sm">
        <p className="text-sm text-[color:var(--color-text-secondary)] mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>{t.common.cancel}</Button>
          <Button variant="danger" onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>{t.common.confirm}</Button>
        </div>
      </Modal>

      {/* Library Link Modal */}
      <Modal isOpen={!!showLibraryLink} onClose={() => setShowLibraryLink(null)} title={t.boq.linkLibraryItemTitle} size="md">
        <div className="space-y-3">
          <p className="text-xs text-[color:var(--color-text-secondary)]">
            {t.boq.linkLibraryItemDesc}
          </p>
          <input
            type="text"
            placeholder={t.boq.searchLibraryItems}
            value={librarySearch}
            onChange={e => setLibrarySearch(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-amber)]/30"
            autoFocus
          />
          <div className="max-h-[300px] overflow-y-auto divide-y divide-[color:var(--color-border)]/50 border border-[color:var(--color-border)] rounded-lg">
            {libraryItems.length === 0 ? (
              <p className="text-xs text-[color:var(--color-text-secondary)] text-center py-8">{t.boq.noLibraryItemsFound}</p>
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
                    className="w-full flex items-center justify-between px-3 py-2.5 text-start hover:bg-[color:var(--color-amber)]/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {li.code && <span className="text-[10px] font-mono text-[color:var(--color-text-secondary)] shrink-0">{li.code}</span>}
                        <span className="text-sm text-[color:var(--color-text)] truncate">{li.description}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-[color:var(--color-text-secondary)] mt-0.5">
                        <span>{li.unit}</span>
                        {li.default_rate != null && <span>{t.boq.rateLabel}: {li.default_rate}</span>}
                        {li.material_rate != null && <span>{t.boq.materialLabel}: {li.material_rate}</span>}
                        {li.labor_rate != null && <span>{t.boq.laborLabel}: {li.labor_rate}</span>}
                      </div>
                    </div>
                    <BookOpen size={14} className="text-[color:var(--color-amber)] shrink-0 ms-2" />
                  </button>
                ))
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setShowLibraryLink(null)}>{t.common.cancel}</Button>
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
