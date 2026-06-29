import type { Project } from '@/lib/types'
import type { ProjectSummary } from '@/app/actions/dashboard'

export function exportEVMReportToPDF(project: Project, evmData: ProjectSummary) {
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtPct = (n: number) => isFinite(n) ? fmt(Math.round(n * 10000) / 10000) : 'N/A'
  const currency = project.currency

  // EVM calculations
  const BAC = evmData.boqItems.reduce((sum, item) => sum + (item.total_amount ?? (item.quantity * (item.unit_rate ?? 0))), 0)
  const AC = evmData.costEntries
    .filter(e => e.category === 'actual')
    .reduce((sum, e) => sum + e.amount, 0)
  const progress = project.progress ?? 0
  const EV = BAC * (progress / 100)

  // Time elapsed calculation
  const startDate = project.start_date ? new Date(project.start_date).getTime() : Date.now()
  const endDate = project.end_date ? new Date(project.end_date).getTime() : Date.now()
  const now = Date.now()
  const totalDuration = endDate - startDate
  const elapsed = Math.min(now - startDate, totalDuration)
  const timeRatio = totalDuration > 0 ? Math.max(0, elapsed / totalDuration) : 0
  const PV = BAC * timeRatio

  const SPI = PV !== 0 ? EV / PV : 0
  const CPI = AC !== 0 ? EV / AC : 0
  const EAC = CPI !== 0 ? BAC / CPI : 0
  const ETC = EAC - AC
  const VAC = BAC - EAC

  const spiStatus = SPI >= 1 ? 'Ahead of Schedule' : 'Behind Schedule'
  const cpiStatus = CPI >= 1 ? 'Under Budget' : 'Over Budget'

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>EVM Report - ${esc(project.name)}</title>
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
  <div><h1>Earned Value Management Report</h1><div style="font-size:12px;color:#475569;margin-top:2px">${esc(project.name)}</div></div>
  <div class="meta">Currency: ${esc(currency)}<br>Date: ${new Date().toLocaleDateString('en-GB')}<br>Progress: ${progress}%</div>
</div>

<h2>EVM Metrics</h2>
<table>
  <thead><tr><th>Metric</th><th>Description</th><th class="num" style="width:160px">Value (${esc(currency)})</th></tr></thead>
  <tbody>
    <tr><td><strong>BAC</strong></td><td>Budget at Completion</td><td class="num">${fmt(Math.round(BAC * 100) / 100)}</td></tr>
    <tr><td><strong>PV</strong></td><td>Planned Value</td><td class="num">${fmt(Math.round(PV * 100) / 100)}</td></tr>
    <tr><td><strong>EV</strong></td><td>Earned Value</td><td class="num">${fmt(Math.round(EV * 100) / 100)}</td></tr>
    <tr><td><strong>AC</strong></td><td>Actual Cost</td><td class="num">${fmt(Math.round(AC * 100) / 100)}</td></tr>
    <tr><td><strong>SV</strong></td><td>Schedule Variance (EV - PV)</td><td class="num">${fmt(Math.round((EV - PV) * 100) / 100)}</td></tr>
    <tr><td><strong>CV</strong></td><td>Cost Variance (EV - AC)</td><td class="num">${fmt(Math.round((EV - AC) * 100) / 100)}</td></tr>
    <tr><td><strong>EAC</strong></td><td>Estimate at Completion</td><td class="num">${fmt(Math.round(EAC * 100) / 100)}</td></tr>
    <tr><td><strong>ETC</strong></td><td>Estimate to Complete</td><td class="num">${fmt(Math.round(ETC * 100) / 100)}</td></tr>
    <tr><td><strong>VAC</strong></td><td>Variance at Completion</td><td class="num">${fmt(Math.round(VAC * 100) / 100)}</td></tr>
  </tbody>
</table>

<h2>Performance Indicators</h2>
<table>
  <thead><tr><th>Indicator</th><th>Description</th><th class="num" style="width:100px">Value</th><th style="width:160px">Status</th></tr></thead>
  <tbody>
    <tr><td><strong>SPI</strong></td><td>Schedule Performance Index (EV / PV)</td><td class="num">${fmtPct(SPI)}</td><td>${esc(spiStatus)}</td></tr>
    <tr><td><strong>CPI</strong></td><td>Cost Performance Index (EV / AC)</td><td class="num">${fmtPct(CPI)}</td><td>${esc(cpiStatus)}</td></tr>
    <tr><td><strong>TCPI</strong></td><td>To-Complete Performance Index</td><td class="num">${fmtPct((BAC - EV) / (BAC - AC))}</td><td>${(BAC - EV) / (BAC - AC) > 1 ? 'Harder to achieve' : 'Achievable'}</td></tr>
    <tr><td><strong>Time Elapsed</strong></td><td>Percentage of project duration elapsed</td><td class="num">${fmt(Math.round(timeRatio * 10000) / 100)}%</td><td></td></tr>
    <tr><td><strong>Progress</strong></td><td>Physical completion</td><td class="num">${progress}%</td><td></td></tr>
  </tbody>
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
