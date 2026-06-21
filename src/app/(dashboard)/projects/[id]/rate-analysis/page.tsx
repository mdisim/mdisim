import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RateAnalysisClient from './rate-analysis-client'

export default async function RateAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: boqItems }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('boq_items').select('id, item_code, description, unit, unit_rate, quantity').eq('project_id', id).order('sort_order', { ascending: true, nullsFirst: false }),
  ])

  if (!project) notFound()

  return (
    <div className="flex flex-col h-full space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rate Analysis</h1>
        <p className="text-slate-500 text-sm mt-1">
          {project.name} — Build unit rates from material, labor, equipment &amp; overhead costs
        </p>
      </div>
      <RateAnalysisClient
        projectId={id}
        boqItems={(boqItems ?? []) as { id: string; item_code: string | null; description: string | null; unit: string | null; unit_rate: number | null; quantity: number | null }[]}
      />
    </div>
  )
}
