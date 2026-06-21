'use client'

import { useState } from 'react'
import { Printer, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import * as XLSX from 'xlsx'

interface BOQItem {
  id: string
  item_code: string | null
  description: string | null
  unit: string | null
  quantity: number | null
  unit_rate: number | null
  total_amount: number | null
  vat_percent: number | null
  vat_amount: number | null
  category: string | null
  is_section_header: boolean | null
  notes: string | null
}

interface Project {
  id: string
  name: string
  client_name: string | null
  budget: number | null
  status: string
  created_at: string
}

interface Props {
  project: Project
  boqItems: BOQItem[]
  preparedBy: string
  companyName: string
}

type ReportType = 'full' | 'summary' | 'quantities'

export default function BOQReportClient({ project, boqItems, preparedBy, companyName }: Props) {
  const [reportType, setReportType] = useState<ReportType>('full')

  const regularItems = boqItems.filter((i) => !i.is_section_header)
  const sections = boqItems.filter((i) => i.is_section_header)

  const grandTotal = regularItems.reduce((s, i) => s + (i.total_amount ?? 0), 0)
  const totalVat = regularItems.reduce((s, i) => s + (i.vat_amount ?? 0), 0)

  const categorySummary = new Map<string, { count: number; total: number }>()
  for (const item of regularItems) {
    const cat = item.category || 'Uncategorized'
    const existing = categorySummary.get(cat) ?? { count: 0, total: 0 }
    categorySummary.set(cat, { count: existing.count + 1, total: existing.total + (item.total_amount ?? 0) })
  }

  function handlePrint() {
    window.print()
  }

  function handleExportExcel() {
    const rows = regularItems.map((i) => ({
      'Item Code': i.item_code ?? '',
      Description: i.description ?? '',
      Unit: i.unit ?? '',
      Quantity: i.quantity ?? 0,
      'Unit Rate (₪)': i.unit_rate ?? 0,
      'Total (₪)': i.total_amount ?? 0,
      Category: i.category ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'BOQ')
    XLSX.writeFile(wb, `BOQ_${project.name}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div>
      {/* Controls - hidden on print */}
      <div className="print:hidden mb-6 flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {([
            { value: 'full', label: 'Full BOQ' },
            { value: 'summary', label: 'Cost Summary' },
            { value: 'quantities', label: 'Quantities Only' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setReportType(opt.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                reportType === opt.value ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button onClick={handlePrint} variant="outline">
            <Printer size={14} /> Print / PDF
          </Button>
          <Button onClick={handleExportExcel} variant="outline">
            <Download size={14} /> Excel
          </Button>
        </div>
      </div>

      {/* Printable Report */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md print:shadow-none print:border-none print:rounded-none">
        {/* Report Header */}
        <div className="px-8 py-6 border-b border-slate-200 print:border-b-2 print:border-black">
          <div className="flex items-start justify-between">
            <div>
              {companyName && <p className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-1">{companyName}</p>}
              <h1 className="text-2xl font-bold text-slate-900">
                {reportType === 'full' ? 'Bill of Quantities' : reportType === 'summary' ? 'Cost Summary Report' : 'Quantity Schedule'}
              </h1>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{project.name}</p>
              {project.client_name && <p>Client: {project.client_name}</p>}
              <p>Date: {new Date().toLocaleDateString('en-GB')}</p>
              {preparedBy && <p>Prepared by: {preparedBy}</p>}
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          {/* Full BOQ Report */}
          {reportType === 'full' && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-2 text-left text-xs font-bold text-slate-700 uppercase w-20">No.</th>
                  <th className="py-2 text-left text-xs font-bold text-slate-700 uppercase">Item Code</th>
                  <th className="py-2 text-left text-xs font-bold text-slate-700 uppercase">Description</th>
                  <th className="py-2 text-left text-xs font-bold text-slate-700 uppercase w-16">Unit</th>
                  <th className="py-2 text-right text-xs font-bold text-slate-700 uppercase w-20">Qty</th>
                  <th className="py-2 text-right text-xs font-bold text-slate-700 uppercase w-24">Rate ₪</th>
                  <th className="py-2 text-right text-xs font-bold text-slate-700 uppercase w-28">Amount ₪</th>
                </tr>
              </thead>
              <tbody>
                {boqItems.map((item, idx) => {
                  if (item.is_section_header) {
                    return (
                      <tr key={item.id} className="border-b border-slate-300">
                        <td colSpan={7} className="py-3 font-bold text-slate-900 text-sm uppercase bg-slate-50 px-2">
                          {item.description}
                        </td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className="py-1.5 text-slate-500 text-xs">{idx + 1}</td>
                      <td className="py-1.5 font-mono text-xs text-slate-600">{item.item_code}</td>
                      <td className="py-1.5 text-slate-800">{item.description}</td>
                      <td className="py-1.5 text-slate-600">{item.unit}</td>
                      <td className="py-1.5 text-right tabular-nums">{item.quantity?.toFixed(2) ?? '—'}</td>
                      <td className="py-1.5 text-right tabular-nums">{item.unit_rate?.toFixed(2) ?? '—'}</td>
                      <td className="py-1.5 text-right tabular-nums font-semibold">{item.total_amount?.toFixed(2) ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900">
                  <td colSpan={6} className="py-3 text-right font-bold text-slate-900 uppercase text-sm">Subtotal</td>
                  <td className="py-3 text-right tabular-nums font-bold text-slate-900 text-sm">₪{grandTotal.toLocaleString('en-IL', { minimumFractionDigits: 2 })}</td>
                </tr>
                {totalVat > 0 && (
                  <tr className="border-t border-slate-200">
                    <td colSpan={6} className="py-2 text-right font-medium text-slate-700 text-sm">VAT</td>
                    <td className="py-2 text-right tabular-nums font-medium text-slate-700 text-sm">₪{totalVat.toLocaleString('en-IL', { minimumFractionDigits: 2 })}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-slate-900 bg-slate-50">
                  <td colSpan={6} className="py-3 text-right font-bold text-slate-900 uppercase text-base">Grand Total</td>
                  <td className="py-3 text-right tabular-nums font-bold text-slate-900 text-base">₪{(grandTotal + totalVat).toLocaleString('en-IL', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* Summary Report */}
          {reportType === 'summary' && (
            <div className="space-y-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th className="py-2 text-left text-xs font-bold text-slate-700 uppercase">Category</th>
                    <th className="py-2 text-right text-xs font-bold text-slate-700 uppercase w-20">Items</th>
                    <th className="py-2 text-right text-xs font-bold text-slate-700 uppercase w-32">Amount ₪</th>
                    <th className="py-2 text-right text-xs font-bold text-slate-700 uppercase w-20">%</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(categorySummary.entries())
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([cat, data]) => (
                      <tr key={cat} className="border-b border-slate-200">
                        <td className="py-2 text-slate-800 font-medium">{cat}</td>
                        <td className="py-2 text-right tabular-nums text-slate-600">{data.count}</td>
                        <td className="py-2 text-right tabular-nums font-semibold">₪{data.total.toLocaleString('en-IL', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2 text-right tabular-nums text-slate-500">{grandTotal > 0 ? ((data.total / grandTotal) * 100).toFixed(1) : '0.0'}%</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900 bg-slate-50">
                    <td className="py-3 font-bold text-slate-900 uppercase">Total</td>
                    <td className="py-3 text-right tabular-nums font-bold">{regularItems.length}</td>
                    <td className="py-3 text-right tabular-nums font-bold text-slate-900">₪{grandTotal.toLocaleString('en-IL', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 text-right font-bold">100%</td>
                  </tr>
                </tfoot>
              </table>

              {project.budget && (
                <div className="border-t border-slate-200 pt-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Budget</p>
                      <p className="text-lg font-bold text-slate-900 tabular-nums">₪{project.budget.toLocaleString('en-IL')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">BOQ Total</p>
                      <p className="text-lg font-bold text-slate-900 tabular-nums">₪{grandTotal.toLocaleString('en-IL')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Variance</p>
                      <p className={`text-lg font-bold tabular-nums ${grandTotal > (project.budget ?? 0) ? 'text-red-600' : 'text-green-600'}`}>
                        {grandTotal > (project.budget ?? 0) ? '+' : ''}₪{(grandTotal - (project.budget ?? 0)).toLocaleString('en-IL')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantities Report */}
          {reportType === 'quantities' && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="py-2 text-left text-xs font-bold text-slate-700 uppercase">Item Code</th>
                  <th className="py-2 text-left text-xs font-bold text-slate-700 uppercase">Description</th>
                  <th className="py-2 text-left text-xs font-bold text-slate-700 uppercase w-16">Unit</th>
                  <th className="py-2 text-right text-xs font-bold text-slate-700 uppercase w-24">Quantity</th>
                  <th className="py-2 text-left text-xs font-bold text-slate-700 uppercase">Category</th>
                </tr>
              </thead>
              <tbody>
                {boqItems.map((item) => {
                  if (item.is_section_header) {
                    return (
                      <tr key={item.id} className="border-b border-slate-300">
                        <td colSpan={5} className="py-3 font-bold text-slate-900 text-sm uppercase bg-slate-50 px-2">
                          {item.description}
                        </td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className="py-1.5 font-mono text-xs text-slate-600">{item.item_code}</td>
                      <td className="py-1.5 text-slate-800">{item.description}</td>
                      <td className="py-1.5 text-slate-600">{item.unit}</td>
                      <td className="py-1.5 text-right tabular-nums font-semibold">{item.quantity?.toFixed(2) ?? '—'}</td>
                      <td className="py-1.5 text-slate-500 text-xs">{item.category ?? ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Report Footer */}
        <div className="px-8 py-4 border-t border-slate-200 text-xs text-slate-400 print:border-t-2 print:border-black print:text-slate-600">
          <div className="flex justify-between">
            <span>Generated: {new Date().toLocaleString('en-GB')}</span>
            <span>{companyName} · {project.name}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
