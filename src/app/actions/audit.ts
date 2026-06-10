'use server'
import { createClient } from '@/lib/supabase/server'

export async function logAction(params: {
  action: string
  resource_type: string
  resource_id?: string
  resource_name?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    user_email: user.email,
    action: params.action,
    resource_type: params.resource_type,
    resource_id: params.resource_id ?? null,
    resource_name: params.resource_name ?? null,
    old_values: params.old_values ?? null,
    new_values: params.new_values ?? null,
  })
}
