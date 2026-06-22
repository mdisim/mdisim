'use server'

import { createClient } from '@/lib/supabase/server'
import type { LibraryCategory, LibraryItem } from '@/lib/types'

// ── Categories ──────────────────────────────────────────────────────────

export async function getLibraryCategories(): Promise<LibraryCategory[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('qb_library_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order')

  return (data ?? []) as LibraryCategory[]
}

export async function createLibraryCategory(fields: {
  name: string
  description?: string
  sort_order?: number
}): Promise<{ data?: LibraryCategory; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('qb_library_categories')
    .insert({ ...fields, user_id: user.id })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as LibraryCategory }
}

export async function updateLibraryCategory(
  id: string,
  fields: Partial<Omit<LibraryCategory, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('qb_library_categories')
    .update(fields)
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function deleteLibraryCategory(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('qb_library_categories')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

// ── Items ───────────────────────────────────────────────────────────────

export async function getLibraryItems(categoryId?: string): Promise<LibraryItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('qb_library_items')
    .select('*')
    .eq('user_id', user.id)

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const { data } = await query.order('sort_order')

  return (data ?? []) as LibraryItem[]
}

export async function createLibraryItem(fields: {
  category_id?: string
  code?: string
  description: string
  unit: string
  default_rate?: number
  material_rate?: number
  labor_rate?: number
  equipment_rate?: number
  notes?: string
  sort_order?: number
}): Promise<{ data?: LibraryItem; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('qb_library_items')
    .insert({ ...fields, user_id: user.id })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as LibraryItem }
}

export async function updateLibraryItem(
  id: string,
  fields: Partial<Omit<LibraryItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('qb_library_items')
    .update(fields)
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}

export async function deleteLibraryItem(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('qb_library_items')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}
