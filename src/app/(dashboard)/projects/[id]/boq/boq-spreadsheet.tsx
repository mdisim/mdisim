'use client'
import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { updateBOQItem, createBOQItem, deleteBOQItem, bulkCreateBOQItems } from '@/app/actions/boq-spreadsheet'
import ExcelImportModal from '@/components/boq/excel-import-modal'

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

const UNIT_OPTIONS = ['m', 'm²', 'm³', 'kg', 't', 'nr', 'ls', 'hr', 'day']

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

interface BOQSpreadsheetProps {
  initialItems: BOQItem[]
  projectId: string
  projectName: string
}

export default function BOQSpreadsheet({ initialItems, projectId, projectName }: BOQSpreadsheetProps) {
  const [items, setItems] = useState<BOQItem[]>(initialItems)
  const [editCell, setEditCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showImportModal, setShowImportModal] = useState(false)
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pastePreview, setPastePreview] = useState<Partial<BOQItem>[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sortedItems = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  function startEdit(item: BOQItem, field: string, currentVal: string) {
    setEditCell({ id: item.id, field })
    setEditValue(currentVal)
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
    if (numFields.includes(field)) {
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

    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await updateBOQItem(id, updates)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    }, 800)
  }

  async function addRow(isSection = false) {
    const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), 0)
    const newItem = await createBOQItem(projectId, {
      description: isSection ? 'New Section' : '',
      is_section_header: isSection,
      sort_order: maxOrder + 1,
      vat_percent: 17,
    })
    setItems(prev => [...prev, newItem as BOQItem])
  }

  async function copyRow(item: BOQItem) {
    const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), 0)
    const newItem = await createBOQItem(projectId, {
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
    setItems(prev => [...prev, newItem as BOQItem])
  }

  async function removeRow(id: string) {
    if (!confirm('Delete this item?')) return
    await deleteBOQItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
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
    await updateBOQItem(a.id, { sort_order: bOrder })
    await updateBOQItem(b.id, { sort_order: aOrder })
  }

  function handleKeyDown(e: React.KeyboardEvent, id: string, field: string) {
    if (e.key === 'Escape') { cancelEdit(); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit(id, field, editValue)
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit(id, field, editValue)
    }
  }

  async function confirmPaste() {
    await bulkCreateBOQItems(projectId, pastePreview.map(p => ({
      item_code: p.item_code ?? null,
      description: p.description ?? null,
      unit: p.unit ?? null,
      quantity: p.quantity ?? null,
      unit_rate: p.unit_rate ?? null,
      total_amount: p.total_amount ?? null,
      category: p.category ?? null,
      notes: p.notes ?? null,
    })))
    setShowPasteModal(false)
    setPasteText('')
    setPastePreview([])
    window.location.reload()
  }

  const grandTotal = sortedItems.filter(i => !i.is_section_header).reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const vatTotal = sortedItems.filter(i => !i.is_section_header).reduce((s, i) => s + (i.vat_amount ?? 0), 0)
  const netTotal = grandTotal + vatTotal

  function EditableCell({ item, field, value, type = 'text', className = '' }: {
    item: BOQItem
    field: string
    value: string | number | null | undefined
    type?: 'text' | 'number'
    className?: string
  }) {
    const isEditing = editCell?.id === item.id && editCell?.field === field
    const displayVal = value == null ? '' : String(value)
    if (isEditing) {
      return (
        <input
          autoFocus
          type={type}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={() => commitEdit(item.id, field, editValue)}
          onKeyDown={e => handleKeyDown(e, item.id, field)}
          className={`w-full border border-blue-400 rounded px-1 py-0 text-sm outline-none bg-blue-50 ${className}`}
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
          onChange={e => { setEditValue(e.target.value); commitEdit(item.id, 'unit', e.target.value) }}
          onBlur={() => commitEdit(item.id, 'unit', editValue)}
          className="w-full border border-blue-400 rounded px-1 py-0 text-sm outline-none bg-blue-50"
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

  let rowNum = 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => addRow(false)} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1">
          + Add Row
        </button>
        <button onClick={() => addRow(true)} className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 flex items-center gap-1">
          + Add Section
        </button>
        <div className="h-4 w-px bg-gray-300 mx-1" />
        <button onClick={() => exportToExcel(sortedItems.filter(i => !i.is_section_header), projectName)} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
          Export Excel
        </button>
        <button onClick={() => setShowImportModal(true)} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
          Import Excel
        </button>
        <button onClick={() => setShowPasteModal(true)} className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700">
          Paste from Excel
        </button>
        <div className="ml-auto text-sm">
          {saveStatus === 'saving' && <span className="text-gray-500 animate-pulse">Saving...</span>}
          {saveStatus === 'saved' && <span className="text-green-600 font-medium">Saved</span>}
          {saveStatus === 'error' && <span className="text-red-600 font-medium">Error saving</span>}
        </div>
      </div>

      <div className="overflow-auto border rounded-xl shadow-sm">
        <table className="w-full border-collapse text-sm" style={{ minWidth: 900 }}>
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr className="border-b">
              <th className="w-10 px-2 py-2 text-center text-xs font-semibold text-gray-500">#</th>
              <th className="w-24 px-2 py-2 text-left text-xs font-semibold text-gray-600">Item Code</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">Description</th>
              <th className="w-20 px-2 py-2 text-left text-xs font-semibold text-gray-600">Unit</th>
              <th className="w-24 px-2 py-2 text-right text-xs font-semibold text-gray-600">Quantity</th>
              <th className="w-28 px-2 py-2 text-right text-xs font-semibold text-gray-600">Unit Rate</th>
              <th className="w-28 px-2 py-2 text-right text-xs font-semibold text-green-700">Total</th>
              <th className="w-16 px-2 py-2 text-right text-xs font-semibold text-gray-600">VAT %</th>
              <th className="w-24 px-2 py-2 text-right text-xs font-semibold text-gray-600">VAT</th>
              <th className="w-28 px-2 py-2 text-right text-xs font-semibold text-gray-800">Net Total</th>
              <th className="w-20 px-2 py-2 text-center text-xs font-semibold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <React.Fragment key={section.key}>
                {section.header && (
                  <tr className="bg-amber-100 border-b border-amber-200">
                    <td className="px-2 py-1.5 text-center text-gray-400 text-xs">§</td>
                    <td colSpan={8} className="px-2 py-1.5">
                      {editCell?.id === section.header.id && editCell?.field === 'description' ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(section.header!.id, 'description', editValue)}
                          onKeyDown={e => handleKeyDown(e, section.header!.id, 'description')}
                          className="w-full border border-amber-400 rounded px-2 py-0.5 font-semibold bg-amber-50 outline-none text-sm"
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(section.header!, 'description', section.header!.description ?? '')}
                          className="block font-semibold text-amber-900 cursor-text hover:text-amber-700"
                        >
                          {section.header.description || 'Section Header'}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5" />
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => moveRow(section.header!.id, 'up')} className="text-gray-400 hover:text-gray-700 text-xs">▲</button>
                        <button onClick={() => moveRow(section.header!.id, 'down')} className="text-gray-400 hover:text-gray-700 text-xs">▼</button>
                        <button onClick={() => removeRow(section.header!.id)} className="text-red-400 hover:text-red-600 text-xs ml-1">✕</button>
                      </div>
                    </td>
                  </tr>
                )}
                {section.items.map((item) => {
                  rowNum++
                  const net = (item.total_amount ?? 0) + (item.vat_amount ?? 0)
                  return (
                    <tr key={item.id} className="border-b hover:bg-gray-50 group">
                      <td className="px-2 py-1 text-center text-gray-400 text-xs select-none">{rowNum}</td>
                      <td className="px-1 py-0.5">
                        <EditableCell item={item} field="item_code" value={item.item_code} />
                      </td>
                      <td className="px-1 py-0.5">
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
                          <button onClick={() => copyRow(item)} title="Copy" className="text-blue-400 hover:text-blue-600 text-xs p-0.5">⧉</button>
                          <button onClick={() => moveRow(item.id, 'up')} title="Move up" className="text-gray-400 hover:text-gray-600 text-xs p-0.5">▲</button>
                          <button onClick={() => moveRow(item.id, 'down')} title="Move down" className="text-gray-400 hover:text-gray-600 text-xs p-0.5">▼</button>
                          <button onClick={() => removeRow(item.id)} title="Delete" className="text-red-400 hover:text-red-600 text-xs p-0.5">✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {section.items.length > 0 && (
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <td colSpan={6} className="px-3 py-1.5 text-right text-xs font-medium text-gray-500">
                      Section Subtotal: {section.header?.description || 'General'}
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
            ))}
          </tbody>
          <tfoot className="bg-gray-800 text-white sticky bottom-0">
            <tr className="border-t-2 border-gray-600">
              <td colSpan={6} className="px-3 py-2 text-right text-sm font-medium text-gray-300">Subtotal (ex. VAT)</td>
              <td className="px-2 py-2 text-right text-sm font-bold text-green-400">{fmt(grandTotal)}</td>
              <td />
              <td className="px-2 py-2 text-right text-sm text-gray-300">{fmt(vatTotal)}</td>
              <td className="px-2 py-2 text-right text-sm font-bold text-white">{fmt(netTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {showPasteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
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
            <div className="flex justify-between p-6 border-t bg-gray-50">
              <button onClick={() => { setShowPasteModal(false); setPasteText(''); setPastePreview([]) }} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">Cancel</button>
              <button
                onClick={confirmPaste}
                disabled={pastePreview.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
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
    </div>
  )
}
