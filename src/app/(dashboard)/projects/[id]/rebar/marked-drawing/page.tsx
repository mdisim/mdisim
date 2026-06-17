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

  const [{ data: project }, elemResult, pagesResult] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase
      .from('rebar_elements')
      .select('id, element_mark, element_type, source_drawing_id, source_page, bars:rebar_bars(id, bar_mark, diameter_mm, shape_code, quantity, ocr_bbox, ocr_confidence, notes)')
      .eq('project_id', id)
      .order('sort_order'),
    supabase
      .from('rebar_extraction_pages')
      .select('*')
      .eq('project_id', id)
      .order('page_number'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let elements: any[] | null = elemResult.data
  if (elemResult.error && elemResult.error.message.includes('column')) {
    const fallback = await supabase
      .from('rebar_elements')
      .select('id, element_mark, element_type, bars:rebar_bars(id, bar_mark, diameter_mm, shape_code, quantity, notes)')
      .eq('project_id', id)
      .order('sort_order')
    elements = fallback.data
  }
  const extractionPages = pagesResult.error ? [] : (pagesResult.data ?? [])

  if (!project) notFound()

  type BarRow = {
    id: string
    bar_mark: string
    diameter_mm: number
    shape_code: string
    quantity: number
    ocr_bbox: { x0: number; y0: number; x1: number; y1: number; canvasW: number; canvasH: number; page: number } | null
    ocr_confidence: number | null
    notes: string | null
  }

  const barMarks = (elements ?? []).flatMap((el: { element_mark: string; bars: BarRow[] }) =>
    (el.bars ?? []).map((b: BarRow) => ({
      id: b.id,
      mark: b.bar_mark,
      diameter: b.diameter_mm,
      quantity: b.quantity,
      element: el.element_mark,
      bbox: b.ocr_bbox ?? null,
      confidence: b.ocr_confidence ?? null,
      notes: b.notes,
    }))
  )

  // ── Strategy 1: Use extraction page renders (already-rasterized OCR images) ──
  const pageImages = await Promise.all(
    (extractionPages ?? []).map(async (p: { image_storage_path: string; page_number: number; width: number; height: number; drawing_id: string }) => {
      const { data: signed } = await supabase.storage
        .from('drawings')
        .createSignedUrl(p.image_storage_path, 3600)
      return {
        page: p.page_number,
        url: signed?.signedUrl ?? null,
        width: p.width,
        height: p.height,
        drawingId: p.drawing_id,
      }
    })
  )
  const validPageImages = pageImages.filter((p): p is typeof p & { url: string } => p.url !== null)

  // ── Strategy 2: Fall back to source drawing PDF from drawing_files ───────────
  let sourceDrawingUrl: string | null = null
  let sourceDrawingType: string | null = null

  if (validPageImages.length === 0) {
    // Try source_drawing_id from elements first
    const sourceDrawingIds = new Set(
      (elements ?? [])
        .map((el: { source_drawing_id?: string }) => el.source_drawing_id)
        .filter(Boolean) as string[]
    )

    let drawingFile: { id: string; storage_path: string; file_type: string | null } | null = null

    if (sourceDrawingIds.size > 0) {
      const firstId = [...sourceDrawingIds][0]
      const { data } = await supabase
        .from('drawing_files')
        .select('id, storage_path, file_type')
        .eq('id', firstId)
        .single()
      drawingFile = data
    }

    // If no source_drawing_id, get any drawing in the project
    if (!drawingFile) {
      const { data } = await supabase
        .from('drawing_files')
        .select('id, storage_path, file_type')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      drawingFile = data
    }

    if (drawingFile?.storage_path) {
      const { data: signed } = await supabase.storage
        .from('drawings')
        .createSignedUrl(drawingFile.storage_path, 3600)
      sourceDrawingUrl = signed?.signedUrl ?? null
      sourceDrawingType = drawingFile.file_type ?? 'pdf'
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-800 shrink-0">
        <Link href={`/projects/${id}/rebar`} className="text-slate-400 hover:text-slate-200 text-sm">
          ← Rebar Schedule
        </Link>
        <div className="w-px h-4 bg-slate-700" />
        <h1 className="text-base font-bold text-white">Marked Drawing — {project.name}</h1>
      </div>
      <MarkedDrawingClient
        barMarks={barMarks}
        pageImages={validPageImages}
        sourceDrawingUrl={sourceDrawingUrl}
        sourceDrawingType={sourceDrawingType}
      />
    </div>
  )
}
