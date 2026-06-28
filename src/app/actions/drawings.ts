'use server'

import { createClient } from '@/lib/supabase/server'
import type { Drawing, DrawingScale, DrawingMeasurement } from '@/lib/types'
import { isValidUUID } from '@/lib/validate'

export async function getDrawings(projectId: string): Promise<Drawing[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('qb_drawings')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  return (data ?? []) as Drawing[]
}

export async function getDrawing(id: string): Promise<Drawing | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('qb_drawings')
    .select('*')
    .eq('id', id)
    .single()

  return data as Drawing | null
}

export async function createDrawing(fields: {
  project_id: string
  name: string
  drawing_number?: string
  drawing_type?: string
  revision_number?: string
  revision_date?: string
  revision_notes?: string
  file_path: string
  file_type: string
  file_size?: number
  page_count?: number
}): Promise<{ data?: Drawing; error?: string }> {
  if (!isValidUUID(fields.project_id)) return { error: 'Invalid project ID' }
  if (!fields.name?.trim()) return { error: 'Drawing name is required' }
  if (!fields.file_path?.trim()) return { error: 'File path is required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', fields.project_id)
    .single()

  if (!project) {
    return { error: 'Project not found. Verify the project exists and you have access.' }
  }

  const { data, error } = await supabase
    .from('qb_drawings')
    .insert({
      ...fields,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.message.includes('foreign key constraint')) {
      return { error: 'Database schema mismatch: run migration 215_fix_all_project_fks.sql in Supabase SQL Editor.' }
    }
    return { error: error.message }
  }
  return { data: data as Drawing }
}

export async function deleteDrawing(id: string): Promise<{ error?: string }> {
  if (!isValidUUID(id)) return { error: 'Invalid ID' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: drawing } = await supabase
    .from('qb_drawings')
    .select('file_path')
    .eq('id', id)
    .single()

  if (drawing?.file_path) {
    await supabase.storage.from('qb-drawings').remove([drawing.file_path])
  }

  const { error } = await supabase.from('qb_drawings').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function getDrawingUrl(filePath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.storage
    .from('qb-drawings')
    .createSignedUrl(filePath, 3600)

  return data?.signedUrl ?? null
}

// ── Scales ──────────────────────────────────────────────────────────────

export async function getDrawingScales(drawingId: string): Promise<DrawingScale[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('qb_drawing_scales')
    .select('*')
    .eq('drawing_id', drawingId)
    .order('page_number')

  return (data ?? []) as DrawingScale[]
}

export async function createDrawingScale(fields: {
  drawing_id: string
  page_number: number
  label?: string
  pt1_x: number
  pt1_y: number
  pt2_x: number
  pt2_y: number
  real_length: number
  unit: string
  px_per_unit: number
}): Promise<{ data?: DrawingScale; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('qb_drawing_scales')
    .insert(fields)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as DrawingScale }
}

// ── Drawing Measurements ────────────────────────────────────────────────

export async function getDrawingMeasurements(drawingId: string, pageNumber?: number): Promise<DrawingMeasurement[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('qb_drawing_measurements')
    .select('*')
    .eq('drawing_id', drawingId)

  if (pageNumber !== undefined) {
    query = query.eq('page_number', pageNumber)
  }

  const { data } = await query.order('created_at')

  return (data ?? []) as DrawingMeasurement[]
}

export async function createDrawingMeasurement(fields: {
  drawing_id: string
  page_number: number
  scale_id?: string
  tool_type: string
  coordinates: unknown
  quantity: number
  unit?: string
  label?: string
  color?: string
  notes?: string
}): Promise<{ data?: DrawingMeasurement; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data, error } = await supabase
    .from('qb_drawing_measurements')
    .insert(fields)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as DrawingMeasurement }
}

export async function updateDrawingMeasurement(
  id: string,
  fields: Partial<Pick<DrawingMeasurement, 'label' | 'color' | 'notes' | 'quantity' | 'unit' | 'coordinates'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('qb_drawing_measurements')
    .update(fields)
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function deleteDrawingMeasurement(id: string): Promise<{ error?: string }> {
  if (!isValidUUID(id)) return { error: 'Invalid ID' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('qb_drawing_measurements')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function deleteDrawingScale(id: string): Promise<{ error?: string }> {
  if (!isValidUUID(id)) return { error: 'Invalid ID' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('qb_drawing_scales')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}
