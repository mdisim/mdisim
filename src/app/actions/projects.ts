'use server'

import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/lib/types'

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('created_by', user.id)
    .order('updated_at', { ascending: false })

  return (data ?? []) as Project[]
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  return data as Project | null
}

export async function createProject(fields: {
  name: string
  client_name?: string
  location?: string
  currency?: string
  description?: string
}): Promise<{ data?: Project; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      created_by: user.id,
      name: fields.name,
      client_name: fields.client_name || null,
      location: fields.location || null,
      currency: fields.currency || 'USD',
      description: fields.description || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as Project }
}

export async function updateProject(
  id: string,
  fields: Partial<Pick<Project, 'name' | 'client_name' | 'location' | 'currency' | 'description'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update(fields)
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function deleteProject(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}
