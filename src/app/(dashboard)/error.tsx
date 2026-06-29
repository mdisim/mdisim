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
      <AlertTriangle className="w-12 h-12 text-amber-500" />
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
        Something went wrong
      </h2>
      <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
