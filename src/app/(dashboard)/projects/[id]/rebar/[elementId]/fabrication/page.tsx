import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PrintButton } from '../../fabrication-all/print-button'

// ─── SVG bar shape renderers ──────────────────────────────────────────────────
function BarShapeSVG({
  shapeCode,
  dims,
  diameter,
}: {
  shapeCode: string
  dims: Record<string, number>
  diameter: number
}) {
  const W = 200
  const H = 120
  const stroke = '#f59e0b'
  const sw = Math.max(2, diameter / 4)
  const label = (x: number, y: number, text: string) => (
    <text x={x} y={y} fontSize={10} fill="#94a3b8" textAnchor="middle">{text}</text>
  )

  const shapes: Record<string, React.ReactNode> = {
    '00': (
      <g>
        <line x1={10} y1={H/2} x2={W-10} y2={H/2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        {dims.A && label(W/2, H/2-10, `A=${dims.A}`)}
      </g>
    ),
    '11': (
      <g>
        <polyline points={`10,${H-15} 10,15 ${W-10},15`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
        {dims.A && label(10-18, H/2, `A=${dims.A}`)}
        {dims.B && label(W/2, 8, `B=${dims.B}`)}
      </g>
    ),
    '21': (
      <g>
        <polyline points={`10,15 10,${H-15} ${W-10},${H-15} ${W-10},15`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
        {dims.A && label(W/2, H-8, `A=${dims.A}`)}
        {dims.B && label(18, H/2, `B=${dims.B}`)}
      </g>
    ),
    '31': (
      <g>
        <polyline points={`10,15 ${W*0.4},15 ${W*0.6},${H-15} ${W-10},${H-15}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
        {dims.A && label(W*0.2, 8, `A=${dims.A}`)}
        {dims.B && label(W/2, H/2, `B`)}
        {dims.C && label(W*0.8, H-8, `C=${dims.C}`)}
      </g>
    ),
    '41': (
      <g>
        <polyline points={`10,15 10,${H-15} ${W-10},${H-15} ${W-10},15`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
        {dims.A && label(W/2, H-8, `A=${dims.A}`)}
        {dims.B && label(18, H/2, `B=${dims.B}`)}
      </g>
    ),
    '51': (
      <g>
        <rect x={15} y={15} width={W-30} height={H-30} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <line x1={15} y1={15} x2={30} y2={5} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <line x1={W-15} y1={15} x2={W-5} y2={5} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        {dims.A && label(W/2, H-4, `A=${dims.A}`)}
        {dims.B && label(6, H/2, `B=${dims.B}`)}
      </g>
    ),
    '60': (
      <g>
        <ellipse cx={W/2} cy={H/2} rx={W/2-15} ry={H/2-15} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray="6 3" />
        {dims.B && label(W/2, H/2+4, `Ø${dims.B}`)}
        {dims.A && label(W/2, H-4, `p=${dims.A}`)}
      </g>
    ),
  }

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="bg-slate-800/50 rounded">
      {shapes[shapeCode] ?? shapes['00']}
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function FabricationPage({
  params,
}: {
  params: Promise<{ id: string; elementId: string }>
}) {
  const { id, elementId } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: element }, { data: bars }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('rebar_elements').select('*').eq('id', elementId).single(),
    supabase.from('rebar_bars').select('*').eq('element_id', elementId).order('sort_order').order('bar_mark'),
  ])

  if (!project || !element) notFound()

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
  const totalWeight = (bars ?? []).reduce((s: number, b: Bar) => s + (b.total_weight_kg ?? 0), 0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Screen header — hidden on print */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-800 print:hidden">
        <Link href={`/projects/${id}/rebar/${elementId}`} className="text-slate-500 hover:text-slate-300 text-sm">
          ← BBS Editor
        </Link>
        <div className="w-px h-4 bg-slate-700" />
        <h1 className="text-lg font-bold text-white">Fabrication Drawing</h1>
        <div className="ml-auto flex gap-2">
          <PrintButton />
        </div>
      </div>

      {/* Printable area */}
      <div className="p-8 max-w-5xl mx-auto">
        {/* Title block */}
        <div className="border-2 border-slate-600 p-4 mb-6 print:border-gray-400">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs">PROJECT</p>
              <p className="font-bold text-white">{project.name}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">ELEMENT</p>
              <p className="font-bold text-amber-400 text-xl">
                {(element.element_type ?? 'ELEMENT').toUpperCase()} {element.element_mark}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">LEVEL / DATE</p>
              <p className="text-white">{element.floor_level ?? '—'}</p>
              <p className="text-slate-400 text-xs">{new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-3 gap-4 text-xs text-slate-400">
            <span>Standard: BS 8666:2020</span>
            <span>Steel grade: B500B</span>
            <span>Total weight: <strong className="text-green-400">{totalWeight.toFixed(3)} kg</strong></span>
          </div>
        </div>

        {/* Bar shapes grid */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Bar Shapes</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {(bars ?? []).map((bar: Bar) => (
            <div key={bar.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 print:border-gray-300 print:bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-white text-lg">Bar {bar.bar_mark}</span>
                <span className="text-amber-300 text-sm">T{bar.diameter_mm}</span>
              </div>
              <BarShapeSVG shapeCode={bar.shape_code} dims={bar.bending_dims ?? {}} diameter={bar.diameter_mm} />
              <div className="mt-2 grid grid-cols-2 gap-x-3 text-xs text-slate-400">
                <span>Shape: <strong className="text-slate-200">{bar.shape_code}</strong></span>
                <span>Qty: <strong className="text-slate-200">{bar.quantity}</strong></span>
                {bar.cut_length_mm && <span>Cut L: <strong className="text-slate-200">{bar.cut_length_mm.toFixed(0)} mm</strong></span>}
                {bar.total_weight_kg && <span>Wt: <strong className="text-green-400">{bar.total_weight_kg.toFixed(3)} kg</strong></span>}
              </div>
              {bar.notes && <p className="text-xs text-slate-600 mt-1 truncate">{bar.notes}</p>}
            </div>
          ))}
        </div>

        {/* BBS Table */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Bar Bending Schedule</h2>
        <table className="w-full text-xs border-collapse border border-slate-700 print:border-gray-400">
          <thead>
            <tr className="bg-slate-800 print:bg-gray-100">
              {['Mark','Dia.','Shape','A (mm)','B (mm)','C (mm)','Qty','Cut L (mm)','Unit Wt (kg/m)','Total Wt (kg)'].map(h => (
                <th key={h} className="border border-slate-700 print:border-gray-400 px-2 py-1.5 text-left font-semibold text-slate-300 print:text-gray-800">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(bars ?? []).map((bar: Bar) => (
              <tr key={bar.id} className="border-t border-slate-700 print:border-gray-300">
                <td className="border border-slate-700 print:border-gray-300 px-2 py-1.5 font-mono font-bold text-white print:text-black">{bar.bar_mark}</td>
                <td className="border border-slate-700 print:border-gray-300 px-2 py-1.5 text-amber-300 print:text-black">T{bar.diameter_mm}</td>
                <td className="border border-slate-700 print:border-gray-300 px-2 py-1.5 text-slate-300 print:text-black">{bar.shape_code}</td>
                <td className="border border-slate-700 print:border-gray-300 px-2 py-1.5 text-right text-slate-300 print:text-black">{bar.bending_dims?.A ?? '—'}</td>
                <td className="border border-slate-700 print:border-gray-300 px-2 py-1.5 text-right text-slate-300 print:text-black">{bar.bending_dims?.B ?? '—'}</td>
                <td className="border border-slate-700 print:border-gray-300 px-2 py-1.5 text-right text-slate-300 print:text-black">{bar.bending_dims?.C ?? '—'}</td>
                <td className="border border-slate-700 print:border-gray-300 px-2 py-1.5 text-right text-slate-300 print:text-black">{bar.quantity}</td>
                <td className="border border-slate-700 print:border-gray-300 px-2 py-1.5 text-right font-mono text-slate-200 print:text-black">{bar.cut_length_mm?.toFixed(0) ?? '—'}</td>
                <td className="border border-slate-700 print:border-gray-300 px-2 py-1.5 text-right text-slate-400 print:text-black">{bar.unit_weight_kg_m?.toFixed(4) ?? '—'}</td>
                <td className="border border-slate-700 print:border-gray-300 px-2 py-1.5 text-right text-green-400 font-semibold print:text-black">{bar.total_weight_kg?.toFixed(3) ?? '—'}</td>
              </tr>
            ))}
            <tr className="bg-slate-900 print:bg-gray-50 font-bold border-t-2 border-slate-600">
              <td colSpan={9} className="px-2 py-2 text-right text-slate-400 print:text-gray-600">TOTAL</td>
              <td className="px-2 py-2 text-right text-green-400 font-bold print:text-black">{totalWeight.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-8 text-xs text-slate-600 print:text-gray-400 text-center">
          Generated by ANGEL D.C. Construction Management Platform · BS 8666:2020 · {new Date().toLocaleDateString('en-GB')}
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:border-gray-400 { border-color: #9ca3af !important; }
          .print\\:border-gray-300 { border-color: #d1d5db !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:bg-gray-100 { background: #f3f4f6 !important; }
          .print\\:bg-gray-50 { background: #f9fafb !important; }
          .print\\:text-black { color: black !important; }
          .print\\:text-gray-800 { color: #1f2937 !important; }
          .print\\:text-gray-600 { color: #4b5563 !important; }
          .print\\:text-gray-400 { color: #9ca3af !important; }
          svg { filter: invert(1) !important; }
        }
      `}</style>
    </div>
  )
}
