'use client'

import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const errorId = error && inputId ? `${inputId}-error` : undefined
    const helperId = helperText && !error && inputId ? `${inputId}-helper` : undefined

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId || helperId}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)]',
            'focus:outline-none focus:border-[var(--color-brand)] focus:shadow-[0_0_0_2px_var(--color-ring)]',
            'disabled:bg-[var(--color-surface-sunken)] disabled:cursor-not-allowed',
            'transition-colors duration-150',
            error
              ? 'border-[var(--color-danger)]'
              : 'border-[var(--color-border)]',
            className
          )}
          {...props}
        />
        {error && <p id={errorId} className="text-xs text-[var(--color-danger)]">{error}</p>}
        {helperText && !error && <p id={helperId} className="text-xs text-[var(--color-text-muted)]">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export { Input }
