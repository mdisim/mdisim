'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAction } from './audit'

export async function createCostEntry(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('cost_entries').insert({
    project_id: projectId,
    boq_item_id: formData.get('boq_item_id') as string || null,
    description: formData.get('description') as string,
    amount: parseFloat(formData.get('amount') as string) || 0,
    cost_date: formData.get('cost_date') as string,
    category: formData.get('category') as string,
    invoice_number: formData.get('invoice_number') as string || null,
    vendor: formData.get('vendor') as string || null,
    status: formData.get('status') as string || 'pending',
    notes: formData.get('notes') as string || null,
  })

  if (error) return { error: error.message }
  await logAction({ action: 'created', resource_type: 'cost_entry', resource_name: formData.get('description') as string })
  revalidatePath(`/projects/${projectId}/costs`)
  return { success: true }
}

export async function updateCostStatus(id: string, projectId: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('cost_entries').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/costs`)
  return { success: true }
}

export async function deleteCostEntry(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('cost_entries').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/costs`)
  return { success: true }
}
