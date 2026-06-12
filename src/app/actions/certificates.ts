'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCertificate(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const retentionPercent = parseFloat(formData.get('retention_percent') as string) || 0
  const totalCertified = parseFloat(formData.get('total_certified') as string) || 0
  const retentionAmount = (totalCertified * retentionPercent) / 100
  const netPayment = totalCertified - retentionAmount

  const { error } = await supabase.from('payment_certificates').insert({
    project_id: projectId,
    certificate_number: formData.get('certificate_number') as string,
    period_start: formData.get('period_start') as string,
    period_end: formData.get('period_end') as string,
    status: (formData.get('status') as string) || 'draft',
    total_certified: totalCertified,
    retention_percent: retentionPercent,
    retention_amount: retentionAmount,
    net_payment: netPayment,
    notes: (formData.get('notes') as string) || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/certificates`)
  return { success: true }
}

export async function updateCertificate(id: string, projectId: string, formData: FormData) {
  const supabase = await createClient()

  const retentionPercent = parseFloat(formData.get('retention_percent') as string) || 0
  const totalCertified = parseFloat(formData.get('total_certified') as string) || 0
  const retentionAmount = (totalCertified * retentionPercent) / 100
  const netPayment = totalCertified - retentionAmount

  const { error } = await supabase.from('payment_certificates').update({
    certificate_number: formData.get('certificate_number') as string,
    period_start: formData.get('period_start') as string,
    period_end: formData.get('period_end') as string,
    status: formData.get('status') as string,
    total_certified: totalCertified,
    retention_percent: retentionPercent,
    retention_amount: retentionAmount,
    net_payment: netPayment,
    notes: (formData.get('notes') as string) || null,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/certificates`)
  return { success: true }
}

export async function deleteCertificate(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('payment_certificates').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/certificates`)
  return { success: true }
}

// ── Certificate Line Items ──────────────────────────────────

export interface CertificateLineItem {
  id: string
  certificate_id: string
  boq_item_id: string | null
  description: string
  unit: string | null
  quantity: number | null
  unit_rate: number | null
  amount: number | null
  certified_pct: number
  certified_amount: number | null
  cumulative_pct: number | null
  previous_certified: number
  this_period: number | null
  sort_order: number
  created_at: string
}

export async function getCertificateLineItems(certificateId: string): Promise<CertificateLineItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('certificate_line_items')
    .select('*')
    .eq('certificate_id', certificateId)
    .order('sort_order')
  return data ?? []
}

export async function createCertificateLineItem(
  certificateId: string,
  projectId: string,
  item: {
    description: string
    unit?: string
    quantity?: number
    unit_rate?: number
    amount?: number
    certified_pct?: number
    previous_certified?: number
    sort_order?: number
    boq_item_id?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const amount = item.amount ?? (item.quantity != null && item.unit_rate != null ? item.quantity * item.unit_rate : null)
  const certPct = item.certified_pct ?? 100
  const certifiedAmount = amount != null ? (amount * certPct) / 100 : null
  const thisPeriod = certifiedAmount != null ? certifiedAmount - (item.previous_certified ?? 0) : null

  const { error } = await supabase.from('certificate_line_items').insert({
    certificate_id: certificateId,
    boq_item_id: item.boq_item_id ?? null,
    description: item.description,
    unit: item.unit ?? null,
    quantity: item.quantity ?? null,
    unit_rate: item.unit_rate ?? null,
    amount,
    certified_pct: certPct,
    certified_amount: certifiedAmount,
    previous_certified: item.previous_certified ?? 0,
    this_period: thisPeriod,
    sort_order: item.sort_order ?? 0,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/certificates`)
  return { success: true }
}

export async function deleteCertificateLineItem(itemId: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('certificate_line_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/certificates`)
  return { success: true }
}

export async function generateLineItemsFromBOQ(certificateId: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: boqItems } = await supabase
    .from('boq_items')
    .select('*')
    .eq('project_id', projectId)
    .order('item_code')

  if (!boqItems || boqItems.length === 0) return { error: 'No BOQ items found for this project' }

  const rows = boqItems.map((b, idx) => ({
    certificate_id: certificateId,
    boq_item_id: b.id,
    description: `[${b.item_code}] ${b.description}`,
    unit: b.unit,
    quantity: b.quantity,
    unit_rate: b.unit_rate,
    amount: b.total_amount,
    certified_pct: 0,
    certified_amount: 0,
    previous_certified: 0,
    this_period: 0,
    sort_order: idx,
  }))

  // Delete existing line items before regenerating
  await supabase.from('certificate_line_items').delete().eq('certificate_id', certificateId)
  const { error } = await supabase.from('certificate_line_items').insert(rows)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/certificates`)
  return { success: true, count: rows.length }
}
