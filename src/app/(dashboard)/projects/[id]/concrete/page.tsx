import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ConcreteClient } from './concrete-client'

export default async function ConcretePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: pours }, { data: rebar }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('concrete_pours').select('*').eq('project_id', id).order('pour_date', { ascending: false }),
    supabase.from('reinforcement_records').select('*').eq('project_id', id).order('record_date', { ascending: false }),
  ])

  if (!project) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Concrete & Reinforcement</h1>
        <p className="text-slate-500 text-sm mt-1">{project.name}</p>
      </div>
      <ConcreteClient pours={pours ?? []} rebarRecords={rebar ?? []} projectId={id} />
    </div>
  )
}
