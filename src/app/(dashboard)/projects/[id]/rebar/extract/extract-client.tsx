'use client'

import { useState, useTransition } from 'react'
import { FileText, Zap, Check, AlertCircle, Trash2, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { createRebarElement, createRebarBar } from '@/app/actions/rebar'
import { calloutToBarDraft, type DetectedElement, type RebarCallout } from '@/lib/rebar-extractor'
import { REBAR_DIAMETERS } from '@/lib/rebar-calc'
import { ShapeCodeSVG } from '../[elementId]/shape-code-svg'

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
}

function makeId() { return Math.random().toString(36).slice(2) }

function elementToEditable(el: DetectedElement): EditableElement {
  const bars = el.callouts.map((c: RebarCallout, i: number) => {
    const draft = calloutToBarDraft(c, i)
    return { ...draft, id: makeId(), bending_dims: draft.bending_dims as Record<string, number>, keep: true }
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

// Render a PDF page to an offscreen canvas at the given scale
async function renderPageToCanvas(
  pdfPage: Awaited<ReturnType<import('pdfjs-dist').PDFDocumentProxy['getPage']>>,
  scale = 2.5
): Promise<HTMLCanvasElement> {
  const viewport = pdfPage.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext('2d')!
  await pdfPage.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof pdfPage.render>[0]).promise
  return canvas
}

export function ExtractClient({ projectId, drawings }: Props) {
  const [selectedDrawingId, setSelectedDrawingId] = useState(drawings[0]?.id ?? '')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [elements, setElements] = useState<EditableElement[]>([])
  const [savedCount, setSavedCount] = useState(0)
  const [debug, setDebug] = useState<DebugState>({
    lines: [], pdfChars: 0, ocrChars: 0, ocrConfidence: 0,
    ocrPreview: '', calloutCount: 0, usedOCR: false,
  })
  const [, startTransition] = useTransition()

  function dbg(msg: string) {
    console.log('[RebarExtract]', msg)
    setDebug(d => ({ ...d, lines: [...d.lines, msg] }))
  }

  async function extractPDFClientSide(signedUrl: string): Promise<DetectedElement[]> {
    setDebug({ lines: [], pdfChars: 0, ocrChars: 0, ocrConfidence: 0, ocrPreview: '', calloutCount: 0, usedOCR: false })
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

    // Create worker; Tesseract v7 loads lang data from CDN by default
    // langPath points to /public/tesseract/ where eng.traineddata.gz is bundled.
    // This avoids the CSP block on cdn.jsdelivr.net for connect-src.
    const worker = await createWorker('eng', 1, {
      langPath: '/tesseract',
      logger: (m: { status: string; progress?: number }) => {
        if (m.status === 'loading tesseract core') dbg('OCR: loading core…')
        else if (m.status === 'loading language traineddata') dbg('OCR: loading language data (bundled)…')
        else if (m.status === 'initialized api') dbg('OCR: engine ready')
        else if (m.status === 'recognizing text' && m.progress) {
          if (Math.round((m.progress ?? 0) * 100) % 25 === 0) {
            dbg(`OCR: recognizing… ${Math.round((m.progress ?? 0) * 100)}%`)
          }
        }
      },
    })

    // Set parameters that help with engineering drawing text
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ØøφΦTtHhYyRrXx@/=ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz.,-+Ll',
      preserve_interword_spaces: '1',
    })

    const allOcrTexts: Array<{ text: string; page: number }> = []
    let totalOcrChars = 0
    let sumConfidence = 0

    for (let p = 1; p <= pdf.numPages; p++) {
      dbg(`OCR: rendering page ${p} to canvas…`)
      const page = await pdf.getPage(p)
      const canvas = await renderPageToCanvas(page, 2.5)  // 2.5× scale = ~200dpi

      dbg(`OCR: recognizing page ${p} (${canvas.width}×${canvas.height}px)…`)
      const { data } = await worker.recognize(canvas)

      const ocrText = data.text ?? ''
      const confidence = data.confidence ?? 0
      sumConfidence += confidence
      totalOcrChars += ocrText.length

      dbg(`OCR page ${p}: ${ocrText.length} chars, confidence ${confidence.toFixed(0)}%`)
      console.log(`[RebarExtract OCR] Page ${p} text:\n${ocrText.slice(0, 2000)}`)

      allOcrTexts.push({ text: ocrText, page: p })
    }

    await worker.terminate()

    const avgConfidence = allOcrTexts.length > 0 ? sumConfidence / allOcrTexts.length : 0
    const ocrPreview = allOcrTexts.map(p => p.text).join('\n').slice(0, 500)

    setDebug(d => ({
      ...d,
      ocrChars: totalOcrChars,
      ocrConfidence: avgConfidence,
      ocrPreview,
      usedOCR: true,
    }))
    dbg(`OCR complete: ${totalOcrChars} chars, avg confidence ${avgConfidence.toFixed(0)}%`)

    // Count regex matches on OCR output
    let ocrMatchCount = 0
    for (const { text } of allOcrTexts) {
      const c = parseRebarText(text)
      ocrMatchCount += c.length
      if (c.length > 0) dbg(`  ✓ OCR regex: ${c.slice(0, 8).map(x => x.raw).join(', ')}`)
    }
    dbg(`OCR regex matches: ${ocrMatchCount}`)

    const elems = extractFromPageText(allOcrTexts)
    const totalBars = elems.flatMap(e => e.callouts).length
    setDebug(d => ({ ...d, calloutCount: totalBars }))
    dbg(`Done (OCR): ${elems.length} elements, ${totalBars} bars`)

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

      const editable = detectedElements.map(elementToEditable)
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
    }
    setElements(prev => prev.map(el => el.id === elId ? { ...el, bars: [...el.bars, newBar] } : el))
  }
  function handleSave() {
    startTransition(async () => {
      setStatus('saving')
      let saved = 0
      for (const el of elements) {
        if (!el.keep) continue
        const result = await createRebarElement({ project_id: projectId, element_type: el.elementType, element_mark: el.elementMark, floor_level: el.floorLevel || null })
        if (!result.success || !result.element) continue
        for (const bar of el.bars) {
          if (!bar.keep) continue
          await createRebarBar({ element_id: result.element.id, bar_mark: bar.bar_mark, diameter_mm: bar.diameter_mm, shape_code: bar.shape_code, bending_dims: bar.bending_dims, quantity: bar.quantity, notes: bar.notes || null })
        }
        saved++
      }
      setSavedCount(saved)
      setStatus('done')
    })
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
          {status === 'extracting' ? 'Extracting…' : 'Extract Rebar from Drawing'}
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

            {/* OCR text preview */}
            {debug.usedOCR && debug.ocrPreview && (
              <div>
                <p className="text-xs text-slate-500 mb-1">OCR output preview (first 500 chars):</p>
                <pre className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {debug.ocrPreview}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 3: Review */}
      {(status === 'review' || status === 'saving' || status === 'done') && elements.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Step 3 — Review &amp; Correct ({keptElements.length} elements, {totalBars} bars)
            </h2>
            {status === 'review' && (
              <button onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors">
                <Check size={14} /> Save to Rebar Schedule
              </button>
            )}
            {status === 'done' && (
              <span className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                <Check size={14} /> {savedCount} elements saved
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
                            <th className="w-5" />
                          </tr>
                        </thead>
                        <tbody>
                          {el.bars.map(bar => (
                            <tr key={bar.id} className={`border-t border-slate-800/50 ${bar.keep ? '' : 'opacity-40'}`}>
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
                              <td className="py-1 pl-1">
                                <button onClick={() => removeBar(el.id, bar.id)} className="text-slate-700 hover:text-red-400 transition-colors">
                                  <Trash2 size={11} />
                                </button>
                              </td>
                            </tr>
                          ))}
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
            <div className="mt-6 flex justify-end">
              <button onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors">
                <Check size={15} />
                Save {keptElements.length} Elements to Rebar Schedule
              </button>
            </div>
          )}

          {status === 'done' && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-800 rounded-lg">
              <p className="text-green-400 font-semibold">✓ {savedCount} elements saved to Rebar Schedule</p>
              <p className="text-green-600 text-sm mt-1">Go to Rebar Schedule to set any remaining cut lengths and export.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
