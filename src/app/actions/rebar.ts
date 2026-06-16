'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcCutLength, calcBarWeight, type ShapeCode, type BendingDims, UNIT_WEIGHT, type RebarDiameter } from '@/lib/rebar-calc'

// ─── Types ───────────────────────────────────────────────────────────────────
export interface RebarElementInput {
  project_id: string
  drawing_id?: string | null
  element_type: string
  element_mark: string
  floor_level?: string | null
  dimensions?: Record<string, number | string>
  notes?: string | null
  sort_order?: number
}

export interface RebarBarInput {
  element_id: string
  bar_mark: string
  diameter_mm: number
  shape_code: string
  bending_dims: Record<string, number>
  quantity: number
  notes?: string | null
  sort_order?: number
}

// ─── Elements ────────────────────────────────────────────────────────────────
export async function getRebarElements(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rebar_elements')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')
    .order('element_mark')
  if (error) return { elements: [], error: error.message }
  return { elements: data ?? [] }
}

export async function createRebarElement(input: RebarElementInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('rebar_elements')
    .insert({ ...input, created_by: user.id, dimensions: input.dimensions ?? {} })
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath(`/projects/${input.project_id}/rebar`)
  return { success: true, element: data }
}

export async function updateRebarElement(id: string, projectId: string, updates: Partial<RebarElementInput>) {
  const supabase = await createClient()
  const { error } = await supabase.from('rebar_elements').update(updates).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/rebar`)
  return { success: true }
}

export async function deleteRebarElement(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('rebar_elements').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/rebar`)
  return { success: true }
}

// ─── Bars ────────────────────────────────────────────────────────────────────
export async function getRebarBars(elementId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rebar_bars')
    .select('*')
    .eq('element_id', elementId)
    .order('sort_order')
    .order('bar_mark')
  if (error) return { bars: [], error: error.message }
  return { bars: data ?? [] }
}

export async function getRebarSchedule(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rebar_elements')
    .select('*, bars:rebar_bars(*)')
    .eq('project_id', projectId)
    .order('sort_order')
  if (error) return { schedule: [], error: error.message }
  return { schedule: data ?? [] }
}

function computeBarWeights(input: RebarBarInput) {
  const cutLength = calcCutLength(
    input.shape_code as ShapeCode,
    input.bending_dims as BendingDims,
    input.diameter_mm
  )
  const d = input.diameter_mm as RebarDiameter
  const unitWeight = UNIT_WEIGHT[d] ?? calcBarWeight(1000, d) / 1
  const totalWeight = calcBarWeight(cutLength, d) * input.quantity
  return { cut_length_mm: cutLength, unit_weight_kg_m: unitWeight, total_weight_kg: totalWeight }
}

export async function createRebarBar(input: RebarBarInput) {
  const supabase = await createClient()
  const computed = computeBarWeights(input)
  const { data, error } = await supabase
    .from('rebar_bars')
    .insert({ ...input, ...computed })
    .select()
    .single()
  if (error) return { error: error.message }
  return { success: true, bar: data }
}

export async function updateRebarBar(id: string, updates: Partial<RebarBarInput>) {
  const supabase = await createClient()

  let extra: Record<string, number> = {}
  if (updates.shape_code !== undefined || updates.bending_dims !== undefined || updates.diameter_mm !== undefined) {
    // Need current record to recompute
    const { data: current } = await supabase.from('rebar_bars').select('*').eq('id', id).single()
    if (current) {
      const merged = { ...current, ...updates }
      extra = computeBarWeights({
        element_id: merged.element_id,
        bar_mark: merged.bar_mark,
        diameter_mm: merged.diameter_mm,
        shape_code: merged.shape_code,
        bending_dims: merged.bending_dims,
        quantity: merged.quantity,
      })
    }
  }

  const { error } = await supabase.from('rebar_bars').update({ ...updates, ...extra }).eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteRebarBar(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('rebar_bars').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

// ─── DXF layer hints ─────────────────────────────────────────────────────────
export async function getDXFElementHints(drawingId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('drawing_layers')
    .select('name')
    .eq('drawing_id', drawingId)
  if (error) return { hints: [] }

  const { detectElementsFromLayers } = await import('@/lib/rebar-calc')
  const hints = detectElementsFromLayers((data ?? []).map((l: { name: string }) => l.name))
  return { hints }
}

// ─── Export helpers ───────────────────────────────────────────────────────────
export async function getRebarProcurementSummary(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rebar_elements')
    .select('id, element_mark, element_type, floor_level, bars:rebar_bars(diameter_mm, quantity, cut_length_mm, total_weight_kg)')
    .eq('project_id', projectId)
  if (error) return { summary: [], error: error.message }

  // Flatten bars
  const allBars: Array<{ diameter_mm: number; quantity: number; cut_length_mm: number | null; total_weight_kg: number | null }> = []
  for (const el of (data ?? [])) {
    for (const bar of (el.bars ?? [])) {
      allBars.push(bar as { diameter_mm: number; quantity: number; cut_length_mm: number | null; total_weight_kg: number | null })
    }
  }

  const { summarizeByDiameter } = await import('@/lib/rebar-calc')
  return { summary: summarizeByDiameter(allBars) }
}
