'use client'

import { useState, useMemo } from 'react'
import {
  Brain,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Edit3,
  Layers,
  FileSpreadsheet,
  DollarSign,
  Ruler,
  Repeat,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  AIFullAnalysis,
  AIDetectedElement,
  AIBOQGroup,
  AIBOQItem,
  Trade,
} from '@/lib/ai/types'

type PanelTab = 'elements' | 'boq' | 'cost'

interface AISuggestionsPanelProps {
  isOpen: boolean
  onClose: () => void
  isAnalyzing: boolean
  result: AIFullAnalysis | null
  onAnalyze: () => void
  onApproveElement: (element: AIDetectedElement, quantity: number, unit: string, boqDescription: string) => void
  onApproveBOQItem: (item: AIBOQItem) => void
  onApproveAll: (elements: AIDetectedElement[]) => void
  onHighlightElement: (element: AIDetectedElement | null) => void
  onEstimateCosts: () => void
  isEstimatingCosts?: boolean
}

const TYPE_COLORS: Record<string, string> = {
  wall: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  slab: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  beam: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  column: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  door: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  window: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  stair: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  pipe: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  duct: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  road: 'bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-300',
  curb: 'bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-300',
  footing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  rebar: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  block: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  finish: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300',
}

const TRADE_COLORS: Record<Trade, string> = {
  concrete: 'border-l-blue-500',
  masonry: 'border-l-orange-500',
  steel: 'border-l-red-500',
  carpentry: 'border-l-amber-600',
  plumbing: 'border-l-teal-500',
  electrical: 'border-l-yellow-500',
  mechanical: 'border-l-indigo-500',
  finishing: 'border-l-pink-500',
  earthwork: 'border-l-stone-500',
  roads: 'border-l-gray-500',
  landscaping: 'border-l-green-500',
  general: 'border-l-slate-400',
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
    : pct >= 50 ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
    : 'text-red-500 bg-red-50 dark:bg-red-900/20'
  return <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.5 rounded', color)}>{pct}%</span>
}

function ElementCard({
  element,
  onApprove,
  onHighlight,
}: {
  element: AIDetectedElement
  onApprove: (qty: number, unit: string, desc: string) => void
  onHighlight: (el: AIDetectedElement | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [qty, setQty] = useState(element.estimatedQuantity?.toString() ?? '')
  const [unit, setUnit] = useState(element.boqUnit)
  const [desc, setDesc] = useState(element.boqDescription)
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')

  if (status === 'rejected') return null

  return (
    <div
      className={cn(
        'border rounded-lg transition-all',
        status === 'approved'
          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10 opacity-70'
          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600',
      )}
      onMouseEnter={() => onHighlight(element)}
      onMouseLeave={() => onHighlight(null)}
    >
      <div className="flex items-center gap-1.5 p-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown size={12} className="text-slate-400 shrink-0" /> : <ChevronRight size={12} className="text-slate-400 shrink-0" />}
        <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0', TYPE_COLORS[element.type] || TYPE_COLORS.other)}>
          {element.label}
        </span>
        <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate flex-1">{element.description}</span>
        <ConfidenceBadge value={element.confidence} />
        {element.isRepeated && element.repeatCount && element.repeatCount > 1 && (
          <span className="flex items-center gap-0.5 text-[9px] text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-1 rounded">
            <Repeat size={9} />×{element.repeatCount}
          </span>
        )}
        {status === 'approved' && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
      </div>

      {expanded && (
        <div className="px-2.5 pb-2.5 pt-1 space-y-2 border-t border-slate-100 dark:border-slate-700/50">
          {/* Details */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            {element.material && (
              <><span className="text-slate-400">Material</span><span className="text-slate-600 dark:text-slate-300">{element.material}</span></>
            )}
            {element.dimensions && (
              <>
                <span className="text-slate-400">Dimensions</span>
                <span className="text-slate-600 dark:text-slate-300">
                  {[
                    element.dimensions.length && `L:${element.dimensions.length}`,
                    element.dimensions.width && `W:${element.dimensions.width}`,
                    element.dimensions.height && `H:${element.dimensions.height}`,
                    element.dimensions.thickness && `T:${element.dimensions.thickness}`,
                    element.dimensions.diameter && `Ø${element.dimensions.diameter}`,
                  ].filter(Boolean).join(' × ')} {element.dimensions.unit}
                </span>
              </>
            )}
            <span className="text-slate-400">Quantity</span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">{element.estimatedQuantity ?? '—'} {element.suggestedUnit}</span>
            <span className="text-slate-400">Trade</span>
            <span className="text-slate-600 dark:text-slate-300 capitalize">{element.trade}</span>
          </div>

          {/* Reasoning */}
          {element.reasoning && (
            <div className="flex items-start gap-1.5 p-2 bg-blue-50 dark:bg-blue-900/10 rounded text-[10px] text-blue-700 dark:text-blue-300">
              <Info size={12} className="shrink-0 mt-0.5" />
              <span>{element.reasoning}</span>
            </div>
          )}

          {editing ? (
            <div className="space-y-1.5">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider">BOQ Description</label>
                <input
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Quantity</label>
                  <input type="number" value={qty} onChange={e => setQty(e.target.value)}
                    className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600" />
                </div>
                <div className="w-20">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Unit</label>
                  <select value={unit} onChange={e => setUnit(e.target.value)}
                    className="w-full px-2 py-1 text-xs border rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                    {['m', 'm²', 'm³', 'lm', 'nr', 'kg', 'ton', 'l'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-1 justify-end">
                <button onClick={() => setEditing(false)} className="px-2 py-1 text-[10px] text-slate-500 hover:text-slate-700">Cancel</button>
                <button onClick={() => setEditing(false)} className="px-2 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
              </div>
            </div>
          ) : null}

          {status === 'pending' && (
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => { onApprove(parseFloat(qty) || 0, unit, desc); setStatus('approved') }}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
              >
                <Check size={11} /> Approve
              </button>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded hover:bg-slate-200 transition-colors"
              >
                <Edit3 size={11} /> Edit
              </button>
              <button
                onClick={() => setStatus('rejected')}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded hover:bg-red-100 transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BOQGroupCard({
  group,
  onApproveItem,
}: {
  group: AIBOQGroup
  onApproveItem: (item: AIBOQItem) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [approvedItems, setApprovedItems] = useState<Set<string>>(new Set())

  return (
    <div className={cn('border rounded-lg border-l-4 overflow-hidden', TRADE_COLORS[group.trade] || 'border-l-slate-400', 'border-slate-200 dark:border-slate-700')}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 text-left bg-slate-50 dark:bg-slate-900/50"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{group.tradeLabel}</span>
          <span className="text-[10px] text-slate-400">{group.items.length} items</span>
        </div>
        {group.subtotal !== null && group.subtotal > 0 && (
          <span className="text-[10px] font-mono text-slate-500">${group.subtotal.toLocaleString()}</span>
        )}
      </button>

      {expanded && (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {group.items.map((item, i) => {
            const isApproved = approvedItems.has(item.code + i)
            return (
              <div key={`${item.code}-${i}`} className={cn('px-3 py-2 text-[11px]', isApproved && 'bg-emerald-50/50 dark:bg-emerald-900/10')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">{item.code}</span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium truncate">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-500">
                      <span className="font-medium">{item.quantity} {item.unit}</span>
                      {item.unitRate !== null && <span>@ ${item.unitRate}/{item.unit}</span>}
                      {item.amount !== null && <span className="font-medium text-slate-700 dark:text-slate-300">${item.amount.toLocaleString()}</span>}
                      <ConfidenceBadge value={item.confidence} />
                    </div>
                    {item.materialBreakdown && (
                      <div className="flex flex-wrap gap-2 mt-1 text-[9px] text-slate-500">
                        {item.materialBreakdown.concrete && (
                          <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded">
                            Concrete: {item.materialBreakdown.concrete.volume}m³ {item.materialBreakdown.concrete.grade}
                          </span>
                        )}
                        {item.materialBreakdown.steel && (
                          <span className="px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 rounded">
                            Steel: {item.materialBreakdown.steel.weight}kg
                          </span>
                        )}
                        {item.materialBreakdown.blocks && (
                          <span className="px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 rounded">
                            Blocks: {item.materialBreakdown.blocks.count} × {item.materialBreakdown.blocks.size}
                          </span>
                        )}
                        {item.materialBreakdown.finishingArea && (
                          <span className="px-1.5 py-0.5 bg-pink-50 dark:bg-pink-900/20 rounded">
                            Finish: {item.materialBreakdown.finishingArea.area}m²
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {!isApproved ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { onApproveItem(item); setApprovedItems(prev => new Set(prev).add(item.code + i)) }}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"
                        title="Add to BOQ"
                      >
                        <Check size={14} />
                      </button>
                      <button className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Reject">
                        <XCircle size={14} />
                      </button>
                    </div>
                  ) : (
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  )}
                </div>
                {item.reasoning && (
                  <div className="flex items-start gap-1 mt-1.5 p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded text-[10px] text-slate-500">
                    <Info size={10} className="shrink-0 mt-0.5" />
                    <span>{item.reasoning}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AISuggestionsPanel({
  isOpen,
  onClose,
  isAnalyzing,
  result,
  onAnalyze,
  onApproveElement,
  onApproveBOQItem,
  onApproveAll,
  onHighlightElement,
  onEstimateCosts,
  isEstimatingCosts,
}: AISuggestionsPanelProps) {
  const [tab, setTab] = useState<PanelTab>('elements')

  const stats = useMemo(() => {
    if (!result?.drawing) return null
    const els = result.drawing.elements
    const byTrade = new Map<string, number>()
    for (const el of els) {
      byTrade.set(el.trade, (byTrade.get(el.trade) || 0) + 1)
    }
    return {
      totalElements: els.length,
      highConfidence: els.filter(e => e.confidence >= 0.8).length,
      repeatedPatterns: result.drawing.repeatedPatterns.length,
      detectedScale: result.drawing.detectedScale,
      detectedDimensions: result.drawing.dimensions.length,
      boqItems: result.boq.reduce((sum, g) => sum + g.items.length, 0),
      trades: byTrade,
    }
  }, [result])

  if (!isOpen) return null

  const TABS: { id: PanelTab; icon: typeof Layers; label: string }[] = [
    { id: 'elements', icon: Layers, label: 'Elements' },
    { id: 'boq', icon: FileSpreadsheet, label: 'BOQ' },
    { id: 'cost', icon: DollarSign, label: 'Cost' },
  ]

  return (
    <div className="absolute top-0 right-0 z-30 w-[340px] h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-violet-600 dark:text-violet-400" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">AI Engineer</span>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      {result && !result.error && (
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors border-b-2',
                tab === t.id
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
              )}
            >
              <t.icon size={14} />
              {t.label}
              {t.id === 'elements' && stats && (
                <span className="text-[9px] px-1 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300">
                  {stats.totalElements}
                </span>
              )}
              {t.id === 'boq' && stats && (
                <span className="text-[9px] px-1 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300">
                  {stats.boqItems}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty state */}
        {!result && !isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 dark:from-violet-900/30 dark:to-blue-900/30 flex items-center justify-center mb-4">
              <Sparkles size={36} className="text-violet-500" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">AI Engineering Assistant</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 max-w-[250px]">
              Analyze this drawing to detect structural elements, generate a preliminary BOQ, calculate material quantities, and estimate costs.
            </p>
            <div className="text-left text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 mb-5">
              <div className="flex items-center gap-2"><Layers size={13} className="text-blue-500" /> Detect walls, slabs, beams, columns, MEP</div>
              <div className="flex items-center gap-2"><Ruler size={13} className="text-amber-500" /> Read dimensions & detect scale</div>
              <div className="flex items-center gap-2"><Repeat size={13} className="text-violet-500" /> Find repeated patterns</div>
              <div className="flex items-center gap-2"><FileSpreadsheet size={13} className="text-emerald-500" /> Generate preliminary BOQ by trade</div>
              <div className="flex items-center gap-2"><DollarSign size={13} className="text-orange-500" /> Estimate material quantities & costs</div>
            </div>
            <button
              onClick={onAnalyze}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-lg hover:from-violet-700 hover:to-blue-700 transition-colors text-sm font-medium shadow-md"
            >
              <Brain size={18} />
              Analyze Drawing
            </button>
          </div>
        )}

        {/* Loading */}
        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-violet-200 dark:border-violet-800 border-t-violet-600 dark:border-t-violet-400 animate-spin" />
              <Brain size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">AI is analyzing...</h3>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 mt-2">
              <p className="animate-pulse">Detecting engineering elements...</p>
              <p className="animate-pulse delay-300">Reading dimensions & scale...</p>
              <p className="animate-pulse delay-700">Generating preliminary BOQ...</p>
              <p className="animate-pulse delay-1000">Calculating material quantities...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {result?.error && (
          <div className="p-4">
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-red-700 dark:text-red-300">Analysis Failed</p>
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">{result.error}</p>
              </div>
            </div>
            <button
              onClick={onAnalyze}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700"
            >
              <Brain size={14} /> Retry Analysis
            </button>
          </div>
        )}

        {/* Results */}
        {result && !result.error && (
          <>
            {/* Stats bar */}
            <div className="p-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                <div className="p-1.5 bg-white dark:bg-slate-800 rounded">
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{stats?.totalElements ?? 0}</div>
                  <div className="text-slate-400">Elements</div>
                </div>
                <div className="p-1.5 bg-white dark:bg-slate-800 rounded">
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{stats?.boqItems ?? 0}</div>
                  <div className="text-slate-400">BOQ Items</div>
                </div>
                <div className="p-1.5 bg-white dark:bg-slate-800 rounded">
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{stats?.detectedDimensions ?? 0}</div>
                  <div className="text-slate-400">Dimensions</div>
                </div>
              </div>

              {/* Detected scale */}
              {result.drawing.detectedScale && (
                <div className="mt-1.5 flex items-center gap-2 px-2 py-1 bg-amber-50 dark:bg-amber-900/10 rounded text-[10px]">
                  <Ruler size={12} className="text-amber-600 shrink-0" />
                  <span className="text-amber-700 dark:text-amber-300 font-medium">Scale detected: {result.drawing.detectedScale.ratio}</span>
                  <ConfidenceBadge value={result.drawing.detectedScale.confidence} />
                </div>
              )}

              {/* Repeated patterns */}
              {result.drawing.repeatedPatterns.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {result.drawing.repeatedPatterns.map((p, i) => (
                    <span key={i} className="flex items-center gap-1 text-[9px] text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 px-1.5 py-0.5 rounded">
                      <Repeat size={9} /> {p.count}× {p.description}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 italic">{result.drawing.summary}</p>
            </div>

            {/* Elements tab */}
            {tab === 'elements' && (
              <div className="p-2 space-y-1.5">
                <button
                  onClick={() => onApproveAll(result.drawing.elements)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Check size={14} /> Approve All ({result.drawing.elements.length})
                </button>
                {result.drawing.elements.map(element => (
                  <ElementCard
                    key={element.id}
                    element={element}
                    onApprove={(qty, unit, desc) => onApproveElement(element, qty, unit, desc)}
                    onHighlight={onHighlightElement}
                  />
                ))}
              </div>
            )}

            {/* BOQ tab */}
            {tab === 'boq' && (
              <div className="p-2 space-y-2">
                {result.boq.map((group, i) => (
                  <BOQGroupCard
                    key={`${group.trade}-${i}`}
                    group={group}
                    onApproveItem={onApproveBOQItem}
                  />
                ))}
                {result.boq.length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-8">No BOQ items generated</p>
                )}
              </div>
            )}

            {/* Cost tab */}
            {tab === 'cost' && (
              <div className="p-2 space-y-3">
                {result.totalEstimatedCost !== null && result.totalEstimatedCost > 0 ? (
                  <div className="p-4 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-lg text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Estimated Cost</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                      ${result.totalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">{result.currency} · {result.boq.length} trades · {stats?.boqItems} items</p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <DollarSign size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs text-slate-500 mb-3">Estimate unit rates using AI to get a project cost estimate.</p>
                    <button
                      onClick={onEstimateCosts}
                      disabled={isEstimatingCosts}
                      className="flex items-center justify-center gap-2 mx-auto px-4 py-2 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                    >
                      {isEstimatingCosts ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
                      {isEstimatingCosts ? 'Estimating...' : 'Estimate Costs'}
                    </button>
                  </div>
                )}

                {/* Trade breakdown */}
                {result.boq.filter(g => (g.subtotal ?? 0) > 0).length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">By Trade</p>
                    <div className="space-y-1">
                      {result.boq.filter(g => (g.subtotal ?? 0) > 0).map((g, i) => (
                        <div key={i} className={cn('flex items-center justify-between px-2 py-1.5 rounded text-[11px] border-l-3', TRADE_COLORS[g.trade])}>
                          <span className="text-slate-600 dark:text-slate-300">{g.tradeLabel}</span>
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200">${(g.subtotal ?? 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Re-analyze */}
            <div className="p-2 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={onAnalyze}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-slate-400 transition-colors"
              >
                <Brain size={14} /> Re-analyze Page
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
