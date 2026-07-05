'use client'

import { cn } from '@/lib/utils'
import type { MeasurementItem, MeasurementLine, MeasurementType, Drawing } from '@/lib/types'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  Copy,
  MoreHorizontal,
  Paperclip,
  GitBranch,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ── Helpers ─────────────────────────────────────────────────────────────

function formatQty(n: number): string {
  if (n === 0) return '0.00'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

function calcQuantity(
  type: MeasurementType,
  nr: number,
  l?: number,
  w?: number,
  h?: number,
  formula?: string,
): number {
  switch (type) {
    case 'count':
      return nr
    case 'length':
      return nr * (l ?? 0)
    case 'area':
      return nr * (l ?? 0) * (w ?? 0)
    case 'volume':
      return nr * (l ?? 0) * (w ?? 0) * (h ?? 0)
    case 'weight':
      // formula holds unit weight
      return nr * (l ?? 0) * (formula ? parseFloat(formula) || 0 : 0)
    case 'formula': {
      if (!formula) return 0
      try {
        // very basic: replace common tokens then eval
        const expr = formula
          .replace(/nr/gi, String(nr))
          .replace(/l/gi, String(l ?? 0))
          .replace(/w/gi, String(w ?? 0))
          .replace(/h/gi, String(h ?? 0))
        const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, '')
        if (!sanitized) return 0
        const result = Function(`"use strict"; return (${sanitized})`)()
        return typeof result === 'number' && isFinite(result) ? result : 0
      } catch {
        return 0
      }
    }
    default:
      return 0
  }
}

/** Which dimension columns are active for a measurement type */
function activeCols(type: MeasurementType) {
  return {
    nr: type !== 'formula',
    length: type === 'length' || type === 'area' || type === 'volume' || type === 'weight',
    width: type === 'area' || type === 'volume',
    height: type === 'volume',
    formula: type === 'weight' || type === 'formula',
  }
}

// ── Props ───────────────────────────────────────────────────────────────

interface MeasurementGridProps {
  items: MeasurementItem[]
  onUpdateItem: (id: string, fields: Partial<MeasurementItem>) => Promise<void>
  onUpdateLine: (id: string, fields: Record<string, unknown>) => Promise<void>
  onAddItem: () => void
  onAddLine: (itemId: string, isDeduction?: boolean) => Promise<void>
  onDeleteItem: (id: string) => Promise<void>
  onAttachments?: (id: string) => void
  onDeleteLine: (id: string) => Promise<void>
  onDuplicateLine: (id: string) => Promise<void>
  selectedItems: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  drawingsById?: Record<string, Drawing>
}

// ── Cell key for navigation ─────────────────────────────────────────────

type CellKey = `${string}:${string}` // lineId:field

// ── Component ───────────────────────────────────────────────────────────

export function MeasurementGrid({
  items,
  onUpdateItem,
  onUpdateLine,
  onAddItem,
  onAddLine,
  onDeleteItem,
  onDeleteLine,
  onDuplicateLine,
  selectedItems,
  onToggleSelect,
  onSelectAll,
  onAttachments,
  drawingsById = {},
}: MeasurementGridProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set(items.map((i) => i.id)))
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<CellKey | null>(null)
  const [editValue, setEditValue] = useState('')
  const [lineMenu, setLineMenu] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Group items by section
  const sections = useMemo(() => {
    const map = new Map<string, MeasurementItem[]>()
    for (const item of items) {
      const sec = item.section || 'Unsectioned'
      if (!map.has(sec)) map.set(sec, [])
      map.get(sec)!.push(item)
    }
    return map
  }, [items])

  useEffect(() => {
    if (expandedSections.size === 0 && sections.size > 0) {
      setExpandedSections(new Set(sections.keys()))
    }
  }, [sections, expandedSections.size])

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      next.has(sec) ? next.delete(sec) : next.add(sec)
      return next
    })
  }

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Inline editing ──────────────────────────────────────────────────

  const startEdit = useCallback((cellKey: CellKey, currentValue: string | number | null) => {
    setEditingCell(cellKey)
    setEditValue(currentValue != null ? String(currentValue) : '')
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [])

  const commitEdit = useCallback(
    async (cellKey: CellKey) => {
      if (!cellKey) return
      const [id, field] = cellKey.split(':') as [string, string]

      // Determine if this is an item field or a line field
      const isItemField = ['item_code', 'description', 'unit', 'measurement_type'].includes(field)

      const numericFields = ['nr', 'length', 'width', 'height']
      const value = numericFields.includes(field) ? (editValue === '' ? null : parseFloat(editValue)) : editValue

      if (isItemField) {
        await onUpdateItem(id, { [field]: value } as Partial<MeasurementItem>)
      } else {
        await onUpdateLine(id, { [field]: value })
      }
      setEditingCell(null)
    },
    [editValue, onUpdateItem, onUpdateLine],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, cellKey: CellKey) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commitEdit(cellKey)
      } else if (e.key === 'Escape') {
        setEditingCell(null)
      } else if (e.key === 'Tab') {
        e.preventDefault()
        commitEdit(cellKey)
        // Tab navigation could be expanded here
      }
    },
    [commitEdit],
  )

  const renderEditableCell = (
    cellKey: CellKey,
    value: string | number | null,
    isActive: boolean,
    isDeduction: boolean,
    inputType: 'text' | 'number' = 'text',
    width?: string,
  ) => {
    const isEditing = editingCell === cellKey

    if (!isActive) {
      return (
        <td className="px-2 py-1.5 bg-[var(--color-surface-elevated)] dark:bg-[var(--color-surface)] text-[var(--color-text-secondary)] text-center text-xs select-none border-r border-[var(--color-border)] dark:border-[var(--color-border)]">
          &mdash;
        </td>
      )
    }

    if (isEditing) {
      return (
        <td className="px-0 py-0 border-r border-[var(--color-border)] dark:border-[var(--color-border)]">
          <input
            ref={inputRef}
            type={inputType}
            step="any"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => commitEdit(cellKey)}
            onKeyDown={(e) => handleKeyDown(e, cellKey)}
            className={cn(
              'w-full h-full px-2 py-1.5 text-xs border-2 border-[var(--color-amber)] ring-1 ring-blue-500 outline-none bg-white dark:bg-[var(--color-surface-elevated)]',
              inputType === 'number' && 'text-end',
            )}
            style={width ? { minWidth: width } : undefined}
          />
        </td>
      )
    }

    const displayValue = value != null && value !== '' ? (typeof value === 'number' ? formatQty(value) : value) : ''

    return (
      <td
        className={cn(
          'px-2 py-1.5 text-xs cursor-pointer border-r border-[var(--color-border)] dark:border-[var(--color-border)] hover:bg-[var(--color-info-bg)]/50 dark:hover:bg-[var(--color-info-bg)]/20 transition-colors',
          inputType === 'number' && 'text-end tabular-nums',
          isDeduction && typeof value === 'number' && 'text-red-600',
        )}
        onClick={() => startEdit(cellKey, value)}
      >
        {displayValue || <span className="text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)]">&nbsp;</span>}
      </td>
    )
  }

  // ── Grand totals ──────────────────────────────────────────────────

  const grandTotal = useMemo(() => {
    let additions = 0
    let deductions = 0
    for (const item of items) {
      additions += item.additions_qty ?? 0
      deductions += item.deductions_qty ?? 0
    }
    return { additions, deductions, net: additions - deductions }
  }, [items])

  // ── Render ────────────────────────────────────────────────────────

  const allSelected = items.length > 0 && items.every((i) => selectedItems.has(i.id))

  return (
    <div className="border border-[var(--color-border)] dark:border-[var(--color-border)] rounded-lg overflow-hidden bg-white dark:bg-[var(--color-surface-elevated)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--color-surface-elevated)] dark:bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] dark:border-[var(--color-border)] text-xs font-semibold text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)] uppercase tracking-wider">
              <th className="w-8 px-2 py-2.5 border-r border-[var(--color-border)] dark:border-[var(--color-border)]">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="rounded border-[var(--color-border)] text-[var(--color-info)] focus:ring-[var(--color-amber)]"
                />
              </th>
              <th className="w-8 px-2 py-2.5 border-r border-[var(--color-border)] dark:border-[var(--color-border)]" />
              <th className="w-8 px-2 py-2.5 border-r border-[var(--color-border)] text-center">+/−</th>
              <th className="px-2 py-2.5 border-r border-[var(--color-border)] min-w-[80px]">Code</th>
              <th className="px-2 py-2.5 border-r border-[var(--color-border)] min-w-[200px]">Description</th>
              <th className="px-2 py-2.5 border-r border-[var(--color-border)] w-16 text-center">Type</th>
              <th className="px-2 py-2.5 border-r border-[var(--color-border)] w-14 text-center">Unit</th>
              <th className="px-2 py-2.5 border-r border-[var(--color-border)] w-16 text-end">Nr</th>
              <th className="px-2 py-2.5 border-r border-[var(--color-border)] w-20 text-end">Length</th>
              <th className="px-2 py-2.5 border-r border-[var(--color-border)] w-20 text-end">Width</th>
              <th className="px-2 py-2.5 border-r border-[var(--color-border)] w-20 text-end">Height</th>
              <th className="px-2 py-2.5 border-r border-[var(--color-border)] w-24">Formula</th>
              <th className="px-2 py-2.5 border-r border-[var(--color-border)] w-32">Source</th>
              <th className="px-2 py-2.5 border-r border-[var(--color-border)] w-24 text-end">Quantity</th>
              <th className="px-2 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {Array.from(sections.entries()).map(([sectionName, sectionItems]) => {
              const sectionExpanded = expandedSections.has(sectionName)
              const sectionAdditions = sectionItems.reduce((s, i) => s + (i.additions_qty ?? 0), 0)
              const sectionDeductions = sectionItems.reduce((s, i) => s + (i.deductions_qty ?? 0), 0)
              const sectionNet = sectionAdditions - sectionDeductions

              return (
                <SectionGroup key={sectionName}>
                  {/* Section header */}
                  <tr
                    className="bg-[var(--color-surface-elevated)] text-white cursor-pointer select-none"
                    onClick={() => toggleSection(sectionName)}
                  >
                    <td colSpan={2} className="px-2 py-2">
                      {sectionExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td colSpan={11} className="px-2 py-2 text-xs font-bold uppercase tracking-wide">
                      {sectionName}
                    </td>
                    <td className="px-2 py-2 text-xs text-end font-medium tabular-nums">
                      {formatQty(sectionNet)}
                    </td>
                    <td />
                  </tr>

                  {sectionExpanded &&
                    sectionItems.map((item) => {
                      const itemExpanded = expandedItems.has(item.id)
                      const cols = activeCols(item.measurement_type)
                      const lines = item.lines ?? []
                      const itemAdditions = item.additions_qty ?? 0
                      const itemDeductions = item.deductions_qty ?? 0
                      const itemNet = item.net_qty

                      return (
                        <ItemGroup key={item.id}>
                          {/* Item row */}
                          <tr
                            className={cn(
                              'bg-[var(--color-info-bg)] font-semibold border-l-4 border-l-blue-500 border-b border-[var(--color-border)] dark:border-[var(--color-border)]',
                              'hover:bg-[var(--color-info-bg)]/70 dark:hover:bg-[var(--color-info-bg)]/30 transition-colors',
                            )}
                          >
                            <td className="px-2 py-2 border-r border-[var(--color-border)] dark:border-[var(--color-border)]">
                              <input
                                type="checkbox"
                                checked={selectedItems.has(item.id)}
                                onChange={() => onToggleSelect(item.id)}
                                className="rounded border-[var(--color-border)] text-[var(--color-info)] focus:ring-[var(--color-amber)]"
                              />
                            </td>
                            <td
                              className="px-2 py-2 border-r border-[var(--color-border)] cursor-pointer"
                              onClick={() => toggleItem(item.id)}
                            >
                              {itemExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </td>
                            <td className="px-2 py-2 border-r border-[var(--color-border)] dark:border-[var(--color-border)]" />
                            {renderEditableCell(`${item.id}:item_code`, item.item_code, true, false, 'text')}
                            {renderEditableCell(`${item.id}:description`, item.description, true, false, 'text')}
                            <td className="px-2 py-2 border-r border-[var(--color-border)] text-xs text-center text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
                              {item.measurement_type}
                            </td>
                            <td className="px-2 py-2 border-r border-[var(--color-border)] text-xs text-center text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
                              {item.unit}
                            </td>
                            {/* Empty dimension cells for item row */}
                            <td colSpan={6} className="border-r border-[var(--color-border)] dark:border-[var(--color-border)]" />
                            <td className="px-2 py-2 border-r border-[var(--color-border)] text-xs text-end font-bold tabular-nums">
                              {formatQty(itemNet)}
                            </td>
                            <td className="px-2 py-1 text-center">
                              <div className="flex items-center gap-0.5">
                                {onAttachments && (
                                  <button
                                    onClick={() => onAttachments(item.id)}
                                    className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-amber)] transition-colors"
                                    title="Attachments"
                                  >
                                    <Paperclip size={13} />
                                  </button>
                                )}
                                <button
                                  onClick={() => onDeleteItem(item.id)}
                                  className="p-1 text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                                  title="Delete item"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Lines */}
                          {itemExpanded &&
                            lines.map((line) => {
                              const previewQty = calcQuantity(
                                item.measurement_type,
                                line.nr ?? 0,
                                line.length ?? undefined,
                                line.width ?? undefined,
                                line.height ?? undefined,
                                line.formula ?? undefined,
                              )

                              return (
                                <tr
                                  key={line.id}
                                  className={cn(
                                    'border-b border-[var(--color-border)] dark:border-[var(--color-border)] transition-colors',
                                    line.is_deduction ? 'bg-red-50/50 dark:bg-red-900/20' : 'bg-white dark:bg-[var(--color-surface-elevated)]',
                                    'hover:bg-[var(--color-surface-elevated)] dark:hover:bg-[var(--color-surface-elevated)]',
                                  )}
                                >
                                  <td className="border-r border-[var(--color-border)] dark:border-[var(--color-border)]" />
                                  <td className="border-r border-[var(--color-border)] dark:border-[var(--color-border)]" />
                                  <td className="px-2 py-1.5 border-r border-[var(--color-border)] text-center">
                                    <button
                                      onClick={async () => {
                                        await onUpdateLine(line.id, { is_deduction: !line.is_deduction })
                                      }}
                                      className={cn(
                                        'w-5 h-5 rounded text-xs font-bold flex items-center justify-center transition-colors',
                                        line.is_deduction
                                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                          : 'bg-green-100 text-green-600 hover:bg-green-200',
                                      )}
                                      title={line.is_deduction ? 'Deduction' : 'Addition'}
                                    >
                                      {line.is_deduction ? '−' : '+'}
                                    </button>
                                  </td>
                                  {/* Code col - line number */}
                                  <td className="px-2 py-1.5 border-r border-[var(--color-border)] text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] pl-6">
                                    {line.line_number}
                                  </td>
                                  {/* Description */}
                                  {renderEditableCell(
                                    `${line.id}:description`,
                                    line.description,
                                    true,
                                    line.is_deduction,
                                    'text',
                                  )}
                                  {/* Type + Unit - empty for lines */}
                                  <td className="border-r border-[var(--color-border)] dark:border-[var(--color-border)]" />
                                  <td className="border-r border-[var(--color-border)] dark:border-[var(--color-border)]" />
                                  {/* Nr */}
                                  {renderEditableCell(
                                    `${line.id}:nr`,
                                    line.nr,
                                    cols.nr,
                                    line.is_deduction,
                                    'number',
                                  )}
                                  {/* Length */}
                                  {renderEditableCell(
                                    `${line.id}:length`,
                                    line.length,
                                    cols.length,
                                    line.is_deduction,
                                    'number',
                                  )}
                                  {/* Width */}
                                  {renderEditableCell(
                                    `${line.id}:width`,
                                    line.width,
                                    cols.width,
                                    line.is_deduction,
                                    'number',
                                  )}
                                  {/* Height */}
                                  {renderEditableCell(
                                    `${line.id}:height`,
                                    line.height,
                                    cols.height,
                                    line.is_deduction,
                                    'number',
                                  )}
                                  {/* Formula */}
                                  {renderEditableCell(
                                    `${line.id}:formula`,
                                    line.formula,
                                    cols.formula,
                                    line.is_deduction,
                                    'text',
                                  )}
                                  {/* Source: drawing / page / floor reference */}
                                  <td className="px-2 py-1.5 border-r border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]">
                                    {line.drawing_id && drawingsById[line.drawing_id] ? (
                                      <div className="flex items-center gap-1 truncate" title={`${drawingsById[line.drawing_id].name}${line.page_number ? ` · Pg ${line.page_number}` : ''}`}>
                                        <GitBranch size={10} className="text-[var(--color-amber)] shrink-0" />
                                        <span className="truncate">{drawingsById[line.drawing_id].name}</span>
                                        {line.page_number != null && <span className="shrink-0">·{line.page_number}</span>}
                                      </div>
                                    ) : (
                                      <span>—</span>
                                    )}
                                  </td>
                                  {/* Quantity */}
                                  <td
                                    className={cn(
                                      'px-2 py-1.5 border-r border-[var(--color-border)] text-xs text-end tabular-nums font-medium',
                                      line.is_deduction && 'text-red-600',
                                    )}
                                  >
                                    {line.is_deduction ? '−' : ''}
                                    {formatQty(Math.abs(previewQty))}
                                  </td>
                                  {/* Actions */}
                                  <td className="px-1 py-1 text-center relative">
                                    <button
                                      onClick={() => setLineMenu(lineMenu === line.id ? null : line.id)}
                                      className="p-1 text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] dark:hover:text-[var(--color-text-secondary)] transition-colors"
                                    >
                                      <MoreHorizontal size={13} />
                                    </button>
                                    {lineMenu === line.id && (
                                      <div className="absolute right-0 top-full z-20 bg-white dark:bg-[var(--color-surface-elevated)] border border-[var(--color-border)] dark:border-[var(--color-border)] rounded-lg shadow-lg py-1 min-w-[140px]">
                                        <button
                                          onClick={() => {
                                            onDuplicateLine(line.id)
                                            setLineMenu(null)
                                          }}
                                          className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--color-text-secondary)] dark:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] dark:hover:bg-[var(--color-surface-elevated)] w-full"
                                        >
                                          <Copy size={12} /> Duplicate
                                        </button>
                                        <button
                                          onClick={() => {
                                            onDeleteLine(line.id)
                                            setLineMenu(null)
                                          }}
                                          className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 w-full"
                                        >
                                          <Trash2 size={12} /> Delete
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}

                          {/* Item subtotal */}
                          {itemExpanded && lines.length > 0 && (
                            <tr className="bg-[var(--color-surface-elevated)] dark:bg-[var(--color-surface)] border-b border-[var(--color-border)] dark:border-[var(--color-border)]">
                              <td colSpan={4} className="border-r border-[var(--color-border)] dark:border-[var(--color-border)]" />
                              <td colSpan={9} className="px-2 py-1.5 text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] italic">
                                <span className="mr-4">
                                  Add: <span className="font-medium tabular-nums">{formatQty(itemAdditions)}</span>
                                </span>
                                <span className="mr-4 text-red-500">
                                  Ded: <span className="font-medium tabular-nums">−{formatQty(itemDeductions)}</span>
                                </span>
                                <span className="font-semibold text-[var(--color-text-secondary)] dark:text-[var(--color-text)]">
                                  Net: <span className="tabular-nums">{formatQty(itemNet)}</span>
                                </span>
                              </td>
                              <td className="px-2 py-1.5 border-r border-[var(--color-border)] text-xs text-end font-medium italic tabular-nums">
                                {formatQty(itemNet)}
                              </td>
                              <td />
                            </tr>
                          )}

                          {/* Add line buttons */}
                          {itemExpanded && (
                            <tr className="bg-white dark:bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] dark:border-[var(--color-border)]">
                              <td colSpan={15} className="px-6 py-1.5">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => onAddLine(item.id, false)}
                                    className="flex items-center gap-1 text-xs text-[var(--color-info)] hover:text-[var(--color-info)] dark:hover:text-[var(--color-info)] font-medium"
                                  >
                                    <Plus size={12} /> Add line
                                  </button>
                                  <button
                                    onClick={() => onAddLine(item.id, true)}
                                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"
                                  >
                                    <Minus size={12} /> Add deduction
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </ItemGroup>
                      )
                    })}

                  {/* Section subtotal */}
                  {sectionExpanded && (
                    <tr className="bg-[var(--color-surface-elevated)] dark:bg-[var(--color-surface-elevated)] border-b-2 border-[var(--color-border)] dark:border-[var(--color-border)]">
                      <td colSpan={4} className="border-r border-[var(--color-border)] dark:border-[var(--color-border)]" />
                      <td colSpan={9} className="px-2 py-2 text-xs font-semibold text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)] italic">
                        Section Total — {sectionName}
                      </td>
                      <td className="px-2 py-2 text-xs text-end font-bold tabular-nums border-r border-[var(--color-border)] dark:border-[var(--color-border)]">
                        {formatQty(sectionNet)}
                      </td>
                      <td />
                    </tr>
                  )}
                </SectionGroup>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-[var(--color-surface-elevated)] text-white">
              <td colSpan={4} />
              <td colSpan={9} className="px-2 py-3 text-xs font-bold uppercase tracking-wide">
                Grand Total
                <span className="ml-4 font-normal text-[var(--color-text-secondary)]">
                  Add: {formatQty(grandTotal.additions)} | Ded: −{formatQty(grandTotal.deductions)}
                </span>
              </td>
              <td className="px-2 py-3 text-sm text-end font-bold tabular-nums">
                {formatQty(grandTotal.net)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// Fragment wrappers for grouping rows
function SectionGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function ItemGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
