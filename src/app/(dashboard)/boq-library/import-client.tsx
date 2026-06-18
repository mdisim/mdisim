'use client'

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { bulkImportLibraryItems } from '@/app/actions/boq-library'
import { Upload, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Step = 'upload' | 'mapping' | 'category' | 'preview'

interface ParsedRow {
  item_code: string
  description_en: string
  description_he: string
  description_ar: string
  unit: string
  typical_rate_ils: number | undefined
  category: string
  section_code: string
  is_section_header: boolean
}

type ColumnKey = 'item_code' | 'description_en' | 'description_he' | 'description_ar' | 'unit' | 'rate' | 'category' | 'section_code' | 'ignore'

interface ColumnMapping {
  [header: string]: ColumnKey
}

function detectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  for (const h of headers) {
    const lower = h.toLowerCase().trim()
    if (/^(סעיף|section|section_code)$/.test(lower)) mapping[h] = 'section_code'
    else if (/^(קוד|code|item_code)$/.test(lower)) mapping[h] = 'item_code'
    else if (/^(תיאור|description|desc|description_en)$/.test(lower)) mapping[h] = 'description_en'
    else if (/^(תיאור עברית|description_he|תיאור בעברית)$/.test(lower)) mapping[h] = 'description_he'
    else if (/^(תיאור ערבית|description_ar|وصف)$/.test(lower)) mapping[h] = 'description_ar'
    else if (/^(יחידה|unit|وحدة)$/.test(lower)) mapping[h] = 'unit'
    else if (/^(מחיר|rate|price|unit.?rate|سعر|typical_rate)$/.test(lower)) mapping[h] = 'rate'
    else if (/^(category|קטגוריה|trade)$/.test(lower)) mapping[h] = 'category'
    else mapping[h] = 'ignore'
  }
  return mapping
}

function applyMapping(rawRows: Record<string, string>[], mapping: ColumnMapping, defaultCategory: string): ParsedRow[] {
  return rawRows.map(row => {
    const get = (key: ColumnKey): string => {
      const header = Object.entries(mapping).find(([, v]) => v === key)?.[0]
      return header ? (row[header] ?? '').trim() : ''
    }
    const unit = get('unit')
    const rateStr = get('rate')
    const rate = rateStr ? parseFloat(rateStr.replace(/[^\d.,-]/g, '').replace(',', '.')) : undefined
    const isSectionHeader = !unit && !rateStr
    return {
      item_code: get('item_code'),
      description_en: get('description_en'),
      description_he: get('description_he'),
      description_ar: get('description_ar'),
      unit: unit || 'm',
      typical_rate_ils: isNaN(rate as number) ? undefined : rate,
      category: get('category') || defaultCategory,
      section_code: get('section_code'),
      is_section_header: isSectionHeader,
    }
  }).filter(r => r.description_en || r.item_code)
}

const COLUMN_KEY_OPTIONS: { value: ColumnKey; label: string }[] = [
  { value: 'ignore', label: 'Ignore' },
  { value: 'item_code', label: 'Item Code' },
  { value: 'description_en', label: 'Description (EN)' },
  { value: 'description_he', label: 'Description (HE)' },
  { value: 'description_ar', label: 'Description (AR)' },
  { value: 'unit', label: 'Unit' },
  { value: 'rate', label: 'Rate/Price' },
  { value: 'category', label: 'Category' },
  { value: 'section_code', label: 'Section Code' },
]

export default function ImportLibraryClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [sheets, setSheets] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [defaultCategory, setDefaultCategory] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; updated: number } | null>(null)
  const [error, setError] = useState('')
  const [draggingOver, setDraggingOver] = useState(false)

  function processSheet(wb: XLSX.WorkBook, sheetName: string) {
    const ws = wb.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '', raw: false })
    if (jsonData.length === 0) { setError('Sheet appears to be empty.'); return }
    const hdrs = Object.keys(jsonData[0])
    setHeaders(hdrs)
    setRawRows(jsonData)
    setMapping(detectMapping(hdrs))
    setStep('mapping')
  }

  function handleFile(file: File) {
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        setWorkbook(wb)
        const sheetNames = wb.SheetNames
        setSheets(sheetNames)
        setSelectedSheet(sheetNames[0])
        processSheet(wb, sheetNames[0])
      } catch {
        setError('Failed to parse file. Make sure it is a valid .xlsx, .xls, or .csv file.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDraggingOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  function handleSheetChange(name: string) {
    setSelectedSheet(name)
    if (workbook) processSheet(workbook, name)
  }

  function goToPreview() {
    const rows = applyMapping(rawRows, mapping, defaultCategory)
    setParsedRows(rows)
    setStep('preview')
  }

  async function doImport() {
    setImporting(true)
    setError('')
    const result = await bulkImportLibraryItems(parsedRows.map(r => ({
      item_code: r.item_code,
      description_en: r.description_en,
      description_he: r.description_he || undefined,
      description_ar: r.description_ar || undefined,
      unit: r.unit,
      typical_rate_ils: r.typical_rate_ils,
      category: r.category || undefined,
      section_code: r.section_code || undefined,
      is_section_header: r.is_section_header,
    })))
    setImporting(false)
    if (result.error) { setError(result.error); return }
    setImportResult({ created: result.created, updated: result.updated })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'mapping', 'category', 'preview'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <ChevronRight size={14} className="text-slate-300" />}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${step === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div
          onDragOver={e => { e.preventDefault(); setDraggingOver(true) }}
          onDragLeave={() => setDraggingOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${draggingOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}
        >
          <Upload size={32} className="mx-auto text-slate-400 mb-3" />
          <p className="text-slate-600 font-medium mb-1">Drop your file here</p>
          <p className="text-slate-400 text-sm mb-4">or click to browse — .xlsx, .xls, .csv accepted</p>
          <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg inline-block">
            Browse file
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
            />
          </label>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === 'mapping' && (
        <div className="space-y-4">
          {sheets.length > 1 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Sheet:</label>
              <select
                value={selectedSheet}
                onChange={e => handleSheetChange(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
              >
                {sheets.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700">Column Mapping</h3>
              <p className="text-xs text-slate-500 mt-0.5">Map each Excel column to a library field</p>
            </div>
            <div className="p-4 space-y-2">
              {headers.map(h => (
                <div key={h} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-48 truncate font-mono bg-slate-100 px-2 py-0.5 rounded">{h}</span>
                  <span className="text-slate-400">→</span>
                  <select
                    value={mapping[h] ?? 'ignore'}
                    onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value as ColumnKey }))}
                    className="border border-slate-200 rounded px-2 py-1 text-sm"
                  >
                    {COLUMN_KEY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {/* Preview value */}
                  <span className="text-xs text-slate-400 truncate max-w-xs">{rawRows[0]?.[h] ?? ''}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview first 10 rows */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700">Preview (first 10 rows)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {headers.map(h => (
                      <th key={h} className="px-2 py-1.5 text-left border-b border-slate-200 text-slate-600 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {headers.map(h => (
                        <td key={h} className="px-2 py-1 text-slate-600 whitespace-nowrap max-w-[200px] truncate">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep('upload')} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Back</button>
            <button onClick={() => setStep('category')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Next: Category</button>
          </div>
        </div>
      )}

      {/* Step 3: Category */}
      {step === 'category' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700">Default Category</h3>
            <p className="text-xs text-slate-500">All imported items will be assigned this category unless a &quot;Category&quot; column is mapped.</p>
            <input
              type="text"
              value={defaultCategory}
              onChange={e => setDefaultCategory(e.target.value)}
              placeholder="e.g. Earthworks, Concrete, Finishes..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep('mapping')} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Back</button>
            <button onClick={goToPreview} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Next: Preview</button>
          </div>
        </div>
      )}

      {/* Step 4: Preview + Import */}
      {step === 'preview' && !importResult && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Import Preview</h3>
              <span className="text-xs text-slate-500">{parsedRows.length} items total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-1.5 text-left border-b font-medium text-slate-600">Code</th>
                    <th className="px-2 py-1.5 text-left border-b font-medium text-slate-600">Description</th>
                    <th className="px-2 py-1.5 text-left border-b font-medium text-slate-600">Unit</th>
                    <th className="px-2 py-1.5 text-right border-b font-medium text-slate-600">Rate</th>
                    <th className="px-2 py-1.5 text-left border-b font-medium text-slate-600">Category</th>
                    <th className="px-2 py-1.5 text-left border-b font-medium text-slate-600">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 20).map((row, i) => (
                    <tr key={i} className={`border-b ${row.is_section_header ? 'bg-amber-50 font-semibold' : 'hover:bg-slate-50'}`}>
                      <td className="px-2 py-1 font-mono text-slate-500">{row.item_code || '—'}</td>
                      <td className="px-2 py-1 text-slate-700 max-w-[280px] truncate">{row.description_en}</td>
                      <td className="px-2 py-1 text-slate-500">{row.unit}</td>
                      <td className="px-2 py-1 text-right text-slate-600">{row.typical_rate_ils != null ? `₪${row.typical_rate_ils}` : '—'}</td>
                      <td className="px-2 py-1 text-slate-500">{row.category || '—'}</td>
                      <td className="px-2 py-1">{row.is_section_header ? <span className="text-amber-600 font-medium">Section</span> : <span className="text-slate-400">Item</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 20 && (
                <div className="px-4 py-2 text-xs text-slate-400 text-center">
                  ...and {parsedRows.length - 20} more items
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={() => setStep('category')} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Back</button>
            <button
              onClick={doImport}
              disabled={importing || parsedRows.length === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              {importing ? 'Importing...' : `Import ${parsedRows.length} items`}
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {importResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center space-y-3">
          <div className="text-4xl">✓</div>
          <h3 className="text-lg font-semibold text-green-800">Import complete!</h3>
          <p className="text-sm text-green-700">{importResult.created} items imported</p>
          <button
            onClick={() => router.push('/boq-library')}
            className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
          >
            Go to Library
          </button>
        </div>
      )}
    </div>
  )
}
