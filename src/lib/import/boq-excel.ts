export interface ImportedBOQRow {
  code?: string
  description: string
  unit: string
  quantity: number
  unit_rate: number
  section?: string
  notes?: string
}

export async function parseBOQExcel(file: File): Promise<{ rows: ImportedBOQRow[]; error?: string }> {
  try {
    const XLSX = await import('xlsx')
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) return { rows: [], error: 'No sheets found in workbook' }

    const sheet = wb.Sheets[sheetName]
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

    if (raw.length === 0) return { rows: [], error: 'Sheet is empty' }

    const headers = Object.keys(raw[0])
    const find = (candidates: string[]) =>
      headers.find(h => candidates.some(c => h.toLowerCase().replace(/[^a-z]/g, '').includes(c)))

    const codeCol = find(['code', 'itemcode', 'itemno', 'no', 'ref'])
    const descCol = find(['description', 'desc', 'item', 'particular'])
    const unitCol = find(['unit', 'uom'])
    const qtyCol = find(['quantity', 'qty', 'amount'])
    const rateCol = find(['rate', 'unitrate', 'price', 'unitprice'])
    const sectionCol = find(['section', 'category', 'group', 'trade'])
    const notesCol = find(['notes', 'remarks', 'comment'])

    if (!descCol) {
      return { rows: [], error: `Could not find a Description column. Found columns: ${headers.join(', ')}` }
    }

    const rows: ImportedBOQRow[] = []
    let currentSection = ''

    for (const row of raw) {
      const desc = String(row[descCol] ?? '').trim()
      if (!desc) continue

      const hasQty = qtyCol && row[qtyCol] != null && row[qtyCol] !== ''
      const hasUnit = unitCol && row[unitCol] != null && String(row[unitCol]).trim() !== ''

      // Heuristic: rows with description but no unit/qty are section headers
      if (!hasUnit && !hasQty && desc.length < 80) {
        currentSection = desc
        continue
      }

      rows.push({
        code: codeCol ? String(row[codeCol] ?? '').trim() || undefined : undefined,
        description: desc,
        unit: unitCol ? String(row[unitCol] ?? 'm').trim() : 'm',
        quantity: qtyCol ? parseFloat(String(row[qtyCol])) || 0 : 0,
        unit_rate: rateCol ? parseFloat(String(row[rateCol])) || 0 : 0,
        section: sectionCol ? String(row[sectionCol] ?? '').trim() || currentSection || undefined : currentSection || undefined,
        notes: notesCol ? String(row[notesCol] ?? '').trim() || undefined : undefined,
      })
    }

    return { rows }
  } catch (e) {
    return { rows: [], error: `Failed to parse Excel: ${e instanceof Error ? e.message : 'Unknown error'}` }
  }
}
