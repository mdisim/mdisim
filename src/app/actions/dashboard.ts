'use server'

import { createClient } from '@/lib/supabase/server'
import type { Project, BOQItem, MeasurementItem, Variation, Contract, CostEntry, PaymentCert, Tender, CashflowEntry } from '@/lib/types'

export interface ProjectSummary {
  project: Project
  boqItems: BOQItem[]
  measurementItems: MeasurementItem[]
  variations: Variation[]
  contract: Contract | null
  costEntries: CostEntry[]
  paymentCerts: PaymentCert[]
  tenders: Tender[]
  cashflow: CashflowEntry[]
}

export async function getDashboardSummaries(): Promise<{ projects: Project[]; summaries: ProjectSummary[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { projects: [], summaries: [] }

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('created_by', user.id)
    .order('updated_at', { ascending: false })

  const allProjects = (projects ?? []) as Project[]
  const projectIds = allProjects.slice(0, 10).map(p => p.id)

  if (projectIds.length === 0) return { projects: allProjects, summaries: [] }

  const [
    { data: boqItems },
    { data: measurementItems },
    { data: variations },
    { data: contracts },
    { data: costEntries },
    { data: paymentCerts },
    { data: tenders },
    { data: cashflow },
  ] = await Promise.all([
    supabase.from('qb_boq_items').select('*').in('project_id', projectIds).order('sort_order'),
    supabase.from('qb_measurement_items').select('id,item_code,description,unit,measurement_type,project_id').in('project_id', projectIds),
    supabase.from('qb_variations').select('*').in('project_id', projectIds).order('created_at', { ascending: false }),
    supabase.from('qb_contracts').select('*').in('project_id', projectIds),
    supabase.from('qb_cost_entries').select('*').in('project_id', projectIds).order('period_date', { ascending: false }),
    supabase.from('qb_payment_certs').select('*').in('project_id', projectIds).order('cert_number', { ascending: false }),
    supabase.from('qb_tenders').select('*').in('project_id', projectIds),
    supabase.from('qb_cashflow').select('*').in('project_id', projectIds).order('period_date'),
  ])

  const summaries = allProjects.slice(0, 10).map((project) => ({
    project,
    boqItems: ((boqItems ?? []) as BOQItem[]).filter(i => i.project_id === project.id),
    measurementItems: ((measurementItems ?? []) as MeasurementItem[]).filter(i => i.project_id === project.id),
    variations: ((variations ?? []) as Variation[]).filter(v => v.project_id === project.id),
    contract: ((contracts ?? []) as Contract[]).find(c => c.project_id === project.id) ?? null,
    costEntries: ((costEntries ?? []) as CostEntry[]).filter(e => e.project_id === project.id),
    paymentCerts: ((paymentCerts ?? []) as PaymentCert[]).filter(p => p.project_id === project.id),
    tenders: ((tenders ?? []) as Tender[]).filter(t => t.project_id === project.id),
    cashflow: ((cashflow ?? []) as CashflowEntry[]).filter(cf => cf.project_id === project.id),
  }))

  return { projects: allProjects, summaries }
}
