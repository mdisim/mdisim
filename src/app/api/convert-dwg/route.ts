import { createClient } from '@/lib/supabase/server'
import { writeFile, readFile, unlink, mkdtemp, rmdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFile } from 'child_process'
import { pathToFileURL } from 'url'

async function convertWithWasm(dwgBuffer: Buffer): Promise<Buffer> {
  const { convertDwgToDxf } = await import('dwgdxf')
  const wasmBase = pathToFileURL(
    join(process.cwd(), 'node_modules/dwgdxf/dist/wasm')
  ).href + '/'
  const dxfBytes = await convertDwgToDxf(new Uint8Array(dwgBuffer), { wasmBase })
  return Buffer.from(dxfBytes)
}

function convertWithEzdxf(inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const script = `
import sys, ezdxf
from ezdxf import recover
inp, out = sys.argv[1], sys.argv[2]
try:
    doc = ezdxf.readfile(inp)
    doc.saveas(out)
    print("OK:ezdxf")
except Exception:
    doc, _ = recover.readfile(inp)
    doc.saveas(out)
    print("OK:recover")
`
    execFile(
      'python3', ['-c', script, inputPath, outputPath],
      { timeout: 60_000 },
      (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message))
        else resolve(stdout.trim())
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
    log.push('[2] Supabase client created')

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
    log.push(`[3] DXF target: "${dxfPath}"`)

    // Check cache
    const dirPath = filePath.substring(0, filePath.lastIndexOf('/'))
    const dxfFileName = dxfPath.split('/').pop() ?? ''

    const { data: existingList } = await supabase.storage
      .from('qb-drawings')
      .list(dirPath, { search: dxfFileName })

    if (existingList?.some((f) => f.name === dxfFileName)) {
      log.push('[4] Converted DXF already exists (cached)')
      return Response.json({ dxfPath, log, cached: true })
    }
    log.push('[4] No cached DXF found')

    // Download the DWG
    log.push(`[5] Downloading DWG: "${filePath}"`)
    let dwgBuffer: Buffer

    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('qb-drawings')
      .download(filePath)

    if (downloadError || !downloadData) {
      log.push(`[5a] Direct download failed: ${downloadError?.message ?? 'no data'}`)
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('qb-drawings')
        .createSignedUrl(filePath, 300)

      if (urlError || !signedUrlData?.signedUrl) {
        log.push(`[5b] Signed URL failed: ${urlError?.message ?? 'no URL'}`)
        const { data: bucketFiles } = await supabase.storage
          .from('qb-drawings').list(dirPath)
        const names = bucketFiles?.map(f => f.name).join(', ') ?? 'empty'
        log.push(`[5c] Files in "${dirPath}": [${names}]`)
        return Response.json(
          { error: 'Failed to download DWG file from storage', log },
          { status: 500 },
        )
      }

      const resp = await fetch(signedUrlData.signedUrl)
      if (!resp.ok) {
        log.push(`[5d] Fetch failed: HTTP ${resp.status}`)
        return Response.json(
          { error: `Failed to fetch DWG: HTTP ${resp.status}`, log },
          { status: 500 },
        )
      }
      dwgBuffer = Buffer.from(await resp.arrayBuffer())
      log.push(`[5e] Downloaded via signed URL: ${dwgBuffer.length} bytes`)
    } else {
      dwgBuffer = Buffer.from(await downloadData.arrayBuffer())
      log.push(`[5a] Downloaded: ${dwgBuffer.length} bytes`)
    }

    // Detect format: real DWG starts with "AC10xx", DXF starts with "0\n" or whitespace
    const header = dwgBuffer.slice(0, 6).toString('ascii')
    const isDwgBinary = /^AC\d{4}$/.test(header)
    log.push(`[6] File header: "${header}" → ${isDwgBinary ? 'binary DWG' : 'DXF-format'}`)

    let dxfBuffer: Buffer

    if (isDwgBinary) {
      // Method 1: WASM-based converter (handles real DWG binary files)
      log.push('[7] Converting with dwgdxf WASM (ACadSharp)...')
      try {
        dxfBuffer = await convertWithWasm(dwgBuffer)
        log.push(`[7a] WASM conversion OK: ${dxfBuffer.length} bytes`)
      } catch (wasmErr) {
        const wasmMsg = wasmErr instanceof Error ? wasmErr.message : String(wasmErr)
        log.push(`[7b] WASM failed: ${wasmMsg}`)

        // Method 2: Python ezdxf fallback (works for some DWG variants)
        log.push('[7c] Trying Python ezdxf fallback...')
        const tempDir = await mkdtemp(join(tmpdir(), 'dwg-'))
        const inp = join(tempDir, 'input.dwg')
        const out = join(tempDir, 'output.dxf')
        try {
          await writeFile(inp, dwgBuffer)
          const result = await convertWithEzdxf(inp, out)
          dxfBuffer = await readFile(out)
          log.push(`[7d] Python fallback OK (${result}): ${dxfBuffer.length} bytes`)
        } catch (pyErr) {
          const pyMsg = pyErr instanceof Error ? pyErr.message : String(pyErr)
          log.push(`[7e] Python also failed: ${pyMsg}`)
          return Response.json(
            { error: 'DWG conversion failed. This DWG version may not be supported. Try exporting as DXF from your CAD software.', log },
            { status: 500 },
          )
        } finally {
          await unlink(inp).catch(() => {})
          await unlink(out).catch(() => {})
          await rmdir(tempDir).catch(() => {})
        }
      }
    } else {
      // File is DXF-format (just renamed to .dwg) — pass through ezdxf to validate/normalize
      log.push('[7] File is DXF-format, normalizing with ezdxf...')
      const tempDir = await mkdtemp(join(tmpdir(), 'dwg-'))
      const inp = join(tempDir, 'input.dwg')
      const out = join(tempDir, 'output.dxf')
      try {
        await writeFile(inp, dwgBuffer)
        const result = await convertWithEzdxf(inp, out)
        dxfBuffer = await readFile(out)
        log.push(`[7a] Normalized OK (${result}): ${dxfBuffer.length} bytes`)
      } catch (pyErr) {
        // DXF-format file that ezdxf can't parse — try WASM as last resort
        log.push(`[7b] ezdxf failed, trying WASM...`)
        try {
          dxfBuffer = await convertWithWasm(dwgBuffer)
          log.push(`[7c] WASM fallback OK: ${dxfBuffer.length} bytes`)
        } catch {
          const msg = pyErr instanceof Error ? pyErr.message : String(pyErr)
          log.push(`[7d] All methods failed: ${msg}`)
          return Response.json(
            { error: 'Failed to parse this file. It may be corrupted.', log },
            { status: 500 },
          )
        }
      } finally {
        await unlink(inp).catch(() => {})
        await unlink(out).catch(() => {})
        await rmdir(tempDir).catch(() => {})
      }
    }

    // Upload converted DXF
    log.push(`[8] Uploading DXF: "${dxfPath}" (${dxfBuffer.length} bytes)`)
    const { error: uploadError } = await supabase.storage
      .from('qb-drawings')
      .upload(dxfPath, dxfBuffer, {
        contentType: 'application/dxf',
        upsert: true,
      })

    if (uploadError) {
      log.push(`[8a] Upload failed: ${uploadError.message}`)
      return Response.json(
        { error: `Failed to upload converted file: ${uploadError.message}`, log },
        { status: 500 },
      )
    }

    log.push('[9] DXF uploaded successfully')
    console.log('[convert-dwg] Success:', log.join(' | '))
    return Response.json({ dxfPath, log, cached: false })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    log.push(`[ERROR] ${msg}`)
    console.error('[convert-dwg]', log.join('\n'))
    return Response.json({ error: msg, log }, { status: 500 })
  }
}
