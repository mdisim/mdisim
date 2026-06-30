'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import type { RateAnalysis, RateResource, ResourceType } from '@/lib/types'
import { RESOURCE_TYPES, MEASUREMENT_UNITS } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Card } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/skeleton'
import {
  getRateAnalyses,
  createRateAnalysis,
  updateRateAnalysis,
  deleteRateAnalysis,
  createRateResource,
  updateRateResource,
  deleteRateResource,
} from '@/app/actions/rate-analysis'
import { getBOQItems } from '@/app/actions/boq'
import type { BOQItem } from '@/lib/types'
import ResourceBreakdown from '@/components/resource-breakdown'
import {
  Plus,
  Trash2,
  Calculator,
  ChevronDown,
  ChevronRight,
  Package,
  Users,
  Wrench,
  Building2,
  Search,
  TrendingUp,
  Layers,
  DollarSign,
  BarChart3,
  PieChart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatCard } from '@/components/ui/stat-card'
import { SectionCard } from '@/components/ui/section-card'
import { PageHeader } from '@/components/ui/page-header'
import { DonutChart, SimpleBarChart } from '@/components/ui/mini-chart'
import { EmptyState } from '@/components/ui/empty-state'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'

const RESOURCE_ICONS: Record<ResourceType, React.ComponentType<{ size?: number; className?: string }>> = {
  material: Package,
  labor: Users,
  equipment: Wrench,
  subcontractor: Building2,
}

const RESOURCE_COLORS: Record<ResourceType, string> = {
  material:     'text-[var(--color-info)]',
  labor:        'text-[var(--color-amber)]',
  equipment:    'text-[var(--color-indigo)]',
  subcontractor:'text-[var(--color-success)]',
}

const RESOURCE_BG_COLORS: Record<ResourceType, string> = {
  material:     'bg-[var(--color-info-bg)]',
  labor:        'bg-[var(--color-amber)]/10',
  equipment:    'bg-[var(--color-indigo)]/10',
  subcontractor:'bg-[var(--color-success-bg)]',
}

export default function RateAnalysisPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { t } = useI18n()
  const { toast } = useToast()
  const [analyses, setAnalyses] = useState<RateAnalysis[]>([])
  const [boqItems, setBOQItems] = useState<BOQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'analyses' | 'breakdown'>('analyses')
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const [form, setForm] = useState({
    description: '',
    unit: 'm',
    output_qty: '1',
    overhead_pct: '10',
    profit_pct: '10',
    boq_item_id: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ra, boq] = await Promise.all([
        getRateAnalyses(projectId),
        getBOQItems(projectId),
      ])
      setAnalyses(ra)
      setBOQItems(boq)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.rates.loadError)
      setAnalyses([])
      setBOQItems([])
    } finally {
      setLoading(false)
    }
  }, [projectId, t])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!form.description.trim()) return
    setError(null)
    const result = await createRateAnalysis({
      project_id: projectId,
      description: form.description,
      unit: form.unit,
      output_qty: parseFloat(form.output_qty) || 1,
      overhead_pct: parseFloat(form.overhead_pct) || 0,
      profit_pct: parseFloat(form.profit_pct) || 0,
      boq_item_id: form.boq_item_id || undefined,
    })
    if (result.error) {
      setError(result.error)
      toast({ title: t.rates.createError, description: result.error, variant: 'danger' })
      return
    }
    toast({ title: t.rates.createSuccess, variant: 'success' })
    setShowCreate(false)
    setForm({ description: '', unit: 'm', output_qty: '1', overhead_pct: '10', profit_pct: '10', boq_item_id: '' })
    load()
  }

  const handleDelete = async (id: string) => {
    setConfirmAction({
      message: t.rates.deleteAnalysisConfirm,
      onConfirm: async () => {
        try {
          await deleteRateAnalysis(id)
          toast({ title: t.rates.deleteSuccess, variant: 'success' })
        } catch {
          setError(t.rates.deleteError)
          toast({ title: t.rates.deleteError, variant: 'danger' })
        }
        load()
      },
    })
  }

  const handleUpdateAnalysis = async (id: string, fields: Partial<RateAnalysis>) => {
    try {
      const result = await updateRateAnalysis(id, fields)
      if (result.error) {
        setError(result.error)
        toast({ title: t.rates.updateError, description: result.error, variant: 'danger' })
      } else {
        toast({ title: t.rates.updateSuccess, variant: 'success' })
      }
    } catch {
      setError(t.rates.updateError)
      toast({ title: t.rates.updateError, variant: 'danger' })
    }
    load()
  }

  const handleAddResource = async (raId: string, type: ResourceType) => {
    try {
      await createRateResource({
        rate_analysis_id: raId,
        resource_type: type,
        description: `New ${type}`,
      })
      toast({ title: t.rates.addResourceSuccess, variant: 'success' })
    } catch {
      toast({ title: t.rates.addResourceError, variant: 'danger' })
    }
    load()
  }

  const handleUpdateResource = async (id: string, fields: Partial<RateResource>) => {
    try {
      await updateRateResource(id, fields)
    } catch {
      toast({ title: t.rates.updateResourceError, variant: 'danger' })
    }
    load()
  }

  const handleDeleteResource = async (id: string) => {
    try {
      await deleteRateResource(id)
      toast({ title: t.rates.deleteResourceSuccess, variant: 'success' })
    } catch {
      toast({ title: t.rates.deleteResourceError, variant: 'danger' })
    }
    load()
  }

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const unlinkedBOQ = boqItems.filter(b => !analyses.some(a => a.boq_item_id === b.id))

  const filteredAnalyses = useMemo(() => {
    if (!searchQuery.trim()) return analyses
    const q = searchQuery.toLowerCase()
    return analyses.filter(ra =>
      ra.description.toLowerCase().includes(q) ||
      ra.unit.toLowerCase().includes(q)
    )
  }, [analyses, searchQuery])

  // Summary metrics
  const metrics = useMemo(() => {
    const totalDirectCost = analyses.reduce((s, ra) => s + ra.direct_cost, 0)
    const totalResources = analyses.reduce((s, ra) => s + (ra.resources?.length ?? 0), 0)
    const avgUnitRate = analyses.length > 0
      ? analyses.reduce((s, ra) => s + ra.unit_rate, 0) / analyses.length
      : 0
    const linkedCount = analyses.filter(a => a.boq_item_id).length

    const byType: Record<ResourceType, number> = { material: 0, labor: 0, equipment: 0, subcontractor: 0 }
    analyses.forEach(ra => {
      (ra.resources ?? []).forEach(r => {
        byType[r.resource_type] = (byType[r.resource_type] || 0) + r.total_amount
      })
    })

    const totalByType = Object.values(byType).reduce((a, b) => a + b, 0)
    const materialPct = totalByType > 0 ? (byType.material / totalByType) * 100 : 0
    const laborPct = totalByType > 0 ? (byType.labor / totalByType) * 100 : 0
    const equipmentPct = totalByType > 0 ? (byType.equipment / totalByType) * 100 : 0

    return { totalDirectCost, totalResources, avgUnitRate, linkedCount, byType, totalByType, materialPct, laborPct, equipmentPct }
  }, [analyses])

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">{t.rates.title}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t.rates.subtitle}</p>
        </div>
        {activeTab === 'analyses' && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            {t.rates.newAnalysis}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab('analyses')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'analyses'
              ? 'border-[var(--color-amber)] text-[var(--color-amber)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
          )}
        >
          <Calculator size={15} />
          {t.rates.rateAnalysesTab}
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'breakdown'
              ? 'border-[var(--color-amber)] text-[var(--color-amber)]'
              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
          )}
        >
          <PieChart size={15} />
          {t.rates.resourceBreakdownTab}
        </button>
      </div>

      {activeTab === 'breakdown' ? (
        <ResourceBreakdown rateAnalyses={analyses} />
      ) : (
        <>
          {/* Summary Metric Cards — Stitch rate card grid with material/labor breakdown bars */}
          {!loading && analyses.length > 0 && (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              initial="hidden" animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            >
              {/* Total Unit Rate */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col justify-between"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.rates.totalItems}</span>
                <div className="mt-3">
                  <p className="text-3xl font-bold text-[var(--color-amber)] tracking-tighter">{analyses.length}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1 uppercase tracking-wider font-mono">{t.rates.rateAnalysesTab}</p>
                </div>
              </motion.div>

              {/* Avg Rate */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="bg-[var(--color-surface-elevated)] border border-s-4 border-[var(--color-border)] border-s-[var(--color-info)] rounded-2xl p-5 flex flex-col justify-between"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.rates.avgRate}</span>
                <div className="mt-3">
                  <p className="text-xl font-bold text-[var(--color-text)]">{fmt(metrics.avgUnitRate)}</p>
                  <div className="w-full h-1 rounded-full bg-[var(--color-surface-hover)] mt-2 overflow-hidden">
                    <div className="bg-[var(--color-info)] h-full" style={{ width: '60%' }} />
                  </div>
                </div>
              </motion.div>

              {/* Material % */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="bg-[var(--color-surface-elevated)] border border-s-4 border-[var(--color-border)] border-s-[var(--color-amber)] rounded-2xl p-5 flex flex-col justify-between"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.rates.materialCost}</span>
                <div className="mt-3">
                  <p className="text-xl font-bold text-[var(--color-text)]">{metrics.materialPct.toFixed(1)}%</p>
                  <div className="w-full h-1 rounded-full bg-[var(--color-surface-hover)] mt-2 overflow-hidden">
                    <div className="bg-[var(--color-amber)] h-full" style={{ width: `${metrics.materialPct}%` }} />
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{t.rates.materialCost}</p>
                </div>
              </motion.div>

              {/* Labor % */}
              <motion.div
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="bg-[var(--color-surface-elevated)] border border-s-4 border-[var(--color-border)] border-s-[var(--color-indigo)] rounded-2xl p-5 flex flex-col justify-between"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.rates.laborCost}</span>
                <div className="mt-3">
                  <p className="text-xl font-bold text-[var(--color-text)]">{metrics.laborPct.toFixed(1)}%</p>
                  <div className="w-full h-1 rounded-full bg-[var(--color-surface-hover)] mt-2 overflow-hidden">
                    <div className="bg-[var(--color-indigo)] h-full" style={{ width: `${metrics.laborPct}%` }} />
                  </div>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">{t.rates.laborCost}</p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Cost Distribution & Rate Comparison Charts */}
          {!loading && analyses.length > 0 && metrics.totalByType > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title={t.rates.costDistribution} icon={PieChart} iconColor="text-[var(--color-amber)]">
                <DonutChart
                  segments={[
                    { value: metrics.byType.material, color: 'var(--color-info)', label: 'Material' },
                    { value: metrics.byType.labor, color: 'var(--color-amber)', label: 'Labor' },
                    { value: metrics.byType.equipment, color: 'var(--color-indigo)', label: 'Equipment' },
                    { value: metrics.byType.subcontractor, color: 'var(--color-success)', label: 'Subcontractor' },
                  ].filter(s => s.value > 0)}
                />
              </SectionCard>
              <SectionCard title={t.rates.rateComparison} icon={BarChart3} iconColor="text-[var(--color-amber)]">
                <SimpleBarChart
                  bars={[...analyses]
                    .sort((a, b) => b.unit_rate - a.unit_rate)
                    .slice(0, 5)
                    .map((ra, i) => ({
                      label: ra.description.length > 25 ? ra.description.slice(0, 25) + '...' : ra.description,
                      value: ra.unit_rate,
                      color: ['var(--color-amber)', 'var(--color-info)', 'var(--color-indigo)', 'var(--color-success)', 'var(--color-danger)'][i] || 'var(--color-amber)',
                    }))}
                  horizontal
                />
              </SectionCard>
            </div>
          )}

          {/* Search Bar */}
          {!loading && analyses.length > 0 && (
            <div className="relative">
              <Search size={15} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder={t.rates.searchPlaceholder}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full ps-10 pe-4 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/40 focus:border-[var(--color-amber)]/40 transition-shadow"
              />
              {searchQuery && (
                <span className="absolute end-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] font-mono">
                  {filteredAnalyses.length} / {analyses.length}
                </span>
              )}
            </div>
          )}

          {loading ? (
            <TableSkeleton rows={6} columns={4} />
          ) : error && analyses.length === 0 ? (
            <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-2xl p-6 text-center">
              <p className="text-[var(--color-danger)] font-medium mb-4">{error}</p>
              <Button onClick={() => load()}>{t.rates.retry}</Button>
            </div>
          ) : analyses.length === 0 ? (
            <EmptyState
              icon={Calculator}
              title={t.rates.noAnalysesTitle}
              description={t.rates.noAnalysesDesc}
              actionLabel={t.rates.createFirstAnalysis}
              onAction={() => setShowCreate(true)}
            />
          ) : filteredAnalyses.length === 0 ? (
            <EmptyState
              icon={Search}
              title={`${t.rates.noMatch} "${searchQuery}"`}
              compact
            />
          ) : (
            <div className="space-y-3">
              {filteredAnalyses.map((ra, idx) => (
                <motion.div
                  key={ra.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                >
                  <RateAnalysisCard
                    analysis={ra}
                    isExpanded={expandedId === ra.id}
                    onToggle={() => setExpandedId(expandedId === ra.id ? null : ra.id)}
                    onDelete={() => handleDelete(ra.id)}
                    onUpdate={(fields) => handleUpdateAnalysis(ra.id, fields)}
                    onAddResource={(type) => handleAddResource(ra.id, type)}
                    onUpdateResource={handleUpdateResource}
                    onDeleteResource={handleDeleteResource}
                    fmt={fmt}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Rate Analysis" size="md">
        <div className="space-y-4">
          {unlinkedBOQ.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Link to BOQ Item</label>
              <select
                value={form.boq_item_id}
                onChange={(e) => {
                  const boq = boqItems.find(b => b.id === e.target.value)
                  setForm(prev => ({
                    ...prev,
                    boq_item_id: e.target.value,
                    description: boq?.description ?? prev.description,
                    unit: boq?.unit ?? prev.unit,
                  }))
                }}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/40 transition-shadow"
              >
                <option value="">None — standalone analysis</option>
                {unlinkedBOQ.map(b => (
                  <option key={b.id} value={b.id}>{b.code ? `${b.code} — ` : ''}{b.description}</option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--color-text-muted)]">Optionally link to a BOQ item to auto-sync the unit rate</p>
            </div>
          )}
          <Input
            label="Description"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="e.g. Reinforced concrete grade C30"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Unit</label>
              <select
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/40 transition-shadow"
              >
                {MEASUREMENT_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <Input label="Output Qty" type="number" value={form.output_qty} onChange={e => setForm({ ...form, output_qty: e.target.value })} />
            <Input label="Overhead %" type="number" value={form.overhead_pct} onChange={e => setForm({ ...form, overhead_pct: e.target.value })} />
            <Input label="Profit %" type="number" value={form.profit_pct} onChange={e => setForm({ ...form, profit_pct: e.target.value })} />
          </div>
          {error && <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.description.trim()}>Create Analysis</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm" size="sm">
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>Confirm</Button>
        </div>
      </Modal>
    </div>
  )
}

function RateAnalysisCard({
  analysis: ra,
  isExpanded,
  onToggle,
  onDelete,
  onUpdate,
  onAddResource,
  onUpdateResource,
  onDeleteResource,
  fmt,
}: {
  analysis: RateAnalysis
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
  onUpdate: (fields: Partial<RateAnalysis>) => void
  onAddResource: (type: ResourceType) => void
  onUpdateResource: (id: string, fields: Partial<RateResource>) => void
  onDeleteResource: (id: string) => void
  fmt: (n: number) => string
}) {
  const resources = ra.resources ?? []
  const grouped = RESOURCE_TYPES.map(rt => ({
    ...rt,
    items: resources.filter(r => r.resource_type === rt.value).sort((a, b) => a.sort_order - b.sort_order),
    total: resources.filter(r => r.resource_type === rt.value).reduce((s, r) => s + r.total_amount, 0),
  }))

  const resourceCount = resources.length

  return (
    <div className={cn(
      'bg-[var(--color-surface-elevated)] border rounded-2xl overflow-hidden transition-all duration-200',
      isExpanded
        ? 'border-[var(--color-amber)]/30 shadow-lg shadow-[var(--color-amber)]/5'
        : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
    )}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors group"
        onClick={onToggle}
      >
        <div className={cn(
          'p-1 rounded transition-colors shrink-0',
          isExpanded ? 'text-[var(--color-amber)]' : 'text-[var(--color-text-muted)]'
        )}>
          {isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--color-text)] truncate">{ra.description}</div>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] mt-0.5">
            <span className="font-mono">per {ra.output_qty} {ra.unit}</span>
            <span className="w-px h-3 bg-[var(--color-border)]" />
            <span>OH {ra.overhead_pct}%</span>
            <span className="w-px h-3 bg-[var(--color-border)]" />
            <span>Profit {ra.profit_pct}%</span>
            {resourceCount > 0 && (
              <>
                <span className="w-px h-3 bg-[var(--color-border)]" />
                <span>{resourceCount} resource{resourceCount !== 1 ? 's' : ''}</span>
              </>
            )}
          </div>
        </div>

        {/* Mini resource type indicators */}
        <div className="hidden md:flex items-center gap-1 me-2">
          {grouped.map(g => {
            if (g.items.length === 0) return null
            const Icon = RESOURCE_ICONS[g.value]
            return (
              <div
                key={g.value}
                className={cn('p-1.5 rounded-lg', RESOURCE_BG_COLORS[g.value])}
                title={`${g.label}: ${fmt(g.total)}`}
              >
                <Icon size={12} className={RESOURCE_COLORS[g.value]} />
              </div>
            )
          })}
        </div>

        {/* Unit rate */}
        <div className="text-end shrink-0 me-2">
          <div className="text-lg font-bold text-[var(--color-text)] tabular-nums font-mono">{fmt(ra.unit_rate)}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">per {ra.unit}</div>
        </div>

        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--color-danger-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)]">
          {/* Settings row */}
          <div className="flex items-center gap-6 px-5 py-3 bg-[var(--color-surface-hover)] text-xs border-b border-[var(--color-border)]">
            <label className="flex items-center gap-2">
              <span className="text-[var(--color-text-secondary)] font-medium">Output Qty</span>
              <input
                type="number"
                value={ra.output_qty}
                onChange={e => onUpdate({ output_qty: parseFloat(e.target.value) || 1 })}
                className="w-16 px-2 py-1 text-xs border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-amber)]/40 focus:outline-none"
                step="any"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[var(--color-text-secondary)] font-medium">Overhead</span>
              <input
                type="number"
                value={ra.overhead_pct}
                onChange={e => onUpdate({ overhead_pct: parseFloat(e.target.value) || 0 })}
                className="w-14 px-2 py-1 text-xs border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-amber)]/40 focus:outline-none"
              />
              <span className="text-[var(--color-text-muted)]">%</span>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-[var(--color-text-secondary)] font-medium">Profit</span>
              <input
                type="number"
                value={ra.profit_pct}
                onChange={e => onUpdate({ profit_pct: parseFloat(e.target.value) || 0 })}
                className="w-14 px-2 py-1 text-xs border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-amber)]/40 focus:outline-none"
              />
              <span className="text-[var(--color-text-muted)]">%</span>
            </label>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-2 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
            <div className="flex-1 min-w-0">Description</div>
            <div className="w-12 text-center">Unit</div>
            <div className="w-16 text-end">Qty</div>
            <div className="w-20 text-end">Unit Cost</div>
            <div className="w-12 text-end">Waste%</div>
            <div className="w-20 text-end">Amount</div>
            <div className="w-5" />
          </div>

          {/* Resource groups */}
          {grouped.map(group => {
            const Icon = RESOURCE_ICONS[group.value]
            const color = RESOURCE_COLORS[group.value]
            return (
              <div key={group.value} className="border-t border-[var(--color-border)]">
                <div className={cn('flex items-center gap-2 px-5 py-2', RESOURCE_BG_COLORS[group.value])}>
                  <Icon size={13} className={color} />
                  <span className={cn('text-xs font-semibold', color)}>{group.label}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                  </span>
                  <span className="ms-auto text-xs font-semibold text-[var(--color-text)] tabular-nums font-mono">
                    {fmt(group.total)}
                  </span>
                  <button
                    onClick={() => onAddResource(group.value)}
                    className="p-1 rounded-lg hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                    title={`Add ${group.label.toLowerCase()} resource`}
                  >
                    <Plus size={13} />
                  </button>
                </div>
                {group.items.length === 0 && (
                  <div className="px-5 py-2 text-[11px] text-[var(--color-text-muted)] italic">
                    No {group.label.toLowerCase()} resources added
                  </div>
                )}
                {group.items.map(res => (
                  <ResourceRow
                    key={res.id}
                    resource={res}
                    onUpdate={(fields) => onUpdateResource(res.id, fields)}
                    onDelete={() => onDeleteResource(res.id)}
                    fmt={fmt}
                  />
                ))}
              </div>
            )
          })}

          {/* Totals */}
          <div className="border-t-2 border-[var(--color-border-strong)] px-5 py-4 space-y-2 text-xs bg-[var(--color-surface-hover)]">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Direct Cost</span>
              <span className="font-semibold text-[var(--color-text)] tabular-nums font-mono">{fmt(ra.direct_cost)}</span>
            </div>
            {ra.overhead_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Overheads ({ra.overhead_pct}%)</span>
                <span className="tabular-nums font-mono text-[var(--color-text-secondary)]">{fmt(ra.overhead_amount)}</span>
              </div>
            )}
            {ra.profit_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Profit ({ra.profit_pct}%)</span>
                <span className="tabular-nums font-mono text-[var(--color-text-secondary)]">{fmt(ra.profit_amount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-[var(--color-border-strong)]">
              <span className="font-bold text-[var(--color-text)]">Unit Rate (per {ra.unit})</span>
              <span className="font-bold text-[var(--color-amber)] tabular-nums font-mono text-base">{fmt(ra.unit_rate)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResourceRow({
  resource: res,
  onUpdate,
  onDelete,
  fmt,
}: {
  resource: RateResource
  onUpdate: (fields: Partial<RateResource>) => void
  onDelete: () => void
  fmt: (n: number) => string
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  const startEdit = (field: string, value: string | number) => {
    setEditing(field)
    setEditVal(String(value))
  }

  const commit = (field: string) => {
    const numFields = ['quantity', 'unit_cost', 'waste_pct']
    const val = numFields.includes(field) ? parseFloat(editVal) || 0 : editVal
    onUpdate({ [field]: val })
    setEditing(null)
  }

  const cell = (field: string, value: string | number, isNum = false, width = 'w-16') => {
    if (editing === field) {
      return (
        <input
          autoFocus
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={() => commit(field)}
          onKeyDown={e => { if (e.key === 'Enter') commit(field); if (e.key === 'Escape') setEditing(null) }}
          className={cn(width, 'px-1.5 py-0.5 text-xs border border-[var(--color-amber)]/50 rounded-lg bg-[var(--color-surface-elevated)] text-[var(--color-text)] outline-none ring-2 ring-[var(--color-amber)]/20')}
          type={isNum ? 'number' : 'text'}
          step={isNum ? 'any' : undefined}
        />
      )
    }
    return (
      <span
        className={cn(
          'cursor-pointer px-1.5 py-0.5 rounded-lg transition-colors',
          'hover:bg-[var(--color-amber)]/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]',
          isNum && 'tabular-nums text-end font-mono'
        )}
        onClick={() => startEdit(field, value)}
        title="Click to edit"
      >
        {isNum ? fmt(Number(value)) : value}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2 px-5 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] group transition-colors border-t border-[var(--color-border)]">
      <div className="flex-1 min-w-0">{cell('description', res.description, false, 'w-40')}</div>
      <div className="w-12 text-center">{cell('unit', res.unit, false, 'w-12')}</div>
      <div className="w-16 text-end">{cell('quantity', res.quantity, true)}</div>
      <div className="w-20 text-end">{cell('unit_cost', res.unit_cost, true, 'w-20')}</div>
      <div className="w-12 text-end">{cell('waste_pct', res.waste_pct, true, 'w-12')}</div>
      <div className="w-20 text-end font-semibold tabular-nums font-mono text-[var(--color-text)]">{fmt(res.total_amount)}</div>
      <button
        onClick={onDelete}
        className="p-0.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-all opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}
