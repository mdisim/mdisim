export interface QuickAction {
  id: string
  label: string
  prompt: string
  icon: string
}

export function getCopilotQuickActions(currentPage: string): QuickAction[] {
  const common: QuickAction[] = [
    { id: 'missing-qty', label: 'Find missing quantities', prompt: 'Analyze the BOQ and measurements. What quantities are missing or incomplete? List specific items that need attention.', icon: 'search' },
    { id: 'duplicates', label: 'Find duplicates', prompt: 'Scan the BOQ and measurement items for potential duplicates or overlapping work items. Show me any items that might be counted twice.', icon: 'copy' },
    { id: 'qty-errors', label: 'Detect quantity errors', prompt: 'Review all quantities in the BOQ and measurements. Flag any that seem unusually high, low, or mathematically incorrect. Show your reasoning.', icon: 'alert' },
    { id: 'project-summary', label: 'Project summary', prompt: 'Give me a comprehensive summary of this project including: scope, current progress, financial status, any risks or issues, and recommended next steps.', icon: 'file' },
  ]

  const pageSpecific: Record<string, QuickAction[]> = {
    boq: [
      { id: 'expensive-items', label: 'Why is this expensive?', prompt: 'Analyze the most expensive BOQ items. Break down the cost components and explain whether the rates are reasonable. Suggest where costs could be reduced.', icon: 'dollar' },
      { id: 'cheaper-alt', label: 'Suggest alternatives', prompt: 'Review the BOQ items and suggest cheaper alternatives where possible. For each suggestion, explain the cost saving, any quality trade-offs, and whether it meets typical engineering standards.', icon: 'lightbulb' },
      { id: 'boq-completeness', label: 'Check BOQ completeness', prompt: 'Based on the drawings and measurements, check if the BOQ is complete. List any items that should be in the BOQ but are missing.', icon: 'check' },
    ],
    measurements: [
      { id: 'measurement-check', label: 'Verify measurements', prompt: 'Cross-check the measurement items against the BOQ. Are there measurements without corresponding BOQ items? Are there BOQ items without measurements?', icon: 'ruler' },
    ],
    'cost-control': [
      { id: 'cost-analysis', label: 'Cost analysis', prompt: 'Analyze the project cost performance. Calculate cost variance, cost performance index (CPI), and estimate at completion (EAC). Flag any cost overruns.', icon: 'trending' },
      { id: 'variation-impact', label: 'Variation impact', prompt: 'Analyze all variations and their cumulative impact on the contract value. What is the revised contract value? Are there any pending variations that need attention?', icon: 'git-branch' },
    ],
    payments: [
      { id: 'gen-payment', label: 'Draft payment cert', prompt: 'Based on the current BOQ quantities and previous certificates, draft the next payment certificate. Show the calculation for each major item.', icon: 'receipt' },
      { id: 'retention-calc', label: 'Retention calculation', prompt: 'Calculate the current retention held, expected retention release dates, and total retention at project completion.', icon: 'lock' },
    ],
    drawings: [
      { id: 'drawing-issues', label: 'Drawing inconsistencies', prompt: 'Analyze the drawings list and their revisions. Are there any inconsistencies between drawing versions? Are any drawings outdated?', icon: 'alert-triangle' },
    ],
    revisions: [
      { id: 'revision-impact', label: 'Revision impact', prompt: 'Analyze all quantity changes from drawing revisions. What is the total impact on the BOQ? Which items changed the most?', icon: 'git-commit' },
    ],
    rates: [
      { id: 'rate-benchmark', label: 'Benchmark rates', prompt: 'Review the rate analyses. Are the rates competitive? Compare material, labor, and equipment components against industry standards. Flag any outliers.', icon: 'bar-chart' },
    ],
    tenders: [
      { id: 'tender-compare', label: 'Compare bids', prompt: 'Analyze the tenders and bidders. Compare bid amounts, highlight the most competitive bidders, and flag any bids that seem unusually low or high.', icon: 'users' },
    ],
  }

  const pageKey = currentPage.split('/').pop() ?? ''
  return [...(pageSpecific[pageKey] ?? []), ...common]
}
