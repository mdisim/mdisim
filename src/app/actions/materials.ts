'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getMaterialDeliveries(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('material_deliveries')
    .select('*')
    .eq('project_id', projectId)
    .order('delivery_date', { ascending: false })
  if (error) return { error: error.message, data: [] }
  return { data: data ?? [] }
}

export async function createMaterialDelivery(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('material_deliveries').insert({
    project_id: projectId,
    material_name: formData.get('material_name') as string,
    category: (formData.get('category') as string) || null,
    quantity: parseFloat(formData.get('quantity') as string) || 0,
    unit: formData.get('unit') as string,
    delivery_date: formData.get('delivery_date') as string,
    supplier: (formData.get('supplier') as string) || null,
    delivery_note_number: (formData.get('delivery_note_number') as string) || null,
    received_by: (formData.get('received_by') as string) || null,
    location_on_site: (formData.get('location_on_site') as string) || null,
    notes: (formData.get('notes') as string) || null,
    created_by: user?.id ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/materials`)
  return { success: true }
}

export async function deleteMaterialDelivery(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('material_deliveries').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/materials`)
  return { success: true }
}

export async function approveMaterial(id: string, projectId: string, approvedBy: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('material_deliveries').update({
    approval_status: 'approved',
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
    rejection_reason: null,
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/materials`)
  return { success: true }
}

export async function rejectMaterial(id: string, projectId: string, reason: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('material_deliveries').update({
    approval_status: 'rejected',
    rejection_reason: reason,
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/materials`)
  return { success: true }
}
