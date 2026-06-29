'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import type { Tender, TenderBidder, TenderBid, BOQItem, TenderStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { TableSkeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { SectionCard } from '@/components/ui/section-card'
import { PageHeader } from '@/components/ui/page-header'
import { SimpleBarChart } from '@/components/ui/mini-chart'
import { EmptyState } from '@/components/ui/empty-state'
import {
  getTenders,
  createTender,
  updateTender,
  deleteTender,
  createBidder,
  deleteBidder,
  createBid,
  updateBid,
  deleteBid,
  bulkCreateBids,
  awardTender,
} from '@/app/actions/tenders'
import { getBOQItems } from '@/app/actions/boq'
import {
  Plus,
  Trash2,
  Users,
  Trophy,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Award,
  TrendingDown,
  BarChart3,
  Gavel,
  CalendarDays,
  Building2,
  Mail,
  Phone,
  Hash,
  DollarSign,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<TenderStatus, {
  label: string
  badgeVariant: 'default' | 'success' | 'warning' | 'danger' | 'info'
  icon: React.ComponentType<{ size?: number; className?: string }>
}> = {
  draft: { label: 'Draft', badgeVariant: 'default', icon: Clock },
  issued: { label: 'Issued', badgeVariant: 'info', icon: AlertCircle },
  closed: { label: 'Closed', badgeVariant: 'warning', icon: XCircle },
  awarded: { label: 'Awarded', badgeVariant: 'success', icon: Trophy },
  cancelled: { label: 'Cancelled', badgeVariant: 'danger', icon: XCircle },
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'closed', label: 'Closed' },
  { value: 'awarded', label: 'Awarded' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function TendersPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [tenders, setTenders] = useState<Tender[]>([])
  const [boqItems, setBOQItems] = useState<BOQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showAddBidder, setShowAddBidder] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [tenderForm, setTenderForm] = useState({ title: '', description: '', tender_number: '', issue_date: '', closing_date: '' })
  const [bidderForm, setBidderForm] = useState({ name: '', company: '', email: '', phone: '' })
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void; isDestructive?: boolean } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, b] = await Promise.all([getTenders(projectId), getBOQItems(projectId)])
      setTenders(t)
      setBOQItems(b)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenders')
      setTenders([])
      setBOQItems([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const stats = useMemo(() => {
    const totalBidders = tenders.reduce((s, t) => s + (t.bidders?.length ?? 0), 0)
    const awarded = tenders.filter(t => t.status === 'awarded')
    const active = tenders.filter(t => t.status === 'issued' || t.status === 'draft').length

    // Awarded value: sum of winning bidder totals
    const awardedValue = awarded.reduce((sum, t) => {
      const winner = (t.bidders ?? []).find(b => b.id === t.awarded_bidder_id)
      if (!winner) return sum
      return sum + (winner.bids ?? []).reduce((s, bid) => s + bid.amount, 0)
    }, 0)

    // Average bid across all bidders with totals > 0
    const allBidderTotals = tenders.flatMap(t =>
      (t.bidders ?? []).map(b => (b.bids ?? []).reduce((s, bid) => s + bid.amount, 0))
    ).filter(total => total > 0)
    const avgBid = allBidderTotals.length > 0
      ? allBidderTotals.reduce((a, b) => a + b, 0) / allBidderTotals.length
      : 0

    // Bid comparison data per tender (for chart)
    const bidComparison = tenders.map(t => {
      const bidderTotals = (t.bidders ?? [])
        .map(b => (b.bids ?? []).reduce((s, bid) => s + bid.amount, 0))
        .filter(total => total > 0)
      return {
        label: t.title.length > 20 ? t.title.slice(0, 20) + '...' : t.title,
        lowest: bidderTotals.length > 0 ? Math.min(...bidderTotals) : 0,
        average: bidderTotals.length > 0 ? bidderTotals.reduce((a, b) => a + b, 0) / bidderTotals.length : 0,
        highest: bidderTotals.length > 0 ? Math.max(...bidderTotals) : 0,
      }
    }).filter(t => t.lowest > 0)

    // Contractor ranking from awarded tenders
    const contractors = awarded.map(t => {
      const winner = (t.bidders ?? []).find(b => b.id === t.awarded_bidder_id)
      if (!winner) return null
      const total = (winner.bids ?? []).reduce((s, bid) => s + bid.amount, 0)
      return { name: winner.name, company: winner.company, total, tenderTitle: t.title }
    }).filter(Boolean) as { name: string; company: string | null; total: number; tenderTitle: string }[]

    return {
      total: tenders.length,
      totalBidders,
      awardedCount: awarded.length,
      active,
      awardedValue,
      avgBid,
      bidComparison,
      contractors,
    }
  }, [tenders])

  const handleCreateTender = async () => {
    if (!tenderForm.title.trim()) return
    setError(null)
    const r = await createTender({ project_id: projectId, ...tenderForm })
    if (r.error) { setError(r.error); return }
    setShowCreate(false)
    setTenderForm({ title: '', description: '', tender_number: '', issue_date: '', closing_date: '' })
    load()
  }

  const handleAddBidder = async (tenderId: string) => {
    if (!bidderForm.name.trim()) return
    setError(null)
    const r = await createBidder({ tender_id: tenderId, ...bidderForm })
    if (r.error) { setError(r.error); return }

    if (boqItems.length > 0 && r.data) {
      try {
        await bulkCreateBids(
          tenderId,
          r.data.id,
          boqItems.map(b => ({
            boq_item_id: b.id,
            description: b.description,
            unit: b.unit,
            quantity: b.quantity,
            unit_rate: 0,
          }))
        )
      } catch {
        setError('Bidder created but failed to populate bid lines.')
      }
    }

    setShowAddBidder(null)
    setBidderForm({ name: '', company: '', email: '', phone: '' })
    load()
  }

  const handleUpdateBid = async (bidId: string, unitRate: number) => {
    try {
      await updateBid(bidId, { unit_rate: unitRate })
    } catch {
      setError('Failed to update bid.')
    }
    load()
  }

  const handleAward = async (tenderId: string, bidderId: string) => {
    setConfirmAction({
      message: 'Award this tender to the selected bidder?',
      isDestructive: false,
      onConfirm: async () => {
        await awardTender(tenderId, bidderId)
        load()
      },
    })
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        icon={Users}
        title="Tender Management"
        subtitle="Compare bids, analyze variances, and award tenders"
        gradient="from-violet-500 to-violet-600"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Tender
          </Button>
        }
      />

      {/* Statistics Dashboard */}
      {!loading && tenders.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={FileSpreadsheet}
              label="Total Tenders"
              value={stats.total}
              gradient="from-violet-500 to-violet-600"
            />
            <StatCard
              icon={Gavel}
              label="Active Bids"
              value={stats.active}
              gradient="from-blue-500 to-blue-600"
            />
            <StatCard
              icon={DollarSign}
              label="Awarded Value"
              value={stats.awardedValue}
              prefix=""
              decimals={2}
              gradient="from-emerald-500 to-emerald-600"
            />
            <StatCard
              icon={Target}
              label="Average Bid"
              value={stats.avgBid}
              decimals={2}
              gradient="from-amber-500 to-amber-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Bid Comparison Chart */}
            {stats.bidComparison.length > 0 && (
              <SectionCard title="Bid Comparison" icon={BarChart3} iconColor="text-violet-500">
                <SimpleBarChart
                  bars={stats.bidComparison.flatMap(t => [
                    { label: `${t.label} (Low)`, value: t.lowest, color: '#22c55e' },
                    { label: `${t.label} (Avg)`, value: t.average, color: '#6366f1' },
                    { label: `${t.label} (High)`, value: t.highest, color: '#ef4444' },
                  ])}
                  horizontal
                />
              </SectionCard>
            )}

            {/* Contractor Ranking */}
            {stats.contractors.length > 0 && (
              <SectionCard title="Contractor Ranking" icon={Trophy} iconColor="text-amber-500">
                <div className="space-y-3">
                  {stats.contractors
                    .sort((a, b) => b.total - a.total)
                    .map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                          i === 0 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                          i === 1 ? 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300' :
                          'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                        )}>
                          #{i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">{c.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {c.company ? `${c.company} · ` : ''}{c.tenderTitle}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{fmt(c.total)}</div>
                          {i === 0 && (
                            <Badge variant="success" className="text-[10px] mt-0.5">
                              <Trophy size={10} className="mr-0.5" /> Winner
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </SectionCard>
            )}
          </div>
        </>
      )}

      {/* Content */}
      {loading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : error && tenders.length === 0 ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium mb-4">{error}</p>
          <Button onClick={() => load()}>Retry</Button>
        </div>
      ) : tenders.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No tenders yet"
          description="Create your first tender to start collecting and comparing bids from contractors."
          actionLabel="Create First Tender"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-4">
          {tenders.map((tender, idx) => (
            <motion.div
              key={tender.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
            <TenderCard
              tender={tender}
              boqItems={boqItems}
              isExpanded={expandedId === tender.id}
              onToggle={() => setExpandedId(expandedId === tender.id ? null : tender.id)}
              onDelete={() => setConfirmAction({ message: 'Delete this tender and all associated bids?', onConfirm: async () => { await deleteTender(tender.id); load() } })}
              onStatusChange={async (s) => { await updateTender(tender.id, { status: s }); load() }}
              onAddBidder={() => setShowAddBidder(tender.id)}
              onDeleteBidder={(id) => setConfirmAction({ message: 'Remove this bidder?', onConfirm: async () => { await deleteBidder(id); load() } })}
              onUpdateBid={handleUpdateBid}
              onAward={(bidderId) => handleAward(tender.id, bidderId)}
              fmt={fmt}
            />
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Tender Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setError(null) }} title="Create New Tender" size="md">
        <div className="space-y-5">
          <Input
            label="Tender Title"
            value={tenderForm.title}
            onChange={e => setTenderForm({ ...tenderForm, title: e.target.value })}
            placeholder="e.g. Main Building Works"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Tender Number"
              value={tenderForm.tender_number}
              onChange={e => setTenderForm({ ...tenderForm, tender_number: e.target.value })}
              placeholder="T-001"
            />
            <Input
              label="Issue Date"
              type="date"
              value={tenderForm.issue_date}
              onChange={e => setTenderForm({ ...tenderForm, issue_date: e.target.value })}
            />
            <Input
              label="Closing Date"
              type="date"
              value={tenderForm.closing_date}
              onChange={e => setTenderForm({ ...tenderForm, closing_date: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              value={tenderForm.description}
              onChange={e => setTenderForm({ ...tenderForm, description: e.target.value })}
              rows={3}
              placeholder="Brief description of the tender scope..."
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-slate-400"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <Button variant="ghost" onClick={() => { setShowCreate(false); setError(null) }}>
              Cancel
            </Button>
            <Button onClick={handleCreateTender} disabled={!tenderForm.title.trim()}>
              Create Tender
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Bidder Modal */}
      <Modal isOpen={!!showAddBidder} onClose={() => { setShowAddBidder(null); setError(null) }} title="Add Bidder" size="md">
        <div className="space-y-5">
          <Input
            label="Bidder / Company Name"
            value={bidderForm.name}
            onChange={e => setBidderForm({ ...bidderForm, name: e.target.value })}
            placeholder="Company or individual name"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Company"
              value={bidderForm.company}
              onChange={e => setBidderForm({ ...bidderForm, company: e.target.value })}
              placeholder="Company Ltd."
            />
            <Input
              label="Email"
              type="email"
              value={bidderForm.email}
              onChange={e => setBidderForm({ ...bidderForm, email: e.target.value })}
              placeholder="email@company.com"
            />
            <Input
              label="Phone"
              value={bidderForm.phone}
              onChange={e => setBidderForm({ ...bidderForm, phone: e.target.value })}
              placeholder="+1 234 567 890"
            />
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-lg px-3 py-2.5">
            <BarChart3 size={14} className="mt-0.5 shrink-0" />
            {boqItems.length > 0
              ? `${boqItems.length} BOQ item${boqItems.length !== 1 ? 's' : ''} will be auto-populated as bid lines for this bidder.`
              : 'No BOQ items found. You can add bid lines manually after creating the bidder.'}
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <Button variant="ghost" onClick={() => { setShowAddBidder(null); setError(null) }}>
              Cancel
            </Button>
            <Button onClick={() => showAddBidder && handleAddBidder(showAddBidder)} disabled={!bidderForm.name.trim()}>
              <Users size={14} /> Add Bidder
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button variant={confirmAction?.isDestructive === false ? 'primary' : 'danger'} onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>Confirm</Button>
        </div>
      </Modal>
    </div>
  )
}

/* ── Tender Card ───────────────────────────────────────────── */

function TenderCard({
  tender,
  boqItems,
  isExpanded,
  onToggle,
  onDelete,
  onStatusChange,
  onAddBidder,
  onDeleteBidder,
  onUpdateBid,
  onAward,
  fmt,
}: {
  tender: Tender
  boqItems: BOQItem[]
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
  onStatusChange: (s: TenderStatus) => void
  onAddBidder: () => void
  onDeleteBidder: (id: string) => void
  onUpdateBid: (bidId: string, rate: number) => void
  onAward: (bidderId: string) => void
  fmt: (n: number) => string
}) {
  const bidders = tender.bidders ?? []
  const cfg = STATUS_CONFIG[tender.status]
  const Icon = cfg.icon

  const bidderTotals = bidders.map(b => ({
    ...b,
    total: (b.bids ?? []).reduce((s, bid) => s + bid.amount, 0),
  }))
  const activeBidders = bidderTotals.filter(b => b.total > 0)
  const lowestBidder = activeBidders.length > 0
    ? activeBidders.reduce((a, b) => a.total < b.total ? a : b)
    : null

  return (
    <Card className={cn(
      '!rounded-2xl transition-all duration-200',
      isExpanded && '!shadow-xl ring-1 ring-slate-200 dark:ring-slate-600'
    )}>
      {/* Card Header */}
      <div
        className="flex items-center gap-4 px-6 py-4 cursor-pointer select-none group"
        onClick={onToggle}
      >
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
          'bg-slate-100 dark:bg-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-600'
        )}>
          {isExpanded
            ? <ChevronDown size={16} className="text-slate-500 dark:text-slate-400" />
            : <ChevronRight size={16} className="text-slate-500 dark:text-slate-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
              {tender.title}
            </h3>
            {tender.tender_number && (
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono shrink-0">
                {tender.tender_number}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Users size={12} />
              {bidders.length} bidder{bidders.length !== 1 ? 's' : ''}
            </span>
            {tender.closing_date && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} />
                Closes {tender.closing_date}
              </span>
            )}
            {lowestBidder && (
              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <TrendingDown size={12} />
                Lowest: {fmt(lowestBidder.total)}
              </span>
            )}
          </div>
        </div>

        <Badge variant={cfg.badgeVariant} className="shrink-0">
          <Icon size={12} className="mr-1" />
          {cfg.label}
        </Badge>

        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-2 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete tender"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-700">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-6 py-3 bg-slate-50/80 dark:bg-slate-900/40">
            <Select
              value={tender.status}
              onChange={e => onStatusChange(e.target.value as TenderStatus)}
              options={STATUS_OPTIONS}
              className="!w-auto !py-1.5 text-xs"
            />
            <Button size="sm" variant="outline" onClick={onAddBidder}>
              <Users size={14} /> Add Bidder
            </Button>
            {tender.description && (
              <p className="ml-auto text-xs text-slate-400 dark:text-slate-500 italic truncate max-w-xs">
                {tender.description}
              </p>
            )}
          </div>

          {/* Bid Comparison Table */}
          {bidders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-y border-slate-100 dark:border-slate-700">
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-900/60 min-w-[220px]">
                      Description
                    </th>
                    <th className="text-center px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 w-[70px]">Unit</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 w-[80px]">Qty</th>
                    {bidderTotals.map(b => (
                      <th key={b.id} className="text-right px-3 py-2.5 font-semibold text-slate-600 dark:text-slate-300 min-w-[140px]">
                        <div className="flex items-center justify-end gap-1.5">
                          {b.id === lowestBidder?.id && (
                            <Trophy size={11} className="text-amber-500 shrink-0" />
                          )}
                          <span className="truncate max-w-[110px]" title={b.name}>{b.name}</span>
                          <button
                            onClick={() => onDeleteBidder(b.id)}
                            className="p-0.5 rounded text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            title="Remove bidder"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                        {b.company && (
                          <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5 text-right">
                            {b.company}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {boqItems.map((item, idx) => (
                    <tr key={item.id} className={cn(
                      'hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors',
                      idx % 2 === 0 ? 'bg-white dark:bg-slate-800/50' : 'bg-slate-50/30 dark:bg-slate-800/30'
                    )}>
                      <td className="px-4 py-2 text-slate-700 dark:text-slate-300 sticky left-0 bg-inherit">
                        <div className="truncate max-w-[220px]" title={item.description}>
                          {item.code && (
                            <span className="text-slate-400 dark:text-slate-500 font-mono mr-1.5">{item.code}</span>
                          )}
                          {item.description}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500 dark:text-slate-400">{item.unit}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300 font-mono">
                        {fmt(item.quantity)}
                      </td>
                      {bidderTotals.map(bidder => {
                        const bid = (bidder.bids ?? []).find(b => b.boq_item_id === item.id)
                        if (!bid) return (
                          <td key={bidder.id} className="px-3 py-2 text-center text-slate-300 dark:text-slate-600">
                            --
                          </td>
                        )

                        const allRates = bidderTotals
                          .map(bt => (bt.bids ?? []).find(b2 => b2.boq_item_id === item.id)?.unit_rate ?? 0)
                          .filter(r => r > 0)
                        const minRate = allRates.length > 0 ? Math.min(...allRates) : 0
                        const maxRate = allRates.length > 0 ? Math.max(...allRates) : 0
                        const isLowest = bid.unit_rate === minRate && bid.unit_rate > 0
                        const isHighest = bid.unit_rate === maxRate && allRates.length > 1 && bid.unit_rate > 0

                        return (
                          <td key={bidder.id} className="px-3 py-1">
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                value={bid.unit_rate || ''}
                                onChange={e => onUpdateBid(bid.id, parseFloat(e.target.value) || 0)}
                                className={cn(
                                  'w-[80px] px-2 py-1 text-xs text-right border rounded-md bg-transparent dark:text-white tabular-nums font-mono',
                                  'focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors',
                                  isLowest
                                    ? 'border-green-300 dark:border-green-700 bg-green-50/60 dark:bg-green-900/20'
                                    : isHighest
                                    ? 'border-red-300 dark:border-red-700 bg-red-50/60 dark:bg-red-900/20'
                                    : 'border-slate-200 dark:border-slate-600'
                                )}
                                step="any"
                              />
                              <span className="text-[10px] tabular-nums text-slate-400 dark:text-slate-500 w-[65px] text-right font-mono">
                                {fmt(bid.amount)}
                              </span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {/* Total row */}
                  <tr className="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/60">
                    <td colSpan={3} className="px-4 py-3 font-bold text-sm text-slate-700 dark:text-slate-200 sticky left-0 bg-slate-50 dark:bg-slate-900/60">
                      Total Bid Amount
                    </td>
                    {bidderTotals.map(b => (
                      <td key={b.id} className="px-3 py-3 text-right">
                        <div className={cn(
                          'text-sm font-bold tabular-nums font-mono',
                          b.id === lowestBidder?.id
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-slate-900 dark:text-white'
                        )}>
                          {fmt(b.total)}
                        </div>
                        {b.id === lowestBidder?.id && (
                          <div className="flex items-center justify-end gap-0.5 mt-0.5">
                            <CheckCircle2 size={10} className="text-green-500" />
                            <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold">
                              LOWEST BID
                            </span>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Variance row */}
                  {lowestBidder && bidderTotals.length > 1 && (
                    <tr className="bg-slate-50/80 dark:bg-slate-900/40">
                      <td colSpan={3} className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 sticky left-0 bg-slate-50/80 dark:bg-slate-900/40">
                        <span className="inline-flex items-center gap-1">
                          <TrendingDown size={12} />
                          Variance from lowest
                        </span>
                      </td>
                      {bidderTotals.map(b => {
                        const diff = b.total - (lowestBidder?.total ?? 0)
                        const pct = lowestBidder && lowestBidder.total > 0 ? (diff / lowestBidder.total * 100) : 0
                        return (
                          <td key={b.id} className="px-3 py-2 text-right text-xs tabular-nums font-mono">
                            {diff === 0 ? (
                              <span className="text-green-600 dark:text-green-400 font-medium">Baseline</span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400">
                                +{fmt(diff)} <span className="text-[10px]">({pct.toFixed(1)}%)</span>
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )}

                  {/* Award row */}
                  {tender.status !== 'awarded' && bidderTotals.length > 0 && (
                    <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700">
                      <td colSpan={3} className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-300 sticky left-0 bg-slate-50/50 dark:bg-slate-900/30">
                        <span className="inline-flex items-center gap-1">
                          <Award size={12} />
                          Award Tender
                        </span>
                      </td>
                      {bidderTotals.map(b => (
                        <td key={b.id} className="px-3 py-2 text-center">
                          <button
                            onClick={() => onAward(b.id)}
                            className={cn(
                              'inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-all',
                              b.id === lowestBidder?.id
                                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60 ring-1 ring-green-200 dark:ring-green-800'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                            )}
                          >
                            <Award size={12} /> Award
                          </button>
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Awarded indicator */}
                  {tender.status === 'awarded' && tender.awarded_bidder_id && (
                    <tr className="bg-green-50/80 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800">
                      <td colSpan={3} className="px-4 py-3 sticky left-0 bg-green-50/80 dark:bg-green-900/20">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-300">
                          <Trophy size={14} />
                          Awarded To
                        </span>
                      </td>
                      {bidderTotals.map(b => (
                        <td key={b.id} className="px-3 py-3 text-center">
                          {b.id === tender.awarded_bidder_id ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 px-3 py-1.5 rounded-lg">
                              <Trophy size={12} /> Winner
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">--</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                <Users size={20} className="text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                No bidders added yet
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                Add bidders to start entering and comparing bids.
              </p>
              <Button size="sm" variant="outline" onClick={onAddBidder}>
                <Users size={14} /> Add First Bidder
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
