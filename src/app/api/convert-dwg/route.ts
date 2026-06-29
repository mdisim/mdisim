import { createClient } from '@supabase/supabase-js'
import { execFile } from 'child_process'
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function runPython(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      'python3',
      [
        '-c',
        'import sys, ezdxf; doc = ezdxf.readfile(sys.argv[1]); doc.saveas(sys.argv[2])',
        inputPath,
        outputPath,
      ],
      { timeout: 60_000 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message))
        } else {
          resolve()
        }
      }
    )
  })
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase()
    const { filePath, projectId } = await request.json()

    if (!filePath || !projectId) {
      return Response.json(
        { error: 'filePath and projectId are required' },
        { status: 400 }
      )
    }

    // Build the DXF path
    const dxfPath = filePath.replace(/\.dwg$/i, '.dxf')

    // Check if converted DXF already exists
    const dxfFileName = dxfPath.split('/').pop() ?? ''
    const { data: existingList } = await supabase.storage
      .from('qb-drawings')
      .list(projectId, {
        search: dxfFileName,
      })

    if (existingList?.some((f) => f.name === dxfFileName)) {
      return Response.json({ dxfPath })
    }

    // Download the DWG file
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('qb-drawings')
      .createSignedUrl(filePath, 300)

    if (urlError || !signedUrlData?.signedUrl) {
      return Response.json(
        { error: 'Failed to get download URL for DWG file' },
        { status: 500 }
      )
    }

    const dwgResponse = await fetch(signedUrlData.signedUrl)
    if (!dwgResponse.ok) {
      return Response.json(
        { error: 'Failed to download DWG file' },
        { status: 500 }
      )
    }

    const dwgBuffer = Buffer.from(await dwgResponse.arrayBuffer())

    // Write to temp, convert, read result
    const tempDir = await mkdtemp(join(tmpdir(), 'dwg-convert-'))
    const inputPath = join(tempDir, 'input.dwg')
    const outputPath = join(tempDir, 'output.dxf')

    try {
      await writeFile(inputPath, dwgBuffer)
      await runPython(inputPath, outputPath)

      const dxfBuffer = await readFile(outputPath)

      // Upload converted DXF
      const { error: uploadError } = await supabase.storage
        .from('qb-drawings')
        .upload(dxfPath, dxfBuffer, {
          contentType: 'application/dxf',
          upsert: true,
        })

      if (uploadError) {
        return Response.json(
          { error: `Failed to upload converted file: ${uploadError.message}` },
          { status: 500 }
        )
      }

      return Response.json({ dxfPath })
    } finally {
      // Cleanup temp files
      await unlink(inputPath).catch(() => {})
      await unlink(outputPath).catch(() => {})
    }
  } catch (e) {
    console.error('[convert-dwg] Error:', e)
    return Response.json(
      { error: e instanceof Error ? e.message : 'Conversion failed' },
      { status: 500 }
    )
  }
}
