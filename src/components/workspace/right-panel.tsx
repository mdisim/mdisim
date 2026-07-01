'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useWorkspace } from './workspace-context'
import {
  FileSpreadsheet, Ruler, BookOpen, ImageIcon, DollarSign,
  GitCompare, Link2, BarChart3, Layers, ArrowRight,
  Hash, Calculator, Package, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Eye, Info, Sparkles,
  Calendar, FileText, Activity,
} from 'lucide-react'

function SectionTitle({ icon: Icon, title, color }: { icon: typeof Info; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)]">
      <Icon size={12} className={color} />
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{title}</span>
    </div>
  )
}

function PropRow({ label, value, mono }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-1.5">
      <span className="text-[11px] text-[var(--color-text-muted)] shrink-0">{label}</span>
      <span className={cn('text-[11px] text-end text-[var(--color-text-secondary)] break-words', mono && 'font-mono tabular-nums')}>
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

function LinkedItem({ icon: Icon, label, sublabel, onClick }: {
  icon: typeof Info; label: string; sublabel?: string; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-2 text-start hover:bg-[var(--color-surface-elevated)] transition-colors group"
    >
      <Icon size={12} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-amber)] transition-colors shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-[var(--color-text-secondary)] truncate">{label}</div>
        {sublabel && <div className="text-[10px] text-slate-400 truncate">{sublabel}</div>}
      </div>
      <ArrowRight size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  )
}

function BOQDetail() {
  const { selection, data, linkedMeasurements, linkedRateAnalysis, fmt, selectMeasurement } = useWorkspace()
  const item = selection.boqItem!

  const relatedVariations = useMemo(() =>
    data.variations.filter(v => v.items?.some(vi => vi.boq_item_id === item.id)),
    [data.variations, item.id]
  )

  const relatedPayments = useMemo(() =>
    data.payments.filter(p => p.lines?.some(l => l.boq_item_id === item.id)),
    [data.payments, item.id]
  )

  const totalPaid = useMemo(() =>
    relatedPayments.reduce((s, p) =>
      s + (p.lines?.filter(l => l.boq_item_id === item.id).reduce((ls, l) => ls + l.cumulative_amount, 0) ?? 0), 0),
    [relatedPayments, item.id]
  )

  const linkedDrawings = useMemo(() => {
    const drawingIds = new Set<string>()
    for (const m of linkedMeasurements) {
      if (m.drawing_ref) {
        const d = data.drawings.find(d => d.drawing_number === m.drawing_ref)
        if (d) drawingIds.add(d.id)
      }
      for (const line of m.lines ?? []) {
        if (line.drawing_id) drawingIds.add(line.drawing_id)
      }
    }
    return data.drawings.filter(d => drawingIds.has(d.id))
  }, [linkedMeasurements, data.drawings])

  return (
    <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10">
            <FileSpreadsheet size={14} className="text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-slate-400">{item.code ?? '—'}</div>
            <div className="text-[12px] font-semibold text-slate-900 dark:text-white truncate">{item.description}</div>
          </div>
        </div>
        {item.section && (
          <Badge color="bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
            <Package size={8} className="mr-1" />{item.section}
          </Badge>
        )}
      </div>

      {/* Properties */}
      <div>
        <SectionTitle icon={Info} title="Properties" color="text-blue-500" />
        <div className="py-1">
          <PropRow label="Unit" value={item.unit} />
          <PropRow label="Quantity" value={fmt(item.quantity)} mono />
          <PropRow label="Unit Rate" value={item.unit_rate != null ? fmt(item.unit_rate) : null} mono />
          <PropRow label="Total" value={item.total_amount != null ? fmt(item.total_amount) : null} mono />
          {item.original_quantity != null && <PropRow label="Original Qty" value={fmt(item.original_quantity)} mono />}
          {item.revised_quantity != null && <PropRow label="Revised Qty" value={fmt(item.revised_quantity)} mono />}
          {item.quantity_difference != null && item.quantity_difference !== 0 && (
            <PropRow label="Difference" value={`${item.quantity_difference > 0 ? '+' : ''}${fmt(item.quantity_difference)}`} mono />
          )}
        </div>
      </div>

      {/* Cost Breakdown */}
      {(item.material_rate != null || item.labor_rate != null || item.equipment_rate != null) && (
        <div>
          <SectionTitle icon={DollarSign} title="Cost Breakdown" color="text-emerald-500" />
          <div className="py-1">
            {item.material_rate != null && <PropRow label="Material" value={fmt(item.material_rate)} mono />}
            {item.labor_rate != null && <PropRow label="Labor" value={fmt(item.labor_rate)} mono />}
            {item.equipment_rate != null && <PropRow label="Equipment" value={fmt(item.equipment_rate)} mono />}
          </div>
        </div>
      )}

      {/* Rate Analysis */}
      {linkedRateAnalysis && (
        <div>
          <SectionTitle icon={Calculator} title="Rate Analysis" color="text-orange-500" />
          <div className="py-1">
            <PropRow label="Direct Cost" value={fmt(linkedRateAnalysis.direct_cost)} mono />
            <PropRow label="Overhead" value={`${linkedRateAnalysis.overhead_pct}% = ${fmt(linkedRateAnalysis.overhead_amount)}`} />
            <PropRow label="Profit" value={`${linkedRateAnalysis.profit_pct}% = ${fmt(linkedRateAnalysis.profit_amount)}`} />
            <PropRow label="Unit Rate" value={fmt(linkedRateAnalysis.unit_rate)} mono />
            {linkedRateAnalysis.resources && linkedRateAnalysis.resources.length > 0 && (
              <div className="px-4 py-2">
                <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Resources ({linkedRateAnalysis.resources.length})</div>
                {linkedRateAnalysis.resources.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between text-[10px] py-0.5">
                    <span className="text-slate-500 truncate">{r.description}</span>
                    <span className="tabular-nums text-slate-600 dark:text-slate-300 shrink-0 ml-2">{fmt(r.total_amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Linked Measurements */}
      {linkedMeasurements.length > 0 && (
        <div>
          <SectionTitle icon={Ruler} title={`Measurements (${linkedMeasurements.length})`} color="text-cyan-500" />
          {linkedMeasurements.map(m => (
            <LinkedItem
              key={m.id}
              icon={Ruler}
              label={m.description}
              sublabel={`${m.measurement_type} · Net: ${fmt(m.net_qty)} ${m.unit}`}
              onClick={() => selectMeasurement(m)}
            />
          ))}
        </div>
      )}

      {/* Linked Drawings */}
      {linkedDrawings.length > 0 && (
        <div>
          <SectionTitle icon={ImageIcon} title={`Drawings (${linkedDrawings.length})`} color="text-indigo-500" />
          {linkedDrawings.map(d => (
            <LinkedItem key={d.id} icon={ImageIcon} label={d.name} sublabel={d.drawing_number ?? undefined} />
          ))}
        </div>
      )}

      {/* Variations */}
      {relatedVariations.length > 0 && (
        <div>
          <SectionTitle icon={GitCompare} title={`Variations (${relatedVariations.length})`} color="text-amber-500" />
          {relatedVariations.map(v => (
            <LinkedItem key={v.id} icon={GitCompare} label={v.title} sublabel={`${v.variation_no} · ${v.status} · ${fmt(v.amount)}`} />
          ))}
        </div>
      )}

      {/* Payment History */}
      {relatedPayments.length > 0 && (
        <div>
          <SectionTitle icon={Activity} title="Payment History" color="text-green-500" />
          <div className="px-4 py-2">
            <div className="flex items-center justify-between text-[11px] mb-2">
              <span className="text-slate-500">Total Certified</span>
              <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{fmt(totalPaid)}</span>
            </div>
            {item.total_amount != null && totalPaid > 0 && (
              <div className="h-1.5 bg-slate-100 dark:bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalPaid / item.total_amount) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DrawingDetail() {
  const { selection, data, linkedBoqItems, linkedRevisions, linkedDrawingMeasurements, fmt, selectBoqItem } = useWorkspace()
  const drawing = selection.drawing!

  return (
    <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10">
            <ImageIcon size={14} className="text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-slate-900 dark:text-white truncate">{drawing.name}</div>
            <div className="text-[10px] text-slate-400">{drawing.drawing_number ?? '—'}</div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Badge color="bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{drawing.drawing_type}</Badge>
          <Badge color="bg-slate-100 dark:bg-white/[0.06] text-slate-500">{drawing.file_type?.toUpperCase()}</Badge>
        </div>
      </div>

      {/* Drawing Info */}
      <div>
        <SectionTitle icon={Info} title="Drawing Information" color="text-indigo-500" />
        <div className="py-1">
          <PropRow label="Type" value={drawing.drawing_type} />
          <PropRow label="File Type" value={drawing.file_type?.toUpperCase()} />
          <PropRow label="Size" value={drawing.file_size ? `${(drawing.file_size / 1024 / 1024).toFixed(1)} MB` : null} />
          <PropRow label="Pages" value={drawing.page_count} mono />
          <PropRow label="Revision" value={drawing.revision_number} />
          {drawing.revision_date && <PropRow label="Rev Date" value={drawing.revision_date} />}
        </div>
      </div>

      {/* Measurements on Drawing */}
      {linkedDrawingMeasurements.length > 0 && (
        <div>
          <SectionTitle icon={Ruler} title={`Measurements (${linkedDrawingMeasurements.length})`} color="text-cyan-500" />
          <div className="max-h-48 overflow-y-auto">
            {linkedDrawingMeasurements.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2 px-4 py-1.5 text-[11px]">
                <div className={cn(
                  'w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold',
                  m.tool_type === 'line' || m.tool_type === 'polyline' ? 'bg-green-100 dark:bg-green-500/10 text-green-600' :
                  m.tool_type === 'area' || m.tool_type === 'rectangle' || m.tool_type === 'circle' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600' :
                  'bg-purple-100 dark:bg-purple-500/10 text-purple-600'
                )}>
                  {m.tool_type[0].toUpperCase()}
                </div>
                <span className="flex-1 truncate text-slate-600 dark:text-slate-300">{m.label || `#${i + 1}`}</span>
                <span className="tabular-nums text-slate-500 shrink-0">{fmt(m.quantity)} {m.unit ?? 'px'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked BOQ Items */}
      {linkedBoqItems.length > 0 && (
        <div>
          <SectionTitle icon={FileSpreadsheet} title={`BOQ Items (${linkedBoqItems.length})`} color="text-blue-500" />
          {linkedBoqItems.map(b => (
            <LinkedItem
              key={b.id}
              icon={FileSpreadsheet}
              label={b.description}
              sublabel={`${b.code ?? '—'} · ${fmt(b.quantity)} ${b.unit}`}
              onClick={() => selectBoqItem(b)}
            />
          ))}
        </div>
      )}

      {/* Revisions */}
      {linkedRevisions.length > 0 && (
        <div>
          <SectionTitle icon={GitCompare} title={`Revisions (${linkedRevisions.length})`} color="text-amber-500" />
          {linkedRevisions.map(rev => (
            <div key={rev.id} className="flex items-center gap-2 px-4 py-1.5 text-[11px]">
              <div className={cn(
                'w-2 h-2 rounded-full',
                rev.status === 'current' ? 'bg-green-500' : rev.status === 'draft' ? 'bg-amber-500' : 'bg-slate-400'
              )} />
              <span className="font-mono text-slate-500">Rev {rev.revision_number}</span>
              <span className="text-slate-400 text-[10px]">{rev.revision_date}</span>
              <Badge color={
                rev.status === 'current' ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' :
                rev.status === 'draft' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600' :
                'bg-slate-100 dark:bg-white/[0.06] text-slate-500'
              }>
                {rev.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MeasurementDetail() {
  const { selection, data, linkedBoqItems, fmt, selectBoqItem } = useWorkspace()
  const item = selection.measurement!
  const lines = item.lines ?? []

  return (
    <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10">
            <Ruler size={14} className="text-cyan-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-slate-400">{item.item_code ?? '—'}</div>
            <div className="text-[12px] font-semibold text-slate-900 dark:text-white truncate">{item.description}</div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Badge color="bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">{item.measurement_type}</Badge>
          <Badge color="bg-slate-100 dark:bg-white/[0.06] text-slate-500">{item.unit}</Badge>
        </div>
      </div>

      <div>
        <SectionTitle icon={Info} title="Properties" color="text-cyan-500" />
        <div className="py-1">
          <PropRow label="Section" value={item.section} />
          <PropRow label="Location" value={item.location} />
          <PropRow label="Drawing Ref" value={item.drawing_ref} />
          <PropRow label="Additions" value={fmt(item.additions_qty)} mono />
          <PropRow label="Deductions" value={fmt(item.deductions_qty)} mono />
          <PropRow label="Net Quantity" value={fmt(item.net_qty)} mono />
          <PropRow label="Lines" value={lines.length} mono />
        </div>
      </div>

      {/* Calculation Lines */}
      {lines.length > 0 && (
        <div>
          <SectionTitle icon={Calculator} title={`Lines (${lines.length})`} color="text-orange-500" />
          <div className="max-h-48 overflow-y-auto">
            {lines.map((l, i) => (
              <div key={l.id} className={cn(
                'flex items-center gap-2 px-4 py-1.5 text-[10px]',
                l.is_deduction && 'bg-red-50/50 dark:bg-red-500/5'
              )}>
                <span className="w-4 text-center text-slate-400 font-mono">{i + 1}</span>
                <span className="flex-1 truncate text-slate-600 dark:text-slate-300">{l.description || '—'}</span>
                <span className="tabular-nums text-slate-400 shrink-0">
                  {l.nr ?? ''} × {l.length ?? ''} × {l.width ?? ''} × {l.height ?? ''}
                </span>
                <span className={cn(
                  'tabular-nums font-medium shrink-0 w-16 text-right',
                  l.is_deduction ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'
                )}>
                  {l.is_deduction ? '-' : ''}{fmt(l.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {linkedBoqItems.length > 0 && (
        <div>
          <SectionTitle icon={FileSpreadsheet} title={`BOQ Items (${linkedBoqItems.length})`} color="text-blue-500" />
          {linkedBoqItems.map(b => (
            <LinkedItem key={b.id} icon={FileSpreadsheet} label={b.description} sublabel={b.code ?? undefined} onClick={() => selectBoqItem(b)} />
          ))}
        </div>
      )}
    </div>
  )
}

function LibraryItemDetail() {
  const { selection, fmt } = useWorkspace()
  const item = selection.libraryItem!

  return (
    <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-teal-500/10">
            <BookOpen size={14} className="text-teal-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-slate-400">{item.code ?? '—'}</div>
            <div className="text-[12px] font-semibold text-slate-900 dark:text-white">{item.description}</div>
          </div>
        </div>
      </div>
      <div>
        <SectionTitle icon={Info} title="Rates" color="text-teal-500" />
        <div className="py-1">
          <PropRow label="Unit" value={item.unit} />
          <PropRow label="Default Rate" value={item.default_rate != null ? fmt(item.default_rate) : null} mono />
          <PropRow label="Material" value={item.material_rate != null ? fmt(item.material_rate) : null} mono />
          <PropRow label="Labor" value={item.labor_rate != null ? fmt(item.labor_rate) : null} mono />
          <PropRow label="Equipment" value={item.equipment_rate != null ? fmt(item.equipment_rate) : null} mono />
          {item.notes && <PropRow label="Notes" value={item.notes} />}
        </div>
      </div>
    </div>
  )
}

export function RightPanel() {
  const { selection } = useWorkspace()

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0f1117] overflow-hidden">
      {/* Panel header */}
      <div className="px-3 py-2.5 border-b border-slate-200/60 dark:border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Layers size={13} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em]">
            {selection.type === 'boq' ? 'BOQ Item'
              : selection.type === 'drawing' ? 'Drawing'
              : selection.type === 'measurement' ? 'Measurement'
              : selection.type === 'library-item' ? 'Library Item'
              : 'Properties'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          {selection.type === 'boq' && selection.boqItem && (
            <motion.div key="boq" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
              <BOQDetail />
            </motion.div>
          )}
          {selection.type === 'drawing' && selection.drawing && (
            <motion.div key="drawing" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
              <DrawingDetail />
            </motion.div>
          )}
          {selection.type === 'measurement' && selection.measurement && (
            <motion.div key="measurement" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
              <MeasurementDetail />
            </motion.div>
          )}
          {selection.type === 'library-item' && selection.libraryItem && (
            <motion.div key="library" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
              <LibraryItemDetail />
            </motion.div>
          )}
          {!selection.type && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mb-3">
                <Sparkles size={20} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">No Selection</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[180px]">
                Select a BOQ item, drawing, or measurement to view its properties and linked data.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
