'use client'
import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { bulkCreateBOQItems } from '@/app/actions/boq-spreadsheet'

const FIELD_PATTERNS: Record<string, string[]> = {
  item_code:    ['item code', 'code', 'ref', 'item no', 'number', 'מספר', 'קוד'],
  description:  ['description', 'desc', 'item', 'work', 'תיאור'],
  unit:         ['unit', 'uom', 'יחידה'],
  quantity:     ['quantity', 'qty', 'amount', 'כמות'],
  unit_rate:    ['unit rate', 'rate', 'price', 'unit price', 'מחיר'],
  total_amount: ['total', 'amount', 'value', 'סה"כ'],
  category:     ['category', 'section', 'trade', 'קטגוריה'],
  notes:        ['notes', 'remarks', 'comment', 'הערות'],
}

function detectColumn(headers: string[], field: string): string {
  const patterns = FIELD_PATTERNS[field] || []
  for (const h of headers) {
    for (const p of patterns) {
      if (h.toLowerCase().includes(p.toLowerCase())) return h
    }
  }
  return ''
}

interface ExcelImportModalProps {
  projectId: string
  onClose: () => void
  onImported: () => void
}

export default function ExcelImportModal({ projectId, onClose, onImported }: ExcelImportModalProps) {
  const [step, setStep] = useState(1)
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [sheetName, setSheetName] = useState('')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
    if (!data.length) { setError('No data found in file'); return }
    const hdrs = Object.keys(data[0])
    setHeaders(hdrs)
    setRows(data)
    setSheetName(wb.SheetNames[0])
    const autoMap: Record<string, string> = {}
    for (const field of Object.keys(FIELD_PATTERNS)) {
      autoMap[field] = detectColumn(hdrs, field)
    }
    setMapping(autoMap)
    setStep(2)
  }

  function getMappedItems() {
    return rows
      .map(row => ({
        item_code:    mapping.item_code ? String(row[mapping.item_code] ?? '') || null : null,
        description:  mapping.description ? String(row[mapping.description] ?? '') : '',
        unit:         mapping.unit ? String(row[mapping.unit] ?? '') || null : null,
        quantity:     mapping.quantity ? parseFloat(String(row[mapping.quantity])) || null : null,
        unit_rate:    mapping.unit_rate ? parseFloat(String(row[mapping.unit_rate])) || null : null,
        total_amount: mapping.total_amount ? parseFloat(String(row[mapping.total_amount])) || null : null,
        category:     mapping.category ? String(row[mapping.category] ?? '') || null : null,
        notes:        mapping.notes ? String(row[mapping.notes] ?? '') || null : null,
      }))
      .filter(item => item.description && item.description.trim().length > 0)
  }

  async function handleImport() {
    setImporting(true)
    try {
      const items = getMappedItems()
      await bulkCreateBOQItems(projectId, items)
      onImported()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const mappedItems = step === 3 ? getMappedItems() : []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Import from Excel</h2>
            <div className="flex gap-2 mt-2">
              {[1,2,3].map(s => (
                <div key={s} className={`h-1.5 w-20 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-gray-600">Select an Excel file (.xlsx, .xls) or CSV to import BOQ items.</p>
              <label className="block border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <div className="text-4xl mb-3">📊</div>
                <div className="text-gray-600 font-medium">Click to select file</div>
                <div className="text-gray-400 text-sm mt-1">.xlsx, .xls, .csv supported</div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                Found <strong>{rows.length}</strong> rows in sheet &ldquo;<strong>{sheetName}</strong>&rdquo;
              </div>
              <div className="mb-4">
                <h3 className="font-medium mb-2">Preview (first 5 rows)</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="text-xs w-full">
                    <thead className="bg-gray-50">
                      <tr>{headers.map(h => <th key={h} className="px-2 py-1 text-left border-b font-medium">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.slice(0,5).map((row, i) => (
                        <tr key={i} className="border-b">
                          {headers.map(h => <td key={h} className="px-2 py-1">{String(row[h] ?? '')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Column Mapping</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(FIELD_PATTERNS).map(field => (
                    <div key={field} className="flex items-center gap-2">
                      <label className="w-28 text-sm text-gray-600 capitalize">{field.replace('_', ' ')}</label>
                      <select
                        value={mapping[field] || ''}
                        onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                        className="flex-1 border rounded px-2 py-1 text-sm"
                      >
                        <option value="">(skip)</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                <strong>{mappedItems.length}</strong> rows will be imported. {rows.length - mappedItems.length} rows skipped (missing description).
              </div>
              <div className="overflow-x-auto border rounded-lg">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left border-b">Code</th>
                      <th className="px-2 py-1 text-left border-b">Description</th>
                      <th className="px-2 py-1 text-left border-b">Unit</th>
                      <th className="px-2 py-1 text-right border-b">Qty</th>
                      <th className="px-2 py-1 text-right border-b">Rate ₪</th>
                      <th className="px-2 py-1 text-right border-b">Total ₪</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedItems.slice(0,20).map((item, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-2 py-1">{item.item_code}</td>
                        <td className="px-2 py-1">{item.description}</td>
                        <td className="px-2 py-1">{item.unit}</td>
                        <td className="px-2 py-1 text-right">{item.quantity}</td>
                        <td className="px-2 py-1 text-right">{item.unit_rate}</td>
                        <td className="px-2 py-1 text-right">{item.total_amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mappedItems.length > 20 && <p className="text-sm text-gray-500">... and {mappedItems.length - 20} more rows</p>}
            </div>
          )}
        </div>

        <div className="flex justify-between p-6 border-t bg-gray-50">
          <button onClick={step === 1 ? onClose : () => setStep(s => s - 1)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100">
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 && step > 1 && (
            <button onClick={() => setStep(s => s + 1)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Next
            </button>
          )}
          {step === 3 && (
            <button onClick={handleImport} disabled={importing} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
              {importing ? 'Importing...' : `Import ${mappedItems.length} items`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
