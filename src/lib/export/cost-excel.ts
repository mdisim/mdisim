import type { Project, BOQItem } from '@/lib/types'
import type { ProjectSummary } from '@/app/actions/dashboard'

export async function exportCostReportToExcel(project: Project, boqItems: BOQItem[], dashboardData: ProjectSummary) {
  const XLSX = await import('xlsx')

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

  // Sheet 1: Budget Summary
  const summaryRows: Record<string, unknown>[] = [
    { Description: 'Contract Value / Budget', [`Amount (${currency})`]: Math.round(contractValue * 100) / 100 },
    { Description: 'Total BOQ Value', [`Amount (${currency})`]: Math.round(totalBOQ * 100) / 100 },
    { Description: 'Actual Costs', [`Amount (${currency})`]: Math.round(actualCosts * 100) / 100 },
    { Description: 'Committed Costs', [`Amount (${currency})`]: Math.round(committedCosts * 100) / 100 },
    { Description: 'Forecast Costs', [`Amount (${currency})`]: Math.round(forecastCosts * 100) / 100 },
    {},
    { Description: 'Variance (Budget - Actual)', [`Amount (${currency})`]: Math.round(variance * 100) / 100 },
  ]

  const ws1 = XLSX.utils.json_to_sheet(summaryRows)
  ws1['!cols'] = [
    { wch: 30 },  // Description
    { wch: 20 },  // Amount
  ]

  // Sheet 2: Cost Breakdown by Section
  const sections = groupBySection(boqItems)
  const breakdownRows: Record<string, unknown>[] = []

  for (const [section, sectionItems] of sections) {
    const sectionBOQ = sectionItems.reduce((sum, item) => sum + (item.total_amount ?? (item.quantity * (item.unit_rate ?? 0))), 0)
    const sectionActual = dashboardData.costEntries
      .filter(e => e.category === 'actual' && sectionItems.some(item => item.id === e.boq_item_id))
      .reduce((sum, e) => sum + e.amount, 0)
    const sectionVariance = sectionBOQ - sectionActual

    breakdownRows.push({
      Section: section || 'Unassigned',
      [`BOQ Amount (${currency})`]: Math.round(sectionBOQ * 100) / 100,
      [`Actual Cost (${currency})`]: Math.round(sectionActual * 100) / 100,
      [`Variance (${currency})`]: Math.round(sectionVariance * 100) / 100,
    })
  }

  const ws2 = XLSX.utils.json_to_sheet(breakdownRows)
  ws2['!cols'] = [
    { wch: 30 },  // Section
    { wch: 20 },  // BOQ Amount
    { wch: 20 },  // Actual Cost
    { wch: 20 },  // Variance
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws1, 'Budget Summary')
  XLSX.utils.book_append_sheet(wb, ws2, 'Cost Breakdown')

  const filename = `Cost_Report_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
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
