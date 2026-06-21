import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BOQComparisonClient } from '@/components/boq-comparison/boq-comparison-client'
import BOQVersionCompare from '@/components/boq-comparison/boq-version-compare'
import ComparisonTabs from './comparison-tabs'

export default async function BOQComparisonPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: boqItems }, { data: costEntries }] = await Promise.all([
    supabase.from('projects').select('id, name, client_name').eq('id', id).single(),
    supabase.from('boq_items').select('*').eq('project_id', id).order('item_code'),
    supabase.from('cost_entries').select('*').eq('project_id', id),
  ])

  if (!project) notFound()

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">BOQ Comparison</h1>
        <p className="text-slate-500 text-sm mt-1">{project.name}</p>
      </div>

      <ComparisonTabs
        budgetTab={
          <BOQComparisonClient
            boqItems={boqItems ?? []}
            costEntries={costEntries ?? []}
            projectName={project.name}
          />
        }
        versionTab={
          <BOQVersionCompare
            boqItems={(boqItems ?? []) as { id: string; item_code: string | null; description: string | null; unit: string | null; quantity: number | null; unit_rate: number | null; total_amount: number | null; category: string | null }[]}
            projectName={project.name}
          />
        }
      />
    </div>
  )
}
