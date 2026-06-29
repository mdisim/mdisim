import type { Project } from '@/lib/types'
import type { ProjectSummary } from '@/app/actions/dashboard'

export async function exportEVMReportToExcel(project: Project, evmData: ProjectSummary) {
  const XLSX = await import('xlsx')

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

  const round = (n: number) => Math.round(n * 100) / 100

  const rows: Record<string, unknown>[] = [
    { Metric: 'BAC', Description: 'Budget at Completion', [`Value (${currency})`]: round(BAC) },
    { Metric: 'PV', Description: 'Planned Value', [`Value (${currency})`]: round(PV) },
    { Metric: 'EV', Description: 'Earned Value', [`Value (${currency})`]: round(EV) },
    { Metric: 'AC', Description: 'Actual Cost', [`Value (${currency})`]: round(AC) },
    { Metric: 'SV', Description: 'Schedule Variance (EV - PV)', [`Value (${currency})`]: round(EV - PV) },
    { Metric: 'CV', Description: 'Cost Variance (EV - AC)', [`Value (${currency})`]: round(EV - AC) },
    { Metric: 'EAC', Description: 'Estimate at Completion', [`Value (${currency})`]: round(EAC) },
    { Metric: 'ETC', Description: 'Estimate to Complete', [`Value (${currency})`]: round(ETC) },
    { Metric: 'VAC', Description: 'Variance at Completion', [`Value (${currency})`]: round(VAC) },
    {},
    { Metric: 'SPI', Description: 'Schedule Performance Index', [`Value (${currency})`]: round(SPI) },
    { Metric: 'CPI', Description: 'Cost Performance Index', [`Value (${currency})`]: round(CPI) },
    { Metric: 'TCPI', Description: 'To-Complete Performance Index', [`Value (${currency})`]: isFinite((BAC - EV) / (BAC - AC)) ? round((BAC - EV) / (BAC - AC)) : 'N/A' },
    {},
    { Metric: 'Time Elapsed', Description: 'Percentage of project duration elapsed', [`Value (${currency})`]: `${round(timeRatio * 100)}%` },
    { Metric: 'Progress', Description: 'Physical completion', [`Value (${currency})`]: `${progress}%` },
  ]

  const ws = XLSX.utils.json_to_sheet(rows)

  ws['!cols'] = [
    { wch: 16 },  // Metric
    { wch: 40 },  // Description
    { wch: 20 },  // Value
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'EVM Report')

  const filename = `EVM_Report_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, filename)
}
