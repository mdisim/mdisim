'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { useToast } from '@/components/ui/toast'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { SimpleBarChart } from '@/components/ui/mini-chart'
import {
  Plus, Trash2, Users, Trophy, ChevronDown, ChevronRight, FileSpreadsheet,
  AlertCircle, Clock, XCircle, Award, TrendingDown, BarChart3, CalendarDays, CheckCircle2,
} from 'lucide-react'
import {
  createTender, updateTender, deleteTender, createBidder, deleteBidder,
  updateBid, bulkCreateBids, awardTender,
} from '@/app/actions/tenders'
import type { Tender, BOQItem, TenderStatus } from '@/lib/types'

const STATUS_CONFIG: Record<TenderStatus, { label: string; badgeVariant: 'default' | 'success' | 'warning' | 'danger' | 'info'; icon: typeof Clock }> = {
  draft: { label: 'Draft', badgeVariant: 'default', icon: Clock },
  issued: { label: 'Issued', badgeVariant: 'info', icon: AlertCircle },
  closed: { label: 'Closed', badgeVariant: 'warning', icon: XCircle },
  awarded: { label: 'Awarded', badgeVariant: 'success', icon: Trophy },
  cancelled: { label: 'Cancelled', badgeVariant: 'danger', icon: XCircle },
}
const STATUS_OPTIONS: { value: TenderStatus; label: string }[] = (Object.keys(STATUS_CONFIG) as TenderStatus[]).map(k => ({ value: k, label: STATUS_CONFIG[k].label }))

export function TendersMode({ projectId }: { projectId: string }) {
  const { data, fmt, reload } = useWorkspace()
  const { toast } = useToast()
  const { tenders, boqItems } = data

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showAddBidder, setShowAddBidder] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tenderForm, setTenderForm] = useState({ title: '', description: '', tender_number: '', issue_date: '', closing_date: '' })
  const [bidderForm, setBidderForm] = useState({ name: '', company: '', email: '', phone: '' })
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const stats = useMemo(() => {
    const totalBidders = tenders.reduce((s, t) => s + (t.bidders?.length ?? 0), 0)
    const awarded = tenders.filter(t => t.status === 'awarded')
    const active = tenders.filter(t => t.status === 'issued' || t.status === 'draft').length
    const awardedValue = awarded.reduce((sum, t) => {
      const winner = (t.bidders ?? []).find(b => b.id === t.awarded_bidder_id)
      if (!winner) return sum
      return sum + (winner.bids ?? []).reduce((s, bid) => s + bid.amount, 0)
    }, 0)
    const allBidderTotals = tenders.flatMap(t => (t.bidders ?? []).map(b => (b.bids ?? []).reduce((s, bid) => s + bid.amount, 0))).filter(t => t > 0)
    const avgBid = allBidderTotals.length > 0 ? allBidderTotals.reduce((a, b) => a + b, 0) / allBidderTotals.length : 0
    const bidComparison = tenders.map(t => {
      const bidderTotals = (t.bidders ?? []).map(b => (b.bids ?? []).reduce((s, bid) => s + bid.amount, 0)).filter(v => v > 0)
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

    return { total: tenders.length, totalBidders, awardedCount: awarded.length, active, awardedValue, avgBid, bidComparison, contractors }
  }, [tenders])

  const handleCreateTender = async () => {
    if (!tenderForm.title.trim()) return
    setError(null)
    const r = await createTender({ project_id: projectId, ...tenderForm })
    if (r.error) { setError(r.error); toast({ title: 'Failed to create tender', description: r.error, variant: 'danger' }); return }
    setShowCreate(false)
    setTenderForm({ title: '', description: '', tender_number: '', issue_date: '', closing_date: '' })
    toast({ title: 'Tender created', variant: 'success' })
    reload()
  }

  const handleAddBidder = async (tenderId: string) => {
    if (!bidderForm.name.trim()) return
    setError(null)
    const r = await createBidder({ tender_id: tenderId, ...bidderForm })
    if (r.error) { setError(r.error); toast({ title: 'Failed to add bidder', description: r.error, variant: 'danger' }); return }
    if (boqItems.length > 0 && r.data) {
      await bulkCreateBids(tenderId, r.data.id, boqItems.map(b => ({ boq_item_id: b.id, description: b.description, unit: b.unit, quantity: b.quantity, unit_rate: 0 })))
    }
    setShowAddBidder(null)
    setBidderForm({ name: '', company: '', email: '', phone: '' })
    toast({ title: 'Bidder added', variant: 'success' })
    reload()
  }

  const handleUpdateBid = async (bidId: string, unitRate: number) => {
    await updateBid(bidId, { unit_rate: unitRate })
    reload()
  }

  const handleAward = (tenderId: string, bidderId: string) => {
    setConfirmAction({
      message: 'Award this tender to the selected bidder?',
      onConfirm: async () => { await awardTender(tenderId, bidderId); toast({ title: 'Tender awarded', variant: 'success' }); reload() },
    })
  }

  if (tenders.length === 0) {
    return (
      <>
        <EmptyState
          icon={FileSpreadsheet}
          title="No tenders yet"
          description="Create a tender to invite bids and compare contractors against the BOQ."
          actionLabel="New tender"
          onAction={() => setShowCreate(true)}
        />
        <TenderCreateModal
          isOpen={showCreate} onClose={() => { setShowCreate(false); setError(null) }}
          form={tenderForm} setForm={setTenderForm} error={error} onSubmit={handleCreateTender}
        />
      </>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> New tender</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Total tenders" value={String(stats.total)} sub={`Active: ${stats.active}`} />
        <Stat label="Awarded value" value={fmt(stats.awardedValue)} sub={`${stats.awardedCount} awarded`} accent />
        <Stat label="Average bid" value={fmt(stats.avgBid)} sub={`${stats.totalBidders} bidders`} />
      </div>

      {(stats.bidComparison.length > 0 || stats.contractors.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stats.bidComparison.length > 0 && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
              <div className="flex items-center gap-2 mb-3"><BarChart3 size={14} className="text-[var(--color-brand)]" /><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Bid comparison</span></div>
              <SimpleBarChart
                bars={stats.bidComparison.flatMap(t => [
                  { label: `${t.label} (Low)`, value: t.lowest, color: 'var(--color-success)' },
                  { label: `${t.label} (Avg)`, value: t.average, color: 'var(--color-brand)' },
                  { label: `${t.label} (High)`, value: t.highest, color: 'var(--color-danger)' },
                ])}
                horizontal
              />
            </div>
          )}
          {stats.contractors.length > 0 && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
              <div className="flex items-center gap-2 mb-3"><Trophy size={14} className="text-[var(--color-brand)]" /><span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Contractor ranking</span></div>
              <div className="space-y-2">
                {stats.contractors.sort((a, b) => b.total - a.total).map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-hover)]">
                    <div className={cn('w-7 h-7 rounded-[var(--radius-md)] flex items-center justify-center text-xs font-bold shrink-0', i === 0 ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand)]' : 'bg-[var(--color-surface-active)] text-[var(--color-text-secondary)]')}>#{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] text-[var(--color-text)] truncate">{c.name}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)] truncate">{c.company ? `${c.company} · ` : ''}{c.tenderTitle}</div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="text-[13px] font-bold mono text-[var(--color-text)]">{fmt(c.total)}</div>
                      {i === 0 && <Badge variant="success" className="text-[10px] mt-0.5"><Trophy size={10} className="me-0.5" /> Winner</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {tenders.map(tender => (
          <TenderCard
            key={tender.id}
            tender={tender}
            boqItems={boqItems}
            isExpanded={expandedId === tender.id}
            onToggle={() => setExpandedId(expandedId === tender.id ? null : tender.id)}
            onDelete={() => setConfirmAction({ message: 'Delete this tender?', onConfirm: async () => { await deleteTender(tender.id); toast({ title: 'Tender deleted', variant: 'success' }); reload() } })}
            onStatusChange={async s => { await updateTender(tender.id, { status: s }); toast({ title: 'Status updated', variant: 'success' }); reload() }}
            onAddBidder={() => setShowAddBidder(tender.id)}
            onDeleteBidder={id => setConfirmAction({ message: 'Remove this bidder?', onConfirm: async () => { await deleteBidder(id); toast({ title: 'Bidder removed', variant: 'success' }); reload() } })}
            onUpdateBid={handleUpdateBid}
            onAward={bidderId => handleAward(tender.id, bidderId)}
            fmt={fmt}
          />
        ))}
      </div>

      <TenderCreateModal isOpen={showCreate} onClose={() => { setShowCreate(false); setError(null) }} form={tenderForm} setForm={setTenderForm} error={error} onSubmit={handleCreateTender} />

      <Modal isOpen={!!showAddBidder} onClose={() => { setShowAddBidder(null); setError(null) }} title="Add bidder" size="md">
        <div className="space-y-4">
          <Input label="Bidder name" value={bidderForm.name} onChange={e => setBidderForm({ ...bidderForm, name: e.target.value })} placeholder="Contact name" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Company" value={bidderForm.company} onChange={e => setBidderForm({ ...bidderForm, company: e.target.value })} placeholder="Company name" />
            <Input label="Email" type="email" value={bidderForm.email} onChange={e => setBidderForm({ ...bidderForm, email: e.target.value })} placeholder="email@company.com" />
            <Input label="Phone" value={bidderForm.phone} onChange={e => setBidderForm({ ...bidderForm, phone: e.target.value })} placeholder="+1 234 567 890" />
          </div>
          <div className="flex items-start gap-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] px-3 py-2.5">
            <BarChart3 size={14} className="mt-0.5 shrink-0" />
            {boqItems.length > 0 ? `${boqItems.length} BOQ items will be added to this bidder automatically.` : 'No BOQ items to auto-populate yet.'}
          </div>
          {error && <div className="flex items-center gap-2 text-sm text-[var(--color-danger)] bg-[var(--color-danger-tint)] rounded-[var(--radius-lg)] px-3 py-2.5"><AlertCircle size={14} />{error}</div>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => { setShowAddBidder(null); setError(null) }}>Cancel</Button>
            <Button onClick={() => showAddBidder && handleAddBidder(showAddBidder)} disabled={!bidderForm.name.trim()}><Users size={14} /> Add bidder</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm" size="sm">
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>Confirm</Button>
        </div>
      </Modal>
    </div>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={cn('rounded-[var(--radius-lg)] border p-5', accent ? 'border-[var(--color-brand)]/30 bg-[var(--color-brand-tint)]' : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)]')}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</p>
      <h3 className={cn('text-2xl font-bold mt-1.5 mono', accent ? 'text-[var(--color-brand)]' : 'text-[var(--color-text)]')}>{value}</h3>
      <p className="text-[11px] text-[var(--color-text-muted)] mt-2 font-mono">{sub}</p>
    </div>
  )
}

function TenderCreateModal({ isOpen, onClose, form, setForm, error, onSubmit }: {
  isOpen: boolean; onClose: () => void
  form: { title: string; description: string; tender_number: string; issue_date: string; closing_date: string }
  setForm: (f: typeof form) => void
  error: string | null
  onSubmit: () => void
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New tender" size="md">
      <div className="space-y-4">
        <Input label="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Tender title" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Tender number" value={form.tender_number} onChange={e => setForm({ ...form, tender_number: e.target.value })} placeholder="T-001" />
          <Input label="Issue date" type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} />
          <Input label="Closing date" type="date" value={form.closing_date} onChange={e => setForm({ ...form, closing_date: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Scope of works" className="w-full px-3 py-2.5 text-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] resize-none placeholder:text-[var(--color-text-muted)]" />
        </div>
        {error && <div className="flex items-center gap-2 text-sm text-[var(--color-danger)] bg-[var(--color-danger-tint)] rounded-[var(--radius-lg)] px-3 py-2.5"><AlertCircle size={14} />{error}</div>}
        <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} disabled={!form.title.trim()}>Create tender</Button>
        </div>
      </div>
    </Modal>
  )
}

function TenderCard({ tender, boqItems, isExpanded, onToggle, onDelete, onStatusChange, onAddBidder, onDeleteBidder, onUpdateBid, onAward, fmt }: {
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
  const bidderTotals = bidders.map(b => ({ ...b, total: (b.bids ?? []).reduce((s, bid) => s + bid.amount, 0) }))
  const activeBidders = bidderTotals.filter(b => b.total > 0)
  const lowestBidder = activeBidders.length > 0 ? activeBidders.reduce((a, b) => a.total < b.total ? a : b) : null

  return (
    <div className={cn('bg-[var(--color-surface-elevated)] border rounded-[var(--radius-lg)] overflow-hidden transition-all', isExpanded ? 'border-[var(--color-border-strong)] shadow-[var(--shadow-md)]' : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]')}>
      <div className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none group hover:bg-[var(--color-surface-hover)] transition-colors" role="button" tabIndex={0}
        onClick={onToggle} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }} aria-expanded={isExpanded}>
        <div className="w-7 h-7 rounded-[var(--radius-md)] flex items-center justify-center bg-[var(--color-surface-hover)] group-hover:bg-[var(--color-surface-active)] shrink-0">
          {isExpanded ? <ChevronDown size={15} className="text-[var(--color-text-muted)]" /> : <ChevronRight size={15} className="text-[var(--color-text-muted)]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[13px] text-[var(--color-text)] truncate">{tender.title}</h3>
            {tender.tender_number && <span className="text-[11px] text-[var(--color-text-muted)] font-mono shrink-0">{tender.tender_number}</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1"><Users size={11} /> {bidders.length} bidder{bidders.length !== 1 ? 's' : ''}</span>
            {tender.closing_date && <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> Closes {tender.closing_date}</span>}
            {lowestBidder && <span className="inline-flex items-center gap-1 text-[var(--color-success)]"><TrendingDown size={11} /> Lowest: {fmt(lowestBidder.total)}</span>}
          </div>
        </div>
        <Badge variant={cfg.badgeVariant} className="shrink-0"><Icon size={11} className="me-1" />{cfg.label}</Badge>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-[var(--radius-md)] opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)] transition-all" title="Delete tender">
          <Trash2 size={13} />
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 px-5 py-2.5 bg-[var(--color-surface-hover)] border-b border-[var(--color-border)]">
            <select value={tender.status} onChange={e => onStatusChange(e.target.value as TenderStatus)} className="text-xs px-2 py-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={onAddBidder}><Users size={13} /> Add bidder</Button>
            {tender.description && <p className="ms-auto text-[12px] text-[var(--color-text-muted)] italic truncate max-w-xs">{tender.description}</p>}
          </div>

          {bidders.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto w-11 h-11 rounded-[var(--radius-lg)] bg-[var(--color-surface-hover)] flex items-center justify-center mb-3"><Users size={18} className="text-[var(--color-text-muted)]" /></div>
              <p className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-1">No bidders yet</p>
              <p className="text-[12px] text-[var(--color-text-muted)] mb-4">Add bidders to start comparing bids.</p>
              <Button size="sm" variant="outline" onClick={onAddBidder}><Users size={13} /> Add first bidder</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr className="bg-[var(--color-surface-hover)] border-b border-[var(--color-border)]">
                    <th className="text-start px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] sticky start-0 bg-[var(--color-surface-hover)] min-w-[200px]">Description</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-[60px]">Unit</th>
                    <th className="text-end px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] w-[70px]">Qty</th>
                    {bidderTotals.map(b => (
                      <th key={b.id} className={cn('text-end px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider min-w-[130px]', b.id === lowestBidder?.id ? 'text-[var(--color-brand)] bg-[var(--color-brand-tint)]' : 'text-[var(--color-text-muted)]')}>
                        <div className="flex items-center justify-end gap-1.5">
                          {b.id === lowestBidder?.id && <Trophy size={10} className="text-[var(--color-brand)] shrink-0" />}
                          <span className="truncate max-w-[100px]" title={b.name}>{b.name}</span>
                          <button onClick={() => onDeleteBidder(b.id)} className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors" title="Remove bidder"><Trash2 size={9} /></button>
                        </div>
                        {b.company && <div className="text-[9px] font-normal text-[var(--color-text-muted)] mt-0.5 text-end">{b.company}</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {boqItems.map(item => (
                    <tr key={item.id} className="hover:bg-[var(--color-surface-hover)] transition-colors border-b border-[var(--color-border-light)]">
                      <td className="px-4 py-1.5 text-[var(--color-text-secondary)] sticky start-0 bg-inherit">
                        <div className="truncate max-w-[200px]" title={item.description}>
                          {item.code && <span className="text-[var(--color-text-muted)] font-mono me-1.5">{item.code}</span>}
                          {item.description}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-center text-[var(--color-text-muted)]">{item.unit}</td>
                      <td className="px-3 py-1.5 text-end mono text-[var(--color-text-secondary)]">{fmt(item.quantity)}</td>
                      {bidderTotals.map(bidder => {
                        const bid = (bidder.bids ?? []).find(b => b.boq_item_id === item.id)
                        if (!bid) return <td key={bidder.id} className="px-3 py-1.5 text-center text-[var(--color-text-muted)]">--</td>
                        const allRates = bidderTotals.map(bt => (bt.bids ?? []).find(b2 => b2.boq_item_id === item.id)?.unit_rate ?? 0).filter(r => r > 0)
                        const minRate = allRates.length > 0 ? Math.min(...allRates) : 0
                        const maxRate = allRates.length > 0 ? Math.max(...allRates) : 0
                        const isLowest = bid.unit_rate === minRate && bid.unit_rate > 0
                        const isHighest = bid.unit_rate === maxRate && allRates.length > 1 && bid.unit_rate > 0
                        return (
                          <td key={bidder.id} className={cn('px-3 py-1', bidder.id === lowestBidder?.id && 'bg-[var(--color-brand-tint)]')}>
                            <div className="flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                defaultValue={bid.unit_rate || ''}
                                onBlur={e => onUpdateBid(bid.id, parseFloat(e.target.value) || 0)}
                                className={cn(
                                  'w-[76px] px-2 py-1 text-xs text-end border rounded-[var(--radius-sm)] bg-transparent text-[var(--color-text)] mono',
                                  'focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)] transition-colors',
                                  isLowest ? 'border-[var(--color-success)]/40 bg-[var(--color-success-tint)]' : isHighest ? 'border-[var(--color-danger)]/40 bg-[var(--color-danger-tint)]' : 'border-[var(--color-border)]'
                                )}
                                step="any"
                              />
                              <span className="text-[9px] mono text-[var(--color-text-muted)] w-[60px] text-end">{fmt(bid.amount)}</span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-border-strong)] bg-[var(--color-surface-hover)]">
                    <td colSpan={3} className="px-4 py-2.5 font-bold text-[13px] text-[var(--color-text)] sticky start-0 bg-[var(--color-surface-hover)]">Total bid amount</td>
                    {bidderTotals.map(b => (
                      <td key={b.id} className={cn('px-3 py-2.5 text-end', b.id === lowestBidder?.id && 'bg-[var(--color-brand-tint)]')}>
                        <div className={cn('text-[13px] font-bold mono', b.id === lowestBidder?.id ? 'text-[var(--color-brand)]' : 'text-[var(--color-text)]')}>{fmt(b.total)}</div>
                        {b.id === lowestBidder?.id && (
                          <div className="flex items-center justify-end gap-0.5 mt-0.5"><CheckCircle2 size={9} className="text-[var(--color-brand)]" /><span className="text-[9px] text-[var(--color-brand)] font-semibold">Lowest</span></div>
                        )}
                      </td>
                    ))}
                  </tr>
                  {tender.status !== 'awarded' && bidderTotals.length > 0 && (
                    <tr className="bg-[var(--color-surface-hover)]/50 border-t border-[var(--color-border)]">
                      <td colSpan={3} className="px-4 py-2.5 text-[11px] font-medium text-[var(--color-text-secondary)] sticky start-0 bg-[var(--color-surface-hover)]"><span className="inline-flex items-center gap-1"><Award size={11} /> Award tender</span></td>
                      {bidderTotals.map(b => (
                        <td key={b.id} className="px-3 py-1.5 text-center">
                          <button
                            onClick={() => onAward(b.id)}
                            className={cn('inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-[var(--radius-md)] font-medium transition-all',
                              b.id === lowestBidder?.id ? 'bg-[var(--color-brand-tint)] text-[var(--color-brand)] hover:brightness-95 border border-[var(--color-brand)]/30' : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-active)]')}
                          >
                            <Award size={11} /> Award
                          </button>
                        </td>
                      ))}
                    </tr>
                  )}
                  {tender.status === 'awarded' && tender.awarded_bidder_id && (
                    <tr className="bg-[var(--color-brand-tint)] border-t border-[var(--color-brand)]/20">
                      <td colSpan={3} className="px-4 py-2.5 sticky start-0 bg-[var(--color-brand-tint)]"><span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-brand)]"><Trophy size={13} /> Awarded to</span></td>
                      {bidderTotals.map(b => (
                        <td key={b.id} className="px-3 py-2.5 text-center">
                          {b.id === tender.awarded_bidder_id ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-brand)] bg-[var(--color-surface-elevated)] px-2.5 py-1 rounded-[var(--radius-md)] border border-[var(--color-brand)]/30"><Trophy size={11} /> Winner</span>
                          ) : <span className="text-[11px] text-[var(--color-text-muted)]">--</span>}
                        </td>
                      ))}
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
