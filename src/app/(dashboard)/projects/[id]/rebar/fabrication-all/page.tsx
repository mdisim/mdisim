import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PrintButton } from './print-button'

type Bar = {
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

type Element = {
  id: string
  element_mark: string
  element_type: string
  floor_level: string | null
  bars: Bar[]
}

// ─── Lightweight bar shape SVG (print-safe) ───────────────────────────────────
function BarShapeMini({ shapeCode, dims }: { shapeCode: string; dims: Record<string, number> }) {
  const W = 80, H = 50
  const stroke = '#1f2937'  // dark for print
  const sw = 2
  const shapes: Record<string, React.ReactNode> = {
    '00': <line x1={4} y1={H/2} x2={W-4} y2={H/2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />,
    '11': <polyline points={`4,${H-4} 4,4 ${W-4},4`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />,
    '21': <polyline points={`4,4 4,${H-4} ${W-4},${H-4} ${W-4},4`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />,
    '31': <polyline points={`4,4 ${W*0.4},4 ${W*0.6},${H-4} ${W-4},${H-4}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />,
    '41': <polyline points={`4,4 4,${H-4} ${W-4},${H-4} ${W-4},4`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />,
    '51': <><rect x={4} y={4} width={W-8} height={H-8} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" /><line x1={4} y1={4} x2={10} y2={1} stroke={stroke} strokeWidth={sw} /><line x1={W-4} y1={4} x2={W-2} y2={1} stroke={stroke} strokeWidth={sw} /></>,
    '60': <ellipse cx={W/2} cy={H/2} rx={W/2-4} ry={H/2-4} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray="4 2" />,
  }
  void dims
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {shapes[shapeCode] ?? shapes['00']}
    </svg>
  )
}

export default async function FabricationAllPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: rawElements }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase
      .from('rebar_elements')
      .select('id, element_mark, element_type, floor_level, bars:rebar_bars(id, bar_mark, diameter_mm, shape_code, bending_dims, cut_length_mm, quantity, unit_weight_kg_m, total_weight_kg, notes)')
      .eq('project_id', id)
      .order('sort_order'),
  ])

  if (!project) notFound()

  const elements = (rawElements ?? []) as Element[]

  // Procurement summary by diameter
  const diaMap = new Map<number, { bars: number; lengthMm: number; weightKg: number }>()
  let grandTotal = 0
  for (const el of elements) {
    for (const bar of el.bars ?? []) {
      const d = bar.diameter_mm
      const row = diaMap.get(d) ?? { bars: 0, lengthMm: 0, weightKg: 0 }
      row.bars += bar.quantity
      row.lengthMm += (bar.cut_length_mm ?? 0) * bar.quantity
      row.weightKg += bar.total_weight_kg ?? 0
      diaMap.set(d, row)
      grandTotal += bar.total_weight_kg ?? 0
    }
  }
  const diaRows = [...diaMap.entries()].sort((a, b) => a[0] - b[0])

  return (
    <div className="min-h-screen bg-white text-gray-900 print:bg-white">
      {/* Screen header */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-200 bg-slate-950 print:hidden">
        <Link href={`/projects/${id}/rebar`} className="text-slate-400 hover:text-slate-200 text-sm">
          ← Rebar Schedule
        </Link>
        <div className="w-px h-4 bg-slate-700" />
        <h1 className="text-base font-bold text-white">Full Project BBS — {project.name}</h1>
        <div className="ml-auto flex gap-2">
          <PrintButton />
        </div>
      </div>

      <div className="p-8 max-w-6xl mx-auto">

        {/* Project title block */}
        <div className="border-2 border-gray-400 p-4 mb-8">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="col-span-2">
              <p className="text-gray-500 text-xs uppercase tracking-wide">Project</p>
              <p className="font-bold text-xl">{project.name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Standard</p>
              <p className="font-semibold">BS 8666:2020</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Date</p>
              <p className="font-semibold">{new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-300 flex items-center gap-6 text-sm">
            <span>Steel grade: <strong>B500B</strong></span>
            <span>Elements: <strong>{elements.length}</strong></span>
            <span>Total bars: <strong>{elements.reduce((s, e) => s + (e.bars?.length ?? 0), 0)}</strong></span>
            <span className="ml-auto font-bold text-lg">TOTAL: {grandTotal.toFixed(3)} kg ({(grandTotal / 1000).toFixed(3)} t)</span>
          </div>
        </div>

        {/* Per-element sections */}
        {elements.map(el => {
          const elTotal = (el.bars ?? []).reduce((s, b) => s + (b.total_weight_kg ?? 0), 0)
          return (
            <div key={el.id} className="mb-10 break-inside-avoid-page">
              {/* Element header */}
              <div className="flex items-center gap-4 mb-2 pb-2 border-b-2 border-gray-400">
                <span className="text-xs uppercase tracking-wide text-gray-500">{el.element_type}</span>
                <span className="text-2xl font-bold">{el.element_mark}</span>
                {el.floor_level && <span className="text-gray-500 text-sm">{el.floor_level}</span>}
                <span className="ml-auto text-sm font-semibold">{elTotal.toFixed(3)} kg</span>
              </div>

              {/* Bar shapes row */}
              <div className="flex flex-wrap gap-3 mb-4">
                {(el.bars ?? []).map(bar => (
                  <div key={bar.id} className="border border-gray-300 rounded p-2 text-center w-28 shrink-0">
                    <div className="text-xs font-bold mb-1">Bar {bar.bar_mark}</div>
                    <BarShapeMini shapeCode={bar.shape_code} dims={bar.bending_dims ?? {}} />
                    <div className="text-xs text-gray-600 mt-1">
                      T{bar.diameter_mm} · {bar.shape_code}
                    </div>
                    <div className="text-xs text-gray-500">
                      {bar.quantity}№ {bar.cut_length_mm ? `L=${bar.cut_length_mm.toFixed(0)}` : ''}
                    </div>
                  </div>
                ))}
              </div>

              {/* BBS table */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    {['Mark','T','Shape','A (mm)','B (mm)','C (mm)','Qty','Cut L (mm)','Unit Wt','Total Wt (kg)','Notes'].map(h => (
                      <th key={h} className="border border-gray-300 px-2 py-1.5 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(el.bars ?? []).map(bar => (
                    <tr key={bar.id} className="border-t border-gray-200">
                      <td className="border border-gray-300 px-2 py-1.5 font-mono font-bold">{bar.bar_mark}</td>
                      <td className="border border-gray-300 px-2 py-1.5">T{bar.diameter_mm}</td>
                      <td className="border border-gray-300 px-2 py-1.5">{bar.shape_code}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{bar.bending_dims?.A ?? '—'}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{bar.bending_dims?.B ?? '—'}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{bar.bending_dims?.C ?? '—'}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{bar.quantity}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-mono">{bar.cut_length_mm?.toFixed(0) ?? '—'}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right text-gray-500">{bar.unit_weight_kg_m?.toFixed(4) ?? '—'}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right font-semibold">{bar.total_weight_kg?.toFixed(3) ?? '—'}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-gray-500 max-w-xs truncate">{bar.notes ?? ''}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={9} className="border border-gray-300 px-2 py-1.5 text-right text-gray-500">Element total</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-right">{elTotal.toFixed(3)}</td>
                    <td className="border border-gray-300" />
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })}

        {/* Procurement summary */}
        <div className="mt-8 break-before-page">
          <h2 className="text-lg font-bold border-b-2 border-gray-400 pb-2 mb-4">Steel Procurement Summary</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                {['Diameter','Grade','Total Bars','Total Length (m)','Total Weight (kg)','Total Weight (t)','% of Total'].map(h => (
                  <th key={h} className="border border-gray-300 px-3 py-2 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diaRows.map(([d, row]) => (
                <tr key={d} className="border-t border-gray-200">
                  <td className="border border-gray-300 px-3 py-1.5 font-mono font-bold">T{d}</td>
                  <td className="border border-gray-300 px-3 py-1.5">B500B</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right">{row.bars}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right">{(row.lengthMm / 1000).toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right font-semibold">{row.weightKg.toFixed(2)}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right">{(row.weightKg / 1000).toFixed(3)}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right">
                    {grandTotal > 0 ? ((row.weightKg / grandTotal) * 100).toFixed(1) : '0'}%
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td colSpan={2} className="border border-gray-300 px-3 py-2">TOTAL</td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {diaRows.reduce((s, [, r]) => s + r.bars, 0)}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {(diaRows.reduce((s, [, r]) => s + r.lengthMm, 0) / 1000).toFixed(2)}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">{grandTotal.toFixed(2)}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">{(grandTotal / 1000).toFixed(3)}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-xs text-gray-400 text-center">
          Generated by ANGEL D.C. Construction Management · BS 8666:2020 · {new Date().toLocaleDateString('en-GB')}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A3 landscape; margin: 15mm; }
          .print\\:hidden { display: none !important; }
          body { background: white !important; color: black !important; font-size: 10pt; }
          h1, h2 { break-after: avoid; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>
    </div>
  )
}
