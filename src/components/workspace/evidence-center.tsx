'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useWorkspace } from './workspace-context'
import { generateEvidenceReport } from '@/lib/export/evidence-report'
import { getProfile } from '@/app/actions/profile'
import { getProject } from '@/app/actions/projects'
import { useParams } from 'next/navigation'
import {
  FileSpreadsheet, Ruler, ImageIcon, DollarSign,
  GitCompare, ArrowRight, Hash, Calculator, Package,
  TrendingUp, TrendingDown, Info, Sparkles,
  Activity, Layers, Eye, BarChart3, ChevronRight,
  Clock, Users, Truck, Hammer, CreditCard,
  FileDown, Loader2,
} from 'lucide-react'

function SectionTitle({ icon: Icon, title, count, color }: {
  icon: typeof Info; title: string; count?: number; color: string
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/[0.04]">
      <Icon size={12} className={color} />
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{title}</span>
      {count != null && count > 0 && (
        <span className="ml-auto text-[9px] tabular-nums bg-slate-100 dark:bg-white/[0.06] text-slate-400 px-1.5 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  )
}

function PropRow({ label, value, mono, accent }: {
  label: string; value: string | number | null | undefined; mono?: boolean; accent?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-1.5">
      <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">{label}</span>
      <span className={cn(
        'text-[11px] text-right break-words',
        mono && 'font-mono tabular-nums',
        accent ?? 'text-slate-700 dark:text-slate-200',
      )}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium', color)}>
      {children}
    </span>
  )
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  submitted: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
  approved: 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  withdrawn: 'bg-slate-100 dark:bg-white/[0.06] text-slate-400',
  draft: 'bg-slate-100 dark:bg-white/[0.06] text-slate-500',
  checked: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600',
  paid: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600',
}

const CHANGE_TYPE_COLORS: Record<string, string> = {
  revision: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600',
  correction: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600',
  variation: 'bg-purple-100 dark:bg-purple-500/10 text-purple-600',
  remeasurement: 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600',
}

const RESOURCE_ICONS = {
  material: Package,
  labor: Users,
  equipment: Truck,
  subcontractor: Hammer,
} as const

export function EvidenceCenter() {
  const { id: projectId } = useParams<{ id: string }>()
  const {
    data, selection, linkedMeasurements, linkedRateAnalysis,
    linkedSourceDrawings, linkedQuantityChanges, linkedVariations,
    linkedPayments, linkedCostEntries, linkedDrawingMeasurements,
    fmt, selectMeasurement, selectDrawing,
  } = useWorkspace()

  const item = selection.boqItem
  const [generating, setGenerating] = useState(false)

  const handleGenerateReport = async () => {
    if (!item) return
    setGenerating(true)
    try {
      const [profileData, project] = await Promise.all([
        getProfile(),
        getProject(projectId),
      ])
      const company = profileData?.profile?.companies ?? null
      const engineerName = profileData?.profile?.full_name ?? ''
      const currency = project?.currency ?? 'USD'

      generateEvidenceReport({
        boqItem: item,
        projectName: project?.name ?? 'Project',
        measurements: linkedMeasurements,
        sourceDrawings: linkedSourceDrawings,
        quantityChanges: linkedQuantityChanges,
        rateAnalysis: linkedRateAnalysis,
        costEntries: linkedCostEntries,
        payments: linkedPayments,
        drawingMeasurements: linkedDrawingMeasurements,
        company,
        engineerName,
        currency,
      })
    } catch {
      // Pop-up blocked or other error — silent
    } finally {
      setGenerating(false)
    }
  }

  const allLines = useMemo(() =>
    linkedMeasurements.flatMap(m => m.lines ?? []),
    [linkedMeasurements]
  )

  const costBreakdown = useMemo(() => {
    if (!item) return null
    const mat = item.material_rate ?? 0
    const lab = item.labor_rate ?? 0
    const equip = item.equipment_rate ?? 0
    const total = mat + lab + equip
    if (total === 0) return null
    return { mat, lab, equip, total }
  }, [item])

  const groupedResources = useMemo(() => {
    if (!linkedRateAnalysis?.resources?.length) return null
    const groups: Record<string, typeof linkedRateAnalysis.resources> = {}
    for (const r of linkedRateAnalysis.resources) {
      ;(groups[r.resource_type] ??= []).push(r)
    }
    return groups
  }, [linkedRateAnalysis])

  if (!item) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#0f1117] overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-200/60 dark:border-white/[0.04]">
          <div className="flex items-center gap-2">
            <Layers size={13} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em]">Evidence Center</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center mb-3">
            <FileSpreadsheet size={22} className="text-blue-400 dark:text-blue-500" />
          </div>
          <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Select a BOQ Item</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[200px] leading-relaxed">
            Click any BOQ item to see its complete engineering evidence.
          </p>
        </div>
      </div>
    )
  }

  const totalCostEntries = linkedCostEntries.reduce((s, c) => s + c.amount, 0)
  const progressPct = linkedPayments.contractAmount > 0
    ? Math.min(100, (linkedPayments.totalCertified / linkedPayments.contractAmount) * 100)
    : 0

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0f1117] overflow-hidden">
      <div className="px-3 py-2.5 border-b border-slate-200/60 dark:border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Layers size={13} className="text-blue-500" />
          <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-[0.08em]">Evidence Center</span>
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="ml-auto flex items-center gap-1 px-2 py-1 text-[9px] font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-60"
          >
            {generating ? <Loader2 size={10} className="animate-spin" /> : <FileDown size={10} />}
            Evidence Report
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
            {/* 1. Header */}
            <div className="px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shrink-0">
                  <FileSpreadsheet size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-slate-400 mb-0.5">{item.code ?? '—'}</div>
                  <div className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{item.description}</div>
                  <div className="flex gap-1.5 mt-2">
                    {item.section && (
                      <Badge color="bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                        <Package size={8} className="mr-1" />{item.section}
                      </Badge>
                    )}
                    <Badge color="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">{item.unit}</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Quantity & Formula */}
            <div>
              <SectionTitle icon={Hash} title="Quantity & Formula" color="text-blue-500" />
              <div className="px-4 py-3">
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-blue-50/80 dark:bg-blue-500/5 rounded-lg p-2.5 border border-blue-100 dark:border-blue-500/10">
                    <div className="text-[9px] text-blue-500 uppercase tracking-wider font-bold">Current Qty</div>
                    <div className="text-[16px] font-bold tabular-nums text-blue-700 dark:text-blue-300 mt-0.5">{fmt(item.quantity)}</div>
                    <div className="text-[9px] text-blue-400">{item.unit}</div>
                  </div>
                  {item.total_amount != null && (
                    <div className="bg-emerald-50/80 dark:bg-emerald-500/5 rounded-lg p-2.5 border border-emerald-100 dark:border-emerald-500/10">
                      <div className="text-[9px] text-emerald-500 uppercase tracking-wider font-bold">Total Amount</div>
                      <div className="text-[16px] font-bold tabular-nums text-emerald-700 dark:text-emerald-300 mt-0.5">{fmt(item.total_amount)}</div>
                      {item.unit_rate != null && <div className="text-[9px] text-emerald-400">@ {fmt(item.unit_rate)}/{item.unit}</div>}
                    </div>
                  )}
                </div>

                {(item.original_quantity != null || item.revised_quantity != null) && (
                  <div className="space-y-1 mb-2">
                    {item.original_quantity != null && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Original</span>
                        <span className="tabular-nums text-slate-600 dark:text-slate-300">{fmt(item.original_quantity)}</span>
                      </div>
                    )}
                    {item.revised_quantity != null && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Revised</span>
                        <span className="tabular-nums text-slate-600 dark:text-slate-300">{fmt(item.revised_quantity)}</span>
                      </div>
                    )}
                    {item.quantity_difference != null && item.quantity_difference !== 0 && (
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Difference</span>
                        <span className={cn(
                          'tabular-nums font-medium flex items-center gap-0.5',
                          item.quantity_difference > 0 ? 'text-green-600' : 'text-red-500'
                        )}>
                          {item.quantity_difference > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {item.quantity_difference > 0 ? '+' : ''}{fmt(item.quantity_difference)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {allLines.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-200/60 dark:border-white/[0.06] overflow-hidden">
                    <div className="bg-slate-50 dark:bg-white/[0.02] px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Calculator size={9} />
                      Calculation Lines ({allLines.length})
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      {allLines.map((l, i) => (
                        <div key={l.id} className={cn(
                          'flex items-center gap-1.5 px-3 py-1 text-[10px] border-t border-slate-100/50 dark:border-white/[0.02]',
                          l.is_deduction && 'bg-red-50/50 dark:bg-red-500/5'
                        )}>
                          <span className="w-4 text-center text-slate-300 font-mono text-[9px]">{i + 1}</span>
                          <span className="flex-1 truncate text-slate-500">{l.description || '—'}</span>
                          <span className="tabular-nums text-slate-400 text-[9px] shrink-0">
                            {[l.nr, l.length, l.width, l.height].filter(v => v != null).join(' × ')}
                          </span>
                          <span className={cn(
                            'tabular-nums font-medium w-14 text-right shrink-0',
                            l.is_deduction ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'
                          )}>
                            {l.is_deduction ? '-' : ''}{fmt(l.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Linked Measurements */}
            {linkedMeasurements.length > 0 && (
              <div>
                <SectionTitle icon={Ruler} title="Linked Measurements" count={linkedMeasurements.length} color="text-cyan-500" />
                {linkedMeasurements.map(m => (
                  <button
                    key={m.id}
                    onClick={() => selectMeasurement(m)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-cyan-50/50 dark:hover:bg-cyan-500/5 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center shrink-0">
                      <Ruler size={12} className="text-cyan-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-slate-700 dark:text-slate-200 truncate">{m.description}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge color="bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">{m.measurement_type}</Badge>
                        <span className="text-[10px] tabular-nums text-slate-400">{fmt(m.net_qty)} {m.unit}</span>
                        {(m.lines?.length ?? 0) > 0 && (
                          <span className="text-[9px] text-slate-400">{m.lines!.length} lines</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* 4. Source Drawings */}
            {linkedSourceDrawings.length > 0 && (
              <div>
                <SectionTitle icon={ImageIcon} title="Source Drawings" count={linkedSourceDrawings.length} color="text-indigo-500" />
                {linkedSourceDrawings.map(d => (
                  <button
                    key={d.id}
                    onClick={() => selectDrawing(d)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <ImageIcon size={12} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] text-slate-700 dark:text-slate-200 truncate">{d.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-400">{d.drawing_number ?? '—'}</span>
                        <Badge color="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{d.drawing_type}</Badge>
                        <Badge color="bg-slate-100 dark:bg-white/[0.06] text-slate-500">{d.file_type?.toUpperCase()}</Badge>
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* 5. Revision History */}
            {linkedQuantityChanges.length > 0 && (
              <div>
                <SectionTitle icon={GitCompare} title="Revision History" count={linkedQuantityChanges.length} color="text-amber-500" />
                <div className="px-4 py-2 space-y-2">
                  {linkedQuantityChanges.map(qc => (
                    <div key={qc.id} className="rounded-lg border border-slate-100 dark:border-white/[0.06] p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-slate-700 dark:text-slate-200 truncate flex-1">{qc.description}</span>
                        <Badge color={CHANGE_TYPE_COLORS[qc.change_type] ?? 'bg-slate-100 dark:bg-white/[0.06] text-slate-500'}>
                          {qc.change_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] tabular-nums">
                        <span className="text-slate-400">{fmt(qc.previous_qty)}</span>
                        <ArrowRight size={10} className="text-slate-300" />
                        <span className="text-slate-700 dark:text-slate-200 font-medium">{fmt(qc.new_qty)}</span>
                        <span className={cn(
                          'ml-auto font-medium',
                          qc.difference > 0 ? 'text-green-600' : qc.difference < 0 ? 'text-red-500' : 'text-slate-400'
                        )}>
                          {qc.difference > 0 ? '+' : ''}{fmt(qc.difference)} {qc.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Cost Breakdown */}
            {costBreakdown && (
              <div>
                <SectionTitle icon={DollarSign} title="Cost Breakdown" color="text-emerald-500" />
                <div className="px-4 py-3">
                  <div className="h-3 rounded-full overflow-hidden flex mb-3">
                    <div className="bg-blue-500 transition-all" style={{ width: `${(costBreakdown.mat / costBreakdown.total) * 100}%` }} />
                    <div className="bg-amber-500 transition-all" style={{ width: `${(costBreakdown.lab / costBreakdown.total) * 100}%` }} />
                    <div className="bg-violet-500 transition-all" style={{ width: `${(costBreakdown.equip / costBreakdown.total) * 100}%` }} />
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Material', value: costBreakdown.mat, color: 'bg-blue-500' },
                      { label: 'Labor', value: costBreakdown.lab, color: 'bg-amber-500' },
                      { label: 'Equipment', value: costBreakdown.equip, color: 'bg-violet-500' },
                    ].map(c => (
                      <div key={c.label} className="flex items-center gap-2 text-[11px]">
                        <div className={cn('w-2 h-2 rounded-full', c.color)} />
                        <span className="text-slate-500 flex-1">{c.label}</span>
                        <span className="tabular-nums text-slate-400 text-[10px]">{((c.value / costBreakdown.total) * 100).toFixed(0)}%</span>
                        <span className="tabular-nums text-slate-700 dark:text-slate-200 font-medium w-20 text-right">{fmt(c.value)}</span>
                      </div>
                    ))}
                  </div>
                  {totalCostEntries > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Actual Spent</span>
                        <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200">{fmt(totalCostEntries)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. Rate Analysis */}
            {linkedRateAnalysis && (
              <div>
                <SectionTitle icon={Calculator} title="Rate Analysis" color="text-orange-500" />
                <div className="py-1">
                  <PropRow label="Direct Cost" value={fmt(linkedRateAnalysis.direct_cost)} mono />
                  <PropRow label="Overhead" value={`${linkedRateAnalysis.overhead_pct}% = ${fmt(linkedRateAnalysis.overhead_amount)}`} />
                  <PropRow label="Profit" value={`${linkedRateAnalysis.profit_pct}% = ${fmt(linkedRateAnalysis.profit_amount)}`} />
                  <div className="px-4 py-1.5 flex items-center justify-between bg-orange-50/50 dark:bg-orange-500/5">
                    <span className="text-[11px] font-semibold text-orange-600">Unit Rate</span>
                    <span className="text-[13px] font-bold tabular-nums text-orange-700 dark:text-orange-300">{fmt(linkedRateAnalysis.unit_rate)}</span>
                  </div>
                </div>

                {groupedResources && Object.entries(groupedResources).map(([type, resources]) => {
                  const RIcon = RESOURCE_ICONS[type as keyof typeof RESOURCE_ICONS] ?? Package
                  return (
                    <div key={type} className="px-4 pb-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <RIcon size={10} className="text-slate-400" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {type} ({resources.length})
                        </span>
                      </div>
                      <div className="rounded-lg border border-slate-100 dark:border-white/[0.06] overflow-hidden">
                        {resources.map(r => (
                          <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 text-[10px] border-t border-slate-100/50 dark:border-white/[0.02] first:border-t-0">
                            <span className="flex-1 truncate text-slate-600 dark:text-slate-300">{r.description}</span>
                            <span className="tabular-nums text-slate-400 shrink-0">{r.quantity} {r.unit} × {fmt(r.unit_cost)}</span>
                            <span className="tabular-nums font-medium text-slate-700 dark:text-slate-200 w-16 text-right shrink-0">{fmt(r.total_amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 8. Variations */}
            {linkedVariations.length > 0 && (
              <div>
                <SectionTitle icon={GitCompare} title="Variations" count={linkedVariations.length} color="text-purple-500" />
                <div className="px-4 py-2 space-y-2">
                  {linkedVariations.map(v => {
                    const vi = v.items?.find(i => i.boq_item_id === item.id)
                    return (
                      <div key={v.id} className="rounded-lg border border-slate-100 dark:border-white/[0.06] p-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono text-slate-400">{v.variation_no}</span>
                          <span className="text-[11px] text-slate-700 dark:text-slate-200 truncate flex-1">{v.title}</span>
                          <Badge color={STATUS_COLORS[v.status] ?? STATUS_COLORS.draft}>{v.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]">
                          <Badge color={
                            v.variation_type === 'addition' ? 'bg-green-100 dark:bg-green-500/10 text-green-600' :
                            v.variation_type === 'omission' ? 'bg-red-100 dark:bg-red-500/10 text-red-600' :
                            'bg-amber-100 dark:bg-amber-500/10 text-amber-600'
                          }>{v.variation_type}</Badge>
                          <span className="tabular-nums text-slate-500">{fmt(v.approved_amount ?? v.amount)}</span>
                          {vi && (
                            <span className="tabular-nums text-slate-400 ml-auto">
                              {fmt(vi.quantity)} {vi.unit} × {fmt(vi.unit_rate)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 9. Payment Progress */}
            {linkedPayments.certs.length > 0 && (
              <div>
                <SectionTitle icon={BarChart3} title="Payment Progress" count={linkedPayments.certs.length} color="text-green-500" />
                <div className="px-4 py-3">
                  {linkedPayments.contractAmount > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span className="text-slate-500">Progress</span>
                        <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                          {fmt(linkedPayments.totalCertified)} / {fmt(linkedPayments.contractAmount)}
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="text-[9px] tabular-nums text-slate-400 mt-1 text-right">{progressPct.toFixed(1)}%</div>
                    </div>
                  )}
                  <div className="space-y-1">
                    {linkedPayments.certs.map(cert => {
                      const line = cert.lines?.find(l => l.boq_item_id === item.id)
                      return (
                        <div key={cert.id} className="flex items-center gap-2 text-[10px] py-1">
                          <Badge color={STATUS_COLORS[cert.status] ?? STATUS_COLORS.draft}>IPC #{cert.cert_number}</Badge>
                          <span className="text-slate-400 flex-1">{cert.period_to}</span>
                          {line && <span className="tabular-nums font-medium text-slate-700 dark:text-slate-200">{fmt(line.current_amount)}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 10. AI Analysis */}
            <div>
              <SectionTitle icon={Sparkles} title="AI Analysis" color="text-violet-500" />
              <div className="px-4 py-3">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl text-[11px] font-semibold hover:from-violet-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg">
                  <Sparkles size={13} />
                  Analyze with AI Engineer
                </button>
                <p className="text-[9px] text-slate-400 text-center mt-2">
                  Get AI-powered insights on cost efficiency, quantity accuracy, and risk.
                </p>
              </div>
            </div>

            {/* 11. Activity */}
            <div>
              <SectionTitle icon={Activity} title="Activity" color="text-slate-400" />
              <div className="px-4 py-2.5">
                <div className="flex items-center gap-2 text-[10px]">
                  <Clock size={10} className="text-slate-400" />
                  <span className="text-slate-500">Created</span>
                  <span className="text-slate-600 dark:text-slate-300">{item.created_at.slice(0, 10)}</span>
                </div>
                {item.quantity_difference != null && item.quantity_difference !== 0 && (
                  <div className="flex items-center gap-2 text-[10px] mt-1.5">
                    {item.quantity_difference > 0
                      ? <TrendingUp size={10} className="text-green-500" />
                      : <TrendingDown size={10} className="text-red-500" />
                    }
                    <span className={cn(
                      'tabular-nums font-medium',
                      item.quantity_difference > 0 ? 'text-green-600' : 'text-red-500'
                    )}>
                      Quantity changed by {item.quantity_difference > 0 ? '+' : ''}{fmt(item.quantity_difference)} {item.unit}
                    </span>
                  </div>
                )}
                {item.notes && (
                  <div className="mt-2 px-2.5 py-2 bg-slate-50 dark:bg-white/[0.02] rounded-lg text-[10px] text-slate-500 leading-relaxed">
                    {item.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
