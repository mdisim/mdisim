'use client'

import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'accent'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-semibold rounded-[var(--radius-md)] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'

    const variants = {
      primary:
        'bg-[var(--color-amber-cta)] text-[var(--color-on-amber)] hover:brightness-110 focus-visible:ring-[var(--color-amber-cta)] shadow-[0_4px_14px_-2px_rgba(234,179,8,0.35)]',
      secondary:
        'bg-[var(--color-surface-elevated)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] focus-visible:ring-[var(--color-border-strong)]',
      danger:
        'bg-[var(--color-danger)] text-white hover:brightness-110 focus-visible:ring-[var(--color-danger)]',
      ghost:
        'bg-[var(--color-navy-light)]/10 text-[var(--color-amber)] hover:bg-[var(--color-navy-light)]/20 focus-visible:ring-[var(--color-amber)]',
      outline:
        'border border-[var(--color-amber)]/50 bg-transparent text-[var(--color-amber)] hover:bg-[var(--color-amber)]/10 focus-visible:ring-[var(--color-amber)]',
      accent:
        'bg-[var(--color-amber-cta)] text-[var(--color-on-amber)] hover:brightness-110 focus-visible:ring-[var(--color-amber-cta)]',
    }

    const sizes = {
      sm: 'text-sm px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-3 gap-2 rounded-xl',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading || undefined}
        aria-busy={loading || undefined}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
