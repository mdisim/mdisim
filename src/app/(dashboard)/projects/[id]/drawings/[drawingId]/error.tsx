'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function DrawingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams<{ id: string }>()

  useEffect(() => {
    console.error('[Drawing Viewer Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 bg-[var(--background)]">
      <div className="w-14 h-14 rounded-2xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-[var(--color-danger)]" />
      </div>
      <h2 className="text-xl font-semibold text-[var(--color-text)]">Failed to load drawing</h2>
      <p className="text-sm text-[var(--color-text-muted)] text-center max-w-md">
        {error.message || 'The drawing could not be loaded. Please try again.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-[var(--color-amber)] text-[var(--color-on-amber)] text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
        {params?.id && (
          <Link
            href={`/projects/${params.id}/drawings`}
            className="px-4 py-2 border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            Back to drawings
          </Link>
        )}
      </div>
    </div>
  )
}
