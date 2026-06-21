'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ComponentType = 'material' | 'labor' | 'equipment' | 'subcontractor' | 'overhead' | 'profit'

type ComponentData = {
  boq_item_id?: string
  component_type?: ComponentType
  description?: string
  unit?: string
  quantity?: number | null
  rate?: number | null
  amount?: number | null
  sort_order?: number
  notes?: string | null
}

export async function getRateAnalysis(projectId: string, boqItemId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('rate_analysis_items')
    .select('*, boq_items(item_code, description, unit, unit_rate)')
    .eq('project_id', projectId)
    .order('boq_item_id')
    .order('sort_order', { ascending: true })

  if (boqItemId) {
    query = query.eq('boq_item_id', boqItemId)
  }

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data: data ?? [] }
}

export async function createRateComponent(projectId: string, data: ComponentData) {
  const supabase = await createClient()
  const amount = (data.quantity ?? 1) * (data.rate ?? 0)

  const { data: item, error } = await supabase
    .from('rate_analysis_items')
    .insert({
      project_id: projectId,
      boq_item_id: data.boq_item_id,
      component_type: data.component_type ?? 'material',
      description: data.description ?? '',
      unit: data.unit ?? 'ls',
      quantity: data.quantity ?? 1,
      rate: data.rate ?? 0,
      amount,
      sort_order: data.sort_order ?? 0,
      notes: data.notes ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message, data: null }
  revalidatePath(`/projects/${projectId}/rate-analysis`)
  return { data: item }
}

export async function updateRateComponent(id: string, data: Partial<ComponentData>) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { ...data }
  if (data.quantity !== undefined || data.rate !== undefined) {
    const { data: current } = await supabase
      .from('rate_analysis_items')
      .select('quantity, rate')
      .eq('id', id)
      .single()

    if (current) {
      const qty = data.quantity ?? current.quantity ?? 1
      const rate = data.rate ?? current.rate ?? 0
      updateData.amount = (qty as number) * (rate as number)
    }
  }

  const { error } = await supabase
    .from('rate_analysis_items')
    .update(updateData)
    .eq('id', id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteRateComponent(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('rate_analysis_items').delete().eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}

export async function applyRateToBoqItem(projectId: string, boqItemId: string) {
  const supabase = await createClient()

  const { data: components, error: fetchErr } = await supabase
    .from('rate_analysis_items')
    .select('amount')
    .eq('project_id', projectId)
    .eq('boq_item_id', boqItemId)

  if (fetchErr) return { error: fetchErr.message }

  const totalRate = (components ?? []).reduce(
    (sum: number, c: { amount: number | null }) => sum + (c.amount ?? 0),
    0
  )

  const { error } = await supabase
    .from('boq_items')
    .update({ unit_rate: totalRate })
    .eq('id', boqItemId)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/boq`)
  return { success: true, totalRate }
}

export async function applyAllRatesToBoq(projectId: string) {
  const supabase = await createClient()

  const { data: components, error: fetchErr } = await supabase
    .from('rate_analysis_items')
    .select('boq_item_id, amount')
    .eq('project_id', projectId)

  if (fetchErr) return { error: fetchErr.message }

  const totals = new Map<string, number>()
  for (const c of components ?? []) {
    if (!c.boq_item_id) continue
    totals.set(c.boq_item_id, (totals.get(c.boq_item_id) ?? 0) + (c.amount ?? 0))
  }

  let updated = 0
  for (const [boqItemId, totalRate] of totals) {
    const { error } = await supabase
      .from('boq_items')
      .update({ unit_rate: totalRate })
      .eq('id', boqItemId)
    if (!error) updated++
  }

  revalidatePath(`/projects/${projectId}/boq`)
  return { success: true, updatedCount: updated }
}
