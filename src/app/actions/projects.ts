'use server'

import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/lib/types'
import { requireUUID, requireString, ValidationError } from '@/lib/validate'

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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

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
  try { requireString(fields.name, 'Project name') } catch (e) {
    if (e instanceof ValidationError) return { error: e.message }
    throw e
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // 1. Try to get company_id from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  let companyId: string | null = profile?.company_id ?? null

  // 2. If no company, create one and link to profile
  if (!companyId) {
    const domain = user.email?.split('@')[1] ?? 'workspace'
    const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)

    const { data: company, error: companyErr } = await supabase
      .from('companies')
      .insert({ name: companyName + ' Workspace' })
      .select('id')
      .single()

    if (companyErr || !company) {
      return { error: 'Failed to create workspace: ' + (companyErr?.message ?? 'unknown') }
    }

    companyId = company.id

    // Link company to profile (upsert in case profile doesn't exist yet)
    await supabase
      .from('profiles')
      .upsert({ id: user.id, company_id: companyId, role: 'company_admin' })
  }

  // 3. Insert project with company_id
  const { data, error } = await supabase
    .from('projects')
    .insert({
      created_by: user.id,
      company_id: companyId,
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('projects')
    .update(fields)
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) return { error: error.message }
  return {}
}

export async function deleteProject(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id)

  if (error) return { error: error.message }
  return {}
}
