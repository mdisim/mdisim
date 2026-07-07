'use client'

import { cn } from '@/lib/utils'
import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const errorId = error && textareaId ? `${textareaId}-error` : undefined

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] resize-none',
            'focus:outline-none focus:border-[var(--color-brand)] focus:shadow-[0_0_0_2px_var(--color-ring)]',
            'disabled:bg-[var(--color-surface-sunken)] disabled:cursor-not-allowed',
            'transition-colors duration-150',
            error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]',
            className
          )}
          {...props}
        />
        {error && <p id={errorId} className="text-xs text-[var(--color-danger)]">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
export { Textarea }
