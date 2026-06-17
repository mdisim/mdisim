import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

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
  if (contentLength && parseInt(contentLength, 10) > 100 * 1024 * 1024) {
    return NextResponse.json({ error: 'File size must be under 100MB' }, { status: 413 })
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

  if (file.size > 100 * 1024 * 1024) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    console.error(`[Upload] Rejected: ${file.name} (${sizeMB} MB) exceeds 100 MB limit`)
    return NextResponse.json({ error: `File size ${sizeMB} MB exceeds the 100 MB limit` }, { status: 413 })
  }

  console.log(`[Upload] Processing: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB, ${file.type})`)

  const storagePath = `${user.id}/${projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const buffer = await file.arrayBuffer()

  const contentTypeMime = isDxf ? 'application/octet-stream' : 'application/pdf'
  let { error: uploadError } = await supabase.storage
    .from('drawings')
    .upload(storagePath, buffer, {
      contentType: contentTypeMime,
      upsert: false,
    })

  // If bucket not found, create it then retry once
  if (uploadError && (uploadError.message.includes('Bucket not found') || uploadError.message.includes('bucket') || uploadError.message.includes('not found'))) {
    const { error: bucketErr } = await supabase.storage.createBucket('drawings', {
      public: false,
      fileSizeLimit: 104857600, // 100 MB
      allowedMimeTypes: ['application/pdf', 'application/octet-stream', 'image/jpeg', 'image/png'],
    })
    if (!bucketErr || bucketErr.message.includes('already exists')) {
      const { error: retryErr } = await supabase.storage
        .from('drawings')
        .upload(storagePath, buffer, { contentType: contentTypeMime, upsert: false })
      uploadError = retryErr ?? null
    }
  }

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
