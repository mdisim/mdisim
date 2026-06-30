'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import type { Contract, Variation, CostEntry, CashflowEntry, VariationType, VariationStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { TableSkeleton } from '@/components/ui/skeleton'
import {
  getContract,
  upsertContract,
  getVariations,
  createVariation,
  updateVariation,
  deleteVariation,
  getCostEntries,
  createCostEntry,
  deleteCostEntry,
  getCashflow,
} from '@/app/actions/cost-control'
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  Shield,
  PieChart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'
import { motion } from 'framer-motion'
import { StatCard } from '@/components/ui/stat-card'
import { SectionCard } from '@/components/ui/section-card'
import { PageHeader } from '@/components/ui/page-header'
import { DonutChart, SimpleBarChart } from '@/components/ui/mini-chart'
import { EmptyState } from '@/components/ui/empty-state'

const VAR_STATUS_COLOR: Record<VariationStatus, string> = {
  pending:   'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning)]/30',
  submitted: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info)]/30',
  approved:  'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30',
  rejected:  'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/30',
  withdrawn: 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] border border-[var(--color-border)]',
}

export default function CostControlPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { t } = useI18n()
  const { toast } = useToast()
  const [contract, setContract] = useState<Contract | null>(null)
  const [variations, setVariations] = useState<Variation[]>([])
  const [costEntries, setCostEntries] = useState<CostEntry[]>([])
  const [cashflow, setCashflow] = useState<CashflowEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'variations' | 'costs' | 'cashflow'>('overview')
  const [showContractEdit, setShowContractEdit] = useState(false)
  const [showAddVariation, setShowAddVariation] = useState(false)
  const [showAddCost, setShowAddCost] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [contractForm, setContractForm] = useState({
    contract_value: '', contingency_pct: '5', retention_pct: '10', advance_pct: '0',
    vat_pct: '17', start_date: '', end_date: '', duration_months: '', notes: '',
  })
  const [varForm, setVarForm] = useState({
    variation_no: '', title: '', description: '', variation_type: 'addition' as VariationType, amount: '',
  })
  const [costForm, setCostForm] = useState({
    period_date: '', category: 'actual', cost_type: 'direct', description: '', amount: '', notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, v, ce, cf] = await Promise.all([
        getContract(projectId), getVariations(projectId),
        getCostEntries(projectId), getCashflow(projectId),
      ])
      setContract(c)
      setVariations(v)
      setCostEntries(ce)
      setCashflow(cf)
      if (c) {
        setContractForm({
          contract_value: String(c.contract_value), contingency_pct: String(c.contingency_pct),
          retention_pct: String(c.retention_pct), advance_pct: String(c.advance_pct),
          vat_pct: String(c.vat_pct), start_date: c.start_date ?? '', end_date: c.end_date ?? '',
          duration_months: c.duration_months ? String(c.duration_months) : '', notes: c.notes ?? '',
        })
      }
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.costControl.loadError
      setError(message)
      setContract(null)
      setVariations([])
      setCostEntries([])
      setCashflow([])
    } finally {
      setLoading(false)
    }
  }, [projectId, t])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handleSaveContract = async () => {
    setError(null)
    try {
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
      if (r.error) {
        setError(r.error)
        toast({ title: t.costControl.saveContractError, description: r.error, variant: 'danger' })
        return
      }
      setShowContractEdit(false)
      toast({ title: t.costControl.saveContractSuccess, variant: 'success' })
      load()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.costControl.saveContractError
      setError(message)
      toast({ title: t.costControl.saveContractError, description: message, variant: 'danger' })
    }
  }

  const handleAddVariation = async () => {
    if (!varForm.title.trim()) return
    setError(null)
    try {
      const r = await createVariation({
        project_id: projectId,
        variation_no: varForm.variation_no,
        title: varForm.title,
        description: varForm.description || undefined,
        variation_type: varForm.variation_type,
        amount: parseFloat(varForm.amount) || 0,
      })
      if (r.error) {
        setError(r.error)
        toast({ title: t.costControl.addVariationError, description: r.error, variant: 'danger' })
        return
      }
      setShowAddVariation(false)
      setVarForm({ variation_no: '', title: '', description: '', variation_type: 'addition', amount: '' })
      toast({ title: t.costControl.addVariationSuccess, variant: 'success' })
      load()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.costControl.addVariationError
      setError(message)
      toast({ title: t.costControl.addVariationError, description: message, variant: 'danger' })
    }
  }

  const handleAddCost = async () => {
    if (!costForm.description.trim()) return
    setError(null)
    try {
      const r = await createCostEntry({
        project_id: projectId,
        period_date: costForm.period_date || new Date().toISOString().slice(0, 10),
        category: costForm.category,
        cost_type: costForm.cost_type,
        description: costForm.description,
        amount: parseFloat(costForm.amount) || 0,
        notes: costForm.notes || undefined,
      })
      if (r.error) {
        setError(r.error)
        toast({ title: t.costControl.addCostError, description: r.error, variant: 'danger' })
        return
      }
      setShowAddCost(false)
      setCostForm({ period_date: '', category: 'actual', cost_type: 'direct', description: '', amount: '', notes: '' })
      toast({ title: t.costControl.addCostSuccess, variant: 'success' })
      load()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.costControl.addCostError
      setError(message)
      toast({ title: t.costControl.addCostError, description: message, variant: 'danger' })
    }
  }

  const handleUpdateVariationStatus = async (id: string, status: VariationStatus) => {
    try {
      const r = await updateVariation(id, { status })
      if (r.error) {
        toast({ title: t.costControl.updateVariationError, description: r.error, variant: 'danger' })
        return
      }
      toast({
        title: t.costControl.updateVariationSuccess,
        variant: status === 'rejected' || status === 'withdrawn' ? 'warning' : 'success',
      })
      load()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.costControl.updateVariationError
      toast({ title: t.costControl.updateVariationError, description: message, variant: 'danger' })
    }
  }

  const handleDeleteVariation = async (id: string) => {
    try {
      const r = await deleteVariation(id)
      if (r.error) {
        toast({ title: t.costControl.deleteVariationError, description: r.error, variant: 'danger' })
        return
      }
      toast({ title: t.costControl.deleteVariationSuccess, variant: 'success' })
      load()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.costControl.deleteVariationError
      toast({ title: t.costControl.deleteVariationError, description: message, variant: 'danger' })
    }
  }

  const handleDeleteCostEntry = async (id: string) => {
    try {
      const r = await deleteCostEntry(id)
      if (r.error) {
        toast({ title: t.costControl.deleteCostEntryError, description: r.error, variant: 'danger' })
        return
      }
      toast({ title: t.costControl.deleteCostEntrySuccess, variant: 'success' })
      load()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.costControl.deleteCostEntryError
      toast({ title: t.costControl.deleteCostEntryError, description: message, variant: 'danger' })
    }
  }

  // EVM calculations
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

  const VAR_STATUS_LABEL: Record<VariationStatus, string> = {
    pending: t.costControl.statusPending,
    submitted: t.costControl.statusSubmitted,
    approved: t.costControl.statusApproved,
    rejected: t.costControl.statusRejected,
    withdrawn: t.costControl.statusWithdrawn,
  }

  if (loading) {
    return <div className="p-6 md:p-8 max-w-7xl mx-auto"><TableSkeleton rows={6} columns={4} /></div>
  }

  if (error && !contract && variations.length === 0 && costEntries.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-2xl p-6 text-center">
          <p className="text-[var(--color-danger)] font-medium mb-4">{error}</p>
          <Button onClick={() => load()}>{t.common.retry}</Button>
        </div>
      </div>
    )
  }

  if (!contract && variations.length === 0 && costEntries.length === 0 && cashflow.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <PageHeader icon={DollarSign} title={t.costControl.title} subtitle={t.costControl.subtitle} gradient="from-[var(--color-amber)] to-[var(--color-amber-dark)]" />
        <EmptyState
          icon={BarChart3}
          title={t.costControl.noDataTitle}
          description={t.costControl.noDataDesc}
          actionLabel={t.costControl.setUpContract}
          onAction={() => setShowContractEdit(true)}
        />

        {/* Contract Edit Modal */}
        <Modal isOpen={showContractEdit} onClose={() => setShowContractEdit(false)} title={t.costControl.contractDetailsTitle} size="md">
          <div className="space-y-4">
            <Input label={t.costControl.contractValue} type="number" value={contractForm.contract_value} onChange={e => setContractForm({ ...contractForm, contract_value: e.target.value })} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Input label={t.costControl.contingencyPct} type="number" value={contractForm.contingency_pct} onChange={e => setContractForm({ ...contractForm, contingency_pct: e.target.value })} />
              <Input label={t.costControl.retentionPct} type="number" value={contractForm.retention_pct} onChange={e => setContractForm({ ...contractForm, retention_pct: e.target.value })} />
              <Input label={t.costControl.advancePct} type="number" value={contractForm.advance_pct} onChange={e => setContractForm({ ...contractForm, advance_pct: e.target.value })} />
              <Input label={t.costControl.vatPct} type="number" value={contractForm.vat_pct} onChange={e => setContractForm({ ...contractForm, vat_pct: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label={t.costControl.startDate} type="date" value={contractForm.start_date} onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })} />
              <Input label={t.costControl.endDate} type="date" value={contractForm.end_date} onChange={e => setContractForm({ ...contractForm, end_date: e.target.value })} />
              <Input label={t.costControl.durationMonths} type="number" value={contractForm.duration_months} onChange={e => setContractForm({ ...contractForm, duration_months: e.target.value })} />
            </div>
            {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowContractEdit(false)}>{t.common.cancel}</Button>
              <Button onClick={handleSaveContract}>{t.common.save}</Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  const budgetHealthPct = revisedContract > 0 ? ((revisedContract - totalExposure) / revisedContract) * 100 : 0

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">{t.costControl.title}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t.costControl.subtitle}</p>
        </div>
        <Button variant="outline" onClick={() => setShowContractEdit(true)}>
          <DollarSign size={16} /> {contract ? t.costControl.editContract : t.costControl.setContract}
        </Button>
      </div>

      {/* KPI Strip — glass cards matching Stitch "Hero Stats Row" */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {/* Contract Value */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-5 space-y-2"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.contractValue}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-amber)]">{fmt(revisedContract)}</span>
          </div>
          <div className="w-full h-1 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
            <div className="bg-[var(--color-amber)] h-full" style={{ width: '100%' }} />
          </div>
        </motion.div>

        {/* Spent to Date */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-5 space-y-2"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.spentToDate}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-text)]">{fmt(actualCost)}</span>
            {revisedContract > 0 && (
              <span className="text-xs text-[var(--color-danger)]">
                {((actualCost / revisedContract) * 100).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="w-full h-1 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
            <div
              className="bg-[var(--color-danger)] h-full transition-all"
              style={{ width: revisedContract > 0 ? `${Math.min((actualCost / revisedContract) * 100, 100)}%` : '0%' }}
            />
          </div>
        </motion.div>

        {/* Remaining Budget */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-5 space-y-2"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.remainingBudget}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--color-text)]">{fmt(Math.max(revisedContract - totalExposure, 0))}</span>
          </div>
          <div className="w-full h-1 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
            <div
              className="bg-[var(--color-success)] h-full transition-all"
              style={{ width: revisedContract > 0 ? `${Math.max(Math.min(((revisedContract - totalExposure) / revisedContract) * 100, 100), 0)}%` : '0%' }}
            />
          </div>
        </motion.div>

        {/* Budget Health */}
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
          className={cn(
            'rounded-2xl p-5 space-y-2 border',
            projectedProfit >= 0
              ? 'bg-[var(--color-amber)]/5 border-[var(--color-amber)]/20'
              : 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]/20'
          )}
        >
          <span className={cn(
            'text-[10px] font-semibold uppercase tracking-widest',
            projectedProfit >= 0 ? 'text-[var(--color-amber)]' : 'text-[var(--color-danger)]'
          )}>{t.costControl.budgetHealth}</span>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'text-2xl font-bold',
              projectedProfit >= 0 ? 'text-[var(--color-amber)]' : 'text-[var(--color-danger)]'
            )}>
              {budgetHealthPct.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {projectedProfit >= 0 ? (
              <CheckCircle2 size={13} className="text-[var(--color-amber)]" />
            ) : (
              <AlertTriangle size={13} className="text-[var(--color-danger)]" />
            )}
            <span className={projectedProfit >= 0 ? 'text-[var(--color-amber)]' : 'text-[var(--color-danger)]'}>
              {projectedProfit >= 0 ? 'On Track' : 'Over Budget'}
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {(['overview', 'variations', 'costs', 'cashflow'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab
                ? 'border-[var(--color-amber)] text-[var(--color-amber)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            )}
          >
            {t.costControl[tab]}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title={t.costControl.budgetBreakdown} icon={PieChart} iconColor="text-[var(--color-amber)]">
              <DonutChart segments={[
                { value: actualCost, color: 'var(--color-danger)', label: t.costControl.actualCost },
                { value: committedCost, color: 'var(--color-warning)', label: t.costControl.committed },
                { value: forecastCost, color: 'var(--color-info)', label: t.costControl.forecast },
                { value: Math.max(revisedContract - totalExposure, 0), color: 'var(--color-success)', label: t.costControl.remaining },
              ].filter(s => s.value > 0)} />
            </SectionCard>
            <SectionCard title={t.costControl.costVariance} icon={BarChart3} iconColor="text-[var(--color-amber)]">
              <SimpleBarChart bars={[
                { label: t.costControl.contractValue, value: contractValue, color: 'var(--color-amber)' },
                { label: t.costControl.approvedVarShort, value: approvedVariations, color: 'var(--color-success)' },
                { label: t.costControl.actualCost, value: actualCost, color: 'var(--color-danger)' },
                { label: t.costControl.committed, value: committedCost, color: 'var(--color-warning)' },
                { label: t.costControl.forecast, value: forecastCost, color: 'var(--color-info)' },
              ]} horizontal />
            </SectionCard>
          </div>

          {/* Financial Summary */}
          <SectionCard title={t.costControl.financialSummary} icon={FileText} iconColor="text-[var(--color-amber)]" noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <tbody>
                  {[
                    { label: t.costControl.rowOriginalContractValue, value: contractValue },
                    { label: t.costControl.rowApprovedVariations, value: approvedVariations },
                    { label: t.costControl.rowPendingVariations, value: pendingVariations, muted: true },
                    { label: t.costControl.rowRevisedContractValue, value: revisedContract, bold: true },
                    { label: t.costControl.rowActualCostToDate, value: actualCost },
                    { label: t.costControl.rowCommittedCost, value: committedCost },
                    { label: t.costControl.rowForecastToComplete, value: forecastCost },
                    { label: t.costControl.rowTotalExposure, value: totalExposure, bold: true },
                    { label: t.costControl.rowContingency, value: contingency },
                    { label: t.costControl.rowProjectedProfitLoss, value: projectedProfit, bold: true, highlight: true },
                  ].map(row => (
                    <tr
                      key={row.label}
                      className={cn(
                        'border-b border-[var(--color-border)]',
                        row.bold && 'bg-[var(--color-surface-hover)]'
                      )}
                    >
                      <td className={cn(
                        'px-5 py-3',
                        row.bold ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]',
                        row.muted && 'text-[var(--color-text-muted)] italic'
                      )}>
                        {row.label}
                      </td>
                      <td className={cn(
                        'px-5 py-3 text-end tabular-nums font-mono text-sm',
                        row.bold ? 'font-bold text-[var(--color-text)]' : 'text-[var(--color-text)]',
                        row.highlight && (projectedProfit >= 0 ? 'text-[var(--color-success)] font-bold' : 'text-[var(--color-danger)] font-bold')
                      )}>
                        {fmt(row.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {/* Variations tab */}
      {activeTab === 'variations' && (
        <SectionCard
          title={t.costControl.variationsRegister}
          icon={FileText}
          iconColor="text-[var(--color-amber)]"
          noPadding
          actions={
            <Button size="sm" onClick={() => setShowAddVariation(true)}>
              <Plus size={14} /> {t.costControl.addVariation}
            </Button>
          }
        >
          {variations.length === 0 ? (
            <EmptyState icon={FileText} title={t.costControl.noVariationsTitle} description={t.costControl.noVariationsDesc} compact />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                    <th className="text-start px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colVariationNo}</th>
                    <th className="text-start px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colTitle}</th>
                    <th className="text-start px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colType}</th>
                    <th className="text-start px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colStatus}</th>
                    <th className="text-end px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colAmount}</th>
                    <th className="text-end px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colApproved}</th>
                    <th className="w-[50px]" />
                  </tr>
                </thead>
                <tbody>
                  {variations.map(v => (
                    <tr key={v.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-[var(--color-text-muted)]">{v.variation_no}</td>
                      <td className="px-5 py-3 text-[var(--color-text)]">{v.title}</td>
                      <td className="px-5 py-3 text-xs capitalize text-[var(--color-text-secondary)]">{v.variation_type}</td>
                      <td className="px-5 py-3">
                        <select
                          value={v.status}
                          onChange={e => handleUpdateVariationStatus(v.id, e.target.value as VariationStatus)}
                          aria-label={t.costControl.colStatus}
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full border-0 font-medium cursor-pointer focus:outline-none',
                            VAR_STATUS_COLOR[v.status]
                          )}
                        >
                          {(Object.keys(VAR_STATUS_COLOR) as VariationStatus[]).map(k => (
                            <option key={k} value={k}>{VAR_STATUS_LABEL[k]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3 text-end tabular-nums font-mono text-sm text-[var(--color-text)]">{fmt(v.amount)}</td>
                      <td className="px-5 py-3 text-end tabular-nums font-mono text-sm font-medium text-[var(--color-success)]">
                        {v.approved_amount != null ? fmt(v.approved_amount) : '-'}
                      </td>
                      <td className="px-5 py-2 text-center">
                        <button
                          onClick={() => handleDeleteVariation(v.id)}
                          className="p-1.5 rounded-lg hover:bg-[var(--color-danger-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                          title={t.costControl.deleteVariation}
                          aria-label={t.costControl.deleteVariation}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-surface-hover)]">
                    <td colSpan={4} className="px-5 py-3 font-semibold text-[var(--color-text)]">{t.costControl.total}</td>
                    <td className="px-5 py-3 text-end font-bold tabular-nums font-mono text-[var(--color-text)]">
                      {fmt(variations.reduce((s, v) => s + v.amount, 0))}
                    </td>
                    <td className="px-5 py-3 text-end font-bold tabular-nums font-mono text-[var(--color-success)]">
                      {fmt(variations.filter(v => v.approved_amount != null).reduce((s, v) => s + (v.approved_amount ?? 0), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {/* Cost entries tab */}
      {activeTab === 'costs' && (
        <div className="space-y-6">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          >
            <StatCard label={t.costControl.actualCost} value={actualCost} decimals={2} icon={TrendingDown} gradient="from-[var(--color-danger)] to-rose-700" compact />
            <StatCard label={t.costControl.committed} value={committedCost} decimals={2} icon={Clock} gradient="from-[var(--color-warning)] to-orange-600" compact />
            <StatCard label={t.costControl.forecast} value={forecastCost} decimals={2} icon={TrendingUp} gradient="from-[var(--color-info)] to-blue-700" compact />
          </motion.div>

          <SectionCard
            title={t.costControl.costEntries}
            icon={DollarSign}
            iconColor="text-[var(--color-amber)]"
            noPadding
            actions={
              <Button size="sm" onClick={() => setShowAddCost(true)}>
                <Plus size={14} /> {t.costControl.addEntry}
              </Button>
            }
          >
            {costEntries.length === 0 ? (
              <EmptyState icon={DollarSign} title={t.costControl.noCostEntriesTitle} description={t.costControl.noCostEntriesDesc} compact />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                      <th className="text-start px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colDate}</th>
                      <th className="text-start px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colDescription}</th>
                      <th className="text-start px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colCategory}</th>
                      <th className="text-start px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colType}</th>
                      <th className="text-end px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colAmount}</th>
                      <th className="w-[50px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {costEntries.map(ce => (
                      <tr key={ce.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors">
                        <td className="px-5 py-3 text-xs font-mono text-[var(--color-text-muted)]">{ce.period_date}</td>
                        <td className="px-5 py-3 text-[var(--color-text)]">{ce.description}</td>
                        <td className="px-5 py-3 text-xs capitalize text-[var(--color-text-secondary)]">{ce.category}</td>
                        <td className="px-5 py-3 text-xs capitalize text-[var(--color-text-secondary)]">{ce.cost_type}</td>
                        <td className="px-5 py-3 text-end tabular-nums font-mono text-sm font-medium text-[var(--color-text)]">{fmt(ce.amount)}</td>
                        <td className="px-5 py-2 text-center">
                          <button
                            onClick={() => handleDeleteCostEntry(ce.id)}
                            className="p-1.5 rounded-lg hover:bg-[var(--color-danger-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                            title={t.costControl.deleteCostEntry}
                            aria-label={t.costControl.deleteCostEntry}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Cashflow tab */}
      {activeTab === 'cashflow' && (
        <div className="space-y-6">
          {cashflow.length > 0 && (
            <SectionCard title={t.costControl.monthlyCashflow} icon={BarChart3} iconColor="text-[var(--color-success)]">
              <SimpleBarChart
                bars={cashflow.map(cf => ({
                  label: cf.period_date,
                  value: cf.actual_income - cf.actual_expense,
                  color: (cf.actual_income - cf.actual_expense) >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                }))}
                horizontal={false}
              />
            </SectionCard>
          )}
          <SectionCard title={t.costControl.cashflowDetails} icon={DollarSign} iconColor="text-[var(--color-amber)]" noPadding>
            {cashflow.length === 0 ? (
              <EmptyState icon={BarChart3} title={t.costControl.noCashflowTitle} description={t.costControl.noCashflowDesc} compact />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                      <th className="text-start px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colPeriod}</th>
                      <th className="text-end px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colPlanIncome}</th>
                      <th className="text-end px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colActualIncome}</th>
                      <th className="text-end px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colPlanExpense}</th>
                      <th className="text-end px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colActualExpense}</th>
                      <th className="text-end px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.costControl.colNet}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashflow.map(cf => {
                      const net = cf.actual_income - cf.actual_expense
                      return (
                        <tr key={cf.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors">
                          <td className="px-5 py-3 text-xs font-mono text-[var(--color-text-muted)]">{cf.period_date}</td>
                          <td className="px-5 py-3 text-end tabular-nums font-mono text-sm text-[var(--color-text)]">{fmt(cf.planned_income)}</td>
                          <td className="px-5 py-3 text-end tabular-nums font-mono text-sm text-[var(--color-text)]">{fmt(cf.actual_income)}</td>
                          <td className="px-5 py-3 text-end tabular-nums font-mono text-sm text-[var(--color-text)]">{fmt(cf.planned_expense)}</td>
                          <td className="px-5 py-3 text-end tabular-nums font-mono text-sm text-[var(--color-text)]">{fmt(cf.actual_expense)}</td>
                          <td className={cn(
                            'px-5 py-3 text-end tabular-nums font-mono text-sm font-bold',
                            net >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
                          )}>
                            {fmt(net)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Contract Edit Modal */}
      <Modal isOpen={showContractEdit} onClose={() => setShowContractEdit(false)} title={t.costControl.contractDetailsTitle} size="md">
        <div className="space-y-4">
          <Input label={t.costControl.contractValue} type="number" value={contractForm.contract_value} onChange={e => setContractForm({ ...contractForm, contract_value: e.target.value })} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input label={t.costControl.contingencyPct} type="number" value={contractForm.contingency_pct} onChange={e => setContractForm({ ...contractForm, contingency_pct: e.target.value })} />
            <Input label={t.costControl.retentionPct} type="number" value={contractForm.retention_pct} onChange={e => setContractForm({ ...contractForm, retention_pct: e.target.value })} />
            <Input label={t.costControl.advancePct} type="number" value={contractForm.advance_pct} onChange={e => setContractForm({ ...contractForm, advance_pct: e.target.value })} />
            <Input label={t.costControl.vatPct} type="number" value={contractForm.vat_pct} onChange={e => setContractForm({ ...contractForm, vat_pct: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label={t.costControl.startDate} type="date" value={contractForm.start_date} onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })} />
            <Input label={t.costControl.endDate} type="date" value={contractForm.end_date} onChange={e => setContractForm({ ...contractForm, end_date: e.target.value })} />
            <Input label={t.costControl.durationMonths} type="number" value={contractForm.duration_months} onChange={e => setContractForm({ ...contractForm, duration_months: e.target.value })} />
          </div>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowContractEdit(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSaveContract}>{t.common.save}</Button>
          </div>
        </div>
      </Modal>

      {/* Add Variation Modal */}
      <Modal isOpen={showAddVariation} onClose={() => setShowAddVariation(false)} title={t.costControl.newVariationTitle} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label={t.costControl.variationNoLabel} value={varForm.variation_no} onChange={e => setVarForm({ ...varForm, variation_no: e.target.value })} placeholder="VO-001" />
            <div className="col-span-2">
              <Input label={t.costControl.titleLabel} value={varForm.title} onChange={e => setVarForm({ ...varForm, title: e.target.value })} placeholder={t.costControl.variationTitlePlaceholder} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">{t.costControl.typeLabel}</label>
              <select
                value={varForm.variation_type}
                onChange={e => setVarForm({ ...varForm, variation_type: e.target.value as VariationType })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/40"
              >
                <option value="addition">{t.costControl.typeAddition}</option>
                <option value="omission">{t.costControl.typeOmission}</option>
                <option value="substitution">{t.costControl.typeSubstitution}</option>
              </select>
            </div>
            <Input label={t.costControl.amountLabel} type="number" value={varForm.amount} onChange={e => setVarForm({ ...varForm, amount: e.target.value })} />
          </div>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddVariation(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAddVariation} disabled={!varForm.title.trim()}>{t.common.add}</Button>
          </div>
        </div>
      </Modal>

      {/* Add Cost Modal */}
      <Modal isOpen={showAddCost} onClose={() => setShowAddCost(false)} title={t.costControl.newCostEntryTitle} size="md">
        <div className="space-y-4">
          <Input label={t.costControl.descriptionLabel} value={costForm.description} onChange={e => setCostForm({ ...costForm, description: e.target.value })} placeholder={t.costControl.costDescriptionPlaceholder} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label={t.costControl.dateLabel} type="date" value={costForm.period_date} onChange={e => setCostForm({ ...costForm, period_date: e.target.value })} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">{t.costControl.categoryLabel}</label>
              <select
                value={costForm.category}
                onChange={e => setCostForm({ ...costForm, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/40"
              >
                <option value="actual">{t.costControl.categoryActual}</option>
                <option value="committed">{t.costControl.categoryCommitted}</option>
                <option value="forecast">{t.costControl.categoryForecast}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">{t.costControl.typeLabel}</label>
              <select
                value={costForm.cost_type}
                onChange={e => setCostForm({ ...costForm, cost_type: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/40"
              >
                {['direct','indirect','material','labor','equipment','subcontractor','overhead','other'].map(ct => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>
          </div>
          <Input label={t.costControl.amountLabel} type="number" value={costForm.amount} onChange={e => setCostForm({ ...costForm, amount: e.target.value })} />
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddCost(false)}>{t.common.cancel}</Button>
            <Button onClick={handleAddCost} disabled={!costForm.description.trim()}>{t.common.add}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
