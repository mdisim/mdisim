import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MarkedDrawingClient } from './marked-drawing-client'

export default async function MarkedDrawingPage({
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
      .select('id, element_mark, element_type, bars:rebar_bars(id, bar_mark, diameter_mm, shape_code, quantity)')
      .eq('project_id', id)
      .order('sort_order'),
  ])

  if (!project) notFound()

  const barMarks = (elements ?? []).flatMap(el =>
    (el.bars ?? []).map((b: { bar_mark: string; diameter_mm: number; quantity: number }) => ({
      mark: b.bar_mark,
      diameter: b.diameter_mm,
      quantity: b.quantity,
      element: el.element_mark,
    }))
  )

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-800 shrink-0">
        <Link href={`/projects/${id}/rebar`} className="text-slate-400 hover:text-slate-200 text-sm">
          ← Rebar Schedule
        </Link>
        <div className="w-px h-4 bg-slate-700" />
        <h1 className="text-base font-bold text-white">Marked Drawing — {project.name}</h1>
      </div>
      <MarkedDrawingClient barMarks={barMarks} />
    </div>
  )
}
