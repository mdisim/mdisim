'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useWorkspace } from './workspace-context'
import { sendCopilotMessage } from '@/app/actions/ai-copilot'
import type { CopilotMessage } from '@/app/actions/ai-copilot'
import {
  Bot, Clock, Activity, DollarSign, CheckSquare, FileBarChart,
  Minimize2, Maximize2, Send, Loader2, Sparkles, User,
  BarChart3, TrendingUp, TrendingDown, ArrowRight,
  Package, AlertTriangle, Copy, CheckCircle, Layers, GitCompare,
} from 'lucide-react'

type DockTab = 'ai' | 'evidence' | 'history' | 'cost' | 'activity' | 'reports'

const DOCK_TABS: { key: DockTab; label: string; icon: typeof Bot; color: string }[] = [
  { key: 'ai', label: 'AI Engineer', icon: Bot, color: 'text-violet-500' },
  { key: 'evidence', label: 'Evidence Center', icon: Layers, color: 'text-[var(--color-blue)]' },
  { key: 'history', label: 'Quantity History', icon: GitCompare, color: 'text-amber-500' },
  { key: 'cost', label: 'Cost Summary', icon: DollarSign, color: 'text-emerald-500' },
  { key: 'activity', label: 'Activity', icon: Activity, color: 'text-cyan-500' },
  { key: 'reports', label: 'Reports', icon: FileBarChart, color: 'text-rose-500' },
]

export function BottomDock({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { data, selection, fmt } = useWorkspace()
  const [activeTab, setActiveTab] = useState<DockTab>('ai')
  const [expanded, setExpanded] = useState(true)
  const [dockHeight, setDockHeight] = useState(220)

  return (
    <div
      className="border-t border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col"
      style={{ height: expanded ? dockHeight : 36 }}
    >
      {/* Tab bar */}
      <div className="flex items-center h-9 px-2 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-0.5 flex-1">
          {DOCK_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setExpanded(true) }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all',
                activeTab === tab.key && expanded
                  ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]'
              )}
            >
              <tab.icon size={12} className={activeTab === tab.key && expanded ? tab.color : ''} />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors"
        >
          {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>
      </div>

      {/* Tab content */}
      {expanded && (
        <div className="flex-1 overflow-hidden">
          {activeTab === 'ai' && <AIEngineerTab projectId={projectId} projectName={projectName} />}
          {activeTab === 'evidence' && <EvidenceTab />}
          {activeTab === 'history' && <QuantityHistoryTab />}
          {activeTab === 'cost' && <CostTab />}
          {activeTab === 'activity' && <ActivityTab />}
          {activeTab === 'reports' && <ReportsTab projectId={projectId} />}
        </div>
      )}
    </div>
  )
}

function AIEngineerTab({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { selection } = useWorkspace()
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const contextLabel = selection.type === 'boq' ? `BOQ: ${selection.boqItem?.description}`
    : selection.type === 'drawing' ? `Drawing: ${selection.drawing?.name}`
    : selection.type === 'measurement' ? `Measurement: ${selection.measurement?.description}`
    : null

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    setError(null)
    const userMsg: CopilotMessage = { id: `u-${Date.now()}`, role: 'user', content: text.trim(), timestamp: new Date().toISOString() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)
    try {
      const { reply, error: err } = await sendCopilotMessage(projectId, 'workspace', updated, text.trim())
      if (err) { setError(err) } else {
        setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply, timestamp: new Date().toISOString() }])
      }
    } catch { setError('Failed to get response') }
    finally { setLoading(false) }
  }, [loading, messages, projectId])

  return (
    <div className="flex h-full">
      {/* Messages */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {messages.length === 0 && (
            <div className="flex items-center gap-3 py-4 px-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white shrink-0">
                <Sparkles size={14} />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[var(--color-text-secondary)]">AI Engineering Assistant</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">Ask about costs, quantities, rates, comparisons, or get recommendations.</p>
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : '')}>
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px]',
                msg.role === 'user' ? 'bg-[var(--color-blue)]/10' : 'bg-violet-500/10'
              )}>
                {msg.role === 'user' ? <User size={11} className="text-[var(--color-blue)]" /> : <Bot size={11} className="text-[var(--color-indigo)]" />}
              </div>
              <div className={cn(
                'max-w-[80%] rounded-xl px-3 py-1.5 text-[11px] leading-relaxed',
                msg.role === 'user'
                  ? 'bg-[var(--color-blue)] text-white rounded-tr-sm'
                  : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] rounded-tl-sm'
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
              <Loader2 size={12} className="animate-spin text-violet-500" />
              Analyzing...
            </div>
          )}
          {error && (
            <div className="text-[10px] text-[var(--color-danger)] flex items-center gap-1">
              <AlertTriangle size={10} />{error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-3 pb-2 pt-1">
          {contextLabel && (
            <div className="text-[9px] text-violet-500 mb-1 flex items-center gap-1">
              <Sparkles size={8} />Context: {contextLabel}
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-[var(--color-surface-elevated)] rounded-lg border border-[var(--color-border)] focus-within:border-violet-400 dark:focus-within:border-violet-600 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(input) }}
              placeholder="Ask the AI Engineer..."
              className="flex-1 px-3 py-2 text-[11px] bg-transparent outline-none text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="p-1.5 mr-1 text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-md transition-colors"
            >
              <Send size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TimelineTab() {
  const { data, fmt } = useWorkspace()
  const events = useMemo(() => {
    const items: { date: string; label: string; type: string; value?: string }[] = []
    for (const p of data.payments) {
      items.push({ date: p.period_to, label: `IPC #${p.cert_number} — ${p.status}`, type: 'payment', value: fmt(p.net_payable) })
    }
    for (const v of data.variations) {
      items.push({ date: v.submitted_date ?? v.created_at.slice(0, 10), label: `${v.variation_no} — ${v.title}`, type: 'variation', value: fmt(v.amount) })
    }
    for (const d of data.drawings) {
      items.push({ date: d.created_at.slice(0, 10), label: `Drawing: ${d.name}`, type: 'drawing' })
    }
    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20)
  }, [data, fmt])

  return (
    <div className="h-full overflow-y-auto px-4 py-2">
      <div className="relative pl-6">
        <div className="absolute start-2 top-0 bottom-0 w-px bg-[var(--color-border)]" />
        {events.map((ev, i) => (
          <div key={i} className="relative pb-3">
            <div className={cn(
              'absolute left-[-17px] w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[var(--background)]',
              ev.type === 'payment' ? 'bg-green-500' : ev.type === 'variation' ? 'bg-amber-500' : 'bg-[var(--color-blue)]'
            )} style={{ top: 2 }} />
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-[var(--color-text-muted)] text-[10px] font-mono w-20 shrink-0">{ev.date}</span>
              <span className="text-[var(--color-text-secondary)] flex-1 truncate">{ev.label}</span>
              {ev.value && <span className="tabular-nums text-[var(--color-text-muted)] shrink-0">{ev.value}</span>}
            </div>
          </div>
        ))}
        {events.length === 0 && <div className="text-[11px] text-[var(--color-text-muted)] py-4">No timeline events</div>}
      </div>
    </div>
  )
}

function ActivityTab() {
  const { data, fmt } = useWorkspace()
  const recentBoq = data.boqItems.slice(0, 8)
  const recentMeasurements = data.measurementItems.slice(0, 8)

  return (
    <div className="h-full overflow-y-auto px-4 py-2 space-y-3">
      <div>
        <div className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Recent BOQ Items</div>
        {recentBoq.map(b => (
          <div key={b.id} className="flex items-center gap-2 text-[11px] py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-blue)]" />
            <span className="font-mono text-[9px] text-[var(--color-text-muted)] w-8">{b.code ?? '—'}</span>
            <span className="flex-1 truncate text-[var(--color-text-secondary)]">{b.description}</span>
            <span className="tabular-nums text-[var(--color-text-muted)] shrink-0">{fmt(b.quantity)} {b.unit}</span>
          </div>
        ))}
      </div>
      <div>
        <div className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Recent Measurements</div>
        {recentMeasurements.map(m => (
          <div key={m.id} className="flex items-center gap-2 text-[11px] py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            <span className="font-mono text-[9px] text-[var(--color-text-muted)] w-8">{m.item_code ?? '—'}</span>
            <span className="flex-1 truncate text-[var(--color-text-secondary)]">{m.description}</span>
            <span className="tabular-nums text-[var(--color-text-muted)] shrink-0">{fmt(m.net_qty)} {m.unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CostTab() {
  const { data, fmt } = useWorkspace()
  const contractValue = data.contract?.contract_value ?? 0
  const totalBoq = data.boqItems.reduce((s, b) => s + (b.total_amount ?? 0), 0)
  const totalSpent = data.costEntries.reduce((s, c) => s + c.amount, 0)
  const totalVariations = data.variations.reduce((s, v) => s + (v.approved_amount ?? v.amount), 0)
  const totalPaid = data.payments.reduce((s, p) => s + p.net_payable, 0)
  const remaining = contractValue - totalSpent

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Contract Value', value: fmt(contractValue), color: 'from-[var(--color-info)] to-[var(--color-info-light)]' },
          { label: 'BOQ Total', value: fmt(totalBoq), color: 'from-indigo-500 to-indigo-600' },
          { label: 'Spent to Date', value: fmt(totalSpent), color: 'from-amber-500 to-amber-600' },
          { label: 'Variations', value: fmt(totalVariations), color: 'from-purple-500 to-purple-600' },
          { label: 'Total Paid', value: fmt(totalPaid), color: 'from-green-500 to-green-600' },
          { label: 'Remaining', value: fmt(remaining), color: remaining >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-[var(--color-danger)] to-[var(--color-danger-light)]' },
        ].map(card => (
          <div key={card.label} className="bg-[var(--color-surface-elevated)] rounded-lg p-2.5 border border-[var(--color-border)]">
            <div className={cn('w-1.5 h-1.5 rounded-full bg-gradient-to-r mb-1.5', card.color)} />
            <div className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider">{card.label}</div>
            <div className="text-[13px] font-bold tabular-nums text-[var(--color-text)] mt-0.5">{card.value}</div>
          </div>
        ))}
      </div>
      {/* Budget bar */}
      {contractValue > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mb-1">
            <span>Budget Utilization</span>
            <span className="tabular-nums">{((totalSpent / contractValue) * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all bg-gradient-to-r',
                totalSpent / contractValue > 0.9 ? 'from-[var(--color-danger)] to-[var(--color-danger-light)]' :
                totalSpent / contractValue > 0.7 ? 'from-amber-500 to-amber-600' :
                'from-[var(--color-info)] to-[var(--color-info-light)]'
              )}
              style={{ width: `${Math.min(100, (totalSpent / contractValue) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function TasksTab() {
  const { data } = useWorkspace()
  const tasks = useMemo(() => {
    const items: { label: string; status: 'done' | 'active' | 'pending'; category: string }[] = []
    if (data.boqItems.length > 0) items.push({ label: 'BOQ setup', status: 'done', category: 'BOQ' })
    else items.push({ label: 'Setup BOQ items', status: 'pending', category: 'BOQ' })
    if (data.measurementItems.length > 0) items.push({ label: 'Measurements recorded', status: 'done', category: 'Measurements' })
    else items.push({ label: 'Record measurements', status: 'pending', category: 'Measurements' })
    if (data.drawings.length > 0) items.push({ label: 'Drawings uploaded', status: 'done', category: 'Drawings' })
    else items.push({ label: 'Upload drawings', status: 'pending', category: 'Drawings' })
    if (data.contract) items.push({ label: 'Contract configured', status: 'done', category: 'Cost' })
    else items.push({ label: 'Setup contract', status: 'pending', category: 'Cost' })
    if (data.rateAnalyses.length > 0) items.push({ label: 'Rate analysis done', status: 'done', category: 'Rates' })
    else items.push({ label: 'Create rate analyses', status: 'pending', category: 'Rates' })
    if (data.payments.length > 0) items.push({ label: 'Payments processed', status: 'done', category: 'Payments' })
    else items.push({ label: 'Process payments', status: 'active', category: 'Payments' })
    return items
  }, [data])

  return (
    <div className="h-full overflow-y-auto px-4 py-2">
      <div className="flex items-center gap-4 mb-3">
        <div className="text-[11px] text-[var(--color-text-muted)]">
          <span className="font-semibold text-[var(--color-text-secondary)]">{tasks.filter(t => t.status === 'done').length}</span> / {tasks.length} completed
        </div>
        <div className="flex-1 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{ width: `${(tasks.filter(t => t.status === 'done').length / tasks.length) * 100}%` }} />
        </div>
      </div>
      {tasks.map((task, i) => (
        <div key={i} className="flex items-center gap-2.5 py-1.5 text-[11px]">
          <div className={cn(
            'w-4 h-4 rounded flex items-center justify-center',
            task.status === 'done' ? 'bg-green-100 dark:bg-green-500/10' :
            task.status === 'active' ? 'bg-[var(--color-blue)]/10' :
            'bg-[var(--color-surface-elevated)]'
          )}>
            {task.status === 'done' ? <CheckCircle size={10} className="text-green-500" /> :
             task.status === 'active' ? <Activity size={10} className="text-[var(--color-blue)]" /> :
             <div className="w-2 h-2 rounded-sm border border-[var(--color-border)]" />}
          </div>
          <span className={cn(
            'flex-1',
            task.status === 'done' ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text-secondary)]'
          )}>{task.label}</span>
          <span className="text-[9px] text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] px-1.5 py-0.5 rounded">{task.category}</span>
        </div>
      ))}
    </div>
  )
}

function EvidenceTab() {
  const { selection, linkedMeasurements, linkedSourceDrawings, linkedCostEntries, linkedPayments, fmt } = useWorkspace()
  const item = selection.boqItem

  if (!item) {
    return (
      <div className="h-full flex items-center justify-center text-[11px] text-[var(--color-text-muted)]">
        Select a BOQ item to see its evidence summary
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-2">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[var(--color-blue)]/5 rounded-lg p-2.5 border border-[var(--color-blue)]/10">
          <div className="text-[8px] text-[var(--color-blue)] uppercase tracking-wider font-bold">Quantity</div>
          <div className="text-[14px] font-bold tabular-nums text-[var(--color-blue)]">{fmt(item.quantity)}</div>
          <div className="text-[9px] text-[var(--color-blue)]">{item.unit}</div>
        </div>
        <div className="bg-cyan-50/80 dark:bg-cyan-500/5 rounded-lg p-2.5 border border-cyan-100 dark:border-cyan-500/10">
          <div className="text-[8px] text-cyan-500 uppercase tracking-wider font-bold">Measurements</div>
          <div className="text-[14px] font-bold tabular-nums text-cyan-700 dark:text-cyan-300">{linkedMeasurements.length}</div>
          <div className="text-[9px] text-cyan-400">{linkedMeasurements.reduce((s, m) => s + (m.lines?.length ?? 0), 0)} lines</div>
        </div>
        <div className="bg-indigo-50/80 dark:bg-indigo-500/5 rounded-lg p-2.5 border border-indigo-100 dark:border-indigo-500/10">
          <div className="text-[8px] text-indigo-500 uppercase tracking-wider font-bold">Drawings</div>
          <div className="text-[14px] font-bold tabular-nums text-indigo-700 dark:text-indigo-300">{linkedSourceDrawings.length}</div>
          <div className="text-[9px] text-indigo-400">source drawings</div>
        </div>
        <div className="bg-emerald-50/80 dark:bg-emerald-500/5 rounded-lg p-2.5 border border-emerald-100 dark:border-emerald-500/10">
          <div className="text-[8px] text-emerald-500 uppercase tracking-wider font-bold">Cost</div>
          <div className="text-[14px] font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{fmt(linkedCostEntries.reduce((s, c) => s + c.amount, 0))}</div>
          <div className="text-[9px] text-emerald-400">{linkedCostEntries.length} entries</div>
        </div>
        <div className="bg-green-50/80 dark:bg-green-500/5 rounded-lg p-2.5 border border-green-100 dark:border-green-500/10">
          <div className="text-[8px] text-green-500 uppercase tracking-wider font-bold">Certified</div>
          <div className="text-[14px] font-bold tabular-nums text-green-700 dark:text-green-300">{fmt(linkedPayments.totalCertified)}</div>
          <div className="text-[9px] text-green-400">{linkedPayments.certs.length} certificates</div>
        </div>
      </div>
    </div>
  )
}

function QuantityHistoryTab() {
  const { data, fmt } = useWorkspace()

  const changes = useMemo(() => {
    return [...data.quantityChanges]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 30)
  }, [data.quantityChanges])

  if (changes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[11px] text-[var(--color-text-muted)]">
        No quantity changes recorded yet
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-2">
      <div className="relative pl-6">
        <div className="absolute start-2 top-0 bottom-0 w-px bg-[var(--color-border)]" />
        {changes.map((qc, i) => {
          const boqItem = data.boqItems.find(b => b.id === qc.boq_item_id)
          return (
            <div key={qc.id} className="relative pb-3">
              <div className={cn(
                'absolute left-[-17px] w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[var(--background)]',
                qc.difference > 0 ? 'bg-green-500' : qc.difference < 0 ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-border)]'
              )} style={{ top: 2 }} />
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-[var(--color-text-muted)] text-[10px] font-mono w-20 shrink-0">{qc.created_at.slice(0, 10)}</span>
                <span className="font-mono text-[9px] text-[var(--color-text-muted)] w-12 shrink-0">{boqItem?.code ?? '—'}</span>
                <span className="text-[var(--color-text-secondary)] flex-1 truncate">{qc.description}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] capitalize">{qc.change_type}</span>
                <span className="tabular-nums text-[var(--color-text-muted)] shrink-0">{fmt(qc.previous_qty)} → {fmt(qc.new_qty)}</span>
                <span className={cn(
                  'tabular-nums font-medium shrink-0',
                  qc.difference > 0 ? 'text-green-600' : qc.difference < 0 ? 'text-red-500' : 'text-[var(--color-text-muted)]'
                )}>
                  {qc.difference > 0 ? '+' : ''}{fmt(qc.difference)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReportsTab({ projectId }: { projectId: string }) {
  const reportTypes = [
    { label: 'BOQ Report', desc: 'Bill of Quantities with rates & totals', icon: BarChart3, href: 'boq' },
    { label: 'Measurement Report', desc: 'Measurement book export', icon: Package, href: 'measurements' },
    { label: 'Cost Report', desc: 'Cost control summary', icon: DollarSign, href: 'cost-control' },
    { label: 'Payment Report', desc: 'Payment certificates', icon: TrendingUp, href: 'payments' },
  ]

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {reportTypes.map(r => (
          <a
            key={r.href}
            href={`/projects/${projectId}/reports`}
            className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-brand)]/40 hover:bg-[var(--color-brand)]/5 transition-all group"
          >
            <r.icon size={16} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-blue)] transition-colors shrink-0" />
            <div>
              <div className="text-[11px] font-medium text-[var(--color-text-secondary)]">{r.label}</div>
              <div className="text-[9px] text-[var(--color-text-muted)]">{r.desc}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
