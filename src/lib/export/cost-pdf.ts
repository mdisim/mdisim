import type { Project, BOQItem } from '@/lib/types'
import type { ProjectSummary } from '@/app/actions/dashboard'

export function exportCostReportToPDF(project: Project, boqItems: BOQItem[], dashboardData: ProjectSummary) {
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const currency = project.currency

  // Budget summary calculations
  const totalBOQ = boqItems.reduce((sum, item) => sum + (item.total_amount ?? (item.quantity * (item.unit_rate ?? 0))), 0)
  const contractValue = project.budget ?? totalBOQ
  const actualCosts = dashboardData.costEntries
    .filter(e => e.category === 'actual')
    .reduce((sum, e) => sum + e.amount, 0)
  const committedCosts = dashboardData.costEntries
    .filter(e => e.category === 'committed')
    .reduce((sum, e) => sum + e.amount, 0)
  const forecastCosts = dashboardData.costEntries
    .filter(e => e.category === 'forecast')
    .reduce((sum, e) => sum + e.amount, 0)
  const variance = contractValue - actualCosts

  // Cost breakdown by BOQ section
  const sections = groupBySection(boqItems)
  let sectionRows = ''
  for (const [section, sectionItems] of sections) {
    const sectionBOQ = sectionItems.reduce((sum, item) => sum + (item.total_amount ?? (item.quantity * (item.unit_rate ?? 0))), 0)
    const sectionActual = dashboardData.costEntries
      .filter(e => e.category === 'actual' && sectionItems.some(item => item.id === e.boq_item_id))
      .reduce((sum, e) => sum + e.amount, 0)
    const sectionVariance = sectionBOQ - sectionActual
    sectionRows += `<tr>
      <td>${esc(section || 'Unassigned')}</td>
      <td class="num">${fmt(Math.round(sectionBOQ * 100) / 100)}</td>
      <td class="num">${fmt(Math.round(sectionActual * 100) / 100)}</td>
      <td class="num">${fmt(Math.round(sectionVariance * 100) / 100)}</td>
    </tr>`
  }

  // Cost entries breakdown by cost_type
  const costTypeMap = new Map<string, number>()
  for (const entry of dashboardData.costEntries) {
    const key = entry.cost_type
    costTypeMap.set(key, (costTypeMap.get(key) ?? 0) + entry.amount)
  }
  let costTypeRows = ''
  for (const [type, amount] of costTypeMap) {
    const pct = actualCosts + committedCosts + forecastCosts > 0
      ? (amount / (actualCosts + committedCosts + forecastCosts)) * 100
      : 0
    costTypeRows += `<tr>
      <td>${esc(type.charAt(0).toUpperCase() + type.slice(1))}</td>
      <td class="num">${fmt(Math.round(amount * 100) / 100)}</td>
      <td class="num">${fmt(Math.round(pct * 100) / 100)}%</td>
    </tr>`
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Cost Report - ${esc(project.name)}</title>
<style>
  @page { size: A4 landscape; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 10px; color: #1e293b; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #1e40af; }
  .header h1 { font-size: 18px; color: #1e40af; }
  .header .meta { text-align: right; font-size: 9px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #1e40af; color: white; padding: 6px 8px; text-align: left; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
  tr:nth-child(even) { background: #f8fafc; }
  .section td { background: #f1f5f9; font-weight: 700; font-size: 10px; color: #334155; border-bottom: 1px solid #cbd5e1; padding: 8px; }
  .subtotal td { background: #f1f5f9; font-weight: 600; border-top: 1px solid #94a3b8; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .right { text-align: right; }
  .center { text-align: center; }
  .desc { min-width: 200px; }
  .totals { margin-top: 0; }
  .totals td { padding: 6px 8px; font-size: 10px; }
  .totals .grand { background: #1e40af; color: white; font-weight: 700; font-size: 12px; }
  h2 { font-size: 13px; color: #1e40af; margin: 16px 0 8px 0; }
  .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<div class="header">
  <div><h1>Cost Report</h1><div style="font-size:12px;color:#475569;margin-top:2px">${esc(project.name)}</div></div>
  <div class="meta">Currency: ${esc(currency)}<br>Date: ${new Date().toLocaleDateString('en-GB')}<br>${dashboardData.costEntries.length} cost entries</div>
</div>

<h2>Budget Summary</h2>
<table>
  <thead><tr><th>Description</th><th class="num" style="width:140px">Amount (${esc(currency)})</th></tr></thead>
  <tbody>
    <tr><td>Contract Value / Budget</td><td class="num">${fmt(Math.round(contractValue * 100) / 100)}</td></tr>
    <tr><td>Total BOQ Value</td><td class="num">${fmt(Math.round(totalBOQ * 100) / 100)}</td></tr>
    <tr><td>Actual Costs</td><td class="num">${fmt(Math.round(actualCosts * 100) / 100)}</td></tr>
    <tr><td>Committed Costs</td><td class="num">${fmt(Math.round(committedCosts * 100) / 100)}</td></tr>
    <tr><td>Forecast Costs</td><td class="num">${fmt(Math.round(forecastCosts * 100) / 100)}</td></tr>
    <tr class="subtotal"><td>Variance (Budget - Actual)</td><td class="num">${fmt(Math.round(variance * 100) / 100)}</td></tr>
  </tbody>
</table>

<h2>Cost Breakdown by BOQ Section</h2>
<table>
  <thead><tr><th>Section</th><th class="num" style="width:140px">BOQ Amount (${esc(currency)})</th><th class="num" style="width:140px">Actual Cost (${esc(currency)})</th><th class="num" style="width:140px">Variance (${esc(currency)})</th></tr></thead>
  <tbody>${sectionRows}</tbody>
</table>

<h2>Cost Entries by Type</h2>
<table>
  <thead><tr><th>Cost Type</th><th class="num" style="width:140px">Amount (${esc(currency)})</th><th class="num" style="width:100px">% of Total</th></tr></thead>
  <tbody>${costTypeRows}</tbody>
</table>

<div class="footer"><span>Generated by ANGEL D.C.</span><span>Page 1</span></div>
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

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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
