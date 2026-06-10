'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getContracts(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_contracts')
    .select('*, contractor:contractors(name, company)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  return { data: data ?? [], error: error?.message }
}

export async function createContract(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('project_contracts').insert({
    project_id: projectId,
    contractor_id: (formData.get('contractor_id') as string) || null,
    title: formData.get('title') as string,
    contract_number: (formData.get('contract_number') as string) || null,
    contract_type: (formData.get('contract_type') as string) || 'lump_sum',
    value: parseFloat(formData.get('value') as string) || 0,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    status: (formData.get('status') as string) || 'draft',
    retention_percent: parseFloat(formData.get('retention_percent') as string) || 0,
    notes: (formData.get('notes') as string) || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/contracts`)
  return { success: true }
}

export async function updateContract(id: string, projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('project_contracts').update({
    contractor_id: (formData.get('contractor_id') as string) || null,
    title: formData.get('title') as string,
    contract_number: (formData.get('contract_number') as string) || null,
    contract_type: formData.get('contract_type') as string,
    value: parseFloat(formData.get('value') as string) || 0,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    status: formData.get('status') as string,
    retention_percent: parseFloat(formData.get('retention_percent') as string) || 0,
    notes: (formData.get('notes') as string) || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/contracts`)
  return { success: true }
}

export async function deleteContract(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('project_contracts').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/contracts`)
  return { success: true }
}
