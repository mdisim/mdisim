import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BBSEditor } from './bbs-editor'

export default async function BBSEditorPage({
  params,
}: {
  params: Promise<{ id: string; elementId: string }>
}) {
  const { id, elementId } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: element }, { data: bars }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('rebar_elements').select('*').eq('id', elementId).single(),
    supabase.from('rebar_bars').select('*').eq('element_id', elementId).order('sort_order').order('bar_mark'),
  ])

  if (!project || !element) notFound()

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 shrink-0">
        <Link href={`/projects/${id}/rebar`} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          ← Rebar Schedule
        </Link>
        <div className="w-px h-4 bg-slate-700" />
        <div>
          <span className="text-xs text-amber-400 uppercase tracking-wider">{element.element_type}</span>
          <span className="ml-2 font-mono font-bold text-white text-lg">{element.element_mark}</span>
          {element.floor_level && <span className="ml-2 text-sm text-slate-500">{element.floor_level}</span>}
        </div>
        <div className="ml-auto text-sm text-slate-400">{project.name}</div>
      </div>

      <BBSEditor elementId={elementId} initialBars={bars ?? []} />
    </div>
  )
}
