'use client'

import { useState } from 'react'
import { DollarSign, GitCompareArrows } from 'lucide-react'

interface Props {
  budgetTab: React.ReactNode
  versionTab: React.ReactNode
}

export default function ComparisonTabs({ budgetTab, versionTab }: Props) {
  const [tab, setTab] = useState<'budget' | 'version'>('budget')

  return (
    <div>
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 shadow-sm w-fit">
        <button
          onClick={() => setTab('budget')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'budget' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <DollarSign size={14} /> Budget vs Actual
        </button>
        <button
          onClick={() => setTab('version')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'version' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <GitCompareArrows size={14} /> Version Compare
        </button>
      </div>
      {tab === 'budget' ? budgetTab : versionTab}
    </div>
  )
}
