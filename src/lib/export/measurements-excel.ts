import type { MeasurementItem } from '@/lib/types'

export async function exportMeasurementsToExcel(
  items: MeasurementItem[],
  projectName: string
) {
  const XLSX = await import('xlsx')

  const rows: Record<string, unknown>[] = []
  let currentSection = ''

  for (const item of items) {
    if (item.section && item.section !== currentSection) {
      currentSection = item.section
      rows.push({
        'Item Code': '',
        Description: currentSection.toUpperCase(),
        Location: '',
        Nr: '',
        Length: '',
        Width: '',
        Height: '',
        Formula: '',
        Quantity: '',
        Unit: '',
        Type: '',
      })
    }

    rows.push({
      'Item Code': item.item_code ?? '',
      Description: item.description,
      Location: item.location ?? '',
      Nr: '',
      Length: '',
      Width: '',
      Height: '',
      Formula: '',
      Quantity: item.net_qty,
      Unit: item.unit,
      Type: item.measurement_type,
    })

    const lines = item.lines ?? []
    for (const line of lines) {
      rows.push({
        'Item Code': '',
        Description: `  ${line.is_deduction ? '(D) ' : ''}${line.description ?? ''}`,
        Location: line.location ?? '',
        Nr: line.nr,
        Length: line.length ?? '',
        Width: line.width ?? '',
        Height: line.height ?? '',
        Formula: line.formula ?? '',
        Quantity: line.quantity,
        Unit: '',
        Type: '',
      })
    }

    rows.push({
      'Item Code': '',
      Description: `  Net Qty: ${item.net_qty} (Add: ${item.additions_qty}, Ded: ${item.deductions_qty})`,
      Location: '',
      Nr: '',
      Length: '',
      Width: '',
      Height: '',
      Formula: '',
      Quantity: '',
      Unit: '',
      Type: '',
    })
    rows.push({})
  }

  const ws = XLSX.utils.json_to_sheet(rows)

  ws['!cols'] = [
    { wch: 12 },  // Item Code
    { wch: 45 },  // Description
    { wch: 15 },  // Location
    { wch: 8 },   // Nr
    { wch: 10 },  // Length
    { wch: 10 },  // Width
    { wch: 10 },  // Height
    { wch: 20 },  // Formula
    { wch: 12 },  // Quantity
    { wch: 8 },   // Unit
    { wch: 10 },  // Type
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Measurement Book')

  const filename = `Measurements_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, filename)
}
