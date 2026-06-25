'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import type { Contract, Variation, CostEntry, CashflowEntry, VariationType, VariationStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  getContract,
  upsertContract,
  getVariations,
  createVariation,
  updateVariation,
  deleteVariation,
  getCostEntries,
  createCostEntry,
  deleteCostEntry,
  getCashflow,
} from '@/app/actions/cost-control'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts'

const VAR_STATUS_META: Record<VariationStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'text-slate-500 bg-slate-100 dark:bg-slate-700' },
  submitted: { label: 'Submitted', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
  approved: { label: 'Approved', color: 'text-green-600 bg-green-50 dark:bg-green-900/30' },
  rejected: { label: 'Rejected', color: 'text-red-600 bg-red-50 dark:bg-red-900/30' },
  withdrawn: { label: 'Withdrawn', color: 'text-slate-400 bg-slate-50 dark:bg-slate-800' },
}

export default function CostControlPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [contract, setContract] = useState<Contract | null>(null)
  const [variations, setVariations] = useState<Variation[]>([])
  const [costEntries, setCostEntries] = useState<CostEntry[]>([])
  const [cashflow, setCashflow] = useState<CashflowEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'variations' | 'costs' | 'cashflow'>('overview')
  const [showContractEdit, setShowContractEdit] = useState(false)
  const [showAddVariation, setShowAddVariation] = useState(false)
  const [showAddCost, setShowAddCost] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [contractForm, setContractForm] = useState({
    contract_value: '', contingency_pct: '5', retention_pct: '10', advance_pct: '0',
    vat_pct: '17', start_date: '', end_date: '', duration_months: '', notes: '',
  })
  const [varForm, setVarForm] = useState({
    variation_no: '', title: '', description: '', variation_type: 'addition' as VariationType, amount: '',
  })
  const [costForm, setCostForm] = useState({
    period_date: '', category: 'actual', cost_type: 'direct', description: '', amount: '', notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [c, v, ce, cf] = await Promise.all([
      getContract(projectId), getVariations(projectId),
      getCostEntries(projectId), getCashflow(projectId),
    ])
    setContract(c)
    setVariations(v)
    setCostEntries(ce)
    setCashflow(cf)
    if (c) {
      setContractForm({
        contract_value: String(c.contract_value), contingency_pct: String(c.contingency_pct),
        retention_pct: String(c.retention_pct), advance_pct: String(c.advance_pct),
        vat_pct: String(c.vat_pct), start_date: c.start_date ?? '', end_date: c.end_date ?? '',
        duration_months: c.duration_months ? String(c.duration_months) : '', notes: c.notes ?? '',
      })
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handleSaveContract = async () => {
    setError(null)
    const r = await upsertContract({
      project_id: projectId,
      contract_value: parseFloat(contractForm.contract_value) || 0,
      contingency_pct: parseFloat(contractForm.contingency_pct) || 0,
      retention_pct: parseFloat(contractForm.retention_pct) || 0,
      advance_pct: parseFloat(contractForm.advance_pct) || 0,
      vat_pct: parseFloat(contractForm.vat_pct) || 0,
      start_date: contractForm.start_date || undefined,
      end_date: contractForm.end_date || undefined,
      duration_months: parseInt(contractForm.duration_months) || undefined,
      notes: contractForm.notes || undefined,
    })
    if (r.error) { setError(r.error); return }
    setShowContractEdit(false)
    load()
  }

  const handleAddVariation = async () => {
    if (!varForm.title.trim()) return
    setError(null)
    const r = await createVariation({
      project_id: projectId,
      variation_no: varForm.variation_no,
      title: varForm.title,
      description: varForm.description || undefined,
      variation_type: varForm.variation_type,
      amount: parseFloat(varForm.amount) || 0,
    })
    if (r.error) { setError(r.error); return }
    setShowAddVariation(false)
    setVarForm({ variation_no: '', title: '', description: '', variation_type: 'addition', amount: '' })
    load()
  }

  const handleAddCost = async () => {
    if (!costForm.description.trim()) return
    setError(null)
    const r = await createCostEntry({
      project_id: projectId,
      period_date: costForm.period_date || new Date().toISOString().slice(0, 10),
      category: costForm.category,
      cost_type: costForm.cost_type,
      description: costForm.description,
      amount: parseFloat(costForm.amount) || 0,
      notes: costForm.notes || undefined,
    })
    if (r.error) { setError(r.error); return }
    setShowAddCost(false)
    setCostForm({ period_date: '', category: 'actual', cost_type: 'direct', description: '', amount: '', notes: '' })
    load()
  }

  // EVM calculations
  const contractValue = contract?.contract_value ?? 0
  const approvedVariations = variations.filter(v => v.status === 'approved').reduce((s, v) => s + (v.approved_amount ?? v.amount), 0)
  const pendingVariations = variations.filter(v => v.status === 'pending' || v.status === 'submitted').reduce((s, v) => s + v.amount, 0)
  const revisedContract = contractValue + approvedVariations
  const actualCost = costEntries.filter(c => c.category === 'actual').reduce((s, c) => s + c.amount, 0)
  const committedCost = costEntries.filter(c => c.category === 'committed').reduce((s, c) => s + c.amount, 0)
  const forecastCost = costEntries.filter(c => c.category === 'forecast').reduce((s, c) => s + c.amount, 0)
  const totalExposure = actualCost + committedCost + forecastCost
  const contingency = contractValue * ((contract?.contingency_pct ?? 0) / 100)
  const projectedProfit = revisedContract - totalExposure

  const costBreakdown = totalExposure > 0
    ? [
        { label: 'Actual', pct: (actualCost / totalExposure) * 100, color: 'bg-red-500' },
        { label: 'Committed', pct: (committedCost / totalExposure) * 100, color: 'bg-amber-500' },
        { label: 'Forecast', pct: (forecastCost / totalExposure) * 100, color: 'bg-blue-400' },
      ]
    : []

  if (loading) {
    return <div className="p-4 md:p-8 max-w-7xl mx-auto"><div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse" />)}</div></div>
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20">
            <BarChart3 size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cost Control</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Budget, variations, cost tracking &amp; forecasting</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowContractEdit(true)}>
          <DollarSign size={16} /> {contract ? 'Edit Contract' : 'Set Contract'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {([
          { label: 'Contract Value', value: contractValue, icon: DollarSign, gradient: 'from-blue-500 to-blue-600' },
          { label: 'Approved Variations', value: approvedVariations, icon: FileText, gradient: 'from-green-500 to-emerald-600' },
          { label: 'Revised Contract', value: revisedContract, icon: TrendingUp, gradient: 'from-indigo-500 to-indigo-600' },
          { label: 'Actual Cost', value: actualCost, icon: TrendingDown, gradient: 'from-red-500 to-red-600' },
          { label: 'Contingency', value: contingency, icon: Shield, gradient: 'from-amber-500 to-amber-600' },
          { label: 'Projected Profit', value: projectedProfit, icon: DollarSign, gradient: projectedProfit >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-rose-600' },
        ] as const).map((kpi, idx) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}>
            <Card className="relative overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('p-1 rounded-md bg-gradient-to-br text-white', kpi.gradient)}>
                    <kpi.icon size={12} />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                </div>
                <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{fmt(kpi.value)}</div>
                <kpi.icon size={48} className="absolute -bottom-2 -right-2 text-slate-100 dark:text-slate-700/30" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Cost Breakdown Bar */}
      {costBreakdown.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Cost Composition</span>
              <span className="text-xs text-slate-500 tabular-nums">Total Exposure: {fmt(totalExposure)}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex">
              {costBreakdown.map(s => (
                <div key={s.label} className={cn('h-full', s.color)} style={{ width: `${s.pct}%` }} />
              ))}
            </div>
            <div className="flex gap-4 mt-2">
              {costBreakdown.map(s => (
                <div key={s.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className={cn('w-2 h-2 rounded-full', s.color)} />
                  {s.label} ({s.pct.toFixed(1)}%)
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Composition Donut Chart */}
      {totalExposure > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Cost Composition</span>
            <div className="h-64 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Actual', value: actualCost },
                      { name: 'Committed', value: committedCost },
                      { name: 'Forecast', value: forecastCost },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#f43f5e" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#60a5fa" />
                  </Pie>
                  <Tooltip formatter={(value) => fmt(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 dark:border-slate-700">
        {(['overview', 'variations', 'costs', 'cashflow'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize',
            activeTab === tab ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'
          )}>{tab}</button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <tbody>
              {[
                { label: 'Original Contract Value', value: contractValue },
                { label: 'Approved Variations', value: approvedVariations },
                { label: 'Pending Variations', value: pendingVariations, muted: true },
                { label: 'Revised Contract Value', value: revisedContract, bold: true },
                { label: 'Actual Cost to Date', value: actualCost },
                { label: 'Committed Cost', value: committedCost },
                { label: 'Forecast to Complete', value: forecastCost },
                { label: 'Total Exposure', value: totalExposure, bold: true },
                { label: 'Contingency', value: contingency },
                { label: 'Projected Profit/Loss', value: projectedProfit, bold: true, highlight: true },
              ].map(row => (
                <tr key={row.label} className={cn('border-b border-slate-100 dark:border-slate-700', row.bold && 'bg-slate-50/50 dark:bg-slate-900/30')}>
                  <td className={cn('px-4 py-2.5', row.bold ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300', row.muted && 'text-slate-400 italic')}>{row.label}</td>
                  <td className={cn('px-4 py-2.5 text-right tabular-nums', row.bold ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200',
                    row.highlight && (projectedProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')
                  )}>{fmt(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Variations tab */}
      {activeTab === 'variations' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowAddVariation(true)}><Plus size={14} /> Add Variation</Button>
          </div>
          {variations.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">No variations recorded yet.</div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">No.</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Title</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Type</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Amount</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Approved</th>
                    <th className="w-[60px]" />
                  </tr>
                </thead>
                <tbody>
                  {variations.map(v => (
                    <tr key={v.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-750">
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">{v.variation_no}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{v.title}</td>
                      <td className="px-3 py-2 text-xs capitalize text-slate-500">{v.variation_type}</td>
                      <td className="px-3 py-2">
                        <select
                          value={v.status}
                          onChange={e => { updateVariation(v.id, { status: e.target.value as VariationStatus }); load() }}
                          className={cn('text-xs px-2 py-0.5 rounded-full border-0 font-medium', VAR_STATUS_META[v.status].color)}
                        >
                          {Object.entries(VAR_STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(v.amount)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{v.approved_amount != null ? fmt(v.approved_amount) : '-'}</td>
                      <td className="px-3 py-1">
                        <button onClick={() => { deleteVariation(v.id); load() }} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-600">
                    <td colSpan={4} className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">Total</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{fmt(variations.reduce((s, v) => s + v.amount, 0))}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-green-600 dark:text-green-400">
                      {fmt(variations.filter(v => v.approved_amount != null).reduce((s, v) => s + (v.approved_amount ?? 0), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Cost entries tab */}
      {activeTab === 'costs' && (
        <div>
          <div className="flex justify-end mb-3">
            <Button size="sm" onClick={() => setShowAddCost(true)}><Plus size={14} /> Add Entry</Button>
          </div>
          {costEntries.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">No cost entries recorded yet.</div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Date</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Description</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Category</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Type</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Amount</th>
                    <th className="w-[40px]" />
                  </tr>
                </thead>
                <tbody>
                  {costEntries.map(ce => (
                    <tr key={ce.id} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="px-3 py-2 text-xs text-slate-500">{ce.period_date}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{ce.description}</td>
                      <td className="px-3 py-2 text-xs capitalize text-slate-500">{ce.category}</td>
                      <td className="px-3 py-2 text-xs capitalize text-slate-500">{ce.cost_type}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(ce.amount)}</td>
                      <td className="px-3 py-1">
                        <button onClick={() => { deleteCostEntry(ce.id); load() }} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Cashflow tab */}
      {activeTab === 'cashflow' && (
        <div>
          {cashflow.length > 0 && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Cashflow Overview</span>
                <div className="h-72 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashflow.map(cf => ({ period: cf.period_date, 'Planned Income': cf.planned_income, 'Actual Income': cf.actual_income, 'Planned Expense': cf.planned_expense, 'Actual Expense': cf.actual_expense }))}>
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => fmt(Number(value))} />
                      <Legend />
                      <Bar dataKey="Planned Income" fill="#86efac" />
                      <Bar dataKey="Actual Income" fill="#22c55e" />
                      <Bar dataKey="Planned Expense" fill="#fca5a5" />
                      <Bar dataKey="Actual Expense" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          {cashflow.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">No cash flow data yet. Cash flow is populated from payment certificates and cost entries.</div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Period</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Plan Income</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Actual Income</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Plan Expense</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Actual Expense</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {cashflow.map(cf => {
                    const net = cf.actual_income - cf.actual_expense
                    return (
                      <tr key={cf.id} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="px-3 py-2 text-xs text-slate-500">{cf.period_date}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(cf.planned_income)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(cf.actual_income)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(cf.planned_expense)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(cf.actual_expense)}</td>
                        <td className={cn('px-3 py-2 text-right tabular-nums font-medium', net >= 0 ? 'text-green-600' : 'text-red-600')}>{fmt(net)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Contract Edit Modal */}
      <Modal isOpen={showContractEdit} onClose={() => setShowContractEdit(false)} title="Contract Details" size="md">
        <div className="space-y-4">
          <Input label="Contract Value" type="number" value={contractForm.contract_value} onChange={e => setContractForm({ ...contractForm, contract_value: e.target.value })} />
          <div className="grid grid-cols-4 gap-4">
            <Input label="Contingency %" type="number" value={contractForm.contingency_pct} onChange={e => setContractForm({ ...contractForm, contingency_pct: e.target.value })} />
            <Input label="Retention %" type="number" value={contractForm.retention_pct} onChange={e => setContractForm({ ...contractForm, retention_pct: e.target.value })} />
            <Input label="Advance %" type="number" value={contractForm.advance_pct} onChange={e => setContractForm({ ...contractForm, advance_pct: e.target.value })} />
            <Input label="VAT %" type="number" value={contractForm.vat_pct} onChange={e => setContractForm({ ...contractForm, vat_pct: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Start Date" type="date" value={contractForm.start_date} onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })} />
            <Input label="End Date" type="date" value={contractForm.end_date} onChange={e => setContractForm({ ...contractForm, end_date: e.target.value })} />
            <Input label="Duration (months)" type="number" value={contractForm.duration_months} onChange={e => setContractForm({ ...contractForm, duration_months: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowContractEdit(false)}>Cancel</Button>
            <Button onClick={handleSaveContract}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Add Variation Modal */}
      <Modal isOpen={showAddVariation} onClose={() => setShowAddVariation(false)} title="New Variation" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input label="Variation No." value={varForm.variation_no} onChange={e => setVarForm({ ...varForm, variation_no: e.target.value })} placeholder="VO-001" />
            <div className="col-span-2">
              <Input label="Title" value={varForm.title} onChange={e => setVarForm({ ...varForm, title: e.target.value })} placeholder="e.g. Additional foundation work" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Type</label>
              <select value={varForm.variation_type} onChange={e => setVarForm({ ...varForm, variation_type: e.target.value as VariationType })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="addition">Addition</option>
                <option value="omission">Omission</option>
                <option value="substitution">Substitution</option>
              </select>
            </div>
            <Input label="Amount" type="number" value={varForm.amount} onChange={e => setVarForm({ ...varForm, amount: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddVariation(false)}>Cancel</Button>
            <Button onClick={handleAddVariation} disabled={!varForm.title.trim()}>Add</Button>
          </div>
        </div>
      </Modal>

      {/* Add Cost Modal */}
      <Modal isOpen={showAddCost} onClose={() => setShowAddCost(false)} title="New Cost Entry" size="md">
        <div className="space-y-4">
          <Input label="Description" value={costForm.description} onChange={e => setCostForm({ ...costForm, description: e.target.value })} placeholder="e.g. Concrete supply batch #5" />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Date" type="date" value={costForm.period_date} onChange={e => setCostForm({ ...costForm, period_date: e.target.value })} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Category</label>
              <select value={costForm.category} onChange={e => setCostForm({ ...costForm, category: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="actual">Actual</option>
                <option value="committed">Committed</option>
                <option value="forecast">Forecast</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Type</label>
              <select value={costForm.cost_type} onChange={e => setCostForm({ ...costForm, cost_type: e.target.value })} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['direct','indirect','material','labor','equipment','subcontractor','overhead','other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <Input label="Amount" type="number" value={costForm.amount} onChange={e => setCostForm({ ...costForm, amount: e.target.value })} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddCost(false)}>Cancel</Button>
            <Button onClick={handleAddCost} disabled={!costForm.description.trim()}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
