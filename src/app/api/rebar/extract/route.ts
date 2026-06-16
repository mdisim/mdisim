import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseDXF } from '@/lib/dxf-parser'
import {
  extractFromDXFEntities,
  extractFromPageText,
  type DetectedElement,
} from '@/lib/rebar-extractor'

// POST /api/rebar/extract
// Body: { drawingId: string }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { drawingId } = await req.json() as { drawingId: string }
  if (!drawingId) return NextResponse.json({ error: 'drawingId required' }, { status: 400 })

  // Fetch drawing record
  const { data: drawing } = await supabase
    .from('drawing_files')
    .select('id, file_type, storage_path')
    .eq('id', drawingId)
    .single()
  if (!drawing) return NextResponse.json({ error: 'Drawing not found' }, { status: 404 })

  // Get signed URL
  const { data: signed } = await supabase.storage
    .from('drawings')
    .createSignedUrl(drawing.storage_path, 300)
  if (!signed?.signedUrl) return NextResponse.json({ error: 'Could not get signed URL' }, { status: 500 })

  let elements: DetectedElement[] = []

  try {
    if (drawing.file_type === 'dxf') {
      // ── DXF extraction ──────────────────────────────────────────────────
      const res = await fetch(signed.signedUrl)
      if (!res.ok) return NextResponse.json({ error: 'Could not fetch DXF' }, { status: 502 })
      const dxfText = await res.text()
      const parsed = parseDXF(dxfText)
      elements = extractFromDXFEntities(parsed.entities)
    } else {
      // ── PDF text extraction ─────────────────────────────────────────────
      const res = await fetch(signed.signedUrl)
      if (!res.ok) return NextResponse.json({ error: 'Could not fetch PDF' }, { status: 502 })
      const buffer = await res.arrayBuffer()

      // Server-side PDF.js (legacy build, Node-compatible)
      const { getDocument, GlobalWorkerOptions } = await import(
        /* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs' as string
      ) as typeof import('pdfjs-dist')

      // Point worker to legacy worker so it can run inline in Node
      GlobalWorkerOptions.workerSrc =
        new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href

      const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise
      const pageTexts: Array<{ text: string; page: number }> = []

      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p)
        const content = await page.getTextContent()
        const text = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join('\n')
        pageTexts.push({ text, page: p })
      }

      elements = extractFromPageText(pageTexts)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Extraction failed: ${msg}` }, { status: 500 })
  }

  return NextResponse.json({ elements, count: elements.length })
}
