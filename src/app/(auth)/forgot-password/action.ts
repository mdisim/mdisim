'use server'

import { createClient } from '@/lib/supabase/server'
import { APP_URL } from '@/lib/email'

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) return { error: 'Email is required' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}/reset-password`,
  })

  if (error) return { error: error.message }
  return { success: true }
}
