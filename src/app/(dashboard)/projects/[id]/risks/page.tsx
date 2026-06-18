import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RisksClient } from './risks-client'

export default async function RisksPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: risks }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('project_risks').select('*').eq('project_id', id).order('risk_score', { ascending: false }),
  ])

  if (!project) notFound()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Risk Register</h1>
        <p className="text-slate-500 text-sm mt-1">{project.name}</p>
      </div>
      <RisksClient risks={risks ?? []} projectId={id} />
    </div>
  )
}
