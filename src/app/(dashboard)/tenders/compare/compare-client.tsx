'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Tender } from '@/lib/types'
import { advanceTenderStatus } from '@/app/actions/tenders'
import { Trophy } from 'lucide-react'

interface CompareClientProps {
  tenders: Tender[]
}

export function CompareClient({ tenders }: CompareClientProps) {
  const router = useRouter()
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const maxValue = Math.max(...tenders.map(t => t.submitted_value ?? t.estimated_value ?? 0), 1)

  function handleSelectWinner(id: string) {
    setWinnerId(id)
  }

  function handleAward() {
    if (!winnerId) return
    startTransition(async () => {
      await advanceTenderStatus(winnerId, 'awarded')
      router.push('/tenders')
    })
  }

  return (
    <div className="space-y-6">
      {/* Comparison Matrix */}
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
            <tr className="bg-slate-50">
              <td className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Est. Value</td>
              {tenders.map(t => (
                <td key={t.id} className="px-4 py-3 font-semibold text-slate-900">
                  ₪{(t.estimated_value ?? 0).toLocaleString()}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Submitted Value</td>
              {tenders.map(t => (
                <td key={t.id} className="px-4 py-3 font-semibold text-slate-900">
                  {t.submitted_value != null ? `₪${t.submitted_value.toLocaleString()}` : '—'}
                </td>
              ))}
            </tr>
            <tr className="bg-slate-50">
              <td className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Value Bar</td>
              {tenders.map(t => {
                const val = t.submitted_value ?? t.estimated_value ?? 0
                const pct = maxValue > 0 ? (val / maxValue) * 100 : 0
                const isLowest = val === Math.min(...tenders.map(x => x.submitted_value ?? x.estimated_value ?? 0))
                return (
                  <td key={t.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                        <div
                          className={`h-full rounded ${isLowest ? 'bg-green-500' : 'bg-amber-400'}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      {isLowest && <span className="text-xs text-green-700 font-semibold shrink-0">Lowest</span>}
                    </div>
                  </td>
                )
              })}
            </tr>
            <tr>
              <td className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Notes</td>
              {tenders.map(t => (
                <td key={t.id} className="px-4 py-3 text-xs text-slate-500 max-w-xs">{t.notes ?? '—'}</td>
              ))}
            </tr>
            <tr className="bg-amber-50">
              <td className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Select Winner</td>
              {tenders.map(t => (
                <td key={t.id} className="px-4 py-3">
                  <button
                    onClick={() => handleSelectWinner(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      winnerId === t.id
                        ? 'bg-amber-500 text-white'
                        : 'border border-slate-300 text-slate-600 hover:bg-amber-50 hover:border-amber-400'
                    }`}
                  >
                    <Trophy size={12} />
                    {winnerId === t.id ? 'Selected' : 'Select'}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
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
