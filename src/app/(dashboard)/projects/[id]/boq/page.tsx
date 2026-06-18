import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

import { T } from '@/components/ui/translated-label'
import { getLibraryItems } from '@/app/actions/boq-library'
import BOQPageWithLibrary from './boq-page-with-library'

export default async function BOQPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: boqItems }, { data: libraryItems }] = await Promise.all([
    supabase.from('projects').select('id, name, budget').eq('id', id).single(),
    supabase.from('boq_items').select('*').eq('project_id', id).order('sort_order', { ascending: true, nullsFirst: false }),
    getLibraryItems(),
  ])

  if (!project) notFound()

  return (
    <div className="flex flex-col h-full space-y-8">
      <div>
<div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              <T k="bill_of_quantities" fallback="Bill of Quantities" />
            </h1>
            <p className="text-slate-500 text-sm mt-1">{project.name}</p>
          </div>
        </div>
      </div>

      <BOQPageWithLibrary
        initialItems={boqItems ?? []}
        projectId={id}
        projectName={project.name}
        libraryItems={libraryItems ?? []}
      />
    </div>
  )
}
