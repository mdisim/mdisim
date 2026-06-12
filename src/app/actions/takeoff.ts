'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDrawingRecord(projectId: string, data: {
  name: string
  original_filename: string
  storage_path: string
  file_size_bytes: number
  page_count: number
  file_type?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: drawing, error } = await supabase.from('drawing_files').insert({
    project_id: projectId,
    ...data,
    created_by: user.id,
    status: 'ready',
  }).select().single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/takeoff`)
  return { success: true, id: drawing.id }
}

export async function updateDrawingName(id: string, projectId: string, name: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('drawing_files').update({ name }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/takeoff`)
  return { success: true }
}

export async function deleteDrawing(id: string, projectId: string, storagePath: string) {
  const supabase = await createClient()
  await supabase.storage.from('drawings').remove([storagePath])
  const { error } = await supabase.from('drawing_files').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/takeoff`)
  return { success: true }
}

export async function getSignedUrl(storagePath: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from('drawings').createSignedUrl(storagePath, 3600)
  if (error) return { error: error.message }
  return { url: data.signedUrl }
}

export async function saveCalibration(drawingId: string, pageNumber: number, data: {
  pixels_distance: number
  real_distance: number
  real_unit: string
  scale_factor: number
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('drawing_calibrations').upsert({
    drawing_id: drawingId,
    page_number: pageNumber,
    ...data,
  }, { onConflict: 'drawing_id,page_number' })
  if (error) return { error: error.message }
  return { success: true }
}

export async function saveMeasurement(data: {
  drawing_id: string
  boq_item_id?: string | null
  page_number: number
  label?: string | null
  measurement_type: string
  tool_type?: string | null
  points: { x: number; y: number }[]
  color: string
  real_value?: number | null
  unit?: string | null
  notes?: string | null
  material_spec?: Record<string, unknown> | null
  computed_quantity?: number | null
  computed_unit?: string | null
}) {
  const supabase = await createClient()
  const { data: m, error } = await supabase.from('drawing_measurements').insert(data).select().single()
  if (error) return { error: error.message }
  return { success: true, measurement: m }
}

export async function updateMeasurement(id: string, data: Partial<{
  label: string | null
  boq_item_id: string | null
  real_value: number | null
  unit: string | null
  notes: string | null
  color: string
  points: { x: number; y: number }[]
}>) {
  const supabase = await createClient()
  const { error } = await supabase.from('drawing_measurements').update(data).eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteMeasurement(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('drawing_measurements').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function getMeasurements(drawingId: string, pageNumber: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('drawing_measurements')
    .select('*, boq_item:boq_items(item_code, description, unit)')
    .eq('drawing_id', drawingId)
    .eq('page_number', pageNumber)
    .order('sort_order')
  if (error) return { error: error.message }
  return { measurements: data ?? [] }
}

export async function getAllMeasurements(drawingId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('drawing_measurements')
    .select('*, boq_item:boq_items(item_code, description, unit)')
    .eq('drawing_id', drawingId)
    .order('page_number')
    .order('sort_order')
  if (error) return { error: error.message }
  return { measurements: data ?? [] }
}

export async function generateBOQQuantities(drawingId: string, projectId: string) {
  const supabase = await createClient()
  const { data: measurements } = await supabase
    .from('drawing_measurements')
    .select('boq_item_id, real_value, measurement_type')
    .eq('drawing_id', drawingId)
    .not('boq_item_id', 'is', null)

  if (!measurements) return { error: 'No measurements found' }

  // Group by boq_item_id and sum real_value
  const totals: Record<string, number> = {}
  for (const m of measurements) {
    if (m.boq_item_id && m.real_value) {
      totals[m.boq_item_id] = (totals[m.boq_item_id] ?? 0) + m.real_value
    }
  }

  // Update boq_items quantities
  const updates = Object.entries(totals).map(([id, quantity]) =>
    supabase.from('boq_items').update({ quantity }).eq('id', id)
  )
  await Promise.all(updates)

  revalidatePath(`/projects/${projectId}/boq`)
  return { success: true, updated: Object.keys(totals).length }
}

// ────────────────────────────────────────────
// Drawing Layers
// ────────────────────────────────────────────
export async function getLayers(drawingId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('drawing_layers')
    .select('*')
    .eq('drawing_id', drawingId)
    .order('sort_order')
  if (error) return { error: error.message, layers: [] }
  return { layers: data ?? [] }
}

export async function createLayer(drawingId: string, data: {
  name: string
  discipline: string
  color: string
}) {
  const supabase = await createClient()
  const { data: layer, error } = await supabase
    .from('drawing_layers')
    .insert({ drawing_id: drawingId, ...data })
    .select()
    .single()
  if (error) return { error: error.message }
  return { success: true, layer }
}

export async function updateLayer(id: string, data: Partial<{
  name: string
  color: string
  is_visible: boolean
}>) {
  const supabase = await createClient()
  const { error } = await supabase.from('drawing_layers').update(data).eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteLayer(id: string) {
  const supabase = await createClient()
  await supabase.from('drawing_measurements').update({ layer_id: null }).eq('layer_id', id)
  const { error } = await supabase.from('drawing_layers').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function assignMeasurementLayer(measurementId: string, layerId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase.from('drawing_measurements').update({ layer_id: layerId }).eq('id', measurementId)
  if (error) return { error: error.message }
  return { success: true }
}

// ────────────────────────────────────────────
// Measurement History
// ────────────────────────────────────────────
export async function getMeasurementHistory(measurementId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('measurement_history')
    .select('*')
    .eq('measurement_id', measurementId)
    .order('changed_at', { ascending: false })
    .limit(50)
  if (error) return { error: error.message, history: [] }
  return { history: data ?? [] }
}

export async function recordMeasurementHistory(
  measurementId: string,
  changeType: 'created' | 'updated' | 'linked' | 'unlinked',
  previousValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('measurement_history').insert({
    measurement_id: measurementId,
    changed_by: user?.id ?? null,
    change_type: changeType,
    previous_value: previousValue,
    new_value: newValue,
  })
}
