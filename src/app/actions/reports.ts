'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createReport(projectId: string, reportDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase.from('site_daily_reports').insert({
    project_id: projectId,
    report_date: reportDate,
    created_by: user.id,
    work_status: 'normal',
    status: 'draft',
  }).select().single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/reports`)
  return { success: true, id: data.id }
}

export async function updateReport(id: string, projectId: string, data: {
  weather?: string | null
  temperature_high?: number | null
  temperature_low?: number | null
  work_status?: string
  delay_reason?: string | null
  general_notes?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('site_daily_reports').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/reports/${id}`)
  return { success: true }
}

export async function submitReport(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('site_daily_reports').update({ status: 'submitted' }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/reports/${id}`)
  revalidatePath(`/projects/${projectId}/reports`)
  return { success: true }
}

export async function approveReport(id: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }
  const { error } = await supabase.from('site_daily_reports').update({
    status: 'approved',
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/reports/${id}`)
  return { success: true }
}

export async function deleteReport(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('site_daily_reports').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/reports`)
  return { success: true }
}

// ---- Workforce ----
export async function upsertWorkforce(reportId: string, projectId: string, items: Array<{
  id?: string; trade: string; contractor_id?: string | null
  planned_count: number; actual_count: number; overtime_hours: number; notes?: string | null
}>) {
  const supabase = await createClient()
  const { error } = await supabase.from('sdr_workforce').upsert(
    items.map(i => ({ ...i, report_id: reportId })),
    { onConflict: 'id' }
  )
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/reports/${reportId}`)
  return { success: true }
}

export async function deleteWorkforceRow(id: string, reportId: string, projectId: string) {
  const supabase = await createClient()
  await supabase.from('sdr_workforce').delete().eq('id', id)
  revalidatePath(`/projects/${projectId}/reports/${reportId}`)
  return { success: true }
}

// ---- Equipment ----
export async function upsertEquipment(reportId: string, projectId: string, items: Array<{
  id?: string; equipment_name: string; equipment_type?: string | null
  quantity: number; hours_used: number; idle_hours: number; operator_name?: string | null; notes?: string | null
}>) {
  const supabase = await createClient()
  const { error } = await supabase.from('sdr_equipment').upsert(
    items.map(i => ({ ...i, report_id: reportId })),
    { onConflict: 'id' }
  )
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/reports/${reportId}`)
  return { success: true }
}

export async function deleteEquipmentRow(id: string, reportId: string, projectId: string) {
  const supabase = await createClient()
  await supabase.from('sdr_equipment').delete().eq('id', id)
  revalidatePath(`/projects/${projectId}/reports/${reportId}`)
  return { success: true }
}

// ---- Activities ----
export async function upsertActivities(reportId: string, projectId: string, items: Array<{
  id?: string; boq_item_id?: string | null; description: string
  location_on_site?: string | null; unit?: string | null; quantity_done: number; notes?: string | null
}>) {
  const supabase = await createClient()
  const { error } = await supabase.from('sdr_activities').upsert(
    items.map(i => ({ ...i, report_id: reportId })),
    { onConflict: 'id' }
  )
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/reports/${reportId}`)
  return { success: true }
}

export async function deleteActivityRow(id: string, reportId: string, projectId: string) {
  const supabase = await createClient()
  await supabase.from('sdr_activities').delete().eq('id', id)
  revalidatePath(`/projects/${projectId}/reports/${reportId}`)
  return { success: true }
}

// ---- Issues ----
export async function createIssue(reportId: string, projectId: string, data: {
  issue_type?: string | null; description: string; severity: string
  raised_by?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('sdr_issues').insert({ ...data, report_id: reportId })
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/reports/${reportId}`)
  return { success: true }
}

export async function updateIssueStatus(id: string, reportId: string, projectId: string, data: {
  status: string; resolution_notes?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('sdr_issues').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/reports/${reportId}`)
  return { success: true }
}

export async function deleteIssue(id: string, reportId: string, projectId: string) {
  const supabase = await createClient()
  await supabase.from('sdr_issues').delete().eq('id', id)
  revalidatePath(`/projects/${projectId}/reports/${reportId}`)
  return { success: true }
}
