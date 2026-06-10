'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getMeetingMinutes(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('meeting_minutes')
    .select('*')
    .eq('project_id', projectId)
    .order('meeting_date', { ascending: false })
  if (error) return { error: error.message, data: [] }
  return { data: data ?? [] }
}

export async function createMeetingMinutes(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('meeting_minutes').insert({
    project_id: projectId,
    meeting_date: formData.get('meeting_date') as string,
    meeting_type: (formData.get('meeting_type') as string) || 'progress',
    location: (formData.get('location') as string) || null,
    attendees: (formData.get('attendees') as string) || null,
    agenda: (formData.get('agenda') as string) || null,
    minutes: (formData.get('minutes') as string) || null,
    action_items: (formData.get('action_items') as string) || null,
    next_meeting_date: (formData.get('next_meeting_date') as string) || null,
    chaired_by: (formData.get('chaired_by') as string) || null,
    status: (formData.get('status') as string) || 'draft',
    created_by: user?.id ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/meetings`)
  return { success: true }
}

export async function deleteMeetingMinutes(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('meeting_minutes').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/meetings`)
  return { success: true }
}
