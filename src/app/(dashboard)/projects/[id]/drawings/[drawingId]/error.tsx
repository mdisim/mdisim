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
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <AlertTriangle className="w-12 h-12 text-amber-500" />
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
        Failed to load drawing
      </h2>
      <p className="text-slate-600 dark:text-slate-400 text-center max-w-md">
        {error.message || 'The drawing could not be loaded. Please try again.'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        {params?.id && (
          <Link
            href={`/projects/${params.id}/drawings`}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Back to drawings
          </Link>
        )}
      </div>
    </div>
  )
}
