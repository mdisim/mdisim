'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDocument(projectId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('project_documents').insert({
    project_id: projectId,
    title: formData.get('title') as string,
    document_type: formData.get('document_type') as string || 'other',
    revision: formData.get('revision') as string || null,
    status: formData.get('status') as string || 'current',
    file_url: formData.get('file_url') as string || null,
    notes: formData.get('notes') as string || null,
    uploaded_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/documents`)
  return { success: true }
}

export async function deleteDocument(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('project_documents').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/documents`)
  return { success: true }
}
