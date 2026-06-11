import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BOQSpreadsheet from './boq-spreadsheet'

export default async function BOQPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: boqItems }] = await Promise.all([
    supabase.from('projects').select('id, name, budget').eq('id', id).single(),
    supabase.from('boq_items').select('*').eq('project_id', id).order('sort_order', { ascending: true }),
  ])

  if (!project) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to {project.name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bill of Quantities</h1>
            <p className="text-slate-500 text-sm mt-1">{project.name}</p>
          </div>
        </div>
      </div>

      <BOQSpreadsheet
        initialItems={boqItems ?? []}
        projectId={id}
        projectName={project.name}
      />
    </div>
  )
}
