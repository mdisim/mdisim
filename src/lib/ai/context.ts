import { createClient } from '@/lib/supabase/server'

export interface ProjectContext {
  project: Record<string, unknown> | null
  drawings: Record<string, unknown>[]
  boqItems: Record<string, unknown>[]
  measurementItems: Record<string, unknown>[]
  contract: Record<string, unknown> | null
  variations: Record<string, unknown>[]
  costEntries: Record<string, unknown>[]
  paymentCerts: Record<string, unknown>[]
  rateAnalyses: Record<string, unknown>[]
  tenders: Record<string, unknown>[]
  quantityChanges: Record<string, unknown>[]
  libraryItems: Record<string, unknown>[]
}

export async function gatherProjectContext(projectId: string): Promise<ProjectContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { project: null, drawings: [], boqItems: [], measurementItems: [], contract: null, variations: [], costEntries: [], paymentCerts: [], rateAnalyses: [], tenders: [], quantityChanges: [], libraryItems: [] }
  }

  const [
    { data: project },
    { data: drawings },
    { data: boqItems },
    { data: measurementItems },
    { data: contract },
    { data: variations },
    { data: costEntries },
    { data: paymentCerts },
    { data: rateAnalyses },
    { data: tenders },
    { data: quantityChanges },
    { data: libraryItems },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('qb_drawings').select('id,name,drawing_number,drawing_type,page_count,created_at').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('qb_boq_items').select('id,code,description,unit,quantity,original_quantity,revised_quantity,unit_rate,material_rate,labor_rate,equipment_rate,section,notes').eq('project_id', projectId).order('sort_order'),
    supabase.from('qb_measurement_items').select('id,item_code,description,unit,measurement_type,section,drawing_ref,location,additions_qty,deductions_qty,net_qty').eq('project_id', projectId).order('sort_order'),
    supabase.from('qb_contracts').select('*').eq('project_id', projectId).single(),
    supabase.from('qb_variations').select('id,variation_no,title,description,variation_type,status,amount').eq('project_id', projectId).order('created_at', { ascending: false }),
    supabase.from('qb_cost_entries').select('id,period_date,category,cost_type,description,amount').eq('project_id', projectId).order('period_date', { ascending: false }).limit(100),
    supabase.from('qb_payment_certs').select('id,cert_number,status,period_from,period_to,gross_amount,net_payable').eq('project_id', projectId).order('cert_number', { ascending: false }),
    supabase.from('qb_rate_analyses').select('id,description,unit,total_rate,output_qty').eq('project_id', projectId).limit(50),
    supabase.from('qb_tenders').select('id,title,tender_number,status,closing_date').eq('project_id', projectId),
    supabase.from('qb_quantity_changes').select('id,description,previous_qty,new_qty,unit,change_type,notes').eq('project_id', projectId).order('created_at', { ascending: false }).limit(50),
    supabase.from('qb_library_items').select('id,code,description,unit,default_rate').limit(100),
  ])

  return {
    project: project as Record<string, unknown> | null,
    drawings: (drawings ?? []) as Record<string, unknown>[],
    boqItems: (boqItems ?? []) as Record<string, unknown>[],
    measurementItems: (measurementItems ?? []) as Record<string, unknown>[],
    contract: contract as Record<string, unknown> | null,
    variations: (variations ?? []) as Record<string, unknown>[],
    costEntries: (costEntries ?? []) as Record<string, unknown>[],
    paymentCerts: (paymentCerts ?? []) as Record<string, unknown>[],
    rateAnalyses: (rateAnalyses ?? []) as Record<string, unknown>[],
    tenders: (tenders ?? []) as Record<string, unknown>[],
    quantityChanges: (quantityChanges ?? []) as Record<string, unknown>[],
    libraryItems: (libraryItems ?? []) as Record<string, unknown>[],
  }
}

export function buildContextPrompt(ctx: ProjectContext, currentPage: string): string {
  const p = ctx.project
  const sections: string[] = []

  sections.push(`# Project Context
Name: ${p?.name ?? 'Unknown'}
Client: ${p?.client_name ?? 'N/A'}
Location: ${p?.location ?? 'N/A'}
Budget: ${p?.budget ? `${p.currency ?? 'USD'} ${Number(p.budget).toLocaleString()}` : 'Not set'}
Status: ${p?.status ?? 'N/A'}
Progress: ${p?.progress ?? 0}%
Start: ${p?.start_date ?? 'N/A'} | End: ${p?.end_date ?? 'N/A'}
Current page: ${currentPage}`)

  if (ctx.drawings.length > 0) {
    sections.push(`## Drawings (${ctx.drawings.length})
${ctx.drawings.map(d => `- ${d.drawing_number ?? ''} ${d.name} (${d.drawing_type}, ${d.page_count} pages)`).join('\n')}`)
  }

  if (ctx.boqItems.length > 0) {
    const totalValue = ctx.boqItems.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_rate) || 0), 0)
    sections.push(`## Bill of Quantities (${ctx.boqItems.length} items, Total: ${totalValue.toLocaleString()})
${ctx.boqItems.slice(0, 80).map(i => `- [${i.code ?? '—'}] ${i.description}: ${i.quantity} ${i.unit} @ ${i.unit_rate}/${i.unit} = ${((Number(i.quantity) || 0) * (Number(i.unit_rate) || 0)).toLocaleString()}`).join('\n')}${ctx.boqItems.length > 80 ? `\n... and ${ctx.boqItems.length - 80} more items` : ''}`)
  }

  if (ctx.measurementItems.length > 0) {
    sections.push(`## Measurement Items (${ctx.measurementItems.length})
${ctx.measurementItems.slice(0, 50).map(m => `- [${m.item_code ?? '—'}] ${m.description}: net ${m.net_qty} ${m.unit} (add: ${m.additions_qty}, ded: ${m.deductions_qty})`).join('\n')}`)
  }

  if (ctx.contract) {
    sections.push(`## Contract
Value: ${Number(ctx.contract.contract_value).toLocaleString()}
Duration: ${ctx.contract.duration_months ?? 'N/A'} months
Retention: ${ctx.contract.retention_pct ?? 0}%
Contingency: ${ctx.contract.contingency_pct ?? 0}%
VAT: ${ctx.contract.vat_pct ?? 0}%`)
  }

  if (ctx.variations.length > 0) {
    const totalVar = ctx.variations.reduce((sum, v) => sum + (Number(v.amount) || 0), 0)
    sections.push(`## Variations (${ctx.variations.length}, Net: ${totalVar.toLocaleString()})
${ctx.variations.map(v => `- ${v.variation_no}: ${v.title} (${v.status}) ${v.variation_type} ${Number(v.amount).toLocaleString()}`).join('\n')}`)
  }

  if (ctx.paymentCerts.length > 0) {
    sections.push(`## Payment Certificates (${ctx.paymentCerts.length})
${ctx.paymentCerts.map(c => `- IPC #${c.cert_number}: ${c.status} | Gross: ${Number(c.gross_amount).toLocaleString()} | Net: ${Number(c.net_payable).toLocaleString()} | ${c.period_from} to ${c.period_to}`).join('\n')}`)
  }

  if (ctx.costEntries.length > 0) {
    const totalCost = ctx.costEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    sections.push(`## Cost Entries (${ctx.costEntries.length}, Total: ${totalCost.toLocaleString()})
Top entries:
${ctx.costEntries.slice(0, 20).map(e => `- ${e.period_date}: ${e.description} (${e.cost_type}/${e.category}) ${Number(e.amount).toLocaleString()}`).join('\n')}`)
  }

  if (ctx.rateAnalyses.length > 0) {
    sections.push(`## Rate Analyses (${ctx.rateAnalyses.length})
${ctx.rateAnalyses.slice(0, 30).map(r => `- ${r.description}: ${r.total_rate}/${r.unit}`).join('\n')}`)
  }

  if (ctx.tenders.length > 0) {
    sections.push(`## Tenders (${ctx.tenders.length})
${ctx.tenders.map(t => `- ${t.tender_number ?? ''} ${t.title} (${t.status}) closing ${t.closing_date ?? 'N/A'}`).join('\n')}`)
  }

  if (ctx.quantityChanges.length > 0) {
    sections.push(`## Recent Quantity Changes (${ctx.quantityChanges.length})
${ctx.quantityChanges.slice(0, 20).map(q => `- ${q.description}: ${q.previous_qty} → ${q.new_qty} ${q.unit} (${q.change_type})`).join('\n')}`)
  }

  if (ctx.libraryItems.length > 0) {
    sections.push(`## Pricing Library (${ctx.libraryItems.length} items)
${ctx.libraryItems.slice(0, 40).map(l => `- [${l.code ?? '—'}] ${l.description}: ${l.default_rate}/${l.unit}`).join('\n')}`)
  }

  return sections.join('\n\n')
}
