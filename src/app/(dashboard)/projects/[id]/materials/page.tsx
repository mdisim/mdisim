import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MaterialsClient } from './materials-client'

export default async function MaterialsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: deliveries }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('material_deliveries').select('*').eq('project_id', id).order('delivery_date', { ascending: false }),
  ])

  if (!project) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Material Tracking</h1>
        <p className="text-slate-500 text-sm mt-1">{project.name}</p>
      </div>
      <MaterialsClient deliveries={deliveries ?? []} projectId={id} />
    </div>
  )
}
