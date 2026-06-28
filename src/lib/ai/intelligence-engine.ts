import type { ProjectContext } from './context'

export interface HealthScore {
  overall: number
  dimensions: HealthDimension[]
  alerts: Alert[]
  recommendations: Recommendation[]
  summary: string
}

export interface HealthDimension {
  id: string
  label: string
  score: number
  maxScore: number
  status: 'good' | 'warning' | 'critical'
  details: string
  items: string[]
}

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertCategory = 'boq' | 'quantity' | 'cost' | 'drawing' | 'contract' | 'payment' | 'schedule' | 'quality'

export interface Alert {
  id: string
  severity: AlertSeverity
  category: AlertCategory
  title: string
  description: string
  action?: string
  affectedItems?: string[]
}

export interface Recommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  category: AlertCategory
  title: string
  description: string
  impact: string
  effort: 'quick' | 'moderate' | 'significant'
}

export function analyzeProjectHealth(ctx: ProjectContext): HealthScore {
  const dimensions: HealthDimension[] = []
  const alerts: Alert[] = []
  const recommendations: Recommendation[] = []
  let alertIndex = 0
  let recIndex = 0

  // 1. BOQ Completeness
  const boqCompleteness = analyzeBOQCompleteness(ctx, alerts, recommendations, alertIndex, recIndex)
  dimensions.push(boqCompleteness.dimension)
  alertIndex = boqCompleteness.alertIndex
  recIndex = boqCompleteness.recIndex

  // 2. Quantity Accuracy
  const qtyAccuracy = analyzeQuantityAccuracy(ctx, alerts, recommendations, alertIndex, recIndex)
  dimensions.push(qtyAccuracy.dimension)
  alertIndex = qtyAccuracy.alertIndex
  recIndex = qtyAccuracy.recIndex

  // 3. Cost Risk
  const costRisk = analyzeCostRisk(ctx, alerts, recommendations, alertIndex, recIndex)
  dimensions.push(costRisk.dimension)
  alertIndex = costRisk.alertIndex
  recIndex = costRisk.recIndex

  // 4. Missing Items
  const missing = analyzeMissingItems(ctx, alerts, recommendations, alertIndex, recIndex)
  dimensions.push(missing.dimension)
  alertIndex = missing.alertIndex
  recIndex = missing.recIndex

  // 5. Duplicate Items
  const duplicates = analyzeDuplicates(ctx, alerts, recommendations, alertIndex, recIndex)
  dimensions.push(duplicates.dimension)
  alertIndex = duplicates.alertIndex
  recIndex = duplicates.recIndex

  // 6. Drawing Consistency
  const drawings = analyzeDrawingConsistency(ctx, alerts, recommendations, alertIndex, recIndex)
  dimensions.push(drawings.dimension)
  alertIndex = drawings.alertIndex
  recIndex = drawings.recIndex

  // 7. Contract Compliance
  const contract = analyzeContractCompliance(ctx, alerts, recommendations, alertIndex, recIndex)
  dimensions.push(contract.dimension)
  alertIndex = contract.alertIndex
  recIndex = contract.recIndex

  // 8. Progress Status
  const progress = analyzeProgressStatus(ctx, alerts, recommendations, alertIndex, recIndex)
  dimensions.push(progress.dimension)
  alertIndex = progress.alertIndex
  recIndex = progress.recIndex

  // 9. Payment Status
  const payment = analyzePaymentStatus(ctx, alerts, recommendations, alertIndex, recIndex)
  dimensions.push(payment.dimension)
  alertIndex = payment.alertIndex
  recIndex = payment.recIndex

  // 10. Revision Impact
  const revision = analyzeRevisionImpact(ctx, alerts, recommendations, alertIndex, recIndex)
  dimensions.push(revision.dimension)

  const overall = Math.round(dimensions.reduce((sum, d) => sum + (d.score / d.maxScore) * 10, 0))

  const critCount = alerts.filter(a => a.severity === 'critical').length
  const warnCount = alerts.filter(a => a.severity === 'warning').length
  let summary = ''
  if (overall >= 80) summary = 'Project is in good health. Keep up the excellent work.'
  else if (overall >= 60) summary = `Project needs attention. ${warnCount} warning${warnCount !== 1 ? 's' : ''} and ${critCount} critical issue${critCount !== 1 ? 's' : ''} detected.`
  else summary = `Project requires urgent attention. ${critCount} critical issue${critCount !== 1 ? 's' : ''} found that could impact cost and schedule.`

  alerts.sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, info: 2 }
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2)
  })
  recommendations.sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2)
  })

  return { overall, dimensions, alerts, recommendations, summary }
}

interface AnalysisResult {
  dimension: HealthDimension
  alertIndex: number
  recIndex: number
}

function analyzeBOQCompleteness(ctx: ProjectContext, alerts: Alert[], recs: Recommendation[], ai: number, ri: number): AnalysisResult {
  const boq = ctx.boqItems
  const total = boq.length
  const withRate = boq.filter(i => Number(i.unit_rate) > 0).length
  const withQty = boq.filter(i => Number(i.quantity) > 0).length
  const withCode = boq.filter(i => i.code).length
  const withSection = boq.filter(i => i.section).length

  let score = 10
  const items: string[] = []

  if (total === 0) {
    score = 0
    items.push('No BOQ items exist')
    alerts.push({ id: `a-${ai++}`, severity: 'critical', category: 'boq', title: 'Empty BOQ', description: 'No items in the Bill of Quantities. The BOQ needs to be created.', action: 'Create BOQ items from measurements or manually' })
    recs.push({ id: `r-${ri++}`, priority: 'high', category: 'boq', title: 'Create BOQ', description: 'Generate a BOQ from your measurements or use AI to detect items from drawings.', impact: 'Cannot proceed with costing without BOQ', effort: 'moderate' })
  } else {
    const rateRatio = withRate / total
    const qtyRatio = withQty / total
    const codeRatio = withCode / total

    if (rateRatio < 0.5) {
      score -= 3
      items.push(`${total - withRate} items missing unit rates`)
      alerts.push({ id: `a-${ai++}`, severity: 'warning', category: 'boq', title: 'Missing unit rates', description: `${total - withRate} of ${total} BOQ items have no unit rate. Cost estimates will be incomplete.`, affectedItems: boq.filter(i => !Number(i.unit_rate)).map(i => String(i.description)).slice(0, 5) })
    } else if (rateRatio < 0.9) {
      score -= 1
      items.push(`${total - withRate} items missing rates`)
    }

    if (qtyRatio < 0.5) {
      score -= 3
      items.push(`${total - withQty} items missing quantities`)
      alerts.push({ id: `a-${ai++}`, severity: 'warning', category: 'boq', title: 'Missing quantities', description: `${total - withQty} BOQ items have zero quantity.`, affectedItems: boq.filter(i => !Number(i.quantity)).map(i => String(i.description)).slice(0, 5) })
    } else if (qtyRatio < 0.9) {
      score -= 1
      items.push(`${total - withQty} items missing quantities`)
    }

    if (codeRatio < 0.5) {
      score -= 1
      items.push(`${total - withCode} items without codes`)
    }
    if (withSection / total < 0.3 && total > 5) {
      score -= 1
      items.push('Most items lack section grouping')
      recs.push({ id: `r-${ri++}`, priority: 'low', category: 'boq', title: 'Add sections', description: 'Group BOQ items into sections (Substructure, Superstructure, etc.) for better organization.', impact: 'Improves readability and reporting', effort: 'quick' })
    }
  }

  score = Math.max(0, score)
  return {
    dimension: {
      id: 'boq-completeness', label: 'BOQ Completeness', score, maxScore: 10,
      status: score >= 7 ? 'good' : score >= 4 ? 'warning' : 'critical',
      details: total === 0 ? 'No BOQ items' : `${total} items, ${withRate} with rates, ${withQty} with quantities`,
      items,
    },
    alertIndex: ai, recIndex: ri,
  }
}

function analyzeQuantityAccuracy(ctx: ProjectContext, alerts: Alert[], recs: Recommendation[], ai: number, ri: number): AnalysisResult {
  const mi = ctx.measurementItems
  const boq = ctx.boqItems
  let score = 10
  const items: string[] = []

  const negativeQty = mi.filter(m => Number(m.net_qty) < 0)
  if (negativeQty.length > 0) {
    score -= 3
    items.push(`${negativeQty.length} items with negative net quantity`)
    alerts.push({ id: `a-${ai++}`, severity: 'warning', category: 'quantity', title: 'Negative quantities', description: `${negativeQty.length} measurement items have negative net quantity. Deductions exceed additions.`, affectedItems: negativeQty.map(m => String(m.description)).slice(0, 5) })
  }

  const zeroQty = mi.filter(m => Number(m.net_qty) === 0 && Number(m.additions_qty) === 0)
  if (zeroQty.length > 3) {
    score -= 2
    items.push(`${zeroQty.length} items with zero quantity`)
  }

  const boqWithRevised = boq.filter(b => Number(b.revised_quantity) > 0 && Number(b.original_quantity) > 0)
  const bigChanges = boqWithRevised.filter(b => {
    const orig = Number(b.original_quantity)
    const rev = Number(b.revised_quantity)
    return orig > 0 && Math.abs(rev - orig) / orig > 0.25
  })
  if (bigChanges.length > 0) {
    score -= 2
    items.push(`${bigChanges.length} items with >25% quantity revision`)
    alerts.push({ id: `a-${ai++}`, severity: 'info', category: 'quantity', title: 'Significant quantity revisions', description: `${bigChanges.length} BOQ items have quantities revised by more than 25%.`, affectedItems: bigChanges.map(b => `${b.code ?? ''} ${b.description}`).slice(0, 5) })
  }

  if (mi.length === 0 && boq.length > 0) {
    score -= 3
    items.push('No measurement items linked')
    recs.push({ id: `r-${ri++}`, priority: 'high', category: 'quantity', title: 'Add measurements', description: 'BOQ items exist but no measurement items. Quantities cannot be verified without measurements.', impact: 'Unverifiable quantities increase risk of errors', effort: 'significant' })
  }

  score = Math.max(0, score)
  return {
    dimension: {
      id: 'qty-accuracy', label: 'Quantity Accuracy', score, maxScore: 10,
      status: score >= 7 ? 'good' : score >= 4 ? 'warning' : 'critical',
      details: `${mi.length} measurement items, ${boq.length} BOQ items`,
      items,
    },
    alertIndex: ai, recIndex: ri,
  }
}

function analyzeCostRisk(ctx: ProjectContext, alerts: Alert[], recs: Recommendation[], ai: number, ri: number): AnalysisResult {
  const boq = ctx.boqItems
  const contract = ctx.contract
  const variations = ctx.variations
  const costs = ctx.costEntries
  let score = 10
  const items: string[] = []

  const boqTotal = boq.reduce((s, b) => s + (Number(b.quantity) || 0) * (Number(b.unit_rate) || 0), 0)
  const contractValue = Number(contract?.contract_value) || 0
  const variationTotal = variations.reduce((s, v) => s + (Number(v.amount) || 0), 0)
  const actualCost = costs.filter(c => c.category === 'actual').reduce((s, c) => s + (Number(c.amount) || 0), 0)

  if (contractValue > 0 && boqTotal > 0) {
    const ratio = boqTotal / contractValue
    if (ratio > 1.1) {
      score -= 3
      items.push(`BOQ total (${boqTotal.toLocaleString()}) exceeds contract (${contractValue.toLocaleString()}) by ${Math.round((ratio - 1) * 100)}%`)
      alerts.push({ id: `a-${ai++}`, severity: 'critical', category: 'cost', title: 'BOQ exceeds contract value', description: `The BOQ total is ${Math.round((ratio - 1) * 100)}% over the contract value. This indicates a cost overrun risk.`, action: 'Review BOQ quantities and rates against contract' })
    } else if (ratio < 0.7) {
      score -= 1
      items.push('BOQ total is significantly below contract value')
    }
  }

  if (contractValue > 0 && Math.abs(variationTotal) > contractValue * 0.15) {
    score -= 2
    items.push(`Variations total ${Math.round(Math.abs(variationTotal) / contractValue * 100)}% of contract`)
    alerts.push({ id: `a-${ai++}`, severity: 'warning', category: 'cost', title: 'High variation impact', description: `Variation orders total ${variationTotal.toLocaleString()}, which is ${Math.round(Math.abs(variationTotal) / contractValue * 100)}% of the contract value.` })
  }

  if (actualCost > 0 && contractValue > 0 && actualCost > contractValue * 0.9) {
    score -= 2
    items.push('Actual costs approaching contract value')
    alerts.push({ id: `a-${ai++}`, severity: 'critical', category: 'cost', title: 'Budget nearly exhausted', description: `Actual costs (${actualCost.toLocaleString()}) are at ${Math.round(actualCost / contractValue * 100)}% of the contract value.`, action: 'Review remaining scope against budget' })
  }

  const pendingVars = variations.filter(v => v.status === 'pending' || v.status === 'submitted')
  if (pendingVars.length > 3) {
    score -= 1
    items.push(`${pendingVars.length} pending variation orders`)
    recs.push({ id: `r-${ri++}`, priority: 'medium', category: 'cost', title: 'Resolve pending variations', description: `${pendingVars.length} variation orders are pending approval. This creates budget uncertainty.`, impact: 'Budget forecasting is unreliable with pending variations', effort: 'moderate' })
  }

  if (boq.length > 0 && boqTotal === 0) {
    score -= 2
    items.push('BOQ has no monetary value — all rates are zero')
  }

  score = Math.max(0, score)
  return {
    dimension: {
      id: 'cost-risk', label: 'Cost Risk', score, maxScore: 10,
      status: score >= 7 ? 'good' : score >= 4 ? 'warning' : 'critical',
      details: contractValue > 0 ? `Contract: ${contractValue.toLocaleString()} | BOQ: ${boqTotal.toLocaleString()} | Variations: ${variationTotal.toLocaleString()}` : 'No contract defined',
      items,
    },
    alertIndex: ai, recIndex: ri,
  }
}

function analyzeMissingItems(ctx: ProjectContext, alerts: Alert[], recs: Recommendation[], ai: number, ri: number): AnalysisResult {
  const boq = ctx.boqItems
  const mi = ctx.measurementItems
  let score = 10
  const items: string[] = []

  const boqDescs = new Set(boq.map(b => String(b.description).toLowerCase().trim()))
  const miDescs = new Set(mi.map(m => String(m.description).toLowerCase().trim()))

  const miWithoutBoq = mi.filter(m => !boqDescs.has(String(m.description).toLowerCase().trim()))
  if (miWithoutBoq.length > 0) {
    const penalty = Math.min(4, Math.ceil(miWithoutBoq.length / 3))
    score -= penalty
    items.push(`${miWithoutBoq.length} measurement items not in BOQ`)
    if (miWithoutBoq.length > 3) {
      alerts.push({ id: `a-${ai++}`, severity: 'warning', category: 'boq', title: 'Measurements without BOQ items', description: `${miWithoutBoq.length} measurement items have no corresponding BOQ entry. These quantities won't appear in the bill.`, affectedItems: miWithoutBoq.map(m => String(m.description)).slice(0, 5) })
      recs.push({ id: `r-${ri++}`, priority: 'high', category: 'boq', title: 'Generate BOQ from measurements', description: `Create BOQ items for the ${miWithoutBoq.length} unlinked measurement items.`, impact: 'Missing BOQ items mean unpriced work', effort: 'quick' })
    }
  }

  const boqWithoutMi = boq.filter(b => !miDescs.has(String(b.description).toLowerCase().trim()) && Number(b.quantity) === 0)
  if (boqWithoutMi.length > 0) {
    score -= Math.min(3, Math.ceil(boqWithoutMi.length / 2))
    items.push(`${boqWithoutMi.length} BOQ items with no measurements`)
  }

  if (ctx.contract && boq.length === 0) {
    score -= 3
    items.push('Contract exists but no BOQ')
    alerts.push({ id: `a-${ai++}`, severity: 'critical', category: 'boq', title: 'Contract without BOQ', description: 'A contract has been set up but no BOQ items exist. The project cannot be properly tracked without a BOQ.' })
  }

  score = Math.max(0, score)
  return {
    dimension: {
      id: 'missing-items', label: 'Missing Items', score, maxScore: 10,
      status: score >= 7 ? 'good' : score >= 4 ? 'warning' : 'critical',
      details: items.length === 0 ? 'No missing items detected' : items.join('; '),
      items,
    },
    alertIndex: ai, recIndex: ri,
  }
}

function analyzeDuplicates(ctx: ProjectContext, alerts: Alert[], recs: Recommendation[], ai: number, ri: number): AnalysisResult {
  const boq = ctx.boqItems
  let score = 10
  const items: string[] = []

  const descMap = new Map<string, number>()
  for (const b of boq) {
    const key = String(b.description).toLowerCase().trim()
    descMap.set(key, (descMap.get(key) || 0) + 1)
  }
  const dups = [...descMap.entries()].filter(([, count]) => count > 1)
  if (dups.length > 0) {
    const totalDups = dups.reduce((s, [, c]) => s + c - 1, 0)
    score -= Math.min(5, totalDups)
    items.push(`${totalDups} potential duplicate BOQ items`)
    alerts.push({ id: `a-${ai++}`, severity: 'warning', category: 'boq', title: 'Duplicate BOQ items', description: `Found ${dups.length} descriptions appearing multiple times in the BOQ.`, affectedItems: dups.map(([desc, count]) => `"${desc}" (×${count})`).slice(0, 5) })
    recs.push({ id: `r-${ri++}`, priority: 'medium', category: 'boq', title: 'Remove duplicates', description: `Review and merge ${totalDups} potentially duplicate BOQ items to avoid double-counting.`, impact: 'Duplicate items inflate cost estimates', effort: 'quick' })
  }

  const codeMap = new Map<string, number>()
  for (const b of boq) {
    if (b.code) {
      const key = String(b.code).trim()
      codeMap.set(key, (codeMap.get(key) || 0) + 1)
    }
  }
  const codeDups = [...codeMap.entries()].filter(([, count]) => count > 1)
  if (codeDups.length > 0) {
    score -= Math.min(2, codeDups.length)
    items.push(`${codeDups.length} duplicate BOQ codes`)
  }

  score = Math.max(0, score)
  return {
    dimension: {
      id: 'duplicates', label: 'Duplicate Items', score, maxScore: 10,
      status: score >= 8 ? 'good' : score >= 5 ? 'warning' : 'critical',
      details: dups.length === 0 ? 'No duplicates detected' : `${dups.length} duplicate groups found`,
      items,
    },
    alertIndex: ai, recIndex: ri,
  }
}

function analyzeDrawingConsistency(ctx: ProjectContext, alerts: Alert[], recs: Recommendation[], ai: number, ri: number): AnalysisResult {
  const drawings = ctx.drawings
  const changes = ctx.quantityChanges
  let score = 10
  const items: string[] = []

  if (drawings.length === 0) {
    score = 5
    items.push('No drawings uploaded')
    recs.push({ id: `r-${ri++}`, priority: 'medium', category: 'drawing', title: 'Upload drawings', description: 'Upload project drawings to enable drawing-based takeoff and AI analysis.', impact: 'Cannot perform drawing takeoff without drawings', effort: 'quick' })
  }

  if (changes.length > 0) {
    const bigChanges = changes.filter(c => {
      const prev = Number(c.previous_qty)
      const next = Number(c.new_qty)
      return prev > 0 && Math.abs(next - prev) / prev > 0.3
    })
    if (bigChanges.length > 3) {
      score -= 3
      items.push(`${bigChanges.length} significant quantity changes from revisions`)
      alerts.push({ id: `a-${ai++}`, severity: 'warning', category: 'drawing', title: 'Large revision impacts', description: `${bigChanges.length} quantity changes exceed 30% from drawing revisions.`, affectedItems: bigChanges.map(c => String(c.description)).slice(0, 5) })
    } else if (bigChanges.length > 0) {
      score -= 1
      items.push(`${bigChanges.length} notable revision impacts`)
    }
  }

  score = Math.max(0, score)
  return {
    dimension: {
      id: 'drawing-consistency', label: 'Drawing Consistency', score, maxScore: 10,
      status: score >= 7 ? 'good' : score >= 4 ? 'warning' : 'critical',
      details: `${drawings.length} drawings, ${changes.length} quantity changes`,
      items,
    },
    alertIndex: ai, recIndex: ri,
  }
}

function analyzeContractCompliance(ctx: ProjectContext, alerts: Alert[], recs: Recommendation[], ai: number, ri: number): AnalysisResult {
  const contract = ctx.contract
  let score = 10
  const items: string[] = []

  if (!contract) {
    score = 3
    items.push('No contract defined')
    if (ctx.boqItems.length > 5) {
      alerts.push({ id: `a-${ai++}`, severity: 'warning', category: 'contract', title: 'No contract', description: 'The project has BOQ items but no contract. Set up a contract to enable cost control and payment management.' })
      recs.push({ id: `r-${ri++}`, priority: 'high', category: 'contract', title: 'Set up contract', description: 'Define contract value, retention, contingency, and other terms to enable financial tracking.', impact: 'Cannot track cost performance without contract baseline', effort: 'quick' })
    }
  } else {
    const endDate = contract.end_date ? new Date(String(contract.end_date)) : null
    if (endDate && endDate < new Date()) {
      score -= 3
      items.push('Contract end date has passed')
      alerts.push({ id: `a-${ai++}`, severity: 'critical', category: 'contract', title: 'Contract expired', description: `Contract end date (${contract.end_date}) has passed. Extension or completion required.` })
    }

    if (!Number(contract.contract_value)) {
      score -= 3
      items.push('Contract value is zero')
    }
  }

  score = Math.max(0, score)
  return {
    dimension: {
      id: 'contract-compliance', label: 'Contract Compliance', score, maxScore: 10,
      status: score >= 7 ? 'good' : score >= 4 ? 'warning' : 'critical',
      details: contract ? `Value: ${Number(contract.contract_value).toLocaleString()}` : 'No contract',
      items,
    },
    alertIndex: ai, recIndex: ri,
  }
}

function analyzeProgressStatus(ctx: ProjectContext, _alerts: Alert[], recs: Recommendation[], ai: number, ri: number): AnalysisResult {
  const progress = Number(ctx.project?.progress) || 0
  const status = String(ctx.project?.status ?? 'unknown')
  let score = 10
  const items: string[] = []

  if (status === 'on_hold' || status === 'cancelled') {
    score = 3
    items.push(`Project status: ${status}`)
  }

  const startDate = ctx.project?.start_date ? new Date(String(ctx.project.start_date)) : null
  const endDate = ctx.project?.end_date ? new Date(String(ctx.project.end_date)) : null
  if (startDate && endDate) {
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    const elapsedDays = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    if (totalDays > 0 && elapsedDays > 0) {
      const expectedProgress = Math.min(100, (elapsedDays / totalDays) * 100)
      if (progress < expectedProgress - 20) {
        score -= 3
        items.push(`Behind schedule: ${progress}% vs expected ${Math.round(expectedProgress)}%`)
        recs.push({ id: `r-${ri++}`, priority: 'high', category: 'schedule', title: 'Project behind schedule', description: `Current progress (${progress}%) is significantly behind the expected ${Math.round(expectedProgress)}% based on timeline.`, impact: 'May require schedule recovery plan', effort: 'significant' })
      } else if (progress < expectedProgress - 10) {
        score -= 1
        items.push(`Slightly behind: ${progress}% vs expected ${Math.round(expectedProgress)}%`)
      }
    }
  }

  if (progress === 0 && ctx.boqItems.length > 0) {
    score -= 2
    items.push('Progress not updated')
  }

  score = Math.max(0, score)
  return {
    dimension: {
      id: 'progress', label: 'Progress Status', score, maxScore: 10,
      status: score >= 7 ? 'good' : score >= 4 ? 'warning' : 'critical',
      details: `${progress}% complete, Status: ${status}`,
      items,
    },
    alertIndex: ai, recIndex: ri,
  }
}

function analyzePaymentStatus(ctx: ProjectContext, alerts: Alert[], recs: Recommendation[], ai: number, ri: number): AnalysisResult {
  const certs = ctx.paymentCerts
  const contract = ctx.contract
  let score = 10
  const items: string[] = []

  if (certs.length === 0 && ctx.boqItems.length > 5) {
    score -= 2
    items.push('No payment certificates issued')
    recs.push({ id: `r-${ri++}`, priority: 'low', category: 'payment', title: 'Issue first payment certificate', description: 'Create the first IPC to begin tracking payments.', impact: 'Payment tracking is inactive', effort: 'moderate' })
  }

  const pendingCerts = certs.filter(c => c.status === 'draft' || c.status === 'submitted')
  if (pendingCerts.length > 2) {
    score -= 2
    items.push(`${pendingCerts.length} pending payment certificates`)
    alerts.push({ id: `a-${ai++}`, severity: 'warning', category: 'payment', title: 'Pending certificates', description: `${pendingCerts.length} payment certificates are awaiting approval. This may delay cash flow.` })
  }

  const totalPaid = certs.filter(c => c.status === 'paid' || c.status === 'approved').reduce((s, c) => s + (Number(c.net_payable) || 0), 0)
  const contractValue = Number(contract?.contract_value) || 0
  if (contractValue > 0 && totalPaid > contractValue) {
    score -= 3
    items.push('Total payments exceed contract value')
    alerts.push({ id: `a-${ai++}`, severity: 'critical', category: 'payment', title: 'Overpayment risk', description: `Total certified amount (${totalPaid.toLocaleString()}) exceeds contract value (${contractValue.toLocaleString()}).`, action: 'Review payment certificates against contract and variations' })
  }

  score = Math.max(0, score)
  return {
    dimension: {
      id: 'payment', label: 'Payment Status', score, maxScore: 10,
      status: score >= 7 ? 'good' : score >= 4 ? 'warning' : 'critical',
      details: certs.length > 0 ? `${certs.length} certificates, ${totalPaid.toLocaleString()} certified` : 'No certificates',
      items,
    },
    alertIndex: ai, recIndex: ri,
  }
}

function analyzeRevisionImpact(ctx: ProjectContext, alerts: Alert[], recs: Recommendation[], ai: number, ri: number): AnalysisResult {
  const changes = ctx.quantityChanges
  let score = 10
  const items: string[] = []

  if (changes.length === 0) {
    return {
      dimension: {
        id: 'revision-impact', label: 'Revision Impact', score: 10, maxScore: 10,
        status: 'good', details: 'No quantity changes recorded', items: [],
      },
      alertIndex: ai, recIndex: ri,
    }
  }

  const unresolved = changes.filter(c => !c.notes || String(c.notes).trim() === '')
  if (unresolved.length > 5) {
    score -= 2
    items.push(`${unresolved.length} quantity changes without notes`)
    recs.push({ id: `r-${ri++}`, priority: 'low', category: 'quality', title: 'Document quantity changes', description: `${unresolved.length} quantity changes lack explanatory notes. Add notes for audit trail.`, impact: 'Poor documentation increases dispute risk', effort: 'quick' })
  }

  const totalImpact = changes.reduce((s, c) => s + Math.abs(Number(c.new_qty) - Number(c.previous_qty)), 0)
  if (totalImpact > 0) {
    items.push(`${changes.length} changes, total impact: ${totalImpact.toFixed(1)} units`)
  }

  score = Math.max(0, score)
  return {
    dimension: {
      id: 'revision-impact', label: 'Revision Impact', score, maxScore: 10,
      status: score >= 7 ? 'good' : score >= 4 ? 'warning' : 'critical',
      details: `${changes.length} quantity changes recorded`,
      items,
    },
    alertIndex: ai, recIndex: ri,
  }
}
