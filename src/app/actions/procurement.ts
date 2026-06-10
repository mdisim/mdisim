'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getPurchaseOrders(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  return { data: data ?? [], error: error?.message }
}

export async function createPurchaseOrder(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const quantity = parseFloat(formData.get('quantity') as string) || 1
  const unit_price = parseFloat(formData.get('unit_price') as string) || 0

  const { error } = await supabase.from('purchase_orders').insert({
    project_id: projectId,
    po_number: formData.get('po_number') as string,
    supplier: formData.get('supplier') as string,
    description: (formData.get('description') as string) || null,
    category: (formData.get('category') as string) || null,
    quantity,
    unit: (formData.get('unit') as string) || null,
    unit_price,
    total_amount: quantity * unit_price,
    order_date: (formData.get('order_date') as string) || null,
    expected_delivery: (formData.get('expected_delivery') as string) || null,
    actual_delivery: (formData.get('actual_delivery') as string) || null,
    status: (formData.get('status') as string) || 'draft',
    notes: (formData.get('notes') as string) || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/procurement`)
  return { success: true }
}

export async function updatePurchaseOrderStatus(id: string, projectId: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('purchase_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/procurement`)
  return { success: true }
}

export async function deletePurchaseOrder(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('purchase_orders').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/procurement`)
  return { success: true }
}
