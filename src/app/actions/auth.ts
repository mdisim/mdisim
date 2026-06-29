'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

function friendlyAuthError(msg: string): string {
  if (msg.includes('Unexpected token') || msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('Host not'))
    return 'Unable to connect to the authentication service. Please try again.'
  return msg
}

export async function signIn(email: string, password: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) return { error: friendlyAuthError(error.message) }

    await ensureProfileExists(supabase, data.user!)

    const role = data.user?.user_metadata?.role
    return { success: true, role: role as string | undefined }
  } catch (e) {
    return { error: 'Unable to connect to the authentication service. Please try again.' }
  }
}

export async function signUp(email: string, password: string) {
  try {
    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get('origin') || headersList.get('referer')?.replace(/\/register.*/, '') || ''

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/api/auth/callback` },
    })

    if (error) return { error: friendlyAuthError(error.message) }

    if (data.user && data.session) {
      await ensureProfileExists(supabase, data.user)
    }

    return { success: true, confirmed: !!data.session }
  } catch (e) {
    return { error: 'Unable to connect to the authentication service. Please try again.' }
  }
}

export async function completeOnboarding(role: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Ensure profile exists first, then update role
  await ensureProfileExists(supabase, user)

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user.id)

  if (updateErr) return { error: updateErr.message }

  await supabase.auth.updateUser({ data: { role } })

  return { success: true }
}

async function ensureProfileExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existing) {
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: (user.user_metadata?.full_name as string) || null,
      role: (user.user_metadata?.role as string) || 'owner',
    })
  }
}
