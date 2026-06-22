'use server'

import { createClient } from '@/lib/supabase/server'

export async function signIn(email: string, password: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  const role = data.user?.user_metadata?.role
  return { success: true, role: role as string | undefined }
}
