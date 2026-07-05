'use server'

import { createClient } from '@/lib/supabase/server'
import type { MeasurementItem, MeasurementLine, MeasurementType } from '@/lib/types'
import { calculateLineQuantity } from '@/lib/calc'
import { isValidUUID } from '@/lib/validate'

// ── Items ───────────────────────────────────────────────────────────────

export async function getMeasurementItems(projectId: string): Promise<MeasurementItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('qb_measurement_items')
    .select('*, lines:qb_measurement_lines(*)')
    .eq('project_id', projectId)
    .order('sort_order')
    .order('created_at')

  return (data ?? []).map((item: Record<string, unknown>) => ({
    ...item,
    lines: ((item.lines as MeasurementLine[]) ?? []).sort(
      (a: MeasurementLine, b: MeasurementLine) => a.sort_order - b.sort_order || a.line_number - b.line_number
    ),
  })) as MeasurementItem[]
}

export async function getMeasurementItem(id: string): Promise<MeasurementItem | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('qb_measurement_items')
    .select('*, lines:qb_measurement_lines(*)')
    .eq('id', id)
    .single()

  if (!data) return null
  return {
    ...data,
    lines: ((data.lines as MeasurementLine[]) ?? []).sort(
      (a: MeasurementLine, b: MeasurementLine) => a.sort_order - b.sort_order || a.line_number - b.line_number
    ),
  } as MeasurementItem
}

export async function createMeasurementItem(fields: {
  project_id: string
  item_code?: string
  description: string
  unit?: string
  measurement_type?: MeasurementType
  section?: string
  drawing_ref?: string
  location?: string
}): Promise<{ data?: MeasurementItem; error?: string }> {
  if (!isValidUUID(fields.project_id)) return { error: 'Invalid project ID' }
  if (!fields.description?.trim()) return { error: 'Description is required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', fields.project_id)
    .single()

  if (!project) {
    return { error: `Project not found. Verify the project exists and you have access.` }
  }

  const { data: maxOrder } = await supabase
    .from('qb_measurement_items')
    .select('sort_order')
    .eq('project_id', fields.project_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const { data, error } = await supabase
    .from('qb_measurement_items')
    .insert({
      ...fields,
      created_by: user.id,
      sort_order: ((maxOrder as { sort_order: number } | null)?.sort_order ?? -1) + 1,
    })
    .select()
    .single()

  if (error) {
    if (error.message.includes('foreign key constraint')) {
      return { error: 'Database schema mismatch: run migration 215_fix_all_project_fks.sql in Supabase SQL Editor.' }
    }
    return { error: error.message }
  }
  return { data: data as MeasurementItem }
}

export async function updateMeasurementItem(
  id: string,
  fields: Partial<Pick<MeasurementItem, 'item_code' | 'description' | 'unit' | 'measurement_type' | 'section' | 'drawing_ref' | 'location' | 'sort_order'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('qb_measurement_items')
    .update(fields)
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function deleteMeasurementItem(id: string): Promise<{ error?: string }> {
  if (!isValidUUID(id)) return { error: 'Invalid ID' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('qb_measurement_items')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

// ── Lines ───────────────────────────────────────────────────────────────

export async function createMeasurementLine(fields: {
  item_id: string
  description?: string
  location?: string
  nr?: number
  length?: number
  width?: number
  height?: number
  formula?: string
  is_deduction?: boolean
  notes?: string
  drawing_id?: string
  page_number?: number
  drawing_measurement_id?: string
  geo_json?: unknown
  scale_id?: string
  ocr_source?: string
  ocr_confidence?: number
  ocr_text?: string
  floor_level?: string
  engineer_name?: string
  measured_date?: string
  revision_id?: string
}): Promise<{ data?: MeasurementLine; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get parent item's measurement_type
  const { data: parentItem } = await supabase
    .from('qb_measurement_items')
    .select('measurement_type')
    .eq('id', fields.item_id)
    .single()

  const measurementType = (parentItem as { measurement_type: MeasurementType } | null)?.measurement_type ?? 'length'

  const { data: maxLine } = await supabase
    .from('qb_measurement_lines')
    .select('line_number, sort_order')
    .eq('item_id', fields.item_id)
    .order('line_number', { ascending: false })
    .limit(1)
    .single()

  const lineNumber = ((maxLine as { line_number: number } | null)?.line_number ?? 0) + 1
  const sortOrder = ((maxLine as { sort_order: number } | null)?.sort_order ?? -1) + 1

  const quantity = calculateLineQuantity(fields, measurementType)

  const { data, error } = await supabase
    .from('qb_measurement_lines')
    .insert({
      ...fields,
      line_number: lineNumber,
      sort_order: sortOrder,
      quantity,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as MeasurementLine }
}

export async function updateMeasurementLine(
  id: string,
  fields: Partial<Omit<MeasurementLine, 'id' | 'item_id' | 'created_at' | 'updated_at'>>
): Promise<{ data?: MeasurementLine; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const updateFields = { ...fields } as Record<string, unknown>

  if ('nr' in fields || 'length' in fields || 'width' in fields || 'height' in fields || 'formula' in fields || 'is_deduction' in fields) {
    const { data: existing } = await supabase
      .from('qb_measurement_lines')
      .select('nr, length, width, height, formula, is_deduction, item_id')
      .eq('id', id)
      .single()

    if (existing) {
      // Get parent item's measurement_type
      const { data: parentItem } = await supabase
        .from('qb_measurement_items')
        .select('measurement_type')
        .eq('id', (existing as Record<string, unknown>).item_id)
        .single()

      const measurementType = (parentItem as { measurement_type: MeasurementType } | null)?.measurement_type ?? 'length'
      const merged = { ...existing, ...fields }
      updateFields.quantity = calculateLineQuantity(merged, measurementType)
    }
  }

  const { data, error } = await supabase
    .from('qb_measurement_lines')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as MeasurementLine }
}

export async function deleteMeasurementLine(id: string): Promise<{ error?: string }> {
  if (!isValidUUID(id)) return { error: 'Invalid ID' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { error } = await supabase
    .from('qb_measurement_lines')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function linkDrawingMeasurementsToItem(
  itemId: string,
  drawingMeasurementIds: string[]
): Promise<{ count: number; error?: string }> {
  const supabase = await createClient()

  const { data: dmList, error: fetchErr } = await supabase
    .from('qb_drawing_measurements')
    .select('id, drawing_id, page_number, tool_type, coordinates, quantity, unit, scale_id, label')
    .in('id', drawingMeasurementIds)

  if (fetchErr) return { count: 0, error: fetchErr.message }
  if (!dmList || dmList.length === 0) return { count: 0, error: 'No drawing measurements found' }

  const { data: parentItem } = await supabase
    .from('qb_measurement_items')
    .select('measurement_type')
    .eq('id', itemId)
    .single()

  const measurementType = (parentItem as { measurement_type: MeasurementType } | null)?.measurement_type ?? 'length'

  const { data: maxLine } = await supabase
    .from('qb_measurement_lines')
    .select('line_number, sort_order')
    .eq('item_id', itemId)
    .order('line_number', { ascending: false })
    .limit(1)
    .single()

  let lineNumber = ((maxLine as { line_number: number } | null)?.line_number ?? 0) + 1
  let sortOrder = ((maxLine as { sort_order: number } | null)?.sort_order ?? -1) + 1

  const rows = (dmList as Record<string, unknown>[]).map((dm) => {
    const qty = (dm.quantity as number) ?? 0
    const finalQty = measurementType === 'formula' ? qty : calculateLineQuantity(
      { nr: 1, formula: String(qty) },
      'formula'
    )

    return {
      item_id: itemId,
      line_number: lineNumber++,
      sort_order: sortOrder++,
      description: (dm.label as string) || `Takeoff: ${dm.tool_type}`,
      drawing_measurement_id: dm.id as string,
      drawing_id: dm.drawing_id as string,
      page_number: dm.page_number as number,
      scale_id: (dm.scale_id as string) || null,
      geo_json: dm.coordinates,
      quantity: qty,
      nr: 1,
      is_deduction: false,
      formula: String(qty),
    }
  })

  const { error } = await supabase
    .from('qb_measurement_lines')
    .insert(rows)

  if (error) return { count: 0, error: error.message }
  return { count: rows.length }
}

export async function linkDrawingMeasurementsToBOQ(
  boqItemId: string,
  drawingMeasurementIds: string[],
  projectId: string,
): Promise<{ count: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { count: 0, error: 'Not authenticated' }

  const { data: boqItem } = await supabase
    .from('qb_boq_items')
    .select('id, mi_id, description, unit')
    .eq('id', boqItemId)
    .single()

  if (!boqItem) return { count: 0, error: 'BOQ item not found' }

  let measurementItemId = (boqItem as Record<string, unknown>).mi_id as string | null

  if (!measurementItemId) {
    const toolTypeToMeasurementType: Record<string, MeasurementType> = {
      line: 'length', polyline: 'length',
      area: 'area', rectangle: 'area', circle: 'area',
      count: 'count',
    }

    const { data: firstDm } = await supabase
      .from('qb_drawing_measurements')
      .select('tool_type')
      .in('id', drawingMeasurementIds)
      .limit(1)
      .single()

    const mType = toolTypeToMeasurementType[(firstDm as Record<string, unknown>)?.tool_type as string] ?? 'length'

    const { data: maxOrder } = await supabase
      .from('qb_measurement_items')
      .select('sort_order')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = ((maxOrder as { sort_order: number } | null)?.sort_order ?? -1) + 1

    const { data: newMI, error: miErr } = await supabase
      .from('qb_measurement_items')
      .insert({
        project_id: projectId,
        description: (boqItem as Record<string, unknown>).description as string,
        unit: (boqItem as Record<string, unknown>).unit as string,
        measurement_type: mType,
        sort_order: nextOrder,
        created_by: user.id,
      })
      .select()
      .single()

    if (miErr || !newMI) return { count: 0, error: miErr?.message ?? 'Failed to create measurement item' }
    measurementItemId = (newMI as { id: string }).id

    await supabase
      .from('qb_boq_items')
      .update({ mi_id: measurementItemId })
      .eq('id', boqItemId)
  }

  return linkDrawingMeasurementsToItem(measurementItemId, drawingMeasurementIds)
}

export async function duplicateMeasurementLine(id: string): Promise<{ data?: MeasurementLine; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: original } = await supabase
    .from('qb_measurement_lines')
    .select('*')
    .eq('id', id)
    .single()

  if (!original) return { error: 'Line not found' }

  const { data: maxLine } = await supabase
    .from('qb_measurement_lines')
    .select('line_number, sort_order')
    .eq('item_id', original.item_id)
    .order('line_number', { ascending: false })
    .limit(1)
    .single()

  const { id: _id, created_at: _c, updated_at: _u, ...rest } = original

  const { data, error } = await supabase
    .from('qb_measurement_lines')
    .insert({
      ...rest,
      line_number: ((maxLine as { line_number: number } | null)?.line_number ?? 0) + 1,
      sort_order: ((maxLine as { sort_order: number } | null)?.sort_order ?? -1) + 1,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as MeasurementLine }
}


// ── Create full chain from drawing measurement ──────────────────────────
// One-call action: drawing measurement → measurement item → measurement line → BOQ item

export async function createQuantityFromDrawing(params: {
  projectId: string
  drawingMeasurementId: string
  description: string
  unit: string
  section?: string
}): Promise<{ miId: string; boqItemId: string; error?: string }> {
  if (!isValidUUID(params.projectId)) return { miId: '', boqItemId: '', error: 'Invalid project ID' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { miId: '', boqItemId: '', error: 'Not authenticated' }

  const { data: dm } = await supabase
    .from('qb_drawing_measurements')
    .select('*')
    .eq('id', params.drawingMeasurementId)
    .single()

  if (!dm) return { miId: '', boqItemId: '', error: 'Drawing measurement not found' }

  const toolToType: Record<string, MeasurementType> = {
    line: 'length', polyline: 'length',
    area: 'area', rectangle: 'area', circle: 'area',
    count: 'count',
  }
  const mType: MeasurementType = toolToType[(dm as Record<string, unknown>).tool_type as string] ?? 'length'

  const { data: maxOrder } = await supabase
    .from('qb_measurement_items')
    .select('sort_order')
    .eq('project_id', params.projectId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const { data: mi, error: miErr } = await supabase
    .from('qb_measurement_items')
    .insert({
      project_id: params.projectId,
      description: params.description,
      unit: params.unit,
      measurement_type: mType,
      section: params.section ?? null,
      sort_order: ((maxOrder as { sort_order: number } | null)?.sort_order ?? -1) + 1,
      created_by: user.id,
    })
    .select()
    .single()

  if (miErr || !mi) return { miId: '', boqItemId: '', error: miErr?.message ?? 'Failed to create measurement item' }
  const miId = (mi as { id: string }).id

  const qty = (dm as Record<string, unknown>).quantity as number ?? 0
  await supabase
    .from('qb_measurement_lines')
    .insert({
      item_id: miId,
      line_number: 1,
      sort_order: 0,
      description: `Takeoff: ${(dm as Record<string, unknown>).tool_type}`,
      drawing_measurement_id: params.drawingMeasurementId,
      drawing_id: (dm as Record<string, unknown>).drawing_id as string,
      page_number: (dm as Record<string, unknown>).page_number as number ?? 1,
      scale_id: (dm as Record<string, unknown>).scale_id as string ?? null,
      geo_json: (dm as Record<string, unknown>).coordinates,
      quantity: qty,
      nr: 1,
      is_deduction: false,
      formula: String(qty),
    })

  const { data: maxBoqOrder } = await supabase
    .from('qb_boq_items')
    .select('sort_order')
    .eq('project_id', params.projectId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const { data: boq, error: boqErr } = await supabase
    .from('qb_boq_items')
    .insert({
      project_id: params.projectId,
      mi_id: miId,
      description: params.description,
      unit: params.unit,
      quantity: qty,
      original_quantity: qty,
      unit_rate: 0,
      section: params.section ?? null,
      sort_order: ((maxBoqOrder as { sort_order: number } | null)?.sort_order ?? -1) + 1,
    })
    .select()
    .single()

  if (boqErr || !boq) return { miId, boqItemId: '', error: boqErr?.message ?? 'Failed to create BOQ item' }

  return { miId, boqItemId: (boq as { id: string }).id }
}
