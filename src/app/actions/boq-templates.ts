'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Safe column list that works even without Sprint 011 migration
const SPRINT11_KEYS = new Set(['is_section_header', 'sort_order', 'vat_percent', 'vat_amount'])

function safePayload(data: Record<string, unknown>, includeSprint11 = true): Record<string, unknown> {
  if (includeSprint11) return data
  return Object.fromEntries(Object.entries(data).filter(([k]) => !SPRINT11_KEYS.has(k)))
}

export async function getTemplates(search?: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('company_id').single()
  const companyId = profile?.company_id

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'Not authenticated' }

  let query = supabase
    .from('boq_templates')
    .select('*')
    .order('is_company_standard', { ascending: false })
    .order('name', { ascending: true })

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`)
  }

  // Own templates + company templates
  if (companyId) {
    query = query.or(`created_by.eq.${user.id},company_id.eq.${companyId}`)
  } else {
    query = query.eq('created_by', user.id)
  }

  const { data, error } = await query
  if (error) return { data: [], error: error.message }
  return { data: data ?? [] }
}

export async function getTemplateWithItems(templateId: string) {
  const supabase = await createClient()

  const { data: template, error: tErr } = await supabase
    .from('boq_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (tErr) return { template: null, items: [], error: tErr.message }

  const { data: items, error: iErr } = await supabase
    .from('boq_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true })

  if (iErr) return { template, items: [], error: iErr.message }
  return { template, items: items ?? [] }
}

export async function saveAsTemplate(input: {
  name: string
  description?: string
  category?: string
  is_company_standard?: boolean
  projectId: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('company_id').single()
  const companyId = profile?.company_id

  // Create template
  const { data: template, error: tErr } = await supabase
    .from('boq_templates')
    .insert({
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      is_company_standard: input.is_company_standard ?? false,
      company_id: companyId ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (tErr) return { success: false as const, error: tErr.message }

  // Fetch project BOQ items
  const { data: boqItems, error: bErr } = await supabase
    .from('boq_items')
    .select('item_code, description, unit, unit_rate, category, sort_order, is_section_header, notes')
    .eq('project_id', input.projectId)
    .order('sort_order', { ascending: true })

  if (bErr) return { success: false as const, error: bErr.message }

  if (boqItems && boqItems.length > 0) {
    const templateItems = boqItems.map((item) => ({
      template_id: template.id,
      item_code: item.item_code,
      description: item.description,
      unit: item.unit,
      unit_rate: item.unit_rate,
      category: item.category,
      sort_order: item.sort_order,
      is_section_header: item.is_section_header,
      notes: item.notes,
    }))

    const { error: iErr } = await supabase.from('boq_template_items').insert(templateItems)
    if (iErr) return { success: false as const, error: iErr.message }
  }

  return { success: true as const, templateId: template.id }
}

export async function loadTemplate(templateId: string, projectId: string) {
  const supabase = await createClient()

  const { data: items, error: fErr } = await supabase
    .from('boq_template_items')
    .select('item_code, description, unit, unit_rate, category, sort_order, is_section_header, notes')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true })

  if (fErr) return { success: false as const, error: fErr.message }
  if (!items || items.length === 0) return { success: true as const, count: 0 }

  const boqItems = items.map((item) => ({
    project_id: projectId,
    item_code: item.item_code,
    description: item.description,
    unit: item.unit ?? 'm',
    quantity: 0,
    unit_rate: item.unit_rate ?? 0,
    total_amount: 0,
    category: item.category,
    sort_order: item.sort_order,
    is_section_header: item.is_section_header,
    notes: item.notes,
  } as Record<string, unknown>))

  const { error } = await supabase.from('boq_items').insert(boqItems)
  if (error) {
    // Retry without Sprint 011 columns if they don't exist yet
    if (error.code === 'PGRST204' || error.message.includes('does not exist') || error.message.includes('column')) {
      const safe = boqItems.map((i) => safePayload(i, false))
      const { error: e2 } = await supabase.from('boq_items').insert(safe)
      if (e2) return { success: false as const, error: e2.message }
    } else {
      return { success: false as const, error: error.message }
    }
  }

  revalidatePath(`/projects/${projectId}/boq`)
  return { success: true as const, count: items.length }
}

export async function deleteTemplate(templateId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('boq_templates').delete().eq('id', templateId)
  if (error) return { success: false as const, error: error.message }
  return { success: true as const }
}

export async function updateTemplate(
  templateId: string,
  data: { name?: string; description?: string; category?: string; is_company_standard?: boolean }
) {
  const supabase = await createClient()
  const { error } = await supabase.from('boq_templates').update(data).eq('id', templateId)
  if (error) return { success: false as const, error: error.message }
  return { success: true as const }
}
