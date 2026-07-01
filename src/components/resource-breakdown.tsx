'use client'

import { useState, useMemo } from 'react'
import type { RateAnalysis, ResourceType } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  ChevronRight,
  Package,
  Users,
  Wrench,
  Building2,
  TrendingUp,
  Percent,
} from 'lucide-react'

// ── Config ─────────────────────────────────────────────────────────────

type CategoryKey = ResourceType | 'overhead' | 'profit'

interface CategoryConfig {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  barColor: string
  textColor: string
  bgColor: string
}

const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  material: {
    label: 'Materials',
    icon: Package,
    barColor: 'bg-[var(--color-info)]',
    textColor: 'text-[var(--color-info)]',
    bgColor: 'bg-[var(--color-info-bg)]',
  },
  labor: {
    label: 'Labor',
    icon: Users,
    barColor: 'bg-orange-500',
    textColor: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
  },
  equipment: {
    label: 'Equipment',
    icon: Wrench,
    barColor: 'bg-green-500',
    textColor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
  },
  subcontractor: {
    label: 'Subcontractors',
    icon: Building2,
    barColor: 'bg-purple-500',
    textColor: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
  overhead: {
    label: 'Overhead',
    icon: Percent,
    barColor: 'bg-[var(--color-surface-elevated)]0',
    textColor: 'text-[var(--color-text-secondary)] dark:text-[var(--color-text-muted)]',
    bgColor: 'bg-[var(--color-surface-elevated)] dark:bg-[var(--color-surface-elevated)]/40',
  },
  profit: {
    label: 'Profit',
    icon: TrendingUp,
    barColor: 'bg-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
}

const CATEGORY_ORDER: CategoryKey[] = ['material', 'labor', 'equipment', 'subcontractor', 'overhead', 'profit']

// ── Helpers ────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface AggregatedResource {
  description: string
  unit: string
  quantity: number
  unitCost: number
  wastePct: number
  amount: number
  analysisDescription: string
}

interface CategoryData {
  key: CategoryKey
  config: CategoryConfig
  total: number
  pct: number
  resources: AggregatedResource[]
}

// ── Component ──────────────────────────────────────────────────────────

export interface ResourceBreakdownProps {
  rateAnalyses: RateAnalysis[]
}

export default function ResourceBreakdown({ rateAnalyses }: ResourceBreakdownProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoryKey>>(new Set())

  const toggle = (key: CategoryKey) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const { categories, grandTotal } = useMemo(() => {
    const resourcesByType: Record<ResourceType, AggregatedResource[]> = {
      material: [],
      labor: [],
      equipment: [],
      subcontractor: [],
    }

    let totalOverhead = 0
    let totalProfit = 0

    for (const ra of rateAnalyses) {
      for (const res of ra.resources ?? []) {
        resourcesByType[res.resource_type].push({
          description: res.description,
          unit: res.unit,
          quantity: res.quantity,
          unitCost: res.unit_cost,
          wastePct: res.waste_pct,
          amount: res.total_amount,
          analysisDescription: ra.description,
        })
      }
      totalOverhead += ra.overhead_amount
      totalProfit += ra.profit_amount
    }

    const typeTotals: Record<ResourceType, number> = {
      material: resourcesByType.material.reduce((s, r) => s + r.amount, 0),
      labor: resourcesByType.labor.reduce((s, r) => s + r.amount, 0),
      equipment: resourcesByType.equipment.reduce((s, r) => s + r.amount, 0),
      subcontractor: resourcesByType.subcontractor.reduce((s, r) => s + r.amount, 0),
    }

    const grandTotal =
      typeTotals.material + typeTotals.labor + typeTotals.equipment + typeTotals.subcontractor +
      totalOverhead + totalProfit

    const categories: CategoryData[] = CATEGORY_ORDER.map(key => {
      const isResource = key === 'material' || key === 'labor' || key === 'equipment' || key === 'subcontractor'
      const total = isResource ? typeTotals[key] : key === 'overhead' ? totalOverhead : totalProfit
      return {
        key,
        config: CATEGORY_CONFIG[key],
        total,
        pct: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
        resources: isResource ? resourcesByType[key] : [],
      }
    })

    return { categories, grandTotal }
  }, [rateAnalyses])

  if (rateAnalyses.length === 0) {
    return (
      <Card className="!shadow-sm">
        <CardContent>
          <p className="text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] text-center py-8">
            No rate analyses available. Create rate analyses to see the resource breakdown.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Project Total Header */}
      <Card className="!shadow-sm">
        <CardContent className="!py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] uppercase tracking-wider">
                Project Total
              </p>
              <p className="text-2xl font-bold text-[var(--color-text)] dark:text-white tabular-nums">
                {fmt(grandTotal)}
              </p>
            </div>
            <div className="text-end text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
              <p>{rateAnalyses.length} rate {rateAnalyses.length === 1 ? 'analysis' : 'analyses'}</p>
              <p>
                {rateAnalyses.reduce((s, ra) => s + (ra.resources?.length ?? 0), 0)} resources
              </p>
            </div>
          </div>

          {/* Stacked proportion bar */}
          <div className="flex h-4 rounded-full overflow-hidden bg-[var(--color-surface-elevated)] dark:bg-[var(--color-surface-elevated)]">
            {categories.map(cat => {
              if (cat.pct < 0.3) return null
              return (
                <div
                  key={cat.key}
                  className={cn(cat.config.barColor, 'transition-all duration-500')}
                  style={{ width: `${cat.pct}%` }}
                  title={`${cat.config.label}: ${fmt(cat.total)} (${cat.pct.toFixed(1)}%)`}
                />
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
            {categories.map(cat => {
              if (cat.total === 0) return null
              return (
                <div key={cat.key} className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)]">
                  <div className={cn('w-2.5 h-2.5 rounded-sm', cat.config.barColor)} />
                  <span className="font-medium">{cat.config.label}</span>
                  <span className="text-[var(--color-text-muted)] tabular-nums">{cat.pct.toFixed(1)}%</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Category Rows */}
      <div className="space-y-2">
        {categories.map(cat => {
          if (cat.total === 0) return null
          const Icon = cat.config.icon
          const isExpanded = expandedCategories.has(cat.key)
          const hasResources = cat.resources.length > 0

          return (
            <Card key={cat.key} className="!shadow-sm overflow-hidden">
              {/* Category header */}
              <div
                className={cn(
                  'flex items-center gap-3 px-5 py-3.5 transition-colors',
                  hasResources && 'cursor-pointer hover:bg-[var(--color-surface-elevated)] dark:hover:bg-[var(--color-surface-elevated)]'
                )}
                onClick={() => hasResources && toggle(cat.key)}
              >
                {hasResources && (
                  <div className="text-[var(--color-text-muted)]">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                )}
                <div className={cn('p-2 rounded-lg', cat.config.bgColor)}>
                  <Icon size={16} className={cat.config.textColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-[var(--color-text)] dark:text-white">
                    {cat.config.label}
                  </span>
                  {hasResources && (
                    <span className="ml-2 text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
                      {cat.resources.length} item{cat.resources.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Proportion bar */}
                <div className="hidden sm:block w-32 mr-4">
                  <div className="h-2 rounded-full bg-[var(--color-surface-elevated)] dark:bg-[var(--color-surface-elevated)] overflow-hidden">
                    <div
                      className={cn(cat.config.barColor, 'h-full rounded-full transition-all duration-500')}
                      style={{ width: `${cat.pct}%` }}
                    />
                  </div>
                </div>

                <div className="text-end shrink-0">
                  <div className="text-sm font-bold text-[var(--color-text)] dark:text-white tabular-nums">
                    {fmt(cat.total)}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                    {cat.pct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Expanded resource list */}
              {isExpanded && hasResources && (
                <div className="border-t border-[var(--color-border)] dark:border-[var(--color-border)]">
                  {/* Column headers */}
                  <div className="flex items-center gap-2 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)]/60 dark:bg-[var(--color-surface)]/30">
                    <div className="flex-1 min-w-0">Description</div>
                    <div className="w-24 hidden md:block truncate">Source</div>
                    <div className="w-12 text-center">Unit</div>
                    <div className="w-16 text-end">Qty</div>
                    <div className="w-20 text-end">Unit Cost</div>
                    <div className="w-14 text-end">Waste%</div>
                    <div className="w-24 text-end">Amount</div>
                  </div>

                  {cat.resources.map((res, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-5 py-2 text-xs text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]/80 dark:hover:bg-[var(--color-surface-elevated)]/50 transition-colors border-t border-slate-50 dark:border-[var(--color-border)]"
                    >
                      <div className="flex-1 min-w-0 truncate">{res.description}</div>
                      <div className="w-24 hidden md:block truncate text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]" title={res.analysisDescription}>
                        {res.analysisDescription}
                      </div>
                      <div className="w-12 text-center text-[var(--color-text-muted)]">{res.unit}</div>
                      <div className="w-16 text-end tabular-nums">{fmt(res.quantity)}</div>
                      <div className="w-20 text-end tabular-nums">{fmt(res.unitCost)}</div>
                      <div className="w-14 text-end tabular-nums text-[var(--color-text-muted)]">
                        {res.wastePct > 0 ? `${res.wastePct}%` : '-'}
                      </div>
                      <div className="w-24 text-end tabular-nums font-semibold">{fmt(res.amount)}</div>
                    </div>
                  ))}

                  {/* Category subtotal */}
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-surface-elevated)]/80 dark:bg-[var(--color-surface)]/40 border-t border-[var(--color-border)] dark:border-[var(--color-border)]">
                    <div className="flex-1" />
                    <div className="text-xs font-semibold text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)] mr-2">Subtotal</div>
                    <div className="w-24 text-end text-xs font-bold text-[var(--color-text)] dark:text-white tabular-nums">
                      {fmt(cat.total)}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Grand Total */}
      <Card className="!shadow-sm border-2 border-[var(--color-border)] dark:border-[var(--color-border)]">
        <CardContent className="!py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[var(--color-text)] dark:text-slate-100 uppercase tracking-wider">
              Grand Total
            </span>
            <span className="text-xl font-bold text-[var(--color-info)] tabular-nums">
              {fmt(grandTotal)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
