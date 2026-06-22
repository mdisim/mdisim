'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { MeasurementItem, MeasurementLine } from '@/lib/types'
import {
  createMeasurementLine,
  updateMeasurementLine,
  deleteMeasurementLine,
  duplicateMeasurementLine,
} from '@/app/actions/measurements'
import { Plus, Trash2, Copy, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MeasurementSheetProps {
  item: MeasurementItem
  onUpdate: () => void
}

type CellField = 'description' | 'location' | 'count' | 'length' | 'width' | 'height' | 'formula' | 'notes'

const COLUMNS: { key: CellField; label: string; width: string; numeric?: boolean }[] = [
  { key: 'description', label: 'Description', width: 'min-w-[160px] flex-1' },
  { key: 'location', label: 'Location', width: 'w-[110px]' },
  { key: 'count', label: 'N', width: 'w-[60px]', numeric: true },
  { key: 'length', label: 'Length', width: 'w-[80px]', numeric: true },
  { key: 'width', label: 'Width', width: 'w-[80px]', numeric: true },
  { key: 'height', label: 'Height', width: 'w-[80px]', numeric: true },
  { key: 'formula', label: 'Formula', width: 'w-[140px]' },
  { key: 'notes', label: 'Notes', width: 'w-[120px]' },
]

export function MeasurementSheet({ item, onUpdate }: MeasurementSheetProps) {
  const lines = item.lines ?? []
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

    const currentValue = line[field]
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
  }, [editingCell, editValue, lines, onUpdate])

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
          startEdit(editingCell.lineId, nextCol.key, lines[lineIdx]?.[nextCol.key] as string | number | null)
        } else if (lineIdx < lines.length - 1) {
          const nextLine = lines[lineIdx + 1]
          startEdit(nextLine.id, COLUMNS[0].key, nextLine[COLUMNS[0].key] as string | number | null)
        }
      }
    }
  }

  const handleAddLine = async (isDeduction = false) => {
    setAdding(true)
    await createMeasurementLine({
      item_id: item.id,
      is_deduction: isDeduction,
      count: 1,
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

  const additions = lines.filter((l) => !l.is_deduction)
  const deductions = lines.filter((l) => l.is_deduction)
  const additionsTotal = additions.reduce((s, l) => s + l.quantity, 0)
  const deductionsTotal = deductions.reduce((s, l) => s + Math.abs(l.quantity), 0)

  return (
    <div className="bg-slate-50">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="w-[36px] px-2 py-2 text-center text-[11px] font-semibold text-slate-500 uppercase">#</th>
              <th className="w-[28px]" />
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-2 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase',
                    col.width,
                    col.numeric && 'text-right'
                  )}
                >
                  {col.label}
                </th>
              ))}
              <th className="w-[80px] px-2 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase">Qty</th>
              <th className="w-[80px]" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr
                key={line.id}
                className={cn(
                  'border-b border-slate-100 hover:bg-white transition-colors group',
                  line.is_deduction && 'bg-red-50/50'
                )}
              >
                {/* Line number */}
                <td className="px-2 py-1.5 text-center text-xs text-slate-400 tabular-nums">
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
                  const value = line[col.key]
                  const displayValue = value != null ? String(value) : ''

                  return (
                    <td
                      key={col.key}
                      className={cn('px-1 py-0.5', col.width, col.numeric && 'text-right')}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type={col.numeric ? 'text' : 'text'}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={handleKeyDown}
                          className={cn(
                            'w-full px-1.5 py-1 text-sm rounded border border-blue-400 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500',
                            col.numeric && 'text-right tabular-nums'
                          )}
                        />
                      ) : (
                        <div
                          onClick={() => startEdit(line.id, col.key, value as string | number | null)}
                          className={cn(
                            'w-full px-1.5 py-1 text-sm rounded cursor-text hover:bg-blue-50/50 min-h-[28px] transition-colors',
                            col.numeric && 'text-right tabular-nums',
                            !displayValue && 'text-slate-300'
                          )}
                        >
                          {displayValue || '—'}
                        </div>
                      )}
                    </td>
                  )
                })}

                {/* Calculated quantity */}
                <td className="px-2 py-1.5 text-right">
                  <span className={cn(
                    'text-sm font-semibold tabular-nums',
                    line.is_deduction ? 'text-red-600' : 'text-slate-900'
                  )}>
                    {formatQty(line.quantity)}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-1 py-1">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDuplicate(line.id)}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600"
                      title="Duplicate line"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(line.id)}
                      className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
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
      <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddLine(false)}
            disabled={adding}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
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
          <div className="text-right">
            <span className="text-slate-500">Additions:</span>
            <span className="ml-2 font-semibold text-green-700 tabular-nums">{formatQty(additionsTotal)}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Deductions:</span>
            <span className="ml-2 font-semibold text-red-600 tabular-nums">−{formatQty(deductionsTotal)}</span>
          </div>
          <div className="text-right border-l border-slate-300 pl-6">
            <span className="text-slate-500">Total:</span>
            <span className={cn(
              'ml-2 font-bold text-sm tabular-nums',
              item.total_qty < 0 ? 'text-red-600' : 'text-slate-900'
            )}>
              {formatQty(item.total_qty)} {item.unit}
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
