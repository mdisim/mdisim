'use server'

import { createClient } from '@/lib/supabase/server'
import type { MeasurementSketch } from '@/lib/types'
import { isValidUUID } from '@/lib/validate'

export async function getSketches(params: {
  projectId: string
  miId?: string
  drawingMeasurementId?: string
  drawingId?: string
}): Promise<MeasurementSketch[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('qb_measurement_sketches')
    .select('*')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })

  if (params.miId) query = query.eq('mi_id', params.miId)
  if (params.drawingMeasurementId) query = query.eq('drawing_measurement_id', params.drawingMeasurementId)
  if (params.drawingId) query = query.eq('drawing_id', params.drawingId)

  const { data } = await query
  return (data ?? []) as MeasurementSketch[]
}

export async function createSketch(params: {
  projectId: string
  drawingId?: string
  drawingMeasurementId?: string
  miId?: string
  imageDataUrl: string
  quantity?: number
  unit?: string
  formula?: string
  scaleLabel?: string
  pageNumber?: number
  drawingName?: string
  drawingNumber?: string
  revisionNumber?: string
  drawingRef?: string
  notes?: string
  snapshotType?: 'auto' | 'manual'
}): Promise<{ data?: MeasurementSketch; error?: string }> {
  if (!isValidUUID(params.projectId)) return { error: 'Invalid project ID' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Upload canvas snapshot to storage
  let filePath: string | null = null
  if (params.imageDataUrl && params.imageDataUrl.startsWith('data:')) {
    const base64 = params.imageDataUrl.split(',')[1]
    const binary = Buffer.from(base64, 'base64')
    const fileName = `${params.projectId}/${crypto.randomUUID()}.png`

    const { error: upErr } = await supabase.storage
      .from('qb-attachments')
      .upload(fileName, binary, { contentType: 'image/png', upsert: false })

    if (!upErr) filePath = fileName
  }

  const { data, error } = await supabase
    .from('qb_measurement_sketches')
    .insert({
      project_id: params.projectId,
      drawing_id: params.drawingId ?? null,
      drawing_measurement_id: params.drawingMeasurementId ?? null,
      mi_id: params.miId ?? null,
      file_path: filePath,
      quantity: params.quantity ?? null,
      unit: params.unit ?? null,
      formula: params.formula ?? null,
      scale_label: params.scaleLabel ?? null,
      page_number: params.pageNumber ?? null,
      drawing_name: params.drawingName ?? null,
      drawing_number: params.drawingNumber ?? null,
      revision_number: params.revisionNumber ?? null,
      drawing_ref: params.drawingRef ?? null,
      notes: params.notes ?? null,
      snapshot_type: params.snapshotType ?? 'auto',
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as MeasurementSketch }
}

export async function deleteSketch(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: sketch } = await supabase
    .from('qb_measurement_sketches')
    .select('file_path')
    .eq('id', id)
    .single()

  if (sketch?.file_path) {
    await supabase.storage.from('qb-attachments').remove([sketch.file_path])
  }

  const { error } = await supabase
    .from('qb_measurement_sketches')
    .delete()
    .eq('id', id)

  return error ? { error: error.message } : {}
}

export async function getSketchImageUrl(filePath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from('qb-attachments')
    .createSignedUrl(filePath, 3600)
  return data?.signedUrl ?? null
}
