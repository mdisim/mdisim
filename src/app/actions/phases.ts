'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPhase(projectId: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('project_phases').insert({
    project_id: projectId,
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    progress_percent: parseInt(formData.get('progress_percent') as string) || 0,
    status: (formData.get('status') as string) || 'not_started',
    sort_order: parseInt(formData.get('sort_order') as string) || 0,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/phases`)
  return { success: true }
}

export async function updatePhase(id: string, projectId: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('project_phases').update({
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
    start_date: (formData.get('start_date') as string) || null,
    end_date: (formData.get('end_date') as string) || null,
    progress_percent: parseInt(formData.get('progress_percent') as string) || 0,
    status: formData.get('status') as string,
    sort_order: parseInt(formData.get('sort_order') as string) || 0,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/phases`)
  return { success: true }
}

export async function deletePhase(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('project_phases').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/phases`)
  return { success: true }
}

export async function createMilestone(projectId: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('project_milestones').insert({
    project_id: projectId,
    phase_id: (formData.get('phase_id') as string) || null,
    name: formData.get('name') as string,
    due_date: (formData.get('due_date') as string) || null,
    completed_date: (formData.get('completed_date') as string) || null,
    status: (formData.get('status') as string) || 'pending',
    notes: (formData.get('notes') as string) || null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/phases`)
  return { success: true }
}

export async function deleteMilestone(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('project_milestones').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/phases`)
  return { success: true }
}
