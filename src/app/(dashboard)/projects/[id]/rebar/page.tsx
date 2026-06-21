import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { RebarScheduleClient } from './rebar-schedule-client'
import { summarizeByDiameter } from '@/lib/rebar-calc'

const TABS = [
  { label: 'Schedule', href: '' },
  { label: 'Fabrication', href: '/fabrication-all' },
  { label: 'Marked Drawing', href: '/marked-drawing' },
  { label: 'Procurement', href: '/procurement' },
  { label: 'BBS Package', href: '/bbs-package' },
] as const

export default async function RebarSchedulePage({
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
      .select('*, bars:rebar_bars(*)')
      .eq('project_id', id)
      .order('sort_order'),
  ])

  if (!project) notFound()

  const basePath = `/projects/${id}/rebar`
  const els = elements ?? []

  // ── Compute stats server-side ──────────────────────────────────────────
  const allBars = els.flatMap((e) => e.bars ?? [])
  const totalWeight = allBars.reduce((s, b) => s + (b.total_weight_kg ?? 0), 0)
  const totalBars = allBars.reduce((s, b) => s + (b.quantity ?? 0), 0)
  const uniqueMarks = new Set(allBars.map((b) => b.bar_mark)).size
  const totalElements = els.length
  const diametersUsed = new Set(allBars.map((b) => b.diameter_mm))
  const totalLengthMm = allBars.reduce(
    (s, b) => s + (b.cut_length_mm ?? 0) * (b.quantity ?? 0),
    0
  )
  const totalLengthM = totalLengthMm / 1000

  const diameterSummary = summarizeByDiameter(allBars)
  const maxDiamWeight = Math.max(...diameterSummary.map((d) => d.totalWeightKg), 1)

  // Weight by element type
  const weightByType = new Map<string, number>()
  for (const el of els) {
    const w = (el.bars ?? []).reduce(
      (s: number, b: { total_weight_kg: number | null }) =>
        s + (b.total_weight_kg ?? 0),
      0
    )
    weightByType.set(el.element_type, (weightByType.get(el.element_type) ?? 0) + w)
  }
  const elementTypeSummary = Array.from(weightByType.entries())
    .map(([type, weight]) => ({ type, weight }))
    .sort((a, b) => b.weight - a.weight)
  const maxTypeWeight = Math.max(...elementTypeSummary.map((e) => e.weight), 1)

  // ── Stat cards data ────────────────────────────────────────────────────
  const stats = [
    {
      label: 'Total Weight',
      value: totalWeight >= 1000 ? `${(totalWeight / 1000).toFixed(1)} t` : `${totalWeight.toFixed(0)} kg`,
      sub: totalWeight >= 1000 ? `${totalWeight.toFixed(0)} kg` : `${(totalWeight / 1000).toFixed(2)} t`,
      color: 'text-blue-400',
    },
    {
      label: 'Total Bars',
      value: totalBars.toLocaleString(),
      sub: `across ${els.length} elements`,
      color: 'text-emerald-400',
    },
    {
      label: 'Bar Marks',
      value: uniqueMarks.toString(),
      sub: 'unique marks',
      color: 'text-amber-400',
    },
    {
      label: 'Elements',
      value: totalElements.toString(),
      sub: `${weightByType.size} types`,
      color: 'text-purple-400',
    },
    {
      label: 'Diameters Used',
      value: diametersUsed.size.toString(),
      sub: diametersUsed.size
        ? `${[...diametersUsed].sort((a, b) => a - b).map((d) => `Ø${d}`).join(', ')}`
        : 'none',
      color: 'text-rose-400',
    },
    {
      label: 'Total Length',
      value: totalLengthM >= 1000 ? `${(totalLengthM / 1000).toFixed(1)} km` : `${totalLengthM.toFixed(0)} m`,
      sub: `${(totalLengthMm / 1e6).toFixed(2)} km`,
      color: 'text-cyan-400',
    },
  ]

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Rebar Dashboard</h1>
            <p className="text-sm text-slate-400">{project.name}</p>
          </div>
        </div>

        {/* Quick-access toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Link
            href={`/projects/${id}/rebar/extract`}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors font-semibold shadow-sm"
          >
            Extract from Drawing
          </Link>
          <a
            href={`/api/rebar/export?projectId=${id}`}
            className="px-4 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors font-medium"
          >
            Export Excel
          </a>
          <a
            href={`/api/rebar/export-bbs?projectId=${id}`}
            className="px-4 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors font-medium"
          >
            Export BBS PDF
          </a>
          <Link
            href={`/projects/${id}/rebar/procurement`}
            className="px-4 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors font-medium"
          >
            Procurement Summary
          </Link>
        </div>

        {/* Tab bar */}
        <div className="overflow-x-auto scrollbar-none -mx-4 sm:-mx-6 px-4 sm:px-6">
          <nav className="flex gap-1 min-w-max border-b border-slate-800" role="tablist">
            {TABS.map((tab) => {
              const isActive = tab.href === ''
              return (
                <Link
                  key={tab.label}
                  href={`${basePath}${tab.href}`}
                  role="tab"
                  aria-selected={isActive}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap relative ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-t-lg'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Dashboard Section */}
      <div className="overflow-y-auto flex-1">
        <div className="px-4 sm:px-6 py-6 space-y-6">

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4"
              >
                <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Weight by Diameter */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">
                Weight by Diameter
              </h3>
              {diameterSummary.length === 0 ? (
                <p className="text-sm text-slate-500">No bar data yet</p>
              ) : (
                <div className="space-y-2.5">
                  {diameterSummary.map((d) => (
                    <div key={d.diameterMm} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-10 text-right font-mono">
                        {'Ø'}{d.diameterMm}
                      </span>
                      <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-blue-500/80 rounded-full transition-all"
                          style={{ width: `${(d.totalWeightKg / maxDiamWeight) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-300 w-20 text-right font-mono">
                        {d.totalWeightKg.toFixed(0)} kg
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weight by Element Type */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">
                Weight by Element Type
              </h3>
              {elementTypeSummary.length === 0 ? (
                <p className="text-sm text-slate-500">No elements yet</p>
              ) : (
                <div className="space-y-2.5">
                  {elementTypeSummary.map((e) => (
                    <div key={e.type} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-16 text-right capitalize">
                        {e.type}
                      </span>
                      <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500/80 rounded-full transition-all"
                          style={{ width: `${(e.weight / maxTypeWeight) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-300 w-20 text-right font-mono">
                        {e.weight.toFixed(0)} kg
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Schedule Section */}
          <div className="border-t border-slate-800 pt-6">
            <h2 className="text-lg font-semibold text-white mb-4">Rebar Schedule</h2>
          </div>
        </div>

        <RebarScheduleClient
          projectId={id}
          initialElements={els}
        />
      </div>
    </div>
  )
}
