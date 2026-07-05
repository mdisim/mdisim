'use server'

import { createClient } from '@/lib/supabase/server'
import type { DrawingRevision, QuantityChange } from '@/lib/types'

export async function getDrawingRevisionsForProject(projectId: string): Promise<DrawingRevision[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('qb_drawing_revisions')
    .select('*, qb_drawings!inner(project_id)')
    .eq('qb_drawings.project_id', projectId)
    .order('revision_date', { ascending: false })
  return (data ?? []) as DrawingRevision[]
}

export async function getDrawingRevisionsByIds(ids: string[]): Promise<DrawingRevision[]> {
  if (ids.length === 0) return []
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('qb_drawing_revisions')
    .select('*')
    .in('id', ids)
  return (data ?? []) as DrawingRevision[]
}

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
    const { error: supersededError } = await supabase
      .from('qb_drawing_revisions')
      .update({ status: 'superseded' })
      .eq('drawing_id', fields.drawing_id)
      .eq('status', 'current')
    if (supersededError) return { error: 'Failed to supersede existing revisions: ' + supersededError.message }
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

export async function getQuantityChanges(projectId: string, opts?: { boqItemId?: string; miId?: string }): Promise<QuantityChange[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  let query = supabase
    .from('qb_quantity_changes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (opts?.boqItemId && opts?.miId) {
    query = query.or(`boq_item_id.eq.${opts.boqItemId},mi_id.eq.${opts.miId}`)
  } else if (opts?.boqItemId) {
    query = query.eq('boq_item_id', opts.boqItemId)
  } else if (opts?.miId) {
    query = query.eq('mi_id', opts.miId)
  }
  const { data } = await query
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
