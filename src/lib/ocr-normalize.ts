// OCR output normalization for structural drawing rebar callouts
// Fixes systematic Tesseract errors on scanned engineering drawings

// ─── Standard diameters valid in BS 8666 / Israeli practice ─────────────────
const VALID_DIAMETERS = new Set([6, 8, 10, 12, 14, 16, 20, 25, 32, 40])

// ─── Phase 1: single-character symbol substitutions ──────────────────────────
function phase1SymbolFix(text: string): string {
  return text
    // Ø symbol variants: ∅, Φ, φ, ⌀ → Ø
    .replace(/[∅ΦφΦ⌀]/g, 'Ø')
    // Letter O / digit 0 immediately before a 1–2 digit number (diameter context)
    .replace(/([^\dA-Za-z]|^)[Oo0](\d{1,2})(?=[@\s\-LlXx\/\n,]|$)/g, '$1Ø$2')
    // Letter D used as Ø prefix (common with certain font + OCR combo)
    .replace(/\bD(\d{1,2})\b/g, 'Ø$1')
    // Leading O/0 before diameter + spacing: O12@200 or 012@200 → Ø12@200
    .replace(/\b[O0](\d{1,2})\s*[@\-]\s*(\d{2,4})/g, 'Ø$1@$2')
    // @ symbol alternatives: Tesseract sometimes reads @ as 'a', 'A)', '(a', 'o)', 'at'
    .replace(/\s+(?:[aAoO]|at)\s*(\d{2,4})/g, ' @$1')
    // L= spacing variants: L=, l=, L:, L ~, L—
    .replace(/[Ll]\s*[=:~—]\s*(\d+)/g, 'L=$1')
    // nX prefix: × or x with spaces
    .replace(/(\d)\s*[×xX×]\s*(\d)/g, '$1X$2')
    // Fix common T-diameter OCR errors: "T 12" → "T12", "T1 2" → "T12"
    .replace(/\bT\s+(\d{1,2})\b/g, 'T$1')
    .replace(/\bT(\d)\s+(\d)\b/g, (_, d1, d2) => {
      const dia = parseInt(d1 + d2, 10)
      return VALID_DIAMETERS.has(dia) ? `T${dia}` : `T${d1} ${d2}`
    })
    // Stray artefacts
    .replace(/[|\\`~]/g, ' ')
    // Fix "No." or "#" used as count prefix: "No.4T12" → "4T12"
    .replace(/No\.?\s*(\d)/gi, '$1')
}

// ─── Phase 2: garbage-prefix before @spacing ─────────────────────────────────
// "110111@10" → "Ø10@10"  (junk chars before \d{1,2}@\d{2,4})
function phase2SpacingFix(text: string): string {
  // Before @spacing: strip any non-alphaØ prefix then capture last 1-2 digits
  return text.replace(
    /(?:^|(?<=\s))([^\sØ\dTtHhYyRr]*?)(\d{1,2})\s*@\s*(\d{2,4})/g,
    (_m, prefix, dia, spc) => {
      // Only fix if the prefix is clearly junk (contains repeated chars or non-rebar chars)
      const isJunk = /[01]{2,}|[^0-9TtHhYyRrØøXx@\-]/.test(prefix)
      const diaNum = parseInt(dia, 10)
      if (isJunk || prefix === '' || prefix === '0') {
        return `Ø${dia}@${spc}`
      }
      // If prefix looks like a count (1-2 digits), keep it
      if (/^\d{1,2}$/.test(prefix.trim())) {
        return `${prefix.trim()}Ø${diaNum <= 40 ? dia : ''}@${spc}`
      }
      return `Ø${dia}@${spc}`
    }
  )
}

// ─── Phase 3: count + Ø + diameter reconstruction ────────────────────────────
// "30412015" → "3Ø12"  (single digit count + 0 as Ø + diameter + garbage tail)
function phase3CountDiaFix(text: string): string {
  return text
    // count(1-2d) + 0 + diameter(1-2d) + optional garbage + optional L=
    .replace(/\b([1-9]\d?)0(\d{1,2})[\d]{0,4}(\s+L=\d+)?/g, (m, count, dia, len) => {
      const diaNum = parseInt(dia, 10)
      if (!VALID_DIAMETERS.has(diaNum) && diaNum > 2) {
        // dia might itself be garbled — try just first digit
        const shortDia = parseInt(dia[0], 10)
        if (VALID_DIAMETERS.has(shortDia)) return `${count}Ø${shortDia}${len ?? ''}`
      }
      if (diaNum < 6 || diaNum > 40) return m  // don't touch if implausible
      return `${count}Ø${dia}${len ?? ''}`
    })
}

// ─── Phase 4: prefix garbage before L= ───────────────────────────────────────
// "14015 L=250" → "Ø14 L=250"
function phase4LengthFix(text: string): string {
  return text.replace(
    /\b(\d{1,2})(\d{1,3})\s+(L=\d+)/g,
    (_m, dia, garbage, len) => {
      const diaNum = parseInt(dia, 10)
      void garbage
      // If first 1–2 digits are a valid diameter, strip the garbage tail
      if (VALID_DIAMETERS.has(diaNum)) return `Ø${dia} ${len}`
      return _m
    }
  )
}

// ─── Phase 5: bar-type letter + corrupted number ─────────────────────────────
// "T1772" → "T12"  Strategy: scan all 2-char substrings of the number for
// a valid diameter, preferring earlier positions.
function phase5LetterDiaFix(text: string): string {
  return text.replace(
    /\b([THYRr])(\d{3,6})(?:\s*[@\-]\s*(\d{2,4}))?\b/g,
    (_m, letter: string, digits: string, spacing: string | undefined) => {
      if (digits.length <= 2) return _m

      // Try to split as "count + diameter" — e.g. "T1216" → count=12? No. "T412" → 4+12
      // Strategy: try count(1-2 digits) + valid diameter(1-2 digits) reading from left
      for (let split = 1; split <= Math.min(2, digits.length - 1); split++) {
        const countPart = digits.slice(0, split)
        const diaPart = digits.slice(split, split + 2)
        const dia = parseInt(diaPart, 10)
        const count = parseInt(countPart, 10)
        if (VALID_DIAMETERS.has(dia) && count >= 1 && count <= 50) {
          const suffix = spacing ? `@${spacing}` : ''
          return `${count}${letter}${dia}${suffix}`
        }
      }

      // Fallback: sliding window for valid diameter anywhere in the digits
      for (let i = 0; i <= digits.length - 2; i++) {
        const candidate = parseInt(digits.slice(i, i + 2), 10)
        if (VALID_DIAMETERS.has(candidate)) {
          const suffix = spacing ? `@${spacing}` : ''
          return `${letter}${candidate}${suffix}`
        }
      }

      return _m
    }
  )
}

// ─── Phase 6: quantity/spacing pattern recovery ──────────────────────────────
// Common structural drawing patterns that Tesseract garbles:
//   "4 T12 @ 200" → "4T12@200"
//   "4-T12-200"   → "4T12@200"  (dash as separator)
//   "4No T12@200" → "4T12@200"
function phase6PatternRecovery(text: string): string {
  return text
    // "count No. dia" or "count no dia" → "countTdia"
    .replace(/(\d+)\s*(?:No\.?|nos?\.?)\s*(?:T|Ø)(\d{1,2})/gi, '$1T$2')
    // "count - T dia - spacing" → "countTdia@spacing"
    .replace(/(\d+)\s*-\s*T(\d{1,2})\s*-\s*(\d{2,4})/g, '$1T$2@$3')
    // "count T dia c/c spacing" or "count T dia @ spacing c/c"
    .replace(/(\d+T\d{1,2})\s*(?:@\s*)?(\d{2,4})\s*c\/?c/gi, '$1@$2')
    // "T dia - spacing c/c" (no count)
    .replace(/\b(T\d{1,2})\s*-\s*(\d{2,4})\s*c\/?c/gi, '$1@$2')
}

// ─── Phase 7: tidy up ─────────────────────────────────────────────────────────
function phase7Tidy(text: string): string {
  return text
    .replace(/\s{2,}/g, ' ')     // collapse multiple spaces
    .replace(/\n{3,}/g, '\n\n')  // collapse triple+ blank lines
}

// ─── Main entry point ─────────────────────────────────────────────────────────
export function normalizeOCRText(raw: string): string {
  let t = raw
  t = phase1SymbolFix(t)
  t = phase2SpacingFix(t)
  t = phase3CountDiaFix(t)
  t = phase4LengthFix(t)
  t = phase5LetterDiaFix(t)
  t = phase6PatternRecovery(t)
  t = phase7Tidy(t)
  return t
}

// ─── Per-match confidence scoring ────────────────────────────────────────────
// Returns 0–100. Score below threshold should be flagged, not auto-saved.

export interface ScoredCallout {
  raw: string           // as it appeared in normalized text
  originalOCR: string   // the line before normalization
  count: number
  diameterMm: number
  spacingMm?: number
  cutLengthMm?: number
  position?: string
  isStirrup: boolean
  confidence: number    // 0–100
  confidenceReasons: string[]
}

export function scoreCallout(
  callout: { raw: string; count: number; diameterMm: number; spacingMm?: number; cutLengthMm?: number; position?: string; isStirrup: boolean },
  originalLine: string
): ScoredCallout {
  let score = 100
  const reasons: string[] = []

  // Diameter validity — hard penalty for non-standard
  if (!VALID_DIAMETERS.has(callout.diameterMm)) {
    score -= 40
    reasons.push(`Non-standard diameter T${callout.diameterMm}`)
  }

  // Count plausibility
  if (callout.count < 1) {
    score -= 30
    reasons.push(`Invalid bar count: ${callout.count}`)
  } else if (callout.count > 50) {
    score -= 20
    reasons.push(`High bar count: ${callout.count}`)
  }

  // Spacing plausibility (75–600 mm c/c typical)
  if (callout.spacingMm !== undefined) {
    if (callout.spacingMm < 50 || callout.spacingMm > 600) {
      score -= 20
      reasons.push(`Unusual spacing: ${callout.spacingMm}mm`)
    }
  }

  // OCR normalization: only penalize heavy corrections, not simple whitespace fixes
  const rawTrimmed = originalLine.trim()
  const wasHeavilyNormalized = callout.raw !== rawTrimmed &&
    !rawTrimmed.includes(callout.raw) &&
    levenshteinLike(callout.raw, rawTrimmed) > 3
  if (wasHeavilyNormalized) {
    score -= 10
    reasons.push('OCR correction applied')
  }

  // Digit corruption in the raw match — but exclude L= values and spacing
  const withoutLenAndSpc = callout.raw.replace(/L=\d+/g, '').replace(/@\d+/g, '').replace(/-\d+/g, '')
  if (/\d{4,}/.test(withoutLenAndSpc)) {
    score -= 25
    reasons.push('Possible digit corruption')
  }

  // Boost: has explicit L= length
  if (callout.cutLengthMm && callout.cutLengthMm >= 100) {
    score = Math.min(100, score + 10)
    reasons.push('L= length confirmed')
  }

  // Boost: has position keyword (strong structural signal)
  if (callout.position) {
    score = Math.min(100, score + 5)
  }

  // Boost: valid diameter + reasonable count + spacing = very likely real
  if (VALID_DIAMETERS.has(callout.diameterMm) && callout.count >= 1 && callout.count <= 20 && callout.spacingMm) {
    score = Math.min(100, score + 5)
  }

  return {
    ...callout,
    originalOCR: originalLine,
    confidence: Math.max(0, Math.min(100, score)),
    confidenceReasons: reasons,
  }
}

function levenshteinLike(a: string, b: string): number {
  // Simplified char-diff count (not full Levenshtein, but fast and sufficient)
  let diff = Math.abs(a.length - b.length)
  const minLen = Math.min(a.length, b.length)
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) diff++
  }
  return diff
}
