// Server-side currency formatter (no locale hook — uses ILS default)
export function ils(amount: number): string {
  return `₪${Math.round(amount).toLocaleString('en-IL')}`
}
