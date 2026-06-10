'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getLibraryItems(search?: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('company_id').single()
  const companyId = profile?.company_id

  let query = supabase
    .from('boq_library')
    .select('*')
    .order('category', { ascending: true })
    .order('item_code', { ascending: true })

  if (search) {
    query = query.or(`description.ilike.%${search}%,item_code.ilike.%${search}%,category.ilike.%${search}%`)
  }

  // global OR company items
  if (companyId) {
    query = query.or(`is_global.eq.true,company_id.eq.${companyId}`)
  } else {
    query = query.eq('is_global', true)
  }

  const { data, error } = await query
  if (error) return { error: error.message, data: [] }
  return { data: data ?? [] }
}

export async function addLibraryItem(formData: FormData) {
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('company_id').single()

  const { error } = await supabase.from('boq_library').insert({
    company_id: profile?.company_id ?? null,
    item_code: formData.get('item_code') as string,
    description: formData.get('description') as string,
    unit: formData.get('unit') as string,
    unit_rate: parseFloat(formData.get('unit_rate') as string) || 0,
    category: (formData.get('category') as string) || null,
    trade: (formData.get('trade') as string) || null,
    is_global: false,
  })

  if (error) return { error: error.message }
  revalidatePath('/boq-library')
  return { success: true }
}

export async function deleteLibraryItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('boq_library').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/boq-library')
  return { success: true }
}

export async function importFromLibrary(projectId: string, itemIds: string[]) {
  const supabase = await createClient()

  const { data: libraryItems, error: fetchError } = await supabase
    .from('boq_library')
    .select('*')
    .in('id', itemIds)

  if (fetchError) return { error: fetchError.message }
  if (!libraryItems || libraryItems.length === 0) return { error: 'No items found' }

  const boqItems = libraryItems.map((item) => ({
    project_id: projectId,
    item_code: item.item_code,
    description: item.description,
    unit: item.unit,
    quantity: 0,
    unit_rate: item.unit_rate,
    category: item.category,
    notes: null,
  }))

  const { error } = await supabase.from('boq_items').insert(boqItems)
  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/boq`)
  return { success: true, count: boqItems.length }
}

export async function seedGlobalLibrary() {
  const supabase = await createClient()

  const seeds = [
    { item_code: 'ERTH-001', description: 'Bulk excavation in general soil', unit: 'm³', unit_rate: 18.50, category: 'Earthworks', trade: 'Civil', is_global: true },
    { item_code: 'ERTH-002', description: 'Compaction of fill material, 150mm layers', unit: 'm³', unit_rate: 12.00, category: 'Earthworks', trade: 'Civil', is_global: true },
    { item_code: 'ERTH-003', description: 'Disposal of excavated material off-site', unit: 'm³', unit_rate: 25.00, category: 'Earthworks', trade: 'Civil', is_global: true },
    { item_code: 'CONC-001', description: 'Concrete Grade C25/30 in foundations', unit: 'm³', unit_rate: 185.00, category: 'Concrete', trade: 'Structural', is_global: true },
    { item_code: 'CONC-002', description: 'Concrete Grade C30/37 in columns and beams', unit: 'm³', unit_rate: 210.00, category: 'Concrete', trade: 'Structural', is_global: true },
    { item_code: 'CONC-003', description: 'Concrete Grade C35/45 in suspended slabs', unit: 'm³', unit_rate: 230.00, category: 'Concrete', trade: 'Structural', is_global: true },
    { item_code: 'CONC-004', description: 'Blinding concrete 50mm thick, C15', unit: 'm²', unit_rate: 14.00, category: 'Concrete', trade: 'Structural', is_global: true },
    { item_code: 'REBAR-001', description: 'Mild steel reinforcement bars Y10-Y16', unit: 'tonne', unit_rate: 980.00, category: 'Reinforcement', trade: 'Structural', is_global: true },
    { item_code: 'REBAR-002', description: 'High yield reinforcement bars Y20-Y32', unit: 'tonne', unit_rate: 1050.00, category: 'Reinforcement', trade: 'Structural', is_global: true },
    { item_code: 'REBAR-003', description: 'Mesh reinforcement A142', unit: 'm²', unit_rate: 6.80, category: 'Reinforcement', trade: 'Structural', is_global: true },
    { item_code: 'MASNR-001', description: 'Brick masonry wall 230mm thick in cement mortar 1:4', unit: 'm²', unit_rate: 55.00, category: 'Masonry', trade: 'Masonry', is_global: true },
    { item_code: 'MASNR-002', description: 'Block masonry wall 200mm hollow concrete blocks', unit: 'm²', unit_rate: 42.00, category: 'Masonry', trade: 'Masonry', is_global: true },
    { item_code: 'MASNR-003', description: 'External plastering 15mm two-coat render', unit: 'm²', unit_rate: 22.00, category: 'Masonry', trade: 'Masonry', is_global: true },
    { item_code: 'FINSH-001', description: 'Ceramic floor tiles 300x300mm including adhesive', unit: 'm²', unit_rate: 65.00, category: 'Finishes', trade: 'Finishes', is_global: true },
    { item_code: 'FINSH-002', description: 'Internal emulsion paint two coats on plastered walls', unit: 'm²', unit_rate: 8.50, category: 'Finishes', trade: 'Finishes', is_global: true },
    { item_code: 'FINSH-003', description: 'Gypsum plasterboard 12.5mm on metal stud partition', unit: 'm²', unit_rate: 48.00, category: 'Finishes', trade: 'Finishes', is_global: true },
    { item_code: 'STEEL-001', description: 'Structural steel I-beam fabricated and erected', unit: 'tonne', unit_rate: 2200.00, category: 'Structural Steel', trade: 'Structural', is_global: true },
    { item_code: 'STEEL-002', description: 'Steel hollow section columns, painted', unit: 'tonne', unit_rate: 2350.00, category: 'Structural Steel', trade: 'Structural', is_global: true },
    { item_code: 'ROOFG-001', description: 'Corrugated metal roof sheeting, 0.5mm IBR', unit: 'm²', unit_rate: 38.00, category: 'Roofing', trade: 'Roofing', is_global: true },
    { item_code: 'DRNG-001', description: 'UPVC drainage pipe 110mm diameter', unit: 'm', unit_rate: 28.00, category: 'Drainage', trade: 'Civil', is_global: true },
  ]

  const { error } = await supabase.from('boq_library').insert(seeds)
  if (error) return { error: error.message }
  return { success: true, count: seeds.length }
}
