'use client'

import * as XLSX from 'xlsx'

type SummaryRow = {
  diameterMm: number
  totalBars: number
  totalLengthMm: number
  totalWeightKg: number
}

type StockRow = {
  diameterMm: number
  totalLengthM: number
  stockBarsNeeded: number
  usedLengthM: number
  wasteLengthM: number
  wastePercent: number
}

type ElementRow = {
  element_mark: string
  element_type: string
  floor_level: string | null
  weight: number
}

interface Props {
  projectName: string
  summary: SummaryRow[]
  stockData: StockRow[]
  elementRows: ElementRow[]
  grandTotalKg: number
}

export function ProcurementActions({ projectName, summary, stockData, elementRows, grandTotalKg }: Props) {
  const handleExport = () => {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Purchase Order Summary
    const poData = [
      ['PROCUREMENT REPORT'],
      ['Project', projectName],
      ['Date', new Date().toLocaleDateString()],
      [],
      ['PURCHASE ORDER SUMMARY'],
      ['Grand Total Weight (kg)', grandTotalKg.toFixed(2)],
      ['Grand Total Weight (tonnes)', (grandTotalKg / 1000).toFixed(3)],
      ['Estimated Cost (₪)', (grandTotalKg / 1000 * 4200).toFixed(0)],
      ['Number of Bar Diameters', summary.length],
      ['Total Bar Count', summary.reduce((s, r) => s + r.totalBars, 0)],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(poData)
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary')

    // Sheet 2: By Diameter
    const diamData = [
      ['Diameter', 'Total Bars', 'Total Length (m)', 'Weight (kg)', 'Weight (t)', '% of Total'],
      ...summary.map(r => [
        `T${r.diameterMm}`,
        r.totalBars,
        (r.totalLengthMm / 1000).toFixed(2),
        r.totalWeightKg.toFixed(2),
        (r.totalWeightKg / 1000).toFixed(3),
        grandTotalKg > 0 ? ((r.totalWeightKg / grandTotalKg) * 100).toFixed(1) + '%' : '0%',
      ]),
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(diamData)
    XLSX.utils.book_append_sheet(wb, ws2, 'By Diameter')

    // Sheet 3: Stock Length Optimization
    const stockSheetData = [
      ['Diameter', 'Total Length (m)', '12m Bars Needed', 'Used Length (m)', 'Waste (m)', 'Waste %'],
      ...stockData.map(r => [
        `T${r.diameterMm}`,
        r.totalLengthM.toFixed(2),
        r.stockBarsNeeded,
        r.usedLengthM.toFixed(2),
        r.wasteLengthM.toFixed(2),
        r.wastePercent.toFixed(1) + '%',
      ]),
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(stockSheetData)
    XLSX.utils.book_append_sheet(wb, ws3, 'Stock Optimization')

    // Sheet 4: By Element
    const elemData = [
      ['Element Mark', 'Type', 'Level', 'Weight (kg)', '% of Total'],
      ...elementRows.map(r => [
        r.element_mark,
        r.element_type,
        r.floor_level ?? '—',
        r.weight.toFixed(3),
        grandTotalKg > 0 ? ((r.weight / grandTotalKg) * 100).toFixed(1) + '%' : '0%',
      ]),
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(elemData)
    XLSX.utils.book_append_sheet(wb, ws4, 'By Element')

    XLSX.writeFile(wb, `${projectName.replace(/\s+/g, '_')}_Procurement.xlsx`)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex gap-3 print:hidden">
      <button
        onClick={handleExport}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export Excel
      </button>
      <button
        onClick={handlePrint}
        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print
      </button>
    </div>
  )
}
