'use client'

import { createClient } from '@/lib/supabase/client'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

export interface UploadProgress {
  phase: 'validating' | 'uploading' | 'done' | 'error'
  percent: number
  message: string
  bytesUploaded?: number
  bytesTotal?: number
}

export function validateFileSize(file: File | Blob, maxBytes = MAX_FILE_SIZE): string | null {
  if (file.size > maxBytes) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    const limitMB = (maxBytes / (1024 * 1024)).toFixed(0)
    return `File size ${sizeMB} MB exceeds the ${limitMB} MB limit`
  }
  return null
}

export async function uploadToStorage(
  bucket: string,
  path: string,
  data: Blob | ArrayBuffer | Uint8Array,
  contentType: string,
  onProgress?: (p: UploadProgress) => void,
): Promise<{ path: string } | { error: string }> {
  const size = data instanceof Blob ? data.size : data.byteLength
  const sizeMB = (size / (1024 * 1024)).toFixed(1)

  console.log(`[Upload] Starting: ${path} (${sizeMB} MB, ${contentType})`)

  onProgress?.({ phase: 'validating', percent: 0, message: `Validating ${sizeMB} MB…` })

  if (size > MAX_FILE_SIZE) {
    const msg = `File size ${sizeMB} MB exceeds ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)} MB limit`
    onProgress?.({ phase: 'error', percent: 0, message: msg })
    return { error: msg }
  }

  onProgress?.({ phase: 'uploading', percent: 10, message: `Uploading ${sizeMB} MB…`, bytesTotal: size, bytesUploaded: 0 })

  try {
    const supabase = createClient()

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, data, { contentType, upsert: true })

    if (error) {
      // If bucket doesn't exist, try to create it
      if (error.message.includes('not found') || error.message.includes('Bucket')) {
        console.log(`[Upload] Bucket "${bucket}" not found, creating…`)
        await supabase.storage.createBucket(bucket, {
          public: false,
          fileSizeLimit: MAX_FILE_SIZE,
        })
        const { error: retryErr } = await supabase.storage
          .from(bucket)
          .upload(path, data, { contentType, upsert: true })
        if (retryErr) {
          onProgress?.({ phase: 'error', percent: 0, message: retryErr.message })
          return { error: retryErr.message }
        }
      } else {
        onProgress?.({ phase: 'error', percent: 0, message: error.message })
        return { error: error.message }
      }
    }

    console.log(`[Upload] Complete: ${path} (${sizeMB} MB)`)
    onProgress?.({ phase: 'done', percent: 100, message: 'Upload complete', bytesTotal: size, bytesUploaded: size })
    return { path }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Upload] Failed: ${msg}`)
    onProgress?.({ phase: 'error', percent: 0, message: msg })
    return { error: msg }
  }
}

export async function uploadExtractionPage(
  projectId: string,
  drawingId: string,
  pageNumber: number,
  dataUrl: string,
  width: number,
  height: number,
  onProgress?: (p: UploadProgress) => void,
): Promise<{ path: string } | { error: string }> {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  const sizeMB = (bytes.length / (1024 * 1024)).toFixed(1)
  console.log(`[Upload] Extraction page ${pageNumber}: ${sizeMB} MB (${width}×${height}px)`)

  const path = `extractions/${projectId}/${drawingId}/page_${pageNumber}.jpg`

  return uploadToStorage('drawings', path, bytes, 'image/jpeg', onProgress)
}
