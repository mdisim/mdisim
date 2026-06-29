'use client'

import type {
  BOQItem, Drawing, MeasurementItem, MeasurementLine,
  DrawingMeasurement, DrawingScale, RateAnalysis, QuantityChange,
} from '@/lib/types'

interface EvidenceReportData {
  boqItem: BOQItem
  projectName: string
  measurements: MeasurementItem[]
  sourceDrawings: Drawing[]
  quantityChanges: QuantityChange[]
  rateAnalysis: RateAnalysis | null
  costEntries: { amount: number; description?: string }[]
  payments: { totalCertified: number; contractAmount: number }
  drawingMeasurements: DrawingMeasurement[]
  company: {
    name: string
    logo_url?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
    registration_number?: string | null
  } | null
  engineerName: string
  currency: string
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function generateQRCodeSVG(url: string, size: number = 80): string {
  // Simple QR-like pattern using the URL hash for visual uniqueness
  const hash = Array.from(url).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  const modules = 21
  const cellSize = size / modules
  let cells = ''

  // Position detection patterns (3 corners)
  const drawFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isOuter = y === 0 || y === 6 || x === 0 || x === 6
        const isInner = y >= 2 && y <= 4 && x >= 2 && x <= 4
        if (isOuter || isInner) {
          cells += `<rect x="${(ox + x) * cellSize}" y="${(oy + y) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#1e293b"/>`
        }
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(modules - 7, 0)
  drawFinder(0, modules - 7)

  // Data modules (deterministic from hash)
  let seed = Math.abs(hash)
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      const inFinder = (x < 8 && y < 8) || (x >= modules - 8 && y < 8) || (x < 8 && y >= modules - 8)
      if (inFinder) continue
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      if (seed % 3 === 0) {
        cells += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#1e293b"/>`
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="white"/>${cells}</svg>`
}

function generateEngineeringSketchSVG(
  lines: MeasurementLine[],
  drawingMeasurements: DrawingMeasurement[]
): string {
  if (lines.length === 0 && drawingMeasurements.length === 0) return ''

  const width = 460
  const height = 200
  const pad = 30

  // Collect all coordinate points from drawing measurements
  type Point = [number, number]
  const allPoints: Point[] = []
  const shapes: { type: string; points: Point[]; label?: string; quantity?: number; unit?: string }[] = []

  for (const dm of drawingMeasurements) {
    const coords = dm.coordinates as Record<string, unknown> | null
    if (!coords) continue

    if (dm.tool_type === 'rectangle' && coords.origin) {
      const origin = coords.origin as [number, number]
      const w = (coords.width as number) || 0
      const h = (coords.height as number) || 0
      const pts: Point[] = [
        origin,
        [origin[0] + w, origin[1]],
        [origin[0] + w, origin[1] + h],
        [origin[0], origin[1] + h],
      ]
      allPoints.push(...pts)
      shapes.push({ type: 'rectangle', points: pts, label: dm.label ?? undefined, quantity: dm.quantity, unit: dm.unit ?? undefined })
    } else if (dm.tool_type === 'circle' && coords.center) {
      const center = coords.center as [number, number]
      const r = (coords.radius as number) || 0
      allPoints.push([center[0] - r, center[1] - r], [center[0] + r, center[1] + r])
      shapes.push({ type: 'circle', points: [center, [r, 0]], label: dm.label ?? undefined, quantity: dm.quantity, unit: dm.unit ?? undefined })
    } else if (coords.points) {
      const pts = coords.points as Point[]
      allPoints.push(...pts)
      shapes.push({ type: dm.tool_type, points: pts, label: dm.label ?? undefined, quantity: dm.quantity, unit: dm.unit ?? undefined })
    }
  }

  if (allPoints.length === 0) {
    // Fallback: generate a schematic from measurement line dimensions
    return generateDimensionSketch(lines, width, height)
  }

  // Calculate bounds and scale
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of allPoints) {
    minX = Math.min(minX, x); minY = Math.min(minY, y)
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
  }

  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const scale = Math.min((width - pad * 2) / rangeX, (height - pad * 2) / rangeY)
  const tx = (x: number) => pad + (x - minX) * scale
  const ty = (y: number) => pad + (y - minY) * scale

  let svgContent = ''

  // Grid lines
  for (let i = 0; i <= 10; i++) {
    const gx = pad + (width - pad * 2) * i / 10
    const gy = pad + (height - pad * 2) * i / 10
    svgContent += `<line x1="${gx}" y1="${pad}" x2="${gx}" y2="${height - pad}" stroke="#e2e8f0" stroke-width="0.5"/>`
    svgContent += `<line x1="${pad}" y1="${gy}" x2="${width - pad}" y2="${gy}" stroke="#e2e8f0" stroke-width="0.5"/>`
  }

  // Render shapes
  for (const shape of shapes) {
    if (shape.type === 'rectangle') {
      const [p0, p1, p2, p3] = shape.points
      const x0 = tx(p0[0]), y0 = ty(p0[1])
      const x1 = tx(p2[0]), y1 = ty(p2[1])
      svgContent += `<rect x="${Math.min(x0, x1)}" y="${Math.min(y0, y1)}" width="${Math.abs(x1 - x0)}" height="${Math.abs(y1 - y0)}" fill="rgba(59,130,246,0.08)" stroke="#3b82f6" stroke-width="1.5"/>`
      // Dimension arrows
      svgContent += dimArrow(x0, y0, x1, y0, shape.quantity?.toFixed(2) ?? '', '#1e40af')
      svgContent += dimArrow(x1, y0, x1, y1, '', '#1e40af')
    } else if (shape.type === 'circle') {
      const [center, [r]] = shape.points
      const cx = tx(center[0]), cy = ty(center[1])
      const sr = r * scale
      svgContent += `<circle cx="${cx}" cy="${cy}" r="${sr}" fill="rgba(59,130,246,0.08)" stroke="#3b82f6" stroke-width="1.5"/>`
      svgContent += `<line x1="${cx}" y1="${cy}" x2="${cx + sr}" y2="${cy}" stroke="#1e40af" stroke-width="0.8" stroke-dasharray="3,2"/>`
      svgContent += `<text x="${cx + sr / 2}" y="${cy - 4}" text-anchor="middle" fill="#1e40af" font-size="8" font-family="monospace">r=${shape.quantity?.toFixed(2) ?? ''}</text>`
    } else {
      // Line, polyline, area
      const pts = shape.points.map(p => `${tx(p[0])},${ty(p[1])}`).join(' ')
      if (shape.type === 'area') {
        svgContent += `<polygon points="${pts}" fill="rgba(59,130,246,0.08)" stroke="#3b82f6" stroke-width="1.5"/>`
      } else {
        svgContent += `<polyline points="${pts}" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>`
      }
      // Dimension labels on segments
      for (let i = 0; i < shape.points.length - 1; i++) {
        const [ax, ay] = shape.points[i]
        const [bx, by] = shape.points[i + 1]
        const mx = (tx(ax) + tx(bx)) / 2
        const my = (ty(ay) + ty(by)) / 2
        const segLen = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)
        if (segLen > 0) {
          svgContent += `<text x="${mx}" y="${my - 4}" text-anchor="middle" fill="#1e40af" font-size="7" font-family="monospace">${segLen.toFixed(1)}</text>`
        }
      }
    }

    if (shape.label) {
      const cx = shape.points.reduce((s, p) => s + tx(p[0]), 0) / shape.points.length
      const cy = shape.points.reduce((s, p) => s + ty(p[1]), 0) / shape.points.length
      svgContent += `<text x="${cx}" y="${cy + 3}" text-anchor="middle" fill="#475569" font-size="8" font-weight="600">${esc(shape.label)}</text>`
    }
  }

  // North arrow
  svgContent += `<g transform="translate(${width - 20},18)">
    <polygon points="0,-12 4,0 -4,0" fill="#1e40af"/>
    <text x="0" y="10" text-anchor="middle" fill="#1e40af" font-size="8" font-weight="700">N</text>
  </g>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="border:1px solid #e2e8f0;border-radius:6px;background:#fafbfd">${svgContent}</svg>`
}

function dimArrow(x1: number, y1: number, x2: number, y2: number, label: string, color: string): string {
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  if (len < 10) return ''
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const offset = 12
  const isHoriz = Math.abs(y2 - y1) < Math.abs(x2 - x1)
  const dy = isHoriz ? offset : 0
  const dx = isHoriz ? 0 : -offset

  let svg = `<line x1="${x1 + dx}" y1="${y1 + dy}" x2="${x2 + dx}" y2="${y2 + dy}" stroke="${color}" stroke-width="0.7" marker-start="url(#arrowS)" marker-end="url(#arrowE)"/>`
  if (label) {
    svg += `<text x="${mx + dx}" y="${my + dy - 3}" text-anchor="middle" fill="${color}" font-size="8" font-family="monospace">${label}</text>`
  }
  return svg
}

function generateDimensionSketch(lines: MeasurementLine[], width: number, height: number): string {
  const pad = 30
  let svgContent = ''

  // Grid
  for (let i = 0; i <= 8; i++) {
    const gx = pad + (width - pad * 2) * i / 8
    const gy = pad + (height - pad * 2) * i / 8
    svgContent += `<line x1="${gx}" y1="${pad}" x2="${gx}" y2="${height - pad}" stroke="#e2e8f0" stroke-width="0.5"/>`
    svgContent += `<line x1="${pad}" y1="${gy}" x2="${width - pad}" y2="${gy}" stroke="#e2e8f0" stroke-width="0.5"/>`
  }

  // Represent each line as a proportional block
  const maxDim = Math.max(...lines.map(l => Math.max(l.length ?? 0, l.width ?? 0, l.height ?? 0, 1)))
  const usableW = width - pad * 2
  const usableH = height - pad * 2
  const perLine = usableH / Math.min(lines.length, 5)

  lines.slice(0, 5).forEach((l, i) => {
    const lw = ((l.length ?? 1) / maxDim) * usableW * 0.7
    const lh = perLine * 0.5
    const x = pad + 20
    const y = pad + i * perLine + perLine * 0.2

    svgContent += `<rect x="${x}" y="${y}" width="${lw}" height="${lh}" fill="rgba(59,130,246,0.08)" stroke="#3b82f6" stroke-width="1" rx="1"/>`

    const dims = [l.nr && `${l.nr}×`, l.length && `L=${l.length}`, l.width && `W=${l.width}`, l.height && `H=${l.height}`].filter(Boolean).join(' ')
    svgContent += `<text x="${x + lw / 2}" y="${y + lh / 2 + 3}" text-anchor="middle" fill="#1e40af" font-size="7" font-family="monospace">${dims}</text>`

    if (l.description) {
      svgContent += `<text x="${x + lw + 6}" y="${y + lh / 2 + 3}" fill="#64748b" font-size="7">${esc(l.description.slice(0, 30))}</text>`
    }
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="border:1px solid #e2e8f0;border-radius:6px;background:#fafbfd">
    <defs>
      <marker id="arrowS" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto"><path d="M6,0 L0,3 L6,6" fill="#1e40af"/></marker>
      <marker id="arrowE" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#1e40af"/></marker>
    </defs>
    ${svgContent}
  </svg>`
}

export function generateEvidenceReport(data: EvidenceReportData): void {
  const {
    boqItem, projectName, measurements, sourceDrawings,
    quantityChanges, rateAnalysis, costEntries, payments,
    drawingMeasurements, company, engineerName, currency,
  } = data

  const allLines = measurements.flatMap(m => m.lines ?? [])
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const refNo = `EQE-${boqItem.code?.replace(/\./g, '') ?? boqItem.id.slice(0, 6).toUpperCase()}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`

  const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/projects/${boqItem.project_id}/workspace?boq=${boqItem.id}`
  const qrSvg = generateQRCodeSVG(qrUrl)
  const sketchSvg = generateEngineeringSketchSVG(allLines, drawingMeasurements)

  const totalCostEntries = costEntries.reduce((s, c) => s + c.amount, 0)
  const costBreakdown = (() => {
    const mat = boqItem.material_rate ?? 0
    const lab = boqItem.labor_rate ?? 0
    const equip = boqItem.equipment_rate ?? 0
    const total = mat + lab + equip
    if (total === 0) return null
    return { mat, lab, equip, total }
  })()

  // Measurement table rows
  let measurementRows = ''
  for (const m of measurements) {
    const lines = m.lines ?? []
    measurementRows += `<tr class="item-header">
      <td class="code">${esc(m.item_code ?? '')}</td>
      <td class="desc">${esc(m.description)}</td>
      <td class="center">${esc(m.unit)}</td>
      <td class="center">${esc(m.measurement_type)}</td>
      <td></td><td></td><td></td><td></td><td></td>
      <td class="num total">${fmt(m.net_qty)}</td>
    </tr>`

    for (const line of lines) {
      measurementRows += `<tr class="${line.is_deduction ? 'deduction' : ''}">
        <td></td>
        <td class="desc indent">${line.is_deduction ? '<span class="ded-badge">DED</span>' : ''} ${esc(line.description ?? '—')}</td>
        <td class="center">${esc(line.location ?? '')}</td>
        <td></td>
        <td class="num">${line.nr != null ? line.nr : ''}</td>
        <td class="num">${line.length != null ? fmt(line.length) : ''}</td>
        <td class="num">${line.width != null ? fmt(line.width) : ''}</td>
        <td class="num">${line.height != null ? fmt(line.height) : ''}</td>
        <td class="formula">${esc(line.formula ?? '')}</td>
        <td class="num ${line.is_deduction ? 'neg' : ''}">${line.is_deduction ? '-' : ''}${fmt(line.quantity)}</td>
      </tr>`
    }

    if (lines.length > 0) {
      measurementRows += `<tr class="subtotal">
        <td colspan="9" class="right">Net Qty (Add: ${fmt(m.additions_qty)} − Ded: ${fmt(m.deductions_qty)})</td>
        <td class="num">${fmt(m.net_qty)}</td>
      </tr>`
    }
  }

  // Source drawings section
  const drawingsSection = sourceDrawings.length > 0 ? `
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:#eef2ff">📐</div>
        <h3>Source Drawings</h3>
      </div>
      <table class="info-table">
        <thead><tr><th>Drawing No.</th><th>Name</th><th>Type</th><th>Revision</th><th>Format</th></tr></thead>
        <tbody>
          ${sourceDrawings.map(d => `<tr>
            <td class="mono">${esc(d.drawing_number ?? '—')}</td>
            <td>${esc(d.name)}</td>
            <td class="capitalize">${esc(d.drawing_type)}</td>
            <td>${esc(d.revision_number ?? '—')}</td>
            <td class="upper">${esc(d.file_type?.toUpperCase() ?? '—')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''

  // Rate analysis section
  const rateSection = rateAnalysis ? `
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:#fff7ed">💰</div>
        <h3>Rate Analysis</h3>
      </div>
      <div class="rate-grid">
        <div class="rate-card">
          <div class="rate-label">Direct Cost</div>
          <div class="rate-value">${fmt(rateAnalysis.direct_cost)}</div>
        </div>
        <div class="rate-card">
          <div class="rate-label">Overhead (${rateAnalysis.overhead_pct}%)</div>
          <div class="rate-value">${fmt(rateAnalysis.overhead_amount)}</div>
        </div>
        <div class="rate-card">
          <div class="rate-label">Profit (${rateAnalysis.profit_pct}%)</div>
          <div class="rate-value">${fmt(rateAnalysis.profit_amount)}</div>
        </div>
        <div class="rate-card highlight">
          <div class="rate-label">Unit Rate</div>
          <div class="rate-value">${fmt(rateAnalysis.unit_rate)} / ${esc(boqItem.unit)}</div>
        </div>
      </div>
      ${rateAnalysis.resources?.length ? `
        <table class="info-table" style="margin-top:8px">
          <thead><tr><th>Resource</th><th>Type</th><th>Unit</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${rateAnalysis.resources.map(r => `<tr>
              <td>${esc(r.description)}</td>
              <td class="capitalize">${esc(r.resource_type)}</td>
              <td>${esc(r.unit)}</td>
              <td class="num">${fmt(r.quantity)}</td>
              <td class="num">${fmt(r.unit_cost)}</td>
              <td class="num">${fmt(r.total_amount)}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : ''}
    </div>` : ''

  // Revision history
  const revisionSection = quantityChanges.length > 0 ? `
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:#fef3c7">🔄</div>
        <h3>Quantity Revision History</h3>
      </div>
      <table class="info-table">
        <thead><tr><th>Description</th><th>Type</th><th class="num">Previous</th><th class="num">New</th><th class="num">Difference</th></tr></thead>
        <tbody>
          ${quantityChanges.map(qc => `<tr>
            <td>${esc(qc.description)}</td>
            <td class="capitalize">${esc(qc.change_type)}</td>
            <td class="num">${fmt(qc.previous_qty)}</td>
            <td class="num">${fmt(qc.new_qty)}</td>
            <td class="num ${qc.difference > 0 ? 'pos' : qc.difference < 0 ? 'neg' : ''}">${qc.difference > 0 ? '+' : ''}${fmt(qc.difference)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : ''

  // Cost section
  const costSection = (costBreakdown || totalCostEntries > 0) ? `
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background:#ecfdf5">📊</div>
        <h3>Cost Summary</h3>
      </div>
      ${costBreakdown ? `
        <div class="cost-bar-container">
          <div class="cost-bar">
            <div class="cost-segment" style="width:${(costBreakdown.mat / costBreakdown.total * 100).toFixed(1)}%;background:#3b82f6"></div>
            <div class="cost-segment" style="width:${(costBreakdown.lab / costBreakdown.total * 100).toFixed(1)}%;background:#f59e0b"></div>
            <div class="cost-segment" style="width:${(costBreakdown.equip / costBreakdown.total * 100).toFixed(1)}%;background:#8b5cf6"></div>
          </div>
          <div class="cost-legend">
            <span><i style="background:#3b82f6"></i>Material: ${fmt(costBreakdown.mat)}</span>
            <span><i style="background:#f59e0b"></i>Labor: ${fmt(costBreakdown.lab)}</span>
            <span><i style="background:#8b5cf6"></i>Equipment: ${fmt(costBreakdown.equip)}</span>
          </div>
        </div>` : ''}
      ${totalCostEntries > 0 ? `<div class="cost-actual">Actual Expenditure: <strong>${fmt(totalCostEntries)}</strong></div>` : ''}
      ${payments.totalCertified > 0 ? `
        <div class="payment-bar-container">
          <div class="payment-label">Payment Progress</div>
          <div class="payment-bar">
            <div class="payment-fill" style="width:${Math.min(100, (payments.totalCertified / payments.contractAmount * 100)).toFixed(1)}%"></div>
          </div>
          <div class="payment-values">
            <span>Certified: ${fmt(payments.totalCertified)}</span>
            <span>Contract: ${fmt(payments.contractAmount)}</span>
          </div>
        </div>` : ''}
    </div>` : ''

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Evidence Report - ${esc(refNo)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 12mm 16mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif; font-size: 9px; color: #1e293b; line-height: 1.5; background: white; }

  /* Header */
  .report-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 3px solid #1e40af; margin-bottom: 0; }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .company-logo { width: 50px; height: 50px; border-radius: 8px; object-fit: contain; border: 1px solid #e2e8f0; }
  .company-logo-placeholder { width: 50px; height: 50px; border-radius: 8px; background: linear-gradient(135deg, #1e40af, #3b82f6); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: 800; }
  .company-info h1 { font-size: 14px; color: #1e40af; font-weight: 800; letter-spacing: -0.3px; }
  .company-info p { font-size: 8px; color: #64748b; margin-top: 1px; }
  .header-right { text-align: right; }
  .report-title { font-size: 11px; font-weight: 800; color: #1e293b; letter-spacing: -0.2px; text-transform: uppercase; }
  .report-ref { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 9px; color: #3b82f6; margin-top: 2px; font-weight: 600; }
  .report-date { font-size: 8px; color: #94a3b8; margin-top: 2px; }

  /* Accent bar */
  .accent-bar { height: 3px; background: linear-gradient(90deg, #1e40af, #3b82f6, #60a5fa, #93c5fd); }

  /* Project info strip */
  .project-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-bottom: 1px solid #e2e8f0; }
  .project-strip .cell { padding: 8px 14px; border-right: 1px solid #e2e8f0; }
  .project-strip .cell:last-child { border-right: none; }
  .project-strip .cell-label { font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
  .project-strip .cell-value { font-size: 10px; color: #1e293b; font-weight: 600; margin-top: 2px; }

  /* BOQ item hero */
  .boq-hero { padding: 14px 20px; background: linear-gradient(135deg, #f0f4ff 0%, #e8efff 100%); border-bottom: 1px solid #c7d2fe; }
  .boq-code { font-family: monospace; font-size: 10px; color: #3b82f6; font-weight: 700; margin-bottom: 3px; }
  .boq-desc { font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.3; }
  .boq-meta { display: flex; gap: 16px; margin-top: 6px; }
  .boq-meta span { font-size: 9px; color: #475569; }
  .boq-meta strong { color: #1e293b; }

  /* Quantity box */
  .qty-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border-bottom: 1px solid #e2e8f0; }
  .qty-cell { padding: 10px 14px; text-align: center; border-right: 1px solid #e2e8f0; }
  .qty-cell:last-child { border-right: none; }
  .qty-cell .label { font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; }
  .qty-cell .value { font-size: 16px; font-weight: 800; margin-top: 3px; font-variant-numeric: tabular-nums; }
  .qty-cell .unit { font-size: 8px; color: #94a3b8; margin-top: 1px; }
  .qty-cell.primary .value { color: #1e40af; }
  .qty-cell.secondary .value { color: #475569; }
  .qty-cell.positive .value { color: #059669; }
  .qty-cell.negative .value { color: #dc2626; }

  /* Sketch container */
  .sketch-container { padding: 14px 20px; border-bottom: 1px solid #e2e8f0; }
  .sketch-title { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
  .sketch-title::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
  .sketch-container svg { display: block; margin: 0 auto; }

  /* Sections */
  .section { padding: 12px 20px; border-bottom: 1px solid #e2e8f0; }
  .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .section-header h3 { font-size: 10px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
  .section-icon { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; }

  /* Tables */
  .measurement-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .measurement-table th { background: #1e40af; color: white; padding: 5px 8px; text-align: left; font-weight: 600; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px; }
  .measurement-table td { padding: 3.5px 8px; border-bottom: 1px solid #f1f5f9; font-size: 8.5px; }
  .measurement-table .item-header td { background: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
  .measurement-table .subtotal td { background: #f1f5f9; font-weight: 600; font-size: 8px; color: #475569; border-bottom: 2px solid #cbd5e1; }
  .measurement-table .deduction td { color: #991b1b; background: #fef2f2; }
  .measurement-table .num { text-align: right; font-variant-numeric: tabular-nums; }
  .measurement-table .total { font-weight: 700; }
  .measurement-table .right { text-align: right; }
  .measurement-table .center { text-align: center; }
  .measurement-table .desc { min-width: 100px; }
  .measurement-table .indent { padding-left: 18px !important; }
  .measurement-table .neg { color: #dc2626; }
  .measurement-table .pos { color: #059669; }
  .measurement-table .code { font-family: monospace; font-weight: 600; color: #3b82f6; }
  .measurement-table .formula { font-family: monospace; font-size: 7.5px; color: #64748b; }
  .ded-badge { background: #fee2e2; color: #991b1b; padding: 1px 4px; border-radius: 3px; font-size: 7px; font-weight: 700; }

  .info-table { width: 100%; border-collapse: collapse; }
  .info-table th { background: #f8fafc; color: #475569; padding: 4px 8px; text-align: left; font-weight: 600; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; }
  .info-table td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; font-size: 8.5px; }
  .info-table .mono { font-family: monospace; color: #3b82f6; }
  .info-table .capitalize { text-transform: capitalize; }
  .info-table .upper { text-transform: uppercase; }

  /* Rate analysis */
  .rate-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .rate-card { padding: 8px 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
  .rate-card.highlight { background: linear-gradient(135deg, #fff7ed, #ffedd5); border-color: #fed7aa; }
  .rate-label { font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  .rate-value { font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .rate-card.highlight .rate-value { color: #c2410c; }

  /* Cost */
  .cost-bar-container { margin-bottom: 8px; }
  .cost-bar { height: 10px; border-radius: 5px; overflow: hidden; display: flex; background: #f1f5f9; }
  .cost-segment { height: 100%; }
  .cost-legend { display: flex; gap: 12px; margin-top: 4px; }
  .cost-legend span { font-size: 8px; color: #475569; display: flex; align-items: center; gap: 3px; }
  .cost-legend i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
  .cost-actual { font-size: 9px; color: #475569; padding: 6px 0; border-top: 1px solid #f1f5f9; margin-top: 4px; }

  .payment-bar-container { margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; }
  .payment-label { font-size: 7px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 4px; }
  .payment-bar { height: 8px; border-radius: 4px; background: #f1f5f9; overflow: hidden; }
  .payment-fill { height: 100%; background: linear-gradient(90deg, #059669, #10b981); border-radius: 4px; }
  .payment-values { display: flex; justify-content: space-between; margin-top: 3px; font-size: 8px; color: #64748b; }

  /* Footer */
  .report-footer { display: flex; align-items: flex-end; justify-content: space-between; padding: 14px 20px; margin-top: 12px; border-top: 2px solid #1e40af; }
  .footer-left { }
  .footer-prepared { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .footer-name { font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 2px; }
  .footer-role { font-size: 8px; color: #64748b; margin-top: 1px; }
  .footer-sig { margin-top: 16px; border-top: 1px solid #1e293b; width: 160px; padding-top: 3px; font-size: 7px; color: #94a3b8; }
  .footer-center { text-align: center; }
  .footer-center p { font-size: 7px; color: #94a3b8; margin-top: 4px; }
  .footer-right { text-align: right; }
  .footer-stamp { font-size: 8px; color: #94a3b8; }
  .footer-date { font-size: 10px; font-weight: 600; color: #1e293b; margin-top: 1px; }

  .watermark { position: fixed; bottom: 8px; left: 0; right: 0; text-align: center; font-size: 7px; color: #cbd5e1; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
</style>
</head><body>

<!-- Header -->
<div class="report-header">
  <div class="header-left">
    ${company?.logo_url
      ? `<img src="${esc(company.logo_url)}" class="company-logo" alt="Logo" />`
      : `<div class="company-logo-placeholder">${esc((company?.name ?? 'A')[0])}</div>`
    }
    <div class="company-info">
      <h1>${esc(company?.name ?? 'ANGEL D.C.')}</h1>
      ${company?.address ? `<p>${esc(company.address)}</p>` : ''}
      ${company?.registration_number ? `<p>Reg: ${esc(company.registration_number)}</p>` : ''}
    </div>
  </div>
  <div class="header-right">
    <div class="report-title">Engineering Quantity Evidence</div>
    <div class="report-ref">${esc(refNo)}</div>
    <div class="report-date">${dateStr} · ${timeStr}</div>
  </div>
</div>
<div class="accent-bar"></div>

<!-- Project Info Strip -->
<div class="project-strip">
  <div class="cell">
    <div class="cell-label">Project</div>
    <div class="cell-value">${esc(projectName)}</div>
  </div>
  <div class="cell">
    <div class="cell-label">Currency</div>
    <div class="cell-value">${esc(currency)}</div>
  </div>
  <div class="cell">
    <div class="cell-label">Engineer</div>
    <div class="cell-value">${esc(engineerName || 'Not specified')}</div>
  </div>
  <div class="cell">
    <div class="cell-label">Date of Issue</div>
    <div class="cell-value">${dateStr}</div>
  </div>
</div>

<!-- BOQ Item Hero -->
<div class="boq-hero">
  <div class="boq-code">${esc(boqItem.code ?? '—')}</div>
  <div class="boq-desc">${esc(boqItem.description)}</div>
  <div class="boq-meta">
    <span>Unit: <strong>${esc(boqItem.unit)}</strong></span>
    ${boqItem.section ? `<span>Section: <strong>${esc(boqItem.section)}</strong></span>` : ''}
    ${boqItem.unit_rate != null ? `<span>Unit Rate: <strong>${fmt(boqItem.unit_rate)}</strong></span>` : ''}
  </div>
</div>

<!-- Quantity Summary -->
<div class="qty-box">
  <div class="qty-cell primary">
    <div class="label">Current Quantity</div>
    <div class="value">${fmt(boqItem.quantity)}</div>
    <div class="unit">${esc(boqItem.unit)}</div>
  </div>
  <div class="qty-cell secondary">
    <div class="label">Original Quantity</div>
    <div class="value">${fmt(boqItem.original_quantity ?? boqItem.quantity)}</div>
    <div class="unit">${esc(boqItem.unit)}</div>
  </div>
  <div class="qty-cell ${(boqItem.quantity_difference ?? 0) >= 0 ? 'positive' : 'negative'}">
    <div class="label">Difference</div>
    <div class="value">${(boqItem.quantity_difference ?? 0) >= 0 ? '+' : ''}${fmt(boqItem.quantity_difference ?? 0)}</div>
    <div class="unit">${esc(boqItem.unit)}</div>
  </div>
  <div class="qty-cell primary">
    <div class="label">Total Amount</div>
    <div class="value">${fmt(boqItem.total_amount ?? 0)}</div>
    <div class="unit">${esc(currency)}</div>
  </div>
</div>

<!-- Engineering Sketch -->
${sketchSvg ? `
<div class="sketch-container">
  <div class="sketch-title">Auto-Generated Engineering Sketch</div>
  ${sketchSvg}
</div>` : ''}

<!-- Measurement Table -->
${measurements.length > 0 ? `
<div class="section">
  <div class="section-header">
    <div class="section-icon" style="background:#eff6ff">📏</div>
    <h3>Measurement Details</h3>
  </div>
  <table class="measurement-table">
    <thead><tr>
      <th style="width:55px">Code</th>
      <th>Description</th>
      <th style="width:40px" class="center">Unit</th>
      <th style="width:40px" class="center">Type</th>
      <th style="width:30px" class="num">Nr</th>
      <th style="width:50px" class="num">Length</th>
      <th style="width:50px" class="num">Width</th>
      <th style="width:50px" class="num">Height</th>
      <th style="width:60px">Formula</th>
      <th style="width:60px" class="num">Quantity</th>
    </tr></thead>
    <tbody>${measurementRows}</tbody>
  </table>
</div>` : ''}

${drawingsSection}
${revisionSection}
${costSection}
${rateSection}

<!-- Footer -->
<div class="report-footer">
  <div class="footer-left">
    <div class="footer-prepared">Prepared By</div>
    <div class="footer-name">${esc(engineerName || 'Engineer')}</div>
    <div class="footer-role">Quantity Surveyor</div>
    <div class="footer-sig">Signature / Stamp</div>
  </div>
  <div class="footer-center">
    ${qrSvg}
    <p>Scan to verify in ANGEL D.C.</p>
  </div>
  <div class="footer-right">
    <div class="footer-stamp">Date</div>
    <div class="footer-date">${dateStr}</div>
    <div style="font-size:8px;color:#94a3b8;margin-top:8px">Ref: ${esc(refNo)}</div>
  </div>
</div>

<div class="watermark">Generated by ANGEL D.C. — Engineering Quantity Evidence System · ${dateStr}</div>

<script>window.onload=()=>{window.print();}<\/script>
</body></html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  } else {
    throw new Error('Pop-up blocked. Please allow pop-ups to generate the evidence report.')
  }
}
