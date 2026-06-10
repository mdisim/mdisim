'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getProjectIssues(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_issues')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) return { error: error.message, data: [] }
  return { data: data ?? [] }
}

export async function createProjectIssue(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Auto-generate issue number
  const { count } = await supabase
    .from('project_issues')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
  const issueNum = `ISS-${String((count ?? 0) + 1).padStart(3, '0')}`

  const { error } = await supabase.from('project_issues').insert({
    project_id: projectId,
    issue_number: issueNum,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    category: (formData.get('category') as string) || 'general',
    priority: (formData.get('priority') as string) || 'medium',
    status: (formData.get('status') as string) || 'open',
    raised_by: (formData.get('raised_by') as string) || null,
    assigned_to: (formData.get('assigned_to') as string) || null,
    due_date: (formData.get('due_date') as string) || null,
    resolution_notes: (formData.get('resolution_notes') as string) || null,
    created_by: user?.id ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/issues`)
  return { success: true }
}

export async function updateProjectIssue(id: string, projectId: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('project_issues').update({
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    category: (formData.get('category') as string) || 'general',
    priority: (formData.get('priority') as string) || 'medium',
    status: (formData.get('status') as string) || 'open',
    raised_by: (formData.get('raised_by') as string) || null,
    assigned_to: (formData.get('assigned_to') as string) || null,
    due_date: (formData.get('due_date') as string) || null,
    resolved_date: (formData.get('resolved_date') as string) || null,
    resolution_notes: (formData.get('resolution_notes') as string) || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/issues`)
  return { success: true }
}

export async function advanceIssueStatus(id: string, projectId: string, currentStatus: string) {
  const supabase = await createClient()
  const next: Record<string, string> = {
    open: 'in_progress',
    in_progress: 'resolved',
    resolved: 'closed',
  }
  const newStatus = next[currentStatus] ?? currentStatus
  const updates: Record<string, string> = { status: newStatus, updated_at: new Date().toISOString() }
  if (newStatus === 'resolved') updates.resolved_date = new Date().toISOString().split('T')[0]

  const { error } = await supabase.from('project_issues').update(updates).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/issues`)
  return { success: true }
}

export async function deleteProjectIssue(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('project_issues').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/issues`)
  return { success: true }
}
