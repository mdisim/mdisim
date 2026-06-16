import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ExtractClient } from './extract-client'

export default async function RebarExtractPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: drawings }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase
      .from('drawing_files')
      .select('id, name, file_type, page_count, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!project) notFound()

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 shrink-0">
        <Link href={`/projects/${id}/rebar`} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          ← Rebar Schedule
        </Link>
        <div className="w-px h-4 bg-slate-700" />
        <h1 className="text-lg font-bold text-white">Extract Reinforcement from Drawing</h1>
        <div className="ml-auto text-sm text-slate-400">{project.name}</div>
      </div>

      <ExtractClient projectId={id} drawings={drawings ?? []} />
    </div>
  )
}
