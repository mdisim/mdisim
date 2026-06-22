'use server'

import { createClient } from '@/lib/supabase/server'
import type { MeasurementItem, MeasurementLine } from '@/lib/types'

// ── Items ───────────────────────────────────────────────────────────────

export async function getMeasurementItems(projectId: string): Promise<MeasurementItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('measurement_items')
    .select('*, lines:measurement_lines(*)')
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
  const { data } = await supabase
    .from('measurement_items')
    .select('*, lines:measurement_lines(*)')
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
  section?: string
  drawing_ref?: string
  location?: string
}): Promise<{ data?: MeasurementItem; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: maxOrder } = await supabase
    .from('measurement_items')
    .select('sort_order')
    .eq('project_id', fields.project_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const { data, error } = await supabase
    .from('measurement_items')
    .insert({
      ...fields,
      user_id: user.id,
      sort_order: ((maxOrder as { sort_order: number } | null)?.sort_order ?? -1) + 1,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as MeasurementItem }
}

export async function updateMeasurementItem(
  id: string,
  fields: Partial<Pick<MeasurementItem, 'item_code' | 'description' | 'unit' | 'section' | 'drawing_ref' | 'location' | 'sort_order'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('measurement_items')
    .update(fields)
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function deleteMeasurementItem(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('measurement_items')
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
  count?: number
  length?: number
  width?: number
  height?: number
  formula?: string
  is_deduction?: boolean
  notes?: string
  drawing_id?: string
  page_number?: number
  points?: unknown
  scale_used?: number
}): Promise<{ data?: MeasurementLine; error?: string }> {
  const supabase = await createClient()

  const { data: maxLine } = await supabase
    .from('measurement_lines')
    .select('line_number, sort_order')
    .eq('item_id', fields.item_id)
    .order('line_number', { ascending: false })
    .limit(1)
    .single()

  const lineNumber = ((maxLine as { line_number: number } | null)?.line_number ?? 0) + 1
  const sortOrder = ((maxLine as { sort_order: number } | null)?.sort_order ?? -1) + 1

  const quantity = calculateLineQuantity(fields)

  const { data, error } = await supabase
    .from('measurement_lines')
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

  const updateFields = { ...fields } as Record<string, unknown>

  if ('count' in fields || 'length' in fields || 'width' in fields || 'height' in fields || 'formula' in fields || 'is_deduction' in fields) {
    const { data: existing } = await supabase
      .from('measurement_lines')
      .select('count, length, width, height, formula, is_deduction')
      .eq('id', id)
      .single()

    if (existing) {
      const merged = { ...existing, ...fields }
      updateFields.quantity = calculateLineQuantity(merged)
    }
  }

  const { data, error } = await supabase
    .from('measurement_lines')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as MeasurementLine }
}

export async function deleteMeasurementLine(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('measurement_lines')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function duplicateMeasurementLine(id: string): Promise<{ data?: MeasurementLine; error?: string }> {
  const supabase = await createClient()
  const { data: original } = await supabase
    .from('measurement_lines')
    .select('*')
    .eq('id', id)
    .single()

  if (!original) return { error: 'Line not found' }

  const { data: maxLine } = await supabase
    .from('measurement_lines')
    .select('line_number, sort_order')
    .eq('item_id', original.item_id)
    .order('line_number', { ascending: false })
    .limit(1)
    .single()

  const { id: _id, created_at: _c, updated_at: _u, ...rest } = original

  const { data, error } = await supabase
    .from('measurement_lines')
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

// ── Formula engine ──────────────────────────────────────────────────────

function calculateLineQuantity(fields: {
  count?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  formula?: string | null
  is_deduction?: boolean
}): number {
  let qty: number

  if (fields.formula && fields.formula.trim()) {
    qty = evaluateFormula(fields.formula)
  } else {
    const n = fields.count ?? 1
    const l = fields.length ?? 0
    const w = fields.width || 1
    const h = fields.height || 1
    qty = n * l * w * h
  }

  if (fields.is_deduction && qty > 0) {
    qty = -qty
  }

  return Math.round(qty * 1000000) / 1000000
}

function evaluateFormula(formula: string): number {
  const sanitized = formula.replace(/[^0-9+\-*/().× ,]/g, '').replace(/×/g, '*')
  if (!sanitized.trim()) return 0

  try {
    const fn = new Function(`"use strict"; return (${sanitized})`)
    const result = fn()
    if (typeof result !== 'number' || !isFinite(result)) return 0
    return result
  } catch {
    return 0
  }
}
