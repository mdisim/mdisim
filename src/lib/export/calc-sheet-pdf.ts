import type { BOQItem, MeasurementItem, MeasurementLine, MeasurementSketch, QuantityAttachment, QuantityApproval, Drawing, DrawingRevision } from '@/lib/types'
import { getSketchImageUrl } from '@/app/actions/sketches'

export interface CalcSheetReportData {
  boqItem: BOQItem
  item: MeasurementItem
  sketches: MeasurementSketch[]
  attachments: QuantityAttachment[]
  approval: QuantityApproval | null
  drawingsById: Record<string, Drawing>
  revisionsById: Record<string, DrawingRevision>
  projectName: string
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
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
  if (line.page_number != null) parts.push(`Pg ${line.page_number}`)
  return parts.join(' · ') || '—'
}

function formulaText(line: MeasurementLine): string {
  if (line.formula) return line.formula
  const parts: string[] = []
  if (line.nr != null) parts.push(String(line.nr))
  if (line.length != null) parts.push(String(line.length))
  if (line.width != null) parts.push(String(line.width))
  if (line.height != null) parts.push(String(line.height))
  return parts.join(' × ')
}

export async function generateCalcSheetReport(data: CalcSheetReportData): Promise<void> {
  const { boqItem, item, sketches, attachments, approval, drawingsById, revisionsById, projectName } = data
  const lines = (item.lines ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.line_number - b.line_number)

  // Resolve signed URLs for sketch thumbnails
  const sketchUrlById: Record<string, string> = {}
  for (const s of sketches) {
    if (s.file_path) {
      const url = await getSketchImageUrl(s.file_path)
      if (url) sketchUrlById[s.id] = url
    }
  }

  let tableRows = ''
  for (const line of lines) {
    tableRows += `<tr class="${line.is_deduction ? 'deduction' : ''}">
      <td class="center">${line.line_number}</td>
      <td>${esc(line.description ?? '—')}</td>
      <td>${esc(line.location ?? '—')}</td>
      <td>${esc(line.floor_level ?? '—')}</td>
      <td>${esc(sourceRef(line, drawingsById, revisionsById))}</td>
      <td>${esc(line.engineer_name ?? '—')}</td>
      <td>${line.measured_date ? new Date(line.measured_date).toLocaleDateString('en-GB') : '—'}</td>
      <td class="mono">${esc(formulaText(line))}</td>
      <td class="num ${line.is_deduction ? 'neg' : ''}">${line.is_deduction ? '−' : ''}${fmt(Math.abs(line.quantity))}</td>
      <td>${esc(line.notes ?? '')}</td>
    </tr>`

    const lineSketches = sketches.filter((s) => s.line_id === line.id && sketchUrlById[s.id])
    const lineAttachments = attachments.filter((a) => a.line_id === line.id)
    if (lineSketches.length > 0 || lineAttachments.length > 0) {
      tableRows += `<tr class="evidence-row"><td></td><td colspan="9">
        ${lineSketches.length > 0 ? `<div class="sketch-strip">${lineSketches.map((s) => `<img src="${sketchUrlById[s.id]}" alt="Sketch for line ${line.line_number}" />`).join('')}</div>` : ''}
        ${lineAttachments.length > 0 ? `<div class="attachment-tags">${lineAttachments.map((a) => `<span class="tag">📎 ${esc(a.title ?? a.file_name)}</span>`).join('')}</div>` : ''}
      </td></tr>`
    }
  }

  const itemLevelSketches = sketches.filter((s) => !s.line_id && sketchUrlById[s.id])
  const itemLevelAttachments = attachments.filter((a) => !a.line_id)

  const attachmentRows = itemLevelAttachments.map((a) => `<tr>
    <td>${esc(a.title ?? a.file_name)}</td>
    <td class="center">${esc(a.category)}</td>
    <td class="center">${esc(a.file_type)}</td>
    <td>${new Date(a.created_at).toLocaleDateString('en-GB')}</td>
  </tr>`).join('')

  const subtotal = item.additions_qty ?? 0
  const deductions = item.deductions_qty ?? 0
  const net = item.net_qty ?? 0
  const approvedQty = approval?.approved_quantity ?? net

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Quantity Calculation Sheet - ${esc(boqItem.description)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 10px; color: #1e293b; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #1e40af; }
  .header h1 { font-size: 17px; color: #1e40af; }
  .header .meta { text-align: right; font-size: 9px; color: #64748b; }
  .info-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 14px; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
  .info-grid .label { font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; }
  .info-grid .value { font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 1px; }
  .section-title { font-size: 10px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; margin: 14px 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e40af; color: white; padding: 5px 6px; text-align: left; font-weight: 600; font-size: 8px; text-transform: uppercase; letter-spacing: 0.3px; }
  td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; font-size: 9px; vertical-align: top; }
  tr.deduction td { background: #fef2f2; }
  .mono { font-family: 'SF Mono', Consolas, monospace; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .num.neg { color: #dc2626; }
  .center { text-align: center; }
  .evidence-row td { border-bottom: 1px solid #e2e8f0; padding: 4px 6px 8px; }
  .sketch-strip { display: flex; gap: 6px; flex-wrap: wrap; }
  .sketch-strip img { max-height: 90px; max-width: 160px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 4px; }
  .attachment-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
  .attachment-tags .tag { font-size: 8px; background: #f1f5f9; color: #475569; padding: 3px 6px; border-radius: 4px; border: 1px solid #e2e8f0; }
  .summary { margin-top: 14px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
  .summary .label { font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; }
  .summary .value { font-size: 13px; font-weight: 700; margin-top: 2px; }
  .summary .value.amber { color: #b45309; }
  .summary .value.red { color: #dc2626; }
  .signatures { margin-top: 28px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .signature-box { border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 9px; color: #475569; }
  .signature-box .role { font-weight: 700; color: #1e293b; }
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>

<div class="header">
  <div><h1>Quantity Calculation Sheet</h1><div style="font-size:11px;color:#475569;margin-top:2px">${esc(projectName)}</div></div>
  <div class="meta">Date: ${new Date().toLocaleDateString('en-GB')}<br>Item: ${esc(boqItem.code ?? '—')}</div>
</div>

<div class="info-grid">
  <div><div class="label">Item No.</div><div class="value">${esc(boqItem.code ?? '—')}</div></div>
  <div style="grid-column: span 2"><div class="label">Description</div><div class="value">${esc(boqItem.description)}</div></div>
  <div><div class="label">Unit</div><div class="value">${esc(boqItem.unit)}</div></div>
  <div><div class="label">Total Quantity</div><div class="value">${fmt(boqItem.quantity)}</div></div>
  <div><div class="label">Unit Rate</div><div class="value">${fmt(boqItem.unit_rate ?? 0)}</div></div>
  <div><div class="label">Total Amount</div><div class="value">${fmt(boqItem.total_amount ?? 0)}</div></div>
</div>

<div class="section-title">Calculation Breakdown</div>
<table>
  <thead><tr>
    <th style="width:24px">#</th><th>Description</th><th style="width:70px">Location</th><th style="width:60px">Floor/Level</th>
    <th style="width:120px">Drawing / Rev / Pg</th><th style="width:70px">Engineer</th><th style="width:60px">Date</th>
    <th style="width:100px">Formula</th><th class="num" style="width:60px">Qty</th><th>Notes</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
</table>

${itemLevelSketches.length > 0 ? `
<div class="section-title">Sketches</div>
<div class="sketch-strip">${itemLevelSketches.map((s) => `<img src="${sketchUrlById[s.id]}" alt="Sketch" />`).join('')}</div>
` : ''}

${itemLevelAttachments.length > 0 ? `
<div class="section-title">General Attachments (item-level)</div>
<table>
  <thead><tr><th>File</th><th class="center" style="width:90px">Category</th><th class="center" style="width:60px">Type</th><th style="width:70px">Uploaded</th></tr></thead>
  <tbody>${attachmentRows}</tbody>
</table>
` : ''}

<div class="section-title">Summary</div>
<div class="summary">
  <div><div class="label">Subtotal</div><div class="value">${fmt(subtotal)} ${esc(item.unit)}</div></div>
  <div><div class="label">Deductions</div><div class="value red">−${fmt(deductions)} ${esc(item.unit)}</div></div>
  <div><div class="label">Net Quantity</div><div class="value">${fmt(net)} ${esc(item.unit)}</div></div>
  <div><div class="label">Approved Quantity</div><div class="value amber">${fmt(approvedQty)} ${esc(item.unit)}</div></div>
  <div><div class="label">Status</div><div class="value">${esc(approval?.status ?? 'pending')}</div></div>
</div>

<div class="signatures">
  <div class="signature-box"><div class="role">Prepared by</div>Engineer / QS<br>Date: ____________</div>
  <div class="signature-box"><div class="role">Checked by</div>Senior QS / Reviewer<br>Date: ____________</div>
  <div class="signature-box"><div class="role">Approved by</div>${esc(approval?.approver_name ?? '________________')}<br>Date: ${approval ? new Date(approval.approved_at).toLocaleDateString('en-GB') : '____________'}</div>
</div>

<div class="footer"><span>Quantity Calculation Sheet — Generated for consultant/client submission</span><span>Page 1</span></div>
<script>window.onload=()=>{window.print();}<\/script>
</body></html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  } else {
    throw new Error('Pop-up blocked. Please allow pop-ups for this site to export PDF.')
  }
}
