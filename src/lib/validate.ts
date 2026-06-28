const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(s: unknown): s is string {
  return typeof s === 'string' && UUID_RE.test(s)
}

export function requireUUID(s: unknown, label = 'ID'): string {
  if (!isValidUUID(s)) throw new ValidationError(`Invalid ${label}`)
  return s
}

export function requireString(s: unknown, label = 'field'): string {
  if (typeof s !== 'string' || !s.trim()) throw new ValidationError(`${label} is required`)
  return s.trim()
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
