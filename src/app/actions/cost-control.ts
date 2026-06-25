'use server'

import { createClient } from '@/lib/supabase/server'
import type { Contract, Variation, VariationItem, CostEntry, CashflowEntry } from '@/lib/types'

// ── Contract ─────────────────────────────────────────────────────────────

export async function getContract(projectId: string): Promise<Contract | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('qb_contracts')
    .select('*')
    .eq('project_id', projectId)
    .single()
  return (data as Contract) ?? null
}

export async function upsertContract(fields: {
  project_id: string
  contract_value: number
  contingency_pct?: number
  retention_pct?: number
  advance_pct?: number
  vat_pct?: number
  start_date?: string
  end_date?: string
  duration_months?: number
  notes?: string
}): Promise<{ data?: Contract; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('qb_contracts')
    .upsert(fields, { onConflict: 'project_id' })
    .select()
    .single()
  if (error) return { error: error.message }
  return { data: data as Contract }
}

// ── Variations ───────────────────────────────────────────────────────────

export async function getVariations(projectId: string): Promise<Variation[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('qb_variations')
    .select('*, items:qb_variation_items(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return (data ?? []) as Variation[]
}

export async function createVariation(fields: {
  project_id: string
  variation_no: string
  title: string
  description?: string
  variation_type?: string
  amount?: number
}): Promise<{ data?: Variation; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('qb_variations')
    .insert(fields)
    .select()
    .single()
  if (error) return { error: error.message }
  return { data: data as Variation }
}

export async function updateVariation(
  id: string,
  fields: Partial<Pick<Variation, 'title' | 'description' | 'status' | 'variation_type' | 'submitted_date' | 'approved_date' | 'amount' | 'approved_amount' | 'notes'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('qb_variations').update(fields).eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function deleteVariation(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('qb_variations').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function createVariationItem(fields: {
  variation_id: string
  boq_item_id?: string
  description: string
  unit: string
  quantity: number
  unit_rate: number
  sort_order?: number
}): Promise<{ data?: VariationItem; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('qb_variation_items')
    .insert(fields)
    .select()
    .single()
  if (error) return { error: error.message }
  return { data: data as VariationItem }
}

export async function updateVariationItem(
  id: string,
  fields: Partial<Pick<VariationItem, 'description' | 'unit' | 'quantity' | 'unit_rate'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('qb_variation_items').update(fields).eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function deleteVariationItem(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('qb_variation_items').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

// ── Cost Entries ─────────────────────────────────────────────────────────

export async function getCostEntries(projectId: string): Promise<CostEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('qb_cost_entries')
    .select('*')
    .eq('project_id', projectId)
    .order('period_date', { ascending: false })
  return (data ?? []) as CostEntry[]
}

export async function createCostEntry(fields: {
  project_id: string
  period_date: string
  category: string
  cost_type: string
  description: string
  amount: number
  boq_item_id?: string
  notes?: string
}): Promise<{ data?: CostEntry; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('qb_cost_entries')
    .insert(fields)
    .select()
    .single()
  if (error) return { error: error.message }
  return { data: data as CostEntry }
}

export async function deleteCostEntry(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('qb_cost_entries').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

// ── Cashflow ─────────────────────────────────────────────────────────────

export async function getCashflow(projectId: string): Promise<CashflowEntry[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('qb_cashflow')
    .select('*')
    .eq('project_id', projectId)
    .order('period_date')
  return (data ?? []) as CashflowEntry[]
}

export async function upsertCashflow(fields: {
  project_id: string
  period_date: string
  planned_income?: number
  actual_income?: number
  planned_expense?: number
  actual_expense?: number
  cumulative_planned_income?: number
  cumulative_actual_income?: number
  cumulative_planned_expense?: number
  cumulative_actual_expense?: number
  notes?: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('qb_cashflow')
    .upsert(fields, { onConflict: 'project_id,period_date' })
  if (error) return { error: error.message }
  return {}
}
