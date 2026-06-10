'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getTenders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
  if (!profile?.company_id) return { data: [], error: 'No company' }

  const { data, error } = await supabase
    .from('tenders')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })

  return { data: data ?? [], error: error?.message }
}

export async function createTender(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
  if (!profile?.company_id) return { error: 'No company' }

  const { error } = await supabase.from('tenders').insert({
    company_id: profile.company_id,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    client_name: (formData.get('client_name') as string) || null,
    tender_number: (formData.get('tender_number') as string) || null,
    issue_date: (formData.get('issue_date') as string) || null,
    submission_deadline: (formData.get('submission_deadline') as string) || null,
    status: (formData.get('status') as string) || 'draft',
    estimated_value: parseFloat(formData.get('estimated_value') as string) || 0,
    submitted_value: formData.get('submitted_value') ? parseFloat(formData.get('submitted_value') as string) : null,
    notes: (formData.get('notes') as string) || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath('/tenders')
  return { success: true }
}

export async function updateTender(id: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('tenders').update({
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    client_name: (formData.get('client_name') as string) || null,
    tender_number: (formData.get('tender_number') as string) || null,
    issue_date: (formData.get('issue_date') as string) || null,
    submission_deadline: (formData.get('submission_deadline') as string) || null,
    status: formData.get('status') as string,
    estimated_value: parseFloat(formData.get('estimated_value') as string) || 0,
    submitted_value: formData.get('submitted_value') ? parseFloat(formData.get('submitted_value') as string) : null,
    notes: (formData.get('notes') as string) || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/tenders')
  revalidatePath(`/tenders/${id}`)
  return { success: true }
}

export async function deleteTender(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tenders').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/tenders')
  return { success: true }
}

export async function advanceTenderStatus(id: string, newStatus: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tenders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/tenders')
  revalidatePath(`/tenders/${id}`)
  return { success: true }
}
