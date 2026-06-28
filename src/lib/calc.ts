import type { MeasurementType } from '@/lib/types'

export function evaluateFormula(formula: string): number {
  // Replace × with * and strip spaces/commas
  const sanitized = formula.replace(/×/g, '*').replace(/[, ]/g, '')
  if (!sanitized.trim()) return 0

  // Reject dangerous patterns
  if (/[a-zA-Z_\\;=\[\]{}]|\*\*/.test(sanitized)) return 0
  // Only allow digits, operators, parens, decimal points
  if (/[^0-9+\-*/().]/.test(sanitized)) return 0

  try {
    const result = parseExpr(sanitized, { pos: 0 })
    if (typeof result !== 'number' || !isFinite(result)) return 0
    return result
  } catch {
    return 0
  }
}

// Recursive-descent parser for safe math evaluation
// Grammar: expr = term (('+' | '-') term)*
//          term = factor (('*' | '/') factor)*
//          factor = ['+' | '-'] (number | '(' expr ')')

function parseExpr(s: string, ctx: { pos: number }): number {
  let result = parseTerm(s, ctx)
  while (ctx.pos < s.length && (s[ctx.pos] === '+' || s[ctx.pos] === '-')) {
    const op = s[ctx.pos++]
    const right = parseTerm(s, ctx)
    result = op === '+' ? result + right : result - right
  }
  return result
}

function parseTerm(s: string, ctx: { pos: number }): number {
  let result = parseFactor(s, ctx)
  while (ctx.pos < s.length && (s[ctx.pos] === '*' || s[ctx.pos] === '/')) {
    const op = s[ctx.pos++]
    const right = parseFactor(s, ctx)
    result = op === '*' ? result * right : result / right
  }
  return result
}

function parseFactor(s: string, ctx: { pos: number }): number {
  // Handle unary +/-
  if (ctx.pos < s.length && (s[ctx.pos] === '+' || s[ctx.pos] === '-')) {
    const sign = s[ctx.pos++]
    const val = parseFactor(s, ctx)
    return sign === '-' ? -val : val
  }

  // Parenthesized expression
  if (ctx.pos < s.length && s[ctx.pos] === '(') {
    ctx.pos++ // skip '('
    const result = parseExpr(s, ctx)
    if (ctx.pos >= s.length || s[ctx.pos] !== ')') throw new Error('Missing )')
    ctx.pos++ // skip ')'
    return result
  }

  // Number
  const start = ctx.pos
  while (ctx.pos < s.length && (s[ctx.pos] >= '0' && s[ctx.pos] <= '9' || s[ctx.pos] === '.')) {
    ctx.pos++
  }
  if (ctx.pos === start) throw new Error('Unexpected token')
  return parseFloat(s.slice(start, ctx.pos))
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
