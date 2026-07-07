'use client'

import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'intel'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center font-medium rounded-[var(--radius-md)] transition-all duration-[var(--transition-fast)] focus:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.98] whitespace-nowrap select-none'

    const variants = {
      primary:
        'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-strong)] shadow-[var(--shadow-xs)]',
      secondary:
        'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]',
      danger:
        'bg-[var(--color-danger)] text-white hover:brightness-[1.08]',
      ghost:
        'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]',
      outline:
        'border border-[var(--color-border-strong)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]',
      intel:
        'bg-[var(--color-intel-tint)] text-[var(--color-intel)] hover:brightness-[0.97]',
    }

    const sizes = {
      sm: 'text-[13px] px-2.5 py-1.5 gap-1.5 leading-none',
      md: 'text-[13px] px-3.5 py-2 gap-2 leading-none',
      lg: 'text-sm px-5 py-2.5 gap-2 leading-none',
      icon: 'p-2 aspect-square',
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
          <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
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
