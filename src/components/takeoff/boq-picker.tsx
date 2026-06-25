'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getBOQItems, createBOQItem } from '@/app/actions/boq'
import { linkDrawingMeasurementsToBOQ } from '@/app/actions/measurements'
import type { BOQItem } from '@/lib/types'
import {
  Search,
  Plus,
  Link2,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Check,
  Unlink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BOQPickerProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  drawingMeasurementIds: string[]
  onLinked: () => void
}

export function BOQPicker({
  isOpen,
  onClose,
  projectId,
  drawingMeasurementIds,
  onLinked,
}: BOQPickerProps) {
  const [boqItems, setBOQItems] = useState<BOQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [newUnit, setNewUnit] = useState('m')
  const [newCode, setNewCode] = useState('')
  const [newSection, setNewSection] = useState('')
  const [linkedId, setLinkedId] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const items = await getBOQItems(projectId)
    setBOQItems(items)
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    if (isOpen) {
      load()
      setSearch('')
      setLinkedId(null)
      setShowCreate(false)
    }
  }, [isOpen, load])

  const filtered = useMemo(() => {
    if (!search.trim()) return boqItems
    const q = search.toLowerCase()
    return boqItems.filter(
      (item) =>
        item.description.toLowerCase().includes(q) ||
        (item.code ?? '').toLowerCase().includes(q) ||
        (item.section ?? '').toLowerCase().includes(q),
    )
  }, [boqItems, search])

  const bySection = useMemo(() => {
    const map: Record<string, BOQItem[]> = {}
    for (const item of filtered) {
      const sec = item.section || 'Unsectioned'
      if (!map[sec]) map[sec] = []
      map[sec].push(item)
    }
    return map
  }, [filtered])

  const handleLink = async (boqItemId: string) => {
    if (drawingMeasurementIds.length === 0) return
    setLinking(boqItemId)
    await linkDrawingMeasurementsToBOQ(boqItemId, drawingMeasurementIds, projectId)
    setLinkedId(boqItemId)
    setLinking(null)
    setTimeout(() => {
      onLinked()
      onClose()
    }, 600)
  }

  const handleCreateAndLink = async () => {
    if (!newDesc.trim()) return
    setCreating(true)
    const result = await createBOQItem({
      project_id: projectId,
      description: newDesc.trim(),
      unit: newUnit,
      code: newCode.trim() || undefined,
      section: newSection.trim() || undefined,
    })
    if (result.data) {
      await linkDrawingMeasurementsToBOQ(result.data.id, drawingMeasurementIds, projectId)
      setLinkedId(result.data.id)
      setCreating(false)
      setTimeout(() => {
        onLinked()
        onClose()
      }, 600)
    } else {
      setCreating(false)
    }
  }

  const measurementLabel =
    drawingMeasurementIds.length === 1
      ? '1 measurement'
      : `${drawingMeasurementIds.length} measurements`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Link to BOQ Item"
      size="md"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Link2 size={14} className="text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Linking <strong>{measurementLabel}</strong> to a BOQ item
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by code, description, or section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
            autoFocus
          />
        </div>

        {/* BOQ items list */}
        <div className="max-h-[340px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400 dark:text-slate-500">
              <FileSpreadsheet
                size={24}
                className="mx-auto mb-2 opacity-50"
              />
              {boqItems.length === 0
                ? 'No BOQ items. Create one below.'
                : 'No items match your search.'}
            </div>
          ) : (
            Object.entries(bySection).map(([section, items]) => {
              const isCollapsed = collapsedSections.has(section)
              return (
                <div key={section}>
                  <button
                    onClick={() =>
                      setCollapsedSections((prev) => {
                        const next = new Set(prev)
                        if (next.has(section)) next.delete(section)
                        else next.add(section)
                        return next
                      })
                    }
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750 border-b border-slate-100 dark:border-slate-700/50 sticky top-0 bg-white dark:bg-slate-800 z-10"
                  >
                    {isCollapsed ? (
                      <ChevronRight size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                    <span>{section}</span>
                    <span className="ml-auto text-[10px]">
                      {items.length} items
                    </span>
                  </button>
                  {!isCollapsed &&
                    items.map((item) => {
                      const isLinked = linkedId === item.id
                      const isLinking = linking === item.id
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleLink(item.id)}
                          disabled={!!linking || !!linkedId}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 text-left border-b border-slate-50 dark:border-slate-700/30 transition-colors',
                            isLinked
                              ? 'bg-emerald-50 dark:bg-emerald-900/20'
                              : isLinking
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : 'hover:bg-blue-50 dark:hover:bg-blue-900/10',
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {item.code && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 dark:text-slate-400">
                                  {item.code}
                                </span>
                              )}
                              <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                                {item.description}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                              <span>
                                {item.quantity?.toFixed(2)} {item.unit}
                              </span>
                              {item.mi_id && (
                                <span className="inline-flex items-center gap-0.5 text-blue-500">
                                  <Link2 size={8} /> linked
                                </span>
                              )}
                              {item.unit_rate != null && item.unit_rate > 0 && (
                                <span>
                                  @{' '}
                                  {item.unit_rate.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0">
                            {isLinked ? (
                              <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 rounded">
                                <Check size={12} /> Linked
                              </span>
                            ) : isLinking ? (
                              <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                            ) : (
                              <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link2 size={10} />
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                </div>
              )
            })
          )}
        </div>

        {/* Create new BOQ item section */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              <Plus size={14} />
              Create New BOQ Item & Link
            </button>
          ) : (
            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  New BOQ Item
                </span>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Code"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. 1.01"
                />
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
                    Unit
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="m">m</option>
                    <option value="m2">m²</option>
                    <option value="m3">m³</option>
                    <option value="nr">nr</option>
                    <option value="kg">kg</option>
                    <option value="ton">ton</option>
                    <option value="lm">lm</option>
                    <option value="ls">ls</option>
                  </select>
                </div>
              </div>
              <Input
                label="Description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Reinforced concrete grade C30"
              />
              <Input
                label="Section"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="e.g. Substructure"
              />
              <Button
                onClick={handleCreateAndLink}
                disabled={!newDesc.trim() || creating}
                className="w-full"
                loading={creating}
              >
                <Plus size={14} />
                Create & Link {measurementLabel}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
