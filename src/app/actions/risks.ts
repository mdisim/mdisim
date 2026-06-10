'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getProjectRisks(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_risks')
    .select('*')
    .eq('project_id', projectId)
    .order('risk_score', { ascending: false })
  if (error) return { error: error.message, data: [] }
  return { data: data ?? [] }
}

export async function createProjectRisk(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('project_risks').insert({
    project_id: projectId,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    category: (formData.get('category') as string) || 'general',
    probability: (formData.get('probability') as string) || 'medium',
    impact: (formData.get('impact') as string) || 'medium',
    mitigation: (formData.get('mitigation') as string) || null,
    owner: (formData.get('owner') as string) || null,
    status: (formData.get('status') as string) || 'open',
    due_date: (formData.get('due_date') as string) || null,
    created_by: user?.id ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/risks`)
  return { success: true }
}

export async function updateProjectRisk(id: string, projectId: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('project_risks').update({
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    category: (formData.get('category') as string) || 'general',
    probability: (formData.get('probability') as string) || 'medium',
    impact: (formData.get('impact') as string) || 'medium',
    mitigation: (formData.get('mitigation') as string) || null,
    owner: (formData.get('owner') as string) || null,
    status: (formData.get('status') as string) || 'open',
    due_date: (formData.get('due_date') as string) || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/risks`)
  return { success: true }
}

export async function deleteProjectRisk(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('project_risks').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/risks`)
  return { success: true }
}
