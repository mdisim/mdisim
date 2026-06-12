// BOQ Formula Engine — client-safe, no external deps

export interface FormulaCell {
  row: number
  col: string
  formula: string
  value: number | string | null
}

export interface FormulaContext {
  cells: Map<string, number | string | null>
}

// Parse a cell address like "D3" → { col: 'D', row: 3 }
export function parseCellAddress(addr: string): { col: string; row: number } | null {
  const m = addr.match(/^([A-Za-z]+)(\d+)$/)
  if (!m) return null
  return { col: m[1].toUpperCase(), row: parseInt(m[2], 10) }
}

// Parse a range like "D1:D10" → array of addresses
export function parseRange(range: string): string[] {
  const parts = range.split(':')
  if (parts.length !== 2) return [range]
  const start = parseCellAddress(parts[0].trim())
  const end = parseCellAddress(parts[1].trim())
  if (!start || !end) return [range]

  const startCol = start.col.charCodeAt(0)
  const endCol = end.col.charCodeAt(0)
  const startRow = Math.min(start.row, end.row)
  const endRow = Math.max(start.row, end.row)

  const addrs: string[] = []
  for (let c = Math.min(startCol, endCol); c <= Math.max(startCol, endCol); c++) {
    for (let r = startRow; r <= endRow; r++) {
      addrs.push(String.fromCharCode(c) + r)
    }
  }
  return addrs
}

// Build context from BOQ rows
export function buildFormulaContext(rows: Array<{
  rowIndex: number
  item_code: string | null
  description: string | null
  unit: string | null
  quantity: number | null
  unit_rate: number | null
  total: number | null
  vat_percent: number | null
  vat_amount: number | null
}>): FormulaContext {
  const cells = new Map<string, number | string | null>()
  // Column mapping: A=item_code, B=description, C=unit, D=quantity, E=unit_rate, F=total, G=vat_pct, H=vat_amt, I=net_total
  const colMap: Record<string, (r: typeof rows[0]) => number | string | null> = {
    A: r => r.item_code,
    B: r => r.description,
    C: r => r.unit,
    D: r => r.quantity,
    E: r => r.unit_rate,
    F: r => r.total,
    G: r => r.vat_percent,
    H: r => r.vat_amount,
    I: r => (r.total ?? 0) + (r.vat_amount ?? 0),
  }
  for (const row of rows) {
    for (const [col, getter] of Object.entries(colMap)) {
      cells.set(`${col}${row.rowIndex}`, getter(row))
    }
  }
  return { cells }
}

const CIRCULAR_SENTINEL = Symbol('circular')

// Tokenizer + recursive descent evaluator
export function evaluateFormula(
  formula: string,
  context: FormulaContext,
  _visiting: Set<string> = new Set()
): number | string | null {
  const raw = formula.trim()
  if (!raw.startsWith('=')) return raw

  const expr = raw.slice(1).trim()
  try {
    return parseExpr(expr, context, _visiting)
  } catch (e) {
    if (e === CIRCULAR_SENTINEL) return null
    if (e instanceof FormulaError) return e.code
    return null
  }
}

class FormulaError {
  constructor(public code: string) {}
}

// ---- Recursive descent parser ----

interface ParseState {
  src: string
  pos: number
  context: FormulaContext
  visiting: Set<string>
}

function peek(s: ParseState): string {
  return s.src[s.pos] ?? ''
}

function consume(s: ParseState): string {
  return s.src[s.pos++] ?? ''
}

function skipWS(s: ParseState) {
  while (s.pos < s.src.length && /\s/.test(s.src[s.pos])) s.pos++
}

// Entry: expression = comparison
function parseExpr(src: string, context: FormulaContext, visiting: Set<string>): number | string | null {
  const s: ParseState = { src, pos: 0, context, visiting }
  const val = parseComparison(s)
  return val
}

function parseComparison(s: ParseState): number | string | null {
  let left = parseAddSub(s)
  skipWS(s)
  const op2 = s.src.slice(s.pos, s.pos + 2)
  const op1 = s.src[s.pos] ?? ''
  let op = ''
  if (['>=', '<=', '<>'].includes(op2)) { op = op2; s.pos += 2 }
  else if (['>', '<', '='].includes(op1)) { op = op1; s.pos++ }
  if (op) {
    skipWS(s)
    const right = parseAddSub(s)
    const l = toNum(left)
    const r = toNum(right)
    if (op === '>') return l > r ? 1 : 0
    if (op === '<') return l < r ? 1 : 0
    if (op === '>=') return l >= r ? 1 : 0
    if (op === '<=') return l <= r ? 1 : 0
    if (op === '=' || op === '==') return l === r ? 1 : 0
    if (op === '<>') return l !== r ? 1 : 0
  }
  return left
}

function parseAddSub(s: ParseState): number | string | null {
  let left = parseMulDiv(s)
  while (true) {
    skipWS(s)
    const op = peek(s)
    if (op !== '+' && op !== '-') break
    consume(s)
    skipWS(s)
    const right = parseMulDiv(s)
    const l = toNum(left)
    const r = toNum(right)
    left = op === '+' ? l + r : l - r
  }
  return left
}

function parseMulDiv(s: ParseState): number | string | null {
  let left = parseUnary(s)
  while (true) {
    skipWS(s)
    const op = peek(s)
    if (op !== '*' && op !== '/') break
    consume(s)
    skipWS(s)
    const right = parseUnary(s)
    const l = toNum(left)
    const r = toNum(right)
    if (op === '/') {
      if (r === 0) throw new FormulaError('#DIV/0!')
      left = l / r
    } else {
      left = l * r
    }
  }
  return left
}

function parseUnary(s: ParseState): number | string | null {
  skipWS(s)
  if (peek(s) === '-') { consume(s); return -toNum(parseAtom(s)) }
  if (peek(s) === '+') { consume(s); return parseAtom(s) }
  return parseAtom(s)
}

function parseAtom(s: ParseState): number | string | null {
  skipWS(s)
  const ch = peek(s)

  // Parenthesis
  if (ch === '(') {
    consume(s)
    const val = parseComparison(s)
    skipWS(s)
    if (peek(s) === ')') consume(s)
    return val
  }

  // String literal
  if (ch === '"') {
    consume(s)
    let str = ''
    while (s.pos < s.src.length && peek(s) !== '"') str += consume(s)
    if (peek(s) === '"') consume(s)
    return str
  }

  // Number literal
  if (/\d/.test(ch) || (ch === '.' && /\d/.test(s.src[s.pos + 1] ?? ''))) {
    let num = ''
    while (s.pos < s.src.length && /[\d.]/.test(peek(s))) num += consume(s)
    return parseFloat(num)
  }

  // Function or cell reference or identifier
  if (/[A-Za-z]/.test(ch)) {
    let ident = ''
    while (s.pos < s.src.length && /[A-Za-z0-9_$]/.test(peek(s))) ident += consume(s)
    skipWS(s)

    // Function call
    if (peek(s) === '(') {
      consume(s) // consume '('
      return callFunction(ident.toUpperCase(), s)
    }

    // Cell reference
    const upper = ident.toUpperCase()
    const addr = parseCellAddress(upper)
    if (addr) {
      const key = upper
      if (s.visiting.has(key)) throw CIRCULAR_SENTINEL
      const val = s.context.cells.get(key)
      return val ?? null
    }

    // Boolean literals
    if (upper === 'TRUE') return 1
    if (upper === 'FALSE') return 0

    return null
  }

  return null
}

function callFunction(name: string, s: ParseState): number | string | null {
  const args: (number | string | null)[] = []

  // Collect arguments (might contain ranges)
  while (s.pos < s.src.length && peek(s) !== ')') {
    skipWS(s)
    if (peek(s) === ')') break

    // Check for range like D1:D10 before parsing as expression
    const savedPos = s.pos
    let potentialRange = ''
    while (s.pos < s.src.length && /[A-Za-z0-9:$]/.test(peek(s))) {
      potentialRange += consume(s)
    }
    if (potentialRange.includes(':')) {
      // It's a range reference
      const addrs = parseRange(potentialRange.toUpperCase())
      for (const a of addrs) {
        if (s.visiting.has(a)) throw CIRCULAR_SENTINEL
        args.push(s.context.cells.get(a) ?? null)
      }
    } else {
      // Restore and parse as normal expression
      s.pos = savedPos
      const val = parseComparison(s)
      args.push(val)
    }

    skipWS(s)
    if (peek(s) === ',') consume(s)
  }
  if (peek(s) === ')') consume(s)

  return applyFunction(name, args)
}

function applyFunction(name: string, args: (number | string | null)[]): number | string | null {
  switch (name) {
    case 'SUM': {
      let total = 0
      for (const a of args) total += toNum(a)
      return total
    }
    case 'ROUND': {
      const val = toNum(args[0])
      const decimals = args.length >= 2 ? toNum(args[1]) : 0
      const factor = Math.pow(10, decimals)
      return Math.round(val * factor) / factor
    }
    case 'IF': {
      const cond = toNum(args[0])
      return cond !== 0 ? (args[1] ?? null) : (args[2] ?? null)
    }
    case 'ABS': return Math.abs(toNum(args[0]))
    case 'MAX': return Math.max(...args.map(toNum))
    case 'MIN': return Math.min(...args.map(toNum))
    case 'AVERAGE': {
      if (args.length === 0) return 0
      return args.map(toNum).reduce((a, b) => a + b, 0) / args.length
    }
    default:
      return null
  }
}

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}
