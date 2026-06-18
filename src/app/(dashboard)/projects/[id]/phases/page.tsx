import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PhasesClient } from '@/components/phases/phases-client'

export default async function PhasesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: phases }, { data: milestones }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('project_phases').select('*').eq('project_id', id).order('sort_order'),
    supabase.from('project_milestones').select('*').eq('project_id', id).order('due_date'),
  ])

  if (!project) notFound()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Phases &amp; Milestones</h1>
        <p className="text-slate-500 text-sm mt-1">{project.name}</p>
      </div>

      <PhasesClient
        phases={phases ?? []}
        milestones={milestones ?? []}
        projectId={id}
      />
    </div>
  )
}
