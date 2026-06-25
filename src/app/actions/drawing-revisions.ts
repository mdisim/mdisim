'use server'

import { createClient } from '@/lib/supabase/server'
import type { DrawingRevision, QuantityChange } from '@/lib/types'

export async function getDrawingRevisions(drawingId: string): Promise<DrawingRevision[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('qb_drawing_revisions')
    .select('*')
    .eq('drawing_id', drawingId)
    .order('revision_date', { ascending: false })
  return (data ?? []) as DrawingRevision[]
}

export async function createDrawingRevision(fields: {
  drawing_id: string
  revision_number: string
  revision_date?: string
  description?: string
  file_path?: string
  file_size?: number
  status?: string
}): Promise<{ data?: DrawingRevision; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (fields.status === 'current') {
    await supabase
      .from('qb_drawing_revisions')
      .update({ status: 'superseded' })
      .eq('drawing_id', fields.drawing_id)
      .eq('status', 'current')
  }

  const { data, error } = await supabase
    .from('qb_drawing_revisions')
    .insert(fields)
    .select()
    .single()
  if (error) return { error: error.message }
  return { data: data as DrawingRevision }
}

export async function deleteDrawingRevision(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('qb_drawing_revisions').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function getQuantityChanges(projectId: string): Promise<QuantityChange[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('qb_quantity_changes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return (data ?? []) as QuantityChange[]
}

export async function createQuantityChange(fields: {
  project_id: string
  drawing_id?: string
  from_revision_id?: string
  to_revision_id?: string
  boq_item_id?: string
  mi_id?: string
  description: string
  previous_qty: number
  new_qty: number
  unit: string
  change_type?: string
  notes?: string
}): Promise<{ data?: QuantityChange; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('qb_quantity_changes')
    .insert(fields)
    .select()
    .single()
  if (error) return { error: error.message }
  return { data: data as QuantityChange }
}

export async function deleteQuantityChange(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('qb_quantity_changes').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}
