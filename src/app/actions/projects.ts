'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ensureUserProfile } from './profile'
import { logAction } from './audit'

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const profileResult = await ensureUserProfile()
  if ('error' in profileResult) return { error: profileResult.error }

  const { error } = await supabase.from('projects').insert({
    created_by: user.id,
    company_id: profileResult.company_id,
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
    status: formData.get('status') as string || 'planning',
    start_date: formData.get('start_date') as string || null,
    end_date: formData.get('end_date') as string || null,
    budget: parseFloat(formData.get('budget') as string) || 0,
    location: formData.get('location') as string || null,
    client_name: formData.get('client_name') as string || null,
  })

  if (error) return { error: error.message }
  await logAction({ action: 'created', resource_type: 'project', resource_name: formData.get('name') as string })
  revalidatePath('/projects')
  return { success: true }
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('projects').update({
    name: formData.get('name') as string,
    description: formData.get('description') as string || null,
    status: formData.get('status') as string,
    start_date: formData.get('start_date') as string || null,
    end_date: formData.get('end_date') as string || null,
    budget: parseFloat(formData.get('budget') as string) || 0,
    location: formData.get('location') as string || null,
    client_name: formData.get('client_name') as string || null,
  }).eq('id', id).eq('created_by', user.id)

  if (error) return { error: error.message }
  revalidatePath('/projects')
  revalidatePath(`/projects/${id}`)
  return { success: true }
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('projects').delete().eq('id', id).eq('created_by', user.id)
  if (error) return { error: error.message }
  await logAction({ action: 'deleted', resource_type: 'project', resource_id: id })
  revalidatePath('/projects')
  return { success: true }
}
