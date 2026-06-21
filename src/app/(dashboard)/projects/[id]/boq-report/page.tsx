import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BOQReportClient from './boq-report-client'

export default async function BOQReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: boqItems }, { data: profile }] = await Promise.all([
    supabase.from('projects').select('id, name, client_name, budget, status, created_at').eq('id', id).single(),
    supabase.from('boq_items').select('*').eq('project_id', id).order('sort_order', { ascending: true, nullsFirst: false }),
    supabase.from('profiles').select('full_name, company_id, companies(name)').single(),
  ])

  if (!project) notFound()

  const companyName = (profile as Record<string, unknown>)?.companies
    ? ((profile as Record<string, unknown>).companies as Record<string, string>)?.name ?? ''
    : ''

  return (
    <BOQReportClient
      project={project as { id: string; name: string; client_name: string | null; budget: number | null; status: string; created_at: string }}
      boqItems={(boqItems ?? []) as { id: string; item_code: string | null; description: string | null; unit: string | null; quantity: number | null; unit_rate: number | null; total_amount: number | null; vat_percent: number | null; vat_amount: number | null; category: string | null; is_section_header: boolean | null; notes: string | null }[]}
      preparedBy={((profile as Record<string, unknown>)?.full_name as string) ?? ''}
      companyName={companyName}
    />
  )
}
