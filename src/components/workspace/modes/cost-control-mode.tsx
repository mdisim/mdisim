'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { useToast } from '@/components/ui/toast'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { DonutChart, SimpleBarChart } from '@/components/ui/mini-chart'
import {
  Plus, Trash2, TrendingUp, TrendingDown, DollarSign, FileText,
  AlertTriangle, CheckCircle2, Clock, BarChart3, PieChart,
} from 'lucide-react'
import {
  upsertContract, createVariation, updateVariation, deleteVariation,
  createCostEntry, deleteCostEntry,
} from '@/app/actions/cost-control'
import type { VariationType, VariationStatus } from '@/lib/types'

const VAR_STATUS_COLOR: Record<VariationStatus, string> = {
  pending: 'bg-[var(--color-warning-tint)] text-[var(--color-warning)] border border-[var(--color-warning)]/30',
  submitted: 'bg-[var(--color-info-tint)] text-[var(--color-info)] border border-[var(--color-info)]/30',
  approved: 'bg-[var(--color-success-tint)] text-[var(--color-success)] border border-[var(--color-success)]/30',
  rejected: 'bg-[var(--color-danger-tint)] text-[var(--color-danger)] border border-[var(--color-danger)]/30',
  withdrawn: 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] border border-[var(--color-border)]',
}

export function CostControlMode({ projectId }: { projectId: string }) {
  const { data, fmt, reload } = useWorkspace()
  const { toast } = useToast()
  const { contract, variations, costEntries, cashflow } = data

  const [activeTab, setActiveTab] = useState<'overview' | 'variations' | 'costs' | 'cashflow'>('overview')
  const [showContractEdit, setShowContractEdit] = useState(false)
  const [showAddVariation, setShowAddVariation] = useState(false)
  const [showAddCost, setShowAddCost] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [contractForm, setContractForm] = useState({
    contract_value: contract ? String(contract.contract_value) : '',
    contingency_pct: contract ? String(contract.contingency_pct) : '5',
    retention_pct: contract ? String(contract.retention_pct) : '10',
    advance_pct: contract ? String(contract.advance_pct) : '0',
    vat_pct: contract ? String(contract.vat_pct) : '17',
    start_date: contract?.start_date ?? '',
    end_date: contract?.end_date ?? '',
    duration_months: contract?.duration_months ? String(contract.duration_months) : '',
    notes: contract?.notes ?? '',
  })
  const [varForm, setVarForm] = useState({ variation_no: '', title: '', description: '', variation_type: 'addition' as VariationType, amount: '' })
  const [costForm, setCostForm] = useState({ period_date: '', category: 'actual', cost_type: 'direct', description: '', amount: '', notes: '' })

  const handleSaveContract = async () => {
    setError(null)
    const r = await upsertContract({
      project_id: projectId,
      contract_value: parseFloat(contractForm.contract_value) || 0,
      contingency_pct: parseFloat(contractForm.contingency_pct) || 0,
      retention_pct: parseFloat(contractForm.retention_pct) || 0,
      advance_pct: parseFloat(contractForm.advance_pct) || 0,
      vat_pct: parseFloat(contractForm.vat_pct) || 0,
      start_date: contractForm.start_date || undefined,
      end_date: contractForm.end_date || undefined,
      duration_months: parseInt(contractForm.duration_months) || undefined,
      notes: contractForm.notes || undefined,
    })
    if (r.error) { setError(r.error); toast({ title: 'Failed to save contract', description: r.error, variant: 'danger' }); return }
    setShowContractEdit(false)
    toast({ title: 'Contract saved', variant: 'success' })
    reload()
  }

  const handleAddVariation = async () => {
    if (!varForm.title.trim()) return
    setError(null)
    const r = await createVariation({
      project_id: projectId,
      variation_no: varForm.variation_no,
      title: varForm.title,
      description: varForm.description || undefined,
      variation_type: varForm.variation_type,
      amount: parseFloat(varForm.amount) || 0,
    })
    if (r.error) { setError(r.error); toast({ title: 'Failed to add variation', description: r.error, variant: 'danger' }); return }
    setShowAddVariation(false)
    setVarForm({ variation_no: '', title: '', description: '', variation_type: 'addition', amount: '' })
    toast({ title: 'Variation added', variant: 'success' })
    reload()
  }

  const handleAddCost = async () => {
    if (!costForm.description.trim()) return
    setError(null)
    const r = await createCostEntry({
      project_id: projectId,
      period_date: costForm.period_date || new Date().toISOString().slice(0, 10),
      category: costForm.category,
      cost_type: costForm.cost_type,
      description: costForm.description,
      amount: parseFloat(costForm.amount) || 0,
      notes: costForm.notes || undefined,
    })
    if (r.error) { setError(r.error); toast({ title: 'Failed to add cost entry', description: r.error, variant: 'danger' }); return }
    setShowAddCost(false)
    setCostForm({ period_date: '', category: 'actual', cost_type: 'direct', description: '', amount: '', notes: '' })
    toast({ title: 'Cost entry added', variant: 'success' })
    reload()
  }

  const handleUpdateVariationStatus = async (id: string, status: VariationStatus) => {
    const r = await updateVariation(id, { status })
    if (r.error) { toast({ title: 'Failed to update variation', description: r.error, variant: 'danger' }); return }
    toast({ title: 'Variation updated', variant: status === 'rejected' || status === 'withdrawn' ? 'warning' : 'success' })
    reload()
  }

  const handleDeleteVariation = async (id: string) => {
    const r = await deleteVariation(id)
    if (r.error) { toast({ title: 'Failed to delete variation', description: r.error, variant: 'danger' }); return }
    toast({ title: 'Variation deleted', variant: 'success' })
    reload()
  }

  const handleDeleteCostEntry = async (id: string) => {
    const r = await deleteCostEntry(id)
    if (r.error) { toast({ title: 'Failed to delete cost entry', description: r.error, variant: 'danger' }); return }
    toast({ title: 'Cost entry deleted', variant: 'success' })
    reload()
  }

  const contractValue = contract?.contract_value ?? 0
  const approvedVariations = variations.filter(v => v.status === 'approved').reduce((s, v) => s + (v.approved_amount ?? v.amount), 0)
  const pendingVariations = variations.filter(v => v.status === 'pending' || v.status === 'submitted').reduce((s, v) => s + v.amount, 0)
  const revisedContract = contractValue + approvedVariations
  const actualCost = costEntries.filter(c => c.category === 'actual').reduce((s, c) => s + c.amount, 0)
  const committedCost = costEntries.filter(c => c.category === 'committed').reduce((s, c) => s + c.amount, 0)
  const forecastCost = costEntries.filter(c => c.category === 'forecast').reduce((s, c) => s + c.amount, 0)
  const totalExposure = actualCost + committedCost + forecastCost
  const contingency = contractValue * ((contract?.contingency_pct ?? 0) / 100)
  const projectedProfit = revisedContract - totalExposure
  const budgetHealthPct = revisedContract > 0 ? ((revisedContract - totalExposure) / revisedContract) * 100 : 0

  const contractModal = (
    <Modal isOpen={showContractEdit} onClose={() => setShowContractEdit(false)} title="Contract details" size="md">
      <div className="space-y-4">
        <Input label="Contract value" type="number" value={contractForm.contract_value} onChange={e => setContractForm({ ...contractForm, contract_value: e.target.value })} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Input label="Contingency %" type="number" value={contractForm.contingency_pct} onChange={e => setContractForm({ ...contractForm, contingency_pct: e.target.value })} />
          <Input label="Retention %" type="number" value={contractForm.retention_pct} onChange={e => setContractForm({ ...contractForm, retention_pct: e.target.value })} />
          <Input label="Advance %" type="number" value={contractForm.advance_pct} onChange={e => setContractForm({ ...contractForm, advance_pct: e.target.value })} />
          <Input label="VAT %" type="number" value={contractForm.vat_pct} onChange={e => setContractForm({ ...contractForm, vat_pct: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Start date" type="date" value={contractForm.start_date} onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })} />
          <Input label="End date" type="date" value={contractForm.end_date} onChange={e => setContractForm({ ...contractForm, end_date: e.target.value })} />
          <Input label="Duration (months)" type="number" value={contractForm.duration_months} onChange={e => setContractForm({ ...contractForm, duration_months: e.target.value })} />
        </div>
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={() => setShowContractEdit(false)}>Cancel</Button>
          <Button onClick={handleSaveContract}>Save</Button>
        </div>
      </div>
    </Modal>
  )

  if (!contract && variations.length === 0 && costEntries.length === 0 && cashflow.length === 0) {
    return (
      <>
        <EmptyState
          icon={BarChart3}
          title="No cost data yet"
          description="Set up the contract to start tracking variations, cost entries and budget health for this project."
          actionLabel="Set up contract"
          onAction={() => setShowContractEdit(true)}
        />
        {contractModal}
      </>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowContractEdit(true)}>
          <DollarSign size={14} /> {contract ? 'Edit contract' : 'Set contract'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Contract value</span>
          <div className="text-xl font-bold text-[var(--color-brand)]">{fmt(revisedContract)}</div>
          <div className="w-full h-1 rounded-full bg-[var(--color-surface-hover)] overflow-hidden"><div className="bg-[var(--color-brand)] h-full" style={{ width: '100%' }} /></div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Spent to date</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[var(--color-text)]">{fmt(actualCost)}</span>
            {revisedContract > 0 && <span className="text-xs text-[var(--color-danger)]">{((actualCost / revisedContract) * 100).toFixed(1)}%</span>}
          </div>
          <div className="w-full h-1 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
            <div className="bg-[var(--color-danger)] h-full transition-all" style={{ width: revisedContract > 0 ? `${Math.min((actualCost / revisedContract) * 100, 100)}%` : '0%' }} />
          </div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Remaining budget</span>
          <div className="text-xl font-bold text-[var(--color-text)]">{fmt(Math.max(revisedContract - totalExposure, 0))}</div>
          <div className="w-full h-1 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
            <div className="bg-[var(--color-success)] h-full transition-all" style={{ width: revisedContract > 0 ? `${Math.max(Math.min(((revisedContract - totalExposure) / revisedContract) * 100, 100), 0)}%` : '0%' }} />
          </div>
        </div>
        <div className={cn('rounded-[var(--radius-lg)] p-4 space-y-2 border', projectedProfit >= 0 ? 'bg-[var(--color-brand-tint)] border-[var(--color-brand)]/20' : 'bg-[var(--color-danger-tint)] border-[var(--color-danger)]/20')}>
          <span className={cn('text-[10px] font-semibold uppercase tracking-widest', projectedProfit >= 0 ? 'text-[var(--color-brand)]' : 'text-[var(--color-danger)]')}>Budget health</span>
          <div className={cn('text-xl font-bold', projectedProfit >= 0 ? 'text-[var(--color-brand)]' : 'text-[var(--color-danger)]')}>{budgetHealthPct.toFixed(1)}%</div>
          <div className="flex items-center gap-1.5 text-xs">
            {projectedProfit >= 0 ? <CheckCircle2 size={13} className="text-[var(--color-brand)]" /> : <AlertTriangle size={13} className="text-[var(--color-danger)]" />}
            <span className={projectedProfit >= 0 ? 'text-[var(--color-brand)]' : 'text-[var(--color-danger)]'}>{projectedProfit >= 0 ? 'On track' : 'Over budget'}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {(['overview', 'variations', 'costs', 'cashflow'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px capitalize',
              activeTab === tab ? 'border-[var(--color-brand)] text-[var(--color-brand)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
              <div className="flex items-center gap-2 mb-3"><PieChart size={14} className="text-[var(--color-brand)]" /><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Budget breakdown</span></div>
              <DonutChart segments={[
                { value: actualCost, color: 'var(--color-danger)', label: 'Actual cost' },
                { value: committedCost, color: 'var(--color-warning)', label: 'Committed' },
                { value: forecastCost, color: 'var(--color-info)', label: 'Forecast' },
                { value: Math.max(revisedContract - totalExposure, 0), color: 'var(--color-success)', label: 'Remaining' },
              ].filter(s => s.value > 0)} />
            </div>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
              <div className="flex items-center gap-2 mb-3"><BarChart3 size={14} className="text-[var(--color-brand)]" /><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Cost variance</span></div>
              <SimpleBarChart bars={[
                { label: 'Contract value', value: contractValue, color: 'var(--color-brand)' },
                { label: 'Approved variations', value: approvedVariations, color: 'var(--color-success)' },
                { label: 'Actual cost', value: actualCost, color: 'var(--color-danger)' },
                { label: 'Committed', value: committedCost, color: 'var(--color-warning)' },
                { label: 'Forecast', value: forecastCost, color: 'var(--color-info)' },
              ]} horizontal />
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-border)]"><FileText size={14} className="text-[var(--color-brand)]" /><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Financial summary</span></div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <tbody>
                  {[
                    { label: 'Original contract value', value: contractValue },
                    { label: 'Approved variations', value: approvedVariations },
                    { label: 'Pending variations', value: pendingVariations, muted: true },
                    { label: 'Revised contract value', value: revisedContract, bold: true },
                    { label: 'Actual cost to date', value: actualCost },
                    { label: 'Committed cost', value: committedCost },
                    { label: 'Forecast to complete', value: forecastCost },
                    { label: 'Total exposure', value: totalExposure, bold: true },
                    { label: 'Contingency', value: contingency },
                    { label: 'Projected profit / loss', value: projectedProfit, bold: true, highlight: true },
                  ].map(row => (
                    <tr key={row.label} className={cn('border-b border-[var(--color-border-light)]', row.bold && 'bg-[var(--color-surface-hover)]')}>
                      <td className={cn('px-5 py-2.5', row.bold ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]', row.muted && 'text-[var(--color-text-muted)] italic')}>{row.label}</td>
                      <td className={cn('px-5 py-2.5 text-end mono', row.bold ? 'font-bold text-[var(--color-text)]' : 'text-[var(--color-text)]', row.highlight && (projectedProfit >= 0 ? 'text-[var(--color-success)] font-bold' : 'text-[var(--color-danger)] font-bold'))}>{fmt(row.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'variations' && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2"><FileText size={14} className="text-[var(--color-brand)]" /><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Variations register</span></div>
            <Button size="sm" onClick={() => setShowAddVariation(true)}><Plus size={14} /> Add variation</Button>
          </div>
          {variations.length === 0 ? (
            <EmptyState icon={FileText} title="No variations yet" description="Variation orders show up here once you add one." compact />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                    <th className="text-start px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">No.</th>
                    <th className="text-start px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Title</th>
                    <th className="text-start px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Type</th>
                    <th className="text-start px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Status</th>
                    <th className="text-end px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Amount</th>
                    <th className="text-end px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Approved</th>
                    <th className="w-[50px]" />
                  </tr>
                </thead>
                <tbody>
                  {variations.map(v => (
                    <tr key={v.id} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)] transition-colors">
                      <td className="px-5 py-2.5 font-mono text-[11px] text-[var(--color-text-muted)]">{v.variation_no}</td>
                      <td className="px-5 py-2.5 text-[var(--color-text)]">{v.title}</td>
                      <td className="px-5 py-2.5 text-[12px] capitalize text-[var(--color-text-secondary)]">{v.variation_type}</td>
                      <td className="px-5 py-2.5">
                        <select
                          value={v.status}
                          onChange={e => handleUpdateVariationStatus(v.id, e.target.value as VariationStatus)}
                          aria-label="Status"
                          className={cn('text-xs px-2 py-0.5 rounded-full border-0 font-medium cursor-pointer focus:outline-none', VAR_STATUS_COLOR[v.status])}
                        >
                          {(Object.keys(VAR_STATUS_COLOR) as VariationStatus[]).map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </td>
                      <td className="px-5 py-2.5 text-end mono text-[13px] text-[var(--color-text)]">{fmt(v.amount)}</td>
                      <td className="px-5 py-2.5 text-end mono text-[13px] font-medium text-[var(--color-success)]">{v.approved_amount != null ? fmt(v.approved_amount) : '-'}</td>
                      <td className="px-5 py-2 text-center">
                        <button onClick={() => handleDeleteVariation(v.id)} className="p-1.5 rounded-lg hover:bg-[var(--color-danger-tint)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors" title="Delete variation">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-surface-hover)]">
                    <td colSpan={4} className="px-5 py-2.5 font-semibold text-[var(--color-text)]">Total</td>
                    <td className="px-5 py-2.5 text-end font-bold mono text-[var(--color-text)]">{fmt(variations.reduce((s, v) => s + v.amount, 0))}</td>
                    <td className="px-5 py-2.5 text-end font-bold mono text-[var(--color-success)]">{fmt(variations.filter(v => v.approved_amount != null).reduce((s, v) => s + (v.approved_amount ?? 0), 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'costs' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Actual cost" value={fmt(actualCost)} icon={TrendingDown} />
            <Stat label="Committed" value={fmt(committedCost)} icon={Clock} />
            <Stat label="Forecast" value={fmt(forecastCost)} icon={TrendingUp} />
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2"><DollarSign size={14} className="text-[var(--color-brand)]" /><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Cost entries</span></div>
              <Button size="sm" onClick={() => setShowAddCost(true)}><Plus size={14} /> Add entry</Button>
            </div>
            {costEntries.length === 0 ? (
              <EmptyState icon={DollarSign} title="No cost entries yet" description="Log actual, committed and forecast costs here." compact />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                      <th className="text-start px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Date</th>
                      <th className="text-start px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Description</th>
                      <th className="text-start px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Category</th>
                      <th className="text-start px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Type</th>
                      <th className="text-end px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Amount</th>
                      <th className="w-[50px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {costEntries.map(ce => (
                      <tr key={ce.id} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)] transition-colors">
                        <td className="px-5 py-2.5 text-[11px] font-mono text-[var(--color-text-muted)]">{ce.period_date}</td>
                        <td className="px-5 py-2.5 text-[var(--color-text)]">{ce.description}</td>
                        <td className="px-5 py-2.5 text-[12px] capitalize text-[var(--color-text-secondary)]">{ce.category}</td>
                        <td className="px-5 py-2.5 text-[12px] capitalize text-[var(--color-text-secondary)]">{ce.cost_type}</td>
                        <td className="px-5 py-2.5 text-end mono text-[13px] font-medium text-[var(--color-text)]">{fmt(ce.amount)}</td>
                        <td className="px-5 py-2 text-center">
                          <button onClick={() => handleDeleteCostEntry(ce.id)} className="p-1.5 rounded-lg hover:bg-[var(--color-danger-tint)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors" title="Delete entry">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'cashflow' && (
        <div className="space-y-5">
          {cashflow.length > 0 && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
              <div className="flex items-center gap-2 mb-3"><BarChart3 size={14} className="text-[var(--color-success)]" /><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Monthly cashflow</span></div>
              <SimpleBarChart bars={cashflow.map(cf => ({ label: cf.period_date, value: cf.actual_income - cf.actual_expense, color: (cf.actual_income - cf.actual_expense) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }))} horizontal={false} />
            </div>
          )}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--color-border)]"><DollarSign size={14} className="text-[var(--color-brand)]" /><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Cashflow details</span></div>
            {cashflow.length === 0 ? (
              <EmptyState icon={BarChart3} title="No cashflow data yet" description="Planned and actual income/expense per period will appear here." compact />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                      <th className="text-start px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Period</th>
                      <th className="text-end px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Plan income</th>
                      <th className="text-end px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Actual income</th>
                      <th className="text-end px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Plan expense</th>
                      <th className="text-end px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Actual expense</th>
                      <th className="text-end px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashflow.map(cf => {
                      const net = cf.actual_income - cf.actual_expense
                      return (
                        <tr key={cf.id} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-surface-hover)] transition-colors">
                          <td className="px-5 py-2.5 text-[11px] font-mono text-[var(--color-text-muted)]">{cf.period_date}</td>
                          <td className="px-5 py-2.5 text-end mono text-[13px] text-[var(--color-text)]">{fmt(cf.planned_income)}</td>
                          <td className="px-5 py-2.5 text-end mono text-[13px] text-[var(--color-text)]">{fmt(cf.actual_income)}</td>
                          <td className="px-5 py-2.5 text-end mono text-[13px] text-[var(--color-text)]">{fmt(cf.planned_expense)}</td>
                          <td className="px-5 py-2.5 text-end mono text-[13px] text-[var(--color-text)]">{fmt(cf.actual_expense)}</td>
                          <td className={cn('px-5 py-2.5 text-end mono text-[13px] font-bold', net >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]')}>{fmt(net)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {contractModal}

      <Modal isOpen={showAddVariation} onClose={() => setShowAddVariation(false)} title="New variation" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Variation no." value={varForm.variation_no} onChange={e => setVarForm({ ...varForm, variation_no: e.target.value })} placeholder="VO-001" />
            <div className="col-span-2"><Input label="Title" value={varForm.title} onChange={e => setVarForm({ ...varForm, title: e.target.value })} placeholder="Variation title" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Type</label>
              <select
                value={varForm.variation_type}
                onChange={e => setVarForm({ ...varForm, variation_type: e.target.value as VariationType })}
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              >
                <option value="addition">Addition</option>
                <option value="omission">Omission</option>
                <option value="substitution">Substitution</option>
              </select>
            </div>
            <Input label="Amount" type="number" value={varForm.amount} onChange={e => setVarForm({ ...varForm, amount: e.target.value })} />
          </div>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddVariation(false)}>Cancel</Button>
            <Button onClick={handleAddVariation} disabled={!varForm.title.trim()}>Add</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showAddCost} onClose={() => setShowAddCost(false)} title="New cost entry" size="md">
        <div className="space-y-4">
          <Input label="Description" value={costForm.description} onChange={e => setCostForm({ ...costForm, description: e.target.value })} placeholder="Cost description" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Date" type="date" value={costForm.period_date} onChange={e => setCostForm({ ...costForm, period_date: e.target.value })} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Category</label>
              <select value={costForm.category} onChange={e => setCostForm({ ...costForm, category: e.target.value })} className="w-full px-3 py-2 text-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]">
                <option value="actual">Actual</option>
                <option value="committed">Committed</option>
                <option value="forecast">Forecast</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Type</label>
              <select value={costForm.cost_type} onChange={e => setCostForm({ ...costForm, cost_type: e.target.value })} className="w-full px-3 py-2 text-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]">
                {['direct', 'indirect', 'material', 'labor', 'equipment', 'subcontractor', 'overhead', 'other'].map(ct => <option key={ct} value={ct}>{ct}</option>)}
              </select>
            </div>
          </div>
          <Input label="Amount" type="number" value={costForm.amount} onChange={e => setCostForm({ ...costForm, amount: e.target.value })} />
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddCost(false)}>Cancel</Button>
            <Button onClick={handleAddCost} disabled={!costForm.description.trim()}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof TrendingUp }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--color-brand-tint)] flex items-center justify-center text-[var(--color-brand)]"><Icon size={12} /></div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      </div>
      <div className="text-lg font-bold mono text-[var(--color-text)]">{value}</div>
    </div>
  )
}
