'use server'

import { createClient } from '@/lib/supabase/server'
import type { QuantityAttachment, AttachmentFileType, AttachmentCategory } from '@/lib/types'
import { isValidUUID } from '@/lib/validate'

export async function getAttachments(params: {
  projectId: string
  miId?: string
  boqItemId?: string
  drawingMeasurementId?: string
  lineId?: string
}): Promise<QuantityAttachment[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('qb_quantity_attachments')
    .select('*')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })

  if (params.miId) query = query.eq('mi_id', params.miId)
  if (params.boqItemId) query = query.eq('boq_item_id', params.boqItemId)
  if (params.drawingMeasurementId) query = query.eq('drawing_measurement_id', params.drawingMeasurementId)
  if (params.lineId) query = query.eq('line_id', params.lineId)

  const { data } = await query
  return (data ?? []) as QuantityAttachment[]
}

export async function uploadAttachment(params: {
  projectId: string
  miId?: string
  boqItemId?: string
  drawingMeasurementId?: string
  lineId?: string
  file: File
  title?: string
  description?: string
  category?: AttachmentCategory
}): Promise<{ data?: QuantityAttachment; error?: string }> {
  if (!isValidUUID(params.projectId)) return { error: 'Invalid project ID' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const ext = params.file.name.split('.').pop()?.toLowerCase() ?? ''
  const filePath = `${params.projectId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('qb-attachments')
    .upload(filePath, params.file, { upsert: false })

  if (uploadError) return { error: uploadError.message }

  const fileType = detectFileType(params.file.name, params.file.type)

  const { data, error } = await supabase
    .from('qb_quantity_attachments')
    .insert({
      project_id: params.projectId,
      mi_id: params.miId ?? null,
      boq_item_id: params.boqItemId ?? null,
      drawing_measurement_id: params.drawingMeasurementId ?? null,
      line_id: params.lineId ?? null,
      file_path: filePath,
      file_name: params.file.name,
      file_type: fileType,
      file_size: params.file.size,
      mime_type: params.file.type,
      title: params.title ?? params.file.name,
      description: params.description ?? null,
      category: params.category ?? 'other',
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as QuantityAttachment }
}

export async function deleteAttachment(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: att } = await supabase
    .from('qb_quantity_attachments')
    .select('file_path')
    .eq('id', id)
    .single()

  if (att?.file_path) {
    await supabase.storage.from('qb-attachments').remove([att.file_path])
  }

  const { error } = await supabase
    .from('qb_quantity_attachments')
    .delete()
    .eq('id', id)

  return error ? { error: error.message } : {}
}

export async function getAttachmentUrl(filePath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from('qb-attachments')
    .createSignedUrl(filePath, 3600)
  return data?.signedUrl ?? null
}

function detectFileType(name: string, mime: string): AttachmentFileType {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'photo'
  if (ext === 'pdf') return 'pdf'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'excel'
  if (['doc', 'docx'].includes(ext)) return 'word'
  if (['dwg', 'dxf'].includes(ext)) return 'dwg'
  if (mime.startsWith('image/')) return 'photo'
  return 'other'
}
