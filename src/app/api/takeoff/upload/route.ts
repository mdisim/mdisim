import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// In-memory rate limit: max 5 uploads/minute per user
const uploadTracker = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT = 5
const WINDOW_MS = 60_000

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = uploadTracker.get(userId)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    uploadTracker.set(userId, { count: 1, windowStart: now })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Content-Type check — must be multipart/form-data for file uploads
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
  }

  // File size limit via Content-Length header (early rejection)
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'File size must be under 50MB' }, { status: 413 })
  }

  // Rate limit
  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 5 uploads per minute.' }, { status: 429 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const projectId = formData.get('projectId') as string | null

  if (!file || !projectId) {
    return NextResponse.json({ error: 'Missing file or projectId' }, { status: 400 })
  }

  const isDxf = file.name.toLowerCase().endsWith('.dxf')
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  if (!isPdf && !isDxf) {
    return NextResponse.json({ error: 'Only PDF and DXF files are supported' }, { status: 400 })
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'File size must be under 50MB' }, { status: 400 })
  }

  const storagePath = `${user.id}/${projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const buffer = await file.arrayBuffer()

  const contentTypeMime = isDxf ? 'application/octet-stream' : 'application/pdf'
  const { error: uploadError } = await supabase.storage
    .from('drawings')
    .upload(storagePath, buffer, {
      contentType: contentTypeMime,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  return NextResponse.json({
    storagePath,
    originalFilename: file.name,
    fileSizeBytes: file.size,
    fileType: isDxf ? 'dxf' : 'pdf',
  })
}
