import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { VariationsClient } from './variations-client'

export default async function VariationsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: variations }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('variations').select('*').eq('project_id', id).order('variation_number'),
  ])

  if (!project) notFound()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Variations & Change Orders</h1>
        <p className="text-slate-500 text-sm mt-1">{project.name}</p>
      </div>
      <VariationsClient variations={variations ?? []} projectId={id} />
    </div>
  )
}
