'use server'

import { createClient } from '@/lib/supabase/server'
import type { ApprovalStatus, QuantityApproval } from '@/lib/types'
import { isValidUUID } from '@/lib/validate'

export async function getApprovals(boqItemId: string): Promise<QuantityApproval[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('qb_quantity_approvals')
    .select('*')
    .eq('boq_item_id', boqItemId)
    .order('approved_at', { ascending: false })

  return (data ?? []) as QuantityApproval[]
}

export async function getLatestApproval(boqItemId: string): Promise<QuantityApproval | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('qb_quantity_approvals')
    .select('*')
    .eq('boq_item_id', boqItemId)
    .order('approved_at', { ascending: false })
    .limit(1)
    .single()

  return (data ?? null) as QuantityApproval | null
}

export async function createApproval(fields: {
  project_id: string
  boq_item_id: string
  mi_id?: string
  calculated_quantity: number
  approved_quantity: number
  unit: string
  status?: ApprovalStatus
  approver_name?: string
  notes?: string
}): Promise<{ data?: QuantityApproval; error?: string }> {
  if (!isValidUUID(fields.project_id)) return { error: 'Invalid project ID' }
  if (!isValidUUID(fields.boq_item_id)) return { error: 'Invalid BOQ item ID' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('qb_quantity_approvals')
    .insert({
      project_id: fields.project_id,
      boq_item_id: fields.boq_item_id,
      mi_id: fields.mi_id ?? null,
      calculated_quantity: fields.calculated_quantity,
      approved_quantity: fields.approved_quantity,
      unit: fields.unit,
      status: fields.status ?? 'approved',
      approver_name: fields.approver_name ?? null,
      approver_id: user.id,
      notes: fields.notes ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as QuantityApproval }
}

export async function deleteApproval(id: string): Promise<{ error?: string }> {
  if (!isValidUUID(id)) return { error: 'Invalid ID' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('qb_quantity_approvals')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  return {}
}
