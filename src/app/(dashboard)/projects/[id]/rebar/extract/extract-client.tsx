'use client'

import { useState, useTransition } from 'react'
import { FileText, Zap, Check, AlertCircle, Trash2, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/use-translation'
import { createRebarElement, createRebarBar, saveExtractionPageMeta } from '@/app/actions/rebar'
import { calloutToBarDraft, type DetectedElement, type RebarCallout } from '@/lib/rebar-extractor'
import { REBAR_DIAMETERS } from '@/lib/rebar-calc'
import { ShapeCodeSVG } from '../[elementId]/shape-code-svg'
import { normalizeOCRText, scoreCallout } from '@/lib/ocr-normalize'
import { AnnotatedViewer, exportAnnotatedCanvas, type PageRender, type AnnotatedCallout } from './annotated-viewer'
import { buildSinglePageImagePDF } from '@/lib/build-pdf'

interface Drawing {
  id: string
  name: string
  file_type: string
  page_count: number
}

interface Props {
  projectId: string
  drawings: Drawing[]
}

type Status = 'idle' | 'extracting' | 'review' | 'saving' | 'done' | 'error'

const SHAPE_CODES = ['00', '11', '21', '31', '41', '51', '60', '99'] as const
const ELEMENT_TYPES = ['beam', 'column', 'slab', 'footing', 'wall', 'stair', 'pile', 'raft', 'other'] as const

interface EditableBar {
  id: string
  bar_mark: string
  diameter_mm: number
  shape_code: string
  bending_dims: Record<string, number>
  quantity: number
  notes: string
  keep: boolean
  confidence: number          // 0–100 per-bar OCR confidence
  confidenceReasons: string[] // why confidence was reduced
  ocr_bbox?: { x0: number; y0: number; x1: number; y1: number; canvasW: number; canvasH: number; page: number } | null
}

interface EditableElement {
  id: string
  elementType: string
  elementMark: string
  floorLevel: string
  sourceLayer?: string
  sourcePage?: number
  bars: EditableBar[]
  keep: boolean
  expanded: boolean
}

interface DebugState {
  lines: string[]
  pdfChars: number
  ocrChars: number
  ocrConfidence: number
  ocrPreview: string
  calloutCount: number
  usedOCR: boolean
  matchedLines: MatchedLine[]
}

function makeId() { return Math.random().toString(36).slice(2) }

function elementToEditable(el: DetectedElement, threshold = 60): EditableElement {
  const bars = el.callouts.map((c: RebarCallout, i: number) => {
    const draft = calloutToBarDraft(c, i)
    // Default confidence 100 for non-OCR (native text / DXF) callouts
    const conf = (c as RebarCallout & { confidence?: number; confidenceReasons?: string[] }).confidence ?? 100
    const reasons = (c as RebarCallout & { confidence?: number; confidenceReasons?: string[] }).confidenceReasons ?? []
    return {
      ...draft,
      id: makeId(),
      bending_dims: draft.bending_dims as Record<string, number>,
      confidence: conf,
      confidenceReasons: reasons,
      keep: conf >= threshold, // auto-exclude low-confidence bars
    }
  })
  return {
    id: makeId(),
    elementType: el.elementType,
    elementMark: el.elementMark,
    floorLevel: el.floorLevel,
    sourceLayer: el.sourceLayer,
    sourcePage: el.sourcePage,
    bars,
    keep: true,
    expanded: true,
  }
}

// ─── Image pipeline ────────────────────────────────────────────────────────────

// Render PDF page to canvas at high resolution
async function renderPageToCanvas(
  pdfPage: Awaited<ReturnType<import('pdfjs-dist').PDFDocumentProxy['getPage']>>,
  scale = 4.0   // 4× = ~300 dpi for A1 structural drawings
): Promise<HTMLCanvasElement> {
  const viewport = pdfPage.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext('2d')!
  // White background before rendering (some PDFs have transparent bg → black on black)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await pdfPage.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof pdfPage.render>[0]).promise
  return canvas
}

// Grayscale + contrast boost to improve OCR on engineering drawings
// Converts to grayscale, stretches contrast, applies mild sharpening
function preprocessForOCR(src: HTMLCanvasElement): HTMLCanvasElement {
  const dst = document.createElement('canvas')
  dst.width = src.width
  dst.height = src.height
  const ctx = dst.getContext('2d')!

  ctx.drawImage(src, 0, 0)
  const img = ctx.getImageData(0, 0, dst.width, dst.height)
  const d = img.data

  // Find luminance range for contrast stretching
  let minL = 255, maxL = 0
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]
    if (l < minL) minL = l
    if (l > maxL) maxL = l
  }
  const range = Math.max(maxL - minL, 1)

  for (let i = 0; i < d.length; i += 4) {
    // Grayscale luminance
    const l = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]
    // Stretch contrast to full 0–255 range, then apply gamma to darken text
    const stretched = Math.min(255, Math.max(0, ((l - minL) / range) * 255))
    // Binarise-friendly: push midtones toward white/black (S-curve)
    const g = stretched < 128
      ? Math.max(0, stretched * 0.75)           // darken dark pixels (ink)
      : Math.min(255, 255 - (255 - stretched) * 0.4) // lighten light pixels (paper)
    d[i] = d[i+1] = d[i+2] = g
    // alpha unchanged
  }

  ctx.putImageData(img, 0, 0)
  return dst
}

interface MatchedLine {
  line: string
  normalized: string
  matches: string[]
  page: number
}

export function ExtractClient({ projectId, drawings }: Props) {
  const { t } = useTranslation()
  const [selectedDrawingId, setSelectedDrawingId] = useState(drawings[0]?.id ?? '')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [elements, setElements] = useState<EditableElement[]>([])
  const [savedCount, setSavedCount] = useState(0)
  const [saveDiagnostics, setSaveDiagnostics] = useState<{
    detected: number; selected: number; saved: number
    elementsCreated: number; elementsSkipped: number
    drawingId: string; errors: string[]
  } | null>(null)
  const [debug, setDebug] = useState<DebugState>({
    lines: [], pdfChars: 0, ocrChars: 0, ocrConfidence: 0,
    ocrPreview: '', calloutCount: 0, usedOCR: false, matchedLines: [],
  })
  const [confidenceThreshold, setConfidenceThreshold] = useState(60)
  const [pageRenders, setPageRenders] = useState<PageRender[]>([])
  const [annotatedCallouts, setAnnotatedCallouts] = useState<AnnotatedCallout[]>([])
  const [activeRaw, setActiveRaw] = useState<string | null>(null)
  const [labelOffsets, setLabelOffsets] = useState<Record<string, { dx: number; dy: number }>>({})
  const [showDrawingView, setShowDrawingView] = useState(false)
  const [, startTransition] = useTransition()

  function dbg(msg: string) {
    console.log('[RebarExtract]', msg)
    setDebug(d => ({ ...d, lines: [...d.lines, msg] }))
  }

  async function extractPDFClientSide(signedUrl: string): Promise<DetectedElement[]> {
    setDebug({ lines: [], pdfChars: 0, ocrChars: 0, ocrConfidence: 0, ocrPreview: '', calloutCount: 0, usedOCR: false, matchedLines: [] })
    setPageRenders([])
    setAnnotatedCallouts([])
    setActiveRaw(null)
    setLabelOffsets({})
    dbg('Loading PDF.js…')

    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
    GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

    const res = await fetch(signedUrl)
    if (!res.ok) throw new Error(`Could not fetch PDF: ${res.status}`)
    const buffer = await res.arrayBuffer()
    dbg(`PDF fetched — ${(buffer.byteLength / 1024).toFixed(1)} KB`)

    const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise
    dbg(`PDF opened — ${pdf.numPages} page(s)`)

    // ── Step 1: try native text layer ──────────────────────────────────────
    const pageTexts: Array<{ text: string; page: number }> = []
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)
      const content = await page.getTextContent()
      const strings = content.items.map(item => ('str' in item ? (item as { str: string }).str : ''))
      const text = strings.join('\n')
      pageTexts.push({ text, page: p })
      dbg(`Page ${p}: ${strings.length} text items, ${text.length} chars`)
    }

    const totalPdfChars = pageTexts.reduce((s, p) => s + p.text.length, 0)
    setDebug(d => ({ ...d, pdfChars: totalPdfChars }))
    dbg(`Native text layer: ${totalPdfChars} total chars`)

    const { extractFromPageText, parseRebarText } = await import('@/lib/rebar-extractor')

    // If we got text, try regex first
    if (totalPdfChars > 50) {
      let rawCount = 0
      for (const { text } of pageTexts) {
        const c = parseRebarText(text)
        rawCount += c.length
        if (c.length > 0) dbg(`  ✓ Page regex: ${c.slice(0, 5).map(x => x.raw).join(', ')}`)
      }
      dbg(`Native text regex matches: ${rawCount}`)
      if (rawCount > 0) {
        const elems = extractFromPageText(pageTexts)
        const total = elems.flatMap(e => e.callouts).length
        setDebug(d => ({ ...d, calloutCount: total, usedOCR: false }))
        dbg(`Done (native text): ${elems.length} elements, ${total} bars`)
        return elems
      }
      dbg('Native text found but 0 rebar matches — falling through to OCR')
    } else {
      dbg('No native text layer detected — switching to OCR')
    }

    // ── Step 2: OCR fallback via Tesseract.js ──────────────────────────────
    dbg('Loading Tesseract.js (eng)…')
    const { createWorker } = await import('tesseract.js')

    const worker = await createWorker('eng', 1, {
      langPath: '/tesseract',  // bundled — no CDN call needed
      logger: (m: { status: string; progress?: number }) => {
        if (m.status === 'loading tesseract core') dbg('OCR: loading core…')
        else if (m.status === 'loading language traineddata') dbg('OCR: loading language data (bundled)…')
        else if (m.status === 'initialized api') dbg('OCR: engine ready')
        else if (m.status === 'recognizing text') {
          const pct = Math.round((m.progress ?? 0) * 100)
          if (pct % 20 === 0) dbg(`OCR: ${pct}%…`)
        }
      },
    })

    // PSM 11 = sparse text — best for drawings with scattered annotations
    // No char whitelist: it blocks Ø which the model doesn't know. Instead we
    // normalise O/0/D → Ø in post-processing (normalizeOCRText).
    await worker.setParameters({
      tessedit_pageseg_mode: '11' as Parameters<typeof worker.setParameters>[0]['tessedit_pageseg_mode'],
      preserve_interword_spaces: '1',
    })

    const allOcrTexts: Array<{ text: string; page: number }> = []
    let totalOcrChars = 0
    let sumConfidence = 0
    const allMatchedLines: MatchedLine[] = []
    const scoreMap = new Map<string, { confidence: number; confidenceReasons: string[] }>()
    // Drawing annotation state accumulated across pages
    const localPageRenders: PageRender[] = []
    const localAnnotatedCallouts: AnnotatedCallout[] = []
    type TLine = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }

    for (let p = 1; p <= pdf.numPages; p++) {
      dbg(`Rendering page ${p} at 4× scale…`)
      const page = await pdf.getPage(p)

      // 4× scale ≈ 300 dpi for A1 drawing
      const rawCanvas = await renderPageToCanvas(page, 4.0)
      dbg(`  canvas: ${rawCanvas.width}×${rawCanvas.height}px`)

      // Grayscale + contrast stretch
      const processedCanvas = preprocessForOCR(rawCanvas)
      dbg(`  preprocessing done — running OCR…`)

      const { data } = await worker.recognize(processedCanvas)

      // Store page render for annotated drawing overlay
      localPageRenders.push({
        page: p,
        dataUrl: processedCanvas.toDataURL('image/jpeg', 0.82),
        width: processedCanvas.width,
        height: processedCanvas.height,
      })

      const rawOCR = data.text ?? ''
      const ocrText = normalizeOCRText(rawOCR)

      // Collect Tesseract line bboxes for annotation overlay
      const tLines = (data as { lines?: TLine[] }).lines ?? []
      for (const tl of tLines) {
        const normLineText = normalizeOCRText(tl.text ?? '')
        const lineCallouts = parseRebarText(normLineText)
        for (const c of lineCallouts) {
          localAnnotatedCallouts.push({
            raw: c.raw,
            count: c.count,
            diameterMm: c.diameterMm,
            spacingMm: c.spacingMm,
            cutLengthMm: c.cutLengthMm,
            confidence: 100, // updated from scoreMap after full loop
            page: p,
            x0: tl.bbox.x0, y0: tl.bbox.y0,
            x1: tl.bbox.x1, y1: tl.bbox.y1,
            canvasW: processedCanvas.width,
            canvasH: processedCanvas.height,
          })
        }
      }
      const confidence = data.confidence ?? 0
      sumConfidence += confidence
      totalOcrChars += ocrText.length

      dbg(`Page ${p}: ${ocrText.length} chars, confidence ${confidence.toFixed(0)}%`)
      console.log(`[OCR raw p${p}]:\n${rawOCR.slice(0, 3000)}`)
      console.log(`[OCR normalized p${p}]:\n${ocrText.slice(0, 3000)}`)

      // Collect per-line matches, score each callout, and populate scoreMap
      const rawLines = rawOCR.split('\n')
      const normLines = ocrText.split('\n')
      for (let li = 0; li < normLines.length; li++) {
        const line = normLines[li]
        if (!line.trim()) continue
        const callouts = parseRebarText(line)
        if (callouts.length > 0) {
          const rawLine = rawLines[li] ?? line
          allMatchedLines.push({
            line: rawLine.trim(),
            normalized: line.trim(),
            matches: callouts.map(c => c.raw),
            page: p,
          })
          for (const c of callouts) {
            const scored = scoreCallout(c, rawLine)
            // Keep the worst score if same raw string appears multiple times
            const existing = scoreMap.get(c.raw)
            if (!existing || scored.confidence < existing.confidence) {
              scoreMap.set(c.raw, { confidence: scored.confidence, confidenceReasons: scored.confidenceReasons })
            }
          }
        }
      }

      allOcrTexts.push({ text: ocrText, page: p })
    }

    await worker.terminate()

    // Attach per-callout confidence from scoreMap to annotated callouts
    const scoredAnnotated = localAnnotatedCallouts.map(ac => ({
      ...ac,
      confidence: scoreMap.get(ac.raw)?.confidence ?? 100,
    }))
    setPageRenders(localPageRenders)
    setAnnotatedCallouts(scoredAnnotated)

    const avgConfidence = allOcrTexts.length > 0 ? sumConfidence / allOcrTexts.length : 0
    const ocrPreview = allOcrTexts.map(pt => pt.text).join('\n').slice(0, 500)

    setDebug(d => ({
      ...d,
      ocrChars: totalOcrChars,
      ocrConfidence: avgConfidence,
      ocrPreview,
      usedOCR: true,
      matchedLines: allMatchedLines,
    }))

    let ocrMatchCount = 0
    for (const { text } of allOcrTexts) {
      const c = parseRebarText(text)
      ocrMatchCount += c.length
    }
    dbg(`OCR complete: ${totalOcrChars} chars, confidence ${avgConfidence.toFixed(0)}%, ${ocrMatchCount} regex matches`)
    if (allMatchedLines.length > 0) {
      dbg(`  ✓ Matched lines: ${allMatchedLines.slice(0, 6).map(l => l.normalized).join(' | ')}`)
    }

    const elems = extractFromPageText(allOcrTexts)
    // Attach per-callout confidence scores from the scoreMap
    for (const el of elems) {
      for (const c of el.callouts) {
        const sc = scoreMap.get(c.raw)
        if (sc) {
          (c as RebarCallout & { confidence: number; confidenceReasons: string[] }).confidence = sc.confidence;
          (c as RebarCallout & { confidence: number; confidenceReasons: string[] }).confidenceReasons = sc.confidenceReasons
        }
      }
    }
    const totalBars = elems.flatMap(e => e.callouts).length
    setDebug(d => ({ ...d, calloutCount: totalBars }))
    dbg(`Done: ${elems.length} elements, ${totalBars} bars`)

    return elems
  }

  async function handleExtract() {
    if (!selectedDrawingId) return
    setStatus('extracting')
    setErrorMsg('')

    try {
      const res = await fetch('/api/rebar/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawingId: selectedDrawingId }),
      })
      const json = await res.json() as {
        elements?: DetectedElement[]
        error?: string
        requiresClientExtraction?: boolean
        signedUrl?: string
      }
      if (!res.ok || json.error) {
        setErrorMsg(json.error ?? 'Extraction failed')
        setStatus('error')
        return
      }

      let detectedElements: DetectedElement[] = []
      if (json.requiresClientExtraction && json.signedUrl) {
        detectedElements = await extractPDFClientSide(json.signedUrl)
      } else {
        detectedElements = json.elements ?? []
      }

      const editable = detectedElements.map(el => elementToEditable(el, confidenceThreshold))
      setElements(editable.length > 0 ? editable : [])
      setStatus(editable.length > 0 ? 'review' : 'error')
      if (editable.length === 0) {
        setErrorMsg(
          debug.usedOCR
            ? `OCR ran but found 0 rebar callouts (confidence: ${debug.ocrConfidence.toFixed(0)}%). Check the OCR preview below — the text may need different whitelist characters.`
            : 'No rebar callouts detected and OCR could not be attempted. Check the extraction log.'
        )
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  function toggleElement(id: string) {
    setElements(prev => prev.map(el => el.id === id ? { ...el, expanded: !el.expanded } : el))
  }
  function updateElement(id: string, field: keyof EditableElement, value: string | boolean) {
    setElements(prev => prev.map(el => el.id === id ? { ...el, [field]: value } : el))
  }
  function updateBar(elId: string, barId: string, field: string, value: string | number | boolean) {
    setElements(prev => prev.map(el => {
      if (el.id !== elId) return el
      return { ...el, bars: el.bars.map(b => b.id === barId ? { ...b, [field]: value } : b) }
    }))
  }
  function updateBarDim(elId: string, barId: string, key: string, value: number) {
    setElements(prev => prev.map(el => {
      if (el.id !== elId) return el
      return { ...el, bars: el.bars.map(b => b.id === barId ? { ...b, bending_dims: { ...b.bending_dims, [key]: value } } : b) }
    }))
  }
  function removeBar(elId: string, barId: string) {
    setElements(prev => prev.map(el => el.id === elId ? { ...el, bars: el.bars.filter(b => b.id !== barId) } : el))
  }
  function addBar(elId: string) {
    const newBar: EditableBar = {
      id: makeId(), bar_mark: 'A', diameter_mm: 12, shape_code: '00',
      bending_dims: { A: 0 }, quantity: 1, notes: '', keep: true,
      confidence: 100, confidenceReasons: [],
    }
    setElements(prev => prev.map(el => el.id === elId ? { ...el, bars: [...el.bars, newBar] } : el))
  }
  function handleSave() {
    startTransition(async () => {
      setStatus('saving')
      setErrorMsg('')
      const saveErrors: string[] = []
      let savedElements = 0
      let savedBars = 0
      let skippedEmptyElements = 0

      // ── Validation ──────────────────────────────────────────────────────
      const keptEls = elements.filter(e => e.keep)
      const allKeptBars = keptEls.flatMap(e => e.bars.filter(b => b.keep))
      dbg(`Save: ${keptEls.length} elements, ${allKeptBars.length} bars selected`)

      if (allKeptBars.length === 0) {
        setErrorMsg('No bars selected. Check at least one bar before saving.')
        setStatus('review')
        return
      }

      for (const bar of allKeptBars) {
        if (!bar.diameter_mm || bar.diameter_mm <= 0) {
          saveErrors.push(`Bar "${bar.bar_mark}": invalid diameter (${bar.diameter_mm})`)
        }
        if (!bar.quantity || bar.quantity <= 0) {
          saveErrors.push(`Bar "${bar.bar_mark}": invalid quantity (${bar.quantity})`)
        }
        const dimA = bar.bending_dims?.A
        if (dimA !== undefined && dimA < 0) {
          saveErrors.push(`Bar "${bar.bar_mark}": negative dimension A (${dimA})`)
        }
      }
      if (saveErrors.length > 0) {
        setErrorMsg(`Validation failed:\n${saveErrors.join('\n')}`)
        setStatus('review')
        return
      }

      // ── Upload page render images ───────────────────────────────────────
      if (pageRenders.length > 0 && selectedDrawingId) {
        const { uploadExtractionPage } = await import('@/lib/upload-client')
        for (const pr of pageRenders) {
          const sizeMB = (pr.dataUrl.length * 0.75 / (1024 * 1024)).toFixed(1)
          dbg(`Uploading page ${pr.page} render (≈${sizeMB} MB)…`)
          const result = await uploadExtractionPage(
            projectId, selectedDrawingId, pr.page,
            pr.dataUrl, pr.width, pr.height,
          )
          if ('error' in result) {
            dbg(`  ⚠ Upload failed: ${result.error}`)
            saveErrors.push(`Page ${pr.page} image upload: ${result.error}`)
            continue
          }
          await saveExtractionPageMeta({
            project_id: projectId,
            drawing_id: selectedDrawingId,
            page_number: pr.page,
            image_storage_path: result.path,
            width: pr.width,
            height: pr.height,
          })
          dbg(`  ✓ Page ${pr.page} saved`)
        }
      }

      // ── Build bbox lookup ───────────────────────────────────────────────
      const bboxByRaw = new Map<string, { x0: number; y0: number; x1: number; y1: number; canvasW: number; canvasH: number; page: number }>()
      for (const ac of annotatedCallouts) {
        if (!bboxByRaw.has(ac.raw)) {
          bboxByRaw.set(ac.raw, { x0: ac.x0, y0: ac.y0, x1: ac.x1, y1: ac.y1, canvasW: ac.canvasW, canvasH: ac.canvasH, page: ac.page })
        }
      }

      // ── Save elements and bars ──────────────────────────────────────────
      for (const el of keptEls) {
        const keptBarsForEl = el.bars.filter(b => b.keep)
        if (keptBarsForEl.length === 0) {
          dbg(`Skipping element "${el.elementMark}" — no selected bars`)
          skippedEmptyElements++
          continue
        }

        dbg(`Creating element "${el.elementMark}" (${el.elementType}) with ${keptBarsForEl.length} bars…`)
        const result = await createRebarElement({
          project_id: projectId,
          element_type: el.elementType,
          element_mark: el.elementMark,
          floor_level: el.floorLevel || null,
          source_drawing_id: selectedDrawingId || null,
          source_page: el.sourcePage ?? null,
        })

        if (result.error) {
          const msg = `Element "${el.elementMark}": ${result.error}`
          dbg(`  ✗ ${msg}`)
          saveErrors.push(msg)
          continue
        }
        if (!result.element) {
          const msg = `Element "${el.elementMark}": no data returned`
          dbg(`  ✗ ${msg}`)
          saveErrors.push(msg)
          continue
        }

        dbg(`  ✓ Element created: ${result.element.id}`)
        savedElements++

        for (const bar of keptBarsForEl) {
          const rawKey = bar.notes.split(' ')[0]
          const bbox = bboxByRaw.get(rawKey) ?? null
          const barResult = await createRebarBar({
            element_id: result.element.id,
            bar_mark: bar.bar_mark,
            diameter_mm: bar.diameter_mm,
            shape_code: bar.shape_code,
            bending_dims: bar.bending_dims,
            quantity: bar.quantity,
            notes: bar.notes || null,
            ocr_bbox: bbox,
            ocr_confidence: bar.confidence < 100 ? bar.confidence : null,
          })
          if (barResult.error) {
            const msg = `Bar "${bar.bar_mark}" in "${el.elementMark}": ${barResult.error}`
            dbg(`  ✗ ${msg}`)
            saveErrors.push(msg)
          } else {
            savedBars++
          }
        }
      }

      const allDetectedBars = elements.flatMap(e => e.bars).length
      dbg(`Save complete: ${savedElements} elements, ${savedBars} bars saved, ${skippedEmptyElements} empty elements skipped, ${saveErrors.length} errors`)
      setSavedCount(savedBars)
      setSaveDiagnostics({
        detected: allDetectedBars,
        selected: allKeptBars.length,
        saved: savedBars,
        elementsCreated: savedElements,
        elementsSkipped: skippedEmptyElements,
        drawingId: selectedDrawingId,
        errors: saveErrors,
      })

      if (saveErrors.length > 0 && savedBars === 0) {
        setErrorMsg(`Save failed — 0 bars persisted.\n${saveErrors.join('\n')}`)
        setStatus('error')
      } else if (saveErrors.length > 0) {
        setErrorMsg(`${savedBars} bars saved with ${saveErrors.length} error(s):\n${saveErrors.join('\n')}`)
        setStatus('done')
      } else {
        setStatus('done')
      }
    })
  }

  async function handleExportAnnotatedDrawing() {
    for (const render of pageRenders) {
      const dataUrl = await exportAnnotatedCanvas(render, annotatedCallouts, labelOffsets)
      const pdfBytes = buildSinglePageImagePDF(dataUrl, render.width, render.height)
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = pageRenders.length > 1 ? `annotated_drawing_p${render.page}.pdf` : 'annotated_drawing.pdf'
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    }
  }

  async function handleFactoryPackage() {
    // 1. Excel BBS + procurement
    const a = document.createElement('a')
    a.href = `/api/rebar/export?projectId=${projectId}`
    a.click()

    // 2. Annotated drawing PDF(s) — only if OCR was used
    if (pageRenders.length > 0) {
      await new Promise(r => setTimeout(r, 400)) // stagger downloads
      await handleExportAnnotatedDrawing()
    }

    // 3. Open fabrication PDF in new tab (user prints)
    await new Promise(r => setTimeout(r, 400))
    window.open(`/projects/${projectId}/rebar/fabrication-all`, '_blank')
  }

  const keptElements = elements.filter(e => e.keep)
  const totalBars = keptElements.flatMap(e => e.bars.filter(b => b.keep)).length

  return (
    <div className="flex-1 overflow-auto p-6 max-w-6xl mx-auto w-full">

      {/* Step 1 */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Step 1 — Select Structural Drawing</h2>
        {drawings.length === 0 ? (
          <p className="text-slate-500 text-sm">No drawings uploaded yet. Upload a structural PDF or DXF first.</p>
        ) : (
          <div className="flex gap-3 flex-wrap">
            {drawings.map(d => (
              <button key={d.id} onClick={() => setSelectedDrawingId(d.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  selectedDrawingId === d.id ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                }`}>
                <FileText size={14} />
                <span>{d.name}</span>
                <span className="text-xs text-slate-500 uppercase">{d.file_type}</span>
                {d.page_count > 1 && <span className="text-xs text-slate-600">{d.page_count}pp</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2 */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Step 2 — Extract Reinforcement</h2>
        <button onClick={handleExtract}
          disabled={!selectedDrawingId || status === 'extracting' || status === 'saving'}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <Zap size={15} />
          {status === 'extracting' ? `${t('extract_reinforcement', 'Extracting')}…` : t('extract_reinforcement', 'Extract Rebar from Drawing')}
        </button>
        <p className="text-xs text-slate-600 mt-2">
          Tries native PDF text layer first, then falls back to Tesseract OCR for scanned drawings.
          Supports: 2Ø12 · 4Ø12@20 · 2X3Ø12 · 2X3Ø12 L=929 · Ø12@20 L=116 · 6T16 · T12-200
        </p>

        {status === 'error' && (
          <div className="mt-3 flex items-start gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Debug / status panel */}
        {debug.lines.length > 0 && (
          <div className="mt-4 space-y-2">
            {/* Stats row */}
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="px-2 py-1 rounded bg-slate-800 text-slate-400">
                PDF text: <strong className={debug.pdfChars > 0 ? 'text-green-400' : 'text-red-400'}>{debug.pdfChars} chars</strong>
              </span>
              {debug.usedOCR && (
                <>
                  <span className="px-2 py-1 rounded bg-slate-800 text-slate-400">
                    OCR text: <strong className={debug.ocrChars > 0 ? 'text-green-400' : 'text-red-400'}>{debug.ocrChars} chars</strong>
                  </span>
                  <span className="px-2 py-1 rounded bg-slate-800 text-slate-400">
                    OCR confidence: <strong className={debug.ocrConfidence >= 70 ? 'text-green-400' : debug.ocrConfidence >= 40 ? 'text-amber-400' : 'text-red-400'}>{debug.ocrConfidence.toFixed(0)}%</strong>
                  </span>
                </>
              )}
              <span className="px-2 py-1 rounded bg-slate-800 text-slate-400">
                Callouts: <strong className={debug.calloutCount > 0 ? 'text-green-400' : 'text-slate-400'}>{debug.calloutCount}</strong>
              </span>
              {debug.usedOCR && (
                <span className="px-2 py-1 rounded bg-amber-900/40 border border-amber-700 text-amber-400 font-semibold">OCR mode</span>
              )}
            </div>

            {/* Log lines */}
            <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-slate-400 max-h-40 overflow-y-auto">
              {debug.lines.map((line, i) => (
                <p key={i} className={
                  line.startsWith('  ✓') ? 'text-green-400' :
                  line.includes('error') || line.includes('fail') ? 'text-red-400' :
                  line.startsWith('OCR:') ? 'text-amber-300' : 'text-slate-400'
                }>{line}</p>
              ))}
            </div>

            {/* OCR output preview */}
            {debug.usedOCR && debug.ocrPreview && (
              <div>
                <p className="text-xs text-slate-500 mb-1">OCR output — first 500 chars (normalized):</p>
                <pre className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">
                  {debug.ocrPreview}
                </pre>
              </div>
            )}

            {/* Side-by-side matched lines */}
            {debug.matchedLines.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">
                  Lines with rebar matches — {debug.matchedLines.length} line(s):
                </p>
                <div className="rounded-lg border border-slate-700 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-slate-500">
                        <th className="text-left px-3 py-1.5 font-medium w-8">Pg</th>
                        <th className="text-left px-3 py-1.5 font-medium">OCR raw</th>
                        <th className="text-left px-3 py-1.5 font-medium">Normalized</th>
                        <th className="text-left px-3 py-1.5 font-medium">Regex matches</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debug.matchedLines.map((ml, i) => (
                        <tr key={i} className="border-t border-slate-800">
                          <td className="px-3 py-1 text-slate-600">{ml.page}</td>
                          <td className="px-3 py-1 font-mono text-slate-500">{ml.line}</td>
                          <td className="px-3 py-1 font-mono text-slate-300">{ml.normalized}</td>
                          <td className="px-3 py-1">
                            {ml.matches.map((m, j) => (
                              <span key={j} className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 font-mono">
                                {m}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Annotated drawing view — shown when OCR produced renders */}
      {pageRenders.length > 0 && (status === 'review' || status === 'saving' || status === 'done') && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setShowDrawingView(v => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded border transition-colors ${
                showDrawingView
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
              }`}>
              {showDrawingView ? '▲' : '▼'} Annotated Drawing View
              <span className="text-xs opacity-70">({annotatedCallouts.length} callouts placed)</span>
            </button>
            {pageRenders.length > 0 && (
              <button onClick={handleExportAnnotatedDrawing}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded border border-slate-700 bg-slate-800 text-slate-400 hover:border-amber-600 hover:text-amber-400 transition-colors">
                ↓ Export Annotated Drawing PDF
              </button>
            )}
          </div>
          {showDrawingView && (
            <AnnotatedViewer
              pageRenders={pageRenders}
              callouts={annotatedCallouts}
              activeRaw={activeRaw}
              labelOffsets={labelOffsets}
              onActivate={setActiveRaw}
              onLabelMove={(raw, dx, dy) =>
                setLabelOffsets(prev => ({ ...prev, [raw]: { dx, dy } }))
              }
            />
          )}
        </div>
      )}

      {/* Confidence threshold slider — shown when OCR was used */}
      {debug.usedOCR && (status === 'review' || status === 'saving' || status === 'done') && (
        <div className="mb-6 p-3 bg-slate-900 border border-slate-700 rounded-lg flex items-center gap-4 flex-wrap">
          <label className="text-xs text-slate-400 whitespace-nowrap">
            OCR confidence threshold:
            <strong className={`ml-1.5 ${confidenceThreshold >= 70 ? 'text-green-400' : confidenceThreshold >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {confidenceThreshold}%
            </strong>
          </label>
          <input type="range" min={0} max={100} step={5} value={confidenceThreshold}
            onChange={e => setConfidenceThreshold(Number(e.target.value))}
            className="flex-1 min-w-[120px] accent-amber-500" />
          <span className="text-xs text-slate-600">Bars below this threshold are unchecked automatically</span>
        </div>
      )}

      {/* Confidence Report — shown when OCR was used */}
      {debug.usedOCR && (status === 'review' || status === 'saving' || status === 'done') && elements.length > 0 && (() => {
        const allBars = elements.flatMap(e => e.bars)
        const accepted  = allBars.filter(b => b.confidence >= confidenceThreshold)
        const warnings  = allBars.filter(b => b.confidence >= 40 && b.confidence < confidenceThreshold)
        const rejected  = allBars.filter(b => b.confidence < 40)
        return (
          <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-3 bg-slate-800 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confidence Report</span>
              <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-green-900/50 text-green-400">
                ✓ {accepted.length} accepted
              </span>
              {warnings.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-amber-900/50 text-amber-400">
                  ⚠ {warnings.length} warnings
                </span>
              )}
              {rejected.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-red-900/50 text-red-400">
                  ✗ {rejected.length} rejected
                </span>
              )}
              <span className="text-xs text-slate-600 ml-auto">
                Threshold: {confidenceThreshold}% · OCR confidence: {debug.ocrConfidence.toFixed(0)}%
              </span>
            </div>
            {rejected.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-800">
                <p className="text-xs text-red-400 font-semibold mb-2">Rejected bars (confidence &lt; 40%) — review before saving:</p>
                <div className="flex flex-wrap gap-2">
                  {rejected.map(b => (
                    <span key={b.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-900/30 border border-red-800 text-xs text-red-300 font-mono">
                      {b.notes.split(' ')[0]}
                      <span className="text-red-500">{b.confidence}%</span>
                      {b.confidenceReasons.length > 0 && (
                        <span className="text-red-600" title={b.confidenceReasons.join('; ')}>ℹ</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-800">
                <p className="text-xs text-amber-400 font-semibold mb-2">Warnings (below threshold, unchecked):</p>
                <div className="flex flex-wrap gap-2">
                  {warnings.map(b => (
                    <span key={b.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-900/30 border border-amber-800 text-xs text-amber-300 font-mono">
                      {b.notes.split(' ')[0]}
                      <span className="text-amber-500">{b.confidence}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Step 3: Review */}
      {(status === 'review' || status === 'saving' || status === 'done') && elements.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Step 3 — Review &amp; Correct ({keptElements.length} elements, {totalBars} bars)
            </h2>
            {status === 'review' && (
              <div className="flex items-center gap-2">
                <button onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors">
                  <Check size={14} /> {t('save', 'Save')} {t('rebar_schedule', 'Rebar Schedule')}
                </button>
              </div>
            )}
            {status === 'done' && (
              <span className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                <Check size={14} /> {savedCount} bars saved successfully
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Set A/B/C bending dimensions before saving. L= values from the drawing are pre-filled in column A.
          </p>

          <div className="space-y-3">
            {elements.map(el => {
              const isExpanded = el.expanded
              return (
                <div key={el.id} className={`rounded-lg border ${el.keep ? 'border-slate-700 bg-slate-900' : 'border-slate-800 bg-slate-900/40 opacity-50'}`}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <input type="checkbox" checked={el.keep} onChange={e => updateElement(el.id, 'keep', e.target.checked)} className="w-4 h-4 accent-amber-500" />
                    <button onClick={() => toggleElement(el.id)} className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <select value={el.elementType} onChange={e => updateElement(el.id, 'elementType', e.target.value)}
                      className="bg-slate-800 border border-slate-600 text-amber-400 text-xs rounded px-2 py-1 focus:outline-none focus:border-amber-500">
                      {ELEMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input value={el.elementMark} onChange={e => updateElement(el.id, 'elementMark', e.target.value)}
                      className="font-mono font-bold text-white bg-transparent border-b border-slate-700 focus:outline-none focus:border-amber-500 w-24 text-sm" />
                    <input value={el.floorLevel} onChange={e => updateElement(el.id, 'floorLevel', e.target.value)}
                      placeholder="level" className="text-slate-400 text-xs bg-transparent border-b border-slate-800 focus:outline-none focus:border-amber-500 w-20" />
                    <span className="text-xs text-slate-600 ml-auto">
                      {el.sourceLayer ? `Layer: ${el.sourceLayer}` : el.sourcePage ? `Page ${el.sourcePage}` : ''}
                    </span>
                    <span className="text-xs text-slate-500">{el.bars.filter(b => b.keep).length} bars</span>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-800 px-4 pb-3">
                      <table className="w-full text-xs mt-2">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="w-5" />
                            <th className="text-left py-1 pr-2 font-medium">Mark</th>
                            <th className="text-left py-1 pr-2 font-medium">Dia.</th>
                            <th className="text-center py-1 pr-2 font-medium w-10">Shape</th>
                            <th className="text-right py-1 pr-2 font-medium">A (mm)</th>
                            <th className="text-right py-1 pr-2 font-medium">B (mm)</th>
                            <th className="text-right py-1 pr-2 font-medium">C (mm)</th>
                            <th className="text-right py-1 pr-2 font-medium">Qty</th>
                            <th className="text-left py-1 font-medium">Notes / Raw callout</th>
                            <th className="text-center py-1 pr-2 font-medium">Conf.</th>
                            <th className="w-5" />
                          </tr>
                        </thead>
                        <tbody>
                          {el.bars.map(bar => {
                            const rawOfBar = bar.notes.split(' ')[0]
                            const isBarActive = activeRaw === rawOfBar
                            return (
                            <tr key={bar.id}
                              className={`border-t border-slate-800/50 cursor-pointer transition-colors ${bar.keep ? '' : 'opacity-40'} ${isBarActive ? 'bg-amber-900/30 ring-1 ring-inset ring-amber-600' : 'hover:bg-slate-800/30'}`}
                              onClick={() => setActiveRaw(isBarActive ? null : rawOfBar)}
                            >
                              <td className="py-1 pr-1">
                                <input type="checkbox" checked={bar.keep} onChange={e => updateBar(el.id, bar.id, 'keep', e.target.checked)} className="w-3 h-3 accent-amber-500" />
                              </td>
                              <td className="py-1 pr-2">
                                <input value={bar.bar_mark} onChange={e => updateBar(el.id, bar.id, 'bar_mark', e.target.value)}
                                  className="font-mono font-bold text-white bg-transparent border-b border-slate-700 focus:outline-none w-8 text-center" />
                              </td>
                              <td className="py-1 pr-2">
                                <select value={bar.diameter_mm} onChange={e => updateBar(el.id, bar.id, 'diameter_mm', Number(e.target.value))}
                                  className="bg-slate-800 border border-slate-700 text-amber-300 rounded px-1 py-0.5 focus:outline-none focus:border-amber-500">
                                  {REBAR_DIAMETERS.map(d => <option key={d} value={d}>T{d}</option>)}
                                </select>
                              </td>
                              <td className="py-1 pr-2 text-center">
                                <div className="flex items-center gap-1">
                                  <select value={bar.shape_code} onChange={e => updateBar(el.id, bar.id, 'shape_code', e.target.value)}
                                    className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-1 py-0.5 focus:outline-none focus:border-amber-500 text-xs">
                                    {SHAPE_CODES.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                                  </select>
                                  <ShapeCodeSVG shapeCode={bar.shape_code} dims={bar.bending_dims} size={24} />
                                </div>
                              </td>
                              {(['A', 'B', 'C'] as const).map(key => (
                                <td key={key} className="py-1 pr-2 text-right">
                                  <input type="number" value={bar.bending_dims[key] ?? ''}
                                    onChange={e => updateBarDim(el.id, bar.id, key, Number(e.target.value))}
                                    placeholder="—"
                                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 w-20 text-right focus:outline-none focus:border-amber-500" />
                                </td>
                              ))}
                              <td className="py-1 pr-2 text-right">
                                <input type="number" value={bar.quantity} min={1}
                                  onChange={e => updateBar(el.id, bar.id, 'quantity', Number(e.target.value))}
                                  className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-1 py-0.5 w-14 text-right focus:outline-none focus:border-amber-500" />
                              </td>
                              <td className="py-1 text-slate-500 truncate max-w-xs">{bar.notes}</td>
                              <td className="py-1 pr-2 text-center">
                                {bar.confidence < 100 && (
                                  <span title={bar.confidenceReasons.join('; ')}
                                    className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${
                                      bar.confidence >= 80 ? 'bg-green-900/50 text-green-400' :
                                      bar.confidence >= 60 ? 'bg-amber-900/50 text-amber-400' :
                                      'bg-red-900/50 text-red-400'
                                    }`}>
                                    {bar.confidence}%
                                  </span>
                                )}
                              </td>
                              <td className="py-1 pl-1">
                                <button onClick={e => { e.stopPropagation(); removeBar(el.id, bar.id) }} className="text-slate-700 hover:text-red-400 transition-colors">
                                  <Trash2 size={11} />
                                </button>
                              </td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      <button onClick={() => addBar(el.id)}
                        className="mt-2 flex items-center gap-1 text-xs text-slate-600 hover:text-amber-400 transition-colors">
                        <Plus size={11} /> Add bar manually
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {status === 'review' && keptElements.length > 0 && (
            <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
              <button onClick={handleFactoryPackage}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition-colors border border-slate-600">
                📦 Generate Steel Factory Package
              </button>
              <div className="text-xs text-slate-600 max-w-xs">
                Downloads: Excel BBS · Annotated Drawing PDF · opens Full BBS print page
              </div>
              <button onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors">
                <Check size={15} />
                Save {keptElements.length} Elements to Rebar Schedule
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-800 rounded-lg">
              <p className="text-green-400 font-semibold">✓ {savedCount} bars saved successfully to Rebar Schedule</p>
              {saveDiagnostics && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-slate-800 rounded px-3 py-2">
                    <span className="text-slate-500">Detected</span>
                    <span className="block text-white font-mono font-bold">{saveDiagnostics.detected} bars</span>
                  </div>
                  <div className="bg-slate-800 rounded px-3 py-2">
                    <span className="text-slate-500">Selected</span>
                    <span className="block text-amber-300 font-mono font-bold">{saveDiagnostics.selected} bars</span>
                  </div>
                  <div className="bg-slate-800 rounded px-3 py-2">
                    <span className="text-slate-500">Saved</span>
                    <span className="block text-green-400 font-mono font-bold">{saveDiagnostics.saved} bars</span>
                  </div>
                  <div className="bg-slate-800 rounded px-3 py-2">
                    <span className="text-slate-500">Elements</span>
                    <span className="block text-white font-mono font-bold">{saveDiagnostics.elementsCreated} created</span>
                  </div>
                </div>
              )}
              {saveDiagnostics?.errors && saveDiagnostics.errors.length > 0 && (
                <div className="mt-3 p-3 bg-red-900/20 border border-red-800 rounded text-xs text-red-400">
                  <p className="font-semibold mb-1">{saveDiagnostics.errors.length} error(s):</p>
                  {saveDiagnostics.errors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <button onClick={handleFactoryPackage}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-colors">
                  📦 Generate Steel Factory Package
                </button>
                <a href={`/projects/${projectId}/rebar`}
                  className="px-4 py-2 rounded bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors">
                  → Open Rebar Schedule
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
