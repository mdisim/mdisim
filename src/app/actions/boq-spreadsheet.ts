'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Base columns guaranteed to exist in all DB versions
const BASE_COLUMNS = ['item_code', 'description', 'unit', 'quantity', 'unit_rate', 'total_amount', 'category', 'notes']
// Sprint 011 columns (may not exist if migration hasn't run)
const SPRINT11_COLUMNS = ['is_section_header', 'sort_order', 'vat_percent', 'vat_amount']

function stripUnknownColumns<T extends Record<string, unknown>>(data: T, allowedExtra: string[]): Partial<T> {
  const allowed = new Set([...BASE_COLUMNS, ...allowedExtra])
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.has(k))
  ) as Partial<T>
}

export async function updateBOQItem(id: string, data: {
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
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('boq_items')
    .update(data)
    .eq('id', id)
  if (error) {
    // If error mentions unknown columns, retry with base columns only
    if (error.message.includes('column') || error.code === 'PGRST204') {
      const safe = stripUnknownColumns(data as Record<string, unknown>, [])
      const { error: e2 } = await supabase.from('boq_items').update(safe).eq('id', id)
      if (e2) throw new Error(e2.message)
    } else {
      throw new Error(error.message)
    }
  }
  revalidatePath('/projects/[id]/boq', 'page')
}

export async function createBOQItem(projectId: string, data: {
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
}) {
  const supabase = await createClient()
  const payload = { ...data, project_id: projectId }
  const { data: item, error } = await supabase
    .from('boq_items')
    .insert(payload)
    .select()
    .single()

  if (error) {
    // Retry without Sprint 011 columns if they don't exist yet
    if (error.message.includes('column') || error.code === 'PGRST204' || error.message.includes('does not exist')) {
      const safe = stripUnknownColumns(payload as Record<string, unknown>, [])
      const { data: item2, error: e2 } = await supabase.from('boq_items').insert(safe).select().single()
      if (e2) throw new Error(e2.message)
      revalidatePath('/projects/[id]/boq', 'page')
      return item2
    }
    throw new Error(error.message)
  }

  revalidatePath('/projects/[id]/boq', 'page')
  return item
}

export async function deleteBOQItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('boq_items')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/projects/[id]/boq', 'page')
}

export async function bulkCreateBOQItems(projectId: string, items: Array<{
  item_code?: string | null
  description?: string | null
  unit?: string | null
  quantity?: number | null
  unit_rate?: number | null
  total_amount?: number | null
  vat_percent?: number | null
  vat_amount?: number | null
  category?: string | null
  notes?: string | null
  sort_order?: number
}>) {
  const supabase = await createClient()
  const payload = items.map(item => ({ ...item, project_id: projectId }))
  const { error } = await supabase.from('boq_items').insert(payload)
  if (error) {
    if (error.message.includes('column') || error.code === 'PGRST204' || error.message.includes('does not exist')) {
      const safe = payload.map(i => stripUnknownColumns(i as Record<string, unknown>, []))
      const { error: e2 } = await supabase.from('boq_items').insert(safe)
      if (e2) throw new Error(e2.message)
    } else {
      throw new Error(error.message)
    }
  }
  revalidatePath('/projects/[id]/boq', 'page')
}
