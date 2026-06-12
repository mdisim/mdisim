'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Safe column list that works even without Sprint 011 migration
const SPRINT11_KEYS = new Set(['is_section_header', 'sort_order', 'vat_percent', 'vat_amount'])

function safePayload(data: Record<string, unknown>, includeSprint11 = true): Record<string, unknown> {
  if (includeSprint11) return data
  return Object.fromEntries(Object.entries(data).filter(([k]) => !SPRINT11_KEYS.has(k)))
}

type ItemData = {
  item_code?: string | null
  description?: string | null
  unit?: string | null
  quantity?: number | null
  unit_rate?: number | null
  total_amount?: number | null
  vat_percent?: number | null
  vat_amount?: number | null
  is_section_header?: boolean
  sort_order?: number
  category?: string | null
  notes?: string | null
}

type ActionResult = { success: true; data?: unknown } | { success: false; error: string }

export async function updateBOQItem(id: string, data: ItemData): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('boq_items').update(data).eq('id', id)
  if (error) {
    // If Sprint 011 columns missing, retry with base columns only
    if (error.code === 'PGRST204' || error.message.includes('does not exist') || error.message.includes('column')) {
      const safe = safePayload(data as Record<string, unknown>, false)
      const { error: e2 } = await supabase.from('boq_items').update(safe).eq('id', id)
      if (e2) return { success: false, error: e2.message }
    } else {
      return { success: false, error: error.message }
    }
  }
  revalidatePath('/projects/[id]/boq', 'page')
  return { success: true }
}

export async function createBOQItem(projectId: string, data: ItemData): Promise<{ success: false; error: string } | { success: true; data: Record<string, unknown> }> {
  const supabase = await createClient()

  // Apply NOT NULL defaults so the insert never violates constraints
  const withDefaults: ItemData = {
    item_code: '',
    vat_percent: 0,
    vat_amount: 0,
    ...data,
  }
  // Coerce null/undefined back to safe values for NOT NULL columns
  withDefaults.unit = withDefaults.unit ?? 'm'
  withDefaults.quantity = withDefaults.quantity ?? 0
  withDefaults.unit_rate = withDefaults.unit_rate ?? 0
  withDefaults.total_amount = withDefaults.total_amount ?? 0

  // First attempt: all columns
  const payload: Record<string, unknown> = { ...withDefaults, project_id: projectId }
  const { data: item, error } = await supabase
    .from('boq_items')
    .insert(payload)
    .select()
    .single()

  if (error) {
    // Retry without Sprint 011 columns if those columns don't exist yet
    if (error.code === 'PGRST204' || error.message.includes('does not exist') || error.message.includes('column')) {
      const safe = safePayload(payload, false)
      const { data: item2, error: e2 } = await supabase.from('boq_items').insert(safe).select().single()
      if (e2) return { success: false, error: `Insert failed: ${e2.message}` }
      revalidatePath('/projects/[id]/boq', 'page')
      return { success: true, data: item2 as Record<string, unknown> }
    }
    return { success: false, error: `Insert failed: ${error.message}` }
  }

  revalidatePath('/projects/[id]/boq', 'page')
  return { success: true, data: item as Record<string, unknown> }
}

export async function deleteBOQItem(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('boq_items').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/projects/[id]/boq', 'page')
  return { success: true }
}

export async function bulkCreateBOQItems(projectId: string, items: Array<ItemData>): Promise<ActionResult> {
  const supabase = await createClient()
  const payload = items.map(item => ({ ...item, project_id: projectId } as Record<string, unknown>))
  const { error } = await supabase.from('boq_items').insert(payload)
  if (error) {
    if (error.code === 'PGRST204' || error.message.includes('does not exist') || error.message.includes('column')) {
      const safe = payload.map(i => safePayload(i, false))
      const { error: e2 } = await supabase.from('boq_items').insert(safe)
      if (e2) return { success: false, error: e2.message }
    } else {
      return { success: false, error: error.message }
    }
  }
  revalidatePath('/projects/[id]/boq', 'page')
  return { success: true }
}
