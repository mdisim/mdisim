'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Tender, TenderItem } from '@/lib/types'
import { advanceTenderStatus } from '@/app/actions/tenders'
import { Trophy, PackageOpen } from 'lucide-react'

interface CompareClientProps {
  tenders: Tender[]
  tenderItems: TenderItem[]
}

function fmt(value: number): string {
  return `₪${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function CompareClient({ tenders, tenderItems }: CompareClientProps) {
  const router = useRouter()
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSelectWinner(id: string) {
    setWinnerId(prev => (prev === id ? null : id))
  }

  function handleAward() {
    if (!winnerId) return
    startTransition(async () => {
      await advanceTenderStatus(winnerId, 'awarded')
      router.push('/tenders')
    })
  }

  // Group tender items by tender_id
  const itemsByTender: Record<string, TenderItem[]> = {}
  for (const item of tenderItems) {
    if (!itemsByTender[item.tender_id]) itemsByTender[item.tender_id] = []
    itemsByTender[item.tender_id].push(item)
  }

  // Collect unique line-item descriptions across all tenders
  // Use boq_item description if linked, else the item's own description
  // We group by description key for comparison
  const descriptionSet = new Set<string>()
  for (const item of tenderItems) {
    descriptionSet.add(item.description)
  }
  const lineDescriptions = Array.from(descriptionSet)

  const hasItems = tenderItems.length > 0

  // Grand totals per tender (submitted_value or estimated_value fallback)
  const tenderTotals = tenders.map(t => {
    const items = itemsByTender[t.id] ?? []
    if (items.length > 0) {
      return items.reduce((s, i) => s + (i.total_amount ?? 0), 0)
    }
    return t.submitted_value ?? t.estimated_value ?? 0
  })

  const minTotal = Math.min(...tenderTotals)
  const maxTotal = Math.max(...tenderTotals)
  const avgTotal = tenderTotals.length > 0 ? tenderTotals.reduce((s, t) => s + t, 0) / tenderTotals.length : 0
  const lowestTotalIdx = tenderTotals.indexOf(minTotal)
  const lowestTender = tenders[lowestTotalIdx]
  const pctBelowAvg = avgTotal > 0 ? ((avgTotal - minTotal) / avgTotal * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header summary rows */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Attribute</th>
              {tenders.map(t => (
                <th key={t.id} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-800 text-sm font-bold normal-case truncate max-w-[160px]">{t.title}</span>
                    {t.client_name && <span className="font-normal normal-case text-slate-400">{t.client_name}</span>}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</td>
              {tenders.map(t => (
                <td key={t.id} className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    t.status === 'awarded' ? 'bg-green-100 text-green-700' :
                    t.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                    t.status === 'lost' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{t.status}</span>
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Tender #</td>
              {tenders.map(t => (
                <td key={t.id} className="px-4 py-3 font-mono text-xs text-slate-600">{t.tender_number ?? '—'}</td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Deadline</td>
              {tenders.map(t => (
                <td key={t.id} className="px-4 py-3 text-xs text-slate-600">
                  {t.submission_deadline ? new Date(t.submission_deadline).toLocaleDateString() : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Notes</td>
              {tenders.map(t => (
                <td key={t.id} className="px-4 py-3 text-xs text-slate-500 max-w-xs">{t.notes ?? '—'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Winner Recommendation Panel */}
      {tenders.length > 1 && lowestTender && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Recommended</p>
              <p className="font-bold text-green-900 text-lg">{lowestTender.title}</p>
              <p className="text-sm text-green-700 mt-0.5">
                {fmt(minTotal)} &mdash; {pctBelowAvg.toFixed(1)}% below average
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-green-600 uppercase tracking-wide">Average Total</p>
              <p className="font-semibold text-green-800">{fmt(avgTotal)}</p>
            </div>
          </div>
        </div>
      )}

      {/* BOQ Line-Item Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">BOQ Line-Item Breakdown</h2>
          <p className="text-xs text-slate-400 mt-0.5">Rate and total comparison per line item</p>
        </div>

        {!hasItems ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <PackageOpen size={40} className="text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-500">No BOQ line items entered</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Add items to each tender to enable detailed line-item comparison</p>
            <a
              href="/tenders"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-400 transition-colors"
            >
              Add Items
            </a>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[200px]">Description</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Unit</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Qty</th>
                {tenders.map(t => (
                  <th key={t.id} colSpan={2} className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide border-l border-slate-100">
                    <span className="truncate block max-w-[160px]">{t.title}</span>
                  </th>
                ))}
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide border-l border-slate-100 w-24">Lowest</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Var %</th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-1.5" />
                <th className="px-3 py-1.5" />
                <th className="px-3 py-1.5" />
                {tenders.map(t => (
                  <>
                    <th key={`${t.id}-rate`} className="text-right px-3 py-1.5 text-slate-400 font-medium border-l border-slate-100">Rate</th>
                    <th key={`${t.id}-total`} className="text-right px-3 py-1.5 text-slate-400 font-medium">Total</th>
                  </>
                ))}
                <th className="px-3 py-1.5 border-l border-slate-100" />
                <th className="px-3 py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lineDescriptions.map((desc, rowIdx) => {
                // Find item for each tender with this description
                const rowItems = tenders.map(t =>
                  (itemsByTender[t.id] ?? []).find(i => i.description === desc) ?? null
                )
                const totals = rowItems.map(i => i?.total_amount ?? null)
                const validTotals = totals.filter((v): v is number => v !== null)
                const rowMin = validTotals.length > 0 ? Math.min(...validTotals) : null
                const rowMax = validTotals.length > 0 ? Math.max(...validTotals) : null
                const variance = rowMin !== null && rowMax !== null && rowMin > 0
                  ? ((rowMax - rowMin) / rowMin) * 100
                  : null

                // Derive unit/qty from whichever tender has this item
                const sampleItem = rowItems.find(i => i !== null)

                return (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{desc}</td>
                    <td className="px-3 py-2.5 text-center text-slate-500">{sampleItem?.unit ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{sampleItem?.quantity?.toLocaleString() ?? '—'}</td>
                    {rowItems.map((item, tIdx) => {
                      const total = item?.total_amount ?? null
                      const isLowest = total !== null && rowMin !== null && total === rowMin && validTotals.length > 1
                      const isHighest = total !== null && rowMax !== null && total === rowMax && validTotals.length > 1 && rowMin !== rowMax
                      return (
                        <>
                          <td
                            key={`rate-${tIdx}`}
                            className={`px-3 py-2.5 text-right border-l border-slate-100 ${
                              isLowest ? 'bg-green-50 text-green-700' :
                              isHighest ? 'bg-red-50 text-red-600' :
                              'text-slate-600'
                            }`}
                          >
                            {item ? `₪${item.unit_rate.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '—'}
                          </td>
                          <td
                            key={`total-${tIdx}`}
                            className={`px-3 py-2.5 text-right font-semibold ${
                              isLowest ? 'bg-green-50 text-green-700' :
                              isHighest ? 'bg-red-50 text-red-600' :
                              'text-slate-700'
                            }`}
                          >
                            {total !== null ? fmt(total) : '—'}
                          </td>
                        </>
                      )
                    })}
                    <td className="px-3 py-2.5 text-right text-green-700 font-semibold border-l border-slate-100">
                      {rowMin !== null ? fmt(rowMin) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-medium ${
                      variance === null ? 'text-slate-400' :
                      variance > 20 ? 'text-red-600' :
                      variance > 10 ? 'text-amber-600' :
                      'text-slate-500'
                    }`}>
                      {variance !== null ? `${variance.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Grand total footer */}
            <tfoot>
              <tr className="bg-slate-900 text-white border-t-2 border-slate-700">
                <td className="px-4 py-3 font-bold text-sm" colSpan={3}>Grand Total</td>
                {tenderTotals.map((total, idx) => {
                  const isLowest = total === minTotal && tenderTotals.length > 1
                  const isHighest = total === maxTotal && tenderTotals.length > 1 && minTotal !== maxTotal
                  return (
                    <>
                      <td key={`gt-rate-${idx}`} className="border-l border-slate-700" />
                      <td
                        key={`gt-total-${idx}`}
                        className={`px-3 py-3 text-right text-sm font-bold ${
                          isLowest ? 'text-green-400' :
                          isHighest ? 'text-red-400' :
                          'text-white'
                        }`}
                      >
                        {fmt(total)}
                        {isLowest ? <span className="ml-1 text-xs font-normal text-green-400">Lowest</span> : null}
                        {!isLowest && minTotal > 0 && <div className="text-xs font-normal text-amber-300 mt-0.5">+{((total - minTotal) / minTotal * 100).toFixed(1)}%</div>}
                      </td>
                    </>
                  )
                })}
                <td className="px-3 py-3 border-l border-slate-700 text-green-400 text-right text-sm font-bold">
                  {fmt(minTotal)}
                </td>
                <td className="px-3 py-3 text-right text-slate-400 text-xs">
                  {minTotal > 0 ? `${(((maxTotal - minTotal) / minTotal) * 100).toFixed(1)}%` : '—'}
                </td>
              </tr>
              {/* Select winner row */}
              <tr className="bg-amber-50 border-t border-amber-200">
                <td className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide" colSpan={3}>Select Winner</td>
                {tenders.map(t => (
                  <>
                    <td key={`sw-rate-${t.id}`} className="border-l border-amber-100" />
                    <td key={`sw-total-${t.id}`} className="px-3 py-3 text-center">
                      <button
                        onClick={() => handleSelectWinner(t.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          winnerId === t.id
                            ? 'bg-amber-500 text-white'
                            : 'border border-slate-300 text-slate-600 hover:bg-amber-50 hover:border-amber-400'
                        }`}
                      >
                        <Trophy size={12} />
                        {winnerId === t.id ? 'Selected' : 'Select'}
                      </button>
                    </td>
                  </>
                ))}
                <td className="border-l border-amber-100" />
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Award action */}
      {winnerId && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <div>
            <p className="font-semibold text-amber-900">
              Award: {tenders.find(t => t.id === winnerId)?.title}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">This will mark the tender as Awarded and update its status.</p>
          </div>
          <button
            onClick={handleAward}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            <Trophy size={15} />
            {isPending ? 'Awarding…' : 'Confirm Award'}
          </button>
        </div>
      )}
    </div>
  )
}
