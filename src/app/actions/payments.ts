'use server'

import { createClient } from '@/lib/supabase/server'
import type { PaymentCert, PaymentLine } from '@/lib/types'

export async function getPaymentCerts(projectId: string): Promise<PaymentCert[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('qb_payment_certs')
    .select('*, lines:qb_payment_lines(*)')
    .eq('project_id', projectId)
    .order('cert_number')
  return (data ?? []) as PaymentCert[]
}

export async function getPaymentCert(id: string): Promise<PaymentCert | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data } = await supabase
    .from('qb_payment_certs')
    .select('*, lines:qb_payment_lines(*)')
    .eq('id', id)
    .single()
  return (data as PaymentCert) ?? null
}

export async function createPaymentCert(fields: {
  project_id: string
  cert_number: number
  period_from: string
  period_to: string
  retention_pct?: number
  vat_pct?: number
  advance_recovery?: number
  previous_advance_recovery?: number
}): Promise<{ data?: PaymentCert; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('qb_payment_certs')
    .insert(fields)
    .select()
    .single()
  if (error) return { error: error.message }
  return { data: data as PaymentCert }
}

export async function updatePaymentCert(
  id: string,
  fields: Partial<Pick<PaymentCert, 'status' | 'retention_pct' | 'vat_pct' | 'advance_recovery' | 'previous_advance_recovery' | 'variations_amount' | 'submitted_date' | 'approved_date' | 'paid_date' | 'notes'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('qb_payment_certs').update(fields).eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function deletePaymentCert(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('qb_payment_certs').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function createPaymentLine(fields: {
  cert_id: string
  boq_item_id?: string
  description: string
  unit: string
  contract_qty: number
  contract_rate: number
  previous_qty?: number
  current_qty: number
  sort_order?: number
}): Promise<{ data?: PaymentLine; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('qb_payment_lines')
    .insert(fields)
    .select()
    .single()
  if (error) return { error: error.message }
  return { data: data as PaymentLine }
}

export async function updatePaymentLine(
  id: string,
  fields: Partial<Pick<PaymentLine, 'description' | 'unit' | 'contract_qty' | 'contract_rate' | 'previous_qty' | 'current_qty'>>
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('qb_payment_lines').update(fields).eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function deletePaymentLine(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('qb_payment_lines').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

export async function populateCertFromBOQ(
  certId: string,
  projectId: string,
  previousCertId?: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: boqItems } = await supabase
    .from('qb_boq_items')
    .select('id, code, description, unit, quantity, unit_rate')
    .eq('project_id', projectId)
    .order('sort_order')

  if (!boqItems || boqItems.length === 0) return { error: 'No BOQ items found' }

  let prevLines: Record<string, number> = {}
  if (previousCertId) {
    const { data: prevData } = await supabase
      .from('qb_payment_lines')
      .select('boq_item_id, cumulative_qty')
      .eq('cert_id', previousCertId)
    if (prevData) {
      prevLines = Object.fromEntries(
        prevData.filter(l => l.boq_item_id).map(l => [l.boq_item_id, l.cumulative_qty])
      )
    }
  }

  const lines = boqItems.map((item, i) => ({
    cert_id: certId,
    boq_item_id: item.id,
    description: item.description,
    unit: item.unit,
    contract_qty: item.quantity ?? 0,
    contract_rate: item.unit_rate ?? 0,
    previous_qty: prevLines[item.id] ?? 0,
    current_qty: 0,
    sort_order: i,
  }))

  const { error } = await supabase.from('qb_payment_lines').insert(lines)
  if (error) return { error: error.message }
  return {}
}
