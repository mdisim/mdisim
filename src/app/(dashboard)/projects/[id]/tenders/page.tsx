'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { useParams } from 'next/navigation'
import type { Tender, TenderBidder, TenderBid, BOQItem, TenderStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_META: Record<TenderStatus, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  draft: { label: 'Draft', color: 'text-slate-500 bg-slate-100 dark:bg-slate-700', icon: Clock },
  issued: { label: 'Issued', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30', icon: AlertCircle },
  closed: { label: 'Closed', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', icon: XCircle },
  awarded: { label: 'Awarded', color: 'text-green-600 bg-green-50 dark:bg-green-900/30', icon: Trophy },
  cancelled: { label: 'Cancelled', color: 'text-red-600 bg-red-50 dark:bg-red-900/30', icon: XCircle },
}

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

  const load = useCallback(async () => {
    setLoading(true)
    const [t, b] = await Promise.all([getTenders(projectId), getBOQItems(projectId)])
    setTenders(t)
    setBOQItems(b)
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
    }

    setShowAddBidder(null)
    setBidderForm({ name: '', company: '', email: '', phone: '' })
    load()
  }

  const handleUpdateBid = async (bidId: string, unitRate: number) => {
    await updateBid(bidId, { unit_rate: unitRate })
    load()
  }

  const handleAward = async (tenderId: string, bidderId: string) => {
    if (!confirm('Award this tender to the selected bidder?')) return
    await awardTender(tenderId, bidderId)
    load()
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tender Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Compare bids, analyze variances, award tenders
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Tender
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse" />)}</div>
      ) : tenders.length === 0 ? (
        <div className="text-center py-20">
          <FileSpreadsheet size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">No tenders yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Create a tender to start comparing bids.</p>
          <Button onClick={() => setShowCreate(true)}><Plus size={16} /> Create Tender</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {tenders.map(tender => (
            <TenderCard
              key={tender.id}
              tender={tender}
              boqItems={boqItems}
              isExpanded={expandedId === tender.id}
              onToggle={() => setExpandedId(expandedId === tender.id ? null : tender.id)}
              onDelete={async () => { if (confirm('Delete this tender?')) { await deleteTender(tender.id); load() } }}
              onStatusChange={async (s) => { await updateTender(tender.id, { status: s }); load() }}
              onAddBidder={() => setShowAddBidder(tender.id)}
              onDeleteBidder={async (id) => { await deleteBidder(id); load() }}
              onUpdateBid={handleUpdateBid}
              onAward={(bidderId) => handleAward(tender.id, bidderId)}
              fmt={fmt}
            />
          ))}
        </div>
      )}

      {/* Create Tender Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Tender" size="md">
        <div className="space-y-4">
          <Input label="Title" value={tenderForm.title} onChange={e => setTenderForm({ ...tenderForm, title: e.target.value })} placeholder="e.g. Main Building Works" />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Tender No." value={tenderForm.tender_number} onChange={e => setTenderForm({ ...tenderForm, tender_number: e.target.value })} placeholder="T-001" />
            <Input label="Issue Date" type="date" value={tenderForm.issue_date} onChange={e => setTenderForm({ ...tenderForm, issue_date: e.target.value })} />
            <Input label="Closing Date" type="date" value={tenderForm.closing_date} onChange={e => setTenderForm({ ...tenderForm, closing_date: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Description</label>
            <textarea value={tenderForm.description} onChange={e => setTenderForm({ ...tenderForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateTender} disabled={!tenderForm.title.trim()}>Create</Button>
          </div>
        </div>
      </Modal>

      {/* Add Bidder Modal */}
      <Modal isOpen={!!showAddBidder} onClose={() => setShowAddBidder(null)} title="Add Bidder" size="md">
        <div className="space-y-4">
          <Input label="Bidder Name" value={bidderForm.name} onChange={e => setBidderForm({ ...bidderForm, name: e.target.value })} placeholder="Company or individual name" />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Company" value={bidderForm.company} onChange={e => setBidderForm({ ...bidderForm, company: e.target.value })} />
            <Input label="Email" value={bidderForm.email} onChange={e => setBidderForm({ ...bidderForm, email: e.target.value })} />
            <Input label="Phone" value={bidderForm.phone} onChange={e => setBidderForm({ ...bidderForm, phone: e.target.value })} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {boqItems.length > 0 ? `BOQ items (${boqItems.length}) will be auto-populated for this bidder.` : 'No BOQ items — add bid lines manually after creating.'}
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddBidder(null)}>Cancel</Button>
            <Button onClick={() => showAddBidder && handleAddBidder(showAddBidder)} disabled={!bidderForm.name.trim()}>Add Bidder</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

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
  const sm = STATUS_META[tender.status]
  const Icon = sm.icon

  const bidderTotals = bidders.map(b => ({
    ...b,
    total: (b.bids ?? []).reduce((s, bid) => s + bid.amount, 0),
  }))
  const lowestBidder = bidderTotals.length > 0 ? bidderTotals.reduce((a, b) => a.total < b.total && a.total > 0 ? a : b) : null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750" onClick={onToggle}>
        {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900 dark:text-white">{tender.title}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {tender.tender_number && `${tender.tender_number} · `}{bidders.length} bidder{bidders.length !== 1 ? 's' : ''}
            {tender.closing_date && ` · Closes ${tender.closing_date}`}
          </div>
        </div>
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', sm.color)}>
          <Icon size={12} /> {sm.label}
        </span>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500">
          <Trash2 size={14} />
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          {/* Status + actions */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/50 dark:bg-slate-900/30">
            <select
              value={tender.status}
              onChange={e => onStatusChange(e.target.value as TenderStatus)}
              className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-white"
            >
              {(['draft', 'issued', 'closed', 'awarded', 'cancelled'] as TenderStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={onAddBidder}>
              <Users size={14} /> Add Bidder
            </Button>
          </div>

          {/* Comparison table */}
          {bidders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-900 min-w-[200px]">Description</th>
                    <th className="text-center px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[60px]">Unit</th>
                    <th className="text-right px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[70px]">Qty</th>
                    {bidderTotals.map(b => (
                      <th key={b.id} className="text-right px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 min-w-[120px]">
                        <div className="flex items-center justify-end gap-1">
                          {b.id === lowestBidder?.id && <Trophy size={10} className="text-amber-500" />}
                          <span className="truncate max-w-[100px]">{b.name}</span>
                          <button onClick={() => onDeleteBidder(b.id)} className="p-0.5 rounded text-slate-300 hover:text-red-500">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {boqItems.map(item => (
                    <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-slate-800 truncate max-w-[200px]">
                        {item.code && <span className="text-slate-400 mr-1">{item.code}</span>}
                        {item.description}
                      </td>
                      <td className="px-2 py-1.5 text-center text-slate-500">{item.unit}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{fmt(item.quantity)}</td>
                      {bidderTotals.map(bidder => {
                        const bid = (bidder.bids ?? []).find(b => b.boq_item_id === item.id)
                        if (!bid) return <td key={bidder.id} className="px-2 py-1.5 text-center text-slate-300">-</td>

                        const allRates = bidderTotals.map(bt => (bt.bids ?? []).find(b2 => b2.boq_item_id === item.id)?.unit_rate ?? 0).filter(r => r > 0)
                        const minRate = allRates.length > 0 ? Math.min(...allRates) : 0
                        const maxRate = allRates.length > 0 ? Math.max(...allRates) : 0
                        const isLowest = bid.unit_rate === minRate && bid.unit_rate > 0
                        const isHighest = bid.unit_rate === maxRate && allRates.length > 1

                        return (
                          <td key={bidder.id} className="px-2 py-0.5">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                value={bid.unit_rate || ''}
                                onChange={e => onUpdateBid(bid.id, parseFloat(e.target.value) || 0)}
                                className={cn(
                                  'w-[70px] px-1 py-0.5 text-xs text-right border rounded bg-transparent dark:text-white',
                                  isLowest ? 'border-green-300 bg-green-50/50 dark:bg-green-900/20' : isHighest ? 'border-red-300 bg-red-50/50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-600'
                                )}
                                step="any"
                              />
                              <span className="text-[10px] tabular-nums text-slate-400 w-[60px] text-right">{fmt(bid.amount)}</span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900">
                    <td colSpan={3} className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200 sticky left-0 bg-slate-50 dark:bg-slate-900">Total</td>
                    {bidderTotals.map(b => (
                      <td key={b.id} className="px-2 py-2 text-right">
                        <div className={cn(
                          'font-bold tabular-nums',
                          b.id === lowestBidder?.id ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'
                        )}>
                          {fmt(b.total)}
                        </div>
                        {b.id === lowestBidder?.id && <span className="text-[9px] text-green-600 dark:text-green-400 font-medium">LOWEST</span>}
                      </td>
                    ))}
                  </tr>
                  {/* Variance row */}
                  {lowestBidder && bidderTotals.length > 1 && (
                    <tr className="bg-slate-50 dark:bg-slate-900">
                      <td colSpan={3} className="px-3 py-1.5 text-xs text-slate-500 sticky left-0 bg-slate-50 dark:bg-slate-900">Variance from lowest</td>
                      {bidderTotals.map(b => {
                        const diff = b.total - (lowestBidder?.total ?? 0)
                        const pct = lowestBidder && lowestBidder.total > 0 ? (diff / lowestBidder.total * 100) : 0
                        return (
                          <td key={b.id} className="px-2 py-1.5 text-right text-[10px] tabular-nums">
                            {diff === 0 ? (
                              <span className="text-green-600 dark:text-green-400">—</span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400">+{fmt(diff)} (+{pct.toFixed(1)}%)</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )}
                  {/* Award row */}
                  {tender.status !== 'awarded' && bidderTotals.length > 0 && (
                    <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                      <td colSpan={3} className="px-3 py-2 text-xs text-slate-500 sticky left-0 bg-slate-50/50 dark:bg-slate-900/50">Award</td>
                      {bidderTotals.map(b => (
                        <td key={b.id} className="px-2 py-1.5 text-center">
                          <button
                            onClick={() => onAward(b.id)}
                            className="text-[10px] px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                          >
                            <Award size={10} className="inline mr-0.5" /> Award
                          </button>
                        </td>
                      ))}
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          )}

          {bidders.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              No bidders yet. Add bidders to start comparing bids.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
