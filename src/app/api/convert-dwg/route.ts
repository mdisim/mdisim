import { createClient } from '@/lib/supabase/server'
import { execFile } from 'child_process'
import { writeFile, readFile, unlink, mkdtemp, rmdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const CONVERT_SCRIPT = `
import sys, os

input_path = sys.argv[1]
output_path = sys.argv[2]

# Try ODA File Converter via ezdxf first (handles real DWG)
try:
    from ezdxf.addons import odafc
    doc = odafc.readfile(input_path)
    doc.saveas(output_path)
    print("OK:odafc")
    sys.exit(0)
except Exception as e:
    oda_err = str(e)

# Fallback: try ezdxf.readfile (works if file is actually DXF-format despite .dwg extension)
try:
    import ezdxf
    doc = ezdxf.readfile(input_path)
    doc.saveas(output_path)
    print("OK:ezdxf-direct")
    sys.exit(0)
except Exception as e:
    dxf_err = str(e)

# Fallback: try ezdxf.recover (handles corrupted/non-standard DXF)
try:
    from ezdxf import recover
    doc, auditor = recover.readfile(input_path)
    doc.saveas(output_path)
    print("OK:ezdxf-recover")
    sys.exit(0)
except Exception as e:
    recover_err = str(e)

print(f"FAIL: ODA={oda_err} | ezdxf={dxf_err} | recover={recover_err}", file=sys.stderr)
sys.exit(1)
`

function runPython(inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      'python3',
      ['-c', CONVERT_SCRIPT, inputPath, outputPath],
      { timeout: 120_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message))
        } else {
          resolve(stdout.trim())
        }
      }
    )
  })
}

export async function POST(request: Request) {
  const log: string[] = []

  try {
    const { filePath, projectId } = await request.json()
    log.push(`[1] Received: filePath="${filePath}", projectId="${projectId}"`)

    if (!filePath || !projectId) {
      return Response.json(
        { error: 'filePath and projectId are required', log },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    log.push('[2] Supabase client created (authenticated via cookies)')

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      log.push(`[2a] Auth failed: ${authError?.message ?? 'no user session'}`)
      return Response.json(
        { error: `Not authenticated: ${authError?.message ?? 'no session'}`, log },
        { status: 401 },
      )
    }
    log.push(`[2b] Authenticated as: ${user.email}`)

    const dxfPath = filePath.replace(/\.dwg$/i, '.dxf')
    log.push(`[3] DXF target path: "${dxfPath}"`)

    // Check if converted DXF already exists
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'))
    const dxfFileName = dxfPath.split('/').pop() ?? ''
    log.push(`[4] Checking for existing DXF: dir="${dirPath}", file="${dxfFileName}"`)

    const { data: existingList, error: listError } = await supabase.storage
      .from('qb-drawings')
      .list(dirPath, { search: dxfFileName })

    if (listError) {
      log.push(`[4a] List error: ${listError.message}`)
    } else {
      log.push(`[4b] Found ${existingList?.length ?? 0} files matching search`)
    }

    if (existingList?.some((f) => f.name === dxfFileName)) {
      log.push('[4c] Converted DXF already exists — returning cached path')
      return Response.json({ dxfPath, log, cached: true })
    }

    // Download the DWG file
    log.push(`[5] Downloading DWG from storage: "${filePath}"`)
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('qb-drawings')
      .download(filePath)

    if (downloadError || !downloadData) {
      log.push(`[5a] Download failed: ${downloadError?.message ?? 'no data returned'}`)

      log.push('[5b] Trying signed URL fallback...')
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('qb-drawings')
        .createSignedUrl(filePath, 300)

      if (urlError || !signedUrlData?.signedUrl) {
        log.push(`[5c] Signed URL also failed: ${urlError?.message ?? 'no URL'}`)

        const { data: bucketFiles, error: bucketErr } = await supabase.storage
          .from('qb-drawings')
          .list(dirPath)
        if (bucketErr) {
          log.push(`[5d] Cannot list bucket dir "${dirPath}": ${bucketErr.message}`)
        } else {
          const fileNames = bucketFiles?.map(f => f.name).join(', ') ?? 'empty'
          log.push(`[5d] Files in "${dirPath}": [${fileNames}]`)
        }

        return Response.json(
          { error: 'Failed to download DWG file from storage', log },
          { status: 500 },
        )
      }

      log.push('[5e] Got signed URL, fetching...')
      const dwgResponse = await fetch(signedUrlData.signedUrl)
      if (!dwgResponse.ok) {
        log.push(`[5f] Fetch from signed URL failed: HTTP ${dwgResponse.status}`)
        return Response.json(
          { error: `Failed to fetch DWG: HTTP ${dwgResponse.status}`, log },
          { status: 500 },
        )
      }

      const dwgBuffer = Buffer.from(await dwgResponse.arrayBuffer())
      log.push(`[5g] Downloaded via signed URL: ${dwgBuffer.length} bytes`)

      return await convertAndUpload(supabase, dwgBuffer, dxfPath, log)
    }

    const dwgBuffer = Buffer.from(await downloadData.arrayBuffer())
    log.push(`[5a] Downloaded: ${dwgBuffer.length} bytes`)

    return await convertAndUpload(supabase, dwgBuffer, dxfPath, log)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    log.push(`[ERROR] Uncaught: ${msg}`)
    console.error('[convert-dwg]', log.join('\n'))
    return Response.json(
      { error: msg, log },
      { status: 500 },
    )
  }
}

async function convertAndUpload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dwgBuffer: Buffer,
  dxfPath: string,
  log: string[],
): Promise<Response> {
  const tempDir = await mkdtemp(join(tmpdir(), 'dwg-convert-'))
  const inputPath = join(tempDir, 'input.dwg')
  const outputPath = join(tempDir, 'output.dxf')
  log.push(`[6] Temp dir: ${tempDir}`)

  try {
    await writeFile(inputPath, dwgBuffer)
    log.push(`[7] Wrote DWG to disk: ${dwgBuffer.length} bytes`)

    log.push('[8] Starting Python conversion (ODA → ezdxf → recover)...')
    const pyResult = await runPython(inputPath, outputPath)
    log.push(`[8a] Python result: "${pyResult}"`)

    const dxfBuffer = await readFile(outputPath)
    log.push(`[9] Read converted DXF: ${dxfBuffer.length} bytes`)

    log.push(`[10] Uploading DXF to storage: "${dxfPath}"`)
    const { error: uploadError } = await supabase.storage
      .from('qb-drawings')
      .upload(dxfPath, dxfBuffer, {
        contentType: 'application/dxf',
        upsert: true,
      })

    if (uploadError) {
      log.push(`[10a] Upload failed: ${uploadError.message}`)
      return Response.json(
        { error: `Failed to upload converted file: ${uploadError.message}`, log },
        { status: 500 },
      )
    }

    log.push('[11] DXF uploaded successfully')
    console.log('[convert-dwg] Success:', log.join(' | '))
    return Response.json({ dxfPath, log, cached: false })
  } finally {
    await unlink(inputPath).catch(() => {})
    await unlink(outputPath).catch(() => {})
    await rmdir(tempDir).catch(() => {})
  }
}
