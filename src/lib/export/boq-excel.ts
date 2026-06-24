import type { BOQItem } from '@/lib/types'

export async function exportBOQToExcel(
  items: BOQItem[],
  projectName: string,
  currency: string,
  vatPct: number
) {
  const XLSX = await import('xlsx')

  const sections = groupBySection(items)
  const rows: Record<string, unknown>[] = []

  let grandSubtotal = 0

  for (const [section, sectionItems] of sections) {
    if (section) {
      rows.push({
        Code: '',
        Description: section.toUpperCase(),
        Unit: '',
        Quantity: '',
        'Unit Rate': '',
        'Material Rate': '',
        'Labor Rate': '',
        'Equipment Rate': '',
        Amount: '',
      })
    }

    let sectionTotal = 0
    for (const item of sectionItems) {
      const amount = item.total_amount ?? (item.quantity * (item.unit_rate ?? 0))
      sectionTotal += amount
      rows.push({
        Code: item.code ?? '',
        Description: item.description,
        Unit: item.unit,
        Quantity: item.quantity,
        'Unit Rate': item.unit_rate ?? 0,
        'Material Rate': item.material_rate ?? '',
        'Labor Rate': item.labor_rate ?? '',
        'Equipment Rate': item.equipment_rate ?? '',
        Amount: Math.round(amount * 100) / 100,
      })
    }

    if (section) {
      rows.push({
        Code: '',
        Description: `${section} Subtotal`,
        Unit: '',
        Quantity: '',
        'Unit Rate': '',
        'Material Rate': '',
        'Labor Rate': '',
        'Equipment Rate': '',
        Amount: Math.round(sectionTotal * 100) / 100,
      })
      rows.push({})
    }
    grandSubtotal += sectionTotal
  }

  const vatAmount = grandSubtotal * (vatPct / 100)
  const grandTotal = grandSubtotal + vatAmount

  rows.push({})
  rows.push({
    Code: '',
    Description: 'SUBTOTAL',
    Unit: '',
    Quantity: '',
    'Unit Rate': '',
    'Material Rate': '',
    'Labor Rate': '',
    'Equipment Rate': '',
    Amount: Math.round(grandSubtotal * 100) / 100,
  })
  rows.push({
    Code: '',
    Description: `VAT (${vatPct}%)`,
    Unit: '',
    Quantity: '',
    'Unit Rate': '',
    'Material Rate': '',
    'Labor Rate': '',
    'Equipment Rate': '',
    Amount: Math.round(vatAmount * 100) / 100,
  })
  rows.push({
    Code: '',
    Description: 'GRAND TOTAL',
    Unit: '',
    Quantity: '',
    'Unit Rate': '',
    'Material Rate': '',
    'Labor Rate': '',
    'Equipment Rate': '',
    Amount: Math.round(grandTotal * 100) / 100,
  })

  const ws = XLSX.utils.json_to_sheet(rows)

  // Column widths
  ws['!cols'] = [
    { wch: 12 },  // Code
    { wch: 40 },  // Description
    { wch: 8 },   // Unit
    { wch: 12 },  // Quantity
    { wch: 14 },  // Unit Rate
    { wch: 14 },  // Material Rate
    { wch: 14 },  // Labor Rate
    { wch: 14 },  // Equipment Rate
    { wch: 16 },  // Amount
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'BOQ')

  const filename = `BOQ_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, filename)
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
