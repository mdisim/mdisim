/**
 * Angel D.C.'s own mark set — reserved for concepts specific to quantity
 * surveying that no generic icon library carries the right meaning for:
 * the squaring bracket (grouping/selection), the deduction hatch (a void
 * cut from a measured shape), the trace thread (a number pulled from a
 * source), and the scale-tick brand mark. Universal actions (close, save,
 * search, warning) stay on lucide-react — recognisability there matters
 * more than house style.
 *
 * Every mark carries a plain-language <title> so a first week on the job
 * is enough to learn what they mean — hover one, read it, done. Power users
 * stop reading tooltips after day two; the tooltip has to exist so day one
 * doesn't need a manual.
 */

interface MarkProps {
  size?: number
  className?: string
  strokeWidth?: number
  title?: string
}

/** The squaring bracket — the one selection indicator used everywhere a row can be selected. Always occupies its slot; only opacity/color change with state, so nothing shifts on select. */
export function SelectionBracket({ size = 14, className, active, title = 'Selected' }: MarkProps & { active?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 16"
      fill="none"
      className={className}
      style={{ opacity: active ? 1 : 0, transition: 'opacity 150ms cubic-bezier(0.2,0,0,1)' }}
      role="img"
    >
      <title>{title}</title>
      <path d="M9 2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h5" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 8L6.3 9.8L10 5.5" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Deduction — a hatched void, the way an opening is marked out on a drawing before it's subtracted. */
export function DeductMark({ size = 13, className, strokeWidth = 1.5, title = 'Deduction — subtracted from the measured quantity' }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} role="img">
      <title>{title}</title>
      <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth={strokeWidth} />
      <path d="M4 4L10 10M10 4L4 10" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  )
}

/** Trace — a number pulled by a thread from its source. Used wherever a figure links back to a drawing, a measurement or a rate. */
export function TraceMark({ size = 13, className, title = 'Linked to a source drawing or measurement' }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 10" fill="none" className={className} role="img">
      <title>{title}</title>
      <circle cx="2.5" cy="5" r="2" fill="currentColor" />
      <path d="M5.5 5H12.5" stroke="currentColor" strokeWidth={1.5} strokeDasharray="0.5 2.5" strokeLinecap="round" />
      <circle cx="15" cy="5" r="2.5" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  )
}

/** Verified — the squaring bracket closed with a tick, for a computed quantity that checks out against its billed figure. */
export function VerifiedMark({ size = 15, className, title = 'Computed quantity matches the billed figure' }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} role="img">
      <title>{title}</title>
      <path d="M5 2H3.5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 3.5 14H5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M11 2h1.5A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5H11" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M5.5 8.2L7.2 10L10.5 6" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The brand mark — three graduated scale ticks, the one shape that recurs everywhere Angel D.C. signs its own work. */
export function ScaleMark({ size = 18, className }: MarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M4 14V8M9.5 14V5M15 14V10.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}
