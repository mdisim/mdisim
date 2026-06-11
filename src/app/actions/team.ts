'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import { teamInvitationEmail } from '@/lib/email-templates'
import { APP_URL } from '@/lib/email'

export async function getTeamMembers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'No company found' }

  const { data: members } = await supabase
    .from('profiles')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: true })

  return { members: members ?? [], currentRole: profile.role }
}

export async function updateMemberRole(profileId: string, newRole: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!currentProfile) return { error: 'Profile not found' }
  if (!['company_admin', 'super_admin'].includes(currentProfile.role ?? '')) {
    return { error: 'Insufficient permissions' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', profileId)
    .eq('company_id', currentProfile.company_id)

  if (error) return { error: error.message }

  // Note: JWT metadata sync requires a Supabase Edge Function with service_role key.
  // Only profiles table is updated here.

  revalidatePath('/team')
  return { success: true }
}

export async function inviteMember(email: string, role: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) return { error: 'No company found' }
  if (!['company_admin', 'super_admin'].includes(profile.role ?? '')) {
    return { error: 'Insufficient permissions' }
  }

  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { error } = await supabase.from('team_invitations').insert({
    company_id: profile.company_id,
    email,
    role,
    invited_by: user.id,
    token,
    status: 'pending',
    expires_at: expiresAt.toISOString(),
  })

  if (error) return { error: error.message }

  // Send invitation email (non-blocking)
  const { data: inviterProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .single()

  const inviteUrl = `${APP_URL}/register?invite=${token}`
  const template = teamInvitationEmail({
    inviterName: inviterProfile?.full_name ?? user.email ?? 'A team member',
    companyName: company?.name ?? 'your company',
    role,
    inviteUrl,
  })
  await sendEmail({ to: email, ...template })

  revalidatePath('/team')
  return { success: true }
}

export async function cancelInvitation(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('team_invitations')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/team')
  return { success: true }
}
