import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Upload, Ruler } from 'lucide-react'
import { DrawingCard } from '@/components/takeoff/drawing-card'

export default async function TakeoffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: drawings }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('drawing_files').select('*').eq('project_id', id).order('created_at', { ascending: false }),
  ])

  if (!project) notFound()

  // Get measurement counts per drawing
  const drawingIds = drawings?.map(d => d.id) ?? []
  const { data: measurementCounts } = drawingIds.length > 0
    ? await supabase.from('drawing_measurements').select('drawing_id').in('drawing_id', drawingIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  for (const m of measurementCounts ?? []) {
    countMap[m.drawing_id] = (countMap[m.drawing_id] ?? 0) + 1
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quantity Takeoff</h1>
            <p className="text-slate-500 text-sm mt-1">{project.name} · {drawings?.length ?? 0} drawing{drawings?.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            href={`/projects/${id}/takeoff/upload`}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
          >
            <Upload size={16} /> Upload Drawing
          </Link>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 shadow-md">
        <Ruler size={20} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">PlanSwift-style measurement tools</p>
          <p className="text-blue-700">Upload PDF drawings, calibrate scale, then measure lengths, areas, and counts. Link measurements directly to BOQ items and auto-generate quantities.</p>
        </div>
      </div>

      {!drawings || drawings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-300 bg-white rounded-2xl shadow-md">
          <Ruler size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">No drawings uploaded yet</p>
          <p className="text-sm mt-1 mb-6">Upload a PDF drawing to start measuring quantities</p>
          <Link
            href={`/projects/${id}/takeoff/upload`}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
          >
            <Upload size={16} /> Upload First Drawing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {drawings.map(drawing => (
            <DrawingCard
              key={drawing.id}
              drawing={drawing}
              projectId={id}
              measurementCount={countMap[drawing.id] ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
