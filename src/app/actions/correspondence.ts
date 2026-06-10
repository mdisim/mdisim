'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCorrespondence(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('project_correspondence').insert({
    project_id: projectId,
    reference_number: formData.get('reference_number') as string,
    subject: formData.get('subject') as string,
    direction: formData.get('direction') as string || 'outgoing',
    correspondent: formData.get('correspondent') as string || null,
    letter_date: formData.get('letter_date') as string || null,
    received_date: formData.get('received_date') as string || null,
    category: formData.get('category') as string || 'general',
    status: formData.get('status') as string || 'open',
    summary: formData.get('summary') as string || null,
    action_required: formData.get('action_required') as string || null,
    due_date: formData.get('due_date') as string || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/correspondence`)
  return { success: true }
}

export async function deleteCorrespondence(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('project_correspondence').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/correspondence`)
  return { success: true }
}
