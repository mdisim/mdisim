import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CorrespondenceClient } from '@/components/correspondence/correspondence-client'

export default async function CorrespondencePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: items }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase
      .from('project_correspondence')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!project) notFound()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Correspondence Log</h1>
        <p className="text-slate-500 text-sm mt-1">{project.name}</p>
      </div>

      <CorrespondenceClient items={items ?? []} projectId={id} />
    </div>
  )
}
