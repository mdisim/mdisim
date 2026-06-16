import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

// GET /api/rebar/export?projectId=xxx
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const { data: project } = await supabase.from('projects').select('name').eq('id', projectId).single()

  type BarRow = {
    id: string
    bar_mark: string
    diameter_mm: number
    shape_code: string
    bending_dims: Record<string, number>
    cut_length_mm: number | null
    quantity: number
    unit_weight_kg_m: number | null
    total_weight_kg: number | null
    notes: string | null
  }
  type ElementRow = {
    element_mark: string
    element_type: string
    floor_level: string | null
    bars: BarRow[]
  }

  const { data: elements } = await supabase
    .from('rebar_elements')
    .select('element_mark, element_type, floor_level, bars:rebar_bars(id, bar_mark, diameter_mm, shape_code, bending_dims, cut_length_mm, quantity, unit_weight_kg_m, total_weight_kg, notes)')
    .eq('project_id', projectId)
    .order('sort_order')

  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Bar Bending Schedule ────────────────────────────────────────
  const bbsRows: unknown[][] = [
    ['BAR BENDING SCHEDULE', '', '', '', '', '', '', '', '', ''],
    ['Project:', project?.name ?? projectId, '', '', '', '', '', '', '', ''],
    ['Date:', new Date().toLocaleDateString('en-GB'), '', '', '', '', '', '', '', ''],
    [],
    [
      'Element', 'Type', 'Level',
      'Mark', 'Dia.', 'Shape',
      'A (mm)', 'B (mm)', 'C (mm)',
      'Qty', 'Cut L (mm)', 'Unit Wt (kg/m)', 'Total Wt (kg)',
      'Notes',
    ],
  ]

  let grandTotal = 0
  for (const el of (elements ?? []) as ElementRow[]) {
    for (const bar of (el.bars ?? [])) {
      const dims = bar.bending_dims ?? {}
      bbsRows.push([
        el.element_mark, el.element_type, el.floor_level ?? '',
        bar.bar_mark, `T${bar.diameter_mm}`, bar.shape_code,
        dims.A ?? '', dims.B ?? '', dims.C ?? '',
        bar.quantity,
        bar.cut_length_mm ?? '',
        bar.unit_weight_kg_m ?? '',
        bar.total_weight_kg ?? '',
        bar.notes ?? '',
      ])
      grandTotal += bar.total_weight_kg ?? 0
    }
  }
  bbsRows.push([])
  bbsRows.push(['', '', '', '', '', '', '', '', '', '', '', 'TOTAL (kg)', grandTotal.toFixed(3), ''])

  const bbsSheet = XLSX.utils.aoa_to_sheet(bbsRows)
  bbsSheet['!cols'] = [10,10,10,8,6,8,10,10,10,6,12,14,14,30].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, bbsSheet, 'BBS')

  // ── Sheet 2: Procurement by Diameter ────────────────────────────────────
  const diaMap = new Map<number, { bars: number; lengthMm: number; weightKg: number }>()
  for (const el of (elements ?? []) as ElementRow[]) {
    for (const bar of (el.bars ?? [])) {
      const d = bar.diameter_mm
      const existing = diaMap.get(d) ?? { bars: 0, lengthMm: 0, weightKg: 0 }
      existing.bars += bar.quantity
      existing.lengthMm += (bar.cut_length_mm ?? 0) * bar.quantity
      existing.weightKg += bar.total_weight_kg ?? 0
      diaMap.set(d, existing)
    }
  }

  const procRows: unknown[][] = [
    ['STEEL PROCUREMENT SUMMARY'],
    ['Project:', project?.name ?? projectId],
    ['Date:', new Date().toLocaleDateString('en-GB')],
    [],
    ['Diameter', 'Grade', 'Total Bars', 'Total Length (m)', 'Total Weight (kg)', 'Total Weight (t)', '% of Total'],
  ]

  for (const [d, row] of [...diaMap.entries()].sort((a, b) => a[0] - b[0])) {
    procRows.push([
      `T${d}`, 'B500B',
      row.bars,
      (row.lengthMm / 1000).toFixed(2),
      row.weightKg.toFixed(2),
      (row.weightKg / 1000).toFixed(3),
      grandTotal > 0 ? ((row.weightKg / grandTotal) * 100).toFixed(1) + '%' : '0%',
    ])
  }
  procRows.push([])
  procRows.push([
    'TOTAL', '',
    [...diaMap.values()].reduce((s, r) => s + r.bars, 0),
    ([...diaMap.values()].reduce((s, r) => s + r.lengthMm, 0) / 1000).toFixed(2),
    grandTotal.toFixed(2),
    (grandTotal / 1000).toFixed(3),
    '100%',
  ])

  const procSheet = XLSX.utils.aoa_to_sheet(procRows)
  procSheet['!cols'] = [10,8,12,16,18,16,12].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, procSheet, 'Procurement')

  // ── Output ───────────────────────────────────────────────────────────────
  const arr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as number[]
  const body = new Uint8Array(arr).buffer
  const filename = `BBS_${(project?.name ?? 'project').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
