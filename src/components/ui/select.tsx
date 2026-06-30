'use client'

import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const errorId = error && selectId ? `${selectId}-error` : undefined

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border bg-[var(--color-surface)] text-[var(--color-text)]',
            'focus:outline-none focus:border-[var(--color-amber)] focus:shadow-[0_0_0_2px_var(--color-ring)]',
            'disabled:bg-[var(--color-surface-sunken)] disabled:cursor-not-allowed',
            'transition-colors duration-150',
            error
              ? 'border-[var(--color-danger)]'
              : 'border-[var(--color-border)]',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p id={errorId} className="text-xs text-[var(--color-danger)]">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
export { Select }
