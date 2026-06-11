'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import { contractorPaymentEmail } from '@/lib/email-templates'
import { APP_URL } from '@/lib/email'

export async function createContractor(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('contractors').insert({
    user_id: user.id,
    name: formData.get('name') as string,
    company: formData.get('company') as string || null,
    email: formData.get('email') as string || null,
    phone: formData.get('phone') as string || null,
    address: formData.get('address') as string || null,
    specialty: formData.get('specialty') as string || null,
    license_number: formData.get('license_number') as string || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/contractors')
  return { success: true }
}

export async function deleteContractor(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('contractors').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/contractors')
  return { success: true }
}

export async function createPayment(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('contractor_payments').insert({
    project_id: projectId,
    contractor_id: formData.get('contractor_id') as string,
    amount: parseFloat(formData.get('amount') as string) || 0,
    payment_date: formData.get('payment_date') as string,
    payment_method: formData.get('payment_method') as string || null,
    reference_number: formData.get('reference_number') as string || null,
    description: formData.get('description') as string || null,
    status: formData.get('status') as string || 'pending',
  })

  if (error) return { error: error.message }

  // Send payment notification email (non-blocking, best-effort)
  try {
    const contractorId = formData.get('contractor_id') as string
    const amount = formData.get('amount') as string
    const paymentDate = formData.get('payment_date') as string

    const [{ data: contractor }, { data: project }] = await Promise.all([
      supabase.from('contractors').select('name, email').eq('id', contractorId).single(),
      supabase.from('projects').select('name').eq('id', projectId).single(),
    ])

    if (contractor?.email) {
      const template = contractorPaymentEmail({
        contractorName: contractor.name ?? 'Contractor',
        projectName: project?.name ?? 'your project',
        amount,
        paymentDate,
        dashboardUrl: `${APP_URL}/projects/${projectId}/contractors`,
      })
      await sendEmail({ to: contractor.email, ...template })
    }
  } catch {
    // Email errors should not fail the payment action
  }

  revalidatePath(`/projects/${projectId}/contractors`)
  return { success: true }
}

export async function updatePaymentStatus(id: string, projectId: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('contractor_payments').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/contractors`)
  return { success: true }
}

export async function deletePayment(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('contractor_payments').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/contractors`)
  return { success: true }
}
