'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-14 h-14 rounded-2xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-[var(--color-danger)]" />
      </div>
      <h2 className="text-xl font-semibold text-[var(--color-text)]">Something went wrong</h2>
      <p className="text-sm text-[var(--color-text-muted)] text-center max-w-md">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 bg-[var(--color-amber)] text-[var(--color-on-amber)] text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  )
}
