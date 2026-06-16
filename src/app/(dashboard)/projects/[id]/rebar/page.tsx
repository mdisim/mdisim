import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { RebarScheduleClient } from './rebar-schedule-client'

export default async function RebarSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: elements }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase
      .from('rebar_elements')
      .select('*, bars:rebar_bars(*)')
      .eq('project_id', id)
      .order('sort_order'),
  ])

  if (!project) notFound()

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Rebar Schedule</h1>
          <p className="text-sm text-slate-400">{project.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${id}/rebar/extract`}
            className="px-3 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors font-medium"
          >
            ⚡ Extract from Drawing
          </Link>
          <a
            href={`/api/rebar/export?projectId=${id}`}
            className="px-3 py-1.5 text-sm rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            Export Excel
          </a>
          <Link
            href={`/projects/${id}/rebar/procurement`}
            className="px-3 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Procurement
          </Link>
          <Link
            href={`/projects/${id}/rebar/fabrication-all`}
            className="px-3 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Full BBS PDF
          </Link>
        </div>
      </div>

      <RebarScheduleClient
        projectId={id}
        initialElements={elements ?? []}
      />
    </div>
  )
}
