// OCR output normalization for structural drawing rebar callouts
// Fixes systematic Tesseract errors on scanned engineering drawings

// ─── Standard diameters valid in BS 8666 / Israeli practice ─────────────────
const VALID_DIAMETERS = new Set([6, 8, 10, 12, 14, 16, 20, 25, 32, 40])

// ─── Phase 1: single-character symbol substitutions ──────────────────────────
function phase1SymbolFix(text: string): string {
  return text
    // Letter O / digit 0 immediately before a 1–2 digit number (diameter context)
    .replace(/([^\dA-Za-z]|^)[Oo0](\d{1,2})(?=[@\s\-LlXx\/\n,]|$)/g, '$1Ø$2')
    // Letter D used as Ø prefix (common with certain font + OCR combo)
    .replace(/\bD(\d{1,2})\b/g, 'Ø$1')
    // Leading O/0 before diameter + spacing: O12@200 or 012@200 → Ø12@200
    .replace(/\b[O0](\d{1,2})\s*[@\-]\s*(\d{2,4})/g, 'Ø$1@$2')
    // @ symbol alternatives: Tesseract sometimes reads @ as 'a', 'A)', '(a', 'o)'
    .replace(/\s+[aAoO]\s*(\d{2,4})/g, ' @$1')
    // L= spacing variants
    .replace(/[Ll]\s*[=:]\s*(\d+)/g, 'L=$1')
    // nX prefix: × or x with spaces
    .replace(/(\d)\s*[×xX×]\s*(\d)/g, '$1X$2')
    // Stray artefacts
    .replace(/[|\\`~]/g, ' ')
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
    /\b([THYHRr])(\d{3,6})\b/g,
    (_m, letter, digits) => {
      // Already valid if exactly 1–2 chars
      if (digits.length <= 2) return _m

      // Sliding window: find first 2-char substring that is a valid diameter
      for (let i = 0; i <= digits.length - 2; i++) {
        const candidate = parseInt(digits.slice(i, i + 2), 10)
        if (VALID_DIAMETERS.has(candidate)) return `${letter}${candidate}`
      }
      // Fallback: try 1-char substrings
      for (const ch of digits) {
        const candidate = parseInt(ch, 10)
        if (VALID_DIAMETERS.has(candidate)) return `${letter}${candidate}`
      }
      return _m  // give up — will be caught by confidence filter
    }
  )
}

// ─── Phase 6: tidy up ─────────────────────────────────────────────────────────
function phase6Tidy(text: string): string {
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
  t = phase6Tidy(t)
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

  // Diameter validity
  if (!VALID_DIAMETERS.has(callout.diameterMm)) {
    score -= 40
    reasons.push(`Non-standard diameter T${callout.diameterMm}`)
  }

  // Count plausibility (1–100 bars)
  if (callout.count < 1 || callout.count > 100) {
    score -= 30
    reasons.push(`Unusual bar count: ${callout.count}`)
  }

  // Spacing plausibility (50–500 mm c/c)
  if (callout.spacingMm !== undefined && (callout.spacingMm < 50 || callout.spacingMm > 600)) {
    score -= 20
    reasons.push(`Unusual spacing: ${callout.spacingMm}mm`)
  }

  // OCR normalization was needed (raw ≠ original line)
  const wasNormalized = callout.raw !== originalLine.trim() &&
    !originalLine.includes(callout.raw)
  if (wasNormalized) {
    score -= 15
    reasons.push('Match required OCR correction')
  }

  // If raw match still contains digits that look corrupted (more than 2 consecutive
  // digits in a position where a diameter should be 1–2 digits)
  if (/\d{3,}/.test(callout.raw)) {
    score -= 25
    reasons.push('Possible digit corruption in match')
  }

  // Boost: has explicit L= length (strong signal the OCR was clean enough)
  if (callout.cutLengthMm) {
    score = Math.min(100, score + 10)
    reasons.push('L= length confirmed')
  }

  return {
    ...callout,
    originalOCR: originalLine,
    confidence: Math.max(0, Math.min(100, score)),
    confidenceReasons: reasons,
  }
}
