import type { BOQItem, MeasurementItem, MeasurementLine, QuantityAttachment, QuantityApproval, Drawing, DrawingRevision } from '@/lib/types'

export interface CalcSheetExcelData {
  boqItem: BOQItem
  item: MeasurementItem
  attachments: QuantityAttachment[]
  approval: QuantityApproval | null
  drawingsById: Record<string, Drawing>
  revisionsById: Record<string, DrawingRevision>
  projectName: string
}

function sourceRef(line: MeasurementLine, drawingsById: Record<string, Drawing>, revisionsById: Record<string, DrawingRevision>): string {
  const parts: string[] = []
  if (line.drawing_id && drawingsById[line.drawing_id]) {
    const d = drawingsById[line.drawing_id]
    parts.push(d.name + (d.drawing_number ? ` (${d.drawing_number})` : ''))
  }
  if (line.revision_id && revisionsById[line.revision_id]) {
    parts.push(`Rev ${revisionsById[line.revision_id].revision_number}`)
  }
  return parts.join(' ')
}

function formulaText(line: MeasurementLine): string {
  if (line.formula) return line.formula
  const parts: string[] = []
  if (line.nr != null) parts.push(String(line.nr))
  if (line.length != null) parts.push(String(line.length))
  if (line.width != null) parts.push(String(line.width))
  if (line.height != null) parts.push(String(line.height))
  return parts.join(' x ')
}

export async function exportCalcSheetToExcel(data: CalcSheetExcelData): Promise<void> {
  const { boqItem, item, attachments, approval, drawingsById, revisionsById, projectName } = data
  const XLSX = await import('xlsx')
  const lines = (item.lines ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.line_number - b.line_number)

  // Sheet 1: Calculation lines
  const calcRows = lines.map((line) => ({
    '#': line.line_number,
    Description: line.description ?? '',
    Location: line.location ?? '',
    'Floor/Level': line.floor_level ?? '',
    Drawing: line.drawing_id && drawingsById[line.drawing_id] ? drawingsById[line.drawing_id].name : '',
    'Drawing No.': line.drawing_id && drawingsById[line.drawing_id] ? drawingsById[line.drawing_id].drawing_number ?? '' : '',
    Revision: sourceRef(line, drawingsById, revisionsById),
    Page: line.page_number ?? '',
    Engineer: line.engineer_name ?? '',
    Date: line.measured_date ?? '',
    Nr: line.nr ?? '',
    Length: line.length ?? '',
    Width: line.width ?? '',
    Height: line.height ?? '',
    Formula: formulaText(line),
    'Deduction?': line.is_deduction ? 'Yes' : 'No',
    Quantity: line.quantity,
    Notes: line.notes ?? '',
    Attachments: attachments.filter((a) => a.line_id === line.id).map((a) => a.title ?? a.file_name).join(', '),
  }))
  const wsCalc = XLSX.utils.json_to_sheet(calcRows)
  wsCalc['!cols'] = [
    { wch: 4 }, { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 6 },
    { wch: 16 }, { wch: 12 }, { wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 30 },
  ]

  // Sheet 2: Summary
  const summaryRows = [
    { Field: 'Item No.', Value: boqItem.code ?? '' },
    { Field: 'Description', Value: boqItem.description },
    { Field: 'Unit', Value: boqItem.unit },
    { Field: 'Total Quantity', Value: boqItem.quantity },
    { Field: 'Unit Rate', Value: boqItem.unit_rate ?? 0 },
    { Field: 'Total Amount', Value: boqItem.total_amount ?? 0 },
    { Field: '', Value: '' },
    { Field: 'Subtotal (Additions)', Value: item.additions_qty ?? 0 },
    { Field: 'Deductions', Value: -(item.deductions_qty ?? 0) },
    { Field: 'Net Quantity', Value: item.net_qty ?? 0 },
    { Field: 'Approved Quantity', Value: approval?.approved_quantity ?? item.net_qty ?? 0 },
    { Field: 'Approval Status', Value: approval?.status ?? 'pending' },
    { Field: 'Approver', Value: approval?.approver_name ?? '' },
    { Field: 'Approved At', Value: approval?.approved_at ?? '' },
  ]
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows, { skipHeader: true })
  wsSummary['!cols'] = [{ wch: 22 }, { wch: 40 }]

  // Sheet 3: Attachments
  const lineNumberById = Object.fromEntries(lines.map((l) => [l.id, l.line_number]))
  const attachmentRows = attachments.map((a) => ({
    File: a.title ?? a.file_name,
    Line: a.line_id ? `Line ${lineNumberById[a.line_id] ?? '?'}` : 'Item-level',
    Category: a.category,
    Type: a.file_type,
    'Uploaded At': a.created_at,
  }))
  const wsAttachments = XLSX.utils.json_to_sheet(attachmentRows.length > 0 ? attachmentRows : [{ File: 'No attachments', Line: '', Category: '', Type: '', 'Uploaded At': '' }])
  wsAttachments['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 20 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsCalc, 'Calculation')
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')
  XLSX.utils.book_append_sheet(wb, wsAttachments, 'Attachments')

  const filename = `QuantityCalcSheet_${(boqItem.code ?? boqItem.description).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, filename)
}
