'use server'

import { createClient } from '@/lib/supabase/server'
import type { RateAnalysis, RateResource, ResourceType } from '@/lib/types'

export async function getRateAnalyses(projectId: string): Promise<RateAnalysis[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('qb_rate_analyses')
    .select('*, resources:qb_rate_resources(*)')
    .eq('project_id', projectId)
    .order('created_at')

  return (data ?? []) as RateAnalysis[]
}

export async function getRateAnalysis(id: string): Promise<RateAnalysis | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('qb_rate_analyses')
    .select('*, resources:qb_rate_resources(*)')
    .eq('id', id)
    .single()

  return (data as RateAnalysis) ?? null
}

export async function getRateAnalysisForBOQ(boqItemId: string): Promise<RateAnalysis | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('qb_rate_analyses')
    .select('*, resources:qb_rate_resources(*)')
    .eq('boq_item_id', boqItemId)
    .single()

  return (data as RateAnalysis) ?? null
}

export async function createRateAnalysis(fields: {
  project_id: string
  boq_item_id?: string
  library_item_id?: string
  description: string
  unit: string
  output_qty?: number
  overhead_pct?: number
  profit_pct?: number
}): Promise<{ data?: RateAnalysis; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('qb_rate_analyses')
    .insert(fields)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as RateAnalysis }
}

export async function updateRateAnalysis(
  id: string,
  fields: Partial<Pick<RateAnalysis, 'description' | 'unit' | 'output_qty' | 'overhead_pct' | 'profit_pct'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('qb_rate_analyses')
    .update(fields)
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function deleteRateAnalysis(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('qb_rate_analyses')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function createRateResource(fields: {
  rate_analysis_id: string
  resource_type: ResourceType
  description: string
  unit?: string
  quantity?: number
  unit_cost?: number
  waste_pct?: number
  sort_order?: number
}): Promise<{ data?: RateResource; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('qb_rate_resources')
    .insert(fields)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as RateResource }
}

export async function updateRateResource(
  id: string,
  fields: Partial<Pick<RateResource, 'description' | 'unit' | 'quantity' | 'unit_cost' | 'waste_pct' | 'resource_type' | 'sort_order'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('qb_rate_resources')
    .update(fields)
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function deleteRateResource(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('qb_rate_resources')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}
