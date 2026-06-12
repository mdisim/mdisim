import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getSignedUrl } from '@/app/actions/takeoff'
import { TakeoffViewer } from '@/components/takeoff/takeoff-viewer'

export default async function TakeoffViewerPage({
  params,
}: {
  params: Promise<{ id: string; drawingId: string }>
}) {
  const { id, drawingId } = await params
  const supabase = await createClient()

  const [
    { data: project },
    { data: drawing },
    { data: calibrations },
    { data: measurements },
    { data: boqItems },
  ] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('drawing_files').select('*').eq('id', drawingId).single(),
    supabase.from('drawing_calibrations').select('*').eq('drawing_id', drawingId),
    supabase.from('drawing_measurements')
      .select('*, boq_item:boq_items(item_code, description, unit)')
      .eq('drawing_id', drawingId)
      .order('page_number').order('sort_order'),
    supabase.from('boq_items').select('*').eq('project_id', id).order('item_code'),
  ])

  if (!project || !drawing) notFound()

  const { url } = await getSignedUrl(drawing.storage_path)
  const pdfUrl = url ?? ''

  let dxfContent: string | null = null
  if (drawing.file_type === 'dxf' && url) {
    try {
      const res = await fetch(url)
      if (res.ok) dxfContent = await res.text()
    } catch {
      // ignore
    }
  }

  return (
    <TakeoffViewer
      drawing={drawing}
      projectId={id}
      pdfUrl={pdfUrl}
      initialCalibrations={calibrations ?? []}
      initialMeasurements={measurements ?? []}
      boqItems={boqItems ?? []}
      dxfContent={dxfContent}
    />
  )
}
