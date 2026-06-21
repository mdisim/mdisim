'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { GripVertical, Clipboard, Plus, Layers, Undo2, Redo2, Download, Upload, ClipboardPaste, ChevronDown, ChevronRight, ChevronUp, Copy, Trash2, Pencil, Save, FolderOpen } from 'lucide-react'
import { updateBOQItem, createBOQItem, deleteBOQItem, bulkCreateBOQItems } from '@/app/actions/boq-spreadsheet'
import ExcelImportModal from '@/components/boq/excel-import-modal'
import { SaveTemplateModal, LoadTemplateModal } from '@/components/boq/template-modal'
import { useTranslation } from '@/lib/i18n/use-translation'

interface BOQItem {
  id: string
  project_id: string
  item_code: string | null
  description: string | null
  unit: string | null
  quantity: number | null
  unit_rate: number | null
  total_amount: number | null
  vat_percent: number | null
  vat_amount: number | null
  is_section_header: boolean | null
  sort_order: number | null
  category: string | null
  notes: string | null
}

interface HistoryEntry {
  type: 'update' | 'create' | 'delete' | 'move' | 'batch'
  itemId: string
  previousData: Partial<BOQItem>
  newData: Partial<BOQItem>
}

interface LibraryInsertItem {
  id: string
  item_code: string
  description: string
  unit: string
  unit_rate: number
  category?: string | null
}

interface ContextMenuState {
  x: number
  y: number
  itemId: string
}

const UNIT_OPTIONS = ['m', 'm²', 'm³', 'kg', 't', 'nr', 'ls', 'hr', 'day']
const TAB_FIELDS = ['item_code', 'description', 'unit', 'quantity', 'unit_rate', 'vat_percent']

type ItemData = {
  item_code?: string | null
  description?: string | null
  unit?: string | null
  quantity?: number | null
  unit_rate?: number | null
  total_amount?: number | null
  vat_percent?: number | null
  vat_amount?: number | null
  is_section_header?: boolean
  sort_order?: number
  category?: string | null
  notes?: string | null
}

function toItemData(d: Partial<BOQItem>): ItemData {
  return {
    item_code: d.item_code,
    description: d.description,
    unit: d.unit,
    quantity: d.quantity,
    unit_rate: d.unit_rate,
    total_amount: d.total_amount,
    vat_percent: d.vat_percent,
    vat_amount: d.vat_amount,
    is_section_header: d.is_section_header ?? undefined,
    sort_order: d.sort_order ?? undefined,
    category: d.category,
    notes: d.notes,
  }
}

function evaluateFormula(expr: string, row: BOQItem): number | null {
  const cleaned = expr.slice(1).trim()
  const withValues = cleaned
    .replace(/\bquantity\b/g, String(row.quantity ?? 0))
    .replace(/\bunit_rate\b/g, String(row.unit_rate ?? 0))
    .replace(/\btotal_amount\b/g, String(row.total_amount ?? 0))
  if (!/^[\d\s+\-*/().]+$/.test(withValues)) return null
  try {
    return Function(`"use strict"; return (${withValues})`)() as number
  } catch {
    return null
  }
}

function fmt(n: number | null | undefined) {
  if (n == null) return ''
  return n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseClipboardData(text: string): Partial<BOQItem>[] {
  const rows = text.trim().split('\n')
  const firstRow = rows[0].split('\t')
  const hasHeader = isNaN(Number(firstRow[0])) && firstRow.some(c => /description|item|qty/i.test(c))
  const dataRows = hasHeader ? rows.slice(1) : rows
  return dataRows
    .filter(r => r.trim())
    .map(row => {
      const cols = row.split('\t')
      return {
        item_code:    cols[0]?.trim() || null,
        description:  cols[1]?.trim() || cols[0]?.trim() || '',
        unit:         cols[2]?.trim() || 'm²',
        quantity:     parseFloat(cols[3]) || 0,
        unit_rate:    parseFloat(cols[4]) || 0,
        total_amount: parseFloat(cols[5]) || (parseFloat(cols[3]) * parseFloat(cols[4])) || 0,
        category:     cols[6]?.trim() || null,
        notes:        cols[7]?.trim() || null,
      }
    })
}

function exportToExcel(items: BOQItem[], projectName: string) {
  const rows = items.map(item => ({
    'Item Code': item.item_code ?? '',
    'Description': item.description ?? '',
    'Unit': item.unit ?? '',
    'Quantity': item.quantity ?? 0,
    'Unit Rate (₪)': item.unit_rate ?? 0,
    'Total (₪)': item.total_amount ?? 0,
    'VAT %': item.vat_percent ?? 0,
    'VAT Amount (₪)': item.vat_amount ?? 0,
    'Net Total (₪)': (item.total_amount ?? 0) + (item.vat_amount ?? 0),
    'Category': item.category ?? '',
    'Notes': item.notes ?? '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    {wch: 12}, {wch: 40}, {wch: 8}, {wch: 10}, {wch: 12},
    {wch: 12}, {wch: 8}, {wch: 12}, {wch: 12}, {wch: 15}, {wch: 20}
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'BOQ')
  XLSX.writeFile(wb, `BOQ_${projectName}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ─── Context Menu ─────────────────────────────────────────────────────────────
function BOQContextMenu({
  menu,
  onEdit,
  onDuplicate,
  onInsertAbove,
  onInsertBelow,
  onDelete,
  onClose,
}: {
  menu: ContextMenuState
  onEdit: () => void
  onDuplicate: () => void
  onInsertAbove: () => void
  onInsertBelow: () => void
  onDelete: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const handler = () => onClose()
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [onClose])

  return (
    <div
      className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 min-w-[180px] text-sm"
      style={{ top: menu.y, left: menu.x }}
      onClick={e => e.stopPropagation()}
    >
      <button onClick={onEdit} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700">
        <Pencil size={14} /> Edit
      </button>
      <button onClick={onDuplicate} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700">
        <Copy size={14} /> Duplicate
      </button>
      <button onClick={onInsertAbove} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700">
        <Plus size={14} /> Insert Above
      </button>
      <button onClick={onInsertBelow} className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700">
        <Plus size={14} /> Insert Below
      </button>
      <div className="border-t border-slate-100 my-1" />
      <button onClick={onDelete} className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2.5">
        <Trash2 size={14} /> Delete
      </button>
    </div>
  )
}

interface BOQSpreadsheetProps {
  initialItems: BOQItem[]
  projectId: string
  projectName: string
  onInsertFromLibrary?: (handler: (item: LibraryInsertItem) => Promise<void>) => void
}

export default function BOQSpreadsheet({ initialItems, projectId, projectName, onInsertFromLibrary }: BOQSpreadsheetProps) {
  const { t } = useTranslation()
  const [items, setItems] = useState<BOQItem[]>(initialItems)
  const [editCell, setEditCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [rowError, setRowError] = useState<string | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [showLoadTemplate, setShowLoadTemplate] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pastePreview, setPastePreview] = useState<Partial<BOQItem>[]>([])

  // Feature 1: Undo/Redo
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Feature 2: Keyboard navigation
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; field: string } | null>(null)

  // Feature 3: Multi-row selection
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const lastSelectedRowRef = useRef<string | null>(null)

  // Feature 4: Drag-and-drop
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null)
  const draggingRowRef = useRef<string | null>(null)

  // Feature 6: Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  // Collapsible sections
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // Toast notification
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Internal clipboard for copy/paste
  const clipboardRef = useRef<BOQItem[]>([])

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sortedItems = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  // Register library insert handler
  useEffect(() => {
    if (!onInsertFromLibrary) return
    onInsertFromLibrary(async (libItem: LibraryInsertItem) => {
      const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), 0)
      const result = await createBOQItem(projectId, {
        item_code: libItem.item_code,
        description: libItem.description,
        unit: libItem.unit,
        quantity: 1,
        unit_rate: libItem.unit_rate,
        total_amount: libItem.unit_rate,
        vat_percent: 17,
        vat_amount: libItem.unit_rate * 0.17,
        category: libItem.category ?? null,
        notes: null,
        is_section_header: false,
        sort_order: maxOrder + 1,
      })
      if (result.success) {
        const newItem = result.data as unknown as BOQItem
        setItems(prev => [...prev, newItem])
        pushHistory({ type: 'create', itemId: newItem.id, previousData: {}, newData: newItem })
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onInsertFromLibrary])

  // ─── History helpers ───────────────────────────────────────────────────────

  const pushHistory = useCallback((entry: HistoryEntry) => {
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1)
      return [...trimmed, entry].slice(-50)
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [historyIndex])

  // ─── Toast helper ──────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }, [])

  // ─── Undo / Redo ──────────────────────────────────────────────────────────

  const undo = useCallback(async () => {
    if (historyIndex < 0) return
    const entry = history[historyIndex]
    setHistoryIndex(prev => prev - 1)
    if (entry.type === 'create') {
      await deleteBOQItem(entry.itemId)
      setItems(prev => prev.filter(i => i.id !== entry.itemId))
    } else if (entry.type === 'delete') {
      const result = await createBOQItem(projectId, toItemData(entry.previousData))
      if (result.success) setItems(prev => [...prev, result.data as unknown as BOQItem])
    } else {
      setItems(prev => prev.map(i => i.id === entry.itemId ? { ...i, ...entry.previousData } : i))
      await updateBOQItem(entry.itemId, toItemData(entry.previousData))
    }
  }, [historyIndex, history, projectId])

  const redo = useCallback(async () => {
    if (historyIndex >= history.length - 1) return
    const entry = history[historyIndex + 1]
    setHistoryIndex(prev => prev + 1)
    if (entry.type === 'delete') {
      await deleteBOQItem(entry.itemId)
      setItems(prev => prev.filter(i => i.id !== entry.itemId))
    } else if (entry.type === 'create') {
      const result = await createBOQItem(projectId, toItemData(entry.newData))
      if (result.success) setItems(prev => [...prev, result.data as unknown as BOQItem])
    } else {
      setItems(prev => prev.map(i => i.id === entry.itemId ? { ...i, ...entry.newData } : i))
      await updateBOQItem(entry.itemId, toItemData(entry.newData))
    }
  }, [historyIndex, history, projectId])

  // ─── Fill Down (Ctrl+D) ────────────────────────────────────────────────────

  const handleFillDown = useCallback(async () => {
    if (selectedRows.size < 2) return
    const ordered = sortedItems.filter(i => selectedRows.has(i.id))
    const source = ordered[0]
    const targets = ordered.slice(1)
    const fillFields: Array<keyof BOQItem> = editCell
      ? [editCell.field as keyof BOQItem]
      : ['description', 'unit', 'unit_rate', 'vat_percent']

    for (const target of targets) {
      const updates: Partial<BOQItem> = {}
      for (const f of fillFields) {
        ;(updates as Record<string, unknown>)[f as string] = source[f] as unknown
      }
      // recalculate totals if needed
      const qty = ('quantity' in updates ? updates.quantity : target.quantity) ?? 0
      const rate = ('unit_rate' in updates ? updates.unit_rate : target.unit_rate) ?? 0
      const vatPct = ('vat_percent' in updates ? updates.vat_percent : target.vat_percent) ?? 0
      if (fillFields.includes('unit_rate') || fillFields.includes('quantity')) {
        updates.total_amount = qty * rate
        updates.vat_amount = updates.total_amount * vatPct / 100
      } else if (fillFields.includes('vat_percent')) {
        const total = target.total_amount ?? 0
        updates.vat_amount = total * vatPct / 100
      }
      setItems(prev => prev.map(i => i.id === target.id ? { ...i, ...updates } : i))
      await updateBOQItem(target.id, updates as ItemData)
    }
    pushHistory({ type: 'batch', itemId: source.id, previousData: {}, newData: {} })
    showToast(`Filled ${targets.length} rows`)
  }, [selectedRows, sortedItems, editCell, pushHistory, showToast])

  // ─── Copy/Paste ranges ─────────────────────────────────────────────────────

  const handleCopyRows = useCallback(() => {
    if (selectedRows.size === 0) return
    const ordered = sortedItems.filter(i => selectedRows.has(i.id))
    clipboardRef.current = ordered
    const tsv = ordered.map(i => [
      i.item_code ?? '',
      i.description ?? '',
      i.unit ?? '',
      String(i.quantity ?? ''),
      String(i.unit_rate ?? ''),
      String(i.vat_percent ?? ''),
    ].join('\t')).join('\n')
    void navigator.clipboard.writeText(tsv)
    showToast(`Copied ${ordered.length} rows`)
  }, [selectedRows, sortedItems, showToast])

  const handlePasteRows = useCallback(async () => {
    let sources: BOQItem[] = []
    if (clipboardRef.current.length > 0) {
      sources = clipboardRef.current
    } else {
      try {
        const text = await navigator.clipboard.readText()
        if (!text.trim()) return
        const parsed = parseClipboardData(text)
        sources = parsed.map((p, i) => ({
          id: `temp-${i}`,
          project_id: projectId,
          item_code: p.item_code ?? null,
          description: p.description ?? null,
          unit: p.unit ?? null,
          quantity: p.quantity ?? null,
          unit_rate: p.unit_rate ?? null,
          total_amount: p.total_amount ?? null,
          vat_percent: null,
          vat_amount: null,
          is_section_header: null,
          sort_order: null,
          category: p.category ?? null,
          notes: p.notes ?? null,
        }))
      } catch {
        return
      }
    }
    if (sources.length === 0) return

    // Determine insert position
    const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const anchorId = selectedCell?.rowId ?? (sorted[sorted.length - 1]?.id ?? null)
    const anchorIdx = anchorId ? sorted.findIndex(i => i.id === anchorId) : sorted.length - 1
    const baseOrder = sorted[anchorIdx]?.sort_order ?? sorted.length

    let created = 0
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i]
      const result = await createBOQItem(projectId, {
        item_code: src.item_code,
        description: src.description,
        unit: src.unit,
        quantity: src.quantity,
        unit_rate: src.unit_rate,
        total_amount: src.total_amount,
        vat_percent: src.vat_percent,
        vat_amount: src.vat_amount,
        is_section_header: false,
        sort_order: baseOrder + i + 0.5,
      })
      if (result.success) {
        const newItem = result.data as unknown as BOQItem
        setItems(prev => [...prev, newItem])
        pushHistory({ type: 'create', itemId: newItem.id, previousData: {}, newData: newItem })
        created++
      }
    }
    showToast(`Pasted ${created} rows`)
  }, [items, selectedCell, projectId, pushHistory, showToast])

  // ─── Global keyboard shortcuts ────────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        void undo()
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault()
        void redo()
      } else if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        void handleFillDown()
      } else if (e.ctrlKey && e.key === 'c' && selectedRows.size > 0) {
        e.preventDefault()
        handleCopyRows()
      } else if (e.ctrlKey && e.key === 'v') {
        e.preventDefault()
        void handlePasteRows()
      } else if (!editCell && selectedCell) {
        const nonHeaderItems = sortedItems.filter(i => !i.is_section_header)
        const rowIdx = nonHeaderItems.findIndex(i => i.id === selectedCell.rowId)
        if (e.key === 'ArrowDown' && rowIdx < nonHeaderItems.length - 1) {
          setSelectedCell({ rowId: nonHeaderItems[rowIdx + 1].id, field: selectedCell.field })
        } else if (e.key === 'ArrowUp' && rowIdx > 0) {
          setSelectedCell({ rowId: nonHeaderItems[rowIdx - 1].id, field: selectedCell.field })
        } else if (e.key === 'F2') {
          e.preventDefault()
          const item = nonHeaderItems[rowIdx]
          if (item) startEdit(item, selectedCell.field, String(item[selectedCell.field as keyof BOQItem] ?? ''))
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && rowIdx >= 0) {
          e.preventDefault()
          const item = nonHeaderItems[rowIdx]
          if (item) {
            const prev: Partial<BOQItem> = { [selectedCell.field]: item[selectedCell.field as keyof BOQItem] as never }
            const newVal: Partial<BOQItem> = { [selectedCell.field]: null }
            pushHistory({ type: 'update', itemId: item.id, previousData: prev, newData: newVal })
            setItems(p => p.map(i => i.id === item.id ? { ...i, ...newVal } : i))
            void updateBOQItem(item.id, toItemData(newVal))
          }
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [undo, redo, editCell, selectedCell, sortedItems, pushHistory, handleFillDown, handleCopyRows, handlePasteRows, selectedRows])

  // ─── Edit helpers ──────────────────────────────────────────────────────────

  function startEdit(item: BOQItem, field: string, currentVal: string) {
    setEditCell({ id: item.id, field })
    setEditValue(currentVal)
    setSelectedCell({ rowId: item.id, field })
  }

  function cancelEdit() {
    setEditCell(null)
    setEditValue('')
  }

  async function commitEdit(id: string, field: string, rawValue: string) {
    setEditCell(null)
    const item = items.find(i => i.id === id)
    if (!item) return

    let value: string | number | null = rawValue
    const numFields = ['quantity', 'unit_rate', 'total_amount', 'vat_percent', 'vat_amount']
    // Formula evaluation for quantity and unit_rate
    if (rawValue.startsWith('=') && (field === 'quantity' || field === 'unit_rate')) {
      const result = evaluateFormula(rawValue, item)
      if (result !== null) {
        value = result
        showToast(`Formula evaluated: ${result}`)
      } else {
        value = 0
      }
    } else if (numFields.includes(field)) {
      value = parseFloat(rawValue) || 0
    }

    type UpdateData = {
      item_code?: string | null
      description?: string | null
      unit?: string | null
      quantity?: number | null
      unit_rate?: number | null
      total_amount?: number | null
      vat_percent?: number | null
      vat_amount?: number | null
      is_section_header?: boolean
      sort_order?: number
      category?: string | null
      notes?: string | null
    }
    const updates: UpdateData = { [field]: value }
    const qty = field === 'quantity' ? (value as number) : (item.quantity ?? 0)
    const rate = field === 'unit_rate' ? (value as number) : (item.unit_rate ?? 0)
    const total = qty * rate
    const vatPct = field === 'vat_percent' ? (value as number) : (item.vat_percent ?? 0)
    const vatAmt = total * vatPct / 100

    if (field === 'quantity' || field === 'unit_rate') {
      updates.total_amount = total
      updates.vat_amount = vatAmt
    }
    if (field === 'vat_percent') {
      updates.vat_amount = vatAmt
    }

    const previousData: Partial<BOQItem> = { [field]: item[field as keyof BOQItem] as never }
    pushHistory({ type: 'update', itemId: id, previousData, newData: updates })

    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const result = await updateBOQItem(id, updates)
      if (!result.success) { setSaveStatus('error'); return }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 800)
  }

  function handleKeyDown(e: React.KeyboardEvent, id: string, field: string) {
    if (e.key === 'Escape') { cancelEdit(); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      void commitEdit(id, field, editValue)
      // Move to same field in next row
      const nonHeaderItems = sortedItems.filter(i => !i.is_section_header)
      const rowIdx = nonHeaderItems.findIndex(i => i.id === id)
      if (rowIdx < nonHeaderItems.length - 1) {
        const next = nonHeaderItems[rowIdx + 1]
        setTimeout(() => startEdit(next, field, String(next[field as keyof BOQItem] ?? '')), 0)
      }
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      void commitEdit(id, field, editValue)
      const fieldIdx = TAB_FIELDS.indexOf(field)
      const nonHeaderItems = sortedItems.filter(i => !i.is_section_header)
      const rowIdx = nonHeaderItems.findIndex(i => i.id === id)
      if (e.shiftKey) {
        if (fieldIdx > 0) {
          const prevField = TAB_FIELDS[fieldIdx - 1]
          setTimeout(() => startEdit(nonHeaderItems[rowIdx], prevField, String(nonHeaderItems[rowIdx][prevField as keyof BOQItem] ?? '')), 0)
        } else if (rowIdx > 0) {
          const prevRow = nonHeaderItems[rowIdx - 1]
          const lastField = TAB_FIELDS[TAB_FIELDS.length - 1]
          setTimeout(() => startEdit(prevRow, lastField, String(prevRow[lastField as keyof BOQItem] ?? '')), 0)
        }
      } else {
        if (fieldIdx < TAB_FIELDS.length - 1) {
          const nextField = TAB_FIELDS[fieldIdx + 1]
          setTimeout(() => startEdit(nonHeaderItems[rowIdx], nextField, String(nonHeaderItems[rowIdx][nextField as keyof BOQItem] ?? '')), 0)
        } else if (rowIdx < nonHeaderItems.length - 1) {
          const nextRow = nonHeaderItems[rowIdx + 1]
          setTimeout(() => startEdit(nextRow, TAB_FIELDS[0], String(nextRow[TAB_FIELDS[0] as keyof BOQItem] ?? '')), 0)
        }
      }
    }
  }

  // ─── Row operations ────────────────────────────────────────────────────────

  async function addRow(isSection = false) {
    setRowError(null)
    const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), 0)
    const result = await createBOQItem(projectId, {
      item_code: '',
      description: isSection ? 'New Section' : 'New Item',
      unit: isSection ? '-' : 'm',
      quantity: 0,
      unit_rate: 0,
      total_amount: 0,
      vat_percent: isSection ? 0 : 17,
      vat_amount: 0,
      is_section_header: isSection,
      sort_order: maxOrder + 1,
    })
    if (!result.success) {
      setRowError(result.error)
      setTimeout(() => setRowError(null), 8000)
      return
    }
    const newItem = result.data as unknown as BOQItem
    setItems(prev => [...prev, newItem])
    pushHistory({ type: 'create', itemId: newItem.id, previousData: {}, newData: newItem })
  }

  async function addRowAt(referenceId: string, position: 'above' | 'below') {
    const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const idx = sorted.findIndex(i => i.id === referenceId)
    const insertIdx = position === 'above' ? idx : idx + 1
    const prevOrder = sorted[insertIdx - 1]?.sort_order ?? -1
    const newOrder = prevOrder + 0.5
    const result = await createBOQItem(projectId, {
      item_code: '',
      description: 'New Item',
      unit: 'm',
      quantity: 0,
      unit_rate: 0,
      total_amount: 0,
      vat_percent: 17,
      vat_amount: 0,
      is_section_header: false,
      sort_order: newOrder,
    })
    if (!result.success) { setRowError(result.error); return }
    const newItem = result.data as unknown as BOQItem
    setItems(prev => [...prev, newItem])
    pushHistory({ type: 'create', itemId: newItem.id, previousData: {}, newData: newItem })
  }

  async function copyRow(item: BOQItem) {
    const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), 0)
    const result = await createBOQItem(projectId, {
      item_code: item.item_code,
      description: item.description ? `${item.description} (copy)` : '',
      unit: item.unit,
      quantity: item.quantity,
      unit_rate: item.unit_rate,
      total_amount: item.total_amount,
      vat_percent: item.vat_percent,
      vat_amount: item.vat_amount,
      category: item.category,
      notes: item.notes,
      sort_order: maxOrder + 1,
    })
    if (result.success) {
      const newItem = result.data as unknown as BOQItem
      setItems(prev => [...prev, newItem])
      pushHistory({ type: 'create', itemId: newItem.id, previousData: {}, newData: newItem })
    }
  }

  async function removeRow(id: string) {
    if (!confirm(t('delete_confirm', 'Delete this item?'))) return
    const item = items.find(i => i.id === id)
    if (!item) return
    const result = await deleteBOQItem(id)
    if (result.success) {
      setItems(prev => prev.filter(i => i.id !== id))
      pushHistory({ type: 'delete', itemId: id, previousData: item, newData: {} })
    } else setRowError(result.error)
  }

  async function moveRow(id: string, direction: 'up' | 'down') {
    const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const idx = sorted.findIndex(i => i.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const a = sorted[idx], b = sorted[swapIdx]
    const aOrder = a.sort_order ?? idx
    const bOrder = b.sort_order ?? swapIdx
    setItems(prev => prev.map(i => {
      if (i.id === a.id) return { ...i, sort_order: bOrder }
      if (i.id === b.id) return { ...i, sort_order: aOrder }
      return i
    }))
    pushHistory({ type: 'move', itemId: id, previousData: { sort_order: aOrder }, newData: { sort_order: bOrder } })
    void updateBOQItem(a.id, { sort_order: bOrder })
    void updateBOQItem(b.id, { sort_order: aOrder })
  }

  // ─── Multi-row selection ───────────────────────────────────────────────────

  function handleRowNumberClick(e: React.MouseEvent, itemId: string) {
    e.stopPropagation()
    const nonHeaderItems = sortedItems.filter(i => !i.is_section_header)
    if (e.shiftKey && lastSelectedRowRef.current) {
      const lastIdx = nonHeaderItems.findIndex(i => i.id === lastSelectedRowRef.current)
      const currIdx = nonHeaderItems.findIndex(i => i.id === itemId)
      const [start, end] = [Math.min(lastIdx, currIdx), Math.max(lastIdx, currIdx)]
      const rangeIds = nonHeaderItems.slice(start, end + 1).map(i => i.id)
      setSelectedRows(prev => {
        const next = new Set(prev)
        rangeIds.forEach(id => next.add(id))
        return next
      })
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedRows(prev => {
        const next = new Set(prev)
        if (next.has(itemId)) next.delete(itemId)
        else next.add(itemId)
        return next
      })
    } else {
      setSelectedRows(new Set([itemId]))
    }
    lastSelectedRowRef.current = itemId
  }

  async function deleteSelectedRows() {
    if (selectedRows.size === 0) return
    if (!confirm(`Delete ${selectedRows.size} selected rows?`)) return
    const ids = Array.from(selectedRows)
    const batchEntries: HistoryEntry[] = ids.map(id => {
      const item = items.find(i => i.id === id)
      return { type: 'delete' as const, itemId: id, previousData: item ?? {}, newData: {} }
    })
    for (const id of ids) {
      await deleteBOQItem(id)
    }
    setItems(prev => prev.filter(i => !selectedRows.has(i.id)))
    setSelectedRows(new Set())
    batchEntries.forEach(e => pushHistory(e))
  }

  // ─── Drag and drop ─────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, itemId: string) => {
    draggingRowRef.current = itemId
    e.dataTransfer.setData('text/plain', itemId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragEnd = useCallback(() => {
    draggingRowRef.current = null
    setDragOverRowId(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, itemId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverRowId(itemId)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = draggingRowRef.current
    setDragOverRowId(null)
    if (!sourceId || sourceId === targetId) return

    setItems(prevItems => {
      const sorted = [...prevItems].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      const sourceIdx = sorted.findIndex(i => i.id === sourceId)
      const targetIdx = sorted.findIndex(i => i.id === targetId)
      if (sourceIdx === -1 || targetIdx === -1) return prevItems
      const reordered = [...sorted]
      const [moved] = reordered.splice(sourceIdx, 1)
      reordered.splice(targetIdx, 0, moved)
      const updated = reordered.map((item, idx) => ({ ...item, sort_order: idx }))
      updated.forEach(item => {
        void updateBOQItem(item.id, { sort_order: item.sort_order ?? 0 })
      })
      return updated
    })
  }, [])

  // ─── Paste modal ───────────────────────────────────────────────────────────

  async function confirmPaste() {
    const result = await bulkCreateBOQItems(projectId, pastePreview.map(p => ({
      item_code: p.item_code ?? null,
      description: p.description ?? null,
      unit: p.unit ?? null,
      quantity: p.quantity ?? null,
      unit_rate: p.unit_rate ?? null,
      total_amount: p.total_amount ?? null,
      category: p.category ?? null,
      notes: p.notes ?? null,
    })))
    if (!result.success) { setRowError(result.error); return }
    setShowPasteModal(false)
    setPasteText('')
    setPastePreview([])
    window.location.reload()
  }

  // ─── Collapsible sections ─────────────────────────────────────────────────

  function toggleSection(sectionId: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  // ─── Totals ────────────────────────────────────────────────────────────────

  const grandTotal = sortedItems.filter(i => !i.is_section_header).reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const vatTotal = sortedItems.filter(i => !i.is_section_header).reduce((s, i) => s + (i.vat_amount ?? 0), 0)
  const netTotal = grandTotal + vatTotal

  // ─── Section grouping ──────────────────────────────────────────────────────

  const sections: { header: BOQItem | null; items: BOQItem[]; key: string }[] = []
  let currentSection: { header: BOQItem | null; items: BOQItem[]; key: string } = { header: null, items: [], key: 'general' }
  for (const item of sortedItems) {
    if (item.is_section_header) {
      if (currentSection.items.length > 0 || currentSection.header) {
        sections.push(currentSection)
      }
      currentSection = { header: item, items: [], key: item.id }
    } else {
      currentSection.items.push(item)
    }
  }
  sections.push(currentSection)

  // ─── Editable cell ─────────────────────────────────────────────────────────

  function EditableCell({ item, field, value, type = 'text', className = '' }: {
    item: BOQItem
    field: string
    value: string | number | null | undefined
    type?: 'text' | 'number'
    className?: string
  }) {
    const isEditing = editCell?.id === item.id && editCell?.field === field
    const displayVal = value == null ? '' : String(value)
    const formulaFields = ['quantity', 'unit_rate']
    const placeholder = formulaFields.includes(field) ? 'e.g. =5*3.5' : ''
    if (isEditing) {
      return (
        <input
          autoFocus
          type="text"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => void commitEdit(item.id, field, editValue)}
          onKeyDown={e => handleKeyDown(e, item.id, field)}
          placeholder={placeholder}
          className={`w-full border border-blue-500 rounded-md px-1 py-0 text-sm outline-none ring-2 ring-blue-500/20 bg-white ${className}`}
        />
      )
    }
    return (
      <span
        onClick={() => startEdit(item, field, displayVal)}
        className={`block w-full min-h-[1.25rem] px-1 cursor-text hover:bg-blue-50 rounded text-sm ${className}`}
      >
        {displayVal}
      </span>
    )
  }

  function UnitCell({ item }: { item: BOQItem }) {
    const isEditing = editCell?.id === item.id && editCell?.field === 'unit'
    if (isEditing) {
      return (
        <select
          autoFocus
          value={editValue}
          onChange={e => { setEditValue(e.target.value); void commitEdit(item.id, 'unit', e.target.value) }}
          onBlur={() => void commitEdit(item.id, 'unit', editValue)}
          className="w-full border border-blue-500 rounded-md px-1 py-0 text-sm outline-none ring-2 ring-blue-500/20 bg-white"
        >
          {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      )
    }
    return (
      <span
        onClick={() => startEdit(item, 'unit', item.unit ?? '')}
        className="block w-full min-h-[1.25rem] px-1 cursor-text hover:bg-blue-50 rounded text-sm"
      >
        {item.unit}
      </span>
    )
  }

  let rowNum = 0

  return (
    <div className="flex flex-col h-full" onClick={() => setSelectedRows(new Set())}>
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-[#0F172A] text-white text-sm shadow-xl rounded-xl px-5 py-2.5 pointer-events-none">
          {toast}
        </div>
      )}
      {/* Main toolbar */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1.5 mb-3 shadow-sm flex-wrap">
        {/* Left group: Row actions */}
        <div className="flex items-center gap-1">
          <button onClick={() => void addRow(false)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
            <Plus size={13} /> {t('add_row', 'Add Row')}
          </button>
          <button onClick={() => void addRow(true)} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 flex items-center gap-1.5">
            <Layers size={13} /> {t('add_section', 'Add Section')}
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => void undo()}
            disabled={historyIndex < 0}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-500"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={() => void redo()}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-500"
          >
            <Redo2 size={15} />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Import/Export */}
        <div className="flex items-center gap-1">
          <button onClick={() => exportToExcel(sortedItems.filter(i => !i.is_section_header), projectName)} className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-100 flex items-center gap-1.5">
            <Download size={13} /> {t('export_excel', 'Export')}
          </button>
          <button onClick={() => setShowImportModal(true)} className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-100 flex items-center gap-1.5">
            <Upload size={13} /> {t('import_excel', 'Import')}
          </button>
          <button onClick={() => setShowPasteModal(true)} className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-100 flex items-center gap-1.5">
            <ClipboardPaste size={13} /> {t('paste_excel', 'Paste')}
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Templates */}
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSaveTemplate(true)} className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-100 flex items-center gap-1.5">
            <Save size={13} /> {t('save_template', 'Save Template')}
          </button>
          <button onClick={() => setShowLoadTemplate(true)} className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-lg hover:bg-slate-100 flex items-center gap-1.5">
            <FolderOpen size={13} /> {t('load_template', 'Load Template')}
          </button>
        </div>

        {/* Right side: save status + item count */}
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="text-slate-400">{sortedItems.filter(i => !i.is_section_header).length} items</span>
          {rowError && <span className="text-red-600 font-medium bg-red-50 border border-red-200 rounded px-2 py-1">{rowError}</span>}
          {saveStatus === 'saving' && <span className="text-slate-500 animate-pulse">{t('saving', 'Saving...')}</span>}
          {saveStatus === 'saved' && <span className="text-green-600 font-medium">{t('saved', 'Saved')} ✓</span>}
          {saveStatus === 'error' && <span className="text-red-600 font-medium">Error saving</span>}
        </div>
      </div>

      {/* Multi-row selection toolbar */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl shadow-sm text-sm" onClick={e => e.stopPropagation()}>
          <span className="font-medium text-blue-800">{selectedRows.size} row{selectedRows.size > 1 ? 's' : ''} selected</span>
          {selectedRows.size >= 2 && (
            <button onClick={() => void handleFillDown()} className="px-2 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs">Fill Down (Ctrl+D)</button>
          )}
          <button onClick={handleCopyRows} className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs flex items-center gap-1">
            <Copy size={12} /> Copy (Ctrl+C)
          </button>
          <button onClick={() => void handlePasteRows()} className="px-2 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-200 text-xs flex items-center gap-1">
            <ClipboardPaste size={12} /> Paste (Ctrl+V)
          </button>
          <button onClick={() => void deleteSelectedRows()} className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs">Delete Selected</button>
          <button onClick={() => setSelectedRows(new Set())} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs">Deselect</button>
        </div>
      )}

      {/* Desktop table view */}
      <div className="hidden md:block overflow-auto border border-slate-200 rounded-xl shadow-md">
        <table className="w-full border-collapse text-sm" style={{ minWidth: 900 }}>
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr className="border-b">
              <th className="w-10 px-2 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider sticky left-0 z-20 bg-slate-50">#</th>
              <th className="w-24 px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider sticky left-10 z-20 bg-slate-50">{t('item_code', 'Item Code')}</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider sticky left-[6.5rem] z-20 bg-slate-50">{t('item_description', 'Description')}</th>
              <th className="w-20 px-2 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('unit', 'Unit')}</th>
              <th className="w-24 px-2 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('quantity', 'Quantity')}</th>
              <th className="w-28 px-2 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('unit_rate', 'Unit Rate')} ₪</th>
              <th className="w-28 px-2 py-2 text-right text-xs font-semibold text-green-700 uppercase tracking-wider">{t('total_amount', 'Total')} ₪</th>
              <th className="w-16 px-2 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('vat_pct', 'VAT %')}</th>
              <th className="w-24 px-2 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('vat_amount', 'VAT')} ₪</th>
              <th className="w-28 px-2 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('net_total', 'Net Total')} ₪</th>
              <th className="w-20 px-2 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => {
              const sectionCollapsed = section.header ? collapsedSections.has(section.header.id) : false
              return (
              <React.Fragment key={section.key}>
                {section.header && (
                  <tr className="bg-blue-50 border-b-2 border-blue-200">
                    <td className="px-2 py-2 text-center sticky left-0 z-10 bg-blue-50">
                      <button onClick={() => toggleSection(section.header!.id)} className="p-0.5 rounded hover:bg-blue-100">
                        {sectionCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </td>
                    <td colSpan={8} className="px-2 py-1.5 sticky left-10 z-10 bg-blue-50">
                      {editCell?.id === section.header.id && editCell?.field === 'description' ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => void commitEdit(section.header!.id, 'description', editValue)}
                          onKeyDown={e => handleKeyDown(e, section.header!.id, 'description')}
                          className="w-full border border-blue-400 rounded-md px-2 py-0.5 font-bold bg-white outline-none text-sm ring-2 ring-blue-500/20"
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(section.header!, 'description', section.header!.description ?? '')}
                          className="block font-bold text-slate-800 cursor-text hover:text-slate-600"
                        >
                          {section.header.description || 'Section Header'}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 bg-blue-50" />
                    <td className="px-2 py-1.5 text-center bg-blue-50">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => void moveRow(section.header!.id, 'up')} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                          <ChevronUp size={13} />
                        </button>
                        <button onClick={() => void moveRow(section.header!.id, 'down')} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                          <ChevronDown size={13} />
                        </button>
                        <button onClick={() => void removeRow(section.header!.id)} className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 ml-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {!sectionCollapsed && section.items.map((item) => {
                  rowNum++
                  const net = (item.total_amount ?? 0) + (item.vat_amount ?? 0)
                  const isSelected = selectedRows.has(item.id)
                  const isCellSelected = selectedCell?.rowId === item.id && !isSelected
                  const isDragOver = dragOverRowId === item.id
                  const rowClass = [
                    'border-b group',
                    isSelected ? 'bg-blue-50/80 border-l-[3px] border-l-blue-500' : '',
                    !isSelected && isCellSelected ? 'border-l-[3px] border-l-blue-300' : '',
                    !isSelected && !isCellSelected ? 'hover:bg-blue-50/40' : '',
                  ].filter(Boolean).join(' ')
                  return (
                    <React.Fragment key={item.id}>
                      {isDragOver && (
                        <tr>
                          <td colSpan={11}>
                            <div className="h-0.5 bg-blue-400 mx-2" />
                          </td>
                        </tr>
                      )}
                      <tr
                        className={rowClass}
                        onContextMenu={e => {
                          e.preventDefault()
                          setContextMenu({ x: e.clientX, y: e.clientY, itemId: item.id })
                        }}
                        onDragOver={e => handleDragOver(e, item.id)}
                        onDrop={e => handleDrop(e, item.id)}
                      >
                        <td
                          className="px-2 py-1 text-center text-gray-400 text-xs select-none cursor-pointer sticky left-0 z-10 bg-inherit"
                          onClick={e => handleRowNumberClick(e, item.id)}
                        >
                          <div className="flex items-center justify-center gap-0.5">
                            <span
                              draggable
                              onDragStart={e => handleDragStart(e, item.id)}
                              onDragEnd={handleDragEnd}
                              className="cursor-grab text-gray-300 hover:text-gray-500"
                            >
                              <GripVertical size={12} />
                            </span>
                            <span>{rowNum}</span>
                          </div>
                        </td>
                        <td className="px-1 py-0.5 sticky left-10 z-10 bg-inherit">
                          <EditableCell item={item} field="item_code" value={item.item_code} />
                        </td>
                        <td className="px-1 py-0.5 sticky left-[6.5rem] z-10 bg-inherit">
                          <EditableCell item={item} field="description" value={item.description} />
                        </td>
                        <td className="px-1 py-0.5">
                          <UnitCell item={item} />
                        </td>
                        <td className="px-1 py-0.5">
                          <EditableCell item={item} field="quantity" value={item.quantity} type="number" className="text-right" />
                        </td>
                        <td className="px-1 py-0.5">
                          <EditableCell item={item} field="unit_rate" value={item.unit_rate} type="number" className="text-right" />
                        </td>
                        <td className="px-2 py-1 text-right text-green-700 font-medium text-sm">{fmt(item.total_amount)}</td>
                        <td className="px-1 py-0.5">
                          <EditableCell item={item} field="vat_percent" value={item.vat_percent} type="number" className="text-right" />
                        </td>
                        <td className="px-2 py-1 text-right text-gray-600 text-sm">{fmt(item.vat_amount)}</td>
                        <td className="px-2 py-1 text-right font-bold text-gray-900 text-sm">{fmt(net)}</td>
                        <td className="px-2 py-1">
                          <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => void copyRow(item)} title="Copy" className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                              <Copy size={13} />
                            </button>
                            <button onClick={() => void moveRow(item.id, 'up')} title="Move up" className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                              <ChevronUp size={13} />
                            </button>
                            <button onClick={() => void moveRow(item.id, 'down')} title="Move down" className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                              <ChevronDown size={13} />
                            </button>
                            <button onClick={() => void removeRow(item.id)} title="Delete" className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  )
                })}
                {section.items.length > 0 && (
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <td colSpan={6} className="px-3 py-1.5 text-right text-xs font-medium text-gray-500">
                      {t('section_subtotal', 'Section Subtotal')}: {section.header?.description || 'General'}
                    </td>
                    <td className="px-2 py-1.5 text-right text-sm font-semibold text-green-700">
                      {fmt(section.items.reduce((s, i) => s + (i.total_amount ?? 0), 0))}
                    </td>
                    <td />
                    <td className="px-2 py-1.5 text-right text-sm text-gray-600">
                      {fmt(section.items.reduce((s, i) => s + (i.vat_amount ?? 0), 0))}
                    </td>
                    <td className="px-2 py-1.5 text-right text-sm font-bold">
                      {fmt(section.items.reduce((s, i) => s + (i.total_amount ?? 0) + (i.vat_amount ?? 0), 0))}
                    </td>
                    <td />
                  </tr>
                )}
              </React.Fragment>
              )
            })}
          </tbody>
          <tfoot className="bg-[#0F172A] text-white sticky bottom-0 z-10">
            <tr className="border-t-2 border-slate-600">
              <td colSpan={6} className="px-3 py-2 text-right text-sm font-medium text-slate-300">{t('grand_total', 'Grand Total')} (ex. VAT)</td>
              <td className="px-2 py-2 text-right text-base font-bold text-green-400">₪{fmt(grandTotal)}</td>
              <td />
              <td className="px-2 py-2 text-right text-sm text-slate-300">₪{fmt(vatTotal)}</td>
              <td className="px-2 py-2 text-right text-sm font-bold text-white">₪{fmt(netTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {sections.map(section => (
          <div key={section.key}>
            {section.header && (
              <div className="bg-blue-50 rounded-xl px-4 py-3 font-bold text-slate-800 flex items-center gap-2 mb-2">
                <button onClick={() => toggleSection(section.header!.id)}>
                  {collapsedSections.has(section.header!.id) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>
                {section.header.description || 'Section'}
              </div>
            )}
            {!collapsedSections.has(section.header?.id ?? '') && section.items.map(item => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-400">{item.item_code}</span>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-lg text-slate-500">{item.unit}</span>
                </div>
                <p className="text-sm font-medium text-slate-800 mb-3">{item.description}</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Qty</p>
                    <p className="text-sm font-semibold text-slate-700">{item.quantity}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Rate</p>
                    <p className="text-sm font-semibold text-slate-700">₪{fmt(item.unit_rate)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Total</p>
                    <p className="text-sm font-bold text-green-700">₪{fmt(item.total_amount)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        {/* Mobile totals */}
        <div className="bg-[#0F172A] rounded-xl p-4 text-white">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-slate-400">Subtotal</span>
            <span className="text-sm font-bold text-green-400">₪{fmt(grandTotal)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-slate-400">VAT</span>
            <span className="text-sm text-slate-300">₪{fmt(vatTotal)}</span>
          </div>
          <div className="h-px bg-slate-700 my-2" />
          <div className="flex justify-between">
            <span className="text-sm font-bold">Net Total</span>
            <span className="text-base font-bold">₪{fmt(netTotal)}</span>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <BOQContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onEdit={() => {
            const item = items.find(i => i.id === contextMenu.itemId)
            if (item) startEdit(item, 'description', item.description ?? '')
            setContextMenu(null)
          }}
          onDuplicate={() => {
            const item = items.find(i => i.id === contextMenu.itemId)
            if (item) void copyRow(item)
            setContextMenu(null)
          }}
          onInsertAbove={() => {
            void addRowAt(contextMenu.itemId, 'above')
            setContextMenu(null)
          }}
          onInsertBelow={() => {
            void addRowAt(contextMenu.itemId, 'below')
            setContextMenu(null)
          }}
          onDelete={() => {
            void removeRow(contextMenu.itemId)
            setContextMenu(null)
          }}
        />
      )}

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold">Paste from Excel</h2>
              <button onClick={() => { setShowPasteModal(false); setPasteText(''); setPastePreview([]) }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-4">
              <p className="text-sm text-gray-600">Copy rows from Excel and paste here. Expected columns: Item Code, Description, Unit, Quantity, Unit Rate, Total, Category, Notes</p>
              <textarea
                value={pasteText}
                onChange={e => { setPasteText(e.target.value); if (e.target.value) { setPastePreview(parseClipboardData(e.target.value)) } }}
                placeholder="Paste your Excel rows here (Ctrl+V)..."
                className="w-full h-32 border rounded-lg p-3 text-sm font-mono resize-none focus:outline-none focus:border-blue-400"
              />
              {pastePreview.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 text-green-700">{pastePreview.length} rows detected</p>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="text-xs w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-1 text-left border-b">Code</th>
                          <th className="px-2 py-1 text-left border-b">Description</th>
                          <th className="px-2 py-1 text-left border-b">Unit</th>
                          <th className="px-2 py-1 text-right border-b">Qty</th>
                          <th className="px-2 py-1 text-right border-b">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastePreview.slice(0,10).map((row, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-2 py-1">{row.item_code}</td>
                            <td className="px-2 py-1">{row.description}</td>
                            <td className="px-2 py-1">{row.unit}</td>
                            <td className="px-2 py-1 text-right">{row.quantity}</td>
                            <td className="px-2 py-1 text-right">{row.unit_rate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between p-6 border-t bg-slate-50/50">
              <button onClick={() => { setShowPasteModal(false); setPasteText(''); setPastePreview([]) }} className="px-4 py-2 border border-slate-200 rounded-xl text-sm hover:bg-gray-100">Cancel</button>
              <button
                onClick={() => void confirmPaste()}
                disabled={pastePreview.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Import {pastePreview.length} rows
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <ExcelImportModal
          projectId={projectId}
          onClose={() => setShowImportModal(false)}
          onImported={() => window.location.reload()}
        />
      )}

      <SaveTemplateModal
        isOpen={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        projectId={projectId}
        projectName={projectName}
      />

      <LoadTemplateModal
        isOpen={showLoadTemplate}
        onClose={() => setShowLoadTemplate(false)}
        projectId={projectId}
        onLoaded={() => window.location.reload()}
      />
    </div>
  )
}
