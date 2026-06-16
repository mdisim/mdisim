import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EVMClient } from './evm-client'

export default async function EVMPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: boqItems }, { data: costEntries }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, budget, start_date, end_date')
      .eq('id', id)
      .single(),
    supabase
      .from('boq_items')
      .select('total_amount')
      .eq('project_id', id)
      .eq('is_section_header', false),
    supabase
      .from('cost_entries')
      .select('amount, status, entry_date')
      .eq('project_id', id),
  ])

  if (!project) notFound()

  const boqTotal = boqItems?.reduce((s, i) => s + (i.total_amount ?? 0), 0) ?? 0
  const bac = boqTotal > 0 ? boqTotal : (project.budget ?? 0)
  const ac = costEntries?.reduce((s, c) => s + (c.amount ?? 0), 0) ?? 0

  return (
    <EVMClient
      projectId={project.id}
      projectName={project.name}
      bac={bac}
      ac={ac}
      startDate={project.start_date ?? null}
      endDate={project.end_date ?? null}
    />
  )
}
