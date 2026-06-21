import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MeasurementSheetClient from './measurement-sheet-client'

export default async function MeasurementSheetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: boqItems }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('boq_items').select('id, item_code, description, unit, quantity').eq('project_id', id).order('sort_order', { ascending: true, nullsFirst: false }),
  ])

  if (!project) notFound()

  return (
    <div className="flex flex-col h-full space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Measurement Sheet</h1>
        <p className="text-slate-500 text-sm mt-1">
          {project.name} — L × W × H dimension calculations
        </p>
      </div>
      <MeasurementSheetClient
        projectId={id}
        boqItems={(boqItems ?? []) as { id: string; item_code: string | null; description: string | null; unit: string | null; quantity: number | null }[]}
      />
    </div>
  )
}
