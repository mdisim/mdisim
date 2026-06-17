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

  const [{ data: project }, elemResult, pagesResult, { data: allDrawings }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase
      .from('rebar_elements')
      .select('id, element_mark, element_type, source_drawing_id, source_page, bars:rebar_bars(id, bar_mark, diameter_mm, shape_code, quantity, ocr_bbox, ocr_confidence, label_x, label_y, notes)')
      .eq('project_id', id)
      .order('sort_order'),
    supabase
      .from('rebar_extraction_pages')
      .select('*')
      .eq('project_id', id)
      .order('page_number'),
    supabase
      .from('drawing_files')
      .select('id, name, storage_path, file_type, page_count, created_at')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
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
    label_x: number | null
    label_y: number | null
    notes: string | null
  }
  type ElemRow = {
    id: string
    element_mark: string
    element_type: string
    source_drawing_id?: string | null
    source_page?: number | null
    bars: BarRow[]
  }

  // Build bar marks WITH source drawing info
  const barMarks = (elements ?? []).flatMap((el: ElemRow) =>
    (el.bars ?? []).map((b: BarRow) => ({
      id: b.id,
      mark: b.bar_mark,
      diameter: b.diameter_mm,
      quantity: b.quantity,
      element: el.element_mark,
      bbox: b.ocr_bbox ?? null,
      confidence: b.ocr_confidence ?? null,
      labelX: b.label_x ?? null,
      labelY: b.label_y ?? null,
      notes: b.notes,
      sourceDrawingId: el.source_drawing_id ?? null,
      sourcePage: el.source_page ?? null,
    }))
  )

  // Extraction page images grouped by drawing
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

  // Build drawing options with signed URLs for source PDF fallback
  const drawings = await Promise.all(
    (allDrawings ?? []).map(async (d: { id: string; name: string; storage_path: string; file_type: string | null; page_count: number; created_at: string }) => {
      const { data: signed } = await supabase.storage
        .from('drawings')
        .createSignedUrl(d.storage_path, 3600)
      const barCount = barMarks.filter(b => b.sourceDrawingId === d.id).length
      const extractionPageCount = (extractionPages ?? []).filter(
        (p: { drawing_id: string }) => p.drawing_id === d.id
      ).length
      return {
        id: d.id,
        name: d.name,
        fileType: d.file_type ?? 'pdf',
        pageCount: d.page_count,
        createdAt: d.created_at,
        signedUrl: signed?.signedUrl ?? null,
        barCount,
        hasExtractionImages: extractionPageCount > 0,
      }
    })
  )

  // Determine which drawing to show by default:
  // 1. Drawing with most linked bars
  // 2. Drawing with extraction images
  // 3. Most recent drawing
  const drawingWithMostBars = [...drawings].sort((a, b) => b.barCount - a.barCount)[0]
  const drawingWithExtraction = drawings.find(d => d.hasExtractionImages)
  const defaultDrawingId = drawingWithMostBars?.barCount > 0
    ? drawingWithMostBars.id
    : drawingWithExtraction?.id ?? drawings[0]?.id ?? null

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
        drawings={drawings}
        defaultDrawingId={defaultDrawingId}
      />
    </div>
  )
}
