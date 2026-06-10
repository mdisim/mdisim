'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBOQItem(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('boq_items').insert({
    project_id: projectId,
    item_code: formData.get('item_code') as string,
    description: formData.get('description') as string,
    unit: formData.get('unit') as string,
    quantity: parseFloat(formData.get('quantity') as string) || 0,
    unit_rate: parseFloat(formData.get('unit_rate') as string) || 0,
    category: formData.get('category') as string || null,
    notes: formData.get('notes') as string || null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/boq`)
  return { success: true }
}

export async function updateBOQItem(id: string, projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('boq_items').update({
    item_code: formData.get('item_code') as string,
    description: formData.get('description') as string,
    unit: formData.get('unit') as string,
    quantity: parseFloat(formData.get('quantity') as string) || 0,
    unit_rate: parseFloat(formData.get('unit_rate') as string) || 0,
    category: formData.get('category') as string || null,
    notes: formData.get('notes') as string || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/boq`)
  return { success: true }
}

export async function deleteBOQItem(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('boq_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/boq`)
  return { success: true }
}

export interface BulkBOQItem {
  item_code: string
  description: string
  unit: string
  quantity: number
  unit_rate: number
  category: string | null
}

export async function bulkCreateBOQItems(projectId: string, items: BulkBOQItem[]) {
  const supabase = await createClient()
  const rows = items.map((item) => ({
    project_id: projectId,
    item_code: item.item_code,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unit_rate: item.unit_rate,
    category: item.category || null,
    notes: null,
  }))
  const { error } = await supabase.from('boq_items').insert(rows)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/boq`)
  return { success: true, count: rows.length }
}
