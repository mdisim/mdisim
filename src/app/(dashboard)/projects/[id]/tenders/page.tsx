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
import { useToast } from '@/components/ui/toast'
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
import { useI18n } from '@/lib/i18n'

export default function TendersPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { t } = useI18n()
  const { toast } = useToast()

  const STATUS_CONFIG: Record<TenderStatus, {
    label: string
    badgeVariant: 'default' | 'success' | 'warning' | 'danger' | 'info'
    icon: React.ComponentType<{ size?: number; className?: string }>
  }> = {
    draft: { label: t.tenders.statusDraft, badgeVariant: 'default', icon: Clock },
    issued: { label: t.tenders.statusIssued, badgeVariant: 'info', icon: AlertCircle },
    closed: { label: t.tenders.statusClosed, badgeVariant: 'warning', icon: XCircle },
    awarded: { label: t.tenders.statusAwarded, badgeVariant: 'success', icon: Trophy },
    cancelled: { label: t.tenders.statusCancelled, badgeVariant: 'danger', icon: XCircle },
  }

  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'draft', label: t.tenders.statusDraft },
    { value: 'issued', label: t.tenders.statusIssued },
    { value: 'closed', label: t.tenders.statusClosed },
    { value: 'awarded', label: t.tenders.statusAwarded },
    { value: 'cancelled', label: t.tenders.statusCancelled },
  ]

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
      const msg = err instanceof Error ? err.message : null
      setError(msg)
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

    const awardedValue = awarded.reduce((sum, t) => {
      const winner = (t.bidders ?? []).find(b => b.id === t.awarded_bidder_id)
      if (!winner) return sum
      return sum + (winner.bids ?? []).reduce((s, bid) => s + bid.amount, 0)
    }, 0)

    const allBidderTotals = tenders.flatMap(t =>
      (t.bidders ?? []).map(b => (b.bids ?? []).reduce((s, bid) => s + bid.amount, 0))
    ).filter(total => total > 0)
    const avgBid = allBidderTotals.length > 0
      ? allBidderTotals.reduce((a, b) => a + b, 0) / allBidderTotals.length
      : 0

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
    try {
      const r = await createTender({ project_id: projectId, ...tenderForm })
      if (r.error) {
        setError(r.error)
        toast({ title: t.tenders.createTenderError, description: r.error, variant: 'danger' })
        return
      }
      setShowCreate(false)
      setTenderForm({ title: '', description: '', tender_number: '', issue_date: '', closing_date: '' })
      toast({ title: t.tenders.createTenderSuccess, variant: 'success' })
      load()
    } catch {
      toast({ title: t.tenders.createTenderError, variant: 'danger' })
    }
  }

  const handleAddBidder = async (tenderId: string) => {
    if (!bidderForm.name.trim()) return
    setError(null)
    try {
      const r = await createBidder({ tender_id: tenderId, ...bidderForm })
      if (r.error) {
        setError(r.error)
        toast({ title: t.tenders.addBidderError, description: r.error, variant: 'danger' })
        return
      }

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
          setError(t.tenders.bidderPopulateError)
          toast({ title: t.tenders.bidderPopulateError, variant: 'danger' })
        }
      }

      setShowAddBidder(null)
      setBidderForm({ name: '', company: '', email: '', phone: '' })
      toast({ title: t.tenders.addBidderSuccess, variant: 'success' })
      load()
    } catch {
      toast({ title: t.tenders.addBidderError, variant: 'danger' })
    }
  }

  const handleUpdateBid = async (bidId: string, unitRate: number) => {
    try {
      await updateBid(bidId, { unit_rate: unitRate })
    } catch {
      setError(t.tenders.updateBidError)
      toast({ title: t.tenders.updateBidError, variant: 'danger' })
    }
    load()
  }

  const handleAward = async (tenderId: string, bidderId: string) => {
    setConfirmAction({
      message: t.tenders.awardTenderConfirm,
      isDestructive: false,
      onConfirm: async () => {
        try {
          await awardTender(tenderId, bidderId)
          toast({ title: t.tenders.awardSuccess, variant: 'warning' })
          load()
        } catch {
          toast({ title: t.tenders.awardError, variant: 'danger' })
        }
      },
    })
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">{t.tenders.title}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t.tenders.subtitle}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> {t.tenders.newTender}
        </Button>
      </div>

      {/* Statistics Dashboard */}
      {!loading && tenders.length > 0 && (
        <>
          {/* KPI Cards — Stitch summary header pattern */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Tenders */}
            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
              <div className="absolute top-4 end-4 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity">
                <FileSpreadsheet size={64} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.tenders.totalTenders}</p>
                <h3 className="text-3xl font-bold text-[var(--color-text)] mt-2 tabular-nums">{stats.total}</h3>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs font-mono text-[var(--color-text-muted)]">{t.tenders.activeBids}: {stats.active}</span>
              </div>
            </div>

            {/* Lowest Bid / Awarded Value */}
            <div className="bg-[var(--color-surface-elevated)] border border-s-4 border-[var(--color-border)] border-s-[var(--color-amber)]/60 rounded-2xl p-6 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.tenders.awardedValue}</p>
                  {stats.awardedCount > 0 && (
                    <span className="bg-[var(--color-amber)]/10 text-[var(--color-amber)] text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                      {t.tenders.statusAwarded}
                    </span>
                  )}
                </div>
                <h3 className="text-3xl font-bold text-[var(--color-amber)] mt-2 tabular-nums font-mono">{fmt(stats.awardedValue)}</h3>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs font-mono text-[var(--color-amber)]">{stats.awardedCount} {t.tenders.statusAwarded}</span>
              </div>
            </div>

            {/* Avg Bid */}
            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.tenders.avgBid}</p>
                  <span className="bg-[var(--color-info-bg)] text-[var(--color-info)] text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                    {stats.totalBidders} {t.tenders.biddersLabel}
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-[var(--color-text)] mt-2 tabular-nums font-mono">{fmt(stats.avgBid)}</h3>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs font-mono text-[var(--color-text-muted)]">{t.tenders.totalTenders}: {stats.total}</span>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stats.bidComparison.length > 0 && (
              <SectionCard title={t.tenders.bidComparison} icon={BarChart3} iconColor="text-[var(--color-amber)]">
                <SimpleBarChart
                  bars={stats.bidComparison.flatMap(t => [
                    { label: `${t.label} (Low)`, value: t.lowest, color: 'var(--color-success)' },
                    { label: `${t.label} (Avg)`, value: t.average, color: 'var(--color-amber)' },
                    { label: `${t.label} (High)`, value: t.highest, color: 'var(--color-danger)' },
                  ])}
                  horizontal
                />
              </SectionCard>
            )}

            {stats.contractors.length > 0 && (
              <SectionCard title={t.tenders.contractorRanking} icon={Trophy} iconColor="text-[var(--color-amber)]">
                <div className="space-y-3">
                  {stats.contractors
                    .sort((a, b) => b.total - a.total)
                    .map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-hover)]">
                        <div className={cn(
                          'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0',
                          i === 0
                            ? 'bg-[var(--color-amber)]/10 text-[var(--color-amber)] border border-[var(--color-amber)]/30'
                            : 'bg-[var(--color-surface-active)] text-[var(--color-text-secondary)]'
                        )}>
                          #{i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-[var(--color-text)] truncate">{c.name}</div>
                          <div className="text-xs text-[var(--color-text-muted)] truncate">
                            {c.company ? `${c.company} · ` : ''}{c.tenderTitle}
                          </div>
                        </div>
                        <div className="text-end shrink-0">
                          <div className="text-sm font-bold tabular-nums font-mono text-[var(--color-text)]">{fmt(c.total)}</div>
                          {i === 0 && (
                            <Badge variant="success" className="text-[10px] mt-0.5">
                              <Trophy size={10} className="me-0.5" /> {t.tenders.winner}
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
        <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-2xl p-6 text-center">
          <p className="text-[var(--color-danger)] font-medium mb-4">{error}</p>
          <Button onClick={() => load()}>{t.tenders.retry}</Button>
        </div>
      ) : tenders.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title={t.tenders.noTenders}
          description={t.tenders.noTendersDesc}
          actionLabel={t.tenders.createFirstTender}
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
                onDelete={() => setConfirmAction({
                  message: t.tenders.deleteTenderConfirm,
                  onConfirm: async () => {
                    try {
                      await deleteTender(tender.id)
                      toast({ title: t.tenders.deleteTenderSuccess, variant: 'success' })
                      load()
                    } catch {
                      toast({ title: t.tenders.deleteTenderError, variant: 'danger' })
                    }
                  },
                })}
                onStatusChange={async (s) => {
                  try {
                    await updateTender(tender.id, { status: s })
                    toast({ title: t.tenders.statusUpdateSuccess, variant: 'success' })
                    load()
                  } catch {
                    toast({ title: t.tenders.statusUpdateError, variant: 'danger' })
                  }
                }}
                onAddBidder={() => setShowAddBidder(tender.id)}
                onDeleteBidder={(id) => setConfirmAction({
                  message: t.tenders.removeBidderConfirm,
                  onConfirm: async () => {
                    try {
                      await deleteBidder(id)
                      toast({ title: t.tenders.deleteBidderSuccess, variant: 'success' })
                      load()
                    } catch {
                      toast({ title: t.tenders.deleteBidderError, variant: 'danger' })
                    }
                  },
                })}
                onUpdateBid={handleUpdateBid}
                onAward={(bidderId) => handleAward(tender.id, bidderId)}
                fmt={fmt}
                t={t}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Tender Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setError(null) }} title={t.tenders.createTenderTitle} size="md">
        <div className="space-y-5">
          <Input
            label={t.tenders.tenderTitleLabel}
            value={tenderForm.title}
            onChange={e => setTenderForm({ ...tenderForm, title: e.target.value })}
            placeholder={t.tenders.tenderTitlePlaceholder}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={t.tenders.tenderNumber}
              value={tenderForm.tender_number}
              onChange={e => setTenderForm({ ...tenderForm, tender_number: e.target.value })}
              placeholder="T-001"
            />
            <Input
              label={t.tenders.issueDate}
              type="date"
              value={tenderForm.issue_date}
              onChange={e => setTenderForm({ ...tenderForm, issue_date: e.target.value })}
            />
            <Input
              label={t.tenders.closingDate}
              type="date"
              value={tenderForm.closing_date}
              onChange={e => setTenderForm({ ...tenderForm, closing_date: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              {t.tenders.descriptionLabel}
            </label>
            <textarea
              value={tenderForm.description}
              onChange={e => setTenderForm({ ...tenderForm, description: e.target.value })}
              rows={3}
              placeholder={t.tenders.descriptionPlaceholder}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/40 focus:border-transparent resize-none placeholder:text-[var(--color-text-muted)]"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] rounded-xl px-3 py-2.5">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => { setShowCreate(false); setError(null) }}>
              {t.tenders.cancel}
            </Button>
            <Button onClick={handleCreateTender} disabled={!tenderForm.title.trim()}>
              {t.tenders.createTender}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Bidder Modal */}
      <Modal isOpen={!!showAddBidder} onClose={() => { setShowAddBidder(null); setError(null) }} title={t.tenders.addBidderTitle} size="md">
        <div className="space-y-5">
          <Input
            label={t.tenders.bidderCompanyName}
            value={bidderForm.name}
            onChange={e => setBidderForm({ ...bidderForm, name: e.target.value })}
            placeholder={t.tenders.bidderNamePlaceholder}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={t.tenders.company}
              value={bidderForm.company}
              onChange={e => setBidderForm({ ...bidderForm, company: e.target.value })}
              placeholder={t.tenders.companyPlaceholder}
            />
            <Input
              label={t.tenders.email}
              type="email"
              value={bidderForm.email}
              onChange={e => setBidderForm({ ...bidderForm, email: e.target.value })}
              placeholder="email@company.com"
            />
            <Input
              label={t.tenders.phone}
              value={bidderForm.phone}
              onChange={e => setBidderForm({ ...bidderForm, phone: e.target.value })}
              placeholder="+1 234 567 890"
            />
          </div>
          <div className="flex items-start gap-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-hover)] rounded-xl px-3 py-2.5">
            <BarChart3 size={14} className="mt-0.5 shrink-0" />
            {boqItems.length > 0
              ? `${boqItems.length} ${t.tenders.boqAutoPopulateInfo}`
              : t.tenders.noBoqItemsInfo}
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] rounded-xl px-3 py-2.5">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => { setShowAddBidder(null); setError(null) }}>
              {t.tenders.cancel}
            </Button>
            <Button onClick={() => showAddBidder && handleAddBidder(showAddBidder)} disabled={!bidderForm.name.trim()}>
              <Users size={14} /> {t.tenders.addBidder}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={t.tenders.confirmTitle} size="sm">
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>{t.tenders.cancel}</Button>
          <Button variant={confirmAction?.isDestructive === false ? 'primary' : 'danger'} onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>{t.tenders.confirm}</Button>
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
  t,
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
  t: ReturnType<typeof useI18n>['t']
}) {
  const STATUS_CONFIG: Record<TenderStatus, {
    label: string
    badgeVariant: 'default' | 'success' | 'warning' | 'danger' | 'info'
    icon: React.ComponentType<{ size?: number; className?: string }>
  }> = {
    draft: { label: t.tenders.statusDraft, badgeVariant: 'default', icon: Clock },
    issued: { label: t.tenders.statusIssued, badgeVariant: 'info', icon: AlertCircle },
    closed: { label: t.tenders.statusClosed, badgeVariant: 'warning', icon: XCircle },
    awarded: { label: t.tenders.statusAwarded, badgeVariant: 'success', icon: Trophy },
    cancelled: { label: t.tenders.statusCancelled, badgeVariant: 'danger', icon: XCircle },
  }

  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: 'draft', label: t.tenders.statusDraft },
    { value: 'issued', label: t.tenders.statusIssued },
    { value: 'closed', label: t.tenders.statusClosed },
    { value: 'awarded', label: t.tenders.statusAwarded },
    { value: 'cancelled', label: t.tenders.statusCancelled },
  ]

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
    <div className={cn(
      'bg-[var(--color-surface-elevated)] border rounded-2xl overflow-hidden transition-all duration-200',
      isExpanded
        ? 'border-[var(--color-border-strong)] shadow-lg shadow-black/10'
        : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
    )}>
      {/* Card Header */}
      <div
        className="flex items-center gap-4 px-6 py-4 cursor-pointer select-none group hover:bg-[var(--color-surface-hover)] transition-colors"
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        aria-expanded={isExpanded}
      >
        <div className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0',
          'bg-[var(--color-surface-hover)] group-hover:bg-[var(--color-surface-active)]'
        )}>
          {isExpanded
            ? <ChevronDown size={16} className="text-[var(--color-text-muted)]" />
            : <ChevronRight size={16} className="text-[var(--color-text-muted)]" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[var(--color-text)] truncate">
              {tender.title}
            </h3>
            {tender.tender_number && (
              <span className="text-xs text-[var(--color-text-muted)] font-mono shrink-0">
                {tender.tender_number}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1">
              <Users size={12} />
              {bidders.length} {bidders.length !== 1 ? t.tenders.biddersLabel : t.tenders.bidderLabel}
            </span>
            {tender.closing_date && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={12} />
                {t.tenders.closesLabel} {tender.closing_date}
              </span>
            )}
            {lowestBidder && (
              <span className="inline-flex items-center gap-1 text-[var(--color-success)]">
                <TrendingDown size={12} />
                {t.tenders.lowest}: {fmt(lowestBidder.total)}
              </span>
            )}
          </div>
        </div>

        <Badge variant={cfg.badgeVariant} className="shrink-0">
          <Icon size={12} className="me-1" />
          {cfg.label}
        </Badge>

        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-2 rounded-xl opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-all"
          title={t.tenders.deleteTender}
          aria-label={t.tenders.deleteTender}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)]">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-6 py-3 bg-[var(--color-surface-hover)] border-b border-[var(--color-border)]">
            <Select
              value={tender.status}
              onChange={e => onStatusChange(e.target.value as TenderStatus)}
              options={STATUS_OPTIONS}
              className="!w-auto !py-1.5 text-xs"
            />
            <Button size="sm" variant="outline" onClick={onAddBidder}>
              <Users size={14} /> {t.tenders.addBidder}
            </Button>
            {tender.description && (
              <p className="ms-auto text-xs text-[var(--color-text-muted)] italic truncate max-w-xs">
                {tender.description}
              </p>
            )}
          </div>

          {/* Bid Comparison Table — Stitch winner highlight in amber */}
          {bidders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--color-surface-hover)] border-b border-[var(--color-border)]">
                    <th className="text-start px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] sticky start-0 bg-[var(--color-surface-hover)] min-w-[220px]">
                      {t.tenders.colDescription}
                    </th>
                    <th className="text-center px-3 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] w-[70px]">{t.tenders.colUnit}</th>
                    <th className="text-end px-3 py-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] w-[80px]">{t.tenders.colQty}</th>
                    {bidderTotals.map(b => (
                      <th
                        key={b.id}
                        className={cn(
                          'text-end px-3 py-3 text-[10px] font-semibold uppercase tracking-widest min-w-[140px]',
                          b.id === lowestBidder?.id
                            ? 'text-[var(--color-amber)] bg-[var(--color-amber)]/5'
                            : 'text-[var(--color-text-muted)]'
                        )}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {b.id === lowestBidder?.id && (
                            <Trophy size={11} className="text-[var(--color-amber)] shrink-0" />
                          )}
                          <span className="truncate max-w-[110px]" title={b.name}>{b.name}</span>
                          <button
                            onClick={() => onDeleteBidder(b.id)}
                            className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                            title={t.tenders.removeBidder}
                            aria-label={t.tenders.removeBidder}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                        {b.company && (
                          <div className="text-[10px] font-normal text-[var(--color-text-muted)] mt-0.5 text-end">
                            {b.company}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {boqItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={cn(
                        'hover:bg-[var(--color-surface-hover)] transition-colors',
                        idx % 2 === 0 ? 'bg-transparent' : 'bg-[var(--color-surface-hover)]/40'
                      )}
                    >
                      <td className="px-5 py-2 text-[var(--color-text-secondary)] sticky start-0 bg-inherit">
                        <div className="truncate max-w-[220px]" title={item.description}>
                          {item.code && (
                            <span className="text-[var(--color-text-muted)] font-mono me-1.5">{item.code}</span>
                          )}
                          {item.description}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-[var(--color-text-muted)]">{item.unit}</td>
                      <td className="px-3 py-2 text-end tabular-nums font-mono text-[var(--color-text-secondary)]">
                        {fmt(item.quantity)}
                      </td>
                      {bidderTotals.map(bidder => {
                        const bid = (bidder.bids ?? []).find(b => b.boq_item_id === item.id)
                        if (!bid) return (
                          <td key={bidder.id} className="px-3 py-2 text-center text-[var(--color-text-muted)]">
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
                          <td
                            key={bidder.id}
                            className={cn(
                              'px-3 py-1',
                              bidder.id === lowestBidder?.id && 'bg-[var(--color-amber)]/5'
                            )}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                value={bid.unit_rate || ''}
                                onChange={e => onUpdateBid(bid.id, parseFloat(e.target.value) || 0)}
                                className={cn(
                                  'w-[80px] px-2 py-1 text-xs text-end border rounded-lg bg-transparent text-[var(--color-text)] tabular-nums font-mono',
                                  'focus:outline-none focus:ring-1 focus:ring-[var(--color-amber)]/40 transition-colors',
                                  isLowest
                                    ? 'border-[var(--color-success)]/40 bg-[var(--color-success-bg)]'
                                    : isHighest
                                    ? 'border-[var(--color-danger)]/40 bg-[var(--color-danger-bg)]'
                                    : 'border-[var(--color-border)]'
                                )}
                                step="any"
                              />
                              <span className="text-[10px] tabular-nums text-[var(--color-text-muted)] w-[65px] text-end font-mono">
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
                  {/* Total row — Stitch statistical summary */}
                  <tr className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-surface-hover)]">
                    <td colSpan={3} className="px-5 py-3 font-bold text-sm text-[var(--color-text)] sticky start-0 bg-[var(--color-surface-hover)]">
                      {t.tenders.totalBidAmount}
                    </td>
                    {bidderTotals.map(b => (
                      <td
                        key={b.id}
                        className={cn(
                          'px-3 py-3 text-end',
                          b.id === lowestBidder?.id && 'bg-[var(--color-amber)]/5'
                        )}
                      >
                        <div className={cn(
                          'text-sm font-bold tabular-nums font-mono',
                          b.id === lowestBidder?.id
                            ? 'text-[var(--color-amber)]'
                            : 'text-[var(--color-text)]'
                        )}>
                          {fmt(b.total)}
                        </div>
                        {b.id === lowestBidder?.id && (
                          <div className="flex items-center justify-end gap-0.5 mt-0.5">
                            <CheckCircle2 size={10} className="text-[var(--color-amber)]" />
                            <span className="text-[10px] text-[var(--color-amber)] font-semibold">
                              {t.tenders.lowestBid}
                            </span>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Variance row */}
                  {lowestBidder && bidderTotals.length > 1 && (
                    <tr className="bg-[var(--color-surface-hover)]/60">
                      <td colSpan={3} className="px-5 py-2 text-xs text-[var(--color-text-muted)] sticky start-0 bg-[var(--color-surface-hover)]/60">
                        <span className="inline-flex items-center gap-1">
                          <TrendingDown size={12} />
                          {t.tenders.varianceFromLowest}
                        </span>
                      </td>
                      {bidderTotals.map(b => {
                        const diff = b.total - (lowestBidder?.total ?? 0)
                        const pct = lowestBidder && lowestBidder.total > 0 ? (diff / lowestBidder.total * 100) : 0
                        return (
                          <td key={b.id} className="px-3 py-2 text-end text-xs tabular-nums font-mono">
                            {diff === 0 ? (
                              <span className="text-[var(--color-amber)] font-medium">{t.tenders.baseline}</span>
                            ) : (
                              <span className="text-[var(--color-danger)]">
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
                    <tr className="bg-[var(--color-surface-hover)]/50 border-t border-[var(--color-border)]">
                      <td colSpan={3} className="px-5 py-3 text-xs font-medium text-[var(--color-text-secondary)] sticky start-0 bg-[var(--color-surface-hover)]/50">
                        <span className="inline-flex items-center gap-1">
                          <Award size={12} />
                          {t.tenders.awardTenderLabel}
                        </span>
                      </td>
                      {bidderTotals.map(b => (
                        <td key={b.id} className="px-3 py-2 text-center">
                          <button
                            onClick={() => onAward(b.id)}
                            className={cn(
                              'inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl font-medium transition-all',
                              b.id === lowestBidder?.id
                                ? 'bg-[var(--color-amber)]/10 text-[var(--color-amber)] hover:bg-[var(--color-amber)]/20 border border-[var(--color-amber)]/30'
                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-active)]'
                            )}
                          >
                            <Award size={12} /> {t.tenders.award}
                          </button>
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Awarded indicator */}
                  {tender.status === 'awarded' && tender.awarded_bidder_id && (
                    <tr className="bg-[var(--color-amber)]/5 border-t border-[var(--color-amber)]/20">
                      <td colSpan={3} className="px-5 py-3 sticky start-0 bg-[var(--color-amber)]/5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-amber)]">
                          <Trophy size={14} />
                          {t.tenders.awardedTo}
                        </span>
                      </td>
                      {bidderTotals.map(b => (
                        <td key={b.id} className="px-3 py-3 text-center">
                          {b.id === tender.awarded_bidder_id ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-amber)] bg-[var(--color-amber)]/10 px-3 py-1.5 rounded-xl border border-[var(--color-amber)]/30">
                              <Trophy size={12} /> {t.tenders.winner}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--color-text-muted)]">--</span>
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
              <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--color-surface-hover)] flex items-center justify-center mb-3">
                <Users size={20} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                {t.tenders.noBiddersYet}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                {t.tenders.addBiddersToStart}
              </p>
              <Button size="sm" variant="outline" onClick={onAddBidder}>
                <Users size={14} /> {t.tenders.addFirstBidder}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
