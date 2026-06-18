import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { summarizeByDiameter } from '@/lib/rebar-calc'

const TABS = [
  { label: 'Schedule', href: '' },
  { label: 'Fabrication', href: '/fabrication-all' },
  { label: 'Marked Drawing', href: '/marked-drawing' },
  { label: 'Procurement', href: '/procurement' },
  { label: 'BBS Package', href: '/bbs-package' },
] as const

export default async function RebarProcurementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: elements }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase
      .from('rebar_elements')
      .select('id, element_mark, element_type, floor_level, bars:rebar_bars(diameter_mm, quantity, cut_length_mm, total_weight_kg)')
      .eq('project_id', id),
  ])

  if (!project) notFound()

  type Bar = { diameter_mm: number; quantity: number; cut_length_mm: number | null; total_weight_kg: number | null }
  type Elem = { id: string; element_mark: string; element_type: string; floor_level: string | null; bars: Bar[] }

  const allBars = (elements ?? []).flatMap((e: Elem) => e.bars ?? [])
  const summary = summarizeByDiameter(allBars)
  const grandTotal = summary.reduce((s, d) => s + d.totalWeightKg, 0)

  // Per-element subtotals
  const elementRows = (elements ?? []).map((el: Elem) => ({
    ...el,
    weight: (el.bars ?? []).reduce((s: number, b: Bar) => s + (b.total_weight_kg ?? 0), 0),
  })).sort((a, b) => b.weight - a.weight)

  const basePath = `/projects/${id}/rebar`

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Steel Procurement Summary</h1>
            <p className="text-sm text-slate-400">{project.name}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="overflow-x-auto scrollbar-none -mx-4 sm:-mx-6 px-4 sm:px-6">
          <nav className="flex gap-1 min-w-max snap-x snap-mandatory" role="tablist">
            {TABS.map((tab) => {
              const isActive = tab.href === '/procurement'
              return (
                <Link
                  key={tab.label}
                  href={`${basePath}${tab.href}`}
                  role="tab"
                  aria-selected={isActive}
                  className={`snap-start px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-white border-b-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-8">
        {/* Summary by diameter */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Summary by Diameter</h2>
          {summary.length === 0 ? (
            <p className="text-slate-600 text-sm">No bars defined yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 text-xs">
                    <th className="text-left px-4 py-2 font-medium">Diameter</th>
                    <th className="text-right px-4 py-2 font-medium">Total Bars</th>
                    <th className="text-right px-4 py-2 font-medium">Total Length (m)</th>
                    <th className="text-right px-4 py-2 font-medium">Total Weight (kg)</th>
                    <th className="text-right px-4 py-2 font-medium">Weight (t)</th>
                    <th className="text-right px-4 py-2 font-medium">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map(row => (
                    <tr key={row.diameterMm} className="border-t border-slate-800">
                      <td className="px-4 py-2 text-blue-300 font-bold">T{row.diameterMm}</td>
                      <td className="px-4 py-2 text-right text-slate-300">{row.totalBars}</td>
                      <td className="px-4 py-2 text-right text-slate-300">{(row.totalLengthMm / 1000).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-green-400 font-semibold">{row.totalWeightKg.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-green-400">{(row.totalWeightKg / 1000).toFixed(3)}</td>
                      <td className="px-4 py-2 text-right text-slate-400">
                        {grandTotal > 0 ? ((row.totalWeightKg / grandTotal) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-600 bg-slate-900 font-bold">
                    <td className="px-4 py-2 text-white">TOTAL</td>
                    <td className="px-4 py-2 text-right text-white">{summary.reduce((s, r) => s + r.totalBars, 0)}</td>
                    <td className="px-4 py-2 text-right text-white">{(summary.reduce((s, r) => s + r.totalLengthMm, 0) / 1000).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-green-300">{grandTotal.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-green-300">{(grandTotal / 1000).toFixed(3)}</td>
                    <td className="px-4 py-2 text-right text-slate-400">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* By element */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Weight by Element</h2>
          {elementRows.length === 0 ? (
            <p className="text-slate-600 text-sm">No elements defined.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 text-xs">
                    <th className="text-left px-4 py-2 font-medium">Mark</th>
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-left px-4 py-2 font-medium">Level</th>
                    <th className="text-right px-4 py-2 font-medium">Weight (kg)</th>
                    <th className="text-right px-4 py-2 font-medium">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {elementRows.map(el => (
                    <tr key={el.id} className="border-t border-slate-800">
                      <td className="px-4 py-2 font-mono font-bold text-white">
                        <Link href={`/projects/${id}/rebar/${el.id}`} className="hover:text-blue-400 transition-colors">
                          {el.element_mark}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-blue-400 capitalize">{el.element_type}</td>
                      <td className="px-4 py-2 text-slate-400">{el.floor_level ?? '—'}</td>
                      <td className="px-4 py-2 text-right text-green-400">{el.weight.toFixed(3)}</td>
                      <td className="px-4 py-2 text-right text-slate-400">
                        {grandTotal > 0 ? ((el.weight / grandTotal) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
