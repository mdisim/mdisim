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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Import from Excel</h2>
            <div className="flex items-center gap-2 mt-3">
              {[1,2,3].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full transition-colors ${step >= s ? 'bg-blue-600' : 'bg-slate-200'}`} />
                  <div className={`h-0.5 w-16 rounded-full transition-colors ${s < 3 ? (step > s ? 'bg-blue-600' : 'bg-slate-200') : 'hidden'}`} />
                </div>
              ))}
              <span className="ml-2 text-xs text-slate-400">Step {step} of 3</span>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-slate-600 text-sm">Select an Excel file (.xlsx, .xls) or CSV to import BOQ items.</p>
              <label className="block border-2 border-dashed border-slate-200 rounded-xl p-16 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
                <div className="h-16 w-16 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <div className="text-slate-700 font-medium">Click to select file</div>
                <div className="text-slate-400 text-sm mt-1">.xlsx, .xls, .csv supported</div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
                Found <strong>{rows.length}</strong> rows in sheet &ldquo;<strong>{sheetName}</strong>&rdquo;
              </div>
              <div>
                <h3 className="font-medium text-slate-800 text-sm mb-2">Preview (first 5 rows)</h3>
                <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] border border-slate-200 rounded-lg">
                  <table className="text-xs w-full">
                    <thead className="bg-slate-50">
                      <tr>{headers.map(h => <th key={h} className="px-3 py-2 text-left border-b border-slate-200 font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.slice(0,5).map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          {headers.map(h => <td key={h} className="px-3 py-2 whitespace-nowrap">{String(row[h] ?? '')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-slate-800 text-sm mb-2">Column Mapping</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.keys(FIELD_PATTERNS).map(field => (
                    <div key={field} className="flex items-center gap-2">
                      <label className="w-28 text-sm text-slate-600 capitalize font-medium">{field.replace('_', ' ')}</label>
                      <select
                        value={mapping[field] || ''}
                        onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                        className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
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
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-sm text-green-700">
                <strong>{mappedItems.length}</strong> rows will be imported. {rows.length - mappedItems.length} rows skipped (missing description).
              </div>
              <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] border border-slate-200 rounded-lg">
                <table className="text-xs w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left border-b border-slate-200 font-medium text-slate-500 uppercase tracking-wider">Code</th>
                      <th className="px-3 py-2 text-left border-b border-slate-200 font-medium text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="px-3 py-2 text-left border-b border-slate-200 font-medium text-slate-500 uppercase tracking-wider">Unit</th>
                      <th className="px-3 py-2 text-right border-b border-slate-200 font-medium text-slate-500 uppercase tracking-wider">Qty</th>
                      <th className="px-3 py-2 text-right border-b border-slate-200 font-medium text-slate-500 uppercase tracking-wider">Rate</th>
                      <th className="px-3 py-2 text-right border-b border-slate-200 font-medium text-slate-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedItems.slice(0,20).map((item, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono">{item.item_code}</td>
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2">{item.unit}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{item.unit_rate}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{item.total_amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mappedItems.length > 20 && <p className="text-sm text-slate-500">... and {mappedItems.length - 20} more rows</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
          <button onClick={step === 1 ? onClose : () => setStep(s => s - 1)} className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:border-slate-300 transition-colors shadow-sm">
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 && step > 1 && (
            <button onClick={() => setStep(s => s + 1)} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              Next
            </button>
          )}
          {step === 3 && (
            <button onClick={handleImport} disabled={importing} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
              {importing ? 'Importing...' : `Import ${mappedItems.length} items`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
