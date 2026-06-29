'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

import { getBOQItems } from '@/app/actions/boq'
import { getDrawings } from '@/app/actions/drawings'
import { getMeasurementItems } from '@/app/actions/measurements'
import { getLibraryCategories, getLibraryItems } from '@/app/actions/library'
import { getContract, getCostEntries } from '@/app/actions/cost-control'

import type { BOQItem, Drawing, MeasurementItem, LibraryCategory, LibraryItem, Contract, CostEntry } from '@/lib/types'

import {
  FileSpreadsheet,
  ImageIcon,
  Ruler,
  Calculator,
  BookOpen,
  PenTool,
  Bot,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Layers,
  Eye,
  ArrowRight,
  Sparkles,
  Info,
  GripVertical,
  PanelLeftClose,
  PanelRightClose,
  LayoutPanelLeft,
} from 'lucide-react'

type BottomTab = 'assistant' | 'timeline' | 'cost'
type ActivePanel = 'boq' | 'drawing' | 'properties' | 'measurements' | 'calculations' | 'library' | 'sketch'

interface PanelState {
  collapsed: boolean
  maximized: boolean
}

export default function WorkspacePage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { t } = useI18n()

  const [loading, setLoading] = useState(true)
  const [boqItems, setBoqItems] = useState<BOQItem[]>([])
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [measurementItems, setMeasurementItems] = useState<MeasurementItem[]>([])
  const [categories, setCategories] = useState<LibraryCategory[]>([])
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [contract, setContract] = useState<Contract | null>(null)
  const [costEntries, setCostEntries] = useState<CostEntry[]>([])

  const [selectedBoqItem, setSelectedBoqItem] = useState<BOQItem | null>(null)
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [bottomTab, setBottomTab] = useState<BottomTab>('assistant')
  const [bottomExpanded, setBottomExpanded] = useState(true)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [boq, dwgs, meas, cats, contr, costs] = await Promise.all([
        getBOQItems(projectId),
        getDrawings(projectId),
        getMeasurementItems(projectId),
        getLibraryCategories(),
        getContract(projectId).catch(() => null),
        getCostEntries(projectId).catch(() => []),
      ])
      setBoqItems(boq)
      setDrawings(dwgs)
      setMeasurementItems(meas)
      setCategories(cats)
      setContract(contr)
      setCostEntries(costs)
      if (dwgs.length > 0) setSelectedDrawing(dwgs[0])
      if (cats.length > 0) {
        setSelectedCategory(cats[0].id)
        const items = await getLibraryItems(cats[0].id)
        setLibraryItems(items)
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selectedCategory) {
      getLibraryItems(selectedCategory).then(setLibraryItems).catch(() => {})
    }
  }, [selectedCategory])

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const totalBoqAmount = useMemo(() => boqItems.reduce((s, b) => s + (b.total_amount ?? 0), 0), [boqItems])
  const totalMeasured = useMemo(() => measurementItems.reduce((s, m) => s + m.net_qty, 0), [measurementItems])
  const totalSpent = useMemo(() => costEntries.reduce((s, c) => s + c.amount, 0), [costEntries])

  const linkedMeasurements = useMemo(() => {
    if (!selectedBoqItem) return []
    return measurementItems.filter(m => m.item_code === selectedBoqItem.code)
  }, [selectedBoqItem, measurementItems])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Workspace Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <LayoutPanelLeft size={16} />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Intelligent Workspace</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium">BETA</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={leftCollapsed ? 'Show left panels' : 'Hide left panels'}
          >
            <PanelLeftClose size={14} />
          </button>
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={rightCollapsed ? 'Show right panels' : 'Hide right panels'}
          >
            <PanelRightClose size={14} />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* ───── LEFT COLUMN ───── */}
        <AnimatePresence>
        {!leftCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col border-r border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 overflow-hidden shrink-0"
          >
            {/* BOQ Panel */}
            <div className="flex-1 flex flex-col overflow-hidden border-b border-slate-200 dark:border-slate-700/60">
              <PanelHeader icon={FileSpreadsheet} title={t.boq.title} count={boqItems.length} color="blue" />
              <div className="flex-1 overflow-y-auto">
                {boqItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No BOQ items</div>
                ) : (
                  boqItems.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedBoqItem(item)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
                        selectedBoqItem?.id === item.id && 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400 w-10 shrink-0">{item.code ?? `#${i+1}`}</span>
                        <span className="truncate text-slate-700 dark:text-slate-200">{item.description}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 ml-12">
                        <span className="text-slate-400">{fmt(item.quantity)} {item.unit}</span>
                        {item.total_amount != null && (
                          <span className="tabular-nums font-medium text-slate-600 dark:text-slate-300">{fmt(item.total_amount)}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Measurements Panel */}
            <div className="flex-1 flex flex-col overflow-hidden border-b border-slate-200 dark:border-slate-700/60">
              <PanelHeader icon={Ruler} title={t.measurements.title} count={measurementItems.length} color="cyan" />
              <div className="flex-1 overflow-y-auto">
                {linkedMeasurements.length > 0 ? (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10">
                      Linked to: {selectedBoqItem?.description}
                    </div>
                    {linkedMeasurements.map(m => (
                      <div key={m.id} className="px-3 py-2 text-xs border-b border-slate-100 dark:border-slate-800">
                        <div className="font-medium text-slate-700 dark:text-slate-200">{m.description}</div>
                        <div className="text-slate-400 mt-0.5">
                          {m.measurement_type} · Net: {fmt(m.net_qty)} {m.unit} · {m.lines?.length ?? 0} lines
                        </div>
                      </div>
                    ))}
                  </>
                ) : measurementItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No measurements</div>
                ) : (
                  measurementItems.slice(0, 50).map(m => (
                    <div key={m.id} className="px-3 py-2 text-xs border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400 w-10 shrink-0">{m.item_code ?? '-'}</span>
                        <span className="truncate text-slate-700 dark:text-slate-200">{m.description}</span>
                      </div>
                      <div className="text-slate-400 mt-0.5 ml-12">
                        Net: {fmt(m.net_qty)} {m.unit}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Library Panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <PanelHeader icon={BookOpen} title={t.library.title} count={categories.length} color="teal" />
              <div className="flex-1 overflow-y-auto">
                <div className="flex gap-1 px-2 py-1.5 overflow-x-auto">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        'px-2 py-1 text-[10px] font-medium rounded-md whitespace-nowrap transition-colors',
                        selectedCategory === cat.id
                          ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                {libraryItems.map(item => (
                  <div key={item.id} className="px-3 py-1.5 text-xs border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-200 truncate">{item.description}</span>
                      <span className="tabular-nums text-slate-500 shrink-0 ml-2">{item.default_rate != null ? fmt(item.default_rate) : '-'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{item.code ?? '-'} · {item.unit}</div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400">No library categories</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* ───── CENTER COLUMN: Drawing / Sketch ───── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Drawing Viewer */}
          <div className="flex-[2] flex flex-col overflow-hidden border-b border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon size={14} className="text-indigo-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Drawing / PDF / CAD</span>
                {selectedDrawing && (
                  <span className="text-[10px] text-slate-400 ml-1">{selectedDrawing.name}</span>
                )}
              </div>
              <div className="flex items-center gap-1 overflow-x-auto">
                {drawings.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDrawing(d)}
                    className={cn(
                      'px-2 py-1 text-[10px] font-medium rounded-md whitespace-nowrap transition-colors',
                      selectedDrawing?.id === d.id
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    {d.drawing_number ?? d.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
              {selectedDrawing ? (
                <div className="text-center">
                  <div className="w-full max-w-lg mx-auto p-8">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30 flex items-center justify-center">
                      <ImageIcon size={36} className="text-indigo-500" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{selectedDrawing.name}</h3>
                    <p className="text-xs text-slate-500 mb-1">
                      {selectedDrawing.drawing_number && <span className="font-mono">{selectedDrawing.drawing_number} · </span>}
                      {selectedDrawing.drawing_type} · Rev {selectedDrawing.revision_number ?? '-'}
                    </p>
                    <p className="text-[10px] text-slate-400 mb-4">
                      {selectedDrawing.file_type?.toUpperCase()} · {selectedDrawing.file_size ? `${(selectedDrawing.file_size / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
                    </p>
                    <a
                      href={`/projects/${projectId}/drawings/${selectedDrawing.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      <Eye size={12} />
                      Open Full Viewer
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-400">
                  <ImageIcon size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No drawings uploaded</p>
                </div>
              )}
            </div>
          </div>

          {/* Sketch Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <PanelHeader icon={PenTool} title="Sketch" color="amber" />
            <div className="flex-1 bg-white dark:bg-slate-900 flex items-center justify-center">
              <SketchCanvas />
            </div>
          </div>
        </div>

        {/* ───── RIGHT COLUMN ───── */}
        <AnimatePresence>
        {!rightCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col border-l border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 overflow-hidden shrink-0"
          >
            {/* Properties Panel */}
            <div className="flex-1 flex flex-col overflow-hidden border-b border-slate-200 dark:border-slate-700/60">
              <PanelHeader icon={Info} title="Properties" color="purple" />
              <div className="flex-1 overflow-y-auto p-3">
                {selectedBoqItem ? (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">BOQ Item Properties</div>
                    <PropRow label="Code" value={selectedBoqItem.code ?? '-'} />
                    <PropRow label="Description" value={selectedBoqItem.description} />
                    <PropRow label="Section" value={selectedBoqItem.section ?? '-'} />
                    <PropRow label="Unit" value={selectedBoqItem.unit} />
                    <PropRow label="Quantity" value={fmt(selectedBoqItem.quantity)} />
                    <PropRow label="Unit Rate" value={selectedBoqItem.unit_rate != null ? fmt(selectedBoqItem.unit_rate) : '-'} />
                    <PropRow label="Total" value={selectedBoqItem.total_amount != null ? fmt(selectedBoqItem.total_amount) : '-'} />
                    {selectedBoqItem.original_quantity != null && (
                      <PropRow label="Original Qty" value={fmt(selectedBoqItem.original_quantity)} />
                    )}
                    {selectedBoqItem.revised_quantity != null && (
                      <PropRow label="Revised Qty" value={fmt(selectedBoqItem.revised_quantity)} />
                    )}
                  </div>
                ) : selectedDrawing ? (
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Drawing Properties</div>
                    <PropRow label="Name" value={selectedDrawing.name} />
                    <PropRow label="Number" value={selectedDrawing.drawing_number ?? '-'} />
                    <PropRow label="Type" value={selectedDrawing.drawing_type} />
                    <PropRow label="Revision" value={selectedDrawing.revision_number ?? '-'} />
                    <PropRow label="File Type" value={selectedDrawing.file_type ?? '-'} />
                    <PropRow label="Size" value={selectedDrawing.file_size ? `${(selectedDrawing.file_size / 1024 / 1024).toFixed(1)} MB` : '-'} />
                  </div>
                ) : (
                  <div className="text-center text-xs text-slate-400 py-8">
                    Select a BOQ item or drawing to view properties
                  </div>
                )}
              </div>
            </div>

            {/* Calculations Panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <PanelHeader icon={Calculator} title="Calculations" color="orange" />
              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-3">
                  <CalcRow label="BOQ Items" value={String(boqItems.length)} />
                  <CalcRow label="Total BOQ Amount" value={fmt(totalBoqAmount)} highlight />
                  <div className="h-px bg-slate-100 dark:bg-slate-800" />
                  <CalcRow label="Measurement Items" value={String(measurementItems.length)} />
                  <CalcRow label="Total Measured" value={fmt(totalMeasured)} />
                  <div className="h-px bg-slate-100 dark:bg-slate-800" />
                  <CalcRow label="Contract Value" value={contract ? fmt(contract.contract_value) : '-'} />
                  <CalcRow label="Total Spent" value={fmt(totalSpent)} />
                  <CalcRow label="Remaining" value={contract ? fmt(contract.contract_value - totalSpent) : '-'} highlight />
                </div>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* ───── BOTTOM BAR ───── */}
      <div className={cn(
        'border-t border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 transition-all',
        bottomExpanded ? 'h-48' : 'h-9'
      )}>
        {/* Tab bar */}
        <div className="flex items-center justify-between px-2 h-9 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-0.5">
            {([
              { key: 'assistant' as const, icon: Bot, label: 'AI Assistant', color: 'text-violet-500' },
              { key: 'timeline' as const, icon: Clock, label: 'Timeline', color: 'text-blue-500' },
              { key: 'cost' as const, icon: DollarSign, label: 'Cost Summary', color: 'text-emerald-500' },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => { setBottomTab(tab.key); setBottomExpanded(true) }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors',
                  bottomTab === tab.key && bottomExpanded
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                <tab.icon size={12} className={tab.color} />
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setBottomExpanded(!bottomExpanded)}
            className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {bottomExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>

        {/* Tab content */}
        {bottomExpanded && (
          <div className="flex-1 overflow-y-auto p-3 h-[calc(100%-36px)]">
            {bottomTab === 'assistant' && (
              <div className="flex items-center gap-3 h-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">AI Engineering Assistant</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Use the copilot button in the sidebar for full AI assistant capabilities. Context-aware suggestions based on your current workspace selection.
                  </p>
                </div>
              </div>
            )}

            {bottomTab === 'timeline' && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">Recent Activity</div>
                {boqItems.slice(0, 5).map((item, i) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-slate-500">{item.code ?? `#${i+1}`}</span>
                    <span className="text-slate-700 dark:text-slate-200 truncate">{item.description}</span>
                    <span className="ml-auto tabular-nums text-slate-400 shrink-0">{fmt(item.quantity)} {item.unit}</span>
                  </div>
                ))}
                {measurementItems.slice(0, 5).map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                    <span className="text-slate-500">{m.item_code ?? '-'}</span>
                    <span className="text-slate-700 dark:text-slate-200 truncate">{m.description}</span>
                    <span className="ml-auto tabular-nums text-slate-400 shrink-0">{fmt(m.net_qty)} {m.unit}</span>
                  </div>
                ))}
              </div>
            )}

            {bottomTab === 'cost' && (
              <div className="grid grid-cols-4 gap-4">
                <CostCard label="Contract Value" value={contract ? fmt(contract.contract_value) : '-'} color="blue" />
                <CostCard label="Total BOQ" value={fmt(totalBoqAmount)} color="indigo" />
                <CostCard label="Spent to Date" value={fmt(totalSpent)} color="amber" />
                <CostCard label="Remaining" value={contract ? fmt(contract.contract_value - totalSpent) : '-'} color="emerald" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PanelHeader({ icon: Icon, title, count, color }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  count?: number
  color: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-500',
    cyan: 'text-cyan-500',
    teal: 'text-teal-500',
    indigo: 'text-indigo-500',
    purple: 'text-purple-500',
    orange: 'text-orange-500',
    amber: 'text-amber-500',
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 shrink-0">
      <Icon size={13} className={colorMap[color] ?? 'text-slate-500'} />
      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{title}</span>
      {count != null && (
        <span className="ml-auto text-[10px] tabular-nums text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  )
}

function PropRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-slate-400 w-20 shrink-0">{label}</span>
      <span className="text-slate-700 dark:text-slate-200 break-words">{value}</span>
    </div>
  )
}

function CalcRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={cn('tabular-nums font-medium', highlight ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200')}>{value}</span>
    </div>
  )
}

function CostCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    indigo: 'from-indigo-500 to-indigo-600',
    amber: 'from-amber-500 to-amber-600',
    emerald: 'from-emerald-500 to-emerald-600',
  }
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
      <div className={cn('w-1.5 h-1.5 rounded-full bg-gradient-to-r mb-1.5', colorMap[color])} />
      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-white mt-0.5">{value}</div>
    </div>
  )
}

function SketchCanvas() {
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([])
  const [drawing, setDrawing] = useState(false)
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setDrawing(true)
    setStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawing || !start) return
    const rect = e.currentTarget.getBoundingClientRect()
    const end = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    if (Math.abs(end.x - start.x) > 5 || Math.abs(end.y - start.y) > 5) {
      setLines(prev => [...prev, { x1: start.x, y1: start.y, x2: end.x, y2: end.y }])
    }
    setDrawing(false)
    setStart(null)
  }

  return (
    <div className="w-full h-full relative">
      {lines.length === 0 && !drawing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <PenTool size={24} className="mx-auto text-amber-400/40 mb-1" />
            <p className="text-[10px] text-slate-400">Click and drag to sketch</p>
          </div>
        </div>
      )}
      <svg
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {lines.map((line, i) => (
          <line
            key={i}
            x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
            stroke="currentColor"
            strokeWidth={2}
            className="text-slate-500 dark:text-slate-400"
          />
        ))}
      </svg>
    </div>
  )
}
