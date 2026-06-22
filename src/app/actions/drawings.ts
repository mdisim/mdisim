'use server'

import { createClient } from '@/lib/supabase/server'
import type { Drawing } from '@/lib/types'

export async function getDrawings(projectId: string): Promise<Drawing[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('drawings')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  return (data ?? []) as Drawing[]
}

export async function getDrawing(id: string): Promise<Drawing | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('drawings')
    .select('*')
    .eq('id', id)
    .single()

  return data as Drawing | null
}

export async function createDrawing(fields: {
  project_id: string
  name: string
  drawing_type?: string
  revision?: string
  file_path: string
  file_type: string
  file_size?: number
  page_count?: number
}): Promise<{ data?: Drawing; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('drawings')
    .insert({
      ...fields,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as Drawing }
}

export async function deleteDrawing(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: drawing } = await supabase
    .from('drawings')
    .select('file_path')
    .eq('id', id)
    .single()

  if (drawing?.file_path) {
    await supabase.storage.from('drawings').remove([drawing.file_path])
  }

  const { error } = await supabase.from('drawings').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function getDrawingUrl(filePath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from('drawings')
    .createSignedUrl(filePath, 3600)

  return data?.signedUrl ?? null
}
