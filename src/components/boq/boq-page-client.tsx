'use client'

import { useState, useTransition } from 'react'
import { BOQItem, BOQLibraryItem } from '@/lib/types'
import { BOQTable } from './boq-table'
import { BOQItemForm } from './boq-item-form'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, Download, Library, Upload } from 'lucide-react'
import { importFromLibrary, getLibraryItems } from '@/app/actions/boq-library'
import { bulkCreateBOQItems, BulkBOQItem } from '@/app/actions/boq'
import { useRouter } from 'next/navigation'

interface BOQPageClientProps {
  items: BOQItem[]
  projectId: string
}

function exportToCSV(items: BOQItem[]) {
  const headers = ['Item Code', 'Description', 'Unit', 'Quantity', 'Unit Rate', 'Total Amount', 'Category', 'Notes']
  const rows = items.map((item) => [
    item.item_code,
    item.description,
    item.unit,
    item.quantity,
    item.unit_rate,
    item.total_amount,
    item.category ?? '',
    item.notes ?? '',
  ])
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'boq-export.csv'
  a.click()
  URL.revokeObjectURL(url)
}

interface ParsedCSVRow {
  item_code: string
  description: string
  unit: string
  quantity: number
  unit_rate: number
  category: string | null
  error?: string
}

function parseCSV(text: string): ParsedCSVRow[] {
  const lines = text.trim().split('\n').filter(Boolean)
  const rows: ParsedCSVRow[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Simple CSV parser handling quoted fields
    const cells: string[] = []
    let inQuote = false
    let cell = ''
    for (let ci = 0; ci < line.length; ci++) {
      const ch = line[ci]
      if (ch === '"') {
        if (inQuote && line[ci + 1] === '"') { cell += '"'; ci++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        cells.push(cell.trim())
        cell = ''
      } else {
        cell += ch
      }
    }
    cells.push(cell.trim())

    const [item_code, description, unit, quantityStr, unit_rateStr, category] = cells
    const quantity = parseFloat(quantityStr)
    const unit_rate = parseFloat(unit_rateStr)

    const errors: string[] = []
    if (!item_code) errors.push('Missing item code')
    if (!description) errors.push('Missing description')
    if (!unit) errors.push('Missing unit')
    if (isNaN(quantity)) errors.push('Invalid quantity')
    if (isNaN(unit_rate)) errors.push('Invalid unit rate')

    rows.push({
      item_code: item_code || '',
      description: description || '',
      unit: unit || '',
      quantity: isNaN(quantity) ? 0 : quantity,
      unit_rate: isNaN(unit_rate) ? 0 : unit_rate,
      category: category || null,
      error: errors.length > 0 ? errors.join(', ') : undefined,
    })
  }

  return rows
}

export function BOQPageClient({ items, projectId }: BOQPageClientProps) {
  const router = useRouter()
  const [editItem, setEditItem] = useState<BOQItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  // Library import state
  const [showLibrary, setShowLibrary] = useState(false)
  const [libraryItems, setLibraryItems] = useState<BOQLibraryItem[]>([])
  const [librarySearch, setLibrarySearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryError, setLibraryError] = useState('')
  const [isPending, startTransition] = useTransition()

  // CSV import state
  const [showCSV, setShowCSV] = useState(false)
  const [csvText, setCSVText] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedCSVRow[]>([])
  const [csvImporting, setCSVImporting] = useState(false)
  const [csvError, setCSVError] = useState('')

  async function openLibrary() {
    setLibraryLoading(true)
    setLibraryError('')
    setSelectedIds(new Set())
    const result = await getLibraryItems()
    setLibraryLoading(false)
    if (result.error) {
      setLibraryError(result.error)
    } else {
      setLibraryItems(result.data)
    }
    setShowLibrary(true)
  }

  const filteredLibrary = libraryItems.filter((item) => {
    if (!librarySearch) return true
    const s = librarySearch.toLowerCase()
    return item.description.toLowerCase().includes(s) || item.item_code.toLowerCase().includes(s) || (item.category ?? '').toLowerCase().includes(s)
  })

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleImportLibrary() {
    if (selectedIds.size === 0) return
    startTransition(async () => {
      const result = await importFromLibrary(projectId, Array.from(selectedIds))
      if (result.error) {
        setLibraryError(result.error)
      } else {
        setShowLibrary(false)
        router.refresh()
      }
    })
  }

  function handleCSVParse() {
    const rows = parseCSV(csvText)
    setParsedRows(rows)
  }

  async function handleCSVImport() {
    const validRows = parsedRows.filter((r) => !r.error)
    if (validRows.length === 0) return
    setCSVImporting(true)
    setCSVError('')
    const result = await bulkCreateBOQItems(projectId, validRows as BulkBOQItem[])
    setCSVImporting(false)
    if (result.error) {
      setCSVError(result.error)
    } else {
      setShowCSV(false)
      setCSVText('')
      setParsedRows([])
      router.refresh()
    }
  }

  const validRowCount = parsedRows.filter((r) => !r.error).length

  return (
    <div>
      <div className="flex justify-end mb-4 gap-2 flex-wrap">
        {items.length > 0 && (
          <button
            onClick={() => exportToCSV(items)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        )}
        <button
          onClick={() => { setShowCSV(true); setParsedRows([]); setCSVText('') }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Upload size={16} />
          Import CSV
        </button>
        <button
          onClick={openLibrary}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
        >
          <Library size={16} />
          Import from Library
        </button>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Add BOQ Item
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <BOQTable
          items={items}
          onEdit={(item) => setEditItem(item)}
        />
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add BOQ Item" size="lg">
        <BOQItemForm
          projectId={projectId}
          onSuccess={() => setShowAdd(false)}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit BOQ Item"
        size="lg"
      >
        {editItem && (
          <BOQItemForm
            projectId={projectId}
            item={editItem}
            onSuccess={() => setEditItem(null)}
            onCancel={() => setEditItem(null)}
          />
        )}
      </Modal>

      {/* Import from Library Modal */}
      <Modal isOpen={showLibrary} onClose={() => setShowLibrary(false)} title="Import from Library" size="xl">
        <div className="space-y-4">
          {libraryError && <p className="text-sm text-red-600">{libraryError}</p>}
          {libraryLoading ? (
            <p className="text-sm text-slate-500">Loading library…</p>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search library…"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Code</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Description</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Unit</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Rate</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLibrary.map((item) => (
                      <tr
                        key={item.id}
                        className={`cursor-pointer hover:bg-amber-50 ${selectedIds.has(item.id) ? 'bg-amber-50' : ''}`}
                        onClick={() => toggleSelect(item.id)}
                      >
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="accent-amber-500"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{item.item_code}</td>
                        <td className="px-3 py-2 text-slate-900">{item.description}</td>
                        <td className="px-3 py-2 text-slate-500">{item.unit}</td>
                        <td className="px-3 py-2 text-right text-slate-900">${item.unit_rate.toFixed(2)}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs">{item.category ?? '—'}</td>
                      </tr>
                    ))}
                    {filteredLibrary.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">No items found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-500">{selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowLibrary(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                  <Button onClick={handleImportLibrary} disabled={selectedIds.size === 0 || isPending}>
                    {isPending ? 'Adding…' : `Add Selected (${selectedIds.size})`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Import CSV Modal */}
      <Modal isOpen={showCSV} onClose={() => setShowCSV(false)} title="Import CSV" size="xl">
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 font-mono">
            Expected format: Item Code, Description, Unit, Quantity, Unit Rate, Category
          </div>
          {csvError && <p className="text-sm text-red-600">{csvError}</p>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Paste CSV Data</label>
            <textarea
              value={csvText}
              onChange={(e) => setCSVText(e.target.value)}
              rows={6}
              placeholder={'CONC-001, Concrete Grade C25, m³, 50, 185.00, Concrete\nSTEEL-001, Reinforcement bars, tonne, 10, 980.00, Reinforcement'}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex justify-between items-center">
            <button
              onClick={handleCSVParse}
              disabled={!csvText.trim()}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Preview
            </button>
          </div>

          {parsedRows.length > 0 && (
            <>
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Code</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Description</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Unit</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Qty</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Rate</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Category</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, i) => (
                      <tr key={i} className={row.error ? 'bg-red-50' : 'bg-green-50'}>
                        <td className="px-3 py-1.5 font-mono">{row.item_code}</td>
                        <td className="px-3 py-1.5">{row.description}</td>
                        <td className="px-3 py-1.5">{row.unit}</td>
                        <td className="px-3 py-1.5 text-right">{row.quantity}</td>
                        <td className="px-3 py-1.5 text-right">{row.unit_rate}</td>
                        <td className="px-3 py-1.5">{row.category ?? '—'}</td>
                        <td className="px-3 py-1.5">
                          {row.error ? (
                            <span className="text-red-600 font-medium">{row.error}</span>
                          ) : (
                            <span className="text-green-600 font-medium">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-500">
                  {validRowCount} valid row{validRowCount !== 1 ? 's' : ''}, {parsedRows.length - validRowCount} error{parsedRows.length - validRowCount !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setShowCSV(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                  <Button onClick={handleCSVImport} disabled={validRowCount === 0 || csvImporting}>
                    {csvImporting ? 'Importing…' : `Import ${validRowCount} row${validRowCount !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
