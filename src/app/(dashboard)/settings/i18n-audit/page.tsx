'use client'

import { useState } from 'react'
import { translations } from '@/lib/i18n/translations'

type FilterMode = 'all' | 'missing' | 'complete'

export default function I18nAuditPage() {
  const [filter, setFilter] = useState<FilterMode>('all')

  const enKeys = Object.keys(translations.en)
  const arKeys = new Set(Object.keys(translations.ar))
  const heKeys = new Set(Object.keys(translations.he))

  const arCoverage = Math.round((arKeys.size / enKeys.length) * 100)
  const heCoverage = Math.round((heKeys.size / enKeys.length) * 100)

  const rows = enKeys
    .map(key => {
      const en = translations.en[key] ?? ''
      const ar = translations.ar[key] ?? ''
      const he = translations.he[key] ?? ''
      const arMissing = !arKeys.has(key)
      const heMissing = !heKeys.has(key)
      const status: 'complete' | 'partial' | 'missing' =
        arMissing && heMissing ? 'missing' : arMissing || heMissing ? 'partial' : 'complete'
      return { key, en, ar, he, status, arMissing, heMissing }
    })
    .filter(row => {
      if (filter === 'missing') return row.status !== 'complete'
      if (filter === 'complete') return row.status === 'complete'
      return true
    })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Translation Audit</h1>
        <p className="text-sm text-slate-500 mt-1">Coverage report for all translation keys</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { lang: 'EN', keys: enKeys.length, coverage: 100, color: 'bg-green-50 border-green-200' },
          { lang: 'AR', keys: Object.keys(translations.ar).length, coverage: arCoverage, color: 'bg-blue-50 border-blue-200' },
          { lang: 'HE', keys: Object.keys(translations.he).length, coverage: heCoverage, color: 'bg-purple-50 border-purple-200' },
        ].map(({ lang, keys, coverage, color }) => (
          <div key={lang} className={`border rounded-xl p-4 ${color}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{lang}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{coverage}%</p>
            <p className="text-xs text-slate-500">{keys} keys</p>
          </div>
        ))}
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2">
        {(['all', 'missing', 'complete'] as FilterMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setFilter(mode)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === mode
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {mode} {mode === 'all' ? `(${enKeys.length})` : mode === 'missing' ? `(${enKeys.filter(k => !arKeys.has(k) || !heKeys.has(k)).length})` : `(${enKeys.filter(k => arKeys.has(k) && heKeys.has(k)).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Key</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">English</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Arabic</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Hebrew</th>
              <th className="text-center px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ key, en, ar, he, status, arMissing, heMissing }) => (
              <tr key={key} className={status === 'missing' ? 'bg-red-50' : status === 'partial' ? 'bg-amber-50' : ''}>
                <td className="px-4 py-2 font-mono text-slate-700">{key}</td>
                <td className="px-4 py-2 text-slate-600">{en}</td>
                <td className={`px-4 py-2 ${arMissing ? 'text-red-400 italic' : 'text-slate-600'}`} dir="rtl">
                  {arMissing ? 'missing' : ar}
                </td>
                <td className={`px-4 py-2 ${heMissing ? 'text-red-400 italic' : 'text-slate-600'}`} dir="rtl">
                  {heMissing ? 'missing' : he}
                </td>
                <td className="px-4 py-2 text-center">
                  {status === 'complete' ? (
                    <span className="text-green-600 font-bold">✓</span>
                  ) : status === 'partial' ? (
                    <span className="text-amber-500 font-bold">⚠</span>
                  ) : (
                    <span className="text-red-500 font-bold">✗</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
