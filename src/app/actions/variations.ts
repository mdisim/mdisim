'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAction } from './audit'

export async function getVariations(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('variations')
    .select('*')
    .eq('project_id', projectId)
    .order('variation_number', { ascending: true })
  if (error) return { error: error.message, data: [] }
  return { data: data ?? [] }
}

export async function createVariation(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('variations').insert({
    project_id: projectId,
    variation_number: formData.get('variation_number') as string,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    type: (formData.get('type') as string) || 'addition',
    status: 'pending',
    amount: parseFloat(formData.get('amount') as string) || 0,
    raised_by: (formData.get('raised_by') as string) || null,
    notes: (formData.get('notes') as string) || null,
    created_by: user?.id ?? null,
  })

  if (error) return { error: error.message }
  await logAction({ action: 'created', resource_type: 'variation', resource_name: formData.get('title') as string })
  revalidatePath(`/projects/${projectId}/variations`)
  return { success: true }
}

export async function updateVariation(id: string, projectId: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('variations').update({
    variation_number: formData.get('variation_number') as string,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    type: formData.get('type') as string,
    status: formData.get('status') as string,
    amount: parseFloat(formData.get('amount') as string) || 0,
    approved_amount: formData.get('approved_amount') ? parseFloat(formData.get('approved_amount') as string) : null,
    submitted_date: (formData.get('submitted_date') as string) || null,
    approved_date: (formData.get('approved_date') as string) || null,
    raised_by: (formData.get('raised_by') as string) || null,
    approved_by: (formData.get('approved_by') as string) || null,
    notes: (formData.get('notes') as string) || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/variations`)
  return { success: true }
}

export async function deleteVariation(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('variations').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/variations`)
  return { success: true }
}

export async function advanceVariationStatus(id: string, projectId: string, newStatus: string) {
  const supabase = await createClient()
  const updates: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'submitted') updates.submitted_date = new Date().toISOString().split('T')[0]
  if (newStatus === 'approved' || newStatus === 'rejected') updates.approved_date = new Date().toISOString().split('T')[0]

  const { error } = await supabase.from('variations').update(updates).eq('id', id)
  if (error) return { error: error.message }
  await logAction({ action: 'status_changed', resource_type: 'variation', resource_id: id, new_values: { status: newStatus } })
  revalidatePath(`/projects/${projectId}/variations`)
  return { success: true }
}
