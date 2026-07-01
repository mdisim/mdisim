'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useWorkspace } from './workspace-context'
import {
  FileSpreadsheet, Ruler, BookOpen, GitCompare, FolderOpen,
  ChevronDown, ChevronRight, Search, Hash, Layers, Package,
  ArrowRight, MoreHorizontal, Eye, ImageIcon, Filter,
} from 'lucide-react'

type ExplorerSection = 'boq' | 'drawings' | 'measurements' | 'library' | 'revisions'

const SECTIONS: { key: ExplorerSection; label: string; icon: typeof FileSpreadsheet }[] = [
  { key: 'boq', label: 'BOQ', icon: FileSpreadsheet },
  { key: 'drawings', label: 'Drawings', icon: ImageIcon },
  { key: 'measurements', label: 'Measurements', icon: Ruler },
  { key: 'library', label: 'Library', icon: BookOpen },
  { key: 'revisions', label: 'Revisions', icon: GitCompare },
]

export function LeftPanel() {
  const { data, selection, selectBoqItem, selectDrawing, selectMeasurement, selectLibraryItem, fmt } = useWorkspace()
  const [expanded, setExpanded] = useState<Set<ExplorerSection>>(new Set(['boq']))
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [libraryItems, setLibraryItems] = useState(data.libraryItems)

  const toggle = (key: ExplorerSection) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const filteredBoq = useMemo(() => {
    if (!search) return data.boqItems
    const q = search.toLowerCase()
    return data.boqItems.filter(b =>
      b.description.toLowerCase().includes(q) ||
      b.code?.toLowerCase().includes(q) ||
      b.section?.toLowerCase().includes(q)
    )
  }, [data.boqItems, search])

  const boqSections = useMemo(() => {
    const map = new Map<string, typeof filteredBoq>()
    for (const item of filteredBoq) {
      const sec = item.section || 'Unsorted'
      if (!map.has(sec)) map.set(sec, [])
      map.get(sec)!.push(item)
    }
    return map
  }, [filteredBoq])

  const filteredMeasurements = useMemo(() => {
    if (!search) return data.measurementItems
    const q = search.toLowerCase()
    return data.measurementItems.filter(m =>
      m.description.toLowerCase().includes(q) ||
      m.item_code?.toLowerCase().includes(q)
    )
  }, [data.measurementItems, search])

  const drawingsWithRevisions = useMemo(() => {
    return data.drawings.filter(d => (data.revisions[d.id]?.length ?? 0) > 0)
  }, [data.drawings, data.revisions])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0f1117] overflow-hidden">
      {/* Explorer Header */}
      <div className="px-3 py-2.5 border-b border-slate-200/60 dark:border-white/[0.04]">
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen size={13} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.08em]">Explorer</span>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter..."
            className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] rounded-lg text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {SECTIONS.map(sec => (
          <div key={sec.key}>
            {/* Section header */}
            <button
              onClick={() => toggle(sec.key)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
            >
              {expanded.has(sec.key)
                ? <ChevronDown size={12} className="text-slate-400 shrink-0" />
                : <ChevronRight size={12} className="text-slate-400 shrink-0" />
              }
              <sec.icon size={13} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex-1 text-left">{sec.label}</span>
              <span className="text-[10px] tabular-nums text-slate-400 bg-slate-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                {sec.key === 'boq' ? data.boqItems.length
                  : sec.key === 'drawings' ? data.drawings.length
                  : sec.key === 'measurements' ? data.measurementItems.length
                  : sec.key === 'library' ? data.categories.length
                  : drawingsWithRevisions.length}
              </span>
            </button>

            {/* Section content */}
            <AnimatePresence>
              {expanded.has(sec.key) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  {/* BOQ */}
                  {sec.key === 'boq' && (
                    <div className="pb-1">
                      {Array.from(boqSections.entries()).map(([section, items]) => (
                        <div key={section}>
                          <div className="px-3 py-1 flex items-center gap-1.5">
                            <Package size={10} className="text-slate-300 dark:text-slate-600" />
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{section}</span>
                          </div>
                          {items.map(item => (
                            <button
                              key={item.id}
                              onClick={() => selectBoqItem(selection.boqItem?.id === item.id ? null : item)}
                              className={cn(
                                'w-full text-left pl-7 pr-3 py-1.5 flex items-center gap-2 transition-all text-[11px] group',
                                selection.boqItem?.id === item.id
                                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-s-2 border-blue-500 ps-[26px]'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                              )}
                            >
                              <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 w-8 shrink-0">{item.code ?? '—'}</span>
                              <span className="truncate flex-1">{item.description}</span>
                              <span className="tabular-nums text-[10px] text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">{fmt(item.quantity)}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                      {filteredBoq.length === 0 && (
                        <div className="px-7 py-3 text-[10px] text-slate-400 italic">No items match</div>
                      )}
                    </div>
                  )}

                  {/* Drawings */}
                  {sec.key === 'drawings' && (
                    <div className="pb-1">
                      {data.drawings.map(d => (
                        <button
                          key={d.id}
                          onClick={() => selectDrawing(selection.drawing?.id === d.id ? null : d)}
                          className={cn(
                            'w-full text-left pl-7 pr-3 py-1.5 flex items-center gap-2 transition-all text-[11px] group',
                            selection.drawing?.id === d.id
                              ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-s-2 border-indigo-500 ps-[26px]'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                          )}
                        >
                          <ImageIcon size={11} className="text-slate-400 shrink-0" />
                          <span className="truncate flex-1">{d.drawing_number ?? d.name}</span>
                          <span className="text-[9px] text-slate-400 shrink-0 uppercase">{d.file_type}</span>
                        </button>
                      ))}
                      {data.drawings.length === 0 && (
                        <div className="px-7 py-3 text-[10px] text-slate-400 italic">No drawings uploaded</div>
                      )}
                    </div>
                  )}

                  {/* Measurements */}
                  {sec.key === 'measurements' && (
                    <div className="pb-1">
                      {filteredMeasurements.map(m => (
                        <button
                          key={m.id}
                          onClick={() => selectMeasurement(selection.measurement?.id === m.id ? null : m)}
                          className={cn(
                            'w-full text-left pl-7 pr-3 py-1.5 flex items-center gap-2 transition-all text-[11px] group',
                            selection.measurement?.id === m.id
                              ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-s-2 border-cyan-500 ps-[26px]'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                          )}
                        >
                          <span className="font-mono text-[9px] text-slate-400 w-8 shrink-0">{m.item_code ?? '—'}</span>
                          <span className="truncate flex-1">{m.description}</span>
                          <span className="tabular-nums text-[10px] text-slate-400 shrink-0">{fmt(m.net_qty)}</span>
                        </button>
                      ))}
                      {filteredMeasurements.length === 0 && (
                        <div className="px-7 py-3 text-[10px] text-slate-400 italic">No measurements</div>
                      )}
                    </div>
                  )}

                  {/* Library */}
                  {sec.key === 'library' && (
                    <div className="pb-1">
                      {data.categories.map(cat => (
                        <div key={cat.id}>
                          <button
                            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                            className="w-full text-left pl-7 pr-3 py-1.5 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                          >
                            {selectedCategory === cat.id ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                            <span className="truncate">{cat.name}</span>
                          </button>
                          {selectedCategory === cat.id && (
                            <div className="pl-10">
                              {data.libraryItems.filter(i => i.category_id === cat.id).map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => selectLibraryItem(selection.libraryItem?.id === item.id ? null : item)}
                                  className={cn(
                                    'w-full text-left px-3 py-1 text-[10px] transition-colors',
                                    selection.libraryItem?.id === item.id
                                      ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10'
                                      : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                  )}
                                >
                                  {item.description}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {data.categories.length === 0 && (
                        <div className="px-7 py-3 text-[10px] text-slate-400 italic">No categories</div>
                      )}
                    </div>
                  )}

                  {/* Revisions */}
                  {sec.key === 'revisions' && (
                    <div className="pb-1">
                      {drawingsWithRevisions.map(d => (
                        <div key={d.id} className="pl-7 pr-3 py-1.5">
                          <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                            <Eye size={10} className="text-slate-400" />
                            <span className="font-medium truncate">{d.name}</span>
                          </div>
                          <div className="pl-4 space-y-0.5">
                            {(data.revisions[d.id] ?? []).map(rev => (
                              <div key={rev.id} className="flex items-center gap-2 text-[10px] text-slate-500">
                                <div className={cn(
                                  'w-1.5 h-1.5 rounded-full',
                                  rev.status === 'current' ? 'bg-green-500' : rev.status === 'draft' ? 'bg-amber-500' : 'bg-slate-400'
                                )} />
                                <span className="font-mono">Rev {rev.revision_number}</span>
                                <span className="text-slate-400">{rev.revision_date}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {drawingsWithRevisions.length === 0 && (
                        <div className="px-7 py-3 text-[10px] text-slate-400 italic">No revisions</div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}
