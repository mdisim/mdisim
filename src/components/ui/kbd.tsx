import { cn } from '@/lib/utils'

/** Consistent rendering for a keyboard shortcut hint, e.g. <Kbd keys={['⌘', 'K']} /> */
export function Kbd({ keys, className }: { keys: string[]; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="min-w-[18px] px-1 py-0.5 text-center text-[10px] font-mono font-medium leading-none rounded-[var(--radius-xs)] border border-[var(--color-border-strong)] bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]"
        >
          {k}
        </kbd>
      ))}
    </span>
  )
}
