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
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId || helperId}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg border bg-white text-slate-900 placeholder-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-slate-50 disabled:cursor-not-allowed',
            'dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500',
            'dark:disabled:bg-slate-800/50',
            'dark:focus:ring-blue-400',
            error
              ? 'border-red-400 dark:border-red-500'
              : 'border-slate-300 dark:border-slate-600',
            className
          )}
          {...props}
        />
        {error && <p id={errorId} className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        {helperText && !error && <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export { Input }
