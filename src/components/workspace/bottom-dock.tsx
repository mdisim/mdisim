'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from './workspace-context'
import {
  Bot, Activity, DollarSign,
  Minimize2, Maximize2, Layers, GitCompare,
} from 'lucide-react'

type DockTab = 'evidence' | 'history' | 'cost' | 'activity'

const DOCK_TABS: { key: DockTab; label: string; icon: typeof Bot; color: string }[] = [
  { key: 'evidence', label: 'Evidence Summary', icon: Layers, color: 'text-[var(--color-brand)]' },
  { key: 'history', label: 'Quantity History', icon: GitCompare, color: 'text-amber-500' },
  { key: 'cost', label: 'Cost Summary', icon: DollarSign, color: 'text-emerald-500' },
  { key: 'activity', label: 'Activity', icon: Activity, color: 'text-cyan-500' },
]

export function BottomDock() {
  const [activeTab, setActiveTab] = useState<DockTab>('evidence')
  const [expanded, setExpanded] = useState(true)
  const [dockHeight, setDockHeight] = useState(420)

  return (
    <div
      className="border-t border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col"
      style={{ height: expanded ? dockHeight : 36 }}
    >
      {/* Tab bar */}
      <div className="flex items-center h-9 px-2 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-0.5 flex-1">
          {DOCK_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setExpanded(true) }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all',
                activeTab === tab.key && expanded
                  ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]'
              )}
            >
              <tab.icon size={12} className={activeTab === tab.key && expanded ? tab.color : ''} />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors"
        >
          {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
      </div>

      {/* Tab content */}
      {expanded && (
        <div className="flex-1 overflow-hidden">
          {activeTab === 'evidence' && <EvidenceTab />}
          {activeTab === 'history' && <QuantityHistoryTab />}
          {activeTab === 'cost' && <CostTab />}
          {activeTab === 'activity' && <ActivityTab />}
        </div>
      )}
    </div>
  )
}

function ActivityTab() {
  const { data, fmt } = useWorkspace()
  const recentBoq = data.boqItems.slice(0, 8)
  const recentMeasurements = data.measurementItems.slice(0, 8)

  return (
    <div className="h-full overflow-y-auto px-4 py-2 space-y-3">
      <div>
        <div className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Recent BOQ Items</div>
        {recentBoq.map(b => (
          <div key={b.id} className="flex items-center gap-2 text-[11px] py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-blue)]" />
            <span className="font-mono text-[9px] text-[var(--color-text-muted)] w-8">{b.code ?? '—'}</span>
            <span className="flex-1 truncate text-[var(--color-text-secondary)]">{b.description}</span>
            <span className="tabular-nums text-[var(--color-text-muted)] shrink-0">{fmt(b.quantity)} {b.unit}</span>
          </div>
        ))}
      </div>
      <div>
        <div className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Recent Measurements</div>
        {recentMeasurements.map(m => (
          <div key={m.id} className="flex items-center gap-2 text-[11px] py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            <span className="font-mono text-[9px] text-[var(--color-text-muted)] w-8">{m.item_code ?? '—'}</span>
            <span className="flex-1 truncate text-[var(--color-text-secondary)]">{m.description}</span>
            <span className="tabular-nums text-[var(--color-text-muted)] shrink-0">{fmt(m.net_qty)} {m.unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CostTab() {
  const { data, fmt } = useWorkspace()
  const contractValue = data.contract?.contract_value ?? 0
  const totalBoq = data.boqItems.reduce((s, b) => s + (b.total_amount ?? 0), 0)
  const totalSpent = data.costEntries.reduce((s, c) => s + c.amount, 0)
  const totalVariations = data.variations.reduce((s, v) => s + (v.approved_amount ?? v.amount), 0)
  const totalPaid = data.payments.reduce((s, p) => s + p.net_payable, 0)
  const remaining = contractValue - totalSpent

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Contract Value', value: fmt(contractValue), color: 'from-[var(--color-info)] to-[var(--color-info-light)]' },
          { label: 'BOQ Total', value: fmt(totalBoq), color: 'from-indigo-500 to-indigo-600' },
          { label: 'Spent to Date', value: fmt(totalSpent), color: 'from-amber-500 to-amber-600' },
          { label: 'Variations', value: fmt(totalVariations), color: 'from-purple-500 to-purple-600' },
          { label: 'Total Paid', value: fmt(totalPaid), color: 'from-green-500 to-green-600' },
          { label: 'Remaining', value: fmt(remaining), color: remaining >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-[var(--color-danger)] to-[var(--color-danger-light)]' },
        ].map(card => (
          <div key={card.label} className="bg-[var(--color-surface-elevated)] rounded-lg p-2.5 border border-[var(--color-border)]">
            <div className={cn('w-1.5 h-1.5 rounded-full bg-gradient-to-r mb-1.5', card.color)} />
            <div className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider">{card.label}</div>
            <div className="text-[13px] font-bold tabular-nums text-[var(--color-text)] mt-0.5">{card.value}</div>
          </div>
        ))}
      </div>
      {/* Budget bar */}
      {contractValue > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mb-1">
            <span>Budget Utilization</span>
            <span className="tabular-nums">{((totalSpent / contractValue) * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all bg-gradient-to-r',
                totalSpent / contractValue > 0.9 ? 'from-[var(--color-danger)] to-[var(--color-danger-light)]' :
                totalSpent / contractValue > 0.7 ? 'from-amber-500 to-amber-600' :
                'from-[var(--color-info)] to-[var(--color-info-light)]'
              )}
              style={{ width: `${Math.min(100, (totalSpent / contractValue) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function EvidenceTab() {
  const { selection, linkedMeasurements, linkedSourceDrawings, linkedCostEntries, linkedPayments, fmt } = useWorkspace()
  const item = selection.boqItem

  if (!item) {
    return (
      <div className="h-full flex items-center justify-center text-[11px] text-[var(--color-text-muted)]">
        Select a BOQ item to see its evidence summary
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-2">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[var(--color-blue)]/5 rounded-lg p-2.5 border border-[var(--color-blue)]/10">
          <div className="text-[8px] text-[var(--color-blue)] uppercase tracking-wider font-bold">Quantity</div>
          <div className="text-[14px] font-bold tabular-nums text-[var(--color-blue)]">{fmt(item.quantity)}</div>
          <div className="text-[9px] text-[var(--color-blue)]">{item.unit}</div>
        </div>
        <div className="bg-cyan-50/80 dark:bg-cyan-500/5 rounded-lg p-2.5 border border-cyan-100 dark:border-cyan-500/10">
          <div className="text-[8px] text-cyan-500 uppercase tracking-wider font-bold">Measurements</div>
          <div className="text-[14px] font-bold tabular-nums text-cyan-700 dark:text-cyan-300">{linkedMeasurements.length}</div>
          <div className="text-[9px] text-cyan-400">{linkedMeasurements.reduce((s, m) => s + (m.lines?.length ?? 0), 0)} lines</div>
        </div>
        <div className="bg-indigo-50/80 dark:bg-indigo-500/5 rounded-lg p-2.5 border border-indigo-100 dark:border-indigo-500/10">
          <div className="text-[8px] text-indigo-500 uppercase tracking-wider font-bold">Drawings</div>
          <div className="text-[14px] font-bold tabular-nums text-indigo-700 dark:text-indigo-300">{linkedSourceDrawings.length}</div>
          <div className="text-[9px] text-indigo-400">source drawings</div>
        </div>
        <div className="bg-emerald-50/80 dark:bg-emerald-500/5 rounded-lg p-2.5 border border-emerald-100 dark:border-emerald-500/10">
          <div className="text-[8px] text-emerald-500 uppercase tracking-wider font-bold">Cost</div>
          <div className="text-[14px] font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{fmt(linkedCostEntries.reduce((s, c) => s + c.amount, 0))}</div>
          <div className="text-[9px] text-emerald-400">{linkedCostEntries.length} entries</div>
        </div>
        <div className="bg-green-50/80 dark:bg-green-500/5 rounded-lg p-2.5 border border-green-100 dark:border-green-500/10">
          <div className="text-[8px] text-green-500 uppercase tracking-wider font-bold">Certified</div>
          <div className="text-[14px] font-bold tabular-nums text-green-700 dark:text-green-300">{fmt(linkedPayments.totalCertified)}</div>
          <div className="text-[9px] text-green-400">{linkedPayments.certs.length} certificates</div>
        </div>
      </div>
    </div>
  )
}

function QuantityHistoryTab() {
  const { data, fmt } = useWorkspace()

  const changes = useMemo(() => {
    return [...data.quantityChanges]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 30)
  }, [data.quantityChanges])

  if (changes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[11px] text-[var(--color-text-muted)]">
        No quantity changes recorded yet
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-2">
      <div className="relative pl-6">
        <div className="absolute start-2 top-0 bottom-0 w-px bg-[var(--color-border)]" />
        {changes.map((qc, i) => {
          const boqItem = data.boqItems.find(b => b.id === qc.boq_item_id)
          return (
            <div key={qc.id} className="relative pb-3">
              <div className={cn(
                'absolute left-[-17px] w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[var(--background)]',
                qc.difference > 0 ? 'bg-green-500' : qc.difference < 0 ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-border)]'
              )} style={{ top: 2 }} />
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-[var(--color-text-muted)] text-[10px] font-mono w-20 shrink-0">{qc.created_at.slice(0, 10)}</span>
                <span className="font-mono text-[9px] text-[var(--color-text-muted)] w-12 shrink-0">{boqItem?.code ?? '—'}</span>
                <span className="text-[var(--color-text-secondary)] flex-1 truncate">{qc.description}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] capitalize">{qc.change_type}</span>
                <span className="tabular-nums text-[var(--color-text-muted)] shrink-0">{fmt(qc.previous_qty)} → {fmt(qc.new_qty)}</span>
                <span className={cn(
                  'tabular-nums font-medium shrink-0',
                  qc.difference > 0 ? 'text-green-600' : qc.difference < 0 ? 'text-red-500' : 'text-[var(--color-text-muted)]'
                )}>
                  {qc.difference > 0 ? '+' : ''}{fmt(qc.difference)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
