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
