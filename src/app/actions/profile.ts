'use server'

import { createClient } from '@/lib/supabase/server'

export async function ensureUserProfile(): Promise<{
  company_id: string
  profile: { id: string; company_id: string; full_name: string | null; role: string | null }
} | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check if profile exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, company_id, full_name, role')
    .eq('id', user.id)
    .single()

  if (existing?.company_id) {
    return { company_id: existing.company_id, profile: existing as { id: string; company_id: string; full_name: string | null; role: string | null } }
  }

  // Create a company named after the email domain
  const domain = user.email?.split('@')[1] ?? 'company'
  const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: companyName + ' Construction' })
    .select('id')
    .single()

  if (companyError || !company) {
    return { error: companyError?.message ?? 'Failed to create company' }
  }

  // Upsert profile with company_admin role for the first user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      company_id: company.id,
      role: 'company_admin',
    })
    .select('id, company_id, full_name, role')
    .single()

  if (profileError || !profile) {
    return { error: profileError?.message ?? 'Failed to create profile' }
  }

  // Sync role to user_metadata so proxy.ts can read it without a DB query
  await supabase.auth.updateUser({ data: { role: 'company_admin' } })

  return { company_id: company.id, profile: profile as { id: string; company_id: string; full_name: string | null; role: string | null } }
}

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, companies(*)')
    .eq('id', user.id)
    .single()

  return { user, profile }
}

export async function saveSettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const result = await ensureUserProfile()
  if ('error' in result) return { error: result.error }

  const { company_id } = result

  // Update company
  const { error: companyError } = await supabase
    .from('companies')
    .update({
      name: formData.get('company_name') as string || 'My Company',
      address: formData.get('address') as string || null,
      phone: formData.get('phone') as string || null,
      email: formData.get('company_email') as string || null,
      website: formData.get('website') as string || null,
      registration_number: formData.get('registration_number') as string || null,
      vat_number: formData.get('vat_number') as string || null,
      logo_url: formData.get('logo_url') as string || null,
    })
    .eq('id', company_id)

  if (companyError) return { error: companyError.message }

  // Update profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: formData.get('full_name') as string || null,
      role: formData.get('role') as string || 'owner',
    })
    .eq('id', user.id)

  if (profileError) return { error: profileError.message }

  return { success: true }
}
