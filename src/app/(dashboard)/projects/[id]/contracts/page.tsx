import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ContractsClient } from './contracts-client'

export default async function ContractsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: project }, { data: contracts }, { data: contractors }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('project_contracts').select('*, contractor:contractors(name, company)').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('contractors').select('*').eq('user_id', user!.id).order('name'),
  ])

  if (!project) notFound()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contracts</h1>
        <p className="text-slate-500 text-sm mt-1">{project.name}</p>
      </div>
      <ContractsClient contracts={contracts ?? []} projectId={id} contractors={contractors ?? []} />
    </div>
  )
}
