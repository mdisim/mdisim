'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
  if (error) throw new Error(error.message)
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
  const { data: item, error } = await supabase
    .from('boq_items')
    .insert({ ...data, project_id: projectId })
    .select()
    .single()
  if (error) throw new Error(error.message)
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
  const { error } = await supabase
    .from('boq_items')
    .insert(items.map(item => ({ ...item, project_id: projectId })))
  if (error) throw new Error(error.message)
  revalidatePath('/projects/[id]/boq', 'page')
}
