'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { MeasurementItem, MeasurementLine, Drawing, DrawingRevision, MeasurementSketch } from '@/lib/types'
import {
  createMeasurementLine,
  updateMeasurementLine,
  deleteMeasurementLine,
  duplicateMeasurementLine,
} from '@/app/actions/measurements'
import { Plus, Trash2, Copy, Minus, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MeasurementSheetProps {
  item: MeasurementItem
  onUpdate: () => void
  extended?: boolean
  drawings?: Drawing[]
  revisions?: DrawingRevision[]
  sketchesByLineId?: Record<string, MeasurementSketch[]>
  onManageSketches?: (line: MeasurementLine) => void
  defaultLineFields?: { floor_level?: string; engineer_name?: string; measured_date?: string }
}

type CellField =
  | 'description' | 'location' | 'nr' | 'length' | 'width' | 'height' | 'formula' | 'notes'
  | 'floor_level' | 'engineer_name' | 'measured_date' | 'page_number'

const BASE_COLUMNS: { key: CellField; label: string; width: string; numeric?: boolean; dateType?: boolean }[] = [
  { key: 'description', label: 'Description', width: 'min-w-[160px] flex-1' },
  { key: 'location', label: 'Location', width: 'w-[110px]' },
  { key: 'nr', label: 'N', width: 'w-[60px]', numeric: true },
  { key: 'length', label: 'Length', width: 'w-[80px]', numeric: true },
  { key: 'width', label: 'Width', width: 'w-[80px]', numeric: true },
  { key: 'height', label: 'Height', width: 'w-[80px]', numeric: true },
  { key: 'formula', label: 'Formula', width: 'w-[140px]' },
  { key: 'notes', label: 'Notes', width: 'w-[120px]' },
]

const SOURCE_COLUMNS: { key: CellField; label: string; width: string; numeric?: boolean; dateType?: boolean }[] = [
  { key: 'floor_level', label: 'Floor / Level', width: 'w-[100px]' },
  { key: 'page_number', label: 'Page', width: 'w-[64px]', numeric: true },
  { key: 'engineer_name', label: 'Engineer', width: 'w-[120px]' },
  { key: 'measured_date', label: 'Date', width: 'w-[120px]', dateType: true },
]

export function MeasurementSheet({
  item,
  onUpdate,
  extended = false,
  drawings = [],
  revisions = [],
  sketchesByLineId = {},
  onManageSketches,
  defaultLineFields,
}: MeasurementSheetProps) {
  const lines = item.lines ?? []
  const COLUMNS = extended ? [...BASE_COLUMNS, ...SOURCE_COLUMNS] : BASE_COLUMNS
  const [editingCell, setEditingCell] = useState<{ lineId: string; field: CellField } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  const startEdit = (lineId: string, field: CellField, currentValue: string | number | null) => {
    setEditingCell({ lineId, field })
    setEditValue(currentValue?.toString() ?? '')
  }

  const saveEdit = useCallback(async () => {
    if (!editingCell) return
    const { lineId, field } = editingCell

    const line = lines.find((l) => l.id === lineId)
    if (!line) return

    const currentValue = line[field as keyof MeasurementLine]
    const newValue = editValue.trim()

    if (String(currentValue ?? '') === newValue) {
      setEditingCell(null)
      return
    }

    const col = COLUMNS.find((c) => c.key === field)
    const update: Record<string, unknown> = {}
    if (col?.numeric) {
      update[field] = newValue ? parseFloat(newValue) || null : null
    } else {
      update[field] = newValue || null
    }

    setEditingCell(null)
    await updateMeasurementLine(lineId, update as Partial<MeasurementLine>)
    onUpdate()
  }, [editingCell, editValue, lines, onUpdate, COLUMNS])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      saveEdit()
      // Move to next cell
      if (editingCell) {
        const colIdx = COLUMNS.findIndex((c) => c.key === editingCell.field)
        const lineIdx = lines.findIndex((l) => l.id === editingCell.lineId)
        if (colIdx < COLUMNS.length - 1) {
          const nextCol = COLUMNS[colIdx + 1]
          startEdit(editingCell.lineId, nextCol.key, lines[lineIdx]?.[nextCol.key as keyof MeasurementLine] as string | number | null)
        } else if (lineIdx < lines.length - 1) {
          const nextLine = lines[lineIdx + 1]
          startEdit(nextLine.id, COLUMNS[0].key, nextLine[COLUMNS[0].key as keyof MeasurementLine] as string | number | null)
        }
      }
    }
  }

  const handleAddLine = async (isDeduction = false) => {
    setAdding(true)
    await createMeasurementLine({
      item_id: item.id,
      is_deduction: isDeduction,
      nr: 1,
      ...defaultLineFields,
    })
    setAdding(false)
    onUpdate()
  }

  const handleDuplicate = async (lineId: string) => {
    await duplicateMeasurementLine(lineId)
    onUpdate()
  }

  const handleDelete = async (lineId: string) => {
    await deleteMeasurementLine(lineId)
    onUpdate()
  }

  const handleToggleDeduction = async (line: MeasurementLine) => {
    await updateMeasurementLine(line.id, { is_deduction: !line.is_deduction })
    onUpdate()
  }

  const handleDrawingChange = async (line: MeasurementLine, drawingId: string) => {
    await updateMeasurementLine(line.id, { drawing_id: drawingId || null, revision_id: null })
    onUpdate()
  }

  const handleRevisionChange = async (line: MeasurementLine, revisionId: string) => {
    await updateMeasurementLine(line.id, { revision_id: revisionId || null })
    onUpdate()
  }

  const additions = lines.filter((l) => !l.is_deduction)
  const deductions = lines.filter((l) => l.is_deduction)
  const additionsTotal = additions.reduce((s, l) => s + l.quantity, 0)
  const deductionsTotal = deductions.reduce((s, l) => s + Math.abs(l.quantity), 0)

  return (
    <div className="bg-[var(--color-surface-elevated)]">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)]">
              <th className="w-[36px] px-2 py-2 text-center text-[11px] font-semibold text-[var(--color-text-muted)] uppercase">#</th>
              <th className="w-[28px]" />
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-2 py-2 text-left text-[11px] font-semibold text-[var(--color-text-muted)] uppercase',
                    col.width,
                    col.numeric && 'text-end'
                  )}
                >
                  {col.label}
                </th>
              ))}
              {extended && (
                <th className="w-[150px] px-2 py-2 text-left text-[11px] font-semibold text-[var(--color-text-muted)] uppercase">Drawing / Rev</th>
              )}
              <th className="w-[80px] px-2 py-2 text-end text-[11px] font-semibold text-[var(--color-text-muted)] uppercase">Qty</th>
              {extended && <th className="w-[50px]" />}
              <th className="w-[80px]" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr
                key={line.id}
                className={cn(
                  'border-b border-[var(--color-border)] hover:bg-white transition-colors group',
                  line.is_deduction && 'bg-red-50/50'
                )}
              >
                {/* Line number */}
                <td className="px-2 py-1.5 text-center text-xs text-[var(--color-text-muted)] tabular-nums">
                  {line.line_number}
                </td>

                {/* Deduction indicator */}
                <td className="px-1">
                  <button
                    onClick={() => handleToggleDeduction(line)}
                    className={cn(
                      'w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-colors',
                      line.is_deduction
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    )}
                    title={line.is_deduction ? 'Deduction — click to make addition' : 'Addition — click to make deduction'}
                  >
                    {line.is_deduction ? '−' : '+'}
                  </button>
                </td>

                {/* Data cells */}
                {COLUMNS.map((col) => {
                  const isEditing = editingCell?.lineId === line.id && editingCell?.field === col.key
                  const value = line[col.key as keyof MeasurementLine]
                  const displayValue = value != null ? String(value) : ''

                  return (
                    <td
                      key={col.key}
                      className={cn('px-1 py-0.5', col.width, col.numeric && 'text-end')}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type={col.dateType ? 'date' : 'text'}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyDown}
                          className={cn(
                            'w-full px-1.5 py-1 text-sm rounded border border-[var(--color-amber)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-amber)]',
                            col.numeric && 'text-end tabular-nums'
                          )}
                        />
                      ) : (
                        <div
                          onClick={() => startEdit(line.id, col.key, value as string | number | null)}
                          className={cn(
                            'w-full px-1.5 py-1 text-sm rounded cursor-text hover:bg-[var(--color-info-bg)]/50 min-h-[28px] transition-colors',
                            col.numeric && 'text-end tabular-nums',
                            !displayValue && 'text-[var(--color-text-secondary)]'
                          )}
                        >
                          {displayValue || '—'}
                        </div>
                      )}
                    </td>
                  )
                })}

                {/* Drawing / Revision reference */}
                {extended && (
                  <td className="px-1 py-0.5">
                    <div className="flex flex-col gap-0.5">
                      <select
                        value={line.drawing_id ?? ''}
                        onChange={(e) => handleDrawingChange(line, e.target.value)}
                        className="w-full text-[11px] px-1 py-0.5 rounded border border-[var(--color-border)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-amber)]"
                      >
                        <option value="">No drawing</option>
                        {drawings.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}{d.drawing_number ? ` (${d.drawing_number})` : ''}</option>
                        ))}
                      </select>
                      <select
                        value={line.revision_id ?? ''}
                        onChange={(e) => handleRevisionChange(line, e.target.value)}
                        disabled={!line.drawing_id}
                        className="w-full text-[11px] px-1 py-0.5 rounded border border-[var(--color-border)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-amber)] disabled:opacity-40"
                      >
                        <option value="">No revision</option>
                        {revisions.filter((r) => r.drawing_id === line.drawing_id).map((r) => (
                          <option key={r.id} value={r.id}>Rev {r.revision_number}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                )}

                {/* Calculated quantity */}
                <td className="px-2 py-1.5 text-end">
                  <span className={cn(
                    'text-sm font-semibold tabular-nums',
                    line.is_deduction ? 'text-red-600' : 'text-[var(--color-text)]'
                  )}>
                    {formatQty(line.quantity)}
                  </span>
                </td>

                {/* Sketch indicator */}
                {extended && (
                  <td className="px-1 py-1 text-center">
                    <button
                      onClick={() => onManageSketches?.(line)}
                      className={cn(
                        'inline-flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium transition-colors',
                        (sketchesByLineId[line.id]?.length ?? 0) > 0
                          ? 'text-[var(--color-amber)] bg-[var(--color-amber)]/10 hover:bg-[var(--color-amber)]/20'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]'
                      )}
                      title="Sketches for this line"
                    >
                      <ImageIcon size={12} />
                      {(sketchesByLineId[line.id]?.length ?? 0) > 0 && sketchesByLineId[line.id].length}
                    </button>
                  </td>
                )}

                {/* Actions */}
                <td className="px-1 py-1">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDuplicate(line.id)}
                      className="p-1 rounded hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-info)]"
                      title="Duplicate line"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(line.id)}
                      className="p-1 rounded hover:bg-red-50 text-[var(--color-text-muted)] hover:text-red-500"
                      title="Delete line"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer: totals + add buttons */}
      <div className="px-4 py-3 border-t border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddLine(false)}
            disabled={adding}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-info)] bg-[var(--color-info-bg)] hover:bg-[var(--color-info-bg)] rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus size={12} />
            Add Line
          </button>
          <button
            onClick={() => handleAddLine(true)}
            disabled={adding}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <Minus size={12} />
            Add Deduction
          </button>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div className="text-end">
            <span className="text-[var(--color-text-muted)]">Additions:</span>
            <span className="ml-2 font-semibold text-green-700 tabular-nums">{formatQty(additionsTotal)}</span>
          </div>
          <div className="text-end">
            <span className="text-[var(--color-text-muted)]">Deductions:</span>
            <span className="ml-2 font-semibold text-red-600 tabular-nums">−{formatQty(deductionsTotal)}</span>
          </div>
          <div className="text-end border-l border-[var(--color-border)] pl-6">
            <span className="text-[var(--color-text-muted)]">Total:</span>
            <span className={cn(
              'ml-2 font-bold text-sm tabular-nums',
              item.net_qty < 0 ? 'text-red-600' : 'text-[var(--color-text)]'
            )}>
              {formatQty(item.net_qty)} {item.unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatQty(n: number): string {
  if (n === 0) return '0.00'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}
