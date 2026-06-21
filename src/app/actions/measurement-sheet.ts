'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type EntryData = {
  boq_item_id?: string | null
  description?: string | null
  reference?: string | null
  nr?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  unit?: string | null
  notes?: string | null
  sort_order?: number | null
}

function calculateQuantity(data: {
  nr?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
}): number {
  const nr = data.nr ?? 1
  const dims = [data.length, data.width, data.height].filter(
    (v): v is number => v != null
  )
  if (dims.length === 0) return nr
  return nr * dims.reduce((acc, d) => acc * d, 1)
}

function revalidatePaths(projectId: string) {
  revalidatePath(`/projects/${projectId}/boq`, 'page')
  revalidatePath(`/projects/${projectId}/measurements`, 'page')
}

export async function getMeasurementSheetEntries(
  projectId: string,
  boqItemId?: string
): Promise<{ data: Record<string, unknown>[] | null; error: string | null }> {
  const supabase = await createClient()

  let query = supabase
    .from('measurement_sheet_entries')
    .select('*, boq_items(item_code, description)')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (boqItemId) {
    query = query.eq('boq_item_id', boqItemId)
  }

  const { data, error } = await query

  if (error) return { data: null, error: error.message }
  return { data: data as Record<string, unknown>[], error: null }
}

export async function createMeasurementEntry(
  projectId: string,
  data: EntryData
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const supabase = await createClient()

  const quantity = calculateQuantity(data)
  const payload = {
    ...data,
    project_id: projectId,
    quantity,
  }

  const { data: entry, error } = await supabase
    .from('measurement_sheet_entries')
    .insert(payload)
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePaths(projectId)
  return { data: entry as Record<string, unknown>, error: null }
}

export async function updateMeasurementEntry(
  id: string,
  data: Partial<EntryData>
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  // If any dimension field changed, recalculate quantity
  const dimensionFields = ['nr', 'length', 'width', 'height'] as const
  const hasDimensionChange = dimensionFields.some((f) => f in data)

  let updatePayload: Record<string, unknown> = { ...data }

  if (hasDimensionChange) {
    // Fetch current entry to merge dimensions
    const { data: current, error: fetchError } = await supabase
      .from('measurement_sheet_entries')
      .select('nr, length, width, height, project_id')
      .eq('id', id)
      .single()

    if (fetchError) return { success: false, error: fetchError.message }

    const merged = {
      nr: 'nr' in data ? data.nr : (current as Record<string, unknown>).nr as number | null,
      length: 'length' in data ? data.length : (current as Record<string, unknown>).length as number | null,
      width: 'width' in data ? data.width : (current as Record<string, unknown>).width as number | null,
      height: 'height' in data ? data.height : (current as Record<string, unknown>).height as number | null,
    }
    updatePayload.quantity = calculateQuantity(merged)

    const { error } = await supabase
      .from('measurement_sheet_entries')
      .update(updatePayload)
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    const projectId = (current as Record<string, unknown>).project_id as string
    revalidatePaths(projectId)
    return { success: true, error: null }
  }

  // No dimension change — need project_id for revalidation
  const { data: current, error: fetchError } = await supabase
    .from('measurement_sheet_entries')
    .select('project_id')
    .eq('id', id)
    .single()

  if (fetchError) return { success: false, error: fetchError.message }

  const { error } = await supabase
    .from('measurement_sheet_entries')
    .update(updatePayload)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  const projectId = (current as Record<string, unknown>).project_id as string
  revalidatePaths(projectId)
  return { success: true, error: null }
}

export async function deleteMeasurementEntry(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  // Get project_id before deleting
  const { data: entry, error: fetchError } = await supabase
    .from('measurement_sheet_entries')
    .select('project_id')
    .eq('id', id)
    .single()

  if (fetchError) return { success: false, error: fetchError.message }

  const { error } = await supabase
    .from('measurement_sheet_entries')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  const projectId = (entry as Record<string, unknown>).project_id as string
  revalidatePaths(projectId)
  return { success: true, error: null }
}

export async function applyMeasurementsToBoq(
  projectId: string,
  boqItemId: string
): Promise<{ success: boolean; totalQuantity: number | null; error: string | null }> {
  const supabase = await createClient()

  const { data: entries, error: fetchError } = await supabase
    .from('measurement_sheet_entries')
    .select('quantity')
    .eq('project_id', projectId)
    .eq('boq_item_id', boqItemId)

  if (fetchError) return { success: false, totalQuantity: null, error: fetchError.message }

  const totalQuantity = (entries as Array<{ quantity: number }>).reduce(
    (sum, e) => sum + (e.quantity ?? 0),
    0
  )

  const { error: updateError } = await supabase
    .from('boq_items')
    .update({ quantity: totalQuantity })
    .eq('id', boqItemId)

  if (updateError) return { success: false, totalQuantity: null, error: updateError.message }

  revalidatePaths(projectId)
  return { success: true, totalQuantity, error: null }
}

export async function applyAllMeasurementsToBoq(
  projectId: string
): Promise<{ success: boolean; updatedCount: number | null; error: string | null }> {
  const supabase = await createClient()

  // Get all distinct boq_item_ids that have measurement entries
  const { data: entries, error: fetchError } = await supabase
    .from('measurement_sheet_entries')
    .select('boq_item_id, quantity')
    .eq('project_id', projectId)
    .not('boq_item_id', 'is', null)

  if (fetchError) return { success: false, updatedCount: null, error: fetchError.message }

  // Group and sum by boq_item_id
  const totals = new Map<string, number>()
  for (const entry of entries as Array<{ boq_item_id: string; quantity: number }>) {
    const current = totals.get(entry.boq_item_id) ?? 0
    totals.set(entry.boq_item_id, current + (entry.quantity ?? 0))
  }

  let updatedCount = 0
  for (const [boqItemId, total] of totals) {
    const { error } = await supabase
      .from('boq_items')
      .update({ quantity: total })
      .eq('id', boqItemId)

    if (error) return { success: false, updatedCount, error: error.message }
    updatedCount++
  }

  revalidatePaths(projectId)
  return { success: true, updatedCount, error: null }
}
