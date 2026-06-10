'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getConcretePours(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('concrete_pours')
    .select('*')
    .eq('project_id', projectId)
    .order('pour_date', { ascending: false })
  if (error) return { error: error.message, data: [] }
  return { data: data ?? [] }
}

export async function createConcretePour(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('concrete_pours').insert({
    project_id: projectId,
    pour_date: formData.get('pour_date') as string,
    element_type: formData.get('element_type') as string,
    location: (formData.get('location') as string) || null,
    mix_design: (formData.get('mix_design') as string) || null,
    volume_m3: parseFloat(formData.get('volume_m3') as string) || 0,
    strength_mpa: formData.get('strength_mpa') ? parseInt(formData.get('strength_mpa') as string) : null,
    supplier: (formData.get('supplier') as string) || null,
    batch_numbers: (formData.get('batch_numbers') as string) || null,
    slump_mm: formData.get('slump_mm') ? parseInt(formData.get('slump_mm') as string) : null,
    temp_celsius: formData.get('temp_celsius') ? parseFloat(formData.get('temp_celsius') as string) : null,
    test_cubes: parseInt(formData.get('test_cubes') as string) || 0,
    notes: (formData.get('notes') as string) || null,
    created_by: user?.id ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/concrete`)
  return { success: true }
}

export async function deleteConcretePour(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('concrete_pours').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/concrete`)
  return { success: true }
}

export async function getReinforcementRecords(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reinforcement_records')
    .select('*')
    .eq('project_id', projectId)
    .order('record_date', { ascending: false })
  if (error) return { error: error.message, data: [] }
  return { data: data ?? [] }
}

export async function createReinforcementRecord(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const qtyKg = formData.get('quantity_kg') ? parseFloat(formData.get('quantity_kg') as string) : null
  const { error } = await supabase.from('reinforcement_records').insert({
    project_id: projectId,
    record_date: formData.get('record_date') as string,
    element_type: formData.get('element_type') as string,
    location: (formData.get('location') as string) || null,
    bar_diameter_mm: formData.get('bar_diameter_mm') ? parseInt(formData.get('bar_diameter_mm') as string) : null,
    steel_grade: (formData.get('steel_grade') as string) || null,
    quantity_kg: qtyKg,
    quantity_tonnes: qtyKg !== null ? qtyKg / 1000 : null,
    supplier: (formData.get('supplier') as string) || null,
    heat_number: (formData.get('heat_number') as string) || null,
    notes: (formData.get('notes') as string) || null,
    created_by: user?.id ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/concrete`)
  return { success: true }
}

export async function deleteReinforcementRecord(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('reinforcement_records').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/concrete`)
  return { success: true }
}
