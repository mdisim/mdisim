import type { MeasurementType } from '@/lib/types'

export function evaluateFormula(formula: string): number {
  const sanitized = formula.replace(/[^0-9+\-*/().× ,]/g, '').replace(/×/g, '*')
  if (!sanitized.trim()) return 0

  try {
    const fn = new Function(`"use strict"; return (${sanitized})`)
    const result = fn()
    if (typeof result !== 'number' || !isFinite(result)) return 0
    return result
  } catch {
    return 0
  }
}

export function calculateLineQuantity(fields: {
  nr?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  formula?: string | null
  is_deduction?: boolean
}, measurementType: MeasurementType = 'length'): number {
  let qty: number

  if (fields.formula && fields.formula.trim()) {
    qty = evaluateFormula(fields.formula)
  } else {
    const n = fields.nr ?? 1
    const l = fields.length ?? 0
    const w = fields.width ?? 0
    const h = fields.height ?? 0

    switch (measurementType) {
      case 'length':
        qty = n * l
        break
      case 'area':
        qty = n * l * (w || 1)
        break
      case 'volume':
        qty = n * l * (w || 1) * (h || 1)
        break
      case 'count':
        qty = n
        break
      case 'weight':
        qty = n * l
        break
      case 'formula':
        qty = evaluateFormula(fields.formula ?? '')
        break
      default:
        qty = n * l * (w || 1) * (h || 1)
    }
  }

  if (fields.is_deduction && qty > 0) {
    qty = -qty
  }

  return Math.round(qty * 1000000) / 1000000
}
