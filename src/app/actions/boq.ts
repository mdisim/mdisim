'use server'

import { createClient } from '@/lib/supabase/server'
import type { BOQItem } from '@/lib/types'

export async function getBOQItems(projectId: string): Promise<BOQItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('qb_boq_items')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')

  return (data ?? []) as BOQItem[]
}

export async function createBOQItem(fields: {
  project_id: string
  mi_id?: string
  library_item_id?: string
  code?: string
  description: string
  unit: string
  quantity?: number
  original_quantity?: number
  revised_quantity?: number
  unit_rate?: number
  material_rate?: number
  labor_rate?: number
  equipment_rate?: number
  section?: string
  notes?: string
  sort_order?: number
}): Promise<{ data?: BOQItem; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('qb_boq_items')
    .insert(fields)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as BOQItem }
}

export async function updateBOQItem(
  id: string,
  fields: Partial<Omit<BOQItem, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('qb_boq_items')
    .update(fields)
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function deleteBOQItem(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('qb_boq_items')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function bulkCreateBOQItems(
  projectId: string,
  items: {
    code?: string
    description: string
    unit: string
    quantity?: number
    unit_rate?: number
    section?: string
    notes?: string
  }[]
): Promise<{ count: number; error?: string }> {
  const supabase = await createClient()

  const { data: maxOrder } = await supabase
    .from('qb_boq_items')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  let nextOrder = ((maxOrder as { sort_order: number } | null)?.sort_order ?? -1) + 1

  const rows = items.map(item => ({
    project_id: projectId,
    code: item.code ?? null,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity ?? 0,
    unit_rate: item.unit_rate ?? 0,
    section: item.section ?? null,
    notes: item.notes ?? null,
    sort_order: nextOrder++,
  }))

  const { error } = await supabase
    .from('qb_boq_items')
    .insert(rows)

  if (error) return { count: 0, error: error.message }
  return { count: rows.length }
}

export async function generateBOQFromMeasurements(
  projectId: string,
  measurementItemIds: string[]
): Promise<{ data?: BOQItem[]; error?: string }> {
  const supabase = await createClient()

  const { data: items, error: fetchError } = await supabase
    .from('qb_measurement_items')
    .select('id, item_code, description, unit, net_qty')
    .in('id', measurementItemIds)

  if (fetchError) return { error: fetchError.message }
  if (!items || items.length === 0) return { error: 'No measurement items found' }

  // Get current max sort_order
  const { data: maxOrder } = await supabase
    .from('qb_boq_items')
    .select('sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  let nextOrder = ((maxOrder as { sort_order: number } | null)?.sort_order ?? -1) + 1

  const boqRows = items.map((mi: Record<string, unknown>) => ({
    project_id: projectId,
    mi_id: mi.id as string,
    code: (mi.item_code as string) ?? null,
    description: mi.description as string,
    unit: mi.unit as string,
    quantity: mi.net_qty as number,
    original_quantity: mi.net_qty as number,
    sort_order: nextOrder++,
  }))

  const { data, error } = await supabase
    .from('qb_boq_items')
    .insert(boqRows)
    .select()

  if (error) return { error: error.message }
  return { data: (data ?? []) as BOQItem[] }
}
