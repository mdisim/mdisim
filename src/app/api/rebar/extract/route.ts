import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseDXF } from '@/lib/dxf-parser'
import { extractFromDXFEntities } from '@/lib/rebar-extractor'

// POST /api/rebar/extract
// Body: { drawingId: string }
//
// DXF drawings: extracted server-side (text file, no browser APIs needed)
// PDF drawings: returns { requiresClientExtraction: true, signedUrl } so the
//               client can use PDF.js (already running in the browser) to pull
//               text and run rebar-extractor locally — avoids the ESM/Node
//               incompatibility of pdfjs-dist in Vercel serverless.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { drawingId } = await req.json() as { drawingId: string }
  if (!drawingId) return NextResponse.json({ error: 'drawingId required' }, { status: 400 })

  const { data: drawing } = await supabase
    .from('drawing_files')
    .select('id, file_type, storage_path')
    .eq('id', drawingId)
    .single()
  if (!drawing) return NextResponse.json({ error: 'Drawing not found' }, { status: 404 })

  const { data: signed } = await supabase.storage
    .from('drawings')
    .createSignedUrl(drawing.storage_path, 300)
  if (!signed?.signedUrl) return NextResponse.json({ error: 'Could not get signed URL' }, { status: 500 })

  // ── PDF: delegate to client-side PDF.js ────────────────────────────────────
  if (drawing.file_type !== 'dxf') {
    return NextResponse.json({
      requiresClientExtraction: true,
      signedUrl: signed.signedUrl,
      fileType: drawing.file_type,
    })
  }

  // ── DXF: extract server-side ───────────────────────────────────────────────
  try {
    const res = await fetch(signed.signedUrl)
    if (!res.ok) return NextResponse.json({ error: 'Could not fetch DXF file' }, { status: 502 })
    const dxfText = await res.text()
    const parsed = parseDXF(dxfText)
    const elements = extractFromDXFEntities(parsed.entities)
    return NextResponse.json({ elements, count: elements.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `DXF extraction failed: ${msg}` }, { status: 500 })
  }
}
