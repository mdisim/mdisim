import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { FileBarChart } from 'lucide-react'
import BudgetReportClient from './client'

export default async function BudgetReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: project },
    { data: boqItems },
    { data: costEntries },
    { data: payments },
    { data: phases },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('boq_items').select('*').eq('project_id', id),
    supabase.from('cost_entries').select('*').eq('project_id', id),
    supabase.from('contractor_payments').select('*').eq('project_id', id).eq('status', 'completed'),
    supabase.from('project_phases').select('*').eq('project_id', id).order('sort_order'),
  ])

  if (!project) notFound()

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <FileBarChart size={22} className="text-amber-500" />
          <h1 className="text-2xl font-bold text-slate-900">Budget vs Actual Report</h1>
        </div>
        <p className="text-slate-500 text-sm mt-1">{project.name}</p>
      </div>
      <BudgetReportClient
        project={project}
        boqItems={boqItems ?? []}
        costEntries={costEntries ?? []}
        payments={payments ?? []}
        phases={phases ?? []}
      />
    </div>
  )
}
