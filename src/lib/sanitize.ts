// Strip HTML tags and dangerous characters from user input
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/javascript:/gi, '')       // strip JS protocol
    .replace(/on\w+\s*=/gi, '')         // strip event handlers
    .trim()
    .slice(0, 10000)                    // max 10k chars
}

export function sanitizeNumber(input: unknown, fallback = 0): number {
  const n = Number(input)
  return isNaN(n) || !isFinite(n) ? fallback : n
}

export function sanitizeDate(input: unknown): string | null {
  if (!input || typeof input !== 'string') return null
  // Basic ISO date validation
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(input)) return null
  const d = new Date(input)
  return isNaN(d.getTime()) ? null : input
}
